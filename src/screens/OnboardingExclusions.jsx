import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PageTransition } from '../components/PageTransition'
import { ScreenHeader } from '../components/ScreenHeader'
import { StepDots } from '../components/StepDots'
import { Card, PrimaryButton } from '../components/ui'

const EXCLUSIONS = [
  {
    title: 'Acts of War and Civil Conflict',
    description:
      'Income loss caused by war, invasion, armed conflict, or government-declared states of emergency involving military action.',
  },
  {
    title: 'Pandemic and Epidemic Declarations',
    description:
      'Loss of income during nationally or internationally declared pandemics or epidemics, including platform shutdowns ordered under epidemic control measures.',
  },
  {
    title: 'Nuclear and Radiation Events',
    description:
      'Any disruption caused by nuclear reaction, radiation, or radioactive contamination regardless of cause.',
  },
  {
    title: 'Platform Policy Changes',
    description:
      "Deactivation, suspension, or income reduction caused by the platform's own policy decisions, algorithm changes, or terms of service enforcement.",
  },
  {
    title: 'Pre-existing Zone Restrictions',
    description:
      'Areas already under operational restrictions at the time of policy activation are excluded from curfew and social disruption triggers.',
  },
  {
    title: 'Voluntary Work Stoppage',
    description:
      'Income loss from personal choice not to work during a trigger event. Payouts require the trigger to have independently caused the disruption.',
  },
]

export default function OnboardingExclusions() {
  const navigate = useNavigate()
  const [agreed, setAgreed] = useState(false)

  return (
    <PageTransition className="flex min-h-full flex-col">
      <ScreenHeader title="Step 6 of 6" backTo="/onboarding/5" align="center" />
      <StepDots activeStep={6} totalSteps={6} />

      <div className="flex-1 overflow-y-auto px-4 pb-5 pt-5 sm:px-5 sm:pb-6 sm:pt-6">
        <div className="mx-auto w-full max-w-[390px] space-y-6">
          <div className="space-y-2">
            <h1 className="font-display text-[24px] font-normal text-text-primary">
              What GRIP Does Not Cover
            </h1>
            <p className="text-[14px] leading-6 text-text-secondary">
              Read carefully before activating your policy. These exclusions are
              permanent and cannot be waived.
            </p>
          </div>

          <div className="space-y-3">
            {EXCLUSIONS.map((exclusion) => (
              <Card
                key={exclusion.title}
                className="border-l-4 border-l-red-500"
              >
                <div className="space-y-2">
                  <h2 className="text-[15px] font-semibold text-text-primary">
                    {exclusion.title}
                  </h2>
                  <p className="text-[13px] leading-6 text-text-secondary">
                    {exclusion.description}
                  </p>
                </div>
              </Card>
            ))}
          </div>

          <div className="rounded-card border border-border-default bg-bg-surface p-5 shadow-card">
            <div className="flex items-start gap-3">
              <input
                type="checkbox"
                id="exclusions-consent"
                checked={agreed}
                onChange={(event) => setAgreed(event.target.checked)}
                className="mt-1 h-4 w-4 cursor-pointer accent-amber-500"
              />
              <label
                htmlFor="exclusions-consent"
                className="text-sm leading-relaxed text-text-secondary cursor-pointer"
              >
                I have read and understood all coverage exclusions. I agree these
                conditions apply to my GRIP policy.
              </label>
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 pb-5 pt-2 sm:px-5 sm:pb-6">
        <div className="mx-auto w-full max-w-[390px]">
          <PrimaryButton
            disabled={!agreed}
            onClick={() => navigate('/onboarding/complete')}
          >
            Activate My Policy
          </PrimaryButton>
        </div>
      </div>
    </PageTransition>
  )
}
