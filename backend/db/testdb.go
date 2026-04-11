package db

import (
	"database/sql"
	"os"
	"path/filepath"
	"testing"
)

// TestDB wraps a *sql.DB that auto-cleans up after the test.
type TestDB struct {
	DB   *sql.DB
	Path string
}

// OpenTestDB creates a temporary SQLite database with the full schema.
func OpenTestDB(t *testing.T) *TestDB {
	t.Helper()
	dir := t.TempDir()
	path := filepath.Join(dir, "test.db")

	database, err := Open(path)
	if err != nil {
		t.Fatalf("open test db: %v", err)
	}
	t.Cleanup(func() {
		database.Close()
		os.Remove(path)
	})
	return &TestDB{DB: database, Path: path}
}
