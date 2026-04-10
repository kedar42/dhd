import { useState } from 'react'
import Peers from './pages/Peers'
import Requests from './pages/Requests'
import Firewall from './pages/Firewall'
import Stats from './pages/Stats'
import Settings from './pages/Settings'

const pages = ['Peers', 'Requests', 'Firewall', 'Stats', 'Settings'] as const
type Page = typeof pages[number]

export default function App() {
  const [page, setPage] = useState<Page>('Peers')

  return (
    <div>
      <nav style={{ display: 'flex', gap: 8, padding: 16, borderBottom: '1px solid #ccc' }}>
        {pages.map(p => (
          <button key={p} onClick={() => setPage(p)} style={{ fontWeight: page === p ? 'bold' : 'normal' }}>
            {p}
          </button>
        ))}
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
