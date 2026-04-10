# wg-admin — Architectural Specification

## Overview

A self-hosted WireGuard management UI replacing wg-easy, designed for homelab use. Single Docker container serving a Go binary + static React frontend.

## Stack

- **Backend:** Go, chi router, SQLite (`modernc.org/sqlite` — no CGo), single binary
- **Frontend:** React + Vite, Zustand, native fetch, WebSockets
- **UI components:** shadcn/ui
- **Deployment:** Single Docker container, no external dependencies

## Core Features

### Peer Management

Two modes per peer, chosen at creation time:

**Simple mode** — server generates full keypair, produces a scannable/downloadable client config (QR code + .conf file), identical to wg-easy behaviour. Private key is stored encrypted at rest. A warning badge is shown in the UI indicating the private key was server-generated.

**Secure mode** — user generates keypair locally and submits only their public key. Server creates the peer and returns only the server-side config snippet (server pubkey, endpoint, allowed IPs). User assembles their own config. Private key never touches the server.

Common behaviour:
- Hot-reload peers via `wg set` without bouncing the interface
- Peer is assigned a WireGuard IP from the configured subnet

### User Accounts & Approval Workflow

- User accounts with roles: `admin`, `user`
- Users can request tunnel creation by submitting their name + public key (secure mode) or just a name (simple mode, server generates)
- Admin approval queue with approve/reject actions
- Notifications dispatched on approval/rejection

### Firewall Rules (iptables)

Server-scoped rules, not per-peer. Rules are applied to all traffic forwarded through `wg0`.

Rules stored in DB as ordered tuples: `(destination CIDR, protocol, port, action)`.

On any change:
1. Flush the existing FORWARD chain rules for `wg0`
2. Reapply all rules from DB in order
3. Append a final DROP rule for the configured LAN subnet

UI tab with two modes:
- **Visual builder** — add/reorder/delete rules via form inputs and drag-to-reorder
- **Raw JSON toggle** — paste or export the full rule set as JSON, validated before save

The daemon manages iptables directly. No more `WG_POST_UP`/`WG_POST_DOWN` in docker-compose.

### Metrics & Stats

- Background polling daemon runs every 30 seconds, reading `wg show all dump`
- Computes per-peer deltas from previous reading
- Stores rows in `peer_stats` table
- Live rx/tx speeds pushed to connected clients via WebSocket
- Historical per-peer charts available in the UI

### Health Monitoring

- Checks WireGuard interface state and per-peer last handshake recency
- Configurable alert threshold (e.g. no handshake in N minutes = stale)
- Notification dispatched when peer goes stale or interface goes down

### Notifications

Pluggable adapter system. Configured per-event type in admin settings.

Supported adapters:
- **ntfy.sh** — topic + optional auth token
- **Discord webhook** — webhook URL

Trigger events:
- Peer request submitted
- Peer approved / rejected
- Peer connected / dropped (handshake seen / stale)
- Health alert

---

## Data Model (SQLite)

```sql
users (
  id          TEXT PRIMARY KEY,
  username    TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role        TEXT NOT NULL DEFAULT 'user',  -- 'admin' | 'user'
  created_at  DATETIME NOT NULL
)

peers (
  id              TEXT PRIMARY KEY,
  user_id         TEXT REFERENCES users(id),
  name            TEXT NOT NULL,
  public_key      TEXT UNIQUE NOT NULL,
  private_key_enc TEXT,                      -- NULL for secure mode peers
  mode            TEXT NOT NULL,             -- 'simple' | 'secure'
  wg_ip           TEXT UNIQUE NOT NULL,
  status          TEXT NOT NULL DEFAULT 'active',
  created_at      DATETIME NOT NULL
)

peer_requests (
  id          TEXT PRIMARY KEY,
  user_id     TEXT REFERENCES users(id),
  name        TEXT NOT NULL,
  public_key  TEXT,                          -- NULL if simple mode request
  mode        TEXT NOT NULL,
  status      TEXT NOT NULL DEFAULT 'pending',  -- 'pending' | 'approved' | 'rejected'
  created_at  DATETIME NOT NULL
)

firewall_rules (
  id          TEXT PRIMARY KEY,
  destination TEXT NOT NULL,                 -- CIDR or IP
  protocol    TEXT,                          -- 'tcp' | 'udp' | NULL (any)
  port        INTEGER,                       -- NULL = any
  action      TEXT NOT NULL,                 -- 'ACCEPT' | 'DROP'
  ord         INTEGER NOT NULL               -- display/apply order
)

peer_stats (
  id        TEXT PRIMARY KEY,
  peer_id   TEXT REFERENCES peers(id),
  ts        DATETIME NOT NULL,
  bytes_rx  INTEGER NOT NULL,
  bytes_tx  INTEGER NOT NULL,
  delta_rx  INTEGER NOT NULL,
  delta_tx  INTEGER NOT NULL
)

notification_config (
  id       TEXT PRIMARY KEY,
  type     TEXT NOT NULL,   -- 'ntfy' | 'discord'
  endpoint TEXT NOT NULL,
  token    TEXT,
  enabled  BOOLEAN NOT NULL DEFAULT 1
)

settings (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
  -- keys: wg_interface, wg_subnet, wg_port, wg_server_pubkey,
  --       alert_handshake_threshold_minutes, etc.
)
```

---

## API (REST + WebSocket)

```
POST   /api/auth/login
POST   /api/auth/logout

GET    /api/peers
POST   /api/peers                  -- admin: create peer directly
DELETE /api/peers/:id

GET    /api/requests               -- admin: list pending requests
POST   /api/requests               -- user: submit tunnel request
PUT    /api/requests/:id           -- admin: approve / reject

GET    /api/firewall               -- get ordered rule set
PUT    /api/firewall               -- replace full rule set

GET    /api/stats/:peer_id         -- historical stats for a peer
GET    /api/health                 -- server + interface health snapshot

GET    /api/settings
PUT    /api/settings

WS     /ws/stats                   -- live per-peer rx/tx deltas, 30s cadence
WS     /ws/events                  -- peer connect/drop, approval events, health alerts
```

---

## Project Structure

```
wg-admin/
├── backend/
│   ├── main.go
│   ├── api/           # chi route handlers
│   ├── wg/            # wireguard management (wg CLI wrapper)
│   ├── iptables/      # rule flush + reapply logic
│   ├── db/            # sqlite schema, migrations, queries
│   ├── metrics/       # 30s polling daemon
│   ├── notify/        # ntfy + discord adapters
│   └── auth/          # session management, password hashing
└── frontend/
    ├── src/
    │   ├── stores/    # zustand: peers, requests, firewall, stats, events
    │   ├── pages/     # Peers, Requests, Firewall, Stats, Settings
    │   ├── components/
    │   └── ws/        # websocket client, reconnect logic
    └── vite.config.ts
```

---

## Deployment

Single `Dockerfile` — multi-stage build:
1. Build Go binary
2. Build Vite bundle
3. Final stage: Go binary serves static files from embedded FS

Requirements:
- `NET_ADMIN` capability and access to `/dev/net/tun`
- SQLite DB persisted via volume mount at `/data/wg-admin.db`

Environment variables:
```
PORT                  # default 51821
WG_INTERFACE          # default wg0
WG_SUBNET             # e.g. 10.8.0.0/24
WG_PORT               # WireGuard UDP port, default 51820
ADMIN_PASSWORD        # initial admin password (hashed on first boot)
SECRET_KEY            # session signing key
```
