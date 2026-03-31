import { useNavigate } from 'react-router-dom'
import { ScreenHeader } from '../components/ScreenHeader'
import { DotIcon } from '../components/icons'
import { PageTransition } from '../components/PageTransition'
import { StaggerGroup } from '../components/StaggerGroup'
import { Card, SecondaryButton, StatusBadge } from '../components/ui'
import { useGRIP } from '../context/GRIPContext'
import { usePolicyData } from '../hooks/usePolicyData'
import { formatCurrency } from '../lib/utils'

function DetailRow({ label, value, emphasize = false }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-border-default py-3 last:border-b-0">
      <p className="text-[13px] text-text-secondary">{label}</p>
      <p
        className={`text-[14px] font-semibold ${emphasize ? 'text-accent-primary' : 'text-text-primary'}`}
      >
        {value}
      </p>
    </div>
  )
}

const disruptions = [
  'AQI above 300 (2+ consecutive days)',
  'Rainfall above 100mm (24h)',
  'Temperature above 43 degrees C (2+ consecutive days)',
]

function formatLongDate(dateValue) {
  if (!dateValue) return 'Unavailable'

  const parsedDate = new Date(dateValue)
  if (Number.isNaN(parsedDate.getTime())) return 'Unavailable'

  return parsedDate.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
}

function formatEnrollmentDate(dateValue, fallbackValue) {
  if (!dateValue) return fallbackValue

  const parsedDate = new Date(dateValue)
  if (Number.isNaN(parsedDate.getTime())) return fallbackValue

  return parsedDate.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

function formatRiskScore(value) {
  const numericValue = Number(value)

  if (Number.isNaN(numericValue)) return 'Unavailable'

  return `${numericValue.toFixed(2).replace(/\.?0+$/, '')}x`
}

function LoadingSkeleton() {
  return (
    <PageTransition className="flex min-h-full flex-col">
      <ScreenHeader title="My Policy" backTo="/policy" />

      <div className="flex-1 overflow-y-auto px-4 pb-5 pt-5 sm:px-5 sm:pb-6 sm:pt-6">
        <StaggerGroup className="space-y-6">
          <div className="space-y-3 text-center">
            <div className="mx-auto h-7 w-20 animate-pulse rounded-full bg-bg-elevated" />
            <div className="mx-auto h-4 w-40 animate-pulse rounded bg-bg-elevated" />
            <div className="mx-auto h-8 w-36 animate-pulse rounded bg-bg-elevated" />
          </div>

          <Card className="space-y-3 animate-pulse">
            {Array.from({ length: 8 }).map((_, index) => (
              <div
                key={`policy-skeleton-${index}`}
                className="flex items-center justify-between gap-4 border-b border-border-default py-3 last:border-b-0"
              >
                <div className="h-4 w-28 rounded bg-bg-elevated" />
                <div className="h-4 w-24 rounded bg-bg-elevated" />
              </div>
            ))}
          </Card>

          <Card className="space-y-4 animate-pulse">
            <div className="h-5 w-36 rounded bg-bg-elevated" />
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={`disruption-skeleton-${index}`} className="flex items-start gap-3">
                <div className="mt-1 h-2.5 w-2.5 rounded-full bg-bg-elevated" />
                <div className="h-4 w-full rounded bg-bg-elevated" />
              </div>
            ))}
          </Card>
        </StaggerGroup>
      </div>

      <div className="space-y-3 px-4 pb-5 pt-2 text-center sm:px-5 sm:pb-6">
        <div className="h-[52px] w-full animate-pulse rounded-button bg-bg-elevated" />
        <div className="mx-auto h-4 w-24 animate-pulse rounded bg-bg-elevated" />
      </div>
    </PageTransition>
  )
}

