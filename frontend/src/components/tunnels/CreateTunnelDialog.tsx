import { useEffect, useState } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { QRCodeSVG } from 'qrcode.react'
import { IconCopy, IconDownload, IconInfoCircle, IconShieldLock, IconX } from '@tabler/icons-react'
import { notifications } from '@mantine/notifications'
import {
  ActionIcon,
  Badge,
  Button,
  Group,
  Modal,
  Paper,
  Stack,
  Switch,
  Text,
  TextInput,
  Tooltip,
} from '@mantine/core'
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

  const handleCopyServerInfo = async () => {
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
      `# AllowedIPs = 0.0.0.0/0 routes all traffic; adjust to your subnet if needed`,
      `AllowedIPs = 0.0.0.0/0`,
      `PersistentKeepalive = 25`,
    ].join('\n')
    try {
      await navigator.clipboard.writeText(text)
      notifications.show({ message: 'Config template copied to clipboard', color: 'green' })
    } catch {
      notifications.show({ message: 'Failed to copy to clipboard', color: 'red' })
    }
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
    <Modal
      opened={open}
      onClose={handleClose}
      title={
        config
          ? 'Tunnel created'
          : serverInfo
            ? (
              <Group gap="xs">
                <IconShieldLock size={20} />
                Tunnel created (secure)
              </Group>
            )
            : 'New tunnel'
      }
      size={showSuccess ? 'md' : undefined}
      closeOnClickOutside={!showSuccess}
    >
      {config ? (
        <Stack>
          <Text size="sm" c="dimmed">
            Scan this QR code with the WireGuard app or download the config file.
          </Text>
          <Stack align="center" gap="md" py="md">
            <Paper bg="white" p="sm" radius="md">
              <QRCodeSVG value={config} size={200} />
            </Paper>
            <Button variant="outline" leftSection={<IconDownload size={16} />} onClick={handleDownload}>
              Download {tunnelName}.conf
            </Button>
          </Stack>
          <Group justify="flex-end">
            <Button onClick={handleClose}>Done</Button>
          </Group>
        </Stack>
      ) : serverInfo ? (
        <Stack>
          <Text size="sm" c="dimmed">
            Use the server details below to assemble your WireGuard config.
            Your private key never left your device.
          </Text>
          <Stack gap="xs" py="sm">
            <Group justify="space-between">
              <Text size="sm" c="dimmed">Server Public Key</Text>
              <Text size="sm" ff="monospace" truncate maw={220}>
                {serverInfo.serverPublicKey}
              </Text>
            </Group>
            <Group justify="space-between">
              <Text size="sm" c="dimmed">Endpoint</Text>
              <Text size="sm" ff="monospace">{serverInfo.endpoint}</Text>
            </Group>
            <Group justify="space-between">
              <Text size="sm" c="dimmed">Your IP</Text>
              <Text size="sm" ff="monospace">{serverInfo.assignedIp}</Text>
            </Group>
            <Group justify="space-between">
              <Text size="sm" c="dimmed">DNS</Text>
              <Text size="sm" ff="monospace">{serverInfo.dns}</Text>
            </Group>
          </Stack>
          <Button
            variant="outline"
            fullWidth
            leftSection={<IconCopy size={16} />}
            onClick={handleCopyServerInfo}
          >
            Copy config template
          </Button>
          <Group justify="flex-end" mt="xs">
            <Button onClick={handleClose}>Done</Button>
          </Group>
        </Stack>
      ) : (
        <form onSubmit={form.handleSubmit(handleSubmit)}>
          <Stack gap="md">
            <Group justify="flex-end" gap="xs">
              <Group gap={4}>
                <IconShieldLock size={16} color="var(--mantine-color-dimmed)" />
                <Text size="sm" c="dimmed">Secure</Text>
                <Tooltip
                  label="Generate your keypair locally and paste only the public key. The server never sees your private key."
                  position="bottom"
                  maw={220}
                  multiline
                >
                  <IconInfoCircle size={14} color="var(--mantine-color-dimmed)" />
                </Tooltip>
              </Group>
              <Controller
                control={form.control}
                name="mode"
                render={({ field }) => (
                  <Switch
                    checked={field.value === 'secure'}
                    onChange={(e) => field.onChange(e.currentTarget.checked ? 'secure' : 'simple')}
                  />
                )}
              />
            </Group>

            <TextInput
              label={<>Tunnel name <Text component="span" c="red">*</Text></>}
              placeholder="e.g. Phone, Laptop"
              error={form.formState.errors.name?.message}
              {...form.register('name')}
            />

            {mode === 'secure' && (
              <TextInput
                label={<>Public key <Text component="span" c="red">*</Text></>}
                placeholder="e.g. xTIB...w4E="
                ff="monospace"
                error={form.formState.errors.publicKey?.message}
                {...form.register('publicKey')}
              />
            )}

            <Stack gap="xs">
              <Text size="sm" fw={500}>Labels</Text>
              <Group gap="xs">
                <TextInput
                  placeholder="Add a label..."
                  value={labelInput}
                  onChange={(e) => setLabelInput(e.currentTarget.value)}
                  onKeyDown={handleLabelKeyDown}
                  flex={1}
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => addLabel()}
                  disabled={!labelInput.trim()}
                >
                  Add
                </Button>
              </Group>
              {labelInput && suggestions.length > 0 && (
                <Group gap={4}>
                  {suggestions.slice(0, 8).map((s) => (
                    <Badge
                      key={s}
                      variant="outline"
                      component="button"
                      type="button"
                      onClick={() => addLabel(s)}
                    >
                      {s}
                    </Badge>
                  ))}
                </Group>
              )}
              {labels.length > 0 && (
                <Group gap="xs">
                  {labels.map((label) => (
                    <Badge
                      key={label}
                      variant="light"
                      rightSection={
                        <ActionIcon size="xs" variant="transparent" onClick={() => removeLabel(label)}>
                          <IconX size={12} />
                        </ActionIcon>
                      }
                    >
                      {label}
                    </Badge>
                  ))}
                </Group>
              )}
            </Stack>

            {error && <Text size="sm" c="red">{error}</Text>}

            <Group justify="flex-end">
              <Button variant="outline" onClick={handleClose} disabled={submitting}>
                Cancel
              </Button>
              <Button type="submit" loading={submitting}>
                Create
              </Button>
            </Group>
          </Stack>
        </form>
      )}
    </Modal>
  )
}
