# VidBreefy Backend API Documentation

## Base URL
```
http://localhost:3001
```

## Authentication

Most endpoints require authentication via:
- Cookie: `session_token` (HTTP-only, Secure, SameSite=Strict)
- Header: `Authorization: Bearer <token>`

For mutations (POST, PUT, DELETE), also require:
- Header: `X-CSRF-Token: <csrf_token>`

---

## Auth Endpoints

### POST /api/auth/register
Register a new user.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response (201):**
```json
{
  "message": "Registration successful",
  "user": { "id": 1, "email": "user@example.com", "tier": "free" },
  "csrfToken": "..."
}
```

### POST /api/auth/login
Login and receive session cookie.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response (200):**
```json
{
  "message": "Login successful",
  "user": { "id": 1, "email": "...", "tier": "free", "email_verified": false, "is_admin": false },
  "csrfToken": "..."
}
```

### POST /api/auth/logout
Logout and clear session.

**Response (200):**
```json
{ "message": "Logged out successfully" }
```

### PUT /api/auth/password
Change password (requires auth + CSRF).

**Request:**
```json
{
  "currentPassword": "oldpass",
  "newPassword": "newpass123"
}
```

**Response (200):**
```json
{ "message": "Password updated successfully" }
```

### POST /api/auth/forgot-password
Request password reset token.

**Request:**
```json
{ "email": "user@example.com" }
```

**Response (200):**
```json
{ "message": "If the email exists, a reset link has been sent" }
```

### POST /api/auth/reset-password
Reset password using token.

**Request:**
```json
{
  "token": "uuid-reset-token",
  "password": "newpassword123"
}
```

**Response (200):**
```json
{ "message": "Password reset successful" }
```

### DELETE /api/auth/account
Soft delete account (requires auth + CSRF + password).

**Request:**
```json
{ "password": "current_password" }
```

**Response (200):**
```json
{ "message": "Account deleted successfully" }
```

---

## Summary Endpoints

### POST /api/summaries
Create a new video summary record.

**Requires:** Auth + CSRF

**Request:**
```json
{
  "videoUrl": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
  "format_type": "short"
}
```

format_type: `tl_dr` | `short` | `detailed`

**Response (201):**
```json
{
  "id": 1,
  "video_id": "dQw4w9WgXcQ",
  "video_title": "YouTube Video dQw4w9WgXcQ",
  "thumbnail_url": "https://img.youtube.com/vi/dQw4w9WgXcQ/mqdefault.jpg",
  "share_hash": "abc123...",
  "format_type": "short"
}
```

### GET /api/summaries
List summaries with pagination.

**Requires:** Auth

**Query Parameters:**
- `page` (default: 1)
- `search` (optional, searches title/video_id/email)

**Response (200):**
```json
{
  "summaries": [...],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "pages": 5
  }
}
```

### DELETE /api/summaries/:id
Soft delete a summary.

**Requires:** Auth + CSRF

**Response (200):**
```json
{ "message": "Summary deleted successfully" }
```

### PUT /api/summaries/:id/bookmark
Toggle bookmark status.

**Requires:** Auth + CSRF

**Response (200):**
```json
{ "id": 1, "is_bookmarked": true }
```

---

## AI Endpoints

### POST /api/ai/summarize
Generate AI summary from transcript.

**Requires:** Auth + CSRF

**Request:**
```json
{
  "summaryId": 1,
  "transcript": "Full transcript text...",
  "format_type": "short"
}
```

**Response (200):**
```json
{
  "summary": "Generated summary text...",
  "model": "mixtral-8x7b-32768",
  "format_type": "short"
}
```

---

## Share Endpoints (Public)

### GET /api/share/:hash
View a shared summary (no auth required).

**Response (200):**
```json
{
  "video_title": "...",
  "video_id": "...",
  "thumbnail_url": "...",
  "summary_text": "...",
  "format_type": "short",
  "created_at": "...",
  "view_count": 10
}
```

### GET /summary/:hash
Alias for above (frontend router compatible).

---

## Admin Endpoints

### GET /api/admin/users
List users with pagination.

**Requires:** Auth + Admin

**Query Parameters:**
- `page` (default: 1)
- `search` (optional, searches email)
- `sort` (created_at|email|last_active, default: created_at)
- `dir` (asc|desc, default: desc)

**Response (200):**
```json
{
  "users": [
    { "id": 1, "email": "...", "tier": "free", "status": "active", "summary_count": 5, ... }
  ],
  "pagination": { "page": 1, "limit": 25, "total": 100, "pages": 4 }
}
```

### GET /api/admin/users/:id
Get user detail with summary count and recent summaries.

**Requires:** Auth + Admin

**Response (200):**
```json
{
  "id": 1,
  "email": "...",
  "tier": "pro",
  "status": "active",
  "summary_count": 15,
  "recent_summaries": [...]
}
```

### POST /api/admin/users/:id/action
Perform action on user.

**Requires:** Auth + Admin + CSRF

**Request:**
```json
{ "action": "upgrade" | "downgrade" | "ban" | "unban" | "reset_password" | "delete" }
```

**Response (200):**
```json
{ "message": "User upgrade successful" }
```

For `reset_password`:
```json
{ "message": "Password reset", "temp_password": "..." }
```

### GET /api/admin/ai-models
List AI models.

**Requires:** Auth + Admin

### PUT /api/admin/ai-models
Update AI models.

**Requires:** Auth + Admin + CSRF

**Request:**
```json
{
  "models": [
    { "id": 1, "provider": "groq", "model_name": "mixtral-8x7b-32768", "api_key": "...", "enabled": true, "is_default": true }
  ]
}
```

### GET /api/admin/pricing
Get pricing settings.

### PUT /api/admin/pricing
Update pricing settings.

**Request:**
```json
{ "pricing": { "pro_price": 9.99, "pro_features": [...] } }
```

### GET /api/admin/settings
Get all settings.

### PUT /api/admin/settings
Update settings.

**Request:**
```json
{ "settings": { "site_name": "VidBreefy", "maintenance_mode": false } }
```

### GET /api/admin/content
Get content settings.

### PUT /api/admin/content
Update content settings.

**Request:**
```json
{ "content": { "hero_title": "...", "features": [...] } }
```

### GET /api/admin/audit-log
Get audit log.

**Query Parameters:**
- `page` (default: 1)
- `admin_id` (optional)
- `from` (date, optional)
- `to` (date, optional)

---

## Webhook Endpoints

### POST /api/webhooks/paddle
Paddle webhook handler.

---

## System Endpoints

### GET /sitemap.xml
Sitemap for SEO.

### GET /robots.txt
Robots.txt file.

---

## Rate Limiting

- Login: 10 attempts per 15 minutes per IP
- All other: 100 requests per minute per IP
- Returns 429 with `Retry-After` header

---

## Error Responses

```json
{ "error": "Error message" }
```

Status codes:
- 400: Bad Request
- 401: Unauthorized
- 403: Forbidden
- 404: Not Found
- 409: Conflict
- 429: Too Many Requests
- 500: Internal Server Error