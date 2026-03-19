import { useNavigate } from 'react-router-dom'
import { AnimatedCheckmark } from '../components/AnimatedCheckmark'
import { PageTransition } from '../components/PageTransition'
import { Card, PrimaryButton, ProgressBar, SecondaryButton } from '../components/ui'
import { useGRIP } from '../context/GRIPContext'
import { adminTriggerConfig } from '../data/appData'
import { formatCurrency } from '../lib/utils'

function SummaryRow({ label, value }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-border-default py-3 last:border-b-0">
      <p className="text-[13px] text-text-secondary">{label}</p>
      <p className="text-[14px] font-semibold text-text-primary">{value}</p>
    </div>
  )
}

export function AdminTriggerConfirmScreen() {
  const navigate = useNavigate()
  const { lastTriggeredSimulation, adminSimulation, affectedPartners, estimatedPayout } =
    useGRIP()

  const simulation =
    lastTriggeredSimulation ?? {
      ...adminSimulation,
      title: adminTriggerConfig[adminSimulation.triggerType].title,
      affectedPartners,
      estimatedPayout,
      readingValue: Number(adminSimulation.readingValue) || 0,
      daysActive: Number(adminSimulation.daysActive) || 0,
    }

  return (
    <PageTransition className="relative flex min-h-full flex-col justify-center overflow-x-hidden overflow-y-auto grip-radial-alert px-4 py-[clamp(24px,5vh,40px)] sm:px-5">
      <div className="relative z-10 mx-auto w-full max-w-[390px] space-y-5 text-center sm:space-y-6">
        <div className="flex justify-center">
          <div className="rounded-full border border-white/80 bg-bg-surface/86 p-4 shadow-card backdrop-blur-sm">
            <AnimatedCheckmark className="h-24 w-24 sm:h-28 sm:w-28" />
          </div>
        </div>

        <div className="space-y-3">
          <h1 className="font-display text-[clamp(28px,8.5vw,32px)] font-normal text-text-primary">
            Trigger Fired
          </h1>
          <p className="mx-auto max-w-[320px] text-[14px] leading-6 text-text-secondary">
            Payouts are being processed and credited to {simulation.affectedPartners} partners
            in {simulation.city}.
          </p>
        </div>

        <Card className="space-y-1 border-white/80 text-left">
          <SummaryRow label="Trigger" value={simulation.title} />
          <SummaryRow label="City" value={simulation.city} />
          <SummaryRow
            label={`${simulation.triggerType} Reading`}
            value={`${simulation.readingValue} (${simulation.daysActive} days)`}
          />
          <SummaryRow
            label="Partners Affected"
            value={String(simulation.affectedPartners)}
          />
          <SummaryRow
            label="Total Payout Processing"
            value={formatCurrency(simulation.estimatedPayout)}
          />
          <SummaryRow label="Processing Time" value="Under 15 minutes" />
          <div className="space-y-2 pt-3">
            <div className="flex items-center justify-between gap-4">
              <p className="text-[13px] text-text-secondary">UPI Credits Status</p>
              <p className="text-[13px] text-text-secondary">Processing...</p>
            </div>
            <ProgressBar value={45} />
          </div>
        </Card>

        <div className="space-y-3">
          <PrimaryButton onClick={() => navigate('/admin/dashboard#partners')}>
            View Partner Payouts
          </PrimaryButton>
          <SecondaryButton onClick={() => navigate('/admin/dashboard')}>
            Back to Dashboard
          </SecondaryButton>
        </div>
      </div>
    </PageTransition>
  )
}
