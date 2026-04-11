import { useEffect } from 'react'
import { RouterProvider } from 'react-router-dom'
import { Toaster } from 'sonner'
import { useAuthStore } from '@/stores/auth'
import { router } from '@/router'

const App = () => {
  const init = useAuthStore(s => s.init)
  useEffect(() => { init() }, [init])
  return (
    <>
      <RouterProvider router={router} />
      <Toaster richColors />
    </>
  )
}

export default App
