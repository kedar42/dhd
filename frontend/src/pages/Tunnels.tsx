import { useEffect, useState } from 'react'
import { IconPlus, IconNetwork } from '@tabler/icons-react'
import { Alert, Box, Button, Group, SimpleGrid, Skeleton, Stack, Text, ThemeIcon, Title } from '@mantine/core'
import { useTunnelsStore } from '@/stores/tunnels'
import { TunnelCard } from '@/components/tunnels/TunnelCard'
import { CreateTunnelDialog } from '@/components/tunnels/CreateTunnelDialog'

const Tunnels = () => {
  const { tunnels, loading, error, fetch } = useTunnelsStore()
  const [createOpen, setCreateOpen] = useState(false)

  useEffect(() => {
    fetch()
  }, [fetch])

  return (
    <Stack gap="lg">
      <Group justify="space-between">
        <Title order={3}>Tunnels</Title>
        <Button leftSection={<IconPlus size={16} />} onClick={() => setCreateOpen(true)}>
          New Tunnel
        </Button>
      </Group>

      {error && (
        <Alert color="red" variant="light">{error}</Alert>
      )}

      {loading && (
        <SimpleGrid cols={{ base: 1, md: 2, xl: 3 }}>
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} height={220} radius="md" />
          ))}
        </SimpleGrid>
      )}

      {!loading && tunnels.length === 0 && !error && (
        <Stack align="center" gap="md" py="xl">
          <ThemeIcon size="xl" radius="xl" variant="light" color="gray">
            <IconNetwork size={24} />
          </ThemeIcon>
          <Stack align="center" gap={4}>
            <Text size="lg" fw={500}>No tunnels yet</Text>
            <Text size="sm" c="dimmed">Create your first WireGuard tunnel to get started.</Text>
          </Stack>
          <Button leftSection={<IconPlus size={16} />} onClick={() => setCreateOpen(true)}>
            Create Tunnel
          </Button>
        </Stack>
      )}

      {!loading && tunnels.length > 0 && (
        <SimpleGrid cols={{ base: 1, md: 2, xl: 3 }}>
          {tunnels.map((tunnel) => (
            <TunnelCard key={tunnel.id} tunnel={tunnel} />
          ))}
        </SimpleGrid>
      )}

      <CreateTunnelDialog open={createOpen} onOpenChange={setCreateOpen} />
    </Stack>
  )
}

export default Tunnels
