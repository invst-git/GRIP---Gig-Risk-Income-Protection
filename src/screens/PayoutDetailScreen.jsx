import { useEffect, useState } from 'react'
import { useLocation, useParams } from 'react-router-dom'
import { ScreenHeader } from '../components/ScreenHeader'
import { DotIcon } from '../components/icons'
import { PageTransition } from '../components/PageTransition'
import { StaggerGroup } from '../components/StaggerGroup'
import { Toast } from '../components/Toast'
import { Card, SecondaryButton } from '../components/ui'
import { useGRIP } from '../context/GRIPContext'
import { supabase } from '../lib/supabase'
import { formatCurrency } from '../lib/utils'

function DetailRow({ label, value }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-border-default py-3 last:border-b-0">
      <p className="text-[13px] text-text-secondary">{label}</p>
      <p className="text-[14px] font-semibold text-text-primary">{value}</p>
    </div>
  )
}

function normalizeRelation(value) {
  if (Array.isArray(value)) return value[0] ?? null
  return value ?? null
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

function getTriggerLabel(triggerType) {
  const normalizedType = String(triggerType || '').toLowerCase()

  if (normalizedType === 'aqi') return 'AQI Trigger'
  if (normalizedType === 'rainfall') return 'Rainfall Trigger'
  if (normalizedType === 'heat') return 'Heatwave Trigger'
  if (normalizedType === 'curfew') return 'Curfew Trigger'
  return 'Trigger Event'
}

function formatTriggerDescription(triggerEvent, fallbackType) {
  if (!triggerEvent) {
    return `${getTriggerLabel(fallbackType)} recorded automatically`
  }

  return `${getTriggerLabel(
    triggerEvent.trigger_type || fallbackType,
  )}: ${triggerEvent.raw_value} vs ${triggerEvent.threshold}`
}

function formatAnomalyScore(value) {
  const numericValue = Number(value)

  if (Number.isNaN(numericValue)) return 'N/A'
  return numericValue.toFixed(2)
}

function LoadingSkeleton() {
  return (
    <PageTransition className="flex min-h-full flex-col">
      <ScreenHeader title="Payout Detail" backTo="/payouts" />

      <div className="flex-1 overflow-y-auto px-4 pb-5 pt-5 sm:px-5 sm:pb-6 sm:pt-6">
        <StaggerGroup className="space-y-6">
          <div className="space-y-2 text-center animate-pulse">
            <div className="mx-auto h-12 w-32 rounded bg-bg-elevated" />
            <div className="mx-auto h-4 w-28 rounded bg-bg-elevated" />
            <div className="mx-auto h-4 w-36 rounded bg-bg-elevated" />
          </div>

          <Card className="space-y-5 animate-pulse">
            <div className="h-5 w-32 rounded bg-bg-elevated" />
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={`timeline-skeleton-${index}`} className="flex gap-4">
                <div className="flex w-5 flex-col items-center">
                  <span className="h-3 w-3 rounded-full bg-bg-elevated" />
                  {index < 3 ? <span className="mt-2 w-px flex-1 bg-bg-elevated" /> : null}
                </div>
                <div className="w-full space-y-2 pb-1">
                  <div className="h-4 w-32 rounded bg-bg-elevated" />
                  <div className="h-3 w-24 rounded bg-bg-elevated" />
                  <div className="h-4 w-full rounded bg-bg-elevated" />
                </div>
              </div>
            ))}
          </Card>

          <Card className="animate-pulse">
            {Array.from({ length: 8 }).map((_, index) => (
              <div
                key={`detail-skeleton-${index}`}
                className="flex items-center justify-between gap-4 border-b border-border-default py-3 last:border-b-0"
              >
                <div className="h-4 w-28 rounded bg-bg-elevated" />
                <div className="h-4 w-24 rounded bg-bg-elevated" />
              </div>
            ))}
          </Card>
        </StaggerGroup>
      </div>

      <div className="px-4 pb-5 pt-2 sm:px-5 sm:pb-6">
        <div className="h-[52px] w-full animate-pulse rounded-button bg-bg-elevated" />
      </div>
    </PageTransition>
  )
}

