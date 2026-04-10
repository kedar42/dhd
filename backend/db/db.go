package db

import (
	"database/sql"
	"fmt"

	_ "modernc.org/sqlite"
)

const schema = `
CREATE TABLE IF NOT EXISTS users (
  id            TEXT PRIMARY KEY,
  username      TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role          TEXT NOT NULL DEFAULT 'user',
  created_at    DATETIME NOT NULL
);

CREATE TABLE IF NOT EXISTS sessions (
  token      TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  username   TEXT NOT NULL,
  role       TEXT NOT NULL,
  created_at DATETIME NOT NULL,
  expires_at DATETIME NOT NULL,
  last_seen  DATETIME NOT NULL
);

CREATE TABLE IF NOT EXISTS peers (
  id              TEXT PRIMARY KEY,
  user_id         TEXT REFERENCES users(id) ON DELETE SET NULL,
  name            TEXT NOT NULL,
  public_key      TEXT UNIQUE NOT NULL,
  private_key_enc TEXT,
  mode            TEXT NOT NULL,
  wg_ip           TEXT UNIQUE NOT NULL,
  status          TEXT NOT NULL DEFAULT 'active',
  labels          TEXT NOT NULL DEFAULT '',
  created_at      DATETIME NOT NULL
);

CREATE TABLE IF NOT EXISTS peer_requests (
  id         TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  public_key TEXT,
  mode       TEXT NOT NULL,
  status     TEXT NOT NULL DEFAULT 'pending',
  created_at DATETIME NOT NULL
);

CREATE TABLE IF NOT EXISTS firewall_rules (
  id          TEXT PRIMARY KEY,
  destination TEXT NOT NULL,
  protocol    TEXT,
  port        INTEGER,
  action      TEXT NOT NULL,
  ord         INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS peer_stats (
  id       TEXT PRIMARY KEY,
  peer_id  TEXT NOT NULL REFERENCES peers(id) ON DELETE CASCADE,
  ts       DATETIME NOT NULL,
  bytes_rx INTEGER NOT NULL,
  bytes_tx INTEGER NOT NULL,
  delta_rx INTEGER NOT NULL,
  delta_tx INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS notification_config (
  id       TEXT PRIMARY KEY,
  type     TEXT NOT NULL,
  endpoint TEXT NOT NULL,
  token    TEXT,
  enabled  BOOLEAN NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS settings (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
`

func Open(path string) (*sql.DB, error) {
	db, err := sql.Open("sqlite", path)
	if err != nil {
		return nil, fmt.Errorf("open db: %w", err)
	}
	db.SetMaxOpenConns(1)
	if _, err := db.Exec("PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;"); err != nil {
		return nil, fmt.Errorf("pragma: %w", err)
	}
	if _, err := db.Exec(schema); err != nil {
		return nil, fmt.Errorf("schema: %w", err)
	}
	return db, nil
}
