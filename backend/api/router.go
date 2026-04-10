package api

import (
	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
)

func NewRouter(h *Handler) *chi.Mux {
	r := chi.NewRouter()
	r.Use(middleware.Logger)
	r.Use(middleware.Recoverer)

	// Public
	r.Post("/api/auth/login", h.Login)
	r.Post("/api/auth/logout", h.Logout)
	r.Get("/api/health", h.GetHealth)
	r.Get("/api/system/setup", h.SetupStatus)
	r.Post("/api/system/setup", h.SetupAdmin)

	// Authenticated
	r.Group(func(r chi.Router) {
		r.Use(h.Auth.Middleware)

		r.Get("/api/auth/me", h.Me)

		r.Get("/api/peers", h.ListPeers)
		r.Post("/api/requests", h.SubmitRequest)
		r.Get("/api/stats/{peer_id}", h.GetStats)

		// Admin only
		r.Group(func(r chi.Router) {
			r.Use(h.Auth.AdminOnly)

			r.Post("/api/peers", h.CreatePeer)
			r.Delete("/api/peers/{id}", h.DeletePeer)

			r.Get("/api/requests", h.ListRequests)
			r.Put("/api/requests/{id}", h.UpdateRequest)

			r.Get("/api/firewall", h.GetFirewall)
			r.Put("/api/firewall", h.PutFirewall)

			r.Get("/api/settings", h.GetSettings)
			r.Put("/api/settings", h.PutSettings)
		})
	})

	return r
}
