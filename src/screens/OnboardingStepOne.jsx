import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ScreenHeader } from '../components/ScreenHeader'
import { StepDots } from '../components/StepDots'
import { PageTransition } from '../components/PageTransition'
import { InputField, PrimaryButton } from '../components/ui'
import { cityOptions } from '../data/appData'
import { useGRIP } from '../context/GRIPContext'

function sanitizeDigits(value, maxLength) {
  return value.replace(/\D/g, '').slice(0, maxLength)
}

export function OnboardingStepOne() {
  const navigate = useNavigate()
  const { onboardingForm, updateOnboardingField } = useGRIP()
  const [errors, setErrors] = useState({})

  function setField(field, value) {
    updateOnboardingField(field, value)
    setErrors((current) => ({
      ...current,
      [field]: value ? '' : current[field],
    }))
  }

  function handleContinue() {
    const nextErrors = {}

    if (!onboardingForm.fullName.trim()) nextErrors.fullName = 'This field is required'
    if (!onboardingForm.mobileNumber.trim()) nextErrors.mobileNumber = 'This field is required'
    if (!onboardingForm.city.trim()) nextErrors.city = 'This field is required'
    if (!onboardingForm.aadhaarLast4.trim()) nextErrors.aadhaarLast4 = 'This field is required'

    setErrors(nextErrors)

    if (Object.keys(nextErrors).length > 0) {
      return
    }

    navigate('/onboarding/2')
  }

  return (
    <PageTransition className="flex min-h-full flex-col">
      <ScreenHeader title="Step 1 of 3" backTo="/" align="center" />
      <StepDots activeStep={1} />

      <div className="flex-1 overflow-y-auto px-5 pb-6 pt-6">
        <div className="space-y-6">
          <div className="space-y-2">
            <h1 className="font-display text-[24px] font-normal text-text-primary">
              Tell us about yourself
            </h1>
            <p className="text-[14px] text-text-secondary">
              This helps us calculate your risk profile and weekly premium.
            </p>
          </div>

          <div className="space-y-4">
            <InputField
              label="Full Name"
              placeholder="Arjun Kumar"
              value={onboardingForm.fullName}
              onChange={(event) => setField('fullName', event.target.value)}
              error={errors.fullName}
            />
            <InputField
              label="Mobile Number"
              type="tel"
              inputMode="numeric"
              placeholder="98XXXXXXXX"
              value={onboardingForm.mobileNumber}
              onChange={(event) =>
                setField('mobileNumber', sanitizeDigits(event.target.value, 10))
              }
              error={errors.mobileNumber}
            />
            <InputField
              label="City"
              as="select"
              value={onboardingForm.city}
              onChange={(event) => setField('city', event.target.value)}
              options={[
                { label: 'Select city', value: '' },
                ...cityOptions.map((city) => ({ label: city, value: city })),
              ]}
              error={errors.city}
            />
            <InputField
              label="Aadhaar Last 4 Digits"
              note="Used for KYC verification only"
              type="text"
              inputMode="numeric"
              placeholder="XXXX"
              value={onboardingForm.aadhaarLast4}
              onChange={(event) =>
                setField('aadhaarLast4', sanitizeDigits(event.target.value, 4))
              }
              error={errors.aadhaarLast4}
            />
          </div>
        </div>
      </div>

      <div className="px-5 pb-6 pt-2">
        <PrimaryButton onClick={handleContinue}>Continue</PrimaryButton>
      </div>
    </PageTransition>
  )
}
