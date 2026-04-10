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

export const TunnelMode = z.enum(['simple', 'secure'])
export type TunnelMode = z.infer<typeof TunnelMode>

export const TunnelStatus = z.enum(['active', 'disabled'])
export type TunnelStatus = z.infer<typeof TunnelStatus>

export const TunnelSchema = z.object({
  id: z.string(),
  name: z.string(),
  publicKey: z.string(),
  mode: TunnelMode,
  wgIp: z.ipv4(),
  status: TunnelStatus,
  userId: z.string().optional(),
  latestHandshake: z.number().optional(),
  transferRx: z.number().optional(),
  transferTx: z.number().optional(),
  createdAt: z.string(),
})
export type Tunnel = z.infer<typeof TunnelSchema>

export const TunnelListSchema = z.array(TunnelSchema)

export const CreateTunnelResponseSchema = z.object({
  tunnel: TunnelSchema,
  config: z.string().optional(),
})
export type CreateTunnelResponse = z.infer<typeof CreateTunnelResponseSchema>
