/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useGRIP } from './GRIPContext'

const NotificationContext = createContext(null)

export function NotificationProvider({ children }) {
  const { registrationResult } = useGRIP()
  const partner = registrationResult?.partner
  const [notifications, setNotifications] = useState([])
  const [toast, setToast] = useState(null)
  const toastTimer = useRef(null)

  useEffect(() => {
    if (!partner?.id) return

    const channel = supabase
      .channel(`notifications-${partner.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'claims',
        filter: `partner_id=eq.${partner.id}`
      }, (payload) => {
        const claim = payload.new
        const isFraud = claim.fraud_flag
        const triggerLabel = claim.trigger_type
          ? claim.trigger_type.charAt(0).toUpperCase() + claim.trigger_type.slice(1)
          : 'Unknown'

        const message = isFraud
          ? `Claim flagged for review - ${triggerLabel} trigger`
          : `Rs ${claim.payout_amount ?? 400} payout approved - ${triggerLabel} trigger`

        const notification = {
          id: claim.id,
          message,
          read: false,
          created_at: claim.created_at,
          type: isFraud ? 'warning' : 'success',
          claim_number: claim.claim_number,
        }

        setNotifications((prev) => [notification, ...prev])

        if (toastTimer.current) clearTimeout(toastTimer.current)
        setToast(notification)
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
        const payout = payload.new
        const payoutId = payout.razorpay_payout_id || ''
        const amount = payout.amount || 0

        const message = `Rs ${amount} credited - ${payoutId}`

        const notification = {
          id: payout.id,
          message,
          read: false,
          created_at: payout.settled_at || new Date().toISOString(),
          type: 'success',
          payout_id: payoutId,
        }

        setNotifications((prev) => [notification, ...prev])

        if (toastTimer.current) clearTimeout(toastTimer.current)
        setToast(notification)
        toastTimer.current = setTimeout(() => setToast(null), 5000)
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
      supabase.removeChannel(payoutChannel)
      if (toastTimer.current) clearTimeout(toastTimer.current)
    }
  }, [partner?.id])

  const markAllRead = () =>
    setNotifications((prev) => prev.map((notification) => ({ ...notification, read: true })))

  const unreadCount = notifications.filter((notification) => !notification.read).length

  return (
    <NotificationContext.Provider
      value={{ notifications, toast, unreadCount, markAllRead }}
    >
      {children}
    </NotificationContext.Provider>
  )
}

export const useNotifications = () => useContext(NotificationContext)
