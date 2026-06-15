-- Migration to v1.8.0
-- Add invite_tokens table for user self-registration via invite links

CREATE TABLE invite_tokens (
    token CHAR(36) NOT NULL PRIMARY KEY,
    created_by CHAR(36) NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expires_at DATETIME NOT NULL,
    used_at DATETIME NULL DEFAULT NULL,
    CONSTRAINT fk_invite_tokens_user FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
);
