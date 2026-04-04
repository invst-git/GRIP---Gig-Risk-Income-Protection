import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PageTransition } from '../components/PageTransition'
import { ScreenHeader } from '../components/ScreenHeader'
import { StepDots } from '../components/StepDots'
import { InputField, PrimaryButton, SegmentedControl } from '../components/ui'
import { useGRIP } from '../context/GRIPContext'
import { platformOptions, vehicleOptions } from '../data/appData'

function sanitizeDigits(value, maxLength) {
  return value.replace(/\D/g, '').slice(0, maxLength)
}

export function OnboardingStepThree() {
  const navigate = useNavigate()
  const { onboardingForm, updateOnboardingField } = useGRIP()
  const [errors, setErrors] = useState({})

  function updateForm(field, value) {
    if (field === 'vehicleType') {
      updateOnboardingField('dlNumber', '')
      updateOnboardingField('dlVerified', false)
      updateOnboardingField('dlMasked', '')
      updateOnboardingField('rcNumber', '')
      updateOnboardingField('rcVerified', false)
      updateOnboardingField('hasInsurance', false)
    }
    updateOnboardingField(field, value)
    setErrors((current) => ({ ...current, [field]: '' }))
  }

  function handleContinue() {
    const nextErrors = {}

    if (!onboardingForm.platform) nextErrors.platform = 'This field is required'
    if (!onboardingForm.vehicleType) nextErrors.vehicleType = 'This field is required'
    if (!onboardingForm.operatingZone.trim()) nextErrors.operatingZone = 'This field is required'
    if (!onboardingForm.avgDailyOrders.trim()) nextErrors.avgDailyOrders = 'This field is required'
    if (!onboardingForm.avgDailyHours.trim()) nextErrors.avgDailyHours = 'This field is required'

    setErrors(nextErrors)

    if (Object.keys(nextErrors).length > 0) {
      return
    }

    navigate('/onboarding/4')
  }

  return (
    <PageTransition className="flex min-h-full flex-col">
      <ScreenHeader title="Step 3 of 6" backTo="/onboarding/2" align="center" />
      <StepDots activeStep={3} totalSteps={6} />

      <div className="flex-1 overflow-y-auto px-4 pb-5 pt-5 sm:px-5 sm:pb-6 sm:pt-6">
        <div className="space-y-6">
          <div className="space-y-2">
            <h1 className="font-display text-[24px] font-normal text-text-primary">
              Work profile
            </h1>
            <p className="text-[14px] text-text-secondary">
              Your city, zone, vehicle, and activity pattern drive the premium quote.
            </p>
          </div>

          <div className="space-y-4">
            <SegmentedControl
              label="Platform"
              options={platformOptions}
              value={onboardingForm.platform}
              onChange={(value) => updateForm('platform', value)}
            />
            {errors.platform ? (
              <p className="-mt-2 text-[12px] text-accent-danger">{errors.platform}</p>
            ) : null}

            <SegmentedControl
              label="Vehicle Type"
              options={vehicleOptions}
              value={onboardingForm.vehicleType}
              onChange={(value) => updateForm('vehicleType', value)}
            />
            {errors.vehicleType ? (
              <p className="-mt-2 text-[12px] text-accent-danger">{errors.vehicleType}</p>
            ) : null}

            <InputField
              label="Operating Zone"
              placeholder=""
              value={onboardingForm.operatingZone}
              onChange={(event) => updateForm('operatingZone', event.target.value)}
              error={errors.operatingZone}
            />
            <InputField
              label="Average Daily Orders"
              type="text"
              inputMode="numeric"
              placeholder=""
              value={onboardingForm.avgDailyOrders}
              onChange={(event) =>
                updateForm('avgDailyOrders', sanitizeDigits(event.target.value, 2))
              }
              error={errors.avgDailyOrders}
            />
            <InputField
              label="Average Daily Working Hours"
              type="text"
              inputMode="numeric"
              placeholder=""
              value={onboardingForm.avgDailyHours}
              onChange={(event) =>
                updateForm('avgDailyHours', sanitizeDigits(event.target.value, 2))
              }
              error={errors.avgDailyHours}
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
