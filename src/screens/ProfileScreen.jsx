import { useEffect, useState } from 'react'
import { PageTransition } from '../components/PageTransition'
import { useGRIP } from '../context/GRIPContext'
import { supabase } from '../lib/supabase'

function formatMemberSince(dateValue) {
  if (!dateValue) return '-'

  const parsedDate = new Date(dateValue)
  if (Number.isNaN(parsedDate.getTime())) return '-'

  return parsedDate.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

export default function ProfileScreen() {
  const { registrationResult, logout } = useGRIP()
  const partner = registrationResult?.partner
  const [bankAccount, setBankAccount] = useState(null)

  useEffect(() => {
    async function fetchBankAccount() {
      if (!partner?.id) {
        setBankAccount(null)
        return
      }

      const { data } = await supabase
        .from('bank_accounts')
        .select('bank_name, account_number_masked')
        .eq('partner_id', partner.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      setBankAccount(data ?? null)
    }

    void fetchBankAccount()
  }, [partner?.id])

  const fields = [
    { label: 'Full Name', value: partner?.full_name },
    { label: 'Mobile Number', value: partner?.mobile_number },
    { label: 'City', value: partner?.city },
    { label: 'Operating Zone', value: partner?.operating_zone },
    { label: 'Platform', value: partner?.platform },
    { label: 'Vehicle Type', value: partner?.vehicle_type },
    { label: 'Bank Name', value: bankAccount?.bank_name },
    { label: 'Account Number', value: bankAccount?.account_number_masked },
    { label: 'UPI ID', value: partner?.upi_id },
    {
      label: 'Member Since',
      value: formatMemberSince(partner?.enrolled_since),
    },
    { label: 'Policy Number', value: partner?.policy_number },
    { label: 'Coverage Tier', value: partner?.coverage_tier },
    {
      label: 'Zone Risk Score',
      value: `${Number(partner?.zone_risk_score || 0).toFixed(2)}x`,
    },
  ]

  return (
    <PageTransition className="min-h-full overflow-y-auto bg-background px-5 pb-24 pt-8 max-w-[390px] mx-auto">
      <h1 className="mb-6 font-display text-2xl text-text-primary">My Profile</h1>

      <div className="mb-8 flex flex-col gap-3">
        {fields.map(({ label, value }) => (
          <div
            key={label}
            className="flex items-center justify-between border-b border-border py-3"
          >
            <span className="text-sm text-text-secondary">{label}</span>
            <span className="max-w-[55%] break-all text-right text-sm font-medium text-text-primary">
              {value || '-'}
            </span>
          </div>
        ))}
      </div>

      <button
        onClick={logout}
        className="w-full rounded-xl border border-red-500/40 py-3 text-sm font-medium text-red-400 transition-colors hover:bg-red-500/10"
      >
        Log out
      </button>
    </PageTransition>
  )
}