function ErrorState({ message }) {
  return (
    <PageTransition className="flex min-h-full flex-col">
      <ScreenHeader title="My Policy" backTo="/policy" />

      <div className="flex-1 px-4 pb-5 pt-5 sm:px-5 sm:pb-6 sm:pt-6">
        <Card className="space-y-2 text-center">
          <h2 className="font-display text-[24px] font-normal text-text-primary">
            Policy unavailable
          </h2>
          <p className="text-[14px] leading-6 text-text-secondary">{message}</p>
        </Card>
      </div>
    </PageTransition>
  )
}

export function PolicyActiveScreen() {
  const navigate = useNavigate()
  const { profile, registrationResult, logout } = useGRIP()
  const { policy, loading, error } = usePolicyData()

  if (loading) return <LoadingSkeleton />
  if (error) return <ErrorState message={error} />

  const partner = registrationResult?.partner || profile
  const zoneLabel =
    partner?.operating_zone || profile.zone
      ? `${partner?.city || profile.city} - ${partner?.operating_zone || profile.zone}`
      : `${profile.city} - Central`

  return (
    <PageTransition className="flex min-h-full flex-col">
      <ScreenHeader title="My Policy" backTo="/policy" />

      <div className="flex-1 overflow-y-auto px-4 pb-5 pt-5 sm:px-5 sm:pb-6 sm:pt-6">
        <StaggerGroup className="space-y-6">
          <div className="space-y-3 text-center">
            <StatusBadge
              status={policy?.status || 'active'}
              label={policy?.status || 'Active'}
              className="mx-auto"
            />
            <p className="text-[12px] text-text-secondary">
              {policy?.policy_number || partner?.policy_number || profile.policyNumber}
            </p>
            <h1 className="font-display text-[24px] font-normal text-text-primary">
              {(partner?.coverage_tier || profile.coverageTier)} Plan
            </h1>
          </div>

          <Card>
            <DetailRow label="Coverage Period" value="Weekly, auto-renewing" />
            <DetailRow
              label="Next Premium Date"
              value={formatLongDate(policy?.next_premium_date)}
            />
            <DetailRow
              label="Weekly Premium"
              value={formatCurrency(partner?.weekly_premium ?? profile.weeklyPremium)}
            />
            <DetailRow
              label="Payout Per Day"
              value={formatCurrency(partner?.payout_per_day ?? profile.payoutPerDay)}
            />
            <DetailRow
              label="Weekly Cap"
              value={formatCurrency(partner?.weekly_cap ?? profile.weeklyCap)}
            />
            <DetailRow
              label="Enrolled Since"
              value={formatEnrollmentDate(
                partner?.enrolled_since ?? partner?.created_at,
                profile.enrolledSince,
              )}
            />
            <DetailRow label="Zone" value={zoneLabel} />
            <DetailRow
              label="Zone Risk Score"
              value={formatRiskScore(
                partner?.zone_risk_score ??
                  registrationResult?.zoneRiskScore ??
                  profile.zoneRiskScore,
              )}
              emphasize
            />
          </Card>

          <Card className="space-y-4">
            <h3 className="text-[15px] font-semibold text-text-primary">Covered Disruptions</h3>
            <div className="space-y-4">
              {disruptions.map((item) => (
                <div key={item} className="flex items-start gap-3">
                  <span className="mt-1 text-accent-success">
                    <DotIcon className="h-2.5 w-2.5" />
                  </span>
                  <p className="text-[14px] text-text-primary">{item}</p>
                </div>
              ))}
            </div>
          </Card>
        </StaggerGroup>
      </div>

      <div className="space-y-3 px-4 pb-5 pt-2 text-center sm:px-5 sm:pb-6">
        <SecondaryButton onClick={() => navigate('/policy')}>Change Plan</SecondaryButton>
        <p className="text-[12px] text-accent-danger">Cancel coverage</p>
        <button
          type="button"
          onClick={logout}
          className="text-[12px] text-text-secondary"
        >
          Log out
        </button>
      </div>
    </PageTransition>
  )
}
