import { useEffect } from 'react'
import { RouterProvider } from 'react-router-dom'
import { useAuthStore } from '@/stores/auth'
import { router } from '@/router'

export default function App() {
  const init = useAuthStore(s => s.init)
  useEffect(() => { init() }, [init])
  return <RouterProvider router={router} />
}
