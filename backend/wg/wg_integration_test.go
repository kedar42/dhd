//go:build integration

package wg_test

import (
	"fmt"
	"os"
	"os/exec"
	"strings"
	"testing"

	"github.com/kedar/wg-admin/db"
	"github.com/kedar/wg-admin/wg"
)

const testIface = "wg-test0"
const testSubnet = "10.200.0.0/24"

func requireRoot(t *testing.T) {
	t.Helper()
	if os.Getuid() != 0 {
		t.Skip("skipping: requires root (run with sudo)")
	}
}

func requireWgTools(t *testing.T) {
	t.Helper()
	if _, err := exec.LookPath("wg"); err != nil {
		t.Skip("skipping: wireguard-tools not installed")
	}
}

// setupInterface creates a real WireGuard interface for testing.
// Returns a cleanup function that removes it.
func setupInterface(t *testing.T) {
	t.Helper()
	// Create the interface using ip link.
	if err := exec.Command("ip", "link", "add", testIface, "type", "wireguard").Run(); err != nil {
		t.Fatalf("create interface: %v", err)
	}
	// Assign an IP and bring it up.
	if err := exec.Command("ip", "addr", "add", "10.200.0.1/24", "dev", testIface).Run(); err != nil {
		exec.Command("ip", "link", "del", testIface).Run()
		t.Fatalf("assign addr: %v", err)
	}
	if err := exec.Command("ip", "link", "set", testIface, "up").Run(); err != nil {
		exec.Command("ip", "link", "del", testIface).Run()
		t.Fatalf("bring up: %v", err)
	}

	// Generate and set a private key for the interface.
	privKey, err := exec.Command("wg", "genkey").Output()
	if err != nil {
		exec.Command("ip", "link", "del", testIface).Run()
		t.Fatalf("genkey: %v", err)
	}
	setKey := exec.Command("wg", "set", testIface, "listen-port", "0",
		"private-key", "/dev/stdin")
	setKey.Stdin = strings.NewReader(strings.TrimSpace(string(privKey)))
	if err := setKey.Run(); err != nil {
		exec.Command("ip", "link", "del", testIface).Run()
		t.Fatalf("set key: %v", err)
	}

	t.Cleanup(func() {
		exec.Command("ip", "link", "del", testIface).Run()
	})
}

func newService() *wg.Service {
	return wg.New(wg.Config{
		Interface: testIface,
		Subnet:    testSubnet,
		Port:      51820,
		Endpoint:  "test.local",
		DNS:       "1.1.1.1",
		DryRun:    false,
		SecretKey: "integration-test-secret",
	})
}

// wgShowPeers returns the public keys of all peers on the test interface.
func wgShowPeers(t *testing.T) []string {
	t.Helper()
	out, err := exec.Command("wg", "show", testIface, "peers").Output()
	if err != nil {
		t.Fatalf("wg show peers: %v", err)
	}
	raw := strings.TrimSpace(string(out))
	if raw == "" {
		return nil
	}
	return strings.Split(raw, "\n")
}

func TestRealGenKeyAndPubKey(t *testing.T) {
	requireRoot(t)
	requireWgTools(t)

	svc := newService()

	priv, err := svc.GenKey()
	if err != nil {
		t.Fatalf("GenKey: %v", err)
	}
	if len(priv) != 44 {
		t.Errorf("private key length = %d, want 44", len(priv))
	}

	pub, err := svc.PubKey(priv)
	if err != nil {
		t.Fatalf("PubKey: %v", err)
	}
	if len(pub) != 44 {
		t.Errorf("public key length = %d, want 44", len(pub))
	}
	if pub == priv {
		t.Error("public key should differ from private key")
	}

	// Deriving again should be deterministic.
	pub2, _ := svc.PubKey(priv)
	if pub2 != pub {
		t.Error("PubKey should be deterministic")
	}
}

