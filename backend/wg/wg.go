package wg

import (
	"bytes"
	"crypto/rand"
	"encoding/base64"
	"fmt"
	"os/exec"
	"strconv"
	"strings"

	"golang.org/x/crypto/curve25519"
)

// Config holds WireGuard service configuration.
type Config struct {
	Interface string // e.g. "wg0"
	Subnet    string // e.g. "10.8.0.0/24"
	Port      int    // WireGuard listen port, e.g. 51820
	Endpoint  string // server public hostname/IP
	DNS       string // DNS for client configs
	DryRun    bool
	SecretKey string // for private key encryption
}

// DumpLine represents one peer line from `wg show <iface> dump`.
type DumpLine struct {
	PublicKey       string
	Endpoint        string
	AllowedIPs      string
	LatestHandshake int64
	TransferRx      int64
	TransferTx      int64
}

// Service wraps WireGuard CLI operations.
type Service struct {
	Cfg Config
}

// New creates a WireGuard service.
func New(cfg Config) *Service {
	return &Service{Cfg: cfg}
}

// GenKey generates a WireGuard private key.
func (s *Service) GenKey() (string, error) {
	if s.Cfg.DryRun {
		return generateKeyDryRun()
	}
	out, err := exec.Command("wg", "genkey").Output()
	if err != nil {
		return "", fmt.Errorf("wg genkey: %w", err)
	}
	return strings.TrimSpace(string(out)), nil
}

// PubKey derives the public key from a WireGuard private key.
func (s *Service) PubKey(privateKey string) (string, error) {
	if s.Cfg.DryRun {
		return pubKeyDryRun(privateKey)
	}
	cmd := exec.Command("wg", "pubkey")
	cmd.Stdin = strings.NewReader(privateKey)
	out, err := cmd.Output()
	if err != nil {
		return "", fmt.Errorf("wg pubkey: %w", err)
	}
	return strings.TrimSpace(string(out)), nil
}

// SetPeer adds or updates a peer on the live WireGuard interface.
func (s *Service) SetPeer(publicKey, allowedIPs string) error {
	if s.Cfg.DryRun {
		return nil
	}
	return exec.Command("wg", "set", s.Cfg.Interface,
		"peer", publicKey,
		"allowed-ips", allowedIPs,
	).Run()
}

// RemovePeer removes a peer from the live WireGuard interface.
func (s *Service) RemovePeer(publicKey string) error {
	if s.Cfg.DryRun {
		return nil
	}
	return exec.Command("wg", "set", s.Cfg.Interface,
		"peer", publicKey, "remove",
	).Run()
}

// ShowDump parses `wg show <iface> dump` and returns per-peer data.
// The first line (interface line) is skipped.
func (s *Service) ShowDump() ([]DumpLine, error) {
	if s.Cfg.DryRun {
		return nil, nil
	}
	out, err := exec.Command("wg", "show", s.Cfg.Interface, "dump").Output()
	if err != nil {
		return nil, fmt.Errorf("wg show dump: %w", err)
	}
	lines := strings.Split(strings.TrimSpace(string(out)), "\n")
	if len(lines) < 2 {
		return nil, nil
	}
	var peers []DumpLine
	for _, line := range lines[1:] {
		fields := strings.Split(line, "\t")
		if len(fields) < 8 {
			continue
		}
		handshake, _ := strconv.ParseInt(fields[4], 10, 64)
		rx, _ := strconv.ParseInt(fields[5], 10, 64)
		tx, _ := strconv.ParseInt(fields[6], 10, 64)
		peers = append(peers, DumpLine{
			PublicKey:       fields[0],
			Endpoint:        fields[2],
			AllowedIPs:      fields[3],
			LatestHandshake: handshake,
			TransferRx:      rx,
			TransferTx:      tx,
		})
	}
	return peers, nil
}

// generateKeyDryRun generates a realistic WireGuard private key without the wg CLI.
func generateKeyDryRun() (string, error) {
	var key [32]byte
	if _, err := rand.Read(key[:]); err != nil {
		return "", err
	}
	// Clamp to Curve25519 private key format
	key[0] &= 248
	key[31] &= 127
	key[31] |= 64
	return base64.StdEncoding.EncodeToString(key[:]), nil
}

// pubKeyDryRun derives a public key from a private key without the wg CLI.
func pubKeyDryRun(privateKey string) (string, error) {
	privBytes, err := base64.StdEncoding.DecodeString(privateKey)
	if err != nil {
		return "", fmt.Errorf("invalid private key encoding: %w", err)
	}
	if len(privBytes) != 32 {
		return "", fmt.Errorf("private key must be 32 bytes, got %d", len(privBytes))
	}
	var pub [32]byte
	priv := (*[32]byte)(privBytes)
	curve25519.ScalarBaseMult(&pub, priv)
	var buf bytes.Buffer
	encoder := base64.NewEncoder(base64.StdEncoding, &buf)
	encoder.Write(pub[:])
	encoder.Close()
	return buf.String(), nil
}
