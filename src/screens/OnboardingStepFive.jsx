import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, InputField, PrimaryButton } from '../components/ui'
import { PageTransition } from '../components/PageTransition'
import { ScreenHeader } from '../components/ScreenHeader'
import { StepDots } from '../components/StepDots'
import { useGRIP } from '../context/GRIPContext'
import { checkUpiExists } from '../services/registrationService'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL

export function OnboardingStepFive() {
  const navigate = useNavigate()
  const { onboardingForm, updateOnboardingField, submitRegistration } = useGRIP()
  const [authorized, setAuthorized] = useState(false)
  const [errors, setErrors] = useState({})
  const [isLoading, setIsLoading] = useState(false)
  const [ifscVerifying, setIfscVerifying] = useState(false)

  const previousStepPath = useMemo(
    () => (onboardingForm.vehicleType === 'Bicycle' ? '/onboarding/3' : '/onboarding/4'),
    [onboardingForm.vehicleType],
  )

  function updateForm(field, value) {
    if (field === 'ifscCode') {
      updateOnboardingField('bankName', '')
    }

    updateOnboardingField(field, value)
    setErrors((current) => ({ ...current, [field]: '' }))
  }

  async function handleVerifyIFSC(rawIfsc) {
    const ifscCode = rawIfsc.toUpperCase().trim()

    if (ifscCode.length !== 11) {
      updateOnboardingField('bankName', '')
      return
    }

    setIfscVerifying(true)
    setErrors((current) => ({ ...current, ifscCode: '' }))

    try {
      const response = await fetch(`${API_BASE_URL}/kyc/verify-ifsc`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ifsc_code: ifscCode }),
      })
      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'IFSC verification failed')
      }

      updateOnboardingField('ifscCode', data.ifsc_code || ifscCode)
      updateOnboardingField('bankName', data.bank_name || '')
    } catch (error) {
      updateOnboardingField('bankName', '')
      setErrors((current) => ({
        ...current,
        ifscCode: error.message || 'IFSC verification failed',
      }))
    } finally {
      setIfscVerifying(false)
    }
  }

  async function handleContinue() {
    const nextErrors = {}

    if (onboardingForm.bankAccountNumber.length < 8) {
      nextErrors.bankAccountNumber = 'Enter a valid bank account number'
    }
    if (onboardingForm.ifscCode.length !== 11 || !onboardingForm.bankName) {
      nextErrors.ifscCode = 'Verify a valid IFSC code'
    }
    if (!onboardingForm.upiId.trim()) nextErrors.upiId = 'This field is required'
    if (!onboardingForm.confirmUpiId.trim()) {
      nextErrors.confirmUpiId = 'This field is required'
    } else if (onboardingForm.confirmUpiId !== onboardingForm.upiId) {
      nextErrors.confirmUpiId = 'UPI IDs do not match'
    }
    if (!authorized) {
      nextErrors.authorization = 'You must authorise payout and premium deduction'
    }

    setErrors(nextErrors)

    if (Object.keys(nextErrors).length > 0) {
      return
    }

    setIsLoading(true)

    try {
      const upiAlreadyExists = await checkUpiExists(onboardingForm.upiId)

      if (upiAlreadyExists) {
        setErrors({
          upiId: 'This UPI ID is already registered with another account',
        })
        setIsLoading(false)
        return
      }

      await submitRegistration()
      navigate('/onboarding/exclusions')
    } catch {
      setErrors({ upiId: 'Registration failed. Please try again.' })
    } finally {
      setIsLoading(false)
    }
  }

  const upiMismatch =
    onboardingForm.upiId &&
    onboardingForm.confirmUpiId &&
    onboardingForm.upiId !== onboardingForm.confirmUpiId

  const canContinue =
    onboardingForm.bankName &&
    onboardingForm.upiId &&
    onboardingForm.confirmUpiId &&
    !upiMismatch &&
    authorized

  return (
    <PageTransition className="flex min-h-full flex-col">
      <ScreenHeader title="Step 5 of 6" backTo={previousStepPath} align="center" />
      <StepDots activeStep={5} totalSteps={6} />

      <div className="flex-1 overflow-y-auto px-4 pb-5 pt-5 sm:px-5 sm:pb-6 sm:pt-6">
        <div className="space-y-6">
          <div className="space-y-2">
            <h1 className="font-display text-[24px] font-normal text-text-primary">
              Payment setup
            </h1>
            <p className="text-[14px] text-text-secondary">
              Bank details are masked. Payouts are sent to your registered UPI ID.
            </p>
          </div>

          <div className="space-y-4">
            <InputField
              label="Bank Account Number"
              placeholder="Enter your account number"
              type="password"
              value={onboardingForm.bankAccountNumber}
              onChange={(event) =>
                updateForm(
                  'bankAccountNumber',
                  event.target.value.replace(/\D/g, ''),
                )
              }
              note="Stored only as masked last 4"
              error={errors.bankAccountNumber}
            />

            <div className="space-y-2">
              <InputField
                label="IFSC Code"
                placeholder="e.g. SBIN0001234"
                maxLength={11}
                value={onboardingForm.ifscCode.toUpperCase()}
                onChange={(event) => {
                  const value = event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '')
                  updateForm('ifscCode', value)
                  if (value.length === 11) {
                    void handleVerifyIFSC(value)
                  }
                }}
                error={errors.ifscCode}
              />
              {ifscVerifying ? (
                <p className="pl-1 text-xs text-text-secondary">Verifying IFSC...</p>
              ) : null}
              {onboardingForm.bankName ? (
                <p className="pl-1 text-xs text-green-600">{onboardingForm.bankName}</p>
              ) : null}
            </div>

            <InputField
              label="UPI ID"
              placeholder="e.g. arjun@upi"
              value={onboardingForm.upiId}
              onChange={(event) => updateForm('upiId', event.target.value.toLowerCase())}
              note="Trigger payouts are sent here"
              error={errors.upiId}
            />

            <div className="space-y-2">
              <InputField
                label="Confirm UPI ID"
                placeholder="Re-enter UPI ID"
                value={onboardingForm.confirmUpiId}
                onChange={(event) =>
                  updateForm('confirmUpiId', event.target.value.toLowerCase())
                }
                error={errors.confirmUpiId}
              />
              {upiMismatch ? (
                <p className="pl-1 text-xs text-red-400">UPI IDs do not match</p>
              ) : null}
            </div>

            <Card className="relative overflow-hidden">
              <span className="absolute inset-y-0 left-0 w-1 bg-accent-primary" />
              <p className="pl-2 text-[13px] leading-6 text-text-primary">
                Your weekly premium of approximately <strong>Rs 49-74</strong> will be
                auto-deducted from your Zomato/Swiggy weekly earnings settlement every
                Monday. No upfront payment is required.
              </p>
            </Card>

            <div className="rounded-card border border-border-default bg-bg-surface p-5 shadow-card">
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  id="payment-auth"
                  checked={authorized}
                  onChange={(event) => {
                    setAuthorized(event.target.checked)
                    setErrors((current) => ({ ...current, authorization: '' }))
                  }}
                  className="mt-1 accent-amber-500"
                />
                <label
                  htmlFor="payment-auth"
                  className="text-sm leading-relaxed text-text-primary"
                >
                  I authorise GRIP to deduct my weekly premium automatically from my
                  Zomato/Swiggy earnings settlement and send payouts to my UPI ID when a
                  trigger fires.
                </label>
              </div>
              {errors.authorization ? (
                <p className="mt-2 text-xs text-red-400">{errors.authorization}</p>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 pb-5 pt-2 sm:px-5 sm:pb-6">
        <PrimaryButton
          onClick={handleContinue}
          disabled={!canContinue}
          loading={isLoading}
          loadingText="Activating..."
        >
          Continue
        </PrimaryButton>
      </div>
    </PageTransition>
  )
}
