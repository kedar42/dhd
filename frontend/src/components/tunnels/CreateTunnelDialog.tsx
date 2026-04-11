import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { QRCodeSVG } from 'qrcode.react'
import { IconCopy, IconDownload, IconInfoCircle, IconShieldLock, IconX } from '@tabler/icons-react'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { Muted, Small } from '@/components/ui/typography'
import { useTunnelsStore } from '@/stores/tunnels'
import { ApiError } from '@/api/client'
import { api } from '@/api/client'
import type { ServerInfo } from '@/api/schemas'

const WG_KEY_REGEX = /^[A-Za-z0-9+/]{42}[AEIMQUYcgkosw048]=$/

const formSchema = z
  .object({
    name: z.string().min(1, 'Name is required').max(255),
    mode: z.enum(['simple', 'secure']),
    publicKey: z.string().optional(),
  })
  .refine(
    (data) => {
      if (data.mode === 'secure') {
        return data.publicKey && WG_KEY_REGEX.test(data.publicKey)
      }
      return true
    },
    {
      message: 'Valid WireGuard public key required (base64, 44 characters)',
      path: ['publicKey'],
    },
  )

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export const CreateTunnelDialog = ({ open, onOpenChange }: Props) => {
  const create = useTunnelsStore((s) => s.create)

  const [config, setConfig] = useState<string | undefined>()
  const [serverInfo, setServerInfo] = useState<ServerInfo | undefined>()
  const [tunnelName, setTunnelName] = useState('')
  const [error, setError] = useState<string | undefined>()
  const [submitting, setSubmitting] = useState(false)

  const [existingLabels, setExistingLabels] = useState<string[]>([])
  const [labels, setLabels] = useState<string[]>([])
  const [labelInput, setLabelInput] = useState('')

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { name: '', mode: 'simple', publicKey: '' },
  })

  const mode = form.watch('mode')

  useEffect(() => {
    if (open) {
      api.labels.list().then(setExistingLabels).catch(() => {})
    }
  }, [open])

  const suggestions = existingLabels.filter(
    (l) => !labels.includes(l) && l.toLowerCase().includes(labelInput.toLowerCase()),
  )

  const addLabel = (value?: string) => {
    const trimmed = (value ?? labelInput).trim()
    if (trimmed && !labels.includes(trimmed)) {
      setLabels([...labels, trimmed])
    }
    setLabelInput('')
  }

  const removeLabel = (label: string) => {
    setLabels(labels.filter((l) => l !== label))
  }

  const handleLabelKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      addLabel()
    }
  }

  const handleSubmit = async (values: z.infer<typeof formSchema>) => {
    setSubmitting(true)
    setError(undefined)
    try {
      const response = await create({
        name: values.name,
        labels: labels.length > 0 ? labels : undefined,
        mode: values.mode,
        publicKey: values.mode === 'secure' ? values.publicKey : undefined,
      })
      setTunnelName(values.name)
      if (values.mode === 'secure') {
        setServerInfo(response.serverInfo)
      } else {
        setConfig(response.config)
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to create tunnel')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDownload = () => {
    if (!config) return
    const blob = new Blob([config], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${tunnelName.replace(/[^a-zA-Z0-9-_]/g, '_')}.conf`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleCopyServerInfo = () => {
    if (!serverInfo) return
    const text = [
      `[Interface]`,
      `# PrivateKey = <your private key>`,
      `Address = ${serverInfo.assignedIp}`,
      `DNS = ${serverInfo.dns}`,
      ``,
      `[Peer]`,
      `PublicKey = ${serverInfo.serverPublicKey}`,
      `Endpoint = ${serverInfo.endpoint}`,
      `AllowedIPs = 0.0.0.0/0`,
      `PersistentKeepalive = 25`,
    ].join('\n')
    navigator.clipboard.writeText(text)
    toast.success('Config template copied to clipboard')
  }

  const handleClose = () => {
    setConfig(undefined)
    setServerInfo(undefined)
    setTunnelName('')
    setError(undefined)
    setLabels([])
    setLabelInput('')
    form.reset()
    onOpenChange(false)
  }

  const showSuccess = config || serverInfo

  return (
    <Dialog open={open} onOpenChange={showSuccess ? undefined : handleClose}>
      <DialogContent className={showSuccess ? 'sm:max-w-md' : undefined}>
        {config ? (
          <>
            <DialogHeader>
              <DialogTitle>Tunnel created</DialogTitle>
              <DialogDescription>
                Scan this QR code with the WireGuard app or download the config
                file.
              </DialogDescription>
            </DialogHeader>
            <div className="flex flex-col items-center gap-4 py-4">
              <div className="rounded-lg bg-white p-3">
                <QRCodeSVG value={config} size={200} />
              </div>
              <Button variant="outline" onClick={handleDownload}>
                <IconDownload className="size-4" />
                Download {tunnelName}.conf
              </Button>
            </div>
            <DialogFooter>
              <Button onClick={handleClose}>Done</Button>
            </DialogFooter>
          </>
        ) : serverInfo ? (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-1.5">
                <IconShieldLock className="size-5" />
                Tunnel created (secure)
              </DialogTitle>
              <DialogDescription>
                Use the server details below to assemble your WireGuard config.
                Your private key never left your device.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3 py-2">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Muted>Server Public Key</Muted>
                  <Small className="font-mono truncate max-w-[220px]">
                    {serverInfo.serverPublicKey}
                  </Small>
                </div>
                <div className="flex items-center justify-between">
                  <Muted>Endpoint</Muted>
                  <Small className="font-mono">{serverInfo.endpoint}</Small>
                </div>
                <div className="flex items-center justify-between">
                  <Muted>Your IP</Muted>
                  <Small className="font-mono">{serverInfo.assignedIp}</Small>
                </div>
                <div className="flex items-center justify-between">
                  <Muted>DNS</Muted>
                  <Small className="font-mono">{serverInfo.dns}</Small>
                </div>
              </div>
              <Button
                variant="outline"
                className="w-full"
                onClick={handleCopyServerInfo}
              >
                <IconCopy className="size-4" />
                Copy config template
              </Button>
            </div>
            <DialogFooter>
              <Button onClick={handleClose}>Done</Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <div className="flex items-center justify-between">
                <DialogTitle>New tunnel</DialogTitle>
                <div className="mr-6 flex items-center gap-1.5">
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <IconShieldLock className="size-4" />
                    Secure
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <IconInfoCircle size={14} />
                      </TooltipTrigger>
                      <TooltipContent side="bottom" className="max-w-[220px]">
                        Generate your keypair locally and paste only the public
                        key. The server never sees your private key.
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <Switch
                    checked={mode === 'secure'}
                    onCheckedChange={(checked) =>
                      form.setValue('mode', checked ? 'secure' : 'simple')
                    }
                  />
                </div>
              </div>
            </DialogHeader>
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(handleSubmit)}
                className="space-y-4"
              >
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Tunnel name{' '}
                        <span className="text-destructive">*</span>
                      </FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. Phone, Laptop" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {mode === 'secure' && (
                  <FormField
                    control={form.control}
                    name="publicKey"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          Public key{' '}
                          <span className="text-destructive">*</span>
                        </FormLabel>
                        <FormControl>
                          <Input
                            placeholder="e.g. xTIB...w4E="
                            className="font-mono"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
                <div className="space-y-2">
                  <FormLabel>Labels</FormLabel>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Add a label..."
                      value={labelInput}
                      onChange={(e) => setLabelInput(e.target.value)}
                      onKeyDown={handleLabelKeyDown}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => addLabel()}
                      disabled={!labelInput.trim()}
                      className="shrink-0"
                    >
                      Add
                    </Button>
                  </div>
                  {labelInput && suggestions.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {suggestions.slice(0, 8).map((s) => (
                        <Badge
                          key={s}
                          variant="outline"
                          className="cursor-pointer hover:bg-accent"
                          onClick={() => addLabel(s)}
                        >
                          {s}
                        </Badge>
                      ))}
                    </div>
                  )}
                  {labels.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {labels.map((label) => (
                        <Badge key={label} variant="secondary" className="gap-1">
                          {label}
                          <button
                            type="button"
                            onClick={() => removeLabel(label)}
                            className="hover:text-destructive"
                          >
                            <IconX className="size-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
                {error && <p className="text-sm text-destructive">{error}</p>}
                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleClose}
                    disabled={submitting}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={submitting}>
                    {submitting ? 'Creating...' : 'Create'}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
