package api

import (
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/kedar/wg-admin/auth"
	"github.com/kedar/wg-admin/crypto"
	"github.com/kedar/wg-admin/db"
	"github.com/kedar/wg-admin/wg"
)

// dummyHash is used for constant-time comparison when a user is not found,
// preventing timing attacks that could reveal valid usernames.
var dummyHash, _ = auth.HashPassword("dummy-password")

type Handler struct {
	DB   *sql.DB
	Auth *auth.Store
	WG   *wg.Service
}

func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(v)
}

func stub(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusNotImplemented, map[string]string{"status": "not implemented"})
}

// POST /api/auth/login
func (h *Handler) Login(w http.ResponseWriter, r *http.Request) {
	body, ok := decode[struct {
		Username string `json:"username" validate:"required,max=255"`
		Password string `json:"password" validate:"required"`
	}](w, r)
	if !ok {
		return
	}

	user, err := db.GetUserByUsername(h.DB, body.Username)
	if err != nil {
		// Use constant-time comparison even on not-found to avoid timing attacks
		auth.CheckPassword(dummyHash, body.Password)
		http.Error(w, "invalid credentials", http.StatusUnauthorized)
		return
	}

	if !auth.CheckPassword(user.PasswordHash, body.Password) {
		http.Error(w, "invalid credentials", http.StatusUnauthorized)
		return
	}

	token, err := h.Auth.Create(user.ID, user.Username, user.Role)
	if err != nil {
		http.Error(w, "internal error", http.StatusInternalServerError)
		return
	}

	auth.SetCookie(w, token)
	writeJSON(w, http.StatusOK, map[string]string{
		"id":       user.ID,
		"username": user.Username,
		"role":     user.Role,
	})
}

// POST /api/auth/logout
func (h *Handler) Logout(w http.ResponseWriter, r *http.Request) {
	cookie, err := r.Cookie("session")
	if err == nil {
		h.Auth.Delete(cookie.Value)
	}
	auth.ClearCookie(w)
	w.WriteHeader(http.StatusNoContent)
}

// GET /api/auth/me
func (h *Handler) Me(w http.ResponseWriter, r *http.Request) {
	sess := r.Context().Value(auth.SessionKey).(db.Session)
	writeJSON(w, http.StatusOK, map[string]string{
		"id":       sess.UserID,
		"username": sess.Username,
		"role":     sess.Role,
	})
}

// GET /api/system/setup
func (h *Handler) SetupStatus(w http.ResponseWriter, r *http.Request) {
	exists, err := db.AdminExists(h.DB)
	if err != nil {
		http.Error(w, "internal error", http.StatusInternalServerError)
		return
	}
	writeJSON(w, http.StatusOK, map[string]bool{"needsSetup": !exists})
}

// POST /api/system/setup — only works if no admin exists yet
func (h *Handler) SetupAdmin(w http.ResponseWriter, r *http.Request) {
	exists, err := db.AdminExists(h.DB)
	if err != nil {
		http.Error(w, "internal error", http.StatusInternalServerError)
		return
	}
	if exists {
		http.Error(w, "already configured", http.StatusForbidden)
		return
	}

	body, ok := decode[struct {
		Username string `json:"username" validate:"required,max=255"`
		Password string `json:"password" validate:"required,min=8"`
	}](w, r)
	if !ok {
		return
	}

	hash, err := auth.HashPassword(body.Password)
	if err != nil {
		http.Error(w, "internal error", http.StatusInternalServerError)
		return
	}

	id := uuid.New().String()
	if err := db.CreateFirstAdmin(h.DB, id, body.Username, hash); err != nil {
		http.Error(w, "already configured", http.StatusForbidden)
		return
	}

	w.WriteHeader(http.StatusCreated)
}

