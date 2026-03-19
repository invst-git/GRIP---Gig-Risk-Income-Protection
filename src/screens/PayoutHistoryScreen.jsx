import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PageTransition } from '../components/PageTransition'
import { StaggerGroup } from '../components/StaggerGroup'
import { Card, StatusBadge } from '../components/ui'
import { payoutEntries, payoutFilters, payoutSummary } from '../data/appData'
import { formatCurrency } from '../lib/utils'

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

export function PayoutHistoryScreen() {
  const navigate = useNavigate()
  const [filter, setFilter] = useState('All')

  const filteredEntries =
    filter === 'All'
      ? payoutEntries
      : payoutEntries.filter((entry) => entry.type === filter)

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
                {formatCurrency(payoutSummary.totalReceived)}
              </p>
              <p className="mt-1 text-[12px] text-text-secondary">Since October 2025</p>
            </div>
            <div className="flex gap-2">
              <span className="rounded-full border border-border-default bg-bg-elevated px-3 py-2 text-[12px] text-text-primary">
                {payoutSummary.totalPayouts} Payouts
              </span>
              <span className="rounded-full border border-border-default bg-bg-elevated px-3 py-2 text-[12px] text-text-primary">
                {payoutSummary.totalTriggers} Triggers
              </span>
            </div>
          </Card>

          <div className="-mx-4 overflow-x-auto px-4 sm:-mx-5 sm:px-5">
            <div className="flex gap-2 pb-1">
              {payoutFilters.map((item) => (
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
            {filteredEntries.map((entry) => {
              const isPaid = entry.status === 'Paid'
              const statusLabel = isPaid ? 'Paid' : 'Not triggered'

              return (
                <button
                  key={entry.id}
                  type="button"
                  className="w-full text-left"
                  onClick={() => {
                    if (isPaid) navigate('/payouts/detail')
                  }}
                >
                  <Card className="space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-[15px] font-semibold text-text-primary">
                          {entry.label}
                        </p>
                        <p className="mt-1 text-[12px] text-text-secondary">
                          {entry.dateRange}
                        </p>
                      </div>
                      <StatusBadge
                        status={isPaid ? 'paid' : 'neutral'}
                        label={statusLabel}
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
                          {isPaid ? formatCurrency(entry.amount) : 'Threshold not met'}
                        </p>
                        <p className="mt-1 text-[12px] text-text-secondary">
                          {entry.days > 0
                            ? `${entry.days} ${entry.days === 1 ? 'day' : 'days'}`
                            : '0 days'}
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
