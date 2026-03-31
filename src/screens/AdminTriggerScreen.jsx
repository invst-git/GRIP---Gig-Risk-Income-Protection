import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AdminTopTabs } from '../components/AdminTopTabs'
import { PageTransition } from '../components/PageTransition'
import { WarningIcon } from '../components/icons'
import { Card, InputField, PrimaryButton, SegmentedControl, StatusBadge } from '../components/ui'
import { adminTriggerConfig, cityOptions } from '../data/appData'
import { useGRIP } from '../context/GRIPContext'
import { useAnalyticsData } from '../hooks/useAnalyticsData'
import { formatCurrency } from '../lib/utils'

const DEMO_TRIGGERS = [
  { label: 'AQI', value: 'AQI', triggerType: 'aqi', overrideValue: 350, unit: 'AQI' },
  { label: 'Rainfall', value: 'Rainfall', triggerType: 'rainfall', overrideValue: 120, unit: 'mm' },
  { label: 'Heatwave', value: 'Heatwave', triggerType: 'heat', overrideValue: 44, unit: 'C' },
  { label: 'Curfew', value: 'Curfew', triggerType: 'curfew', overrideValue: 1, unit: '' },
]

const curfewConfirmationOptions = [
  { label: 'Yes', value: 'Yes' },
  { label: 'No', value: 'No' },
]

async function fireTrigger({ city, triggerType, overrideValue }) {
  const response = await fetch(
    `${import.meta.env.VITE_API_BASE_URL}/admin/fire-trigger?city=${encodeURIComponent(city)}&trigger_type=${encodeURIComponent(triggerType)}&override_value=${encodeURIComponent(overrideValue)}`,
    { method: 'POST' },
  )

  if (!response.ok) {
    throw new Error('Trigger failed')
  }

  return response.json()
}

function getCityWithMostPartners(partnersByCity) {
  const entries = Object.entries(partnersByCity || {})

  if (entries.length === 0) return null

  return entries.sort((left, right) => right[1] - left[1])[0][0]
}

export function AdminTriggerScreen() {
  const navigate = useNavigate()
  const { data } = useAnalyticsData()
  const { adminSimulation, updateAdminSimulation, fireAdminTrigger } = useGRIP()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)
  const [hasInitializedCity, setHasInitializedCity] = useState(false)

  const triggerMeta = adminTriggerConfig[adminSimulation.triggerType]
  const triggerConfig =
    DEMO_TRIGGERS.find((item) => item.value === adminSimulation.triggerType) ?? DEMO_TRIGGERS[0]
  const availableCities =
    Object.keys(data?.partnersByCity || {}).length > 0
      ? Object.keys(data.partnersByCity)
      : cityOptions
  const cityWithMostPartners = getCityWithMostPartners(data?.partnersByCity)
  const affectedPartners = data?.partnersByCity?.[adminSimulation.city] ?? 0
  const payoutRate = adminSimulation.triggerType === 'Curfew' ? 600 : 400
  const estimatedPayout = affectedPartners * (Number(adminSimulation.daysActive) || 0) * payoutRate

  useEffect(() => {
    if (!hasInitializedCity && cityWithMostPartners) {
      updateAdminSimulation('city', cityWithMostPartners)
      setHasInitializedCity(true)
    }
  }, [cityWithMostPartners, hasInitializedCity, updateAdminSimulation])

  async function handleFireTrigger() {
    setIsLoading(true)
    setError(null)

    try {
      const overrideValue =
        adminSimulation.triggerType === 'Curfew'
          ? adminSimulation.readingValue === 'No'
            ? 0
            : 1
          : Number(adminSimulation.readingValue) || triggerConfig.overrideValue

      await fireTrigger({
        city: adminSimulation.city,
        triggerType: triggerConfig.triggerType,
        overrideValue,
      })

      fireAdminTrigger()

      const simulation = {
        triggerType: adminSimulation.triggerType,
        city: adminSimulation.city,
        title: adminTriggerConfig[adminSimulation.triggerType].title,
        affectedPartners,
        estimatedPayout,
        readingValue:
          adminSimulation.triggerType === 'Curfew'
            ? adminSimulation.readingValue || adminTriggerConfig.Curfew.defaultReading
            : overrideValue,
        daysActive: Number(adminSimulation.daysActive) || 0,
      }

      navigate('/admin/trigger-confirm', {
        state: { simulation, showToast: true },
      })
    } catch (triggerError) {
      setError(triggerError.message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <PageTransition className="flex min-h-full flex-col">
      <div className="flex items-center px-4 pt-4 sm:px-5 sm:pt-5">
        <h1 className="text-[18px] font-semibold text-text-primary">Trigger Simulation</h1>
        <StatusBadge status="pending" label="Admin" className="ml-auto" />
      </div>

      <AdminTopTabs />

      <div className="flex-1 overflow-y-auto px-4 pb-5 pt-5 sm:px-5 sm:pb-6 sm:pt-6">
        <div className="space-y-6">
          <Card className="relative overflow-hidden border-white/80 ring-1 ring-[rgba(36,69,122,0.12)]">
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[rgba(36,69,122,0.10)] text-accent-primary">
                <WarningIcon className="h-5 w-5" />
              </span>
              <p className="text-[14px] leading-6 text-text-primary">
                This panel simulates a parametric trigger event for demonstration purposes.
                No real payouts are processed.
              </p>
            </div>
          </Card>

          {error ? (
            <Card className="border-white/80">
              <p className="text-[13px] text-accent-danger">{error}</p>
            </Card>
          ) : null}

          <div className="space-y-4">
            <SegmentedControl
              label="Trigger Type"
              options={DEMO_TRIGGERS.map(({ label, value }) => ({ label, value }))}
              value={adminSimulation.triggerType}
              onChange={(value) => {
                updateAdminSimulation('triggerType', value)
                updateAdminSimulation('readingValue', String(adminTriggerConfig[value].defaultReading))
              }}
            />
            <InputField
              label="City"
              as="select"
              value={adminSimulation.city}
              onChange={(event) => updateAdminSimulation('city', event.target.value)}
              options={availableCities.map((city) => ({ label: city, value: city }))}
            />
            {adminSimulation.triggerType === 'Curfew' ? (
              <SegmentedControl
                label={triggerMeta.fieldLabel}
                options={curfewConfirmationOptions}
                value={adminSimulation.readingValue}
                onChange={(value) => updateAdminSimulation('readingValue', value)}
              />
            ) : (
              <InputField
                label={triggerMeta.fieldLabel}
                type="text"
                inputMode="numeric"
                value={adminSimulation.readingValue}
                onChange={(event) =>
                  updateAdminSimulation(
                    'readingValue',
                    event.target.value.replace(/\D/g, '').slice(0, 4),
                  )
                }
              />
            )}
            <InputField
              label="Days Active"
              type="text"
              inputMode="numeric"
              placeholder="2"
              value={adminSimulation.daysActive}
              onChange={(event) =>
                updateAdminSimulation(
                  'daysActive',
                  event.target.value.replace(/\D/g, '').slice(0, 2),
                )
              }
            />
            <InputField label="Affected Partners" value={String(affectedPartners)} readOnly />
            <InputField
              label="Estimated Payout"
              value={formatCurrency(estimatedPayout)}
              readOnly
            />
          </div>
        </div>
      </div>

      <div className="px-4 pb-5 pt-2 sm:px-5 sm:pb-6">
        <PrimaryButton
          onClick={handleFireTrigger}
          loading={isLoading}
          loadingText="Processing trigger..."
        >
          Fire Trigger
        </PrimaryButton>
      </div>
    </PageTransition>
  )
}
