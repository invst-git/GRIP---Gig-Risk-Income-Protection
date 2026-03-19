import { AnimatePresence, motion } from 'framer-motion'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ScreenHeader } from '../components/ScreenHeader'
import { CheckIcon } from '../components/icons'
import { PageTransition } from '../components/PageTransition'
import { StaggerGroup } from '../components/StaggerGroup'
import { Card, PrimaryButton, SecondaryButton, StatusBadge } from '../components/ui'
import { planOptions } from '../data/appData'
import { useGRIP } from '../context/GRIPContext'
import { formatCurrency } from '../lib/utils'

const MotionOverlay = motion.div
const MotionSheet = motion.div

export function PolicySelectionScreen() {
  const navigate = useNavigate()
  const { selectedPlan, setSelectedPlan } = useGRIP()
  const [pendingPlan, setPendingPlan] = useState(null)

  function handleConfirm() {
    if (!pendingPlan) return
    setSelectedPlan(pendingPlan.name)
    setPendingPlan(null)
    navigate('/policy/active')
  }

  return (
    <PageTransition className="flex min-h-full flex-col">
      <ScreenHeader title="Choose Your Plan" backTo="/dashboard" />

      <div className="flex-1 overflow-y-auto px-5 pb-6 pt-6">
        <div className="space-y-6">
          <div className="space-y-2">
            <h2 className="text-[18px] font-semibold text-text-primary">
              Select your coverage tier
            </h2>
            <p className="text-[14px] text-text-secondary">
              Premiums are auto-deducted from your weekly earnings every Monday.
            </p>
          </div>

          <StaggerGroup className="space-y-6">
            {planOptions.map((plan) => {
              const isStandard = plan.name === 'Standard'
              const isCurrent = selectedPlan.name === plan.name
              const ButtonComponent = isStandard ? PrimaryButton : SecondaryButton

              return (
                <Card
                  key={plan.name}
                  className={`relative space-y-5 border-white/80 ${isStandard ? 'ring-1 ring-[rgba(36,69,122,0.12)] bg-[linear-gradient(180deg,rgba(95,127,174,0.08)_0%,rgba(255,255,255,0.95)_42%)]' : ''}`}
                >
                  {plan.recommended ? (
                    <div className="absolute right-5 top-5">
                      <StatusBadge status="pending" label="Recommended" />
                    </div>
                  ) : null}

                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-3">
                      <h3 className="text-[18px] font-semibold text-text-primary">
                        {plan.name}
                      </h3>
                      {isCurrent ? (
                        <StatusBadge status="active" label="Current" />
                      ) : null}
                    </div>
                    <p className="text-[15px] font-semibold text-accent-primary">
                      {formatCurrency(plan.weeklyPremium)} / week
                    </p>
                    <div className="space-y-2 text-[14px] text-text-secondary">
                      <p>Payout per day: {formatCurrency(plan.payoutPerDay)}</p>
                      <p>Weekly cap: {formatCurrency(plan.weeklyCap)}</p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {plan.features.map((feature) => (
                      <div key={feature} className="flex items-start gap-3">
                        <span className="mt-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-[rgba(76,175,125,0.15)] text-accent-success">
                          <CheckIcon className="h-3.5 w-3.5" />
                        </span>
                        <p className="text-[14px] text-text-primary">{feature}</p>
                      </div>
                    ))}
                  </div>

                  <ButtonComponent onClick={() => setPendingPlan(plan)}>
                    {`Select ${plan.name}`}
                  </ButtonComponent>
                </Card>
              )
            })}
          </StaggerGroup>
        </div>
      </div>

      <AnimatePresence>
        {pendingPlan ? (
          <>
            <MotionOverlay
              className="absolute inset-0 z-40 bg-[rgba(23,32,51,0.16)] backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1, transition: { duration: 0.3, ease: 'easeOut' } }}
              exit={{ opacity: 0, transition: { duration: 0.3, ease: 'easeOut' } }}
              onClick={() => setPendingPlan(null)}
            />
            <MotionSheet
              className="absolute inset-x-0 bottom-0 z-50 rounded-t-[28px] border border-white/80 bg-bg-surface/96 px-5 pb-6 pt-5 shadow-frame backdrop-blur-md"
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0, transition: { duration: 0.3, ease: 'easeOut' } }}
              exit={{ opacity: 0, y: 24, transition: { duration: 0.3, ease: 'easeOut' } }}
            >
              <div className="mx-auto mb-5 h-1.5 w-12 rounded-full bg-border-default" />
              <div className="space-y-5">
                <div className="space-y-2">
                  <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-text-secondary">
                    Confirm Selection
                  </p>
                  <h3 className="text-[18px] font-semibold text-text-primary">
                    {pendingPlan.name} Plan
                  </h3>
                  <p className="text-[14px] text-text-secondary">
                    {formatCurrency(pendingPlan.weeklyPremium)} / week with payouts of{' '}
                    {formatCurrency(pendingPlan.payoutPerDay)} per disruption day.
                  </p>
                </div>
                <PrimaryButton onClick={handleConfirm}>Confirm</PrimaryButton>
              </div>
            </MotionSheet>
          </>
        ) : null}
      </AnimatePresence>
    </PageTransition>
  )
}
