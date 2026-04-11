package api_test

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/kedar/wg-admin/api"
	"github.com/kedar/wg-admin/auth"
	"github.com/kedar/wg-admin/db"
	"github.com/kedar/wg-admin/wg"
)

// testEnv holds a fully wired test server with real DB and crypto.
type testEnv struct {
	server *httptest.Server
	db     *db.TestDB
	cookie string // session cookie for authenticated requests
}

func setup(t *testing.T) *testEnv {
	t.Helper()

	database := db.OpenTestDB(t)

	wgSvc := wg.New(wg.Config{
		Interface: "wg-test",
		Subnet:    "10.99.0.0/24",
		Port:      51820,
		Endpoint:  "vpn.test.local",
		DNS:       "1.1.1.1",
		DryRun:    true,
		SecretKey: "test-secret-key-for-encryption",
	})

	// Bootstrap server keys so CreatePeer can look them up.
	serverPriv, _ := wgSvc.GenKey()
	serverPub, _ := wgSvc.PubKey(serverPriv)
	db.SetSetting(database.DB, "wg_server_public_key", serverPub)

	authStore := auth.NewStore(database.DB)
	h := &api.Handler{DB: database.DB, Auth: authStore, WG: wgSvc}
	router := api.NewRouter(h)
	server := httptest.NewServer(router)
	t.Cleanup(server.Close)

	env := &testEnv{server: server, db: database}

	// Create admin user and get a session cookie.
	env.setupAdmin(t, "admin", "testpassword123")
	return env
}

func (e *testEnv) setupAdmin(t *testing.T, username, password string) {
	t.Helper()
	// Use the setup endpoint.
	resp := e.post(t, "/api/system/setup", fmt.Sprintf(`{"username":%q,"password":%q}`, username, password))
	if resp.StatusCode != http.StatusCreated {
		t.Fatalf("setup admin: got %d", resp.StatusCode)
	}
	resp.Body.Close()

	// Login to get session cookie.
	resp = e.post(t, "/api/auth/login", fmt.Sprintf(`{"username":%q,"password":%q}`, username, password))
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("login: got %d", resp.StatusCode)
	}
	resp.Body.Close()
	for _, c := range resp.Cookies() {
		if c.Name == "session" {
			e.cookie = c.Value
			return
		}
	}
	t.Fatal("no session cookie returned")
}

func (e *testEnv) get(t *testing.T, path string) *http.Response {
	t.Helper()
	req, _ := http.NewRequest("GET", e.server.URL+path, nil)
	if e.cookie != "" {
		req.AddCookie(&http.Cookie{Name: "session", Value: e.cookie})
	}
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatalf("GET %s: %v", path, err)
	}
	return resp
}

func (e *testEnv) post(t *testing.T, path, body string) *http.Response {
	t.Helper()
	req, _ := http.NewRequest("POST", e.server.URL+path, strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	if e.cookie != "" {
		req.AddCookie(&http.Cookie{Name: "session", Value: e.cookie})
	}
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatalf("POST %s: %v", path, err)
	}
	return resp
}

func (e *testEnv) delete(t *testing.T, path string) *http.Response {
	t.Helper()
	req, _ := http.NewRequest("DELETE", e.server.URL+path, nil)
	if e.cookie != "" {
		req.AddCookie(&http.Cookie{Name: "session", Value: e.cookie})
	}
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatalf("DELETE %s: %v", path, err)
	}
	return resp
}

func (e *testEnv) patch(t *testing.T, path, body string) *http.Response {
	t.Helper()
	req, _ := http.NewRequest("PATCH", e.server.URL+path, strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	if e.cookie != "" {
		req.AddCookie(&http.Cookie{Name: "session", Value: e.cookie})
	}
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatalf("PATCH %s: %v", path, err)
	}
	return resp
}

func readJSON(t *testing.T, resp *http.Response) map[string]any {
	t.Helper()
	defer resp.Body.Close()
	data, _ := io.ReadAll(resp.Body)
	var m map[string]any
	if err := json.Unmarshal(data, &m); err != nil {
		t.Fatalf("unmarshal: %v\nbody: %s", err, data)
	}
	return m
}

func readJSONArray(t *testing.T, resp *http.Response) []any {
	t.Helper()
	defer resp.Body.Close()
	data, _ := io.ReadAll(resp.Body)
	var a []any
	if err := json.Unmarshal(data, &a); err != nil {
		t.Fatalf("unmarshal array: %v\nbody: %s", err, data)
	}
	return a
}

