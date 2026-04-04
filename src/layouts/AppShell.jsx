import { AnimatePresence } from 'framer-motion'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { AdminDashboardScreen } from '../screens/AdminDashboardScreen'
import { AdminTriggerConfirmScreen } from '../screens/AdminTriggerConfirmScreen'
import { AdminTriggerScreen } from '../screens/AdminTriggerScreen'
import { BottomNavBar } from '../components/BottomNavBar'
import RequireAuth from '../components/RequireAuth'
import { cn } from '../lib/utils'
import { DashboardScreen } from '../screens/DashboardScreen'
import Login from '../screens/Login'
import { OnboardingComplete } from '../screens/OnboardingComplete'
import OnboardingExclusions from '../screens/OnboardingExclusions'
import { OnboardingStepOne } from '../screens/OnboardingStepOne'
import { OnboardingStepFive } from '../screens/OnboardingStepFive'
import { OnboardingStepFour } from '../screens/OnboardingStepFour'
import { OnboardingStepThree } from '../screens/OnboardingStepThree'
import { OnboardingStepTwo } from '../screens/OnboardingStepTwo'
import { PayoutDetailScreen } from '../screens/PayoutDetailScreen'
import { PayoutHistoryScreen } from '../screens/PayoutHistoryScreen'
import { PolicyActiveScreen } from '../screens/PolicyActiveScreen'
import { PolicySelectionScreen } from '../screens/PolicySelectionScreen'
import ProfileScreen from '../screens/ProfileScreen'
import { ScreenStub } from '../screens/ScreenStub'
import { SplashScreen } from '../screens/SplashScreen'
import { TriggerAlertScreen } from '../screens/TriggerAlertScreen'

function protect(element) {
  return <RequireAuth>{element}</RequireAuth>
}

const routes = [
  { path: '/', element: <SplashScreen /> },
  { path: '/login', element: <Login /> },
  { path: '/onboarding/1', element: <OnboardingStepOne /> },
  { path: '/onboarding/2', element: <OnboardingStepTwo /> },
  { path: '/onboarding/3', element: <OnboardingStepThree /> },
  { path: '/onboarding/4', element: <OnboardingStepFour /> },
  { path: '/onboarding/5', element: <OnboardingStepFive /> },
  { path: '/onboarding/exclusions', element: <OnboardingExclusions /> },
  { path: '/onboarding/complete', element: <OnboardingComplete /> },
  { path: '/dashboard', element: protect(<DashboardScreen />) },
  { path: '/policy', element: protect(<PolicySelectionScreen />) },
  { path: '/policy/active', element: protect(<PolicyActiveScreen />) },
  { path: '/payouts', element: protect(<PayoutHistoryScreen />) },
  { path: '/payouts/detail', element: protect(<PayoutDetailScreen />) },
  { path: '/profile', element: protect(<ProfileScreen />) },
  { path: '/trigger-alert', element: protect(<TriggerAlertScreen />) },
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
  '/profile',
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
