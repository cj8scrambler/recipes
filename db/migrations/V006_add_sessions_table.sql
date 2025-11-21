-- Migration V006: Add session management support
-- Description: Adds sessions table for storing active user sessions for session-based authentication

-- ==== UPGRADE ====
CREATE TABLE sessions (
    session_id CHAR(36) PRIMARY KEY,
    user_id CHAR(36) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id),
    INDEX idx_expires_at (expires_at)
);

-- ==== DOWNGRADE ====
DROP TABLE IF EXISTS sessions;
