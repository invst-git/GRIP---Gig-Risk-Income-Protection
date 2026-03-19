import { useNavigate } from 'react-router-dom'
import { ScreenHeader } from '../components/ScreenHeader'
import { DotIcon } from '../components/icons'
import { PageTransition } from '../components/PageTransition'
import { StaggerGroup } from '../components/StaggerGroup'
import { Card, SecondaryButton, StatusBadge } from '../components/ui'
import { useGRIP } from '../context/GRIPContext'
import { formatCurrency } from '../lib/utils'

function DetailRow({ label, value, emphasize = false }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-border-default py-3 last:border-b-0">
      <p className="text-[13px] text-text-secondary">{label}</p>
      <p className={`text-[14px] font-semibold ${emphasize ? 'text-accent-primary' : 'text-text-primary'}`}>
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

export function PolicyActiveScreen() {
  const navigate = useNavigate()
  const { profile } = useGRIP()

  return (
    <PageTransition className="flex min-h-full flex-col">
      <ScreenHeader title="My Policy" backTo="/policy" />

      <div className="flex-1 overflow-y-auto px-5 pb-6 pt-6">
        <StaggerGroup className="space-y-6">
          <div className="space-y-3 text-center">
            <StatusBadge status="active" label="Active" className="mx-auto" />
            <p className="text-[12px] text-text-secondary">{profile.policyNumber}</p>
            <h1 className="font-display text-[24px] font-normal text-text-primary">
              {profile.coverageTier} Plan
            </h1>
          </div>

          <Card>
            <DetailRow label="Coverage Period" value="Weekly, auto-renewing" />
            <DetailRow label="Next Premium Date" value="Monday, March 17, 2026" />
            <DetailRow label="Weekly Premium" value={formatCurrency(profile.weeklyPremium)} />
            <DetailRow label="Payout Per Day" value={formatCurrency(profile.payoutPerDay)} />
            <DetailRow label="Weekly Cap" value={formatCurrency(profile.weeklyCap)} />
            <DetailRow label="Enrolled Since" value={profile.enrolledSince} />
            <DetailRow label="Zone" value={`${profile.city} - Central`} />
            <DetailRow label="Zone Risk Score" value={`${profile.zoneRiskScore}x`} emphasize />
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

      <div className="space-y-3 px-5 pb-6 pt-2 text-center">
        <SecondaryButton onClick={() => navigate('/policy')}>Change Plan</SecondaryButton>
        <p className="text-[12px] text-accent-danger">Cancel coverage</p>
      </div>
    </PageTransition>
  )
}
