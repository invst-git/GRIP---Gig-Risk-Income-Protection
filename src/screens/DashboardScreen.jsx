import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { BellIcon, DotIcon, WarningIcon } from '../components/icons'
import { PageTransition } from '../components/PageTransition'
import { StaggerGroup } from '../components/StaggerGroup'
import { Card, GRIPLogo, ProgressBar, StatusBadge } from '../components/ui'
import { useGRIP } from '../context/GRIPContext'
import { useClaimsData } from '../hooks/useClaimsData'
import { supabase } from '../lib/supabase'
import { formatCurrency } from '../lib/utils'

function StatPill({ label, value }) {
  return (
    <div className="rounded-full border border-white/80 bg-bg-surface/85 px-4 py-3 shadow-card backdrop-blur-sm">
      <p className="text-[15px] font-semibold text-text-primary">{value}</p>
      <p className="mt-1 text-[12px] text-text-secondary">{label}</p>
    </div>
  )
}

function normalizeRelation(value) {
  if (Array.isArray(value)) return value[0] ?? null
  return value ?? null
}

function formatDate(dateValue) {
  if (!dateValue) return 'Unavailable'

  const parsedDate = new Date(dateValue)
  if (Number.isNaN(parsedDate.getTime())) return 'Unavailable'

  return parsedDate.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

function formatTriggerType(triggerType) {
  const normalizedType = String(triggerType || '').toLowerCase()

  if (normalizedType === 'aqi') return 'AQI'
  if (normalizedType === 'rainfall') return 'Rainfall'
  if (normalizedType === 'heat') return 'Heat'
  if (normalizedType === 'curfew') return 'Curfew'
  return 'Trigger'
}

function formatStatusLabel(status) {
  return String(status || 'pending')
    .split('_')
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' ')
}

function getStatusTone(status) {
  switch (status) {
    case 'paid':
      return 'paid'
    case 'approved':
      return 'pending'
    case 'fraud_review':
    case 'rejected':
      return 'triggered'
    default:
      return 'neutral'
  }
}

const CITY_HAZARD_PROFILE = {
  Delhi: { aqi: 0.83, flood: 0.35, heat: 0.7 },
  Mumbai: { aqi: 0.1, flood: 0.75, heat: 0.05 },
  Bengaluru: { aqi: 0.12, flood: 0.65, heat: 0.08 },
  Chennai: { aqi: 0.15, flood: 0.58, heat: 0.45 },
  Hyderabad: { aqi: 0.22, flood: 0.3, heat: 0.5 },
}

const CITY_SEASON_LABELS = {
  Delhi: { aqi: 'Oct-Jan', heat: 'May-Jun' },
  Mumbai: { aqi: 'Dec-Feb', heat: 'Apr-May' },
  Bengaluru: { aqi: 'Dec-Jan', heat: 'Mar-Apr' },
  Chennai: { aqi: 'Dec-Jan', heat: 'Apr-Jun' },
  Hyderabad: { aqi: 'Nov-Jan', heat: 'Apr-May' },
}

function getRiskDescriptor(value) {
  if (value >= 70) return 'High'
  if (value >= 40) return 'Moderate'
  return 'Low'
}

async function fetchEarningsProtected(partnerId) {
  try {
    const { data } = await supabase
      .from('payouts')
      .select('amount')
      .eq('partner_id', partnerId)
      .eq('status', 'processed')

    const total = (data || []).reduce(
      (sum, payout) => sum + parseFloat(payout.amount || 0),
      0,
    )
    return Math.round(total)
  } catch {
    return 0
  }
}

function getZoneRiskLabel(score, zone, city) {
  if (!score) return null

  const normalised = Math.round(
    ((score - 0.85) / (1.50 - 0.85)) * 100,
  )

  const level = normalised >= 75
    ? { label: 'High risk zone', color: 'text-red-600', bg: 'bg-red-50 border-red-200' }
    : normalised >= 40
      ? { label: 'Medium risk zone', color: 'text-amber-600', bg: 'bg-amber-50 border-amber-200' }
      : { label: 'Low risk zone', color: 'text-green-600', bg: 'bg-green-50 border-green-200' }

  const description = normalised >= 75
    ? `${zone} is among the highest-risk zones in ${city} for weather disruptions`
    : normalised >= 40
      ? `${zone} has moderate weather disruption risk in ${city}`
      : `${zone} is among the lower-risk zones in ${city} for weather disruptions`

  return { ...level, description, percentile: normalised }
}