// GET /api/peers
func (h *Handler) ListPeers(w http.ResponseWriter, r *http.Request) {
	peers, err := db.ListPeers(h.DB)
	if err != nil {
		http.Error(w, "internal error", http.StatusInternalServerError)
		log.Printf("list peers: %v", err)
		return
	}

	// Overlay live WireGuard stats
	dump, err := h.WG.ShowDump()
	if err != nil {
		log.Printf("wg show dump: %v", err)
	}
	liveStats := make(map[string]wg.DumpLine)
	for _, d := range dump {
		liveStats[d.PublicKey] = d
	}

	type peerResponse struct {
		ID              string  `json:"id"`
		Name            string  `json:"name"`
		PublicKey       string  `json:"publicKey"`
		Mode            string  `json:"mode"`
		WgIP            string  `json:"wgIp"`
		Status          string  `json:"status"`
		UserID          string  `json:"userId"`
		LatestHandshake *int64  `json:"latestHandshake,omitempty"`
		TransferRx      *int64  `json:"transferRx,omitempty"`
		TransferTx      *int64  `json:"transferTx,omitempty"`
		CreatedAt       string  `json:"createdAt"`
	}

	result := make([]peerResponse, 0, len(peers))
	for _, p := range peers {
		pr := peerResponse{
			ID:        p.ID,
			Name:      p.Name,
			PublicKey: p.PublicKey,
			Mode:      p.Mode,
			WgIP:      p.WgIP,
			Status:    p.Status,
			UserID:    p.UserID,
			CreatedAt: p.CreatedAt.Format(time.RFC3339),
		}
		if live, ok := liveStats[p.PublicKey]; ok {
			pr.LatestHandshake = &live.LatestHandshake
			pr.TransferRx = &live.TransferRx
			pr.TransferTx = &live.TransferTx
		}
		result = append(result, pr)
	}
	writeJSON(w, http.StatusOK, result)
}

// POST /api/peers
func (h *Handler) CreatePeer(w http.ResponseWriter, r *http.Request) {
	body, ok := decode[struct {
		Name string `json:"name" validate:"required,max=255"`
	}](w, r)
	if !ok {
		return
	}

	sess := r.Context().Value(auth.SessionKey).(db.Session)

	// Generate keypair
	privKey, err := h.WG.GenKey()
	if err != nil {
		http.Error(w, "key generation failed", http.StatusInternalServerError)
		log.Printf("genkey: %v", err)
		return
	}
	pubKey, err := h.WG.PubKey(privKey)
	if err != nil {
		http.Error(w, "key derivation failed", http.StatusInternalServerError)
		log.Printf("pubkey: %v", err)
		return
	}

	// Allocate IP
	ip, err := h.WG.AllocateIP(h.DB)
	if err != nil {
		if errors.Is(err, wg.ErrSubnetFull) {
			http.Error(w, "no available IPs in subnet", http.StatusConflict)
		} else {
			http.Error(w, "IP allocation failed", http.StatusInternalServerError)
			log.Printf("allocate ip: %v", err)
		}
		return
	}

	// Encrypt private key for storage
	encKey, err := crypto.Encrypt(privKey, h.WG.Cfg.SecretKey)
	if err != nil {
		http.Error(w, "encryption failed", http.StatusInternalServerError)
		log.Printf("encrypt: %v", err)
		return
	}

	peer := db.Peer{
		ID:            uuid.New().String(),
		UserID:        sess.UserID,
		Name:          body.Name,
		PublicKey:     pubKey,
		PrivateKeyEnc: &encKey,
		Mode:          "simple",
		WgIP:          ip,
		Status:        "active",
		CreatedAt:     time.Now().UTC(),
	}

	if err := db.CreatePeer(h.DB, peer); err != nil {
		http.Error(w, "failed to save peer", http.StatusInternalServerError)
		log.Printf("create peer: %v", err)
		return
	}

	// Add to live WireGuard interface
	if err := h.WG.SetPeer(pubKey, ip+"/32"); err != nil {
		log.Printf("wg set peer: %v", err)
		// Peer is saved but not live — log and continue
	}

	// Build client config
	serverPubKey, err := db.GetSetting(h.DB, "wg_server_public_key")
	if err != nil {
		http.Error(w, "server not configured", http.StatusInternalServerError)
		log.Printf("get server pubkey: %v", err)
		return
	}

	clientCfg := wg.ClientConfig{
		PrivateKey:   privKey,
		Address:      ip + "/32",
		DNS:          h.WG.Cfg.DNS,
		ServerPubKey: serverPubKey,
		Endpoint:     fmt.Sprintf("%s:%d", h.WG.Cfg.Endpoint, h.WG.Cfg.Port),
	}

	writeJSON(w, http.StatusCreated, map[string]any{
		"tunnel": map[string]any{
			"id":        peer.ID,
			"name":      peer.Name,
			"publicKey": peer.PublicKey,
			"mode":      peer.Mode,
			"wgIp":      peer.WgIP,
			"status":    peer.Status,
			"userId":    peer.UserID,
			"createdAt": peer.CreatedAt.Format(time.RFC3339),
		},
		"config": clientCfg.String(),
	})
}

