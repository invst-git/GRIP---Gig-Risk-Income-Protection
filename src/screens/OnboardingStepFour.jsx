import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PageTransition } from '../components/PageTransition'
import { ScreenHeader } from '../components/ScreenHeader'
import { StepDots } from '../components/StepDots'
import { InputField, PrimaryButton } from '../components/ui'
import { useGRIP } from '../context/GRIPContext'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL

export function OnboardingStepFour() {
  const navigate = useNavigate()
  const { onboardingForm, updateOnboardingField } = useGRIP()
  const [errors, setErrors] = useState({})
  const [dlVerifying, setDlVerifying] = useState(false)
  const [rcVerifying, setRcVerifying] = useState(false)
  const [dlError, setDlError] = useState(null)
  const [rcError, setRcError] = useState(null)

  useEffect(() => {
    if (onboardingForm.vehicleType === 'Bicycle') {
      navigate('/onboarding/5', { replace: true })
    }
  }, [navigate, onboardingForm.vehicleType])

  function updateForm(field, value) {
    if (field === 'dlNumber') {
      updateOnboardingField('dlVerified', false)
      updateOnboardingField('dlMasked', '')
      setDlError(null)
    }
    if (field === 'rcNumber') {
      updateOnboardingField('rcVerified', false)
      setRcError(null)
    }

    updateOnboardingField(field, value)
    setErrors((current) => ({ ...current, [field]: '' }))
  }

  async function handleVerifyDL() {
    setDlVerifying(true)
    setDlError(null)

    try {
      const response = await fetch(`${API_BASE_URL}/kyc/verify-dl`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dl_number: onboardingForm.dlNumber,
          dob: onboardingForm.dateOfBirth,
        }),
      })
      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Driving licence verification failed')
      }

      updateOnboardingField('dlVerified', true)
      updateOnboardingField('dlMasked', data.dl_masked || '')
    } catch (error) {
      updateOnboardingField('dlVerified', false)
      updateOnboardingField('dlMasked', '')
      setDlError(error.message || 'Driving licence verification failed')
    } finally {
      setDlVerifying(false)
    }
  }

  async function handleVerifyRC() {
    setRcVerifying(true)
    setRcError(null)

    try {
      const response = await fetch(`${API_BASE_URL}/kyc/verify-rc`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rc_number: onboardingForm.rcNumber }),
      })
      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Vehicle registration verification failed')
      }

      updateOnboardingField('rcVerified', true)
    } catch (error) {
      updateOnboardingField('rcVerified', false)
      setRcError(error.message || 'Vehicle registration verification failed')
    } finally {
      setRcVerifying(false)
    }
  }

  function handleContinue() {
    const nextErrors = {}

    if (!onboardingForm.dlNumber.trim()) nextErrors.dlNumber = 'This field is required'
    if (!onboardingForm.dlVerified) nextErrors.dlNumber = 'Verify your driving licence first'
    if (!onboardingForm.rcNumber.trim()) nextErrors.rcNumber = 'This field is required'
    if (!onboardingForm.rcVerified) nextErrors.rcNumber = 'Verify your vehicle registration first'
    if (onboardingForm.platform === 'Zomato' && !onboardingForm.hasInsurance) {
      nextErrors.hasInsurance = 'Vehicle insurance is required for Zomato partners'
    }
    if (onboardingForm.emergencyContact.length !== 10) {
      nextErrors.emergencyContact = 'Enter a valid 10-digit mobile number'
    }

    setErrors(nextErrors)

    if (Object.keys(nextErrors).length > 0) {
      return
    }

    navigate('/onboarding/5')
  }

  return (
    <PageTransition className="flex min-h-full flex-col">
      <ScreenHeader title="Step 4 of 6" backTo="/onboarding/3" align="center" />
      <StepDots activeStep={4} totalSteps={6} />

      <div className="flex-1 overflow-y-auto px-4 pb-5 pt-5 sm:px-5 sm:pb-6 sm:pt-6">
        <div className="space-y-6">
          <div className="space-y-2">
            <h1 className="font-display text-[24px] font-normal text-text-primary">
              Vehicle documents
            </h1>
            <p className="text-[14px] text-text-secondary">
              Motorized vehicles need licence and registration checks before coverage starts.
            </p>
          </div>

          <div className="space-y-4">
            <div className="space-y-3">
              <InputField
                label="Driving Licence Number"
                placeholder="e.g. DL0420110012345"
                value={onboardingForm.dlNumber}
                onChange={(event) =>
                  updateForm('dlNumber', event.target.value.toUpperCase().replace(/\s+/g, ''))
                }
                error={errors.dlNumber}
              />
              <button
                type="button"
                onClick={handleVerifyDL}
                disabled={!onboardingForm.dlNumber || dlVerifying}
                className="text-xs text-amber-600 underline disabled:cursor-not-allowed disabled:opacity-60"
              >
                {dlVerifying ? 'Checking Sarathi...' : 'Verify with Sarathi'}
              </button>
              {onboardingForm.dlVerified ? (
                <p className="text-xs text-green-600">
                  DL verified - {onboardingForm.dlMasked}
                </p>
              ) : null}
              {dlError ? <p className="text-xs text-red-400">{dlError}</p> : null}
            </div>

            <div className="space-y-3">
              <InputField
                label="Vehicle Registration Number"
                placeholder="e.g. DL4CAB1234"
                value={onboardingForm.rcNumber}
                onChange={(event) =>
                  updateForm('rcNumber', event.target.value.toUpperCase().replace(/\s+/g, ''))
                }
                error={errors.rcNumber}
              />
              <button
                type="button"
                onClick={handleVerifyRC}
                disabled={!onboardingForm.rcNumber || rcVerifying}
                className="text-xs text-amber-600 underline disabled:cursor-not-allowed disabled:opacity-60"
              >
                {rcVerifying ? 'Checking Vahan...' : 'Verify with Vahan'}
              </button>
              {onboardingForm.rcVerified ? (
                <p className="text-xs text-green-600">RC verified</p>
              ) : null}
              {rcError ? <p className="text-xs text-red-400">{rcError}</p> : null}
            </div>

            <div className="rounded-card border border-border-default bg-bg-surface p-4 shadow-card">
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  id="insurance"
                  checked={onboardingForm.hasInsurance}
                  onChange={(event) => updateForm('hasInsurance', event.target.checked)}
                  className="mt-1 accent-amber-500"
                />
                <label htmlFor="insurance" className="text-sm leading-relaxed text-text-primary">
                  I have valid vehicle insurance
                  {onboardingForm.platform === 'Zomato' ? (
                    <span className="mt-0.5 block text-xs text-red-400">
                      Required for Zomato partners
                    </span>
                  ) : null}
                </label>
              </div>
              {errors.hasInsurance ? (
                <p className="mt-2 text-xs text-red-400">{errors.hasInsurance}</p>
              ) : null}
            </div>

            <InputField
              label="Emergency Contact Number"
              type="tel"
              placeholder="10-digit mobile number"
              maxLength={10}
              value={onboardingForm.emergencyContact}
              onChange={(event) =>
                updateForm('emergencyContact', event.target.value.replace(/\D/g, '').slice(0, 10))
              }
              note="Claim dispute support contact"
              error={errors.emergencyContact}
            />
          </div>
        </div>
      </div>

      <div className="px-4 pb-5 pt-2 sm:px-5 sm:pb-6">
        <PrimaryButton onClick={handleContinue}>Continue</PrimaryButton>
      </div>
    </PageTransition>
  )
}
