import { useLocation, useNavigate } from 'react-router-dom'
import { cn } from '../lib/utils'

const tabs = [
  { key: 'dashboard', label: 'Dashboard', to: '/admin/dashboard' },
  { key: 'trigger', label: 'Trigger', to: '/admin/trigger' },
  { key: 'partners', label: 'Partners', to: '/admin/dashboard#partners' },
]

export function AdminTopTabs() {
  const location = useLocation()
  const navigate = useNavigate()

  const activeTab =
    location.pathname === '/admin/trigger'
      ? 'trigger'
      : location.hash === '#partners'
        ? 'partners'
        : 'dashboard'

  return (
    <div className="px-4 pt-4 sm:px-5 sm:pt-5">
      <div className="grid h-[52px] grid-cols-3 rounded-full border-[1.5px] border-border-default bg-bg-elevated/90 p-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.85)]">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => navigate(tab.to)}
            className={cn(
              'rounded-full text-[14px] font-semibold transition-all',
              activeTab === tab.key
                ? 'bg-accent-primary text-text-on-accent shadow-[0_12px_26px_rgba(36,69,122,0.16)]'
                : 'text-text-secondary',
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>
    </div>
  )
}
