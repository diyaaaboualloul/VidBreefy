const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'vidbreefy.db');
const db = new Database(dbPath);

// Enable foreign keys
db.pragma('foreign_keys = ON');

// Create tables
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    tier TEXT DEFAULT 'free',
    status TEXT DEFAULT 'active',
    email_verified INTEGER DEFAULT 0,
    is_admin INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_active DATETIME,
    deleted_at DATETIME
  );

  CREATE TABLE IF NOT EXISTS summaries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    video_id TEXT NOT NULL,
    video_title TEXT,
    thumbnail_url TEXT,
    transcript TEXT,
    summary_text TEXT,
    format_type TEXT DEFAULT 'short',
    ai_model_used TEXT,
    share_hash TEXT UNIQUE,
    view_count INTEGER DEFAULT 0,
    is_bookmarked INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    deleted_at DATETIME,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS audit_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    admin_id INTEGER,
    action TEXT NOT NULL,
    target_entity TEXT,
    target_id TEXT,
    old_value TEXT,
    new_value TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (admin_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT
  );

  CREATE TABLE IF NOT EXISTS ai_models (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    provider TEXT NOT NULL,
    model_name TEXT NOT NULL,
    api_key_encrypted TEXT,
    enabled INTEGER DEFAULT 1,
    is_default INTEGER DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS password_reset_tokens (
    token_hash TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL,
    expires_at DATETIME NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS email_verification_tokens (
    token_hash TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL,
    expires_at DATETIME NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS sessions (
    token_hash TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL,
    expires_at DATETIME NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS user_api_keys (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    provider TEXT NOT NULL,
    model_name TEXT,
    api_key_encrypted TEXT NOT NULL,
    is_active INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    UNIQUE(user_id, provider)
  );
`);

// Create indexes
const indexes = [
  'CREATE INDEX IF NOT EXISTS idx_summaries_user_id ON summaries(user_id)',
  'CREATE INDEX IF NOT EXISTS idx_summaries_share_hash ON summaries(share_hash)',
  'CREATE INDEX IF NOT EXISTS idx_summaries_deleted_at ON summaries(deleted_at)',
  'CREATE INDEX IF NOT EXISTS idx_password_reset_token_hash ON password_reset_tokens(token_hash)',
  'CREATE INDEX IF NOT EXISTS idx_email_verification_token_hash ON email_verification_tokens(token_hash)',
  'CREATE INDEX IF NOT EXISTS idx_sessions_token_hash ON sessions(token_hash)',
  'CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)',
  'CREATE INDEX IF NOT EXISTS idx_audit_log_admin_id ON audit_log(admin_id)',
  'CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON audit_log(created_at)'
];

for (const idx of indexes) {
  db.exec(idx);
}

// Insert default AI model
const defaultModel = db.prepare(`
  INSERT OR IGNORE INTO ai_models (provider, model_name, api_key_encrypted, enabled, is_default)
  VALUES ('groq', 'mixtral-8x7b-32768', '', 1, 1)
`);
defaultModel.run();

console.log('Database initialized at:', dbPath);
console.log('Tables created: users, summaries, audit_log, settings, ai_models, password_reset_tokens, email_verification_tokens, sessions');
console.log('Indexes created successfully');

module.exports = db;