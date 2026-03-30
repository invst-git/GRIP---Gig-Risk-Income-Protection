/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState } from 'react'
import { adminTriggerConfig, planOptions } from '../data/appData'
import {
  activeTrigger as mockActiveTrigger,
  affectedPartnersByCity,
  partnerProfile,
} from '../mockData'
import { registerPartner } from '../services/registrationService'

const GRIPContext = createContext(null)

const initialOnboardingForm = {
  fullName: '',
  mobileNumber: '',
  city: '',
  aadhaarLast4: '',
  platform: partnerProfile.platform,
  vehicleType: partnerProfile.vehicleType,
  operatingZone: partnerProfile.zone,
  avgDailyOrders: String(partnerProfile.avgDailyOrders),
  avgDailyHours: String(partnerProfile.avgDailyHours),
  upiId: partnerProfile.upiId,
  confirmUpiId: partnerProfile.upiId,
  consent: false,
}

const initialAdminSimulation = {
  triggerType: 'AQI',
  city: 'Delhi',
  readingValue: String(adminTriggerConfig.AQI.defaultReading),
  daysActive: '2',
}

function getPlanByName(planName) {
  return planOptions.find((plan) => plan.name === planName) ?? planOptions[1]
}

function formatEnrollmentDate(dateValue) {
  if (!dateValue) return partnerProfile.enrolledSince

  const parsedDate = new Date(dateValue)

  if (Number.isNaN(parsedDate.getTime())) {
    return partnerProfile.enrolledSince
  }

  return parsedDate.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

export function GRIPProvider({ children }) {
  const [onboardingForm, setOnboardingForm] = useState(initialOnboardingForm)
  const [selectedPlanName, setSelectedPlanName] = useState('Standard')
  const [activeTrigger, setActiveTrigger] = useState(null)
  const [adminSimulation, setAdminSimulation] = useState(initialAdminSimulation)
  const [lastTriggeredSimulation, setLastTriggeredSimulation] = useState(null)
  const [registrationResult, setRegistrationResult] = useState(null)
  const [isRegistering, setIsRegistering] = useState(false)
  const [registrationError, setRegistrationError] = useState(null)

  const selectedPlan = getPlanByName(selectedPlanName)
  const registeredPartner = registrationResult?.partner ?? null
  const hasRegistrationForSelectedPlan =
    (registeredPartner?.coverage_tier ?? selectedPlan.name) === selectedPlan.name
  const profileWeeklyPremium = hasRegistrationForSelectedPlan
    ? registrationResult?.weeklyPremium ?? registeredPartner?.weekly_premium
    : selectedPlan.weeklyPremium
  const profilePayoutPerDay = hasRegistrationForSelectedPlan
    ? registeredPartner?.payout_per_day ?? selectedPlan.payoutPerDay
    : selectedPlan.payoutPerDay
  const profileWeeklyCap = hasRegistrationForSelectedPlan
    ? registeredPartner?.weekly_cap ?? selectedPlan.weeklyCap
    : selectedPlan.weeklyCap
  const profileZoneRiskScore =
    registrationResult?.zoneRiskScore ??
    (registeredPartner?.zone_risk_score ? Number(registeredPartner.zone_risk_score) : null) ??
    partnerProfile.zoneRiskScore

  const profile = {
    ...partnerProfile,
    name: registeredPartner?.full_name || onboardingForm.fullName || partnerProfile.name,
    city: registeredPartner?.city || onboardingForm.city || partnerProfile.city,
    platform: registeredPartner?.platform || onboardingForm.platform || partnerProfile.platform,
    vehicleType:
      registeredPartner?.vehicle_type || onboardingForm.vehicleType || partnerProfile.vehicleType,
    zone: registeredPartner?.operating_zone || onboardingForm.operatingZone || partnerProfile.zone,
    avgDailyOrders: Number(
      registeredPartner?.avg_daily_orders ??
        onboardingForm.avgDailyOrders ??
        partnerProfile.avgDailyOrders,
    ),
    avgDailyHours: Number(
      registeredPartner?.avg_daily_hours ??
        onboardingForm.avgDailyHours ??
        partnerProfile.avgDailyHours,
    ),
    upiId: registeredPartner?.upi_id || onboardingForm.upiId || partnerProfile.upiId,
    enrolledSince: registeredPartner
      ? formatEnrollmentDate(registeredPartner.enrolled_since ?? registeredPartner.created_at)
      : partnerProfile.enrolledSince,
    policyNumber: registrationResult?.policyNumber || registeredPartner?.policy_number || partnerProfile.policyNumber,
    coverageTier: selectedPlan.name,
    weeklyPremium: profileWeeklyPremium,
    payoutPerDay: profilePayoutPerDay,
    weeklyCap: profileWeeklyCap,
    zoneRiskScore: profileZoneRiskScore,
  }

  const affectedPartners =
    affectedPartnersByCity[adminSimulation.city] ?? affectedPartnersByCity.Delhi
  const daysActive = Number(adminSimulation.daysActive) || 0
  const payoutRate = adminSimulation.triggerType === 'Curfew' ? 600 : 400
  const estimatedPayout = affectedPartners * daysActive * payoutRate

  function updateOnboardingField(field, value) {
    setOnboardingForm((current) => ({
      ...current,
      [field]: value,
    }))
  }

  function updateAdminSimulation(field, value) {
    setAdminSimulation((current) => ({
      ...current,
      [field]: value,
    }))
  }

  function setSelectedPlan(planName) {
    setSelectedPlanName(planName)
  }

  async function submitRegistration() {
    setIsRegistering(true)
    setRegistrationError(null)

    try {
      const result = await registerPartner(onboardingForm, selectedPlanName)
      setRegistrationResult(result)
      return result
    } catch (error) {
      setRegistrationError(error.message)
      throw error
    } finally {
      setIsRegistering(false)
    }
  }

  function fireAdminTrigger() {
    const config = adminTriggerConfig[adminSimulation.triggerType]
    const readingValue =
      adminSimulation.triggerType === 'Curfew'
        ? adminSimulation.readingValue || config.defaultReading
        : Number(adminSimulation.readingValue) || config.defaultReading
    const triggeredState = {
      triggerType: adminSimulation.triggerType,
      city: adminSimulation.city,
      readingValue,
      daysActive: Number(adminSimulation.daysActive) || 0,
      affectedPartners,
      estimatedPayout,
      title: config.title,
    }

    setLastTriggeredSimulation(triggeredState)
    setActiveTrigger({
      ...mockActiveTrigger,
      type: adminSimulation.triggerType,
      city: adminSimulation.city,
      reading:
        adminSimulation.triggerType === 'Curfew'
          ? readingValue === 'No'
            ? 'Zone suspension not confirmed'
            : 'Official zone suspension issued'
          : readingValue,
      threshold: config.threshold,
      daysTriggered:
        adminSimulation.triggerType === 'Curfew'
          ? Math.max(triggeredState.daysActive, 0)
          : Math.min(Math.max(triggeredState.daysActive, 0), 2) || 2,
      requiredDays: 2,
      payoutAmount: payoutRate,
      status: 'Active',
    })
  }

  return (
    <GRIPContext.Provider
      value={{
        onboardingForm,
        updateOnboardingField,
        selectedPlan,
        setSelectedPlan,
        profile,
        submitRegistration,
        registrationResult,
        isRegistering,
        registrationError,
        activeTrigger,
        setActiveTrigger,
        adminSimulation,
        updateAdminSimulation,
        affectedPartners,
        estimatedPayout,
        fireAdminTrigger,
        lastTriggeredSimulation,
      }}
    >
      {children}
    </GRIPContext.Provider>
  )
}

export function useGRIP() {
  const context = useContext(GRIPContext)

  if (!context) {
    throw new Error('useGRIP must be used within GRIPProvider')
  }

  return context
}