// --- Simple mode tests ---

func TestCreateSimpleTunnel(t *testing.T) {
	env := setup(t)

	resp := env.post(t, "/api/peers", `{"name":"laptop"}`)
	if resp.StatusCode != http.StatusCreated {
		body, _ := io.ReadAll(resp.Body)
		resp.Body.Close()
		t.Fatalf("create simple: got %d: %s", resp.StatusCode, body)
	}
	m := readJSON(t, resp)

	tunnel := m["tunnel"].(map[string]any)
	if tunnel["name"] != "laptop" {
		t.Errorf("name = %v, want laptop", tunnel["name"])
	}
	if tunnel["mode"] != "simple" {
		t.Errorf("mode = %v, want simple", tunnel["mode"])
	}
	if tunnel["wgIp"] != "10.99.0.2" {
		t.Errorf("wgIp = %v, want 10.99.0.2", tunnel["wgIp"])
	}
	if tunnel["status"] != "active" {
		t.Errorf("status = %v, want active", tunnel["status"])
	}

	config, ok := m["config"].(string)
	if !ok || config == "" {
		t.Fatal("simple mode should return config string")
	}
	if !strings.Contains(config, "PrivateKey") {
		t.Error("config missing PrivateKey")
	}
	if !strings.Contains(config, "10.99.0.2/32") {
		t.Error("config missing assigned IP")
	}
	if _, exists := m["serverInfo"]; exists {
		t.Error("simple mode should not return serverInfo")
	}
}

func TestCreateSecureTunnel(t *testing.T) {
	env := setup(t)

	// Generate a valid WireGuard key for the client.
	wgSvc := wg.New(wg.Config{DryRun: true})
	clientPriv, _ := wgSvc.GenKey()
	clientPub, _ := wgSvc.PubKey(clientPriv)

	body := fmt.Sprintf(`{"name":"phone","mode":"secure","publicKey":%q}`, clientPub)
	resp := env.post(t, "/api/peers", body)
	if resp.StatusCode != http.StatusCreated {
		b, _ := io.ReadAll(resp.Body)
		resp.Body.Close()
		t.Fatalf("create secure: got %d: %s", resp.StatusCode, b)
	}
	m := readJSON(t, resp)

	tunnel := m["tunnel"].(map[string]any)
	if tunnel["mode"] != "secure" {
		t.Errorf("mode = %v, want secure", tunnel["mode"])
	}
	if tunnel["publicKey"] != clientPub {
		t.Errorf("publicKey = %v, want %v", tunnel["publicKey"], clientPub)
	}

	if _, exists := m["config"]; exists {
		t.Error("secure mode should not return config")
	}

	serverInfo, ok := m["serverInfo"].(map[string]any)
	if !ok {
		t.Fatal("secure mode should return serverInfo")
	}
	if serverInfo["serverPublicKey"] == "" {
		t.Error("serverInfo missing serverPublicKey")
	}
	if serverInfo["endpoint"] != "vpn.test.local:51820" {
		t.Errorf("endpoint = %v, want vpn.test.local:51820", serverInfo["endpoint"])
	}
	if serverInfo["assignedIp"] != "10.99.0.2/32" {
		t.Errorf("assignedIp = %v, want 10.99.0.2/32", serverInfo["assignedIp"])
	}
	if serverInfo["dns"] != "1.1.1.1" {
		t.Errorf("dns = %v, want 1.1.1.1", serverInfo["dns"])
	}
}

func TestSecureTunnelRequiresPublicKey(t *testing.T) {
	env := setup(t)

	resp := env.post(t, "/api/peers", `{"name":"phone","mode":"secure"}`)
	if resp.StatusCode != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", resp.StatusCode)
	}
	resp.Body.Close()
}

func TestSecureTunnelRejectsInvalidKey(t *testing.T) {
	env := setup(t)

	resp := env.post(t, "/api/peers", `{"name":"phone","mode":"secure","publicKey":"not-a-valid-key"}`)
	if resp.StatusCode != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", resp.StatusCode)
	}
	resp.Body.Close()
}

func TestInvalidModeRejected(t *testing.T) {
	env := setup(t)

	resp := env.post(t, "/api/peers", `{"name":"x","mode":"bogus"}`)
	if resp.StatusCode != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", resp.StatusCode)
	}
	resp.Body.Close()
}

// --- List, toggle, delete ---

