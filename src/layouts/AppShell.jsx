import { AnimatePresence } from 'framer-motion'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { AdminDashboardScreen } from '../screens/AdminDashboardScreen'
import { AdminTriggerConfirmScreen } from '../screens/AdminTriggerConfirmScreen'
import { AdminTriggerScreen } from '../screens/AdminTriggerScreen'
import { BottomNavBar } from '../components/BottomNavBar'
import { cn } from '../lib/utils'
import { DashboardScreen } from '../screens/DashboardScreen'
import { OnboardingComplete } from '../screens/OnboardingComplete'
import { OnboardingStepOne } from '../screens/OnboardingStepOne'
import { OnboardingStepThree } from '../screens/OnboardingStepThree'
import { OnboardingStepTwo } from '../screens/OnboardingStepTwo'
import { PayoutDetailScreen } from '../screens/PayoutDetailScreen'
import { PayoutHistoryScreen } from '../screens/PayoutHistoryScreen'
import { PolicyActiveScreen } from '../screens/PolicyActiveScreen'
import { PolicySelectionScreen } from '../screens/PolicySelectionScreen'
import { ScreenStub } from '../screens/ScreenStub'
import { SplashScreen } from '../screens/SplashScreen'
import { TriggerAlertScreen } from '../screens/TriggerAlertScreen'

const routes = [
  { path: '/', element: <SplashScreen /> },
  { path: '/onboarding/1', element: <OnboardingStepOne /> },
  { path: '/onboarding/2', element: <OnboardingStepTwo /> },
  { path: '/onboarding/3', element: <OnboardingStepThree /> },
  { path: '/onboarding/complete', element: <OnboardingComplete /> },
  { path: '/dashboard', element: <DashboardScreen /> },
  { path: '/policy', element: <PolicySelectionScreen /> },
  { path: '/policy/active', element: <PolicyActiveScreen /> },
  { path: '/payouts', element: <PayoutHistoryScreen /> },
  { path: '/payouts/detail', element: <PayoutDetailScreen /> },
  { path: '/trigger-alert', element: <TriggerAlertScreen /> },
  { path: '/admin/dashboard', element: <AdminDashboardScreen /> },
  { path: '/admin/trigger', element: <AdminTriggerScreen /> },
  { path: '/admin/trigger-confirm', element: <AdminTriggerConfirmScreen /> },
]

const partnerBottomNavRoutes = new Set([
  '/dashboard',
  '/policy',
  '/policy/active',
  '/payouts',
  '/payouts/detail',
])

export function AppShell() {
  const location = useLocation()
  const showBottomNav = partnerBottomNavRoutes.has(location.pathname)

  return (
    <div className="min-h-[100dvh] bg-bg-primary md:h-[100dvh] md:overflow-hidden md:p-6">
      <div className="relative mx-auto flex min-h-[100dvh] w-full max-w-frame flex-col overflow-hidden bg-bg-primary md:h-full md:min-h-0 md:rounded-[36px] md:border md:border-white/70 md:bg-bg-surface/65 md:shadow-frame md:backdrop-blur-2xl">
        <div className={cn('relative flex-1 min-h-0 overflow-hidden')}>
          <AnimatePresence mode="wait" initial={false}>
            <Routes location={location} key={location.pathname}>
              {routes.map((route) => (
                <Route
                  key={route.path}
                  path={route.path}
                  element={
                    route.element ?? (
                      <ScreenStub
                        eyebrow={route.eyebrow}
                        title={route.title}
                        routePath={route.path}
                      />
                    )
                  }
                />
              ))}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </AnimatePresence>
        </div>
        {showBottomNav ? <BottomNavBar /> : null}
      </div>
    </div>
  )
}
