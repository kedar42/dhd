package auth

import (
	"context"
	"crypto/rand"
	"database/sql"
	"encoding/hex"
	"net/http"
	"time"

	"github.com/kedar/wg-admin/db"
	"golang.org/x/crypto/bcrypt"
)

const cookieName = "session"
const SessionTTL = 24 * time.Hour

type contextKey string

const SessionKey contextKey = "session"

type Store struct {
	db *sql.DB
}

func NewStore(database *sql.DB) *Store {
	return &Store{db: database}
}

func (s *Store) Create(userID, username, role string) (string, error) {
	b := make([]byte, 32)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	token := hex.EncodeToString(b)
	if err := db.CreateSession(s.db, token, userID, username, role, SessionTTL); err != nil {
		return "", err
	}
	return token, nil
}

func (s *Store) Get(token string) (db.Session, bool) {
	sess, err := db.GetSession(s.db, token)
	if err != nil {
		return db.Session{}, false
	}
	return sess, true
}

func (s *Store) Bump(token string) {
	// best-effort, ignore error
	db.BumpSession(s.db, token, SessionTTL)
}

func (s *Store) Delete(token string) error {
	return db.DeleteSession(s.db, token)
}

// Middleware validates the session cookie and injects the session into context.
// It also bumps the expiry (sliding window) on every authenticated request.
func (s *Store) Middleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		cookie, err := r.Cookie(cookieName)
		if err != nil {
			http.Error(w, "unauthorized", http.StatusUnauthorized)
			return
		}
		sess, ok := s.Get(cookie.Value)
		if !ok {
			ClearCookie(w)
			http.Error(w, "unauthorized", http.StatusUnauthorized)
			return
		}
		s.Bump(cookie.Value)
		ctx := context.WithValue(r.Context(), SessionKey, sess)
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

// AdminOnly requires the session role to be "admin". Must be used after Middleware.
func (s *Store) AdminOnly(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		sess, _ := r.Context().Value(SessionKey).(db.Session)
		if sess.Role != "admin" {
			http.Error(w, "forbidden", http.StatusForbidden)
			return
		}
		next.ServeHTTP(w, r)
	})
}

func SetCookie(w http.ResponseWriter, token string) {
	http.SetCookie(w, &http.Cookie{
		Name:     cookieName,
		Value:    token,
		Path:     "/",
		HttpOnly: true,
		SameSite: http.SameSiteStrictMode,
		MaxAge:   int(SessionTTL.Seconds()),
	})
}

func ClearCookie(w http.ResponseWriter) {
	http.SetCookie(w, &http.Cookie{Name: cookieName, Value: "", Path: "/", MaxAge: -1})
}

func HashPassword(p string) (string, error) {
	b, err := bcrypt.GenerateFromPassword([]byte(p), 12)
	return string(b), err
}

func CheckPassword(hash, password string) bool {
	return bcrypt.CompareHashAndPassword([]byte(hash), []byte(password)) == nil
}
