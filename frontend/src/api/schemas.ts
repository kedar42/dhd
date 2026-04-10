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

export const TunnelSchema = z.object({
  id: z.string(),
  name: z.string(),
  publicKey: z.string(),
  mode: z.enum(['simple', 'secure']),
  wgIp: z.string(),
  status: z.enum(['active', 'disabled']),
  latestHandshake: z.number().nullable().optional(),
  transferRx: z.number().optional().default(0),
  transferTx: z.number().optional().default(0),
  createdAt: z.string(),
})
export type Tunnel = z.infer<typeof TunnelSchema>

export const TunnelListSchema = z.array(TunnelSchema)

export const CreateTunnelResponseSchema = z.object({
  tunnel: TunnelSchema,
  config: z.string().optional(),
})
export type CreateTunnelResponse = z.infer<typeof CreateTunnelResponseSchema>
