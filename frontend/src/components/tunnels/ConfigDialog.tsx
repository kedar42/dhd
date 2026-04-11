import { useEffect, useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Muted } from '@/components/ui/typography'
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{tunnel.name}</DialogTitle>
          <DialogDescription>
            Scan with the WireGuard app to configure this device.
          </DialogDescription>
        </DialogHeader>
        {loading && <Muted className="py-8 text-center">Loading...</Muted>}
        {error && <p className="text-sm text-destructive">{error}</p>}
        {config && (
          <div className="flex justify-center py-4">
            <div className="rounded-lg bg-white p-3">
              <QRCodeSVG value={config} size={220} />
            </div>
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
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
