import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { AdminTopTabs } from '../components/AdminTopTabs'
import { PageTransition } from '../components/PageTransition'
import { StaggerGroup } from '../components/StaggerGroup'
import { Card, ProgressBar, StatusBadge } from '../components/ui'
import { adminRecentPayouts } from '../data/appData'
import { adminMetrics, cityRiskMap, liveTriggers } from '../mockData'

function getRiskTone(value) {
  if (value === 'High') return 'triggered'
  if (value === 'Moderate') return 'pending'
  return 'active'
}

function getStatusTone(status) {
  return status === 'Active' ? 'pending' : 'active'
}

export function AdminDashboardScreen() {
  const location = useLocation()

  useEffect(() => {
    if (location.hash === '#partners') {
      document.getElementById('partners-section')?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      })
    }
  }, [location.hash])

  return (
    <PageTransition className="relative flex min-h-full flex-col overflow-hidden">
      <div className="pointer-events-none absolute left-0 top-0 h-56 w-56 rounded-full bg-[rgba(95,127,174,0.10)] blur-3xl" />

      <div className="flex items-center px-5 pt-5">
        <p className="font-display text-[24px] font-normal leading-none text-text-primary">
          GRIP Admin
        </p>
        <StatusBadge status="pending" label="Admin" className="ml-auto" />
      </div>

      <AdminTopTabs />

      <div className="flex-1 overflow-y-auto px-5 pb-6 pt-6">
        <StaggerGroup className="space-y-6">
          <section className="grid grid-cols-2 gap-3">
            <Card className="space-y-2 border-white/80">
              <p className="text-[12px] text-text-secondary">Active Policies</p>
              <p className="text-[18px] font-semibold text-accent-primary">
                {adminMetrics.activePolicies.toLocaleString('en-IN')}
              </p>
            </Card>
            <Card className="space-y-2 border-white/80">
              <p className="text-[12px] text-text-secondary">Triggers This Month</p>
              <p className="text-[18px] font-semibold text-accent-primary">
                {adminMetrics.triggersThisMonth}
              </p>
            </Card>
            <Card className="space-y-2 border-white/80">
              <p className="text-[12px] text-text-secondary">Total Payouts (Nov)</p>
              <p className="text-[18px] font-semibold text-accent-primary">
                {adminMetrics.totalPayoutsNov}
              </p>
            </Card>
            <Card className="space-y-2 border-white/80">
              <p className="text-[12px] text-text-secondary">Loss Ratio</p>
              <p className="text-[18px] font-semibold text-accent-primary">
                {adminMetrics.lossRatio}
              </p>
            </Card>
          </section>

          <section className="space-y-3">
            <h3 className="text-[15px] font-semibold text-text-primary">
              Live Trigger Monitor
            </h3>
            <Card className="space-y-5 border-white/80">
              {liveTriggers.map((trigger, index) => {
                const percentage = Math.min(
                  100,
                  Math.round((trigger.current / trigger.threshold) * 100),
                )

                return (
                  <div
                    key={`${trigger.type}-${trigger.city}`}
                    className={
                      index < liveTriggers.length - 1
                        ? 'border-b border-border-default pb-5'
                        : ''
                    }
                  >
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <div>
                        <p className="text-[14px] font-semibold text-text-primary">
                          {trigger.type} {trigger.city}
                        </p>
                        <p className="mt-1 text-[12px] text-text-secondary">
                          Current: {trigger.current}
                          {trigger.type === 'Rainfall' ? 'mm' : ''} | Threshold: {trigger.threshold}
                          {trigger.type === 'Rainfall' ? 'mm' : ''}
                        </p>
                      </div>
                      <StatusBadge
                        status={getStatusTone(trigger.status)}
                        label={trigger.status}
                      />
                    </div>
                    <ProgressBar
                      value={percentage}
                      fillClassName={
                        trigger.status === 'Active' ? 'bg-accent-primary' : 'bg-accent-success'
                      }
                    />
                  </div>
                )
              })}
            </Card>
          </section>

          <section className="space-y-3">
            <h3 className="text-[15px] font-semibold text-text-primary">Zone Risk Map</h3>
            <Card className="space-y-4 border-white/80">
              <div className="grid grid-cols-[1.2fr_1fr_1fr_1fr] gap-2 text-[11px] font-medium uppercase tracking-[0.08em] text-text-secondary">
                <p>City</p>
                <p>AQI</p>
                <p>Flood</p>
                <p>Heat</p>
              </div>
              <div className="space-y-4">
                {cityRiskMap.map((row) => (
                  <div
                    key={row.city}
                    className="grid grid-cols-[1.2fr_1fr_1fr_1fr] items-center gap-2"
                  >
                    <p className="text-[14px] text-text-primary">{row.city}</p>
                    <StatusBadge status={getRiskTone(row.aqi)} label={row.aqi} />
                    <StatusBadge status={getRiskTone(row.flood)} label={row.flood} />
                    <StatusBadge status={getRiskTone(row.heat)} label={row.heat} />
                  </div>
                ))}
              </div>
            </Card>
          </section>

          <section id="partners-section" className="space-y-3">
            <h3 className="text-[15px] font-semibold text-text-primary">Recent Payouts</h3>
            <Card className="space-y-4 border-white/80">
              {adminRecentPayouts.map((item, index) => (
                <div
                  key={`${item.date}-${item.city}-${item.trigger}`}
                  className={
                    index < adminRecentPayouts.length - 1
                      ? 'border-b border-border-default pb-4'
                      : ''
                  }
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <p className="text-[14px] font-semibold text-text-primary">
                        {item.city} - {item.trigger}
                      </p>
                      <p className="text-[12px] text-text-secondary">{item.date}</p>
                    </div>
                    <p className="text-[15px] font-semibold text-accent-primary">
                      {item.amount}
                    </p>
                  </div>
                  <p className="mt-2 text-[12px] text-text-secondary">{item.partners}</p>
                </div>
              ))}
            </Card>
          </section>
        </StaggerGroup>
      </div>
    </PageTransition>
  )
}
