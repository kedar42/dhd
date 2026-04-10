import { useEffect, useState } from 'react'
import { useAuthStore } from '@/stores/auth'
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar'
import { AppSidebar, type Page } from '@/components/layout/AppSidebar'
import { SiteHeader } from '@/components/layout/SiteHeader'
import Login from '@/pages/Login'
import Setup from '@/pages/Setup'
import Peers from '@/pages/Peers'
import Requests from '@/pages/Requests'
import Firewall from '@/pages/Firewall'
import Stats from '@/pages/Stats'
import Settings from '@/pages/Settings'

export default function App() {
  const { user, checked, checkSession } = useAuthStore()
  const [needsSetup, setNeedsSetup] = useState<boolean | null>(null)
  const [page, setPage] = useState<Page>('Peers')

  useEffect(() => {
    fetch('/api/system/setup')
      .then(r => r.json())
      .then((data: { needsSetup: boolean }) => setNeedsSetup(data.needsSetup))
      .catch(() => setNeedsSetup(false))
  }, [])

  useEffect(() => {
    if (needsSetup === false) checkSession()
  }, [needsSetup])

  if (needsSetup === null || (!checked && needsSetup === false)) return null
  if (needsSetup) return <Setup onDone={() => setNeedsSetup(false)} />
  if (!user) return <Login />

  return (
    <SidebarProvider>
      <AppSidebar user={user} page={page} onNavigate={setPage} />
      <SidebarInset>
        <SiteHeader page={page} />
        <div className="flex flex-1 flex-col gap-4 p-4 lg:p-6">
          {page === 'Peers' && <Peers />}
          {page === 'Requests' && <Requests />}
          {page === 'Firewall' && <Firewall />}
          {page === 'Stats' && <Stats />}
          {page === 'Settings' && <Settings />}
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
