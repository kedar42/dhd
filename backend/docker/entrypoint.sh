#!/bin/sh
set -e

IFACE="${WG_INTERFACE:-wg0}"
SUBNET="${WG_SUBNET:-10.8.0.0/24}"
PORT="${WG_PORT:-51820}"
DB_PATH="${DB_PATH:-/data/wg-admin.db}"

# --- Generate server keypair and configure WireGuard interface ---

echo "==> Generating WireGuard server keypair..."
PRIV_KEY=$(wg genkey)
PUB_KEY=$(echo "$PRIV_KEY" | wg pubkey)

echo "==> Configuring $IFACE interface..."
ip link add "$IFACE" type wireguard 2>/dev/null || true

echo "$PRIV_KEY" | wg set "$IFACE" private-key /dev/stdin listen-port "$PORT"

# Assign the .1 address from the subnet (server gateway)
GW_IP=$(echo "$SUBNET" | sed 's|\.[0-9]*/|.1/|')
ip addr add "$GW_IP" dev "$IFACE" 2>/dev/null || true
ip link set "$IFACE" up

echo "==> Interface $IFACE is up (${GW_IP}, port ${PORT})"
echo "    Server public key: $PUB_KEY"

# --- Pre-seed the DB with the server public key ---
# This prevents the Go app from generating a DIFFERENT keypair.
# The app's bootstrapServerKeys checks for wg_server_public_key and skips if present.

mkdir -p "$(dirname "$DB_PATH")"

sqlite3 "$DB_PATH" <<SQL
PRAGMA journal_mode=WAL;
PRAGMA foreign_keys=ON;
CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);
INSERT OR REPLACE INTO settings (key, value) VALUES ('wg_server_public_key', '$PUB_KEY');
INSERT OR REPLACE INTO settings (key, value) VALUES ('wg_server_private_key', 'managed-by-container');
SQL

echo "==> Database seeded at $DB_PATH"

# --- Start the app ---
echo "==> Starting wg-admin..."
exec /app/wg-admin
