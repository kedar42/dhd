import { create } from 'zustand'
import { api } from '@/api/client'
import { type User } from '@/api/schemas'

type AuthState = {
  user: User | null
  initialized: boolean
  needsSetup: boolean
  init: () => Promise<void>
  completeSetup: () => void
  login: (username: string, password: string) => Promise<void>
  logout: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  initialized: false,
  needsSetup: false,

  init: async () => {
    try {
      const { needsSetup } = await api.system.setupStatus()
      if (needsSetup) {
        set({ needsSetup: true, initialized: true })
        return
      }
      const user = await api.auth.me().catch(() => null)
      set({ user, initialized: true })
    } catch {
      set({ initialized: true })
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
