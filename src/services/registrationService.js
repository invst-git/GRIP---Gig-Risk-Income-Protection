import { supabase } from '../lib/supabase'
import { fetchPremiumQuote, generatePolicyNumber } from '../lib/premiumEngine'

const TIER_PREMIUM_KEYS = {
  Basic: 'weekly_premium_basic',
  Standard: 'weekly_premium_standard',
  Premium: 'weekly_premium_premium',
}
const TIER_MULTIPLIERS = { Basic: 1.0, Standard: 1.25, Premium: 1.5 }
const TIER_PAYOUTS = { Basic: 300, Standard: 400, Premium: 500 }
const TIER_CAPS = { Basic: 900, Standard: 1200, Premium: 1500 }

export async function registerPartner(formData, selectedPlanName = 'Standard') {
  const premiumQuote = await fetchPremiumQuote(formData)
  const zoneRiskScore = premiumQuote.zone_risk_score
  const weeklyPremium = premiumQuote[TIER_PREMIUM_KEYS[selectedPlanName]]
  const policyNumber = generatePolicyNumber(formData.city)

  const nextPremiumDate = new Date()
  nextPremiumDate.setDate(
    nextPremiumDate.getDate() + ((1 - nextPremiumDate.getDay() + 7) % 7 || 7),
  )

  const { data: partner, error: partnerError } = await supabase
    .from('partners')
    .insert({
      full_name: formData.fullName,
      mobile_number: formData.mobileNumber,
      city: formData.city,
      aadhaar_last4: formData.aadhaarLast4,
      date_of_birth: formData.dateOfBirth || null,
      gender: formData.gender || null,
      language: formData.language || 'English',
      emergency_contact: formData.emergencyContact || null,
      platform: formData.platform,
      vehicle_type: formData.vehicleType,
      operating_zone: formData.operatingZone,
      avg_daily_orders: Number(formData.avgDailyOrders),
      avg_daily_hours: Number(formData.avgDailyHours),
      upi_id: formData.upiId,
      zone_risk_score: zoneRiskScore,
      policy_number: policyNumber,
      coverage_tier: selectedPlanName,
      weekly_premium: weeklyPremium,
      payout_per_day: TIER_PAYOUTS[selectedPlanName],
      weekly_cap: TIER_CAPS[selectedPlanName],
      pan_masked: formData.panMasked || null,
      dl_number_masked: formData.dlMasked || null,
      rc_number_masked: formData.rcNumber ? `${formData.rcNumber.slice(0, 4)}XXXX` : null,
      has_insurance: formData.hasInsurance || false,
      otp_verified: formData.otpVerified || false,
    })
    .select()
    .single()

  if (partnerError) {
    throw partnerError
  }

  try {
    const accountMasked = `XXXX XXXX ${formData.bankAccountNumber.slice(-4)}`
    const { data: bankAccount, error: bankAccountError } = await supabase
      .from('bank_accounts')
      .insert({
        partner_id: partner.id,
        account_number_masked: accountMasked,
        ifsc_code: formData.ifscCode,
        bank_name: formData.bankName || null,
        account_holder_name: formData.fullName,
        verification_status: 'verified',
      })
      .select()
      .single()

    if (bankAccountError) {
      throw bankAccountError
    }

    const { error: partnerUpdateError } = await supabase
      .from('partners')
      .update({ bank_account_id: bankAccount.id })
      .eq('id', partner.id)

    if (partnerUpdateError) {
      throw partnerUpdateError
    }

    const kycDocuments = [
      {
        partner_id: partner.id,
        document_type: 'aadhaar',
        document_number_masked: `XXXX-XXXX-${formData.aadhaarLast4}`,
        verification_status: 'verified',
      },
      {
        partner_id: partner.id,
        document_type: 'pan',
        document_number_masked: formData.panMasked,
        verification_status: formData.panVerified ? 'verified' : 'pending',
      },
    ]

    if (formData.dlMasked) {
      kycDocuments.push({
        partner_id: partner.id,
        document_type: 'dl',
        document_number_masked: formData.dlMasked,
        verification_status: formData.dlVerified ? 'verified' : 'pending',
      })
    }

    if (formData.rcNumber) {
      kycDocuments.push({
        partner_id: partner.id,
        document_type: 'rc',
        document_number_masked: `${formData.rcNumber.slice(0, 4)}XXXX`,
        verification_status: formData.rcVerified ? 'verified' : 'pending',
      })
    }

    const { error: kycError } = await supabase.from('kyc_documents').insert(kycDocuments)

    if (kycError) {
      throw kycError
    }

    const { data: policy, error: policyError } = await supabase
      .from('policies')
      .insert({
        partner_id: partner.id,
        policy_number: policyNumber,
        coverage_tier: selectedPlanName,
        weekly_premium: weeklyPremium,
        payout_per_day: TIER_PAYOUTS[selectedPlanName],
        weekly_cap: TIER_CAPS[selectedPlanName],
        next_premium_date: nextPremiumDate.toISOString().split('T')[0],
      })
      .select()
      .single()

    if (policyError) {
      throw policyError
    }

    const { data: refreshedPartner, error: refreshedPartnerError } = await supabase
      .from('partners')
      .select('*')
      .eq('id', partner.id)
      .single()

    if (refreshedPartnerError) {
      throw refreshedPartnerError
    }

    return {
      partner: refreshedPartner,
      policy,
      zoneRiskScore,
      weeklyPremium,
      policyNumber,
    }
  } catch (error) {
    await supabase.from('partners').delete().eq('id', partner.id)
    throw error
  }
}

