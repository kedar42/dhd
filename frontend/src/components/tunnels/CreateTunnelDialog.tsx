import { useEffect, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { QRCodeSVG } from 'qrcode.react'
import { IconDownload, IconX } from '@tabler/icons-react'
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
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useAuthStore } from '@/stores/auth'
import { useTunnelsStore } from '@/stores/tunnels'
import { api, ApiError } from '@/api/client'
import type { User } from '@/api/schemas'

const UNOWNED = '__unowned__'

const formSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255),
  userId: z.string(),
})

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export const CreateTunnelDialog = ({ open, onOpenChange }: Props) => {
  const currentUser = useAuthStore((s) => s.user)
  const isAdmin = currentUser?.role === 'admin'
  const create = useTunnelsStore((s) => s.create)

  const [config, setConfig] = useState<string | undefined>()
  const [tunnelName, setTunnelName] = useState('')
  const [error, setError] = useState<string | undefined>()
  const [submitting, setSubmitting] = useState(false)

  const [users, setUsers] = useState<User[]>([])
  const [existingLabels, setExistingLabels] = useState<string[]>([])
  const [labels, setLabels] = useState<string[]>([])
  const [labelInput, setLabelInput] = useState('')
  const dialogRef = useRef<HTMLDivElement>(null)

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { name: '', userId: UNOWNED },
  })

  useEffect(() => {
    if (!open) return
    api.labels.list().then(setExistingLabels).catch(() => {})
    if (isAdmin) {
      api.users.list().then(setUsers).catch(() => {})
    }
  }, [open, isAdmin])

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
      const params: { name: string; userId?: string; labels?: string[] } = {
        name: values.name,
      }
      if (isAdmin) {
        // Send empty string for unowned, or the user ID
        params.userId = values.userId === UNOWNED ? '' : values.userId
      }
      if (labels.length > 0) {
        params.labels = labels
      }
      const response = await create(params)
      setConfig(response.config)
      setTunnelName(values.name)
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

  const handleClose = () => {
    setConfig(undefined)
    setTunnelName('')
    setError(undefined)
    setLabels([])
    setLabelInput('')
    form.reset()
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={config ? undefined : handleClose}>
      <DialogContent ref={dialogRef} className={config ? 'sm:max-w-md' : undefined}>
        {config ? (
          <>
            <DialogHeader>
              <DialogTitle>Tunnel created</DialogTitle>
              <DialogDescription>
                Scan this QR code with the WireGuard app or download the config file.
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
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>New tunnel</DialogTitle>
              <DialogDescription>
                Create a new WireGuard tunnel. A keypair will be generated and a
                client config provided for download.
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Tunnel name <span className="text-destructive">*</span>
                      </FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. Phone, Laptop" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {isAdmin && (
                  <FormField
                    control={form.control}
                    name="userId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Owner</FormLabel>
                        <Select
                          name={field.name}
                          value={field.value}
                          onValueChange={field.onChange}
                        >
                          <FormControl>
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Unowned" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent container={dialogRef.current}>
                            <SelectGroup>
                              <SelectItem value={UNOWNED}>Unowned</SelectItem>
                              {users.map((u) => (
                                <SelectItem key={u.id} value={u.id}>
                                  {u.username}
                                </SelectItem>
                              ))}
                            </SelectGroup>
                          </SelectContent>
                        </Select>
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
                  <Button type="button" variant="outline" onClick={handleClose} disabled={submitting}>
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
