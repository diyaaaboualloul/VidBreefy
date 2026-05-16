const cookieParser = require('cookie-parser');
require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const crypto = require('crypto');
const db = require('./db');
const { fetchTranscript } = require('youtube-transcript');

const express = require('express');
const bcrypt = require('bcryptjs');
const cors = require('cors');
const helmet = require('helmet');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 3001;

// =====================
// ENV VALIDATION
// =====================
const requiredEnvVars = ['SESSION_SECRET', 'ENCRYPTION_KEY'];
for (const key of requiredEnvVars) {
  if (!process.env[key] || process.env[key].includes('change_this')) {
    console.error(`ERROR: ${key} is not properly configured in .env`);
    process.exit(1);
  }
}

// =====================
// MIDDLEWARE
// =====================
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false
}));
app.use(cors({
  origin: true,
  credentials: true
}));
app.use(cookieParser());
app.use(express.json());

// Rate limiting - sliding window
const rateLimitMap = new Map(); // IP -> { count, windowStart }
const RATE_LIMIT_WINDOW_MS = 60000; // 1 minute
const RATE_LIMIT_MAX = 100;
const LOGIN_RATE_LIMIT_MAX = 10;
const LOGIN_RATE_LIMIT_WINDOW_MS = 900000; // 15 minutes

function checkRateLimit(ip, isLogin = false) {
  const now = Date.now();
  const max = isLogin ? LOGIN_RATE_LIMIT_MAX : RATE_LIMIT_MAX;
  const windowMs = isLogin ? LOGIN_RATE_LIMIT_WINDOW_MS : RATE_LIMIT_WINDOW_MS;

  let entry = rateLimitMap.get(ip);
  if (!entry || now - entry.windowStart > windowMs) {
    entry = { count: 0, windowStart: now };
    rateLimitMap.set(ip, entry);
  }

  entry.count++;

  if (entry.count > max) {
    return false;
  }
  return true;
}

app.use((req, res, next) => {
  const ip = req.ip || req.connection.remoteAddress;
  const isLogin = req.path.includes('/auth/login');

  if (!checkRateLimit(ip, isLogin)) {
    return res.status(429).json({
      error: 'Too many requests',
      retryAfter: Math.ceil(RATE_LIMIT_WINDOW_MS / 1000)
    }).set('Retry-After', Math.ceil(RATE_LIMIT_WINDOW_MS / 1000));
  }

  next();
});

// CSRF token storage (in-memory for sessions)
const csrfTokens = new Map(); // token -> { userId, expiresAt }

function generateCsrfToken(userId) {
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = Date.now() + 24 * 60 * 60 * 1000; // 24 hours
  csrfTokens.set(token, { userId, expiresAt });

  // Cleanup old tokens
  for (const [key, value] of csrfTokens) {
    if (value.expiresAt < Date.now()) csrfTokens.delete(key);
  }

  return token;
}

function validateCsrfToken(token, userId) {
  const entry = csrfTokens.get(token);
  if (!entry) return false;
  if (entry.userId !== userId) return false;
  if (entry.expiresAt < Date.now()) {
    csrfTokens.delete(token);
    return false;
  }
  return true;
}

function requireCsrf(req, res, next) {
  if (['POST', 'PUT', 'DELETE'].includes(req.method)) {
    // Accept CSRF token from x-csrf-token header OR from Authorization: Bearer <token>
    const bearerToken = req.headers['authorization']?.replace('Bearer ', '');
    const csrfToken = req.headers['x-csrf-token'] || bearerToken;
    if (!csrfToken || !validateCsrfToken(csrfToken, req.userId)) {
      return res.status(403).json({ error: 'Invalid CSRF token' });
    }
  }
  next();
}

// Auth middleware - supports both authenticated users and guest requests
function requireAuth(req, res, next) {
  const cookieToken = req.cookies?.session_token;
  const bearerToken = req.headers['authorization']?.replace('Bearer ', '');
  const token = cookieToken || bearerToken;

  if (token) {
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const session = db.prepare('SELECT * FROM sessions WHERE token_hash = ? AND expires_at > datetime(\'now\')').get(tokenHash);

    if (session) {
      const user = db.prepare('SELECT id, email, tier, status, is_admin, email_verified FROM users WHERE id = ? AND deleted_at IS NULL').get(session.user_id);
      if (user) {
        req.userId = user.id;
        req.user = user;
        req.isGuest = false;
        return next();
      }
    }
  }

  // No valid auth - treat as guest
  req.userId = null;
  req.user = null;
  req.isGuest = true;
  next();
}

function requireAdmin(req, res, next) {
  if (!req.user?.is_admin) {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
}

// Session helpers
function createSession(userId) {
  const token = uuidv4();
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(); // 30 days

  db.prepare('INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)').run(tokenHash, userId, expiresAt);

  // Update last_active
  db.prepare('UPDATE users SET last_active = datetime(\'now\') WHERE id = ?').run(userId);

  return token;
}

function deleteSession(token) {
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(tokenHash);
}

function deleteAllUserSessions(userId) {
  db.prepare('DELETE FROM sessions WHERE user_id = ?').run(userId);
}

// Encryption helpers (AES-256-GCM)
function encrypt(text) {
  const iv = crypto.randomBytes(12);
  const key = Buffer.from(process.env.ENCRYPTION_KEY.slice(0, 32).padEnd(32, '0'), 'utf8');
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);

  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');

  return iv.toString('hex') + ':' + authTag + ':' + encrypted;
}

function decrypt(encryptedData) {
  try {
    const parts = encryptedData.split(':');
    if (parts.length !== 3) return null;

    const iv = Buffer.from(parts[0], 'hex');
    const authTag = Buffer.from(parts[1], 'hex');
    const encrypted = parts[2];

    const key = Buffer.from(process.env.ENCRYPTION_KEY.slice(0, 32).padEnd(32, '0'), 'utf8');
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  } catch (e) {
    return null;
  }
}

