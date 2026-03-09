CREATE TABLE IF NOT EXISTS chat_messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    room TEXT NOT NULL,
    name TEXT NOT NULL,
    message TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Create index for faster room-based lookups
CREATE INDEX IF NOT EXISTS idx_chat_room ON chat_messages(room, created_at);