export async function checkMobileExists(mobileNumber) {
  const { data, error } = await supabase
    .from('partners')
    .select('id')
    .eq('mobile_number', mobileNumber)
    .maybeSingle()

  if (error) {
    throw error
  }

  return !!data
}

export async function checkUpiExists(upiId) {
  const { data, error } = await supabase
    .from('partners')
    .select('id')
    .eq('upi_id', upiId)
    .limit(1)

  if (error) {
    throw error
  }

  return (data || []).length > 0
}

export async function updatePartnerPlan(partnerId, policyId, newTier) {
  const { data: partnerData, error: partnerFetchError } = await supabase
    .from('partners')
    .select('zone_risk_score')
    .eq('id', partnerId)
    .single()

  if (partnerFetchError) {
    throw partnerFetchError
  }

  let activePolicyId = policyId
  if (!activePolicyId) {
    const { data: policyData, error: policyFetchError } = await supabase
      .from('policies')
      .select('id')
      .eq('partner_id', partnerId)
      .eq('status', 'active')
      .single()

    if (policyFetchError) {
      throw policyFetchError
    }

    activePolicyId = policyData.id
  }

  const zoneRiskScore = Number(partnerData?.zone_risk_score) || 1.0
  const weeklyPremium = Math.round(49 * zoneRiskScore * TIER_MULTIPLIERS[newTier])

  const { error: partnerError } = await supabase
    .from('partners')
    .update({
      coverage_tier: newTier,
      weekly_premium: weeklyPremium,
      payout_per_day: TIER_PAYOUTS[newTier],
      weekly_cap: TIER_CAPS[newTier],
    })
    .eq('id', partnerId)

  if (partnerError) {
    throw partnerError
  }

  const { error: policyError } = await supabase
    .from('policies')
    .update({
      coverage_tier: newTier,
      weekly_premium: weeklyPremium,
      payout_per_day: TIER_PAYOUTS[newTier],
      weekly_cap: TIER_CAPS[newTier],
    })
    .eq('id', activePolicyId)

  if (policyError) {
    throw policyError
  }

  return {
    weeklyPremium,
    newTier,
    payoutPerDay: TIER_PAYOUTS[newTier],
    weeklyCap: TIER_CAPS[newTier],
    policyId: activePolicyId,
  }
}
