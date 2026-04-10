import { z } from 'zod'

export const UserSchema = z.object({
  id: z.string(),
  username: z.string(),
  role: z.enum(['admin', 'user']),
})
export type User = z.infer<typeof UserSchema>

export const SetupStatusSchema = z.object({
  needsSetup: z.boolean(),
})
export type SetupStatus = z.infer<typeof SetupStatusSchema>

export const HealthSchema = z.object({
  up: z.boolean(),
})
export type Health = z.infer<typeof HealthSchema>
