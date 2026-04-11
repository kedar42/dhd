import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete tunnel</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete <strong>{tunnel.name}</strong>? This
            will disconnect the client immediately and cannot be undone.
          </DialogDescription>
        </DialogHeader>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={deleting}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
            {deleting ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
