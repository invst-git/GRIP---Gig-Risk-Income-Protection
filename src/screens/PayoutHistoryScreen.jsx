import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PageTransition } from '../components/PageTransition'
import { StaggerGroup } from '../components/StaggerGroup'
import { Card, StatusBadge } from '../components/ui'
import { useClaimsData } from '../hooks/useClaimsData'
import { formatCurrency } from '../lib/utils'

const FILTERS = ['All', 'AQI', 'Rainfall', 'Heatwave', 'Curfew']

function FilterChip({ active, label, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-4 py-2 text-[13px] font-medium ${
        active
          ? 'border-accent-primary bg-[rgba(36,69,122,0.10)] text-accent-primary shadow-card'
          : 'border-border-default bg-bg-surface text-text-secondary shadow-card'
      }`}
    >
      {label}
    </button>
  )
}

function getPrimaryPayout(claim) {
  if (Array.isArray(claim?.payouts)) return claim.payouts[0] ?? null
  return claim?.payouts ?? null
}

function getTriggerFilter(triggerType) {
  const normalizedType = String(triggerType || '').toLowerCase()

  if (normalizedType === 'aqi') return 'AQI'
  if (normalizedType === 'rainfall') return 'Rainfall'
  if (normalizedType === 'heat') return 'Heatwave'
  if (normalizedType === 'curfew') return 'Curfew'
  return 'All'
}

function getTriggerLabel(triggerType) {
  const filterLabel = getTriggerFilter(triggerType)
  return filterLabel === 'All' ? 'Trigger Event' : `${filterLabel} Trigger`
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

function formatClaimDate(dateValue) {
  if (!dateValue) return 'Unavailable'

  const parsedDate = new Date(dateValue)
  if (Number.isNaN(parsedDate.getTime())) return 'Unavailable'

  return parsedDate.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

function formatSinceLabel(dateValue) {
  if (!dateValue) return 'Since activation'

  const parsedDate = new Date(dateValue)
  if (Number.isNaN(parsedDate.getTime())) return 'Since activation'

  return `Since ${parsedDate.toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  })}`
}

function LoadingSkeleton() {
  return (
    <PageTransition className="flex min-h-full flex-col">
      <div className="px-4 pt-4 sm:px-5 sm:pt-5">
        <h1 className="text-[18px] font-semibold text-text-primary">Payout History</h1>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-5 pt-5 sm:px-5 sm:pb-6 sm:pt-6">
        <StaggerGroup className="space-y-6">
          <Card className="space-y-4 animate-pulse">
            <div className="space-y-2">
              <div className="h-3 w-24 rounded bg-bg-elevated" />
              <div className="h-10 w-36 rounded bg-bg-elevated" />
              <div className="h-3 w-28 rounded bg-bg-elevated" />
            </div>
            <div className="flex gap-2">
              <div className="h-9 w-24 rounded-full bg-bg-elevated" />
              <div className="h-9 w-24 rounded-full bg-bg-elevated" />
            </div>
          </Card>

          <div className="-mx-4 overflow-x-auto px-4 sm:-mx-5 sm:px-5">
            <div className="flex gap-2 pb-1">
              {FILTERS.map((item) => (
                <div
                  key={`filter-skeleton-${item}`}
                  className="h-10 w-24 flex-shrink-0 animate-pulse rounded-full bg-bg-elevated"
                />
              ))}
            </div>
          </div>

          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <Card key={`claim-skeleton-${index}`} className="space-y-3 animate-pulse">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-2">
                    <div className="h-5 w-28 rounded bg-bg-elevated" />
                    <div className="h-3 w-24 rounded bg-bg-elevated" />
                  </div>
                  <div className="h-7 w-20 rounded-full bg-bg-elevated" />
                </div>

                <div className="flex items-end justify-between gap-3">
                  <div className="space-y-2">
                    <div className="h-6 w-24 rounded bg-bg-elevated" />
                    <div className="h-3 w-20 rounded bg-bg-elevated" />
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </StaggerGroup>
      </div>
    </PageTransition>
  )
}

function ErrorState({ message }) {
  return (
    <PageTransition className="flex min-h-full flex-col">
      <div className="px-4 pt-4 sm:px-5 sm:pt-5">
        <h1 className="text-[18px] font-semibold text-text-primary">Payout History</h1>
      </div>

      <div className="flex-1 px-4 pb-5 pt-5 sm:px-5 sm:pb-6 sm:pt-6">
        <Card className="text-center">
          <p className="text-[14px] leading-6 text-text-secondary">{message}</p>
        </Card>
      </div>
    </PageTransition>
  )
}

export function PayoutHistoryScreen() {
  const navigate = useNavigate()
  const [filter, setFilter] = useState('All')
  const { claims, loading, error } = useClaimsData()

  const filteredEntries =
    filter === 'All'
      ? claims
      : claims.filter((entry) => getTriggerFilter(entry.trigger_type) === filter)

  const totalReceived = claims.reduce((sum, claim) => {
    const payout = getPrimaryPayout(claim)
    const resolvedAmount = payout?.amount ?? (claim.status === 'paid' ? claim.payout_amount : 0)
    return sum + Number(resolvedAmount || 0)
  }, 0)
  const totalPayouts = claims.filter((claim) => {
    const payout = getPrimaryPayout(claim)
    return payout?.status === 'processed' || claim.status === 'paid'
  }).length
  const totalTriggers = new Set(claims.map((claim) => claim.trigger_event_id || claim.id)).size
  const oldestClaimDate = claims[claims.length - 1]?.created_at

  if (loading) return <LoadingSkeleton />
  if (error) return <ErrorState message={error} />

  return (
    <PageTransition className="flex min-h-full flex-col">
      <div className="px-4 pt-4 sm:px-5 sm:pt-5">
        <h1 className="text-[18px] font-semibold text-text-primary">Payout History</h1>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-5 pt-5 sm:px-5 sm:pb-6 sm:pt-6">
        <StaggerGroup className="space-y-6">
          <Card className="space-y-4">
            <div>
              <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-text-secondary">
                Total Received
              </p>
              <p className="mt-2 font-display text-[32px] font-normal text-accent-primary">
                {formatCurrency(totalReceived)}
              </p>
              <p className="mt-1 text-[12px] text-text-secondary">
                {formatSinceLabel(oldestClaimDate)}
              </p>
            </div>
            <div className="flex gap-2">
              <span className="rounded-full border border-border-default bg-bg-elevated px-3 py-2 text-[12px] text-text-primary">
                {totalPayouts} Payouts
              </span>
              <span className="rounded-full border border-border-default bg-bg-elevated px-3 py-2 text-[12px] text-text-primary">
                {totalTriggers} Triggers
              </span>
            </div>
          </Card>

          <div className="-mx-4 overflow-x-auto px-4 sm:-mx-5 sm:px-5">
            <div className="flex gap-2 pb-1">
              {FILTERS.map((item) => (
                <FilterChip
                  key={item}
                  label={item}
                  active={filter === item}
                  onClick={() => setFilter(item)}
                />
              ))}
            </div>
          </div>

          <div className="space-y-3">
            {claims.length === 0 ? (
              <div className="py-12 text-center text-text-secondary">
                <p className="text-sm">No claims yet.</p>
                <p className="mt-1 text-xs opacity-60">
                  Claims are created automatically when a trigger fires in your city.
                </p>
              </div>
            ) : null}

            {filteredEntries.map((entry) => {
              const payout = getPrimaryPayout(entry)
              const isPaid = entry.status === 'paid' || payout?.status === 'processed'

              return (
                <button
                  key={entry.id}
                  type="button"
                  className="w-full text-left"
                  onClick={() => navigate('/payouts/detail', { state: { claimId: entry.id } })}
                >
                  <Card className="space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-[15px] font-semibold text-text-primary">
                          {getTriggerLabel(entry.trigger_type)}
                        </p>
                        <p className="mt-1 text-[12px] text-text-secondary">
                          {formatClaimDate(entry.created_at)}
                        </p>
                      </div>
                      <StatusBadge
                        status={getStatusTone(entry.status)}
                        label={formatStatusLabel(entry.status)}
                        showCheck={isPaid}
                      />
                    </div>

                    <div className="flex items-end justify-between gap-3">
                      <div>
                        <p
                          className={`text-[18px] font-semibold ${
                            isPaid ? 'text-accent-success' : 'text-text-secondary'
                          }`}
                        >
                          {formatCurrency(payout?.amount ?? entry.payout_amount)}
                        </p>
                        <p className="mt-1 text-[12px] text-text-secondary">
                          {entry.auto_approved ? 'Auto-approved' : 'Manual review'}
                        </p>
                      </div>
                    </div>
                  </Card>
                </button>
              )
            })}
          </div>
        </StaggerGroup>
      </div>
    </PageTransition>
  )
}
