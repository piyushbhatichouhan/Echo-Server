-- Migration: Add can_custom_subdomain column to users table
-- Allows the Super Admin to grant exclusive custom subdomain privileges

ALTER TABLE users 
ADD COLUMN IF NOT EXISTS can_custom_subdomain BOOLEAN NOT NULL DEFAULT FALSE;
