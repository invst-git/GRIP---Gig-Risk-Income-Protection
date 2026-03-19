import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { Card, PrimaryButton, ProgressBar, StatusBadge } from '../components/ui'
import { ChevronLeftIcon } from '../components/icons'
import { PageTransition } from '../components/PageTransition'
import { pulseAnimation } from '../lib/animations'
import { useGRIP } from '../context/GRIPContext'
import { defaultTriggerAlert } from '../data/appData'
import { formatCurrency } from '../lib/utils'

const MotionPulse = motion.span

function getAlertCopy(triggerType, city, threshold) {
  if (triggerType === 'Rainfall') {
    return `${city} rainfall has crossed ${threshold}mm for the required trigger window. Your payout is being processed automatically.`
  }

  if (triggerType === 'Heatwave') {
    return `${city} temperature has breached ${threshold} C for 2 consecutive days. Your payout is being processed automatically.`
  }

  return `${city} AQI has breached ${threshold} for 2 consecutive days. Your payout is being processed automatically.`
}

export function TriggerAlertScreen() {
  const navigate = useNavigate()
  const { activeTrigger, profile } = useGRIP()
  const trigger = activeTrigger ?? defaultTriggerAlert
  const payoutAmount = trigger.daysTriggered * profile.payoutPerDay

  return (
    <PageTransition className="relative flex min-h-full flex-col overflow-hidden grip-radial-alert px-5 py-5">
      <div className="relative z-10 flex h-10 items-center">
        <button
          type="button"
          onClick={() => navigate('/dashboard')}
          className="flex h-10 w-10 items-center justify-center rounded-full border border-white/80 bg-bg-surface/92 text-text-primary shadow-card backdrop-blur-sm"
          aria-label="Go back"
        >
          <ChevronLeftIcon className="h-5 w-5" />
        </button>
      </div>

      <div className="relative z-10 flex flex-1 flex-col justify-center py-6">
        <div className="space-y-6 text-center">
          <div className="flex justify-center">
            <MotionPulse
              className="h-6 w-6 rounded-full bg-accent-primary shadow-[0_0_0_10px_rgba(95,127,174,0.12)]"
              animate={pulseAnimation}
            />
          </div>

          <div className="space-y-3">
            <h1 className="font-display text-[32px] font-normal text-text-primary">
              {trigger.type} Alert Active
            </h1>
            <p className="mx-auto max-w-[320px] text-[14px] leading-6 text-text-secondary">
              {getAlertCopy(trigger.type, trigger.city, trigger.threshold)}
            </p>
          </div>

          <Card className="space-y-3 border-white/80 text-center">
            <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-text-secondary">
              Current {trigger.type} Reading
            </p>
            <p className="font-display text-[48px] font-normal leading-none text-accent-primary">
              {trigger.reading}
            </p>
            <p className="text-[12px] text-text-secondary">Measured - {trigger.source}</p>
            <p className="text-[13px] text-text-secondary">Threshold: {trigger.threshold}</p>
          </Card>

          <Card className="space-y-3 border-white/80 text-left">
            <div className="flex items-center justify-between gap-4">
              <p className="text-[13px] text-text-secondary">Trigger Status</p>
              <StatusBadge status="pending" label="Active" />
            </div>
            <div className="flex items-center justify-between gap-4">
              <p className="text-[13px] text-text-secondary">Days Triggered</p>
              <p className="text-[14px] font-semibold text-text-primary">
                {trigger.daysTriggered} of required {trigger.requiredDays}
              </p>
            </div>
            <div className="flex items-center justify-between gap-4">
              <p className="text-[13px] text-text-secondary">Payout Amount</p>
              <p className="text-[14px] font-semibold text-text-primary">
                {formatCurrency(payoutAmount)}
              </p>
            </div>
            <div className="flex items-center justify-between gap-4">
              <p className="text-[13px] text-text-secondary">Expected Credit</p>
              <p className="text-[14px] font-semibold text-text-primary">
                Within 15 minutes
              </p>
            </div>
            <div className="space-y-2 pt-2">
              <div className="flex items-center justify-between gap-4">
                <p className="text-[13px] text-text-secondary">Processing...</p>
                <p className="text-[13px] text-text-secondary">70%</p>
              </div>
              <ProgressBar value={70} />
            </div>
          </Card>
        </div>
      </div>

      <div className="relative z-10 pb-1 pt-4">
        <PrimaryButton onClick={() => navigate('/dashboard')}>
          Back to Dashboard
        </PrimaryButton>
      </div>
    </PageTransition>
  )
}