// Audit log helper
function logAudit(adminId, action, targetEntity, targetId, oldValue, newValue) {
  db.prepare(`
    INSERT INTO audit_log (admin_id, action, target_entity, target_id, old_value, new_value)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(adminId, action, targetEntity, targetId, oldValue ? JSON.stringify(oldValue) : null, newValue ? JSON.stringify(newValue) : null);
}

// =====================
// AUTH ROUTES
// =====================

// POST /api/auth/register
app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    // Check if user exists
    const existing = db.prepare('SELECT id FROM users WHERE email = ? AND deleted_at IS NULL').get(email);
    if (existing) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const result = db.prepare(`
      INSERT INTO users (email, password_hash) VALUES (?, ?)
    `).run(email, passwordHash);

    const userId = result.lastInsertRowid;

    // Create email verification token
    const verificationToken = uuidv4();
    const tokenHash = crypto.createHash('sha256').update(verificationToken).digest('hex');
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    db.prepare(`
      INSERT INTO email_verification_tokens (token_hash, user_id, expires_at)
      VALUES (?, ?, ?)
    `).run(tokenHash, userId, expiresAt);

    // Create session
    const token = createSession(userId);
    const csrfToken = generateCsrfToken(userId);

    res.cookie('session_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 30 * 24 * 60 * 60 * 1000
    });

    res.status(201).json({
      message: 'Registration successful',
      user: { id: userId, email, tier: 'free' },
      csrfToken
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// POST /api/auth/login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const user = db.prepare('SELECT * FROM users WHERE email = ? AND deleted_at IS NULL').get(email);

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    if (user.status === 'banned') {
      return res.status(403).json({ error: 'Account is banned' });
    }

    const validPassword = await bcrypt.compare(password, user.password_hash);

    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = createSession(user.id);
    const csrfToken = generateCsrfToken(user.id);

    res.cookie('session_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 30 * 24 * 60 * 60 * 1000
    });

    res.json({
      message: 'Login successful',
      user: {
        id: user.id,
        email: user.email,
        tier: user.tier,
        email_verified: !!user.email_verified,
        is_admin: !!user.is_admin
      },
      csrfToken
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// POST /api/auth/logout
app.post('/api/auth/logout', (req, res) => {
  const token = req.cookies?.session_token || req.headers['authorization']?.replace('Bearer ', '');

  if (token) {
    deleteSession(token);
  }

  res.clearCookie('session_token');
  res.json({ message: 'Logged out successfully' });
});

// PUT /api/auth/password
app.put('/api/auth/password', requireAuth, requireCsrf, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current and new password are required' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.userId);

    const validPassword = await bcrypt.compare(currentPassword, user.password_hash);
    if (!validPassword) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    const newHash = await bcrypt.hash(newPassword, 12);
    db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(newHash, req.userId);

    // Invalidate all sessions
    deleteAllUserSessions(req.userId);

    res.json({ message: 'Password updated successfully' });

  } catch (error) {
    console.error('Password update error:', error);
    res.status(500).json({ error: 'Failed to update password' });
  }
});

// PUT /api/auth/upgrade (instant upgrade to pro - no payment yet)
app.put('/api/auth/upgrade', requireAuth, async (req, res) => {
  try {
    const user = db.prepare('SELECT * FROM users WHERE id = ? AND deleted_at IS NULL').get(req.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    if (user.tier === 'pro') {
      return res.status(400).json({ error: 'Already a Pro member' });
    }
    db.prepare('UPDATE users SET tier = ? WHERE id = ?').run('pro', req.userId);
    logAudit(req.userId, 'upgrade', 'user', req.userId, { tier: user.tier }, { tier: 'pro' });
    res.json({
      message: 'Upgraded to Pro successfully',
      user: { ...req.user, tier: 'pro' }
    });
  } catch (error) {
    console.error('Upgrade error:', error);
    res.status(500).json({ error: 'Failed to upgrade account' });
  }
});

// GET /api/auth/me - Get current user info
app.get('/api/auth/me', requireAuth, (req, res) => {
  const user = db.prepare('SELECT id, email, tier, status, is_admin, email_verified FROM users WHERE id = ? AND deleted_at IS NULL').get(req.userId);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }
  res.json(user);
});

// POST /api/auth/forgot-password
app.post('/api/auth/forgot-password', (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const user = db.prepare('SELECT id FROM users WHERE email = ? AND deleted_at IS NULL').get(email);

    // Always return success to prevent email enumeration
    if (!user) {
      return res.json({ message: 'If the email exists, a reset link has been sent' });
    }

    // Delete existing tokens
    db.prepare('DELETE FROM password_reset_tokens WHERE user_id = ?').run(user.id);

    // Create new reset token
    const resetToken = uuidv4();
    const tokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1 hour

    db.prepare(`
      INSERT INTO password_reset_tokens (token_hash, user_id, expires_at)
      VALUES (?, ?, ?)
    `).run(tokenHash, user.id, expiresAt);

    // In production, send email here
    console.log(`Password reset token for ${email}: ${resetToken}`);

    res.json({ message: 'If the email exists, a reset link has been sent' });

  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ error: 'Failed to process request' });
  }
});

// POST /api/auth/reset-password
app.post('/api/auth/reset-password', async (req, res) => {
  try {
    const { token, password } = req.body;

    if (!token || !password) {
      return res.status(400).json({ error: 'Token and new password are required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const resetRecord = db.prepare(`
      SELECT * FROM password_reset_tokens
      WHERE token_hash = ? AND expires_at > datetime(\'now\')
    `).get(tokenHash);

    if (!resetRecord) {
      return res.status(400).json({ error: 'Invalid or expired reset token' });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(passwordHash, resetRecord.user_id);

    // Delete token (single use)
    db.prepare('DELETE FROM password_reset_tokens WHERE token_hash = ?').run(tokenHash);

    // Invalidate all sessions
    deleteAllUserSessions(resetRecord.user_id);

    res.json({ message: 'Password reset successful' });

  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ error: 'Failed to reset password' });
  }
});

// DELETE /api/auth/account
app.delete('/api/auth/account', requireAuth, requireCsrf, (req, res) => {
  try {
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({ error: 'Password is required to delete account' });
    }

    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.userId);

    bcrypt.compare(password, user.password_hash).then(valid => {
      if (!valid) {
        return res.status(401).json({ error: 'Incorrect password' });
      }

      // Soft delete
      db.prepare('UPDATE users SET deleted_at = datetime(\'now\') WHERE id = ?').run(req.userId);

      // Delete all sessions
      deleteAllUserSessions(req.userId);

      res.clearCookie('session_token');
      res.json({ message: 'Account deleted successfully' });
    });

  } catch (error) {
    console.error('Account deletion error:', error);
    res.status(500).json({ error: 'Failed to delete account' });
  }
});

// GET /api/user/api-keys - List user's API keys (pro only)
app.get('/api/user/api-keys', requireAuth, (req, res) => {
  try {
    const user = db.prepare('SELECT tier FROM users WHERE id = ?').get(req.userId);
    if (user.tier !== 'pro') {
      return res.status(403).json({ error: 'API keys only available for Pro users' });
    }

    const keys = db.prepare(`
      SELECT id, provider, model_name, is_active, created_at
      FROM user_api_keys
      WHERE user_id = ? AND is_active = 1
    `).all(req.userId);

    res.json({ keys });
  } catch (error) {
    console.error('Get user API keys error:', error);
    res.status(500).json({ error: 'Failed to get API keys' });
  }
});

// POST /api/user/api-keys - Add user's API key (pro only)
app.post('/api/user/api-keys', requireAuth, requireCsrf, (req, res) => {
  try {
    const user = db.prepare('SELECT tier FROM users WHERE id = ?').get(req.userId);
    if (user.tier !== 'pro') {
      return res.status(403).json({ error: 'API keys only available for Pro users' });
    }

    const { provider, model_name, api_key } = req.body;

    if (!provider || !api_key) {
      return res.status(400).json({ error: 'Provider and API key are required' });
    }

    const allowedProviders = ['groq', 'openai', 'anthropic', 'gemini', 'ollama', 'deepseek'];
    if (!allowedProviders.includes(provider.toLowerCase())) {
      return res.status(400).json({ error: 'Unsupported provider' });
    }

    const encryptedKey = encrypt(api_key);

    db.prepare(`
      INSERT INTO user_api_keys (user_id, provider, model_name, api_key_encrypted, is_active)
      VALUES (?, ?, ?, ?, 1)
      ON CONFLICT(user_id, provider) DO UPDATE SET
        api_key_encrypted = excluded.api_key_encrypted,
        model_name = excluded.model_name,
        is_active = 1
    `).run(req.userId, provider.toLowerCase(), model_name || null, encryptedKey);

    res.json({ message: 'API key saved successfully', provider: provider.toLowerCase() });
  } catch (error) {
    console.error('Add user API key error:', error);
    res.status(500).json({ error: 'Failed to save API key' });
  }
});

// DELETE /api/user/api-keys/:provider - Remove user's API key for a provider
app.delete('/api/user/api-keys/:provider', requireAuth, requireCsrf, (req, res) => {
  try {
    db.prepare(`
      UPDATE user_api_keys SET is_active = 0
      WHERE user_id = ? AND provider = ? AND is_active = 1
    `).run(req.userId, req.params.provider.toLowerCase());

    res.json({ message: 'API key removed' });
  } catch (error) {
    console.error('Delete user API key error:', error);
    res.status(500).json({ error: 'Failed to remove API key' });
  }
});

// GET /api/user/api-keys/:provider/key - Get user's decrypted API key
app.get('/api/user/api-keys/:provider/key', requireAuth, (req, res) => {
  try {
    const userKey = db.prepare(`
      SELECT api_key_encrypted FROM user_api_keys
      WHERE user_id = ? AND provider = ? AND is_active = 1
    `).get(req.userId, req.params.provider.toLowerCase());

    if (!userKey) {
      return res.status(404).json({ error: 'API key not found' });
    }

    res.json({ api_key: decrypt(userKey.api_key_encrypted) });
  } catch (error) {
    console.error('Get user API key error:', error);
    res.status(500).json({ error: 'Failed to get API key' });
  }
});

// =====================
// SUMMARY ROUTES
// =====================

// Guest daily count tracking
const guestCountMap = new Map(); // IP -> { date, count }

function getGuestCount(ip) {
  const today = new Date().toISOString().split('T')[0];
  const entry = guestCountMap.get(ip);

  if (!entry || entry.date !== today) {
    guestCountMap.set(ip, { date: today, count: 0 });
    return 0;
  }

  return entry.count;
}

function incrementGuestCount(ip) {
  const today = new Date().toISOString().split('T')[0];
  const entry = guestCountMap.get(ip);

  if (!entry || entry.date !== today) {
    guestCountMap.set(ip, { date: today, count: 1 });
  } else {
    entry.count++;
  }
}

// POST /api/summaries (requires auth - registered users only)
app.post('/api/summaries', requireAuth, async (req, res) => {
  try {
    const { videoUrl, url, format_type = 'short' } = req.body;
    const ytUrl = videoUrl || url;

    if (!ytUrl) {
      return res.status(400).json({ error: 'Video URL is required' });
    }

    const videoId = extractVideoId(ytUrl);
    if (!videoId) {
      return res.status(400).json({ error: 'Invalid YouTube URL' });
    }

    console.log('>>> POST /api/summaries called');
    console.log('>>> videoId:', videoId, 'ytUrl:', ytUrl);

    const videoInfo = await getYouTubeVideoInfo(videoId);
    const shareHash = crypto.randomBytes(16).toString('hex');

    // For guests: check daily limit from settings
    const ip = req.ip || req.connection.remoteAddress;
    if (req.isGuest) {
      const guestLimitSetting = db.prepare('SELECT value FROM settings WHERE key = ?').get('guest_daily_limit');
      const guestLimit = guestLimitSetting ? JSON.parse(guestLimitSetting.value) : 3;
      const guestCount = getGuestCount(ip);
      if (guestCount >= guestLimit) {
        return res.status(429).json({ error: `Daily limit reached (${guestLimit}/day). Sign up for unlimited summaries.` });
      }
    }

    const insertResult = db.prepare(`
      INSERT INTO summaries (user_id, video_id, video_title, thumbnail_url, format_type, share_hash)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(req.userId || null, videoId, videoInfo.title, videoInfo.thumbnail, format_type, shareHash);

    const summaryId = insertResult.lastInsertRowid;

    // Try to get transcript: body.transcript from extension takes priority
    let transcriptText = req.body.transcript || null;
    let summaryText = null;
    let aiModelUsed = null;

    if (!transcriptText) {
      try {
        transcriptText = await getYouTubeTranscript(videoId);
      } catch (e) {
        console.error('Transcript fetch failed:', e.message);
      }
    } else {
      console.log('>>> transcriptText: PROVIDED BY EXTENSION (' + transcriptText.length + ' chars)');
    }

    console.log('>>> transcriptText:', transcriptText ? 'HAS (' + transcriptText.length + ' chars)' : 'NULL');
    if (transcriptText && transcriptText.length > 50) {
      try {
        // Find enabled AI model with API key
        const aiModel = db.prepare(`
          SELECT * FROM ai_models WHERE enabled = 1 AND api_key_encrypted IS NOT NULL AND api_key_encrypted != ''
          ORDER BY is_default DESC LIMIT 1
        `).get();

        if (aiModel) {
          const apiKey = decrypt(aiModel.api_key_encrypted);
          console.log('>>> AI call:', aiModel.provider, aiModel.model_name, 'key len:', apiKey?.length);
          const summaryResult = await callAI(aiModel.provider, apiKey, transcriptText, aiModel.model_name, format_type);
          console.log('>>> AI result:', summaryResult?.slice(0, 100));
          summaryText = summaryResult;
          aiModelUsed = aiModel.model_name;
        } else {
          console.log('>>> No enabled AI model found with API key');
        }
      } catch (e) {
        console.error('AI summarization failed:', e.message);
      }
    }

    // Update with transcript and summary if we have them
    if (summaryText) {
      db.prepare(`
        UPDATE summaries SET transcript = ?, summary_text = ?, ai_model_used = ? WHERE id = ?
      `).run(transcriptText, summaryText, aiModelUsed, summaryId);
    }

    // Increment guest count after successful summary
    if (req.isGuest) {
      incrementGuestCount(ip);
    }

    const transcriptSource = !transcriptText ? 'none' : transcriptText.startsWith('[METADATA]') ? 'metadata' : 'transcript';
    res.status(201).json({
      id: summaryId,
      video_id: videoId,
      video_title: videoInfo.title,
      thumbnail_url: videoInfo.thumbnail,
      share_hash: shareHash,
      format_type,
      summary: summaryText,
      transcript_source: transcriptSource
    });

  } catch (error) {
    console.error('Create summary error:', error);
    res.status(500).json({ error: 'Failed to create summary' });
  }
});

