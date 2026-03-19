/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState } from 'react'
import { adminTriggerConfig, defaultTriggerAlert, planOptions } from '../data/appData'
import { affectedPartnersByCity, partnerProfile } from '../mockData'

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

export function GRIPProvider({ children }) {
  const [onboardingForm, setOnboardingForm] = useState(initialOnboardingForm)
  const [selectedPlanName, setSelectedPlanName] = useState('Standard')
  const [activeTrigger, setActiveTrigger] = useState(null)
  const [adminSimulation, setAdminSimulation] = useState(initialAdminSimulation)
  const [lastTriggeredSimulation, setLastTriggeredSimulation] = useState(null)

  const selectedPlan = getPlanByName(selectedPlanName)

  const profile = {
    ...partnerProfile,
    name: onboardingForm.fullName || partnerProfile.name,
    city: onboardingForm.city || partnerProfile.city,
    platform: onboardingForm.platform || partnerProfile.platform,
    vehicleType: onboardingForm.vehicleType || partnerProfile.vehicleType,
    zone: onboardingForm.operatingZone || partnerProfile.zone,
    avgDailyOrders: Number(onboardingForm.avgDailyOrders || partnerProfile.avgDailyOrders),
    avgDailyHours: Number(onboardingForm.avgDailyHours || partnerProfile.avgDailyHours),
    upiId: onboardingForm.upiId || partnerProfile.upiId,
    coverageTier: selectedPlan.name,
    weeklyPremium: selectedPlan.weeklyPremium,
    payoutPerDay: selectedPlan.payoutPerDay,
    weeklyCap: selectedPlan.weeklyCap,
  }

  const affectedPartners =
    affectedPartnersByCity[adminSimulation.city] ?? affectedPartnersByCity.Delhi
  const daysActive = Number(adminSimulation.daysActive) || 0
  const estimatedPayout = affectedPartners * daysActive * 400

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

  function fireAdminTrigger() {
    const config = adminTriggerConfig[adminSimulation.triggerType]
    const readingValue = Number(adminSimulation.readingValue) || config.defaultReading
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
      ...defaultTriggerAlert,
      type: adminSimulation.triggerType,
      city: adminSimulation.city,
      reading: readingValue,
      threshold: config.threshold,
      daysTriggered: Math.min(Math.max(triggeredState.daysActive, 0), 2) || 2,
      requiredDays: 2,
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
