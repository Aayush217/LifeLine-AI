-- ==============================================================================
-- LifeLine AI - PostgreSQL Schema & Seed Data for Neon Cloud Database
-- Copy and paste this directly into Neon Console -> SQL Editor -> Run
-- ==============================================================================

-- 1. Users Table
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(128) NOT NULL,
    email VARCHAR(128) UNIQUE NOT NULL,
    password VARCHAR(128) NOT NULL,
    role VARCHAR(32) DEFAULT 'donor',
    blood_type VARCHAR(16) DEFAULT 'O+',
    lat DOUBLE PRECISION DEFAULT 26.9124,
    lng DOUBLE PRECISION DEFAULT 75.7873,
    points INTEGER DEFAULT 0,
    lives_saved INTEGER DEFAULT 0,
    badges TEXT DEFAULT '[]',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- 2. Active Requests Table (Hospital Emergency Dispatches)
CREATE TABLE IF NOT EXISTS active_requests (
    id VARCHAR(64) PRIMARY KEY,
    hospital_id VARCHAR(64),
    blood_type VARCHAR(16),
    units_needed INTEGER DEFAULT 1,
    urgency VARCHAR(32) DEFAULT 'Critical',
    lat DOUBLE PRECISION DEFAULT 26.9124,
    lng DOUBLE PRECISION DEFAULT 75.7873,
    matches INTEGER DEFAULT 0,
    eta INTEGER DEFAULT 0,
    routing_details TEXT DEFAULT '[]',
    accepted_donors TEXT DEFAULT '[]',
    status VARCHAR(32) DEFAULT 'active',
    timestamp VARCHAR(64)
);

-- 3. Warnings Table (ML Prediction Shortage Alerts)
CREATE TABLE IF NOT EXISTS warnings (
    id VARCHAR(64) PRIMARY KEY,
    region_id VARCHAR(64) NOT NULL,
    blood_type VARCHAR(16) DEFAULT 'Any',
    message TEXT NOT NULL,
    severity VARCHAR(32) DEFAULT 'High',
    timestamp VARCHAR(64)
);

-- 4. Proactive Donations & Appointments Table
CREATE TABLE IF NOT EXISTS proactive_donations (
    id VARCHAR(64) PRIMARY KEY,
    donor_id VARCHAR(64) NOT NULL,
    hospital_id VARCHAR(64) NOT NULL,
    hospital_name VARCHAR(128) NOT NULL,
    blood_type VARCHAR(16) DEFAULT 'O+',
    status VARCHAR(32) DEFAULT 'Scheduled',
    timestamp VARCHAR(64)
);

-- 5. Regional Blood Banks Table
CREATE TABLE IF NOT EXISTS blood_banks (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(128) NOT NULL,
    address VARCHAR(256) NOT NULL,
    contact VARCHAR(64) DEFAULT '+91 141 2560291',
    lat DOUBLE PRECISION DEFAULT 26.9124,
    lng DOUBLE PRECISION DEFAULT 75.7873,
    available_units INTEGER DEFAULT 120,
    inventory TEXT DEFAULT '{}'
);

-- 6. Hospital Cold Chain Storage Table (FIFO)
CREATE TABLE IF NOT EXISTS hospital_storage (
    id VARCHAR(64) PRIMARY KEY,
    hospital_id VARCHAR(64) NOT NULL,
    batch_number VARCHAR(64) NOT NULL,
    blood_type VARCHAR(16) NOT NULL,
    units INTEGER DEFAULT 1,
    expiry_days INTEGER DEFAULT 35,
    priority VARCHAR(32) DEFAULT 'Stable',
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_hospital_storage_hosp ON hospital_storage(hospital_id);

-- 7. System Metadata Table
CREATE TABLE IF NOT EXISTS system_meta (
    key VARCHAR(64) PRIMARY KEY,
    value VARCHAR(256) NOT NULL
);

-- 8. Password Reset Tokens Table
CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id VARCHAR(64) PRIMARY KEY,
    email VARCHAR(128) NOT NULL,
    code VARCHAR(32) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    used BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_pw_reset_email ON password_reset_tokens(email);

-- ==============================================================================
-- INITIAL SEED DATA
-- ==============================================================================

-- Seed Default Root Administrator
INSERT INTO users (id, name, email, password, role, blood_type, lat, lng, points, lives_saved, badges)
VALUES ('admin', 'System Administrator', 'admin@lifeline.com', 'admin', 'admin', 'Any', 26.9124, 75.7873, 0, 0, '[]')
ON CONFLICT (id) DO NOTHING;

-- Seed Accredited Jaipur Blood Banks
INSERT INTO blood_banks (id, name, address, contact, lat, lng, available_units, inventory)
VALUES 
    ('BB-SMS', 'SMS Hospital Blood Bank & Transfusion Center', 'JLN Marg, Ashok Nagar, Jaipur', '+91 141 2518291', 26.8924, 75.8152, 184, '{"O-": 8, "O+": 42, "A+": 38, "B+": 51, "AB+": 25, "A-": 6, "B-": 9, "AB-": 5}'),
    ('BB-SDMH', 'Santokba Durlabhji Memorial Blood Bank', 'Bhawani Singh Marg, Bapu Nagar, Jaipur', '+91 141 2566251', 26.8988, 75.8034, 120, '{"O-": 4, "O+": 28, "A+": 24, "B+": 36, "AB+": 16, "A-": 3, "B-": 5, "AB-": 4}'),
    ('BB-ROTARY', 'Rotary Club Regional Blood Center', 'Sector 5, Malviya Nagar, Jaipur', '+91 141 2722100', 26.8532, 75.8194, 95, '{"O-": 2, "O+": 22, "A+": 19, "B+": 31, "AB+": 11, "A-": 2, "B-": 4, "AB-": 4}'),
    ('BB-EHCC', 'Eternal Heart Care Blood Storage Reserve', 'Jawahar Circle, Malviya Nagar, Jaipur', '+91 141 5174000', 26.8398, 75.8042, 76, '{"O-": 5, "O+": 18, "A+": 14, "B+": 22, "AB+": 10, "A-": 1, "B-": 4, "AB-": 2}')
ON CONFLICT (id) DO NOTHING;

INSERT INTO system_meta (key, value)
VALUES ('blood_banks_initialized', 'true')
ON CONFLICT (key) DO NOTHING;

