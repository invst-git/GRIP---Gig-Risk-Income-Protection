import { useEffect, useState } from 'react'
import { useGRIP } from '../context/GRIPContext'
import { supabase } from '../lib/supabase'

export function useClaimsData() {
  const { registrationResult } = useGRIP()
  const partnerId = registrationResult?.partner?.id
  const [claims, setClaims] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!partnerId) {
      setClaims([])
      setError(null)
      setLoading(false)
      return undefined
    }

    async function fetchClaims() {
      setLoading(true)
      setError(null)

      try {
        const { data, error: fetchError } = await supabase
          .from('claims')
          .select(`
            *,
            payouts (*),
            trigger_events (
              trigger_type,
              city,
              raw_value,
              threshold,
              fired_at,
              data_source
            )
          `)
          .eq('partner_id', partnerId)
          .order('created_at', { ascending: false })

        if (fetchError) throw fetchError
        setClaims(data || [])
      } catch (fetchError) {
        setClaims([])
        setError(fetchError.message)
      } finally {
        setLoading(false)
      }
    }

    fetchClaims()

    const channel = supabase
      .channel(`claims-changes-${partnerId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'claims',
          filter: `partner_id=eq.${partnerId}`,
        },
        () => fetchClaims(),
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [partnerId])

  return { claims, loading, error }
}
