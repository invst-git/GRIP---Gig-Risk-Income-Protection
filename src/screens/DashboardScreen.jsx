import { useNavigate } from 'react-router-dom'
import { BellIcon, DotIcon, WarningIcon } from '../components/icons'
import { PageTransition } from '../components/PageTransition'
import { StaggerGroup } from '../components/StaggerGroup'
import { Card, ProgressBar, StatusBadge } from '../components/ui'
import { recentActivity, riskSnapshot } from '../data/appData'
import { useGRIP } from '../context/GRIPContext'
import { activeTrigger as mockActiveTrigger } from '../mockData'
import { formatCurrency, formatSignedCurrency } from '../lib/utils'

function StatPill({ label, value }) {
  return (
    <div className="rounded-full border border-white/80 bg-bg-surface/85 px-4 py-3 shadow-card backdrop-blur-sm">
      <p className="text-[15px] font-semibold text-text-primary">{value}</p>
      <p className="mt-1 text-[12px] text-text-secondary">{label}</p>
    </div>
  )
}

export function DashboardScreen() {
  const navigate = useNavigate()
  const { profile, activeTrigger } = useGRIP()
  const bellTrigger = activeTrigger ?? mockActiveTrigger

  return (
    <PageTransition className="relative flex min-h-full flex-col overflow-hidden">
      <div className="pointer-events-none absolute right-0 top-0 h-56 w-56 rounded-full bg-[rgba(95,127,174,0.10)] blur-3xl" />

      <div className="flex items-center px-4 pt-4 sm:px-5 sm:pt-5">
        <div>
          <p className="font-display text-[24px] font-normal leading-none text-text-primary">
            GRIP
          </p>
        </div>
        <button
          type="button"
          className="relative ml-auto flex h-10 w-10 items-center justify-center rounded-full border border-white/80 bg-bg-surface/92 text-text-primary shadow-card backdrop-blur-sm"
          onClick={() => navigate('/trigger-alert')}
          aria-label="Open trigger alerts"
        >
          <BellIcon className="h-5 w-5" />
          {bellTrigger.status === 'Active' ? (
            <span className="absolute right-2 top-2 h-2.5 w-2.5 rounded-full bg-accent-danger" />
          ) : null}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-5 pt-5 sm:px-5 sm:pb-6 sm:pt-6">
        <StaggerGroup className="space-y-6">
          <div className="space-y-3">
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
                  </div>
                  <StatusBadge status="active" label="Active" />
                </div>

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
              {riskSnapshot.map((item, index) => (
                <div
                  key={item.label}
                  className={
                    index < riskSnapshot.length - 1
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
              {recentActivity.map((activity) => (
                <button
                  key={activity.id}
                  type="button"
                  className="w-full text-left"
                  onClick={() => navigate('/payouts/detail')}
                >
                  <Card className="flex items-center justify-between gap-3 border-white/80">
                    <div className="space-y-1">
                      <p className="text-[14px] font-semibold text-text-primary">
                        {activity.title}
                      </p>
                      <p className="text-[12px] text-text-secondary">{activity.date}</p>
                    </div>

                    <div className="space-y-2 text-right">
                      <p
                        className={`text-[15px] font-semibold ${
                          activity.amount > 0 ? 'text-accent-success' : 'text-text-secondary'
                        }`}
                      >
                        {formatSignedCurrency(activity.amount)}
                      </p>
                      <StatusBadge
                        status={activity.badge.status}
                        label={activity.badge.label}
                        showCheck={activity.badge.status === 'paid'}
                      />
                    </div>
                  </Card>
                </button>
              ))}
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
