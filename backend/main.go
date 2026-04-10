package main

import (
	"log"
	"net/http"
	"os"
	"time"

	"github.com/kedar/wg-admin/api"
	"github.com/kedar/wg-admin/auth"
	"github.com/kedar/wg-admin/db"
)

func env(key, def string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return def
}

func main() {
	port := env("PORT", "51821")
	dbPath := env("DB_PATH", "./wg-admin.db")

	database, err := db.Open(dbPath)
	if err != nil {
		log.Fatalf("open db: %v", err)
	}
	defer database.Close()

	// Periodically remove expired sessions
	go func() {
		t := time.NewTicker(time.Hour)
		defer t.Stop()
		for range t.C {
			if err := db.DeleteExpiredSessions(database); err != nil {
				log.Printf("cleanup sessions: %v", err)
			}
		}
	}()

	authStore := auth.NewStore(database)
	h := &api.Handler{DB: database, Auth: authStore}
	router := api.NewRouter(h)

	log.Printf("wg-admin listening on :%s", port)
	if err := http.ListenAndServe(":"+port, router); err != nil {
		log.Fatalf("server: %v", err)
	}
}
