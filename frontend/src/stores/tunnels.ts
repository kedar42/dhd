import { create } from 'zustand'
import { api, ApiError } from '../api/client'
import type { CreateTunnelResponse, Tunnel } from '../api/schemas'

type TunnelsState = {
  tunnels: Tunnel[]
  loading: boolean
  error: string | null
  fetch: () => Promise<void>
  create: (params: { name: string; labels?: string[] }) => Promise<CreateTunnelResponse>
  remove: (id: string) => Promise<void>
  toggle: (id: string) => Promise<void>
}

export const useTunnelsStore = create<TunnelsState>((set, get) => ({
  tunnels: [],
  loading: false,
  error: null,

  fetch: async () => {
    set({ loading: true, error: null })
    try {
      const tunnels = await api.tunnels.list()
      set({ tunnels, loading: false })
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to load tunnels'
      set({ error: message, loading: false })
    }
  },

  create: async (params) => {
    const response = await api.tunnels.create(params)
    set({ tunnels: [response.tunnel, ...get().tunnels] })
    return response
  },

  remove: async (id: string) => {
    await api.tunnels.delete(id)
    set({ tunnels: get().tunnels.filter((t) => t.id !== id) })
  },

  toggle: async (id: string) => {
    const updated = await api.tunnels.toggle(id)
    set({
      tunnels: get().tunnels.map((t) => (t.id === id ? updated : t)),
    })
  },
}))