export function DashboardScreen() {
  const navigate = useNavigate()
  const { registrationResult, profile, activeTrigger } = useGRIP()
  const { claims, loading } = useClaimsData()
  const [earningsProtected, setEarningsProtected] = useState(0)
  const partner = registrationResult?.partner
  const city = partner?.city || profile?.city || 'your city'
  const score = parseFloat(partner?.zone_risk_score || profile?.zoneRiskScore || 1.0)
  const zone = partner?.operating_zone || profile?.zone || 'your zone'
  const baseline = CITY_HAZARD_PROFILE[city] || CITY_HAZARD_PROFILE.Delhi
  const seasons = CITY_SEASON_LABELS[city] || CITY_SEASON_LABELS.Delhi
  const multiplier = Math.min(score / 1.0, 1.5)
  const aqiRiskPct = Math.min(100, Math.round(baseline.aqi * multiplier * 100))
  const floodRiskPct = Math.min(100, Math.round(baseline.flood * multiplier * 100))
  const heatRiskPct = Math.min(100, Math.round(baseline.heat * multiplier * 100))
  const dynamicRiskSnapshot = [
    {
      label: `AQI Risk (${city}, ${seasons.aqi})`,
      descriptor: getRiskDescriptor(aqiRiskPct),
      value: aqiRiskPct,
    },
    {
      label: `Flood Risk (${city})`,
      descriptor: getRiskDescriptor(floodRiskPct),
      value: floodRiskPct,
    },
    {
      label: `Heat Risk (${city}, ${seasons.heat})`,
      descriptor: getRiskDescriptor(heatRiskPct),
      value: heatRiskPct,
    },
  ]
  const recentClaims = claims.slice(0, 3)
  const riskLabel = getZoneRiskLabel(
    partner?.zone_risk_score,
    zone,
    city,
  )
  const protectedSinceSource = partner?.enrolled_since || partner?.created_at
  const protectedSinceLabel = protectedSinceSource
    ? new Date(protectedSinceSource).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })
    : 'today'

  useEffect(() => {
    async function loadEarningsProtected() {
      if (partner?.id) {
        const total = await fetchEarningsProtected(partner.id)
        setEarningsProtected(total)
      }
    }

    loadEarningsProtected()
  }, [partner?.id])

  return (
    <PageTransition className="relative flex min-h-full flex-col overflow-hidden">
      <div className="pointer-events-none absolute right-0 top-0 h-56 w-56 rounded-full bg-[rgba(95,127,174,0.10)] blur-3xl" />

      <div className="flex items-center px-4 pt-4 sm:px-5 sm:pt-5">
        <div>
          <GRIPLogo dark={true} size="sm" />
        </div>
        <button
          type="button"
          className="relative ml-auto flex h-10 w-10 items-center justify-center rounded-full border border-white/80 bg-bg-surface/92 text-text-primary shadow-card backdrop-blur-sm"
          onClick={() => navigate('/trigger-alert')}
          aria-label="Open trigger alerts"
        >
          <BellIcon className="h-5 w-5" />
          {activeTrigger?.status === 'Active' ? (
            <span className="absolute right-2 top-2 h-2.5 w-2.5 rounded-full bg-accent-danger" />
          ) : null}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-5 pt-5 sm:px-5 sm:pb-6 sm:pt-6">
        <StaggerGroup className="space-y-6">
          <div className="space-y-3">
            <div className="mb-4 rounded-2xl bg-[#1a2e4a] px-5 py-4">
              <p className="mb-1 text-xs uppercase tracking-widest text-white/60">
                Earnings protected
              </p>
              <p className="text-3xl font-semibold text-white">
                Rs {earningsProtected.toLocaleString('en-IN')}
              </p>
              <p className="mt-1 text-xs text-white/50">
                Total received since {protectedSinceLabel}
              </p>
            </div>

            <Card className="relative overflow-hidden border-white/80">
              <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(145deg,rgba(95,127,174,0.18)_0%,rgba(95,127,174,0.06)_36%,rgba(255,255,255,0)_72%)]" />
              <div className="pointer-events-none absolute -right-12 -top-12 h-32 w-32 rounded-full bg-[rgba(47,122,99,0.08)] blur-3xl" />
              <div className="relative space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-2">
                    <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-text-secondary">
                      Active Coverage
                    </p>
                    <h1 className="font-display text-[24px] font-normal text-text-primary">
                      {profile.coverageTier} Plan
                    </h1>
                    <p className="text-[14px] text-text-secondary">
                      <span className="font-semibold text-accent-primary">
                        {formatCurrency(profile.weeklyPremium)} / week
                      </span>{' '}
                      auto-renews Monday
                    </p>
                    <p className="text-[13px] text-text-secondary">
                      {zone}, {city}
                    </p>
                  </div>
                  <StatusBadge status="active" label="Active" />
                </div>

                {riskLabel ? (
                  <div className={`mt-3 rounded-xl border px-4 py-3 ${riskLabel.bg}`}>
                    <div className="mb-1 flex items-center justify-between">
                      <span className={`text-xs font-medium ${riskLabel.color}`}>
                        {riskLabel.label}
                      </span>
                      <span className={`text-xs ${riskLabel.color}`}>
                        Score {Number(partner?.zone_risk_score || 0).toFixed(2)}x
                      </span>
                    </div>
                    <p className="text-xs leading-relaxed text-text-secondary">
                      {riskLabel.description}
                    </p>
                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-gray-200">
                      <div
                        className={`h-full rounded-full transition-all ${riskLabel.percentile >= 75 ? 'bg-red-500' : ''} ${riskLabel.percentile >= 40 && riskLabel.percentile < 75 ? 'bg-amber-400' : ''} ${riskLabel.percentile < 40 ? 'bg-green-500' : ''}`}
                        style={{ width: `${riskLabel.percentile}%` }}
                      />
                    </div>
                    <p className="mt-1 text-[10px] text-text-secondary opacity-60">
                      Higher score = higher weekly premium + higher payout per disruption day
                    </p>
                  </div>
                ) : null}

                <div className="grid grid-cols-2 gap-3">
                  <StatPill
                    label="Payout Rate"
                    value={`${formatCurrency(profile.payoutPerDay)} / day`}
                  />
                  <StatPill
                    label="Weekly Cap"
                    value={`${formatCurrency(profile.weeklyCap)} / week`}
                  />
                </div>
              </div>
            </Card>
          </div>

          <section className="space-y-3">
            <h3 className="text-[15px] font-semibold text-text-primary">
              Your Risk Snapshot
            </h3>
            <Card className="space-y-5 border-white/80">
              {dynamicRiskSnapshot.map((item, index) => (
                <div
                  key={item.label}
                  className={
                    index < dynamicRiskSnapshot.length - 1
                      ? 'border-b border-border-default pb-5'
                      : ''
                  }
                >
                  <div className="mb-3 flex items-start justify-between gap-4">
                    <p className="text-[14px] text-text-primary">{item.label}</p>
                    <p className="text-[12px] text-text-secondary">
                      {item.value}% - {item.descriptor}
                    </p>
                  </div>
                  <ProgressBar value={item.value} />
                </div>
              ))}
            </Card>
          </section>

          <section className="space-y-3">
            <h3 className="text-[15px] font-semibold text-text-primary">Recent Activity</h3>
            <div className="space-y-3">
              {recentClaims.map((claim) => {
                const payout = normalizeRelation(claim.payouts)
                const triggerEvent = normalizeRelation(claim.trigger_events)
                const amount = payout?.amount || claim.payout_amount

                return (
                  <button
                    key={claim.id}
                    type="button"
                    className="w-full text-left"
                    onClick={() => navigate('/payouts/detail', { state: { claimId: claim.id } })}
                  >
                    <Card className="flex items-center justify-between gap-3 border-white/80">
                      <div className="space-y-1">
                        <p className="text-[14px] font-semibold text-text-primary">
                          {`${formatTriggerType(claim.trigger_type)} Trigger Fired - ${
                            triggerEvent?.city || city
                          }`}
                        </p>
                        <p className="text-[12px] text-text-secondary">
                          {formatDate(claim.created_at)}
                        </p>
                      </div>

                      <div className="space-y-2 text-right">
                        <p className="text-[15px] font-semibold text-accent-success">
                          {`+${formatCurrency(amount)}`}
                        </p>
                        <StatusBadge
                          status={getStatusTone(claim.status)}
                          label={formatStatusLabel(claim.status)}
                          showCheck={claim.status === 'paid'}
                        />
                      </div>
                    </Card>
                  </button>
                )
              })}

              {claims.length === 0 && !loading ? (
                <p className="py-4 text-center text-sm text-text-secondary">
                  No activity yet. Claims appear here automatically when a trigger fires.
                </p>
              ) : null}
            </div>
          </section>

          {activeTrigger ? (
            <Card className="border-white/80 bg-[rgba(95,127,174,0.08)]">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-bg-surface text-accent-primary shadow-card">
                  <WarningIcon className="h-5 w-5" />
                </span>
                <div className="flex-1">
                  <p className="text-[14px] font-semibold text-text-primary">
                    AQI Alert Active in your zone. Payout processing.
                  </p>
                </div>
                <span className="animate-pulse text-accent-primary">
                  <DotIcon className="h-3 w-3" />
                </span>
              </div>
            </Card>
          ) : null}
        </StaggerGroup>
      </div>
    </PageTransition>
  )
}
