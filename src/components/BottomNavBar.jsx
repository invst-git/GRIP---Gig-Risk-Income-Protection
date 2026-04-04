import { useLocation, useNavigate } from 'react-router-dom'
import { HomeIcon, ReceiptIcon, ShieldIcon, UserIcon } from './icons'
import { cn } from '../lib/utils'

const navItems = [
  {
    label: 'Home',
    to: '/dashboard',
    match: ['/dashboard'],
    icon: HomeIcon,
  },
  {
    label: 'Policy',
    to: '/policy',
    match: ['/policy', '/policy/active'],
    icon: ShieldIcon,
  },
  {
    label: 'Claims',
    to: '/payouts',
    match: ['/payouts', '/payouts/detail'],
    icon: ReceiptIcon,
  },
  {
    label: 'Profile',
    to: '/profile',
    match: ['/profile'],
    icon: UserIcon,
  },
]

export function BottomNavBar() {
  const navigate = useNavigate()
  const location = useLocation()

  return (
    <div className="sticky bottom-0 z-30 mt-auto bg-gradient-to-t from-bg-primary via-bg-primary/95 to-transparent px-4 pb-[calc(max(env(safe-area-inset-bottom),8px)+12px)] pt-3">
      <nav className="rounded-[26px] border border-white/80 bg-bg-surface/88 px-3 pb-2 pt-2 shadow-card backdrop-blur-xl">
        <ul className="grid h-16 grid-cols-4">
          {navItems.map((item) => {
            const active = item.match.includes(location.pathname)
            const Icon = item.icon

            return (
              <li key={item.label}>
                <button
                  type="button"
                  className="flex h-full w-full flex-col items-center justify-center gap-1"
                  onClick={() => navigate(item.to)}
                  aria-current={active ? 'page' : undefined}
                >
                  <Icon
                    className={cn(
                      'h-5 w-5 transition-colors',
                      active ? 'text-accent-primary' : 'text-text-secondary',
                    )}
                  />
                  <span
                    className={cn(
                      'text-[11px] font-medium',
                      active ? 'text-accent-primary' : 'text-text-secondary',
                    )}
                  >
                    {item.label}
                  </span>
                  {active ? (
                    <span className="mt-0.5 h-1 w-6 rounded-full bg-accent-primary/20" />
                  ) : (
                    <span className="mt-0.5 h-1 w-6 rounded-full bg-transparent" />
                  )}
                </button>
              </li>
            )
          })}
        </ul>
      </nav>
    </div>
  )
}