// DELETE /api/peers/{id}
func (h *Handler) DeletePeer(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")

	peer, err := db.GetPeer(h.DB, id)
	if err != nil {
		if errors.Is(err, db.ErrNotFound) {
			http.Error(w, "peer not found", http.StatusNotFound)
		} else {
			http.Error(w, "internal error", http.StatusInternalServerError)
			log.Printf("get peer: %v", err)
		}
		return
	}

	if err := h.WG.RemovePeer(peer.PublicKey); err != nil {
		log.Printf("wg remove peer: %v", err)
	}

	if err := db.DeletePeer(h.DB, id); err != nil {
		http.Error(w, "internal error", http.StatusInternalServerError)
		log.Printf("delete peer: %v", err)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

// PATCH /api/peers/{id}/toggle
func (h *Handler) TogglePeer(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")

	peer, err := db.GetPeer(h.DB, id)
	if err != nil {
		if errors.Is(err, db.ErrNotFound) {
			http.Error(w, "peer not found", http.StatusNotFound)
		} else {
			http.Error(w, "internal error", http.StatusInternalServerError)
			log.Printf("get peer: %v", err)
		}
		return
	}

	var newStatus string
	if peer.Status == "active" {
		if err := h.WG.RemovePeer(peer.PublicKey); err != nil {
			log.Printf("wg remove peer: %v", err)
		}
		newStatus = "disabled"
	} else {
		if err := h.WG.SetPeer(peer.PublicKey, peer.WgIP+"/32"); err != nil {
			log.Printf("wg set peer: %v", err)
		}
		newStatus = "active"
	}

	if err := db.UpdatePeerStatus(h.DB, id, newStatus); err != nil {
		http.Error(w, "internal error", http.StatusInternalServerError)
		log.Printf("update peer status: %v", err)
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"id":        peer.ID,
		"name":      peer.Name,
		"publicKey": peer.PublicKey,
		"mode":      peer.Mode,
		"wgIp":      peer.WgIP,
		"status":    newStatus,
		"userId":    peer.UserID,
		"createdAt": peer.CreatedAt.Format(time.RFC3339),
	})
}
// GET /api/peers/{id}/config
func (h *Handler) GetPeerConfig(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")

	peer, err := db.GetPeer(h.DB, id)
	if err != nil {
		if errors.Is(err, db.ErrNotFound) {
			http.Error(w, "peer not found", http.StatusNotFound)
		} else {
			http.Error(w, "internal error", http.StatusInternalServerError)
			log.Printf("get peer: %v", err)
		}
		return
	}

	if peer.Mode != "simple" || peer.PrivateKeyEnc == nil {
		http.Error(w, "config only available for simple mode tunnels", http.StatusBadRequest)
		return
	}

	privKey, err := crypto.Decrypt(*peer.PrivateKeyEnc, h.WG.Cfg.SecretKey)
	if err != nil {
		http.Error(w, "decryption failed", http.StatusInternalServerError)
		log.Printf("decrypt private key: %v", err)
		return
	}

	serverPubKey, err := db.GetSetting(h.DB, "wg_server_public_key")
	if err != nil {
		http.Error(w, "server not configured", http.StatusInternalServerError)
		log.Printf("get server pubkey: %v", err)
		return
	}

	clientCfg := wg.ClientConfig{
		PrivateKey:   privKey,
		Address:      peer.WgIP + "/32",
		DNS:          h.WG.Cfg.DNS,
		ServerPubKey: serverPubKey,
		Endpoint:     fmt.Sprintf("%s:%d", h.WG.Cfg.Endpoint, h.WG.Cfg.Port),
	}

	writeJSON(w, http.StatusOK, map[string]string{
		"config": clientCfg.String(),
	})
}

func (h *Handler) ListRequests(w http.ResponseWriter, r *http.Request)  { writeJSON(w, 200, []any{}) }
func (h *Handler) SubmitRequest(w http.ResponseWriter, r *http.Request) { stub(w, r) }
func (h *Handler) UpdateRequest(w http.ResponseWriter, r *http.Request) { stub(w, r) }
func (h *Handler) GetFirewall(w http.ResponseWriter, r *http.Request)   { writeJSON(w, 200, []any{}) }
func (h *Handler) PutFirewall(w http.ResponseWriter, r *http.Request)   { stub(w, r) }
func (h *Handler) GetStats(w http.ResponseWriter, r *http.Request)      { writeJSON(w, 200, []any{}) }
func (h *Handler) GetHealth(w http.ResponseWriter, r *http.Request)     { writeJSON(w, 200, map[string]any{"up": true}) }
func (h *Handler) GetSettings(w http.ResponseWriter, r *http.Request)   { writeJSON(w, 200, map[string]any{}) }
func (h *Handler) PutSettings(w http.ResponseWriter, r *http.Request)   { stub(w, r) }