func TestListPeers(t *testing.T) {
	env := setup(t)

	// Create two tunnels.
	resp := env.post(t, "/api/peers", `{"name":"peer1"}`)
	resp.Body.Close()
	resp = env.post(t, "/api/peers", `{"name":"peer2"}`)
	resp.Body.Close()

	resp = env.get(t, "/api/peers")
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("list: got %d", resp.StatusCode)
	}
	peers := readJSONArray(t, resp)
	if len(peers) != 2 {
		t.Fatalf("expected 2 peers, got %d", len(peers))
	}
}

func TestTogglePeer(t *testing.T) {
	env := setup(t)

	resp := env.post(t, "/api/peers", `{"name":"toggle-me"}`)
	m := readJSON(t, resp)
	id := m["tunnel"].(map[string]any)["id"].(string)

	// Toggle to disabled.
	resp = env.patch(t, fmt.Sprintf("/api/peers/%s/toggle", id), "")
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("toggle: got %d", resp.StatusCode)
	}
	toggled := readJSON(t, resp)
	if toggled["status"] != "disabled" {
		t.Errorf("status = %v, want disabled", toggled["status"])
	}

	// Toggle back to active.
	resp = env.patch(t, fmt.Sprintf("/api/peers/%s/toggle", id), "")
	toggled = readJSON(t, resp)
	if toggled["status"] != "active" {
		t.Errorf("status = %v, want active", toggled["status"])
	}
}

func TestDeletePeer(t *testing.T) {
	env := setup(t)

	resp := env.post(t, "/api/peers", `{"name":"delete-me"}`)
	m := readJSON(t, resp)
	id := m["tunnel"].(map[string]any)["id"].(string)

	resp = env.delete(t, fmt.Sprintf("/api/peers/%s", id))
	if resp.StatusCode != http.StatusNoContent {
		t.Fatalf("delete: got %d", resp.StatusCode)
	}
	resp.Body.Close()

	// Verify it's gone.
	resp = env.get(t, "/api/peers")
	peers := readJSONArray(t, resp)
	if len(peers) != 0 {
		t.Errorf("expected 0 peers after delete, got %d", len(peers))
	}
}

func TestDeleteNotFound(t *testing.T) {
	env := setup(t)

	resp := env.delete(t, "/api/peers/nonexistent-id")
	if resp.StatusCode != http.StatusNotFound {
		t.Errorf("expected 404, got %d", resp.StatusCode)
	}
	resp.Body.Close()
}

// --- Config retrieval ---

func TestGetConfigSimpleMode(t *testing.T) {
	env := setup(t)

	resp := env.post(t, "/api/peers", `{"name":"cfg-test"}`)
	m := readJSON(t, resp)
	id := m["tunnel"].(map[string]any)["id"].(string)

	resp = env.get(t, fmt.Sprintf("/api/peers/%s/config", id))
	if resp.StatusCode != http.StatusOK {
		b, _ := io.ReadAll(resp.Body)
		resp.Body.Close()
		t.Fatalf("get config: got %d: %s", resp.StatusCode, b)
	}
	cfg := readJSON(t, resp)
	config := cfg["config"].(string)
	if !strings.Contains(config, "PrivateKey") {
		t.Error("config missing PrivateKey")
	}
	if !strings.Contains(config, "Endpoint = vpn.test.local:51820") {
		t.Error("config missing correct endpoint")
	}
}

func TestGetConfigSecureModeReturnsError(t *testing.T) {
	env := setup(t)

	wgSvc := wg.New(wg.Config{DryRun: true})
	priv, _ := wgSvc.GenKey()
	pub, _ := wgSvc.PubKey(priv)

	resp := env.post(t, "/api/peers", fmt.Sprintf(`{"name":"sec","mode":"secure","publicKey":%q}`, pub))
	m := readJSON(t, resp)
	id := m["tunnel"].(map[string]any)["id"].(string)

	resp = env.get(t, fmt.Sprintf("/api/peers/%s/config", id))
	if resp.StatusCode != http.StatusBadRequest {
		t.Errorf("expected 400 for secure mode config, got %d", resp.StatusCode)
	}
	resp.Body.Close()
}

// --- IP allocation ---

