import { createBrowserRouter, Navigate, Outlet } from 'react-router-dom'
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar'
import { AppSidebar } from '@/components/layout/AppSidebar'
import { SiteHeader } from '@/components/layout/SiteHeader'
import { useAuthStore } from '@/stores/auth'
import Login from '@/pages/Login'
import Setup from '@/pages/Setup'
import Tunnels from '@/pages/Tunnels'
import Requests from '@/pages/Requests'
import Firewall from '@/pages/Firewall'
import Stats from '@/pages/Stats'
import Settings from '@/pages/Settings'

const RequireSetup = () => {
  const { needsSetup, initialized } = useAuthStore()
  if (!initialized) return null
  if (!needsSetup) return <Navigate to="/" replace />
  return <Outlet />
}

const RequireAuth = () => {
  const { user, initialized, needsSetup } = useAuthStore()
  if (!initialized) return null
  if (needsSetup) return <Navigate to="/setup" replace />
  if (!user) return <Navigate to="/login" replace />
  return (
    <SidebarProvider>
      <AppSidebar user={user} />
      <SidebarInset>
        <SiteHeader />
        <div className="flex flex-1 flex-col gap-4 p-4 lg:p-6">
          <Outlet />
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}

const RequireAdmin = () => {
  const user = useAuthStore(s => s.user)
  if (user?.role !== 'admin') return <Navigate to="/tunnels" replace />
  return <Outlet />
}

const RedirectIfAuthed = ({ children }: { children: React.ReactNode }) => {
  const { user, initialized } = useAuthStore()
  if (!initialized) return null
  if (user) return <Navigate to="/" replace />
  return <>{children}</>
}

export const router = createBrowserRouter([
  {
    path: '/setup',
    element: <RequireSetup />,
    children: [{ index: true, element: <Setup /> }],
  },
  {
    path: '/login',
    element: <RedirectIfAuthed><Login /></RedirectIfAuthed>,
  },
  {
    path: '/',
    element: <RequireAuth />,
    children: [
      { index: true, element: <Navigate to="/tunnels" replace /> },
      { path: 'tunnels', element: <Tunnels /> },
      { path: 'stats', element: <Stats /> },
      {
        element: <RequireAdmin />,
        children: [
          { path: 'requests', element: <Requests /> },
          { path: 'firewall', element: <Firewall /> },
          { path: 'settings', element: <Settings /> },
        ],
      },
    ],
  },
])
