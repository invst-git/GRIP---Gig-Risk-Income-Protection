import { useEffect, useState } from 'react'
import { useGRIP } from '../context/GRIPContext'
import { supabase } from '../lib/supabase'

export function usePolicyData() {
  const { registrationResult } = useGRIP()
  const partnerId = registrationResult?.partner?.id
  const [policy, setPolicy] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!partnerId) {
      setPolicy(null)
      setError(null)
      setLoading(false)
      return undefined
    }

    async function fetchPolicy() {
      setLoading(true)
      setError(null)

      try {
        const { data, error: fetchError } = await supabase
          .from('policies')
          .select('*')
          .eq('partner_id', partnerId)
          .eq('status', 'active')
          .single()

        if (fetchError) throw fetchError
        setPolicy(data)
      } catch (fetchError) {
        setPolicy(null)
        setError(fetchError.message)
      } finally {
        setLoading(false)
      }
    }

    fetchPolicy()
    return undefined
  }, [partnerId])

  return { policy, loading, error }
}
