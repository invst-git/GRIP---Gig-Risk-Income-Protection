import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { AdminTopTabs } from '../components/AdminTopTabs'
import { PageTransition } from '../components/PageTransition'
import { StaggerGroup } from '../components/StaggerGroup'
import { Card, ProgressBar, StatusBadge } from '../components/ui'
import { useAnalyticsData } from '../hooks/useAnalyticsData'
import { formatCurrency } from '../lib/utils'

const triggerOrder = ['heat', 'rainfall', 'aqi', 'curfew']

function formatMetricNumber(value) {
  return Number(value || 0).toLocaleString('en-IN')
}

function formatTriggerLabel(triggerType) {
  const normalizedType = String(triggerType || '').toLowerCase()

  if (normalizedType === 'aqi') return 'AQI'
  if (normalizedType === 'rainfall') return 'Rainfall'
  if (normalizedType === 'heat') return 'Heat'
  if (normalizedType === 'curfew') return 'Curfew'
  return 'Trigger'
}

function formatTriggerUnit(triggerType) {
  const normalizedType = String(triggerType || '').toLowerCase()

  if (normalizedType === 'rainfall') return 'mm'
  if (normalizedType === 'heat') return 'C'
  if (normalizedType === 'aqi') return 'AQI'
  return ''
}