// GET /api/summaries
app.get('/api/summaries', requireAuth, (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const search = req.query.search || '';
    const limit = 20;
    const offset = (page - 1) * limit;

    let query = `
      SELECT s.*, u.email as user_email
      FROM summaries s
      LEFT JOIN users u ON s.user_id = u.id
      WHERE s.deleted_at IS NULL
    `;
    let countQuery = 'SELECT COUNT(*) as total FROM summaries WHERE deleted_at IS NULL';
    const params = [];

    if (search) {
      query += ' AND (s.video_title LIKE ? OR s.video_id LIKE ? OR u.email LIKE ?)';
      countQuery += ' AND (video_title LIKE ? OR video_id LIKE ?)';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
      const countParams = [`%${search}%`, `%${search}%`];
    }

    query += ' ORDER BY s.created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const summaries = db.prepare(query).all(...params);
    const countResult = db.prepare(countQuery).get(...(search ? [`%${search}%`, `%${search}%`] : []));

    res.json({
      summaries,
      pagination: {
        page,
        limit,
        total: countResult.total,
        pages: Math.ceil(countResult.total / limit)
      }
    });

  } catch (error) {
    console.error('Get summaries error:', error);
    res.status(500).json({ error: 'Failed to fetch summaries' });
  }
});

// DELETE /api/summaries/:id
app.delete('/api/summaries/:id', requireAuth, requireCsrf, (req, res) => {
  try {
    const summaryId = req.params.id;

    const summary = db.prepare('SELECT * FROM summaries WHERE id = ? AND deleted_at IS NULL').get(summaryId);

    if (!summary) {
      return res.status(404).json({ error: 'Summary not found' });
    }

    if (summary.user_id !== req.userId && !req.user.is_admin) {
      return res.status(403).json({ error: 'Not authorized to delete this summary' });
    }

    db.prepare('UPDATE summaries SET deleted_at = datetime(\'now\') WHERE id = ?').run(summaryId);

    res.json({ message: 'Summary deleted successfully' });

  } catch (error) {
    console.error('Delete summary error:', error);
    res.status(500).json({ error: 'Failed to delete summary' });
  }
});

