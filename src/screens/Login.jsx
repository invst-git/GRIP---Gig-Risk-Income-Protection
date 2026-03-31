import { useState } from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { InputField, PrimaryButton } from '../components/ui'
import { useGRIP } from '../context/GRIPContext'
import { supabase } from '../lib/supabase'

const MotionDiv = motion.div

export default function Login() {
  const navigate = useNavigate()
  const { setRegistrationResult, setSelectedPlan } = useGRIP()
  const [mobile, setMobile] = useState('')
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

  async function handleLogin() {
    if (mobile.length < 10) {
      setError('Enter a valid 10-digit mobile number')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const { data: partner, error: fetchError } = await supabase
        .from('partners')
        .select('*, policies(*)')
        .eq('mobile_number', mobile)
        .eq('is_active', true)
        .single()

      if (fetchError || !partner) {
        setError('No active policy found for this number. Please sign up.')
        setLoading(false)
        return
      }

      const policy = (partner.policies || []).find((item) => item.status === 'active')

      if (!policy) {
        setError('No active policy found for this number. Please sign up.')
        setLoading(false)
        return
      }

      setSelectedPlan(partner.coverage_tier || 'Standard')
      setRegistrationResult({
        partner,
        policy,
        zoneRiskScore: partner.zone_risk_score,
        weeklyPremium: partner.weekly_premium,
        policyNumber: partner.policy_number,
      })

      navigate('/dashboard')
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <MotionDiv
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="mx-auto flex min-h-full w-full max-w-[390px] flex-col gap-8 px-5 py-12 text-white"
    >
      <div className="flex flex-col gap-2">
        <p className="text-xs uppercase tracking-widest text-text-secondary">
          Welcome back
        </p>
        <h1 className="font-display text-3xl leading-tight text-text-primary">
          Access Your Policy
        </h1>
        <p className="text-sm text-text-secondary">
          Enter your registered mobile number to continue.
        </p>
      </div>

      <div className="flex flex-col gap-4">
        <InputField
          label="Mobile Number"
          type="tel"
          maxLength={10}
          value={mobile}
          onChange={(event) => setMobile(event.target.value.replace(/\D/g, ''))}
          placeholder="10-digit number"
        />
        {error ? <p className="text-sm text-red-400">{error}</p> : null}
      </div>

      <div className="mt-auto flex flex-col gap-3">
        <PrimaryButton
          onClick={handleLogin}
          disabled={loading || mobile.length < 10}
          loading={loading}
          loadingText="Looking up..."
        >
          Access My Policy
        </PrimaryButton>
        <button
          type="button"
          onClick={() => navigate('/onboarding/1')}
          className="py-2 text-center text-sm text-text-secondary"
        >
          New partner? Sign up here
        </button>
      </div>
    </MotionDiv>
  )
}