func TestIPAllocationSequential(t *testing.T) {
	env := setup(t)

	var ips []string
	for i := 0; i < 5; i++ {
		resp := env.post(t, "/api/peers", fmt.Sprintf(`{"name":"ip-test-%d"}`, i))
		if resp.StatusCode != http.StatusCreated {
			t.Fatalf("create %d: got %d", i, resp.StatusCode)
		}
		m := readJSON(t, resp)
		ip := m["tunnel"].(map[string]any)["wgIp"].(string)
		ips = append(ips, ip)
	}

	expected := []string{"10.99.0.2", "10.99.0.3", "10.99.0.4", "10.99.0.5", "10.99.0.6"}
	for i, ip := range ips {
		if ip != expected[i] {
			t.Errorf("ip[%d] = %v, want %v", i, ip, expected[i])
		}
	}
}

func TestIPAllocationFillsGaps(t *testing.T) {
	env := setup(t)

	// Create 3 peers.
	var ids []string
	for i := 0; i < 3; i++ {
		resp := env.post(t, "/api/peers", fmt.Sprintf(`{"name":"gap-%d"}`, i))
		m := readJSON(t, resp)
		ids = append(ids, m["tunnel"].(map[string]any)["id"].(string))
	}

	// Delete the middle one (10.99.0.3).
	resp := env.delete(t, fmt.Sprintf("/api/peers/%s", ids[1]))
	resp.Body.Close()

	// Next allocation should fill the gap.
	resp = env.post(t, "/api/peers", `{"name":"fill-gap"}`)
	m := readJSON(t, resp)
	ip := m["tunnel"].(map[string]any)["wgIp"].(string)
	if ip != "10.99.0.3" {
		t.Errorf("expected gap-fill at 10.99.0.3, got %v", ip)
	}
}

// --- Labels ---

func TestCreateWithLabels(t *testing.T) {
	env := setup(t)

	resp := env.post(t, "/api/peers", `{"name":"labeled","labels":["mobile","dev"]}`)
	if resp.StatusCode != http.StatusCreated {
		t.Fatalf("create: got %d", resp.StatusCode)
	}
	m := readJSON(t, resp)
	labels := m["tunnel"].(map[string]any)["labels"].([]any)
	if len(labels) != 2 {
		t.Fatalf("expected 2 labels, got %d", len(labels))
	}

	// Labels should also appear in list.
	resp = env.get(t, "/api/peers")
	peers := readJSONArray(t, resp)
	peer := peers[0].(map[string]any)
	peerLabels := peer["labels"].([]any)
	if len(peerLabels) != 2 {
		t.Errorf("list: expected 2 labels, got %d", len(peerLabels))
	}
}

// --- Auth ---

func TestUnauthenticatedAccessBlocked(t *testing.T) {
	env := setup(t)
	savedCookie := env.cookie
	env.cookie = ""

	resp := env.get(t, "/api/peers")
	if resp.StatusCode != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d", resp.StatusCode)
	}
	resp.Body.Close()

	env.cookie = savedCookie
}

func TestSetupOnlyOnce(t *testing.T) {
	env := setup(t)

	resp := env.post(t, "/api/system/setup", `{"username":"hacker","password":"longpassword"}`)
	if resp.StatusCode != http.StatusForbidden {
		t.Errorf("expected 403 for duplicate setup, got %d", resp.StatusCode)
	}
	resp.Body.Close()
}

// --- Mixed mode ---

func TestMixedModeCoexistence(t *testing.T) {
	env := setup(t)

	wgSvc := wg.New(wg.Config{DryRun: true})
	priv, _ := wgSvc.GenKey()
	pub, _ := wgSvc.PubKey(priv)

	// Create one of each mode.
	resp := env.post(t, "/api/peers", `{"name":"simple-peer"}`)
	if resp.StatusCode != http.StatusCreated {
		t.Fatalf("simple: got %d", resp.StatusCode)
	}
	resp.Body.Close()

	resp = env.post(t, "/api/peers", fmt.Sprintf(`{"name":"secure-peer","mode":"secure","publicKey":%q}`, pub))
	if resp.StatusCode != http.StatusCreated {
		t.Fatalf("secure: got %d", resp.StatusCode)
	}
	resp.Body.Close()

	// List should show both.
	resp = env.get(t, "/api/peers")
	peers := readJSONArray(t, resp)
	if len(peers) != 2 {
		t.Fatalf("expected 2 peers, got %d", len(peers))
	}

	modes := map[string]bool{}
	for _, p := range peers {
		peer := p.(map[string]any)
		modes[peer["mode"].(string)] = true
	}
	if !modes["simple"] || !modes["secure"] {
		t.Errorf("expected both modes, got %v", modes)
	}
}