func TestRealSetAndRemovePeer(t *testing.T) {
	requireRoot(t)
	requireWgTools(t)
	setupInterface(t)

	svc := newService()

	// Generate a peer key.
	priv, _ := svc.GenKey()
	pub, _ := svc.PubKey(priv)

	// Add peer.
	if err := svc.SetPeer(pub, "10.200.0.2/32"); err != nil {
		t.Fatalf("SetPeer: %v", err)
	}

	peers := wgShowPeers(t)
	if len(peers) != 1 || peers[0] != pub {
		t.Fatalf("expected 1 peer %q, got %v", pub, peers)
	}

	// Remove peer.
	if err := svc.RemovePeer(pub); err != nil {
		t.Fatalf("RemovePeer: %v", err)
	}

	peers = wgShowPeers(t)
	if len(peers) != 0 {
		t.Errorf("expected 0 peers after remove, got %v", peers)
	}
}

func TestRealShowDump(t *testing.T) {
	requireRoot(t)
	requireWgTools(t)
	setupInterface(t)

	svc := newService()

	// Add a couple of peers.
	var pubKeys []string
	for i := 2; i <= 4; i++ {
		priv, _ := svc.GenKey()
		pub, _ := svc.PubKey(priv)
		pubKeys = append(pubKeys, pub)
		svc.SetPeer(pub, fmt.Sprintf("10.200.0.%d/32", i))
	}

	dump, err := svc.ShowDump()
	if err != nil {
		t.Fatalf("ShowDump: %v", err)
	}

	if len(dump) != 3 {
		t.Fatalf("expected 3 dump lines, got %d", len(dump))
	}

	dumpKeys := map[string]bool{}
	for _, d := range dump {
		dumpKeys[d.PublicKey] = true
		if d.AllowedIPs == "" {
			t.Errorf("peer %s has empty AllowedIPs", d.PublicKey[:8])
		}
	}
	for _, pk := range pubKeys {
		if !dumpKeys[pk] {
			t.Errorf("peer %s not found in dump", pk[:8])
		}
	}
}

func TestRealIPAllocation(t *testing.T) {
	requireRoot(t)
	requireWgTools(t)

	database := db.OpenTestDB(t)
	svc := newService()

	// Allocate several IPs.
	expected := []string{"10.200.0.2", "10.200.0.3", "10.200.0.4"}
	for i, want := range expected {
		ip, err := svc.AllocateIP(database.DB)
		if err != nil {
			t.Fatalf("allocate %d: %v", i, err)
		}
		if ip != want {
			t.Errorf("ip[%d] = %v, want %v", i, ip, want)
		}
		// Insert a peer row so the next allocation skips this IP.
		_, err = database.DB.Exec(
			`INSERT INTO peers (id, name, public_key, mode, wg_ip, status, created_at)
			 VALUES (?, ?, ?, 'simple', ?, 'active', datetime('now'))`,
			fmt.Sprintf("test-%d", i), fmt.Sprintf("peer-%d", i),
			fmt.Sprintf("fake-key-%d", i), ip,
		)
		if err != nil {
			t.Fatalf("insert peer: %v", err)
		}
	}
}

func TestRealMultiplePeers(t *testing.T) {
	requireRoot(t)
	requireWgTools(t)
	setupInterface(t)

	svc := newService()

	// Add 5 peers and verify all are present.
	var keys []string
	for i := 0; i < 5; i++ {
		priv, _ := svc.GenKey()
		pub, _ := svc.PubKey(priv)
		keys = append(keys, pub)
		if err := svc.SetPeer(pub, fmt.Sprintf("10.200.0.%d/32", i+2)); err != nil {
			t.Fatalf("SetPeer %d: %v", i, err)
		}
	}

	peers := wgShowPeers(t)
	if len(peers) != 5 {
		t.Fatalf("expected 5 peers, got %d", len(peers))
	}

	// Remove the middle peer.
	if err := svc.RemovePeer(keys[2]); err != nil {
		t.Fatalf("RemovePeer: %v", err)
	}

	peers = wgShowPeers(t)
	if len(peers) != 4 {
		t.Fatalf("expected 4 peers after removal, got %d", len(peers))
	}
	for _, p := range peers {
		if p == keys[2] {
			t.Error("removed peer still present")
		}
	}
}