// PUT /api/summaries/:id/bookmark
app.put('/api/summaries/:id/bookmark', requireAuth, requireCsrf, (req, res) => {
  try {
    const summaryId = req.params.id;

    const summary = db.prepare('SELECT * FROM summaries WHERE id = ? AND deleted_at IS NULL').get(summaryId);

    if (!summary) {
      return res.status(404).json({ error: 'Summary not found' });
    }

    if (summary.user_id !== req.userId) {
      return res.status(403).json({ error: 'Not authorized to update this summary' });
    }

    const newBookmarkState = summary.is_bookmarked ? 0 : 1;
    db.prepare('UPDATE summaries SET is_bookmarked = ? WHERE id = ?').run(newBookmarkState, summaryId);

    res.json({
      id: summaryId,
      is_bookmarked: !!newBookmarkState
    });

  } catch (error) {
    console.error('Bookmark toggle error:', error);
    res.status(500).json({ error: 'Failed to update bookmark' });
  }
});

// =====================
// AI SUMMARIZE ROUTE
// =====================

// POST /api/ai/summarize
app.post('/api/ai/summarize', requireAuth, requireCsrf, async (req, res) => {
  try {
    const { summaryId, transcript, format_type = 'short', provider } = req.body;

    if (!transcript) {
      return res.status(400).json({ error: 'Transcript is required' });
    }

    // Get AI model from DB
    let aiModel = db.prepare('SELECT * FROM ai_models WHERE enabled = 1 AND is_default = 1').get() ||
                  db.prepare('SELECT * FROM ai_models WHERE enabled = 1').get();

    if (!aiModel) {
      return res.status(500).json({ error: 'No AI model configured' });
    }

    // Check if user has their own API key for this provider
    let apiKey = '';
    const targetProvider = provider || aiModel.provider;

    const userKey = db.prepare(`
      SELECT api_key_encrypted FROM user_api_keys
      WHERE user_id = ? AND provider = ? AND is_active = 1
    `).get(req.userId, targetProvider);

    if (userKey) {
      // Use user's API key
      apiKey = decrypt(userKey.api_key_encrypted);
      aiModel = { ...aiModel, provider: targetProvider };
    } else if (aiModel.api_key_encrypted) {
      // Fall back to admin's API key
      apiKey = decrypt(aiModel.api_key_encrypted);
    }

    if (!apiKey) {
      return res.status(500).json({ error: 'No API key available. Admin or Pro user needs to configure an API key.' });
    }

    // Build prompt based on format
    let promptPrefix = '';
    switch (format_type) {
      case 'tl_dr':
        promptPrefix = 'Summarize in 1-2 sentences: ';
        break;
      case 'short':
        promptPrefix = 'Summarize in a short paragraph (3-5 sentences): ';
        break;
      case 'detailed':
        promptPrefix = 'Summarize with section headers and [MM:SS] timestamps for key points: ';
        break;
      default:
        promptPrefix = 'Summarize in a short paragraph (3-5 sentences): ';
    }

    // Call Groq API
    let summaryText = '';
    let attempts = 0;
    const maxAttempts = 2;

    while (attempts < maxAttempts && !summaryText) {
      try {
        const response = await callAI(aiModel.provider, apiKey, promptPrefix + transcript, aiModel.model_name);
        summaryText = response;
      } catch (error) {
        attempts++;
        if (attempts >= maxAttempts) {
          throw error;
        }
        // Exponential backoff
        await new Promise(r => setTimeout(r, attempts * 1000));
      }
    }

    // Update summary if summaryId provided
    if (summaryId) {
      db.prepare(`
        UPDATE summaries
        SET summary_text = ?, ai_model_used = ?, transcript = ?
        WHERE id = ?
      `).run(summaryText, aiModel.model_name, transcript, summaryId);
    }

    res.json({
      summary: summaryText,
      model: aiModel.model_name,
      format_type
    });

  } catch (error) {
    console.error('AI summarize error:', error);
    res.status(500).json({ error: 'Failed to generate summary' });
  }
});

// =====================
// SHARE ROUTES (Public)
// =====================

const shareViewMap = new Map(); // IP -> { hash -> lastViewTime }

app.get('/api/share/:hash', (req, res) => {
  try {
    const { hash } = req.params;

    const summary = db.prepare(`
      SELECT s.*, u.email as user_email
      FROM summaries s
      LEFT JOIN users u ON s.user_id = u.id
      WHERE s.share_hash = ? AND s.deleted_at IS NULL
    `).get(hash);

    if (!summary) {
      return res.status(404).json({ error: 'Summary not found' });
    }

    // Dedup view count per IP per hash per 24h
    const ip = req.ip || req.connection.remoteAddress;
    let ipData = shareViewMap.get(ip) || {};
    const lastView = ipData[hash] || 0;
    const now = Date.now();

    if (now - lastView > 24 * 60 * 60 * 1000) {
      // Increment view count
      db.prepare('UPDATE summaries SET view_count = view_count + 1 WHERE id = ?').run(summary.id);
      ipData[hash] = now;
      shareViewMap.set(ip, ipData);
    }

    res.json({
      video_title: summary.video_title,
      video_id: summary.video_id,
      thumbnail_url: summary.thumbnail_url,
      summary_text: summary.summary_text,
      format_type: summary.format_type,
      created_at: summary.created_at,
      view_count: summary.view_count + (now - lastView > 24 * 60 * 60 * 1000 ? 1 : 0)
    });

  } catch (error) {
    console.error('Share view error:', error);
    res.status(500).json({ error: 'Failed to fetch shared summary' });
  }
});

// Frontend router compatible route
app.get('/summary/:hash', (req, res) => {
  const { hash } = req.params;

  const summary = db.prepare(`
    SELECT s.*, u.email as user_email
    FROM summaries s
    LEFT JOIN users u ON s.user_id = u.id
    WHERE s.share_hash = ? AND s.deleted_at IS NULL
  `).get(hash);

  if (!summary) {
    return res.status(404).json({ error: 'Summary not found' });
  }

  res.json({
    video_title: summary.video_title,
    video_id: summary.video_id,
    thumbnail_url: summary.thumbnail_url,
    summary_text: summary.summary_text,
    format_type: summary.format_type,
    created_at: summary.created_at,
    view_count: summary.view_count
  });
});

