# VidBreefy — Setup Guide

## What You Need To Make It Work

---

## 1. Groq API Key (FREE — AI Summaries)

Groq is the default AI provider. It's FREE and fast.

**How to get:**
1. Go to: https://console.groq.com
2. Sign up (free, takes 2 minutes)
3. Go to "API Keys" section
4. Click "Create API Key"
5. Copy the key

**Add to file:** `/vidbreefy/backend/.env`
```
GROQ_API_KEY=your_groq_key_here
```

**Cost:** FREE — generous free tier (enough for thousands of summaries/month)

---

## 2. YouTube Data API Key (Fallback for transcripts)

If Groq's built-in transcript extraction fails, this is the fallback.

**How to get:**
1. Go to: https://console.cloud.google.com
2. Create a new project (or use existing)
3. Go to "APIs & Services" → "Library"
4. Search for "YouTube Data API v3"
5. Enable it
6. Go to "APIs & Services" → "Credentials"
7. Click "Create Credentials" → "API Key"
8. Copy the key

**Add to file:** `/vidbreefy/backend/.env`
```
YOUTUBE_DATA_API_KEY=your_youtube_api_key_here
```

**Cost:** FREE — 10,000 units/day quota is enough for normal use

---

## 3. Paddle (Payment Processing — ALREADY HAVE)

You said you already use Paddle for your WordPress plugin. 

**What to do:**
- Login to Paddle: https://vendors.paddle.com
- Find your Vendor ID and Webhook Key
- Add to `/vidbreefy/backend/.env`:
```
PADDLE_VENDOR_ID=your_vendor_id
PADDLE_WEBHOOK_KEY=your_webhook_key
```

---

## 4. Google AdSense (For Free Tier Ads)

AdSense shows ads on Free tier pages — you earn money from traffic.

**How to get:**
1. Go to: https://www.google.com/adsense
2. Sign up (takes 1-2 weeks for approval)
3. Get your Publisher ID (looks like: pub-xxxxxxxxxxxx)

**Add to file:** `/vidbreefy/backend/.env`
```
ADSENSE_PUBLISHER_ID=pub-xxxxxxxxxxxx
```

**Note:** AdSense takes time to get approved. For now, skip this — ads won't show until approved.

---

## 5. Google OAuth (Optional — Later)

Let users login with Google instead of email/password.

**How to get (when ready):**
1. Go to: https://console.cloud.google.com
2. Create credentials → "OAuth Client ID"
3. Set redirect URI to your domain
4. Get Client ID and Secret

---

## Complete .env File Setup

Edit this file: `/vidbreefy/backend/.env`

```env
PORT=3001
NODE_ENV=development
SESSION_SECRET=make_this_a_long_random_string_change_in_production
ENCRYPTION_KEY=make_this_a_32_character_random_string

# AI Providers (GET THESE FIRST)
GROQ_API_KEY=your_groq_api_key_here

# YouTube (Fallback)
YOUTUBE_DATA_API_KEY=your_youtube_api_key_here

# Paddle Payment (ALREADY HAVE)
PADDLE_VENDOR_ID=your_paddle_vendor_id
PADDLE_WEBHOOK_KEY=your_paddle_webhook_key

# AdSense (Optional — later)
ADSENSE_PUBLISHER_ID=pub-xxxxxxxxxxxx
```

---

## How To Test After Adding Keys

### 1. Restart the backend:
```bash
# Kill old server
pkill -f "node server.js"

# Start again
cd /vidbreefy/backend
node server.js
```

### 2. Open browser:
- http://localhost:3000

### 3. Login:
- Email: admin@vidbreefy.com
- Password: Admin2026!

### 4. Test summarizer:
- Go to /summarize
- Paste any YouTube URL
- Click Summarize

---

## If Summarizer Still Doesn't Work

**Check the logs:**
```bash
tail -f /tmp/vidbreefy.log
```

**Common errors:**
- "API key not set" → Add GROQ_API_KEY to .env
- "No transcript available" → Video doesn't have captions, try another video
- "Rate limit" → Wait a minute, try again

---

## Quick Start Checklist

- [ ] Get Groq API key (console.groq.com) — FREE
- [ ] Add GROQ_API_KEY to .env
- [ ] Get YouTube API key (console.cloud.google.com) — FREE
- [ ] Add YOUTUBE_DATA_API_KEY to .env
- [ ] Restart backend: `pkill -f "node server.js" && cd /vidbreefy/backend && node server.js`
- [ ] Test: http://localhost:3000
- [ ] Login → Try summarizing a YouTube video

---

## Free Tier = Money From Ads
## Pro Tier = Money From Subscriptions ($7/month)

You can start earning as soon as:
1. AdSense is approved (free tier shows ads)
2. Paddle is connected (pro tier = $7/month)