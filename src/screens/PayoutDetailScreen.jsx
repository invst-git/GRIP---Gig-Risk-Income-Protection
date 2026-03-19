import { useEffect, useState } from 'react'
import { ScreenHeader } from '../components/ScreenHeader'
import { DotIcon } from '../components/icons'
import { PageTransition } from '../components/PageTransition'
import { StaggerGroup } from '../components/StaggerGroup'
import { Toast } from '../components/Toast'
import { Card, SecondaryButton } from '../components/ui'
import { payoutTimeline } from '../data/appData'
import { partnerProfile } from '../mockData'

function DetailRow({ label, value }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-border-default py-3 last:border-b-0">
      <p className="text-[13px] text-text-secondary">{label}</p>
      <p className="text-[14px] font-semibold text-text-primary">{value}</p>
    </div>
  )
}

export function PayoutDetailScreen() {
  const [showToast, setShowToast] = useState(false)

  useEffect(() => {
    let timeoutId

    if (showToast) {
      timeoutId = window.setTimeout(() => setShowToast(false), 1600)
    }

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [showToast])

  return (
    <PageTransition className="flex min-h-full flex-col">
      <ScreenHeader title="Payout Detail" backTo="/payouts" />

      <div className="flex-1 overflow-y-auto px-5 pb-6 pt-6">
        <StaggerGroup className="space-y-6">
          <div className="space-y-2 text-center">
            <p className="font-display text-[40px] font-normal leading-none text-accent-success">
              Rs 1,200
            </p>
            <p className="text-[14px] text-text-secondary">Paid to your UPI</p>
            <p className="text-[14px] text-text-primary">{partnerProfile.upiId}</p>
          </div>

          <Card className="space-y-5">
            <h3 className="text-[15px] font-semibold text-text-primary">Payout Timeline</h3>
            <div className="space-y-5">
              {payoutTimeline.map((item, index) => (
                <div key={item.title} className="flex gap-4">
                  <div className="flex w-5 flex-col items-center">
                    <span className="text-accent-success">
                      <DotIcon className="h-3 w-3" />
                    </span>
                    {index < payoutTimeline.length - 1 ? (
                      <span className="mt-2 w-px flex-1 bg-border-default" />
                    ) : null}
                  </div>
                  <div className="space-y-1 pb-1">
                    <p className="text-[14px] font-semibold text-text-primary">{item.title}</p>
                    <p className="text-[12px] text-text-secondary">{item.date}</p>
                    <p className="text-[13px] leading-6 text-text-secondary">
                      {item.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <DetailRow label="Trigger Type" value="AQI Spike" />
            <DetailRow label="Days Covered" value="Nov 14, 15, 16 (3 days)" />
            <DetailRow label="AQI Reading" value="318, 324, 311 (measured - CPCB Delhi)" />
            <DetailRow label="Coverage Tier" value="Standard" />
            <DetailRow label="Daily Rate" value="Rs 400" />
            <DetailRow label="Total Payout" value="Rs 1,200" />
            <DetailRow label="UPI Reference" value="GRIP20251114001823" />
          </Card>
        </StaggerGroup>
      </div>

      <div className="px-5 pb-6 pt-2">
        <SecondaryButton onClick={() => setShowToast(true)}>Download Receipt</SecondaryButton>
      </div>

      <Toast message="Receipt downloaded" visible={showToast} />
    </PageTransition>
  )
}