function ErrorState({ message }) {
  return (
    <PageTransition className="flex min-h-full flex-col">
      <ScreenHeader title="Payout Detail" backTo="/payouts" />

      <div className="flex-1 px-4 pb-5 pt-5 sm:px-5 sm:pb-6 sm:pt-6">
        <Card className="text-center">
          <p className="text-[14px] leading-6 text-text-secondary">{message}</p>
        </Card>
      </div>
    </PageTransition>
  )
}

export function PayoutDetailScreen() {
  const location = useLocation()
  const { claimId: claimIdParam } = useParams()
  const { profile, registrationResult } = useGRIP()
  const [showToast, setShowToast] = useState(false)
  const [claim, setClaim] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const claimId = location.state?.claimId ?? claimIdParam ?? null

  useEffect(() => {
    let timeoutId

    if (showToast) {
      timeoutId = window.setTimeout(() => setShowToast(false), 1600)
    }

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [showToast])

  useEffect(() => {
    if (!claimId) {
      setClaim(null)
      setError('Claim not found.')
      setLoading(false)
      return undefined
    }

    async function fetchClaim() {
      setLoading(true)
      setError(null)

      try {
        const { data, error: fetchError } = await supabase
          .from('claims')
          .select(`
            *,
            payouts (*),
            trigger_events (*)
          `)
          .eq('id', claimId)
          .single()

        if (fetchError) throw fetchError
        setClaim(data)
      } catch (fetchError) {
        setClaim(null)
        setError(fetchError.message)
      } finally {
        setLoading(false)
      }
    }

    fetchClaim()
    return undefined
  }, [claimId])

  if (loading) return <LoadingSkeleton />
  if (error) return <ErrorState message={error} />

  const payout = normalizeRelation(claim?.payouts)
  const triggerEvent = normalizeRelation(claim?.trigger_events)
  const partner = registrationResult?.partner ?? {
    full_name: profile.name,
    policy_number: profile.policyNumber,
    upi_id: profile.upiId,
    city: profile.city,
  }
  const amountPaid = payout?.amount ?? claim?.payout_amount ?? 0
  const timeline = [
    {
      title: `${getTriggerLabel(claim?.trigger_type)} threshold breached`,
      date: formatDateTime(triggerEvent?.fired_at ?? claim?.created_at),
      description: triggerEvent
        ? `${formatTriggerDescription(
            triggerEvent,
            claim?.trigger_type,
          )}. Source: ${triggerEvent.data_source}.`
        : `${getTriggerLabel(claim?.trigger_type)} was recorded automatically for your city.`,
    },
    {
      title: 'Claim created',
      date: formatDateTime(claim?.created_at),
      description: `${claim?.claim_number} was created automatically for your policy.`,
    },
    {
      title: claim?.fraud_flag ? 'Sent for manual review' : 'Auto-approved',
      date: formatDateTime(claim?.created_at),
      description: claim?.fraud_flag
        ? `Anomaly score ${formatAnomalyScore(claim?.anomaly_score)} triggered manual review.`
        : `Fraud checks cleared automatically with anomaly score ${formatAnomalyScore(
            claim?.anomaly_score,
          )}.`,
    },
    {
      title: payout ? 'Payout settled' : 'Payout pending',
      date: formatDateTime(payout?.settled_at ?? claim?.resolved_at ?? claim?.created_at),
      description: payout
        ? `${formatCurrency(amountPaid)} sent to ${partner?.upi_id}. Reference ${payout.razorpay_payout_id}.`
        : 'Payout has not been settled yet.',
    },
  ]

  function handleDownloadReceipt() {
    const receiptLines = [
      '========================================',
      '         GRIP CLAIM RECEIPT',
      '========================================',
      '',
      `Claim Number    : ${claim?.claim_number}`,
      `Policy Number   : ${partner?.policy_number}`,
      `Partner Name    : ${partner?.full_name}`,
      `UPI ID          : ${partner?.upi_id}`,
      '',
      `Trigger Type    : ${claim?.trigger_type?.toUpperCase()}`,
      `Trigger City    : ${triggerEvent?.city || partner?.city}`,
      `Claim Status    : ${claim?.status?.toUpperCase()}`,
      '',
      `Payout Amount   : Rs ${payout?.amount ?? amountPaid}`,
      `Payout ID       : ${payout?.razorpay_payout_id}`,
      `Settlement Date : ${
        payout?.settled_at
          ? new Date(payout.settled_at).toLocaleDateString('en-IN', {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })
          : 'Pending'
      }`,
      '',
      `First Payout Cap Applied : ${
        payout?.is_first_payout ? 'Yes (Rs 4,000 cap)' : 'No'
      }`,
      '',
      '========================================',
      'This is a system-generated receipt.',
      'GRIP - Gig Risk Income Protection',
      '========================================',
    ]

    const receiptText = receiptLines.join('\n')
    const blob = new Blob([receiptText], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `GRIP_Receipt_${claim?.claim_number}.txt`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
    setShowToast(true)
  }

  return (
    <PageTransition className="flex min-h-full flex-col">
      <ScreenHeader title="Payout Detail" backTo="/payouts" />

      <div className="flex-1 overflow-y-auto px-4 pb-5 pt-5 sm:px-5 sm:pb-6 sm:pt-6">
        <StaggerGroup className="space-y-6">
          <div className="space-y-2 text-center">
            <p className="font-display text-[40px] font-normal leading-none text-accent-success">
              {formatCurrency(amountPaid)}
            </p>
            <p className="text-[14px] text-text-secondary">
              {payout ? 'Paid to your UPI' : 'Awaiting payout'}
            </p>
            <p className="text-[14px] text-text-primary">{partner?.upi_id}</p>
          </div>

          <Card className="space-y-5">
            <h3 className="text-[15px] font-semibold text-text-primary">Payout Timeline</h3>
            <div className="space-y-5">
              {timeline.map((item, index) => (
                <div key={item.title} className="flex gap-4">
                  <div className="flex w-5 flex-col items-center">
                    <span className="text-accent-success">
                      <DotIcon className="h-3 w-3" />
                    </span>
                    {index < timeline.length - 1 ? (
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
            <DetailRow label="Claim Number" value={claim?.claim_number || 'Unavailable'} />
            <DetailRow
              label="Trigger Description"
              value={formatTriggerDescription(triggerEvent, claim?.trigger_type)}
            />
            <DetailRow label="Data Source" value={triggerEvent?.data_source || 'Unavailable'} />
            <DetailRow
              label="Fraud Assessment"
              value={claim?.fraud_flag ? 'Manual review' : 'Auto-approved'}
            />
            <DetailRow
              label="Anomaly Score"
              value={
                <span className="rounded-full border border-border-default bg-bg-elevated px-3 py-1 text-[12px] font-medium text-text-primary">
                  {formatAnomalyScore(claim?.anomaly_score)}
                </span>
              }
            />
            <DetailRow label="Payout ID" value={payout?.razorpay_payout_id || 'Pending'} />
            <DetailRow
              label="Settlement Time"
              value={formatDateTime(payout?.settled_at ?? claim?.resolved_at)}
            />
            <DetailRow label="Amount Paid" value={formatCurrency(amountPaid)} />
          </Card>

          {payout?.is_first_payout ? (
            <p className="text-[12px] leading-6 text-text-secondary">
              First payout cap applied. This settlement was capped under the initial UPI
              cooling period limit.
            </p>
          ) : null}
        </StaggerGroup>
      </div>

      <div className="px-4 pb-5 pt-2 sm:px-5 sm:pb-6">
        <SecondaryButton onClick={handleDownloadReceipt}>Download Receipt</SecondaryButton>
      </div>

      <Toast message="Receipt downloaded" visible={showToast} />
    </PageTransition>
  )
}
