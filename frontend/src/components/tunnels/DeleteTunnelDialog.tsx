import { useState } from 'react'
import { Button, Group, Modal, Text } from '@mantine/core'
import { useTunnelsStore } from '@/stores/tunnels'
import { ApiError } from '@/api/client'
import type { Tunnel } from '@/api/schemas'

type Props = {
  tunnel: Tunnel
  open: boolean
  onOpenChange: (open: boolean) => void
}

export const DeleteTunnelDialog = ({ tunnel, open, onOpenChange }: Props) => {
  const remove = useTunnelsStore((s) => s.remove)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleDelete = async () => {
    setDeleting(true)
    setError(null)
    try {
      await remove(tunnel.id)
      onOpenChange(false)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to delete tunnel')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <Modal opened={open} onClose={() => onOpenChange(false)} title="Delete tunnel">
      <Text size="sm" c="dimmed" mb="md">
        Are you sure you want to delete <strong>{tunnel.name}</strong>? This
        will disconnect the client immediately and cannot be undone.
      </Text>
      {error && <Text size="sm" c="red" mb="md">{error}</Text>}
      <Group justify="flex-end">
        <Button variant="outline" onClick={() => onOpenChange(false)} disabled={deleting}>
          Cancel
        </Button>
        <Button color="red" onClick={handleDelete} loading={deleting}>
          Delete
        </Button>
      </Group>
    </Modal>
  )
}
