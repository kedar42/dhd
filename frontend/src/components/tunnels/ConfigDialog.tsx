import { useEffect, useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { Button, Group, Modal, Stack, Text } from '@mantine/core'
import { api, ApiError } from '@/api/client'
import type { Tunnel } from '@/api/schemas'

type Props = {
  tunnel: Tunnel
  open: boolean
  onOpenChange: (open: boolean) => void
}

export const QRDialog = ({ tunnel, open, onOpenChange }: Props) => {
  const [config, setConfig] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) {
      setConfig(null)
      setError(null)
      return
    }
    setLoading(true)
    api.tunnels
      .config(tunnel.id)
      .then((res) => setConfig(res.config))
      .catch((err) =>
        setError(err instanceof ApiError ? err.message : 'Failed to load config'),
      )
      .finally(() => setLoading(false))
  }, [open, tunnel.id])

  return (
    <Modal
      opened={open}
      onClose={() => onOpenChange(false)}
      title={tunnel.name}
      size="sm"
    >
      <Text size="sm" c="dimmed" mb="md">
        Scan with the WireGuard app to configure this device.
      </Text>
      {loading && (
        <Text size="sm" c="dimmed" ta="center" py="xl">Loading...</Text>
      )}
      {error && <Text size="sm" c="red">{error}</Text>}
      {config && (
        <Stack align="center" py="md">
          <div style={{ borderRadius: 8, backgroundColor: 'white', padding: 12 }}>
            <QRCodeSVG value={config} size={220} />
          </div>
        </Stack>
      )}
      <Group justify="flex-end" mt="md">
        <Button variant="outline" onClick={() => onOpenChange(false)}>
          Close
        </Button>
      </Group>
    </Modal>
  )
}

export const downloadConfig = async (tunnel: Tunnel) => {
  const { config } = await api.tunnels.config(tunnel.id)
  const blob = new Blob([config], { type: 'text/plain' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${tunnel.name.replace(/[^a-zA-Z0-9-_]/g, '_')}.conf`
  a.click()
  URL.revokeObjectURL(url)
}
