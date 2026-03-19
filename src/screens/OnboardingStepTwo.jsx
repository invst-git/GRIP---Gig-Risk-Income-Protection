import { useNavigate } from 'react-router-dom'
import { ScreenHeader } from '../components/ScreenHeader'
import { StepDots } from '../components/StepDots'
import { PageTransition } from '../components/PageTransition'
import { InputField, PrimaryButton, SegmentedControl } from '../components/ui'
import { platformOptions, vehicleOptions } from '../data/appData'
import { useGRIP } from '../context/GRIPContext'

function sanitizeDigits(value, maxLength) {
  return value.replace(/\D/g, '').slice(0, maxLength)
}

export function OnboardingStepTwo() {
  const navigate = useNavigate()
  const { onboardingForm, updateOnboardingField } = useGRIP()

  return (
    <PageTransition className="flex min-h-full flex-col">
      <ScreenHeader title="Step 2 of 3" backTo="/onboarding/1" align="center" />
      <StepDots activeStep={2} />

      <div className="flex-1 overflow-y-auto px-4 pb-5 pt-5 sm:px-5 sm:pb-6 sm:pt-6">
        <div className="space-y-6">
          <div className="space-y-2">
            <h1 className="font-display text-[24px] font-normal text-text-primary">
              Your work profile
            </h1>
            <p className="text-[14px] text-text-secondary">
              We use this to assess your zone and seasonal risk.
            </p>
          </div>

          <div className="space-y-4">
            <SegmentedControl
              label="Platform"
              options={platformOptions}
              value={onboardingForm.platform}
              onChange={(value) => updateOnboardingField('platform', value)}
            />
            <SegmentedControl
              label="Vehicle Type"
              options={vehicleOptions}
              value={onboardingForm.vehicleType}
              onChange={(value) => updateOnboardingField('vehicleType', value)}
            />
            <InputField
              label="Operating Zone"
              placeholder="e.g. Connaught Place, Koramangala"
              value={onboardingForm.operatingZone}
              onChange={(event) => updateOnboardingField('operatingZone', event.target.value)}
            />
            <InputField
              label="Average Daily Orders"
              type="text"
              inputMode="numeric"
              placeholder="e.g. 28"
              value={onboardingForm.avgDailyOrders}
              onChange={(event) =>
                updateOnboardingField(
                  'avgDailyOrders',
                  sanitizeDigits(event.target.value, 2),
                )
              }
            />
            <InputField
              label="Average Daily Working Hours"
              type="text"
              inputMode="numeric"
              placeholder="e.g. 10"
              value={onboardingForm.avgDailyHours}
              onChange={(event) =>
                updateOnboardingField(
                  'avgDailyHours',
                  sanitizeDigits(event.target.value, 2),
                )
              }
            />
          </div>
        </div>
      </div>

      <div className="px-4 pb-5 pt-2 sm:px-5 sm:pb-6">
        <PrimaryButton onClick={() => navigate('/onboarding/3')}>
          Continue
        </PrimaryButton>
      </div>
    </PageTransition>
  )
}
