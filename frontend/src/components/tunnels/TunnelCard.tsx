import { useState } from 'react'
import { notifications } from '@mantine/notifications'
import {
  IconTrash,
  IconQrcode,
  IconDownload,
  IconUser,
  IconShieldLock,
} from '@tabler/icons-react'
import { ActionIcon, Badge, Card, Group, Stack, Switch, Text, Tooltip } from '@mantine/core'
import { useAuthStore } from '@/stores/auth'
import { useTunnelsStore } from '@/stores/tunnels'
import { QRDialog, downloadConfig } from './ConfigDialog'
import { DeleteTunnelDialog } from './DeleteTunnelDialog'
import type { Tunnel } from '@/api/schemas'

const formatBytes = (bytes: number): string => {
  if (bytes === 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`
}

const formatHandshake = (ts: number | undefined): string => {
  if (ts === undefined || ts === 0) return 'Never'
  const diff = Math.floor(Date.now() / 1000 - ts)
  if (diff < 60) return `${diff}s ago`
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

type Props = { tunnel: Tunnel }

export const TunnelCard = ({ tunnel }: Props) => {
  const user = useAuthStore((s) => s.user)
  const toggle = useTunnelsStore((s) => s.toggle)
  const [toggling, setToggling] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const [qrOpen, setQrOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)

  const isActive = tunnel.status === 'active'

  const handleToggle = async () => {
    setToggling(true)
    try {
      await toggle(tunnel.id)
    } catch {
      notifications.show({ message: 'Failed to toggle tunnel', color: 'red' })
    } finally {
      setToggling(false)
    }
  }

  const handleDownload = async () => {
    setDownloading(true)
    try {
      await downloadConfig(tunnel)
    } catch {
      notifications.show({ message: 'Failed to download config', color: 'red' })
    } finally {
      setDownloading(false)
    }
  }

  return (
    <>
      <Card shadow="sm" padding="md" radius="md" withBorder opacity={isActive ? 1 : 0.6}>
        <Stack gap="sm">
          <Group justify="space-between">
            <Group gap="xs">
              <Text fw={500}>{tunnel.name}</Text>
              {tunnel.mode === 'secure' && (
                <Tooltip label="Private key never touched the server">
                  <IconShieldLock size={16} color="var(--mantine-color-dimmed)" />
                </Tooltip>
              )}
            </Group>
            <Switch
              checked={isActive}
              onChange={handleToggle}
              disabled={toggling}
            />
          </Group>

          {tunnel.userId && (
            <Group gap="xs">
              <Badge variant="outline" leftSection={<IconUser size={12} />}>
                {tunnel.userId === user?.id ? 'You' : tunnel.userId.slice(0, 8)}
              </Badge>
            </Group>
          )}

          {tunnel.labels && tunnel.labels.length > 0 && (
            <Group gap={4}>
              {tunnel.labels.map((label) => (
                <Badge key={label}>{label}</Badge>
              ))}
            </Group>
          )}

          <Stack gap={4}>
            <Group justify="space-between">
              <Text size="sm" c="dimmed">IP</Text>
              <Text size="sm" ff="monospace">{tunnel.wgIp}</Text>
            </Group>
            <Group justify="space-between">
              <Text size="sm" c="dimmed">Public Key</Text>
              <Text size="sm" ff="monospace" truncate maw={180}>
                {tunnel.publicKey.slice(0, 20)}...
              </Text>
            </Group>
            <Group justify="space-between">
              <Text size="sm" c="dimmed">Last Handshake</Text>
              <Text size="sm">{formatHandshake(tunnel.latestHandshake)}</Text>
            </Group>
            {(tunnel.transferRx !== undefined || tunnel.transferTx !== undefined) && (
              <Group justify="space-between">
                <Text size="sm" c="dimmed">Transfer</Text>
                <Text size="sm">
                  {formatBytes(tunnel.transferRx ?? 0)} / {formatBytes(tunnel.transferTx ?? 0)}
                </Text>
              </Group>
            )}
          </Stack>

          <Group justify="flex-end" gap="xs">
            {tunnel.mode === 'simple' && (
              <>
                <ActionIcon variant="outline" size="md" onClick={() => setQrOpen(true)} title="Show QR code">
                  <IconQrcode size={16} />
                </ActionIcon>
                <ActionIcon variant="outline" size="md" onClick={handleDownload} disabled={downloading} title="Download .conf">
                  <IconDownload size={16} />
                </ActionIcon>
              </>
            )}
            <ActionIcon variant="filled" color="red" size="md" onClick={() => setDeleteOpen(true)}>
              <IconTrash size={16} />
            </ActionIcon>
          </Group>
        </Stack>
      </Card>
      <QRDialog tunnel={tunnel} open={qrOpen} onOpenChange={setQrOpen} />
      <DeleteTunnelDialog tunnel={tunnel} open={deleteOpen} onOpenChange={setDeleteOpen} />
    </>
  )
}
