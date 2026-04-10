import { useState } from 'react'
import {
  IconTrash,
  IconQrcode,
  IconDownload,
  IconUser,
  IconShieldLock,
} from '@tabler/icons-react'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { Small, Muted } from '@/components/ui/typography'
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
    } finally {
      setToggling(false)
    }
  }

  const handleDownload = async () => {
    setDownloading(true)
    try {
      await downloadConfig(tunnel)
    } finally {
      setDownloading(false)
    }
  }

  return (
    <>
      <Card className={!isActive ? 'opacity-60' : undefined}>
        <CardHeader className="space-y-1.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <CardTitle className="text-base font-medium">{tunnel.name}</CardTitle>
              {tunnel.mode === 'secure' && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <IconShieldLock className="size-4 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent>Private key never touched the server</TooltipContent>
                </Tooltip>
              )}
            </div>
            <Switch
              checked={isActive}
              onCheckedChange={handleToggle}
              disabled={toggling}
              className="shrink-0"
            />
          </div>
          {tunnel.userId && (
            <div className="flex flex-wrap items-center gap-1.5">
              <Badge variant="outline" className="text-xs">
                <IconUser className="size-3" />
                {tunnel.userId === user?.id ? 'You' : tunnel.userId.slice(0, 8)}
              </Badge>
            </div>
          )}
        </CardHeader>
        <CardContent className="space-y-1.5">
          {tunnel.labels && tunnel.labels.length > 0 && (
            <div className="flex flex-wrap gap-1 pb-1">
              {tunnel.labels.map((label) => (
                <Badge key={label} variant="default" className="text-xs">
                  {label}
                </Badge>
              ))}
            </div>
          )}
          <div className="flex items-center justify-between">
            <Muted>IP</Muted>
            <Small className="font-mono">{tunnel.wgIp}</Small>
          </div>
          <div className="flex items-center justify-between">
            <Muted>Public Key</Muted>
            <Small className="font-mono truncate max-w-[180px]">
              {tunnel.publicKey.slice(0, 20)}...
            </Small>
          </div>
          <div className="flex items-center justify-between">
            <Muted>Last Handshake</Muted>
            <Small>{formatHandshake(tunnel.latestHandshake)}</Small>
          </div>
          {(tunnel.transferRx !== undefined || tunnel.transferTx !== undefined) && (
            <div className="flex items-center justify-between">
              <Muted>Transfer</Muted>
              <Small>
                {formatBytes(tunnel.transferRx ?? 0)} / {formatBytes(tunnel.transferTx ?? 0)}
              </Small>
            </div>
          )}
        </CardContent>
        <CardFooter className="justify-end gap-2">
          {tunnel.mode === 'simple' && (
            <>
              <Button
                variant="outline"
                size="icon-sm"
                onClick={() => setQrOpen(true)}
                title="Show QR code"
              >
                <IconQrcode className="size-4" />
              </Button>
              <Button
                variant="outline"
                size="icon-sm"
                onClick={handleDownload}
                disabled={downloading}
                title="Download .conf"
              >
                <IconDownload className="size-4" />
              </Button>
            </>
          )}
          <Button
            variant="destructive"
            size="icon-sm"
            onClick={() => setDeleteOpen(true)}
          >
            <IconTrash className="size-4" />
          </Button>
        </CardFooter>
      </Card>
      <QRDialog tunnel={tunnel} open={qrOpen} onOpenChange={setQrOpen} />
      <DeleteTunnelDialog
        tunnel={tunnel}
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
      />
    </>
  )
}
