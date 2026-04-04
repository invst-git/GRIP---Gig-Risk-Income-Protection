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
import { updatePartnerPlan } from '../services/registrationService'

const MotionOverlay = motion.div
const MotionSheet = motion.div
const TIER_PAYOUTS = { Basic: 300, Standard: 400, Premium: 500 }
const TIER_CAPS = { Basic: 900, Standard: 1200, Premium: 1500 }

export function PolicySelectionScreen() {
  const navigate = useNavigate()
  const { selectedPlan, setSelectedPlan, registrationResult, setRegistrationResult } = useGRIP()
  const [pendingPlan, setPendingPlan] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)

  const partner = registrationResult?.partner
  const zoneRiskScore = Number(partner?.zone_risk_score) || 1
  const policyId = registrationResult?.policy?.id
  const displayPlans = planOptions.map((plan) => ({
    ...plan,
    weeklyPremium: Math.round(
      49 *
        zoneRiskScore *
        { Basic: 1.0, Standard: 1.25, Premium: 1.5 }[plan.name],
    ),
    payoutPerDay: TIER_PAYOUTS[plan.name],
    weeklyCap: TIER_CAPS[plan.name],
  }))

  async function handleConfirm() {
    if (!pendingPlan) return
    setIsLoading(true)
    setError(null)

    try {
      const partnerId = registrationResult?.partner?.id

      if (!partnerId) {
        throw new Error('Partner context missing')
      }

      const result = await updatePartnerPlan(partnerId, policyId, pendingPlan.name)

      setSelectedPlan(pendingPlan.name)
      setRegistrationResult((current) => ({
        ...(current ?? {}),
        weeklyPremium: result.weeklyPremium,
        policy: {
          ...(current?.policy ?? {}),
          id: result.policyId,
          coverage_tier: pendingPlan.name,
          weekly_premium: result.weeklyPremium,
          payout_per_day: result.payoutPerDay,
          weekly_cap: result.weeklyCap,
        },
        partner: {
          ...(current?.partner ?? {}),
          coverage_tier: pendingPlan.name,
          weekly_premium: result.weeklyPremium,
          payout_per_day: result.payoutPerDay,
          weekly_cap: result.weeklyCap,
        },
      }))

      setPendingPlan(null)
      navigate('/policy')
    } catch {
      setError('Plan update failed. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <PageTransition className="flex min-h-full flex-col">
      <ScreenHeader title="Choose Your Plan" backTo="/dashboard" />

      <div className="flex-1 overflow-y-auto px-4 pb-5 pt-5 sm:px-5 sm:pb-6 sm:pt-6">
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
            {displayPlans.map((plan) => {
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

                  <ButtonComponent onClick={() => setPendingPlan(plan)} disabled={isLoading}>
                    {`Select ${plan.name}`}
                  </ButtonComponent>
                </Card>
              )
            })}
          </StaggerGroup>
          {error ? (
            <Card className="border-white/80">
              <p className="text-[13px] text-accent-danger">{error}</p>
            </Card>
          ) : null}
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
              className="absolute inset-x-0 bottom-0 z-50 rounded-t-[28px] border border-white/80 bg-bg-surface/96 px-4 pb-5 pt-5 shadow-frame backdrop-blur-md sm:px-5 sm:pb-6"
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
                <PrimaryButton
                  onClick={handleConfirm}
                  loading={isLoading}
                  loadingText="Updating plan..."
                >
                  Confirm
                </PrimaryButton>
              </div>
            </MotionSheet>
          </>
        ) : null}
      </AnimatePresence>
    </PageTransition>
  )
}
