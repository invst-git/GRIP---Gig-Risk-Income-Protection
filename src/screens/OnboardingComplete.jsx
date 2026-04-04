import { useNavigate } from 'react-router-dom'
import { AnimatedCheckmark } from '../components/AnimatedCheckmark'
import { PageTransition } from '../components/PageTransition'
import { StaggerGroup } from '../components/StaggerGroup'
import { Card, PrimaryButton } from '../components/ui'
import { useGRIP } from '../context/GRIPContext'
import { formatCurrency } from '../lib/utils'

function DetailRow({ label, value, hasDivider = true, valueClassName = '' }) {
  return (
    <div className={hasDivider ? 'border-b border-border-default pb-4' : ''}>
      <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-text-secondary">
        {label}
      </p>
      <p className={`mt-2 text-[15px] font-semibold text-text-primary ${valueClassName}`}>
        {value}
      </p>
    </div>
  )
}

export function OnboardingComplete() {
  const navigate = useNavigate()
  const { profile, registrationResult } = useGRIP()

  return (
    <PageTransition className="relative flex min-h-full flex-col justify-center overflow-x-hidden overflow-y-auto px-4 py-[clamp(24px,5vh,40px)] grip-radial-alert sm:px-5">
      <div className="pointer-events-none absolute inset-x-0 top-14 z-0 mx-auto h-56 w-56 rounded-full grip-soft-orb" />
      <StaggerGroup className="mx-auto w-full max-w-[390px] space-y-5 text-center sm:space-y-6">
        <div className="relative z-10 flex justify-center">
          <div className="rounded-full border border-white/80 bg-bg-surface/86 p-4 shadow-card backdrop-blur-sm">
            <AnimatedCheckmark className="h-24 w-24 sm:h-28 sm:w-28" />
          </div>
        </div>

        <div className="relative z-10 space-y-3">
          <h1 className="font-display text-[clamp(22px,6.5vw,24px)] font-normal text-text-primary">
            You&apos;re covered.
          </h1>
          <p className="mx-auto max-w-[320px] text-[14px] leading-6 text-text-secondary">
            Your GRIP policy is now active. Your weekly premium of{' '}
            {formatCurrency(profile.weeklyPremium)} will be auto-deducted every Monday
            from your earnings.
          </p>
        </div>

        <Card className="relative z-10 space-y-4 border-white/80 text-left">
          <DetailRow
            label="Coverage Tier"
            value={profile.coverageTier}
            valueClassName="text-accent-primary"
          />
          <DetailRow label="Weekly Premium" value={formatCurrency(profile.weeklyPremium)} />
          <DetailRow
            label="Payout Per Disruption Day"
            value={formatCurrency(profile.payoutPerDay)}
          />
          <DetailRow
            label="Weekly Payout Cap"
            value={formatCurrency(profile.weeklyCap)}
            hasDivider={false}
          />
        </Card>

        <p className="relative z-10 text-[12px] text-text-secondary">
          Premium dynamically priced. Your zone risk score:{' '}
          {Number(registrationResult?.zoneRiskScore || 0).toFixed(2)}x
        </p>

        <PrimaryButton className="relative z-10" onClick={() => navigate('/dashboard')}>
          Go to Dashboard
        </PrimaryButton>
      </StaggerGroup>
    </PageTransition>
  )
}
