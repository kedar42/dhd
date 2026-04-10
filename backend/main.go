package main

import (
	"database/sql"
	"log"
	"net/http"
	"os"
	"strconv"
	"time"

	"github.com/kedar/wg-admin/api"
	"github.com/kedar/wg-admin/auth"
	"github.com/kedar/wg-admin/db"
	"github.com/kedar/wg-admin/wg"
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

	// WireGuard service
	wgPort, _ := strconv.Atoi(env("WG_PORT", "51820"))
	wgService := wg.New(wg.Config{
		Interface: env("WG_INTERFACE", "wg0"),
		Subnet:    env("WG_SUBNET", "10.8.0.0/24"),
		Port:      wgPort,
		Endpoint:  env("WG_ENDPOINT", "localhost"),
		DNS:       env("WG_DNS", "1.1.1.1"),
		DryRun:    env("WG_DRY_RUN", "0") == "1",
		SecretKey: env("SECRET_KEY", ""),
	})

	// Bootstrap server WireGuard keys on first run
	if err := bootstrapServerKeys(database, wgService); err != nil {
		log.Fatalf("bootstrap server keys: %v", err)
	}

	authStore := auth.NewStore(database)
	h := &api.Handler{DB: database, Auth: authStore, WG: wgService}
	router := api.NewRouter(h)

	log.Printf("wg-admin listening on :%s", port)
	if err := http.ListenAndServe(":"+port, router); err != nil {
		log.Fatalf("server: %v", err)
	}
}

// bootstrapServerKeys generates and stores WireGuard server keys if they don't exist yet.
func bootstrapServerKeys(database *sql.DB, svc *wg.Service) error {
	_, err := db.GetSetting(database, "wg_server_public_key")
	if err == nil {
		return nil // keys already exist
	}

	log.Println("generating WireGuard server keypair...")
	privKey, err := svc.GenKey()
	if err != nil {
		return err
	}
	pubKey, err := svc.PubKey(privKey)
	if err != nil {
		return err
	}

	if err := db.SetSetting(database, "wg_server_private_key", privKey); err != nil {
		return err
	}
	if err := db.SetSetting(database, "wg_server_public_key", pubKey); err != nil {
		return err
	}

	log.Printf("server public key: %s", pubKey)
	return nil
}
