import { useEffect, useState } from 'react'
import { useAuthStore } from './stores/auth'
import Login from './pages/Login'
import Setup from './pages/Setup'
import Peers from './pages/Peers'
import Requests from './pages/Requests'
import Firewall from './pages/Firewall'
import Stats from './pages/Stats'
import Settings from './pages/Settings'

const adminPages = ['Peers', 'Requests', 'Firewall', 'Stats', 'Settings'] as const
const userPages = ['Peers', 'Stats'] as const
type Page = typeof adminPages[number]

export default function App() {
  const { user, checked, checkSession, logout } = useAuthStore()
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

  if (needsSetup === null || !checked && needsSetup === false) {
    return null // resolving initial state
  }

  if (needsSetup) {
    return <Setup onDone={() => setNeedsSetup(false)} />
  }

  if (!user) {
    return <Login />
  }

  const pages = user.role === 'admin' ? adminPages : userPages

  return (
    <div>
      <nav style={{ display: 'flex', gap: 8, padding: 16, borderBottom: '1px solid #ccc', alignItems: 'center' }}>
        {pages.map(p => (
          <button key={p} onClick={() => setPage(p)} style={{ fontWeight: page === p ? 'bold' : 'normal' }}>
            {p}
          </button>
        ))}
        <span style={{ marginLeft: 'auto', fontSize: 13, color: '#666' }}>
          {user.username} ({user.role})
        </span>
        <button onClick={logout} style={{ fontSize: 13 }}>Sign out</button>
      </nav>
      <main style={{ padding: 16 }}>
        {page === 'Peers' && <Peers />}
        {page === 'Requests' && <Requests />}
        {page === 'Firewall' && <Firewall />}
        {page === 'Stats' && <Stats />}
        {page === 'Settings' && <Settings />}
      </main>
    </div>
  )
}
