/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useGRIP } from './GRIPContext'

const NotificationContext = createContext(null)

function getNotificationStorageKey(partnerId) {
  return `grip_notifications_seen_at:${partnerId}`
}

function getNotificationToastStorageKey(partnerId) {
  return `grip_notifications_toast_seen:${partnerId}`
}

function getStoredSeenAt(partnerId) {
  if (typeof window === 'undefined' || !partnerId) return null

  try {
    return window.localStorage.getItem(getNotificationStorageKey(partnerId))
  } catch {
    return null
  }
}

function getStoredToastNotificationId(partnerId) {
  if (typeof window === 'undefined' || !partnerId) return null

  try {
    return window.localStorage.getItem(getNotificationToastStorageKey(partnerId))
  } catch {
    return null
  }
}

function setStoredSeenAt(partnerId, value) {
  if (typeof window === 'undefined' || !partnerId || !value) return

  try {
    window.localStorage.setItem(getNotificationStorageKey(partnerId), value)
  } catch {
    // Ignore storage failures - notifications still work in memory.
  }
}

function setStoredToastNotificationId(partnerId, notificationId) {
  if (typeof window === 'undefined' || !partnerId || !notificationId) return

  try {
    window.localStorage.setItem(getNotificationToastStorageKey(partnerId), notificationId)
  } catch {
    // Ignore storage failures - notifications still work in memory.
  }
}

function toTimestamp(value) {
  if (!value) return 0

  const parsed = new Date(value).getTime()
  return Number.isNaN(parsed) ? 0 : parsed
}

function buildClaimNotification(claim, seenAt = null) {
  const isFraud = claim?.fraud_flag
  const triggerLabel = claim?.trigger_type
    ? claim.trigger_type.charAt(0).toUpperCase() + claim.trigger_type.slice(1)
    : 'Unknown'
  const createdAt = claim?.created_at || new Date().toISOString()

  return {
    id: `claim-${claim.id}`,
    message: isFraud
      ? `Claim flagged for review - ${triggerLabel} trigger`
      : `Rs ${claim?.payout_amount ?? 400} payout approved - ${triggerLabel} trigger`,
    read: seenAt ? toTimestamp(createdAt) <= toTimestamp(seenAt) : false,
    created_at: createdAt,
    type: isFraud ? 'warning' : 'success',
    claim_number: claim?.claim_number,
    source: 'claim',
  }
}

function buildPayoutNotification(payout, seenAt = null) {
  const createdAt = payout?.settled_at || payout?.created_at || new Date().toISOString()
  const payoutId = payout?.razorpay_payout_id || ''

  return {
    id: `payout-${payout.id}`,
    message: `Rs ${payout?.amount || 0} credited - ${payoutId}`,
    read: seenAt ? toTimestamp(createdAt) <= toTimestamp(seenAt) : false,
    created_at: createdAt,
    type: 'success',
    payout_id: payoutId,
    source: 'payout',
  }
}

function sortNotifications(notifications) {
  return [...notifications].sort((first, second) => (
    toTimestamp(second.created_at) - toTimestamp(first.created_at)
  ))
}

export function NotificationProvider({ children }) {
  const { registrationResult } = useGRIP()
  const partner = registrationResult?.partner
  const [notifications, setNotifications] = useState([])
  const [toast, setToast] = useState(null)
  const toastTimer = useRef(null)
  const visibleNotifications = partner?.id ? notifications : []
  const visibleToast = partner?.id ? toast : null

  useEffect(() => {
    if (!partner?.id) return undefined

    let active = true

    async function loadNotifications() {
      const seenAt = getStoredSeenAt(partner.id)
      const lastToastNotificationId = getStoredToastNotificationId(partner.id)

      const [{ data: claims }, { data: payouts }] = await Promise.all([
        supabase
          .from('claims')
          .select('id, claim_number, trigger_type, payout_amount, fraud_flag, created_at')
          .eq('partner_id', partner.id)
          .order('created_at', { ascending: false }),
        supabase
          .from('payouts')
          .select('id, amount, razorpay_payout_id, settled_at, created_at')
          .eq('partner_id', partner.id)
          .order('settled_at', { ascending: false }),
      ])

      if (!active) return

      const historicalNotifications = sortNotifications([
        ...(claims || []).map((claim) => buildClaimNotification(claim, seenAt)),
        ...(payouts || []).map((payout) => buildPayoutNotification(payout, seenAt)),
      ])

      setNotifications(historicalNotifications)

      const latestUnreadNotification = historicalNotifications.find(
        (notification) => !notification.read,
      )

      if (
        latestUnreadNotification &&
        latestUnreadNotification.id !== lastToastNotificationId
      ) {
        if (toastTimer.current) clearTimeout(toastTimer.current)
        setToast(latestUnreadNotification)
        setStoredToastNotificationId(partner.id, latestUnreadNotification.id)
        toastTimer.current = setTimeout(() => setToast(null), 5000)
      }
    }

    loadNotifications()

    const channel = supabase
      .channel(`notifications-${partner.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'claims',
        filter: `partner_id=eq.${partner.id}`
      }, (payload) => {
        const notification = buildClaimNotification(payload.new)

        setNotifications((prev) => sortNotifications([
          notification,
          ...prev.filter((entry) => entry.id !== notification.id),
        ]))

        if (toastTimer.current) clearTimeout(toastTimer.current)
        setToast(notification)
        setStoredToastNotificationId(partner.id, notification.id)
        toastTimer.current = setTimeout(() => setToast(null), 5000)
      })
      .subscribe()

    const payoutChannel = supabase
      .channel(`payouts-${partner.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'payouts',
        filter: `partner_id=eq.${partner.id}`
      }, (payload) => {
        const notification = buildPayoutNotification(payload.new)

        setNotifications((prev) => sortNotifications([
          notification,
          ...prev.filter((entry) => entry.id !== notification.id),
        ]))

        if (toastTimer.current) clearTimeout(toastTimer.current)
        setToast(notification)
        setStoredToastNotificationId(partner.id, notification.id)
        toastTimer.current = setTimeout(() => setToast(null), 5000)
      })
      .subscribe()

    return () => {
      active = false
      supabase.removeChannel(channel)
      supabase.removeChannel(payoutChannel)
      if (toastTimer.current) clearTimeout(toastTimer.current)
    }
  }, [partner?.id])

  const markAllRead = () => {
    const seenAt = visibleNotifications.length > 0
      ? visibleNotifications.reduce((latest, notification) => (
        toTimestamp(notification.created_at) > toTimestamp(latest)
          ? notification.created_at
          : latest
      ), visibleNotifications[0].created_at)
      : new Date().toISOString()

    setStoredSeenAt(partner?.id, seenAt)
    setNotifications((prev) => prev.map((notification) => ({ ...notification, read: true })))
  }

  const unreadCount = visibleNotifications.filter((notification) => !notification.read).length

  return (
    <NotificationContext.Provider
      value={{
        notifications: visibleNotifications,
        toast: visibleToast,
        unreadCount,
        markAllRead,
      }}
    >
      {children}
    </NotificationContext.Provider>
  )
}

export const useNotifications = () => useContext(NotificationContext)
