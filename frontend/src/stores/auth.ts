import { create } from 'zustand'
import { api, ApiError } from '@/api/client'
import { type User } from '@/api/schemas'

type AuthState = {
  user: User | null
  initialized: boolean
  needsSetup: boolean
  error: string | null
  init: () => Promise<void>
  completeSetup: () => void
  login: (username: string, password: string) => Promise<void>
  logout: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  initialized: false,
  needsSetup: false,
  error: null,

  init: async () => {
    try {
      const { needsSetup } = await api.system.setupStatus()
      if (needsSetup) {
        set({ needsSetup: true, initialized: true })
        return
      }
      const user = await api.auth.me().catch((err) => {
        if (err instanceof ApiError && err.status === 401) return null
        throw err
      })
      set({ user, initialized: true })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to connect to server'
      set({ initialized: true, error: message })
    }
  },

  completeSetup: () => set({ needsSetup: false }),

  login: async (username, password) => {
    const user = await api.auth.login(username, password)
    set({ user })
  },

  logout: async () => {
    await api.auth.logout()
    set({ user: null })
  },
}))
