package api

import (
	"encoding/json"
	"net/http"
)

type Handler struct{}

func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(v)
}

func stub(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusNotImplemented, map[string]string{"status": "not implemented"})
}

func (h *Handler) Login(w http.ResponseWriter, r *http.Request)         { stub(w, r) }
func (h *Handler) Logout(w http.ResponseWriter, r *http.Request)        { stub(w, r) }
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
