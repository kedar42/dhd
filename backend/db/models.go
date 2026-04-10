package db

import "time"

type User struct {
	ID           string
	Username     string
	PasswordHash string
	Role         string
	CreatedAt    time.Time
}

type Session struct {
	Token     string
	UserID    string
	Username  string
	Role      string
	CreatedAt time.Time
	ExpiresAt time.Time
	LastSeen  time.Time
}

type Peer struct {
	ID            string
	UserID        string
	Name          string
	PublicKey     string
	PrivateKeyEnc *string // nil for secure mode peers
	Mode          string  // "simple" | "secure"
	WgIP          string
	Status        string // "active" | "disabled"
	CreatedAt     time.Time
}