function formatDateTime(dateValue) {
  if (!dateValue) return 'Unavailable'

  const parsedDate = new Date(dateValue)
  if (Number.isNaN(parsedDate.getTime())) return 'Unavailable'

  return parsedDate.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

function getTriggerStatusTone(count) {
  if (count > 0) return 'pending'
  return 'active'
}

function getHeatmapTone(count) {
  if (count >= 3) return 'triggered'
  if (count >= 1) return 'pending'
  return 'neutral'
}

function LoadingSkeleton() {
  return (
    <PageTransition className="relative flex min-h-full flex-col overflow-hidden">
      <div className="pointer-events-none absolute left-0 top-0 h-56 w-56 rounded-full bg-[rgba(95,127,174,0.10)] blur-3xl" />

      <div className="flex items-center px-4 pt-4 sm:px-5 sm:pt-5">
        <p className="font-display text-[24px] font-normal leading-none text-text-primary">
          GRIP Admin
        </p>
        <StatusBadge status="pending" label="Admin" className="ml-auto" />
      </div>

      <AdminTopTabs />

      <div className="flex-1 overflow-y-auto px-4 pb-5 pt-5 sm:px-5 sm:pb-6 sm:pt-6">
        <StaggerGroup className="space-y-6">
          <section className="grid grid-cols-2 gap-3">
            {Array.from({ length: 4 }).map((_, index) => (
              <Card key={`metric-skeleton-${index}`} className="space-y-2 border-white/80 animate-pulse">
                <div className="h-4 w-24 rounded bg-bg-elevated" />
                <div className="h-6 w-20 rounded bg-bg-elevated" />
              </Card>
            ))}
          </section>

          {Array.from({ length: 3 }).map((_, sectionIndex) => (
            <section key={`section-skeleton-${sectionIndex}`} className="space-y-3">
              <div className="h-5 w-40 rounded bg-bg-elevated animate-pulse" />
              <Card className="space-y-4 border-white/80 animate-pulse">
                {Array.from({ length: 4 }).map((_, rowIndex) => (
                  <div
                    key={`row-skeleton-${sectionIndex}-${rowIndex}`}
                    className="border-b border-border-default pb-4 last:border-b-0"
                  >
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <div className="space-y-2">
                        <div className="h-4 w-24 rounded bg-bg-elevated" />
                        <div className="h-3 w-32 rounded bg-bg-elevated" />
                      </div>
                      <div className="h-7 w-16 rounded-full bg-bg-elevated" />
                    </div>
                    <div className="h-2 w-full rounded-full bg-bg-elevated" />
                  </div>
                ))}
              </Card>
            </section>
          ))}
        </StaggerGroup>
      </div>
    </PageTransition>
  )
}

export function AdminDashboardScreen() {
  const location = useLocation()
  const { data, loading, error } = useAnalyticsData()

  useEffect(() => {
    if (location.hash === '#partners') {
      document.getElementById('partners-section')?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      })
    }
  }, [location.hash])

  if (loading && !data) return <LoadingSkeleton />

  const analytics = data ?? {
    activePartners: 0,
    totalClaimsCount: 0,
    totalPayoutsAmount: 0,
    lossRatio: '0.0',
    autoApprovalRate: '0.0',
    fraudFlagRate: '0.0',
    avgLatencyMinutes: '0.0',
    triggersByType: { heat: 0, rainfall: 0, aqi: 0, curfew: 0 },
    triggerHeatmap: {},
    partnersByCity: {},
    recentTriggers: [],
  }

  const maxTriggerCount = Math.max(...triggerOrder.map((type) => analytics.triggersByType[type] || 0), 1)
  const heatmapRows = Object.entries(analytics.triggerHeatmap)
  const fallbackHeatmapRows =
    heatmapRows.length > 0
      ? heatmapRows
      : Object.keys(analytics.partnersByCity).map((city) => [
          city,
          { heat: 0, rainfall: 0, aqi: 0, curfew: 0 },
        ])

  return (
    <PageTransition className="relative flex min-h-full flex-col overflow-hidden">
      <div className="pointer-events-none absolute left-0 top-0 h-56 w-56 rounded-full bg-[rgba(95,127,174,0.10)] blur-3xl" />

      <div className="flex items-center px-4 pt-4 sm:px-5 sm:pt-5">
        <p className="font-display text-[24px] font-normal leading-none text-text-primary">
          GRIP Admin
        </p>
        <StatusBadge status="pending" label="Admin" className="ml-auto" />
      </div>

      <AdminTopTabs />

      <div className="flex-1 overflow-y-auto px-4 pb-5 pt-5 sm:px-5 sm:pb-6 sm:pt-6">
        <StaggerGroup className="space-y-6">
          {error ? (
            <Card className="border-white/80">
              <p className="text-[13px] text-accent-danger">{error}</p>
            </Card>
          ) : null}

          <section className="grid grid-cols-2 gap-3">
            <Card className="space-y-2 border-white/80">
              <p className="text-[12px] text-text-secondary">Active Partners</p>
              <p className="text-[18px] font-semibold text-accent-primary">
                {formatMetricNumber(analytics.activePartners)}
              </p>
            </Card>
            <Card className="space-y-2 border-white/80">
              <p className="text-[12px] text-text-secondary">Total Claims</p>
              <p className="text-[18px] font-semibold text-accent-primary">
                {formatMetricNumber(analytics.totalClaimsCount)}
              </p>
            </Card>
            <Card className="space-y-2 border-white/80">
              <p className="text-[12px] text-text-secondary">Total Payouts</p>
              <p className="text-[18px] font-semibold text-accent-primary">
                {formatCurrency(analytics.totalPayoutsAmount)}
              </p>
            </Card>
            <Card className="space-y-2 border-white/80">
              <p className="text-[12px] text-text-secondary">Loss Ratio</p>
              <p className="text-[18px] font-semibold text-accent-primary">
                {analytics.lossRatio}%
              </p>
            </Card>
          </section>

          <section className="space-y-3">
            <h3 className="text-[15px] font-semibold text-text-primary">Live Trigger Monitor</h3>
            <Card className="space-y-5 border-white/80">
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1 rounded-[20px] border border-border-default bg-bg-elevated px-3 py-3">
                  <p className="text-[11px] uppercase tracking-[0.08em] text-text-secondary">
                    Auto-Approval
                  </p>
                  <p className="text-[15px] font-semibold text-accent-primary">
                    {analytics.autoApprovalRate}%
                  </p>
                </div>
                <div className="space-y-1 rounded-[20px] border border-border-default bg-bg-elevated px-3 py-3">
                  <p className="text-[11px] uppercase tracking-[0.08em] text-text-secondary">
                    Fraud Flags
                  </p>
                  <p className="text-[15px] font-semibold text-accent-primary">
                    {analytics.fraudFlagRate}%
                  </p>
                </div>
                <div className="space-y-1 rounded-[20px] border border-border-default bg-bg-elevated px-3 py-3">
                  <p className="text-[11px] uppercase tracking-[0.08em] text-text-secondary">
                    Avg Latency
                  </p>
                  <p className="text-[15px] font-semibold text-accent-primary">
                    {analytics.avgLatencyMinutes} min
                  </p>
                </div>
              </div>

              {triggerOrder.map((triggerType, index) => {
                const count = analytics.triggersByType[triggerType] || 0
                const percentage = Math.round((count / maxTriggerCount) * 100)

                return (
                  <div
                    key={triggerType}
                    className={
                      index < triggerOrder.length - 1
                        ? 'border-b border-border-default pb-5'
                        : ''
                    }
                  >
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <div>
                        <p className="text-[14px] font-semibold text-text-primary">
                          {formatTriggerLabel(triggerType)}
                        </p>
                        <p className="mt-1 text-[12px] text-text-secondary">
                          Confirmed triggers: {count}
                        </p>
                      </div>
                      <StatusBadge
                        status={getTriggerStatusTone(count)}
                        label={count > 0 ? `${count} Active` : 'Clear'}
                      />
                    </div>
                    <ProgressBar
                      value={percentage}
                      fillClassName={count > 0 ? 'bg-accent-primary' : 'bg-accent-success'}
                    />
                  </div>
                )
              })}
            </Card>
          </section>

          <section className="space-y-3">
            <h3 className="text-[15px] font-semibold text-text-primary">Trigger Heatmap</h3>
            <Card className="space-y-4 border-white/80">
              <div className="grid grid-cols-[1.2fr_1fr_1fr_1fr_1fr] gap-2 text-[11px] font-medium uppercase tracking-[0.08em] text-text-secondary">
                <p>City</p>
                <p>Heat</p>
                <p>Rain</p>
                <p>AQI</p>
                <p>Curfew</p>
              </div>
              <div className="space-y-4">
                {fallbackHeatmapRows.map(([city, counts]) => (
                  <div
                    key={city}
                    className="grid grid-cols-[1.2fr_1fr_1fr_1fr_1fr] items-center gap-2"
                  >
                    <p className="text-[14px] text-text-primary">{city}</p>
                    {triggerOrder.map((type) => (
                      <StatusBadge
                        key={`${city}-${type}`}
                        status={getHeatmapTone(counts[type] || 0)}
                        label={String(counts[type] || 0)}
                        showCheck={false}
                      />
                    ))}
                  </div>
                ))}
              </div>
            </Card>
          </section>

          <section id="partners-section" className="space-y-3">
            <h3 className="text-[15px] font-semibold text-text-primary">Recent Trigger Feed</h3>
            <Card className="space-y-4 border-white/80">
              {analytics.recentTriggers.length === 0 ? (
                <p className="text-[13px] text-text-secondary">No triggers yet.</p>
              ) : (
                analytics.recentTriggers.map((item, index) => (
                  <div
                    key={item.id || `${item.city}-${item.trigger_type}-${item.fired_at}`}
                    className={
                      index < analytics.recentTriggers.length - 1
                        ? 'border-b border-border-default pb-4'
                        : ''
                    }
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <p className="text-[14px] font-semibold text-text-primary">
                          {item.city} - {formatTriggerLabel(item.trigger_type)}
                        </p>
                        <p className="text-[12px] text-text-secondary">
                          {formatDateTime(item.fired_at)}
                        </p>
                      </div>
                      <p className="text-[15px] font-semibold text-accent-primary">
                        {`${item.raw_value}${formatTriggerUnit(item.trigger_type) ? ` ${formatTriggerUnit(item.trigger_type)}` : ''}`}
                      </p>
                    </div>
                    <p className="mt-2 text-[12px] text-text-secondary">
                      {formatMetricNumber(analytics.partnersByCity[item.city] || 0)} active partners
                    </p>
                  </div>
                ))
              )}
            </Card>
          </section>
        </StaggerGroup>
      </div>
    </PageTransition>
  )
}
