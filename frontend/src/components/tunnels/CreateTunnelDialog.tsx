import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { QRCodeSVG } from 'qrcode.react'
import { IconDownload } from '@tabler/icons-react'
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
import { Button } from '@/components/ui/button'
import { Small, Muted } from '@/components/ui/typography'
import { useTunnelsStore } from '@/stores/tunnels'
import { ApiError } from '@/api/client'

const formSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255),
})

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export const CreateTunnelDialog = ({ open, onOpenChange }: Props) => {
  const create = useTunnelsStore((s) => s.create)
  const [config, setConfig] = useState<string | null>(null)
  const [tunnelName, setTunnelName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { name: '' },
  })

  const handleSubmit = async (values: z.infer<typeof formSchema>) => {
    setSubmitting(true)
    setError(null)
    try {
      const response = await create(values.name)
      setConfig(response.config ?? null)
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
    setConfig(null)
    setTunnelName('')
    setError(null)
    form.reset()
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={config ? undefined : handleClose}>
      <DialogContent className={config ? 'sm:max-w-md' : undefined}>
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
            <div className="rounded-md border border-destructive/20 bg-destructive/5 p-3">
              <Small className="text-destructive">
                Save this config now. The private key cannot be retrieved again.
              </Small>
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
                      <FormLabel>Tunnel name</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. Phone, Laptop" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
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
