import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { Card, PrimaryButton, ProgressBar, StatusBadge } from '../components/ui'
import { ChevronLeftIcon } from '../components/icons'
import { PageTransition } from '../components/PageTransition'
import { pulseAnimation } from '../lib/animations'
import { useGRIP } from '../context/GRIPContext'
import { activeTrigger as mockActiveTrigger } from '../mockData'
import { formatCurrency } from '../lib/utils'

const MotionPulse = motion.span

function getAlertCopy(trigger) {
  if (trigger.type === 'Curfew') {
    return `${trigger.zone}, ${trigger.city} is under an official suspension. Your payout is being processed automatically.`
  }

  return `A qualifying ${trigger.type.toLowerCase()} trigger has been confirmed in ${trigger.zone}, ${trigger.city}. Your payout is being processed automatically.`
}

export function TriggerAlertScreen() {
  const navigate = useNavigate()
  const { activeTrigger } = useGRIP()
  const trigger = activeTrigger ?? mockActiveTrigger
  const payoutAmount = (trigger.payoutAmount ?? 0) * (trigger.daysTriggered ?? 0)

  return (
    <PageTransition className="relative flex min-h-full flex-col overflow-x-hidden overflow-y-auto grip-radial-alert px-4 py-4 sm:px-5 sm:py-5">
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

      <div className="relative z-10 flex flex-1 flex-col justify-center py-4 sm:py-6">
        <div className="mx-auto w-full max-w-[390px] space-y-5 text-center sm:space-y-6">
          <div className="flex justify-center">
            <MotionPulse
              className="h-6 w-6 rounded-full bg-accent-primary shadow-[0_0_0_10px_rgba(95,127,174,0.12)]"
              animate={pulseAnimation}
            />
          </div>

          <div className="space-y-3">
            <h1 className="font-display text-[clamp(28px,8.5vw,32px)] font-normal text-text-primary">
              {trigger.type} Alert Active
            </h1>
            <p className="mx-auto max-w-[320px] text-[14px] leading-6 text-text-secondary">
              {getAlertCopy(trigger)}
            </p>
          </div>

          <Card className="space-y-3 border-white/80 text-center">
            <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-text-secondary">
              CURRENT READING
            </p>
            <p className="font-display text-[48px] font-normal leading-none text-accent-primary">
              {trigger.reading}
            </p>
            <p className="text-[12px] text-text-secondary">
              {trigger.zone}, {trigger.city}
            </p>
          </Card>

          <Card className="space-y-3 border-white/80 text-left">
            <div className="flex items-center justify-between gap-4">
              <p className="text-[13px] text-text-secondary">Trigger Status</p>
              <StatusBadge status="pending" label={trigger.status} />
            </div>
            <div className="flex items-center justify-between gap-4">
              <p className="text-[13px] text-text-secondary">Days Triggered</p>
              <p className="text-[14px] font-semibold text-text-primary">
                {trigger.type === 'Curfew'
                  ? `${trigger.daysTriggered} day confirmed`
                  : `${trigger.daysTriggered} of required 2`}
              </p>
            </div>
            <div className="flex items-center justify-between gap-4">
              <p className="text-[13px] text-text-secondary">Payout Amount</p>
              <p className="text-[14px] font-semibold text-text-primary">
                {formatCurrency(payoutAmount)}
              </p>
            </div>
            <div className="flex items-center justify-between gap-4">
              <p className="text-[13px] text-text-secondary">Order Volume Drop</p>
              <p className="text-[14px] font-semibold text-text-primary">
                {trigger.orderVolumeDrop}
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

      <div className="relative z-10 pb-1 pt-3 sm:pt-4">
        <PrimaryButton onClick={() => navigate('/dashboard')}>
          Back to Dashboard
        </PrimaryButton>
      </div>
    </PageTransition>
  )
}
