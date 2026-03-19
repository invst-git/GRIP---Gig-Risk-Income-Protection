import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AdminTopTabs } from '../components/AdminTopTabs'
import { PageTransition } from '../components/PageTransition'
import { WarningIcon } from '../components/icons'
import { Card, InputField, PrimaryButton, SegmentedControl, StatusBadge } from '../components/ui'
import { adminTriggerConfig, cityOptions } from '../data/appData'
import { useGRIP } from '../context/GRIPContext'
import { formatCurrency } from '../lib/utils'

const triggerOptions = [
  { label: 'AQI', value: 'AQI' },
  { label: 'Rainfall', value: 'Rainfall' },
  { label: 'Heatwave', value: 'Heatwave' },
]

export function AdminTriggerScreen() {
  const navigate = useNavigate()
  const {
    adminSimulation,
    updateAdminSimulation,
    affectedPartners,
    estimatedPayout,
    fireAdminTrigger,
  } = useGRIP()
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    let timeoutId

    if (isLoading) {
      timeoutId = window.setTimeout(() => {
        fireAdminTrigger()
        navigate('/admin/trigger-confirm')
      }, 2000)
    }

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [fireAdminTrigger, isLoading, navigate])

  const triggerMeta = adminTriggerConfig[adminSimulation.triggerType]

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

          <div className="space-y-4">
            <SegmentedControl
              label="Trigger Type"
              options={triggerOptions}
              value={adminSimulation.triggerType}
              onChange={(value) => {
                updateAdminSimulation('triggerType', value)
                updateAdminSimulation(
                  'readingValue',
                  String(adminTriggerConfig[value].defaultReading),
                )
              }}
            />
            <InputField
              label="City"
              as="select"
              value={adminSimulation.city}
              onChange={(event) => updateAdminSimulation('city', event.target.value)}
              options={cityOptions.map((city) => ({ label: city, value: city }))}
            />
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
            <InputField
              label="Affected Partners"
              value={String(affectedPartners)}
              readOnly
            />
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
          onClick={() => setIsLoading(true)}
          loading={isLoading}
          loadingText="Processing trigger..."
        >
          Fire Trigger
        </PrimaryButton>
      </div>
    </PageTransition>
  )
}
