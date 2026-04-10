package api

import (
	"database/sql"
	"encoding/json"
	"net/http"

	"github.com/google/uuid"
	"github.com/kedar/wg-admin/auth"
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

func (h *Handler) ListPeers(w http.ResponseWriter, r *http.Request)     { writeJSON(w, 200, []any{}) }
func (h *Handler) CreatePeer(w http.ResponseWriter, r *http.Request)    { stub(w, r) }
func (h *Handler) DeletePeer(w http.ResponseWriter, r *http.Request)    { stub(w, r) }
func (h *Handler) ListRequests(w http.ResponseWriter, r *http.Request)  { writeJSON(w, 200, []any{}) }
func (h *Handler) SubmitRequest(w http.ResponseWriter, r *http.Request) { stub(w, r) }
func (h *Handler) UpdateRequest(w http.ResponseWriter, r *http.Request) { stub(w, r) }
func (h *Handler) GetFirewall(w http.ResponseWriter, r *http.Request)   { writeJSON(w, 200, []any{}) }
func (h *Handler) PutFirewall(w http.ResponseWriter, r *http.Request)   { stub(w, r) }
func (h *Handler) GetStats(w http.ResponseWriter, r *http.Request)      { writeJSON(w, 200, []any{}) }
func (h *Handler) GetHealth(w http.ResponseWriter, r *http.Request)     { writeJSON(w, 200, map[string]any{"up": true}) }
func (h *Handler) GetSettings(w http.ResponseWriter, r *http.Request)   { writeJSON(w, 200, map[string]any{}) }
func (h *Handler) PutSettings(w http.ResponseWriter, r *http.Request)   { stub(w, r) }
