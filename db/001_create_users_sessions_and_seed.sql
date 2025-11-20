-- Migration: Create users and sessions tables for authentication
-- This migration adds user authentication and session management to the recipes database
-- Run this migration on an existing database after the base schema

-- 1. Users Table
-- Stores user accounts with authentication and role information
CREATE TABLE users (
    id CHAR(36) PRIMARY KEY,  -- UUID stored as string
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('user', 'admin') NOT NULL DEFAULT 'user',
    settings JSON,  -- User preferences stored as JSON (e.g., {"unit": "metric"})
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_email (email)
);

-- 2. Sessions Table
-- Stores active user sessions for session-based authentication
CREATE TABLE sessions (
    session_id CHAR(36) PRIMARY KEY,  -- UUID stored as string
    user_id CHAR(36) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id),
    INDEX idx_expires_at (expires_at)
);

-- 3. Seed Data (OPTIONAL - for development/testing only)
-- WARNING: Change these passwords in production!
-- These are test accounts with bcrypt-hashed passwords for manual testing

-- Admin user: admin@example.com / adminpass
INSERT INTO users (id, email, password_hash, role, settings, created_at, updated_at) VALUES
(
    UUID(),
    'admin@example.com',
    '$2b$12$.TFhW2/APna.nKZrhMRZTuy18z6wqLwbAdafUMS7m8PjS3998zjbu',
    'admin',
    '{"unit": "us"}',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
);

-- Regular user: user@example.com / userpass
INSERT INTO users (id, email, password_hash, role, settings, created_at, updated_at) VALUES
(
    UUID(),
    'user@example.com',
    '$2b$12$VYegn8nDk4zMk5nmcEZUk.v5ornpAxYzTQ8dRgRBwtaxR9jtmzPoK',
    'user',
    '{"unit": "metric"}',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
);
