package db

import (
	"database/sql"
	"errors"
	"time"
)

var ErrNotFound = errors.New("not found")

// --- Users ---

func GetUserByUsername(db *sql.DB, username string) (User, error) {
	row := db.QueryRow(
		`SELECT id, username, password_hash, role, created_at FROM users WHERE username = ?`,
		username,
	)
	var u User
	if err := row.Scan(&u.ID, &u.Username, &u.PasswordHash, &u.Role, &u.CreatedAt); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return User{}, ErrNotFound
		}
		return User{}, err
	}
	return u, nil
}

func ListUsers(db *sql.DB) ([]User, error) {
	rows, err := db.Query(
		`SELECT id, username, password_hash, role, created_at FROM users ORDER BY username`,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var users []User
	for rows.Next() {
		var u User
		if err := rows.Scan(&u.ID, &u.Username, &u.PasswordHash, &u.Role, &u.CreatedAt); err != nil {
			return nil, err
		}
		users = append(users, u)
	}
	return users, rows.Err()
}

func GetUserByID(db *sql.DB, id string) (User, error) {
	row := db.QueryRow(
		`SELECT id, username, password_hash, role, created_at FROM users WHERE id = ?`,
		id,
	)
	var u User
	if err := row.Scan(&u.ID, &u.Username, &u.PasswordHash, &u.Role, &u.CreatedAt); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return User{}, ErrNotFound
		}
		return User{}, err
	}
	return u, nil
}

func CreateUser(db *sql.DB, id, username, passwordHash, role string) error {
	_, err := db.Exec(
		`INSERT INTO users (id, username, password_hash, role, created_at) VALUES (?, ?, ?, ?, ?)`,
		id, username, passwordHash, role, time.Now().UTC(),
	)
	return err
}

func AdminExists(db *sql.DB) (bool, error) {
	var count int
	err := db.QueryRow(`SELECT COUNT(*) FROM users WHERE role = 'admin'`).Scan(&count)
	return count > 0, err
}

// CreateFirstAdmin atomically creates an admin user only if none exists.
// Returns an error if an admin already exists (prevents TOCTOU race).
func CreateFirstAdmin(db *sql.DB, id, username, passwordHash string) error {
	res, err := db.Exec(
		`INSERT INTO users (id, username, password_hash, role, created_at)
		 SELECT ?, ?, ?, 'admin', ?
		 WHERE NOT EXISTS (SELECT 1 FROM users WHERE role = 'admin')`,
		id, username, passwordHash, time.Now().UTC(),
	)
	if err != nil {
		return err
	}
	n, err := res.RowsAffected()
	if err != nil {
		return err
	}
	if n == 0 {
		return errors.New("admin already exists")
	}
	return nil
}

// --- Sessions ---

func CreateSession(db *sql.DB, token, userID, username, role string, ttl time.Duration) error {
	now := time.Now().UTC()
	_, err := db.Exec(
		`INSERT INTO sessions (token, user_id, username, role, created_at, expires_at, last_seen)
		 VALUES (?, ?, ?, ?, ?, ?, ?)`,
		token, userID, username, role, now, now.Add(ttl), now,
	)
	return err
}

func GetSession(db *sql.DB, token string) (Session, error) {
	row := db.QueryRow(
		`SELECT token, user_id, username, role, created_at, expires_at, last_seen
		 FROM sessions WHERE token = ? AND expires_at > ?`,
		token, time.Now().UTC(),
	)
	var s Session
	if err := row.Scan(&s.Token, &s.UserID, &s.Username, &s.Role, &s.CreatedAt, &s.ExpiresAt, &s.LastSeen); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return Session{}, ErrNotFound
		}
		return Session{}, err
	}
	return s, nil
}

func BumpSession(db *sql.DB, token string, ttl time.Duration) error {
	now := time.Now().UTC()
	_, err := db.Exec(
		`UPDATE sessions SET expires_at = ?, last_seen = ? WHERE token = ?`,
		now.Add(ttl), now, token,
	)
	return err
}

func DeleteSession(db *sql.DB, token string) error {
	_, err := db.Exec(`DELETE FROM sessions WHERE token = ?`, token)
	return err
}

func DeleteExpiredSessions(db *sql.DB) error {
	_, err := db.Exec(`DELETE FROM sessions WHERE expires_at <= ?`, time.Now().UTC())
	return err
}

// --- Peers ---

func CreatePeer(db *sql.DB, p Peer) error {
	_, err := db.Exec(
		`INSERT INTO peers (id, user_id, name, public_key, private_key_enc, mode, wg_ip, status, labels, created_at)
		 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		p.ID, p.UserID, p.Name, p.PublicKey, p.PrivateKeyEnc, p.Mode, p.WgIP, p.Status, p.Labels, p.CreatedAt,
	)
	return err
}

func ListPeers(db *sql.DB) ([]Peer, error) {
	rows, err := db.Query(
		`SELECT id, user_id, name, public_key, private_key_enc, mode, wg_ip, status, labels, created_at
		 FROM peers ORDER BY created_at DESC`,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var peers []Peer
	for rows.Next() {
		var p Peer
		if err := rows.Scan(&p.ID, &p.UserID, &p.Name, &p.PublicKey, &p.PrivateKeyEnc, &p.Mode, &p.WgIP, &p.Status, &p.Labels, &p.CreatedAt); err != nil {
			return nil, err
		}
		peers = append(peers, p)
	}
	return peers, rows.Err()
}

func GetPeer(db *sql.DB, id string) (Peer, error) {
	row := db.QueryRow(
		`SELECT id, user_id, name, public_key, private_key_enc, mode, wg_ip, status, labels, created_at
		 FROM peers WHERE id = ?`, id,
	)
	var p Peer
	if err := row.Scan(&p.ID, &p.UserID, &p.Name, &p.PublicKey, &p.PrivateKeyEnc, &p.Mode, &p.WgIP, &p.Status, &p.Labels, &p.CreatedAt); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return Peer{}, ErrNotFound
		}
		return Peer{}, err
	}
	return p, nil
}

func UpdatePeerLabels(db *sql.DB, id, labels string) error {
	_, err := db.Exec(`UPDATE peers SET labels = ? WHERE id = ?`, labels, id)
	return err
}

func DeletePeer(db *sql.DB, id string) error {
	_, err := db.Exec(`DELETE FROM peers WHERE id = ?`, id)
	return err
}

func UpdatePeerStatus(db *sql.DB, id, status string) error {
	_, err := db.Exec(`UPDATE peers SET status = ? WHERE id = ?`, status, id)
	return err
}

// --- Settings ---

func GetSetting(db *sql.DB, key string) (string, error) {
	var value string
	err := db.QueryRow(`SELECT value FROM settings WHERE key = ?`, key).Scan(&value)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return "", ErrNotFound
		}
		return "", err
	}
	return value, nil
}

func SetSetting(db *sql.DB, key, value string) error {
	_, err := db.Exec(
		`INSERT INTO settings (key, value) VALUES (?, ?)
		 ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
		key, value,
	)
	return err
}
