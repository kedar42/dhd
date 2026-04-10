import { z } from 'zod'
import { HealthSchema, SetupStatusSchema, UserSchema } from './schemas'

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message.trim() || `HTTP ${status}`)
    this.name = 'ApiError'
  }
}

const request = (url: string, init?: RequestInit) =>
  fetch(url, { credentials: 'include', ...init })

const getJson = async <T>(schema: z.ZodType<T>, url: string): Promise<T> => {
  const res = await request(url)
  if (!res.ok) throw new ApiError(res.status, await res.text())
  return schema.parse(await res.json())
}

async function postJson<T>(schema: z.ZodType<T>, url: string, body: unknown): Promise<T>
async function postJson(url: string, body: unknown): Promise<void>
async function postJson<T>(schemaOrUrl: z.ZodType<T> | string, urlOrBody: string | unknown, body?: unknown) {
  if (typeof schemaOrUrl === 'string') {
    const res = await request(schemaOrUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(urlOrBody),
    })
    if (!res.ok) throw new ApiError(res.status, await res.text())
    return
  }
  const res = await request(urlOrBody as string, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new ApiError(res.status, await res.text())
  return schemaOrUrl.parse(await res.json())
}

export const api = {
  system: {
    setupStatus: () => getJson(SetupStatusSchema, '/api/system/setup'),
    setup: (username: string, password: string) =>
      postJson('/api/system/setup', { username, password }),
  },
  auth: {
    me: () => getJson(UserSchema, '/api/auth/me'),
    login: (username: string, password: string) =>
      postJson(UserSchema, '/api/auth/login', { username, password }),
    logout: () => postJson('/api/auth/logout', {}),
  },
  health: {
    get: () => getJson(HealthSchema, '/api/health'),
  },
} as const
