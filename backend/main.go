package main

import (
	"log"
	"net/http"
	"os"

	"github.com/kedar/wg-admin/api"
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

	h := &api.Handler{}
	router := api.NewRouter(h)

	log.Printf("wg-admin listening on :%s", port)
	if err := http.ListenAndServe(":"+port, router); err != nil {
		log.Fatalf("server: %v", err)
	}
}
