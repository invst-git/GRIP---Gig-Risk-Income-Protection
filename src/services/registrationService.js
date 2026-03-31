import { supabase } from '../lib/supabase'
import { fetchPremiumQuote, generatePolicyNumber } from '../lib/premiumEngine'

const TIER_PREMIUM_KEYS = {
  Basic: 'weekly_premium_basic',
  Standard: 'weekly_premium_standard',
  Premium: 'weekly_premium_premium',
}
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
    })
    .select()
    .single()

  if (partnerError) {
    throw partnerError
  }

  const { error: policyError } = await supabase.from('policies').insert({
    partner_id: partner.id,
    policy_number: policyNumber,
    coverage_tier: selectedPlanName,
    weekly_premium: weeklyPremium,
    payout_per_day: TIER_PAYOUTS[selectedPlanName],
    weekly_cap: TIER_CAPS[selectedPlanName],
    next_premium_date: nextPremiumDate.toISOString().split('T')[0],
  })

  if (policyError) {
    await supabase.from('partners').delete().eq('id', partner.id)
    throw policyError
  }

  return { partner, zoneRiskScore, weeklyPremium, policyNumber }
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
