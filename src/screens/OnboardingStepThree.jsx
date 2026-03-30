import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, PrimaryButton } from '../components/ui'
import { PageTransition } from '../components/PageTransition'
import { ScreenHeader } from '../components/ScreenHeader'
import { StepDots } from '../components/StepDots'
import { InputField } from '../components/ui'
import { CheckIcon } from '../components/icons'
import { useGRIP } from '../context/GRIPContext'

export function OnboardingStepThree() {
  const navigate = useNavigate()
  const { onboardingForm, updateOnboardingField, submitRegistration } = useGRIP()
  const [errors, setErrors] = useState({})
  const [isLoading, setIsLoading] = useState(false)

  async function handleContinue() {
    const nextErrors = {}

    if (!onboardingForm.upiId.trim()) nextErrors.upiId = 'This field is required'
    if (!onboardingForm.confirmUpiId.trim()) {
      nextErrors.confirmUpiId = 'This field is required'
    } else if (onboardingForm.confirmUpiId !== onboardingForm.upiId) {
      nextErrors.confirmUpiId = 'UPI IDs must match'
    }

    if (!onboardingForm.consent) {
      nextErrors.consent = 'This field is required'
    }

    setErrors(nextErrors)

    if (Object.keys(nextErrors).length > 0) {
      return
    }

    setIsLoading(true)

    try {
      await submitRegistration()
      navigate('/onboarding/complete')
    } catch {
      setErrors({ upiId: 'Registration failed. Please try again.' })
      setIsLoading(false)
    }
  }

  function updateField(field, value) {
    updateOnboardingField(field, value)
    setErrors((current) => ({
      ...current,
      [field]: value ? '' : current[field],
    }))
  }

  return (
    <PageTransition className="flex min-h-full flex-col">
      <ScreenHeader title="Step 3 of 3" backTo="/onboarding/2" align="center" />
      <StepDots activeStep={3} />

      <div className="flex-1 overflow-y-auto px-4 pb-5 pt-5 sm:px-5 sm:pb-6 sm:pt-6">
        <div className="space-y-6">
          <div className="space-y-2">
            <h1 className="font-display text-[24px] font-normal text-text-primary">
              Set up your payout
            </h1>
            <p className="text-[14px] text-text-secondary">
              All payouts are sent instantly to your UPI ID when a trigger fires.
            </p>
          </div>

          <div className="space-y-4">
            <InputField
              label="UPI ID"
              placeholder="yourname@upi"
              value={onboardingForm.upiId}
              onChange={(event) => updateField('upiId', event.target.value)}
              error={errors.upiId}
            />
            <InputField
              label="Confirm UPI ID"
              placeholder="Re-enter UPI ID"
              value={onboardingForm.confirmUpiId}
              onChange={(event) => updateField('confirmUpiId', event.target.value)}
              error={errors.confirmUpiId}
            />

            <Card className="relative overflow-hidden">
              <span className="absolute inset-y-0 left-0 w-1 bg-accent-primary" />
              <p className="pl-2 text-[13px] leading-6 text-text-primary">
                Your first payout will be capped at Rs 4,000 as per RBI guidelines for new
                beneficiaries. Subsequent payouts have no cap within your coverage tier.
              </p>
            </Card>

            <div className="space-y-2 rounded-card border border-border-default bg-bg-surface p-5 shadow-card">
              <button
                type="button"
                className="flex items-start gap-3 text-left"
                onClick={() => {
                  updateOnboardingField('consent', !onboardingForm.consent)
                  setErrors((current) => ({ ...current, consent: '' }))
                }}
              >
                <span
                  className={`mt-0.5 flex h-5 w-5 items-center justify-center rounded-[6px] border ${
                    onboardingForm.consent
                      ? 'border-accent-primary bg-accent-primary text-text-on-accent'
                      : 'border-border-default bg-bg-elevated text-transparent'
                  }`}
                >
                  <CheckIcon className="h-3.5 w-3.5" />
                </span>
                <span className="text-[14px] leading-6 text-text-primary">
                  I authorise GRIP to deduct my weekly premium automatically from my
                  Zomato/Swiggy earnings settlement.
                </span>
              </button>
              {errors.consent ? (
                <p className="text-[12px] text-accent-danger">{errors.consent}</p>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 pb-5 pt-2 sm:px-5 sm:pb-6">
        <PrimaryButton
          onClick={handleContinue}
          loading={isLoading}
          loadingText="Verifying..."
        >
          Activate Coverage
        </PrimaryButton>
      </div>
    </PageTransition>
  )
}
