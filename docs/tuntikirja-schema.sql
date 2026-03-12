-- Tuntikirja (lesson log) table
-- Add this to the same D1 database used by the guestbook
CREATE TABLE IF NOT EXISTS tuntikirja (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT,
    horse TEXT NOT NULL,
    lesson_type TEXT NOT NULL,
    message TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_tuntikirja_created ON tuntikirja(created_at DESC);
