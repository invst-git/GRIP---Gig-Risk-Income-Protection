import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export function useAnalyticsData() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let isActive = true

    async function fetchAnalytics() {
      setLoading(true)

      try {
        const [claimsRes, payoutsRes, triggersRes, partnersRes] = await Promise.all([
          supabase.from('claims').select('*').order('created_at', { ascending: false }),
          supabase.from('payouts').select('*').order('initiated_at', { ascending: false }),
          supabase.from('trigger_events').select('*').order('fired_at', { ascending: false }),
          supabase
            .from('partners')
            .select('city, coverage_tier, weekly_premium, enrolled_since, is_active'),
        ])

        if (claimsRes.error) throw claimsRes.error
        if (payoutsRes.error) throw payoutsRes.error
        if (triggersRes.error) throw triggersRes.error
        if (partnersRes.error) throw partnersRes.error

        const claims = claimsRes.data || []
        const payouts = payoutsRes.data || []
        const triggers = triggersRes.data || []
        const partners = partnersRes.data || []
        const activePartnersList = partners.filter((partner) => partner.is_active)

        const firstEnrolled = partners.length > 0
          ? new Date(Math.min(...partners.map((partner) => new Date(partner.enrolled_since))))
          : new Date()
        const weeksSinceLaunch = Math.max(
          1,
          Math.ceil((new Date() - firstEnrolled) / (7 * 24 * 60 * 60 * 1000)),
        )

        const totalPremiumsCollected = partners
          .filter((partner) => partner.is_active)
          .reduce(
            (sum, partner) => sum + (partner.weekly_premium || 0) * weeksSinceLaunch,
            0,
          )

        const totalPayoutsAmount = payouts
          .filter((payout) => payout.status === 'processed')
          .reduce((sum, payout) => sum + (payout.amount || 0), 0)

        const lossRatio =
          totalPremiumsCollected > 0
            ? Math.min(999, (totalPayoutsAmount / totalPremiumsCollected) * 100).toFixed(1)
            : '0.0'

        const activePartners = activePartnersList.length

        const claimsByStatus = {
          paid: claims.filter((claim) => claim.status === 'paid').length,
          approved: claims.filter((claim) => claim.status === 'approved').length,
          fraud_review: claims.filter((claim) => claim.status === 'fraud_review').length,
          rejected: claims.filter((claim) => claim.status === 'rejected').length,
        }

        const autoApprovalRate =
          claims.length > 0
            ? ((claims.filter((claim) => claim.auto_approved).length / claims.length) * 100).toFixed(1)
            : '0.0'

        const fraudFlagRate =
          claims.length > 0
            ? ((claims.filter((claim) => claim.fraud_flag).length / claims.length) * 100).toFixed(1)
            : '0.0'

        const processedPayouts = payouts.filter(
          (payout) => payout.status === 'processed' && payout.settled_at && payout.initiated_at,
        )
        const avgLatencyMinutes =
          processedPayouts.length > 0
            ? (
                processedPayouts.reduce((sum, payout) => {
                  const diff = new Date(payout.settled_at) - new Date(payout.initiated_at)
                  return sum + diff / 60000
                }, 0) / processedPayouts.length
              ).toFixed(1)
            : '0.0'

        const confirmedTriggers = triggers.filter((trigger) => trigger.confirmed)
        const triggerHeatmap = {}
        confirmedTriggers.forEach((trigger) => {
          if (!triggerHeatmap[trigger.city]) {
            triggerHeatmap[trigger.city] = { heat: 0, rainfall: 0, aqi: 0, curfew: 0 }
          }

          triggerHeatmap[trigger.city][trigger.trigger_type] =
            (triggerHeatmap[trigger.city][trigger.trigger_type] || 0) + 1
        })

        const triggersByType = {
          heat: confirmedTriggers.filter((trigger) => trigger.trigger_type === 'heat').length,
          rainfall: confirmedTriggers.filter((trigger) => trigger.trigger_type === 'rainfall').length,
          aqi: confirmedTriggers.filter((trigger) => trigger.trigger_type === 'aqi').length,
          curfew: confirmedTriggers.filter((trigger) => trigger.trigger_type === 'curfew').length,
        }

        const partnersByCity = {}
        activePartnersList.forEach((partner) => {
          partnersByCity[partner.city] = (partnersByCity[partner.city] || 0) + 1
        })

        const recentTriggers = triggers
          .filter((trigger) => trigger.confirmed === true && trigger.raw_value > 0)
          .slice(0, 10)

        if (!isActive) return

        setData({
          activePartners,
          totalClaimsCount: claims.length,
          totalPayoutsAmount,
          lossRatio,
          autoApprovalRate,
          fraudFlagRate,
          avgLatencyMinutes,
          claimsByStatus,
          triggersByType,
          triggerHeatmap,
          partnersByCity,
          recentTriggers,
          recentClaims: claims.slice(0, 5),
        })
        setError(null)
      } catch (fetchError) {
        if (!isActive) return
        setError(fetchError.message)
      } finally {
        if (isActive) {
          setLoading(false)
        }
      }
    }

    fetchAnalytics()

    const interval = window.setInterval(fetchAnalytics, 30000)

    return () => {
      isActive = false
      window.clearInterval(interval)
    }
  }, [])

  return { data, loading, error }
}
