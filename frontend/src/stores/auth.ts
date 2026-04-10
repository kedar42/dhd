import { create } from 'zustand'

export type User = {
  id: string
  username: string
  role: 'admin' | 'user'
}

type AuthState = {
  user: User | null
  checked: boolean  // true once we've resolved the initial session check
  login: (username: string, password: string) => Promise<void>
  logout: () => Promise<void>
  checkSession: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  checked: false,

  checkSession: async () => {
    try {
      const res = await fetch('/api/auth/me')
      if (res.ok) {
        const user = await res.json() as User
        set({ user, checked: true })
      } else {
        set({ user: null, checked: true })
      }
    } catch {
      set({ user: null, checked: true })
    }
  },

  login: async (username, password) => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    })
    if (!res.ok) {
      const text = await res.text()
      throw new Error(text.trim() || 'Login failed')
    }
    const user = await res.json() as User
    set({ user })
  },

  logout: async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    set({ user: null })
  },
}))
