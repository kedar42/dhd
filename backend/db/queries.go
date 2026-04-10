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