// =====================
// ADMIN ROUTES
// =====================

// GET /api/admin/users
app.get('/api/admin/users', requireAuth, requireAdmin, (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const search = req.query.search || '';
    const sort = req.query.sort || 'created_at';
    const dir = req.query.dir || 'desc';
    const limit = 25;
    const offset = (page - 1) * limit;

    let query = `
      SELECT u.id, u.email, u.tier, u.status, u.email_verified, u.is_admin, u.created_at, u.last_active,
        (SELECT COUNT(*) FROM summaries WHERE user_id = u.id AND deleted_at IS NULL) as summary_count
      FROM users u
      WHERE u.deleted_at IS NULL
    `;
    let countQuery = 'SELECT COUNT(*) as total FROM users WHERE deleted_at IS NULL';
    const params = [];

    if (search) {
      query += ' AND u.email LIKE ?';
      countQuery += ' AND email LIKE ?';
      params.push(`%${search}%`);
    }

    // Validate sort column
    const allowedSorts = ['created_at', 'email', 'last_active'];
    const sortCol = allowedSorts.includes(sort) ? sort : 'created_at';
    const sortDir = dir.toLowerCase() === 'asc' ? 'ASC' : 'DESC';

    query += ` ORDER BY u.${sortCol} ${sortDir} LIMIT ? OFFSET ?`;
    params.push(limit, offset);

    const users = db.prepare(query).all(...params);
    const countResult = db.prepare(countQuery).get(...(search ? [`%${search}%`] : []));

    res.json({
      users,
      pagination: {
        page,
        limit,
        total: countResult.total,
        pages: Math.ceil(countResult.total / limit)
      }
    });

  } catch (error) {
    console.error('Admin get users error:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// GET /api/admin/users/:id
app.get('/api/admin/users/:id', requireAuth, requireAdmin, (req, res) => {
  try {
    const userId = req.params.id;

    const user = db.prepare(`
      SELECT id, email, tier, status, email_verified, is_admin, created_at, last_active
      FROM users WHERE id = ? AND deleted_at IS NULL
    `).get(userId);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const summaryCount = db.prepare('SELECT COUNT(*) as count FROM summaries WHERE user_id = ? AND deleted_at IS NULL').get(userId);
    const recentSummaries = db.prepare(`
      SELECT id, video_title, video_id, created_at, format_type
      FROM summaries WHERE user_id = ? AND deleted_at IS NULL
      ORDER BY created_at DESC LIMIT 10
    `).all(userId);

    res.json({
      ...user,
      summary_count: summaryCount.count,
      recent_summaries: recentSummaries
    });

  } catch (error) {
    console.error('Admin get user detail error:', error);
    res.status(500).json({ error: 'Failed to fetch user details' });
  }
});

// POST /api/admin/users/:id/action
app.post('/api/admin/users/:id/action', requireAuth, requireAdmin, requireCsrf, async (req, res) => {
  try {
    const userId = req.params.id;
    const { action } = req.body;

    const user = db.prepare('SELECT * FROM users WHERE id = ? AND deleted_at IS NULL').get(userId);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    let oldValue, newValue;

    switch (action) {
      case 'upgrade':
        oldValue = { tier: user.tier };
        db.prepare('UPDATE users SET tier = ? WHERE id = ?').run('pro', userId);
        newValue = { tier: 'pro' };
        break;

      case 'downgrade':
        oldValue = { tier: user.tier };
        db.prepare('UPDATE users SET tier = ? WHERE id = ?').run('free', userId);
        newValue = { tier: 'free' };
        break;

      case 'ban':
        oldValue = { status: user.status };
        db.prepare('UPDATE users SET status = ? WHERE id = ?').run('banned', userId);
        newValue = { status: 'banned' };
        break;

      case 'unban':
        oldValue = { status: user.status };
        db.prepare('UPDATE users SET status = ? WHERE id = ?').run('active', userId);
        newValue = { status: 'active' };
        break;

      case 'reset_password':
        // Generate new random password
        const newPassword = crypto.randomBytes(12).toString('base64');
        const hash = await bcrypt.hash(newPassword, 12);
        db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(hash, userId);
        deleteAllUserSessions(userId);
        logAudit(req.userId, 'reset_password', 'user', userId, null, { password_reset: true });
        return res.json({ message: 'Password reset', temp_password: newPassword });

      case 'delete':
        oldValue = { deleted_at: null };
        db.prepare('UPDATE users SET deleted_at = datetime(\'now\') WHERE id = ?').run(userId);
        deleteAllUserSessions(userId);
        newValue = { deleted_at: new Date().toISOString() };
        break;

      default:
        return res.status(400).json({ error: 'Invalid action' });
    }

    logAudit(req.userId, action, 'user', userId, oldValue, newValue);

    res.json({ message: `User ${action} successful` });

  } catch (error) {
    console.error('Admin user action error:', error);
    res.status(500).json({ error: `Failed to ${action} user` });
  }
});

// GET /api/admin/ai-models
app.get('/api/admin/ai-models', requireAuth, requireAdmin, (req, res) => {
  try {
    const models = db.prepare('SELECT id, provider, model_name, enabled, is_default, api_key_encrypted FROM ai_models').all();
    const decrypted = models.map(m => ({
      ...m,
      api_key: m.api_key_encrypted ? '(configured)' : null,
      configured: !!m.api_key_encrypted
    }));
    res.json({ ai_models: decrypted });
  } catch (error) {
    console.error('Admin get ai-models error:', error);
    res.status(500).json({ error: 'Failed to fetch AI models' });
  }
});

// PUT /api/admin/ai-models (bulk update)
app.put('/api/admin/ai-models', requireAuth, requireAdmin, requireCsrf, (req, res) => {
  try {
    const { models } = req.body;

    if (!Array.isArray(models)) {
      return res.status(400).json({ error: 'Models array is required' });
    }

    for (const model of models) {
      const apiKeyEncrypted = model.api_key ? encrypt(model.api_key) : null;

      if (model.id) {
        db.prepare(`
          UPDATE ai_models
          SET provider = ?, model_name = ?, api_key_encrypted = ?, enabled = ?, is_default = ?
          WHERE id = ?
        `).run(model.provider, model.model_name, apiKeyEncrypted, model.enabled ? 1 : 0, model.is_default ? 1 : 0, model.id);
      } else {
        db.prepare(`
          INSERT INTO ai_models (provider, model_name, api_key_encrypted, enabled, is_default)
          VALUES (?, ?, ?, ?, ?)
        `).run(model.provider, model.model_name, apiKeyEncrypted, model.enabled ? 1 : 0, model.is_default ? 1 : 0);
      }
    }

    logAudit(req.userId, 'update_ai_models', 'ai_models', null, null, { count: models.length });

    res.json({ message: 'AI models updated successfully' });

  } catch (error) {
    console.error('Admin update ai-models error:', error);
    res.status(500).json({ error: 'Failed to update AI models' });
  }
});

// PUT /api/admin/ai-models/:id (single model update - no CSRF for convenience)
app.put('/api/admin/ai-models/:id', requireAuth, requireAdmin, (req, res) => {
  try {
    const { id } = req.params;
    const { provider, model_name, api_key, enabled, is_default } = req.body;

    const apiKeyEncrypted = api_key ? encrypt(api_key) : null;

    db.prepare(`
      UPDATE ai_models
      SET provider = ?, model_name = ?, api_key_encrypted = ?, enabled = ?, is_default = ?
      WHERE id = ?
    `).run(provider, model_name, apiKeyEncrypted, enabled ? 1 : 0, is_default ? 1 : 0, id);

    res.json({ message: 'Model updated successfully' });

  } catch (error) {
    console.error('Admin update ai-model error:', error);
    res.status(500).json({ error: 'Failed to update model' });
  }
});

// GET /api/admin/pricing
app.get('/api/admin/pricing', requireAuth, requireAdmin, (req, res) => {
  try {
    const pricing = db.prepare("SELECT * FROM settings WHERE key LIKE 'pricing_%'").all();
    const result = {};
    for (const p of pricing) {
      result[p.key] = p.value;
    }
    res.json(result);
  } catch (error) {
    console.error('Admin get pricing error:', error);
    res.status(500).json({ error: 'Failed to fetch pricing settings' });
  }
});

// PUT /api/admin/pricing
app.put('/api/admin/pricing', requireAuth, requireAdmin, requireCsrf, (req, res) => {
  try {
    const { pricing } = req.body;

    for (const [key, value] of Object.entries(pricing)) {
      db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run(`pricing_${key}`, JSON.stringify(value));
    }

    logAudit(req.userId, 'update_pricing', 'settings', 'pricing', null, pricing);

    res.json({ message: 'Pricing updated successfully' });
  } catch (error) {
    console.error('Admin update pricing error:', error);
    res.status(500).json({ error: 'Failed to update pricing' });
  }
});

// GET /api/admin/settings
app.get('/api/admin/settings', requireAuth, requireAdmin, (req, res) => {
  try {
    const settings = db.prepare('SELECT key, value FROM settings').all();
    const result = {};
    for (const s of settings) {
      try {
        result[s.key] = JSON.parse(s.value);
      } catch {
        result[s.key] = s.value;
      }
    }
    res.json(result);
  } catch (error) {
    console.error('Admin get settings error:', error);
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

// POST /api/admin/settings/youtube-key - Save YouTube Data API key (no CSRF for admin convenience)
app.post('/api/admin/settings/youtube-key', requireAuth, requireAdmin, (req, res) => {
  try {
    const { apiKey } = req.body;
    if (!apiKey) return res.status(400).json({ error: 'API key is required' });
    const encrypted = encrypt(apiKey);
    db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run('youtube_data_api_key', JSON.stringify(encrypted));
    logAudit(req.userId, 'update_youtube_api_key', 'settings', null, null, { length: apiKey.length });
    res.json({ message: 'YouTube API key saved' });
  } catch (error) {
    console.error('Admin save youtube key error:', error);
    res.status(500).json({ error: 'Failed to save YouTube API key' });
  }
});

// PUT /api/admin/settings
app.put('/api/admin/settings', requireAuth, requireAdmin, requireCsrf, (req, res) => {
  try {
    const { settings } = req.body;

    for (const [key, value] of Object.entries(settings)) {
      db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run(key, JSON.stringify(value));
    }

    logAudit(req.userId, 'update_settings', 'settings', null, null, settings);

    res.json({ message: 'Settings updated successfully' });
  } catch (error) {
    console.error('Admin update settings error:', error);
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

// GET /api/admin/content
app.get('/api/admin/content', requireAuth, requireAdmin, (req, res) => {
  try {
    const content = db.prepare("SELECT key, value FROM settings WHERE key LIKE 'content_%'").all();
    const result = {};
    for (const c of content) {
      try {
        result[c.key.replace('content_', '')] = JSON.parse(c.value);
      } catch {
        result[c.key.replace('content_', '')] = c.value;
      }
    }
    res.json(result);
  } catch (error) {
    console.error('Admin get content error:', error);
    res.status(500).json({ error: 'Failed to fetch content settings' });
  }
});

// GET /api/admin/content/:key - Get single content item
app.get('/api/admin/content/:key', requireAuth, requireAdmin, (req, res) => {
  try {
    const { key } = req.params;
    const content = db.prepare("SELECT value FROM settings WHERE key = ?").get(`content_${key}`);

    if (!content) {
      return res.status(404).json({ error: 'Content not found' });
    }

    try {
      res.json({ [key]: JSON.parse(content.value) });
    } catch {
      res.json({ [key]: content.value });
    }
  } catch (error) {
    console.error('Admin get content error:', error);
    res.status(500).json({ error: 'Failed to fetch content' });
  }
});

// PUT /api/admin/content
app.put('/api/admin/content', requireAuth, requireAdmin, requireCsrf, (req, res) => {
  try {
    const { content } = req.body;

    for (const [key, value] of Object.entries(content)) {
      db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run(`content_${key}`, JSON.stringify(value));
    }

    logAudit(req.userId, 'update_content', 'settings', 'content', null, content);

    res.json({ message: 'Content updated successfully' });
  } catch (error) {
    console.error('Admin update content error:', error);
    res.status(500).json({ error: 'Failed to update content' });
  }
});

// GET /api/admin/audit-log
app.get('/api/admin/audit-log', requireAuth, requireAdmin, (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const adminId = req.query.admin_id;
    const from = req.query.from;
    const to = req.query.to;
    const limit = 50;
    const offset = (page - 1) * limit;

    let query = `
      SELECT a.*, u.email as admin_email
      FROM audit_log a
      LEFT JOIN users u ON a.admin_id = u.id
      WHERE 1=1
    `;
    const params = [];

    if (adminId) {
      query += ' AND a.admin_id = ?';
      params.push(adminId);
    }

    if (from) {
      query += ' AND a.created_at >= ?';
      params.push(from);
    }

    if (to) {
      query += ' AND a.created_at <= ?';
      params.push(to);
    }

    query += ' ORDER BY a.created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const logs = db.prepare(query).all(...params);
    const countResult = db.prepare('SELECT COUNT(*) as total FROM audit_log').get();

    res.json({
      logs,
      pagination: {
        page,
        limit,
        total: countResult.total,
        pages: Math.ceil(countResult.total / limit)
      }
    });

  } catch (error) {
    console.error('Admin get audit-log error:', error);
    res.status(500).json({ error: 'Failed to fetch audit log' });
  }
});

// GET /api/admin/payments - List payments/subscriptions (stub for now)
app.get('/api/admin/payments', requireAuth, requireAdmin, (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 50;
    const offset = (page - 1) * limit;
    
    const payments = db.prepare(`
      SELECT id, email, tier, status, created_at as date, tier as amount
      FROM users WHERE tier = 'pro' AND deleted_at IS NULL
      ORDER BY created_at DESC LIMIT ? OFFSET ?
    `).all(limit, offset);
    
    const count = db.prepare("SELECT COUNT(*) as total FROM users WHERE tier = 'pro' AND deleted_at IS NULL").get();
    
    res.json({
      payments,
      pagination: {
        page,
        limit,
        total: count.total,
        pages: Math.ceil(count.total / limit)
      }
    });
  } catch (error) {
    console.error('Admin get payments error:', error);
    res.status(500).json({ error: 'Failed to fetch payments' });
  }
});

// GET /api/admin/trash - List deleted items
app.get('/api/admin/trash', requireAuth, requireAdmin, (req, res) => {
  try {
    const summaries = db.prepare(`
      SELECT id, user_id, video_title, video_id, created_at, deleted_at, 'summary' as type
      FROM summaries WHERE deleted_at IS NOT NULL
      ORDER BY deleted_at DESC LIMIT 100
    `).all();
    
    res.json({ summaries });
  } catch (error) {
    console.error('Admin get trash error:', error);
    res.status(500).json({ error: 'Failed to fetch trash' });
  }
});

// POST /api/admin/trash/:type/:id/restore - Restore item from trash
app.post('/api/admin/trash/:type/:id/restore', requireAuth, requireAdmin, requireCsrf, (req, res) => {
  try {
    const { type, id } = req.params;
    
    if (type === 'summary') {
      db.prepare("UPDATE summaries SET deleted_at = NULL WHERE id = ?").run(id);
    }
    
    res.json({ message: 'Item restored successfully' });
  } catch (error) {
    console.error('Admin restore trash error:', error);
    res.status(500).json({ error: 'Failed to restore item' });
  }
});

// DELETE /api/admin/trash/:type/:id - Permanently delete
app.delete('/api/admin/trash/:type/:id', requireAuth, requireAdmin, requireCsrf, (req, res) => {
  try {
    const { type, id } = req.params;
    
    if (type === 'summary') {
      db.prepare("DELETE FROM summaries WHERE id = ?").run(id);
    }
    
    res.json({ message: 'Item permanently deleted' });
  } catch (error) {
    console.error('Admin permanent delete error:', error);
    res.status(500).json({ error: 'Failed to delete item' });
  }
});

// GET /api/admin/users/export - Export users as CSV
app.get('/api/admin/users/export', requireAuth, requireAdmin, (req, res) => {
  try {
    const users = db.prepare(`
      SELECT email, tier, status, is_admin, email_verified, created_at, last_active
      FROM users WHERE deleted_at IS NULL
      ORDER BY created_at DESC
    `).all();
    
    const csv = ['Email,Tier,Status,Admin,Verified,Created,Last Active'];
    users.forEach(u => {
      csv.push(`${u.email},${u.tier},${u.status},${u.is_admin},${u.email_verified},${u.created_at},${u.last_active || ''}`);
    });
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=users.csv');
    res.send(csv.join('\n'));
  } catch (error) {
    console.error('Admin export users error:', error);
    res.status(500).json({ error: 'Failed to export users' });
  }
});

// GET /api/summaries/public/:hash - Get shared summary by hash
app.get('/api/summaries/public/:hash', (req, res) => {
  try {
    const summary = db.prepare(`
      SELECT s.*, u.email as user_email
      FROM summaries s
      LEFT JOIN users u ON s.user_id = u.id
      WHERE s.share_hash = ? AND s.deleted_at IS NULL
    `).get(req.params.hash);
    
    if (!summary) {
      return res.status(404).json({ error: 'Summary not found' });
    }
    
    // Increment view count
    db.prepare("UPDATE summaries SET view_count = view_count + 1 WHERE id = ?").run(summary.id);
    
    res.json({ summary });
  } catch (error) {
    console.error('Get shared summary error:', error);
    res.status(500).json({ error: 'Failed to fetch summary' });
  }
});

// PATCH /api/summaries/public/:hash/view - Increment view count
app.patch('/api/summaries/public/:hash/view', (req, res) => {
  try {
    const summary = db.prepare("SELECT id FROM summaries WHERE share_hash = ? AND deleted_at IS NULL").get(req.params.hash);
    
    if (!summary) {
      return res.status(404).json({ error: 'Summary not found' });
    }
    
    db.prepare("UPDATE summaries SET view_count = view_count + 1 WHERE id = ?").run(summary.id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update view count' });
  }
});

// GET /api/auth/email - Get current email
app.get('/api/auth/email', requireAuth, (req, res) => {
  res.json({ email: req.user.email });
});

// PUT /api/auth/email - Update email
app.put('/api/auth/email', requireAuth, requireCsrf, (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email || !email.includes('@')) {
      return res.status(400).json({ error: 'Valid email is required' });
    }
    
    const existing = db.prepare('SELECT id FROM users WHERE email = ? AND id != ? AND deleted_at IS NULL').get(email, req.userId);
    if (existing) {
      return res.status(400).json({ error: 'Email already in use' });
    }
    
    db.prepare('UPDATE users SET email = ?, email_verified = 0 WHERE id = ?').run(email, req.userId);
    
    // Invalidate all sessions for this user (require re-login with new email)
    db.prepare('DELETE FROM sessions WHERE user_id = ?').run(req.userId);
    
    res.json({ message: 'Email updated. Please login again with your new email.' });
  } catch (error) {
    console.error('Update email error:', error);
    res.status(500).json({ error: 'Failed to update email' });
  }
});

// =====================
// WEBHOOK ROUTES
// =====================

app.post('/api/webhooks/paddle', (req, res) => {
  try {
    const signature = req.headers['paddle-signature'];
    const webhookKey = process.env.PADDLE_WEBHOOK_KEY;

    if (webhookKey && signature !== webhookKey) {
      return res.status(403).json({ error: 'Invalid webhook signature' });
    }

    const event = req.body;
    console.log('Paddle webhook event:', JSON.stringify(event, null, 2));

    // Handle different event types
    switch (event.event_type) {
      case 'subscription.created':
        // Handle new subscription
        break;
      case 'subscription.updated':
        // Handle subscription update
        break;
      case 'subscription.cancelled':
        // Handle subscription cancellation
        break;
      case 'subscription.payment_succeeded':
        // Handle successful payment
        break;
      case 'subscription.payment_failed':
        // Handle failed payment
        break;
    }

    res.json({ success: true });

  } catch (error) {
    console.error('Paddle webhook error:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

// =====================
// SYSTEM ROUTES
// =====================

app.get('/sitemap.xml', (req, res) => {
  try {
    const summaries = db.prepare('SELECT share_hash, created_at FROM summaries WHERE deleted_at IS NULL').all();

    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';
    xml += '  <url><loc>https://vidbreefy.com/</loc><priority>1.0</priority></url>\n';
    xml += '  <url><loc>https://vidbreefy.com/summarize</loc><priority>0.8</priority></url>\n';

    for (const s of summaries) {
      xml += `  <url><loc>https://vidbreefy.com/summary/${s.share_hash}</loc>`;
      xml += `<lastmod>${new Date(s.created_at).toISOString()}</lastmod>`;
      xml += '<priority>0.6</priority></url>\n';
    }

    xml += '</urlset>';

    res.type('application/xml').send(xml);

  } catch (error) {
    console.error('Sitemap error:', error);
    res.status(500).send('Error generating sitemap');
  }
});

app.get('/robots.txt', (req, res) => {
  res.type('text/plain').send('User-agent: *\nAllow: /\n\nSitemap: https://vidbreefy.com/sitemap.xml');
});

// =====================
// HELPER FUNCTIONS
// =====================

function extractVideoId(url) {
  // Handle various YouTube URL formats
  const patterns = [
    /youtube\.com\/watch\?v=([^&]+)/,
    /youtu\.be\/([^?]+)/,
    /youtube\.com\/embed\/([^?]+)/,
    /youtube\.com\/v\/([^?]+)/
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }

  return null;
}

async function getYouTubeTranscript(videoId) {
  console.log('Fetching transcript for', videoId);

  // Try 1: youtube-transcript package
  try {
    const transcript = await Promise.race([
      fetchTranscript(videoId, { lang: 'en' }),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Transcript timeout (10s)')), 10000))
    ]);
    if (transcript && transcript.length > 0) {
      const text = transcript.map(entry => entry.text).join(' ').replace(/\n/g, ' ').trim();
      if (text.length > 50) {
        console.log('Transcript via youtube-transcript:', text.length, 'chars');
        return text;
      }
    }
  } catch (error) {
    console.error('youtube-transcript error:', error.message);
  }


  // Try 2: YouTube Data API v3 — captions via Google API servers (bypasses VPS geo-block)
  try {
    const apiKey = process.env.YOUTUBE_DATA_API_KEY;
    if (apiKey && apiKey.includes('AIzaSy')) {
      // Check if video has captions
      const metaRes = await fetch(
        `https://www.googleapis.com/youtube/v3/videos?id=${videoId}&part=contentDetails,snippet&key=${apiKey}`
      );
      if (metaRes.ok) {
        const meta = await metaRes.json();
        const hasCaption = meta.items?.[0]?.contentDetails?.caption === 'true';
        console.log('YouTube Data API: caption =', hasCaption);
        if (hasCaption) {
          // Fetch caption track URL via yt-dlp (it uses Google's API internally with proper UA)
          const captionInfo = await new Promise((resolve, reject) => {
            const { spawn } = require('child_process');
            const yt = spawn('yt-dlp', [
              '--no-warnings', '--skip-download',
              '--write-auto-sub', '--sub-lang', 'en',
              '--print', '%(automatic_captions.en)s',
              `https://www.youtube.com/watch?v=${videoId}`
            ]);
            let output = '';
            let timeout = setTimeout(() => { yt.kill(); reject(new Error('yt-dlp timeout'));; }, 20000);
            yt.stdout.on('data', d => output += d.toString());
            yt.stderr.on('data', d => { /* discard */ });
            yt.on('close', code => { clearTimeout(timeout); resolve(output); });
          });
          // captionInfo contains JSON array of available formats — now fetch the actual subtitle file
          if (captionInfo.includes('url')) {
            // Extract first json3 URL and fetch it
            try {
              const formats = JSON.parse(captionInfo);
              const fmt = formats.find(f => f.ext === 'json3') || formats[0];
              if (fmt?.url) {
                const subRes = await fetch(fmt.url);
                const subData = await subRes.json();
                if (subData?.events) {
                  const text = subData.events
                    .filter(e => e.segs)
                    .map(e => e.segs.map(s => s.utf8).join('')).join(' ')
                    .replace(/\n/g, ' ').trim();
                  if (text.length > 50) {
                    console.log('Transcript via YouTube Data API:', text.length, 'chars');
                    return text;
                  }
                }
              }
            } catch (e) { console.error('Subtitle parse error:', e.message); }
          }
        }
      }
    }
  } catch (error) {
    console.error('YouTube Data API caption error:', error.message);
  }

  // Try 3: Use video description as fallback text
  try {
    const apiKey = process.env.YOUTUBE_DATA_API_KEY;
    if (apiKey && apiKey.includes('AIzaSy')) {
      const metaRes = await fetch(
        `https://www.googleapis.com/youtube/v3/videos?id=${videoId}&part=snippet&key=${apiKey}`
      );
      if (metaRes.ok) {
        const meta = await metaRes.json();
        const snippet = meta.items?.[0]?.snippet;
        if (snippet) {
          const title = snippet.title || '';
          const description = (snippet.description || '').slice(0, 2000);
          const tags = (snippet.tags || []).join(', ');
          // Combine as pseudo-transcript for summarization
          const fallbackText = `[METADATA] Video title: ${title}. Description: ${description}. Tags: ${tags}.`;
          console.log('Using video metadata as fallback input:', fallbackText.length, 'chars');
          return fallbackText;
        }
      }
    }
  } catch (error) {
    console.error('Video metadata fallback error:', error.message);
  }

  console.error('Transcript fetch error: All methods failed');
  return null;
}

async function getYouTubeVideoInfo(videoId) {
  try {
    // Use oEmbed to get video title (no API key needed)
    const oembedUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`;
    const response = await fetch(oembedUrl);
    if (response.ok) {
      const data = await response.json();
      return {
        title: data.title || `YouTube Video ${videoId}`,
        thumbnail: `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`
      };
    }
  } catch (error) {
    console.error('getYouTubeVideoInfo error:', error.message);
  }
  return {
    title: `YouTube Video ${videoId}`,
    thumbnail: `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`
  };
}

async function callGroqAPI(apiKey, prompt, modelName) {
  const model = modelName || 'llama-3.3-70b-versatile';
  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: model,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3
    })
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Groq API error: ${response.status} - ${error}`);
  }

  const data = await response.json();
  return data.choices[0]?.message?.content || 'Summary could not be generated';
}

// Multi-provider AI call function
async function callAI(provider, apiKey, prompt, modelName) {
  switch (provider.toLowerCase()) {
    case 'groq':
      return callGroqAPI(apiKey, prompt, modelName);

    case 'openai':
      const openaiRes = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: modelName || 'gpt-4o-mini',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.3
        })
      });
      if (!openaiRes.ok) throw new Error(`OpenAI error: ${openaiRes.status}`);
      const openaiData = await openaiRes.json();
      return openaiData.choices[0]?.message?.content || 'Summary could not be generated';

    case 'anthropic':
      const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: modelName || 'claude-3-5-haiku-20241107',
          max_tokens: 1024,
          messages: [{ role: 'user', content: prompt }]
        })
      });
      if (!anthropicRes.ok) throw new Error(`Anthropic error: ${anthropicRes.status}`);
      const anthropicData = await anthropicRes.json();
      return anthropicData.content[0]?.text || 'Summary could not be generated';

    case 'gemini':
      const geminiRes = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${modelName || 'gemini-2.0-flash'}:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.3 }
          })
        }
      );
      if (!geminiRes.ok) throw new Error(`Gemini error: ${geminiRes.status}`);
      const geminiData = await geminiRes.json();
      return geminiData.candidates?.[0]?.content?.parts?.[0]?.text || 'Summary could not be generated';

    case 'deepseek':
      const deepseekRes = await fetch('https://api.deepseek.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: modelName || 'deepseek-chat',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.3
        })
      });
      if (!deepseekRes.ok) throw new Error(`DeepSeek error: ${deepseekRes.status}`);
      const deepseekData = await deepseekRes.json();
      return deepseekData.choices[0]?.message?.content || 'Summary could not be generated';

    default:
      // Fall back to Groq for unknown providers
      return callGroqAPI(apiKey, prompt, modelName);
  }
}

// =====================
// START SERVER
// =====================

app.listen(PORT, () => {
  console.log(`VidBreefy backend running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

module.exports = app;