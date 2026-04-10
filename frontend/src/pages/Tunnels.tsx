import { useEffect, useState } from 'react'
import { IconPlus, IconNetwork } from '@tabler/icons-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { H3, Muted } from '@/components/ui/typography'
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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <H3>Tunnels</H3>
        <Button onClick={() => setCreateOpen(true)}>
          <IconPlus className="size-4" />
          New Tunnel
        </Button>
      </div>

      {error && (
        <div className="rounded-md border border-destructive/20 bg-destructive/5 p-4">
          <Muted className="text-destructive">{error}</Muted>
        </div>
      )}

      {loading && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-[220px] rounded-xl" />
          ))}
        </div>
      )}

      {!loading && tunnels.length === 0 && !error && (
        <div className="flex flex-col items-center gap-4 py-16">
          <div className="rounded-full bg-muted p-4">
            <IconNetwork className="size-8 text-muted-foreground" />
          </div>
          <div className="text-center">
            <p className="text-lg font-medium">No tunnels yet</p>
            <Muted>Create your first WireGuard tunnel to get started.</Muted>
          </div>
          <Button onClick={() => setCreateOpen(true)}>
            <IconPlus className="size-4" />
            Create Tunnel
          </Button>
        </div>
      )}

      {!loading && tunnels.length > 0 && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {tunnels.map((tunnel) => (
            <TunnelCard key={tunnel.id} tunnel={tunnel} />
          ))}
        </div>
      )}

      <CreateTunnelDialog open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  )
}

export default Tunnels
