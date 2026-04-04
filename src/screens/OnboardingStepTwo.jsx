import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PageTransition } from '../components/PageTransition'
import { ScreenHeader } from '../components/ScreenHeader'
import { StepDots } from '../components/StepDots'
import { InputField, PrimaryButton } from '../components/ui'
import { useGRIP } from '../context/GRIPContext'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL

function sanitizeDigits(value, maxLength) {
  return value.replace(/\D/g, '').slice(0, maxLength)
}

export function OnboardingStepTwo() {
  const navigate = useNavigate()
  const { onboardingForm, updateOnboardingField } = useGRIP()
  const [errors, setErrors] = useState({})
  const [panVerifying, setPanVerifying] = useState(false)
  const [panError, setPanError] = useState(null)
  const [panWarning, setPanWarning] = useState(null)

  function updateForm(field, value) {
    if (field === 'panNumber') {
      updateOnboardingField('panVerified', false)
      updateOnboardingField('panMasked', '')
      setPanError(null)
      setPanWarning(null)
    }

    updateOnboardingField(field, value)
    setErrors((current) => ({ ...current, [field]: '' }))
  }

  async function handleVerifyPAN() {
    setPanVerifying(true)
    setPanError(null)
    setPanWarning(null)

    try {
      const response = await fetch(`${API_BASE_URL}/kyc/verify-pan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pan_number: onboardingForm.panNumber,
          name: onboardingForm.fullName,
        }),
      })
      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'PAN verification failed')
      }

      updateOnboardingField('panVerified', true)
      updateOnboardingField('panMasked', data.pan_masked || '')

      if (data.code === 'NAME_MISMATCH') {
        setPanWarning(`PAN name differs from entered name. Record found for ${data.holder_name}.`)
      }
    } catch (error) {
      updateOnboardingField('panVerified', false)
      updateOnboardingField('panMasked', '')
      setPanError(error.message || 'PAN verification failed')
    } finally {
      setPanVerifying(false)
    }
  }

  function handleContinue() {
    const nextErrors = {}

    if (onboardingForm.aadhaarLast4.length !== 4) {
      nextErrors.aadhaarLast4 = 'Enter the last 4 Aadhaar digits'
    }
    if (onboardingForm.panNumber.length !== 10) {
      nextErrors.panNumber = 'Enter a valid PAN number'
    }
    if (!onboardingForm.panVerified) {
      nextErrors.panNumber = 'Verify your PAN before continuing'
    }

    setErrors(nextErrors)

    if (Object.keys(nextErrors).length > 0) {
      return
    }

    navigate('/onboarding/3')
  }

  return (
    <PageTransition className="flex min-h-full flex-col">
      <ScreenHeader title="Step 2 of 6" backTo="/onboarding/1" align="center" />
      <StepDots activeStep={2} totalSteps={6} />

      <div className="flex-1 overflow-y-auto px-4 pb-5 pt-5 sm:px-5 sm:pb-6 sm:pt-6">
        <div className="space-y-6">
          <div className="space-y-2">
            <h1 className="font-display text-[24px] font-normal text-text-primary">
              Identity verification
            </h1>
            <p className="text-[14px] text-text-secondary">
              We verify masked identity records only. Full document numbers are never stored.
            </p>
          </div>

          <div className="space-y-4">
            <InputField
              label="Aadhaar Last 4 Digits"
              type="text"
              inputMode="numeric"
              maxLength={4}
              placeholder=""
              value={onboardingForm.aadhaarLast4}
              onChange={(event) =>
                updateForm('aadhaarLast4', sanitizeDigits(event.target.value, 4))
              }
              note="Used for KYC verification only"
              error={errors.aadhaarLast4}
            />

            <div className="space-y-3">
              <InputField
                label="PAN Card Number"
                placeholder="e.g. ABCDE1234F"
                maxLength={10}
                value={onboardingForm.panNumber.toUpperCase()}
                onChange={(event) =>
                  updateForm('panNumber', event.target.value.toUpperCase().slice(0, 10))
                }
                error={errors.panNumber}
              />
              <button
                type="button"
                onClick={handleVerifyPAN}
                disabled={onboardingForm.panNumber.length !== 10 || panVerifying}
                className="text-xs text-amber-600 underline disabled:cursor-not-allowed disabled:opacity-60"
              >
                {panVerifying ? 'Verifying...' : 'Verify PAN'}
              </button>
              {onboardingForm.panVerified ? (
                <p className="text-xs text-green-600">
                  PAN verified - {onboardingForm.panMasked}
                </p>
              ) : null}
              {panWarning ? <p className="text-xs text-amber-600">{panWarning}</p> : null}
              {panError ? <p className="text-xs text-red-400">{panError}</p> : null}
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-[11px] font-medium uppercase tracking-[0.08em] text-text-secondary">
                Selfie for Identity Verification
              </label>
              <div className="flex flex-col items-center gap-2 rounded-input border-2 border-dashed border-border-default bg-bg-surface py-8">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-border-default text-text-secondary">
                  <svg
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    aria-hidden="true"
                  >
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                </div>
                <p className="text-sm text-text-secondary">Tap to take selfie</p>
                <p className="text-xs text-text-secondary opacity-60">
                  Used for liveness verification only
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 pb-5 pt-2 sm:px-5 sm:pb-6">
        <PrimaryButton onClick={handleContinue}>Continue</PrimaryButton>
      </div>
    </PageTransition>
  )
}
