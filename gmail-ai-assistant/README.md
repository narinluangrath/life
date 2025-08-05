# Gmail AI Assistant - Idiot-Proof Setup Guide

> Because we all forget how we set things up 6 months later

## Quick Start (TL;DR)

```bash
cd gmail-ai-assistant
npm install
npm run dev
# Open http://localhost:3000 (or http://10.0.0.6.nip.io:3000 from phone)
```

## The Complete "I Forgot Everything" Guide

### 1. Google Cloud Console Setup (The Painful Part)

1. **Go to**: https://console.cloud.google.com/
2. **Create project** or select existing one (mine is `life-468005`)
3. **Enable APIs** (VERY IMPORTANT - this was the main issue):
   - Gmail API: https://console.cloud.google.com/apis/library/gmail.googleapis.com
   - Calendar API: https://console.cloud.google.com/apis/library/calendar-json.googleapis.com
   - Drive API: https://console.cloud.google.com/apis/library/drive.googleapis.com
   - Click **ENABLE** on each one

4. **Create OAuth Credentials**:
   - Go to: https://console.cloud.google.com/apis/credentials
   - Click **"+ CREATE CREDENTIALS"** → **"OAuth client ID"**
   - Choose **"Web application"** (NOT Desktop - this was another issue)
   - Add these redirect URIs:
     ```
     http://localhost:3000/api/auth/google/callback
     http://10.0.0.6.nip.io:3000/api/auth/google/callback
     ```
   - Download credentials as `credentials.json` in the `gmail-ai-assistant/` folder

### 2. Environment Setup

Create `.env.local` in `gmail-ai-assistant/`:
```bash
GOOGLE_REDIRECT_URI=http://10.0.0.6.nip.io:3000/api/auth/google/callback
NEXT_PUBLIC_APP_URL=http://10.0.0.6.nip.io:3000
SESSION_SECRET=your_random_session_secret_here_123456
```

### 3. Install & Run

```bash
cd gmail-ai-assistant
npm install
npm run dev
```

### 4. Access URLs

- **Local computer**: http://localhost:3000
- **Phone on same network**: http://10.0.0.6.nip.io:3000
- **Replace 10.0.0.6** with your actual computer's IP if different

## Debugging (For When Things Break)

### Start Dev Server with Logging
```bash
# Kill any existing dev server
pkill -f "next dev"

# Start with logging (runs in background)
nohup npm run dev > dev-server.log 2>&1 &

# Watch logs in real-time
tail -f dev-server.log

# Check recent errors
tail -50 dev-server.log
```

### Debug Endpoints
- **Check auth status**: http://10.0.0.6.nip.io:3000/api/debug
- **Clear auth cookies**: http://10.0.0.6.nip.io:3000/api/auth/logout
- **Test Gmail API**: http://10.0.0.6.nip.io:3000/api/test-gmail

### Common Problems & Solutions

**❌ "Login Required" error even with OAuth**
- ✅ Make sure Gmail API is **ENABLED** in Google Cloud Console
- ✅ Use **Web Application** credentials, not Desktop
- ✅ Both redirect URIs must be added to OAuth client

**❌ OAuth works but no emails show**
- ✅ Check `dev-server.log` for errors
- ✅ Visit debug endpoint to see if tokens exist
- ✅ Clear auth and re-authenticate

**❌ Can't access from phone**  
- ✅ Make sure dev server is running with `-H 0.0.0.0` (npm script does this)
- ✅ Use `nip.io` domain: `http://YOUR_IP.nip.io:3000`
- ✅ Both devices on same network

**❌ "googleapis library not working"**
- ✅ This is a known bug - we use direct HTTP requests instead
- ✅ See CLAUDE.md for technical details

## File Structure (What Does What)

```
gmail-ai-assistant/
├── app/
│   ├── api/
│   │   ├── auth/google/           # OAuth flow handlers
│   │   ├── emails/                # Fetch Gmail data (THE MAIN ONE)
│   │   ├── debug/                 # Debug auth status
│   │   └── test-gmail/            # Test Gmail API directly
│   └── page.tsx                   # Main UI (email list)
├── lib/google/                    # Gmail API integration
├── credentials.json               # Google OAuth creds (GITIGNORED)
├── .env.local                     # Environment config (GITIGNORED)
└── dev-server.log                 # Server logs (when debugging)
```

## Network Access (nip.io Magic)

**What is nip.io?** A free DNS service that converts IP addresses to domains:
- `10.0.0.6.nip.io` → resolves to `10.0.0.6`
- Google OAuth requires real domains, not IPs
- Traffic goes directly to your computer, not through nip.io servers

## The OAuth Flow (What Happens)

1. Click "Connect with Google" → `/api/auth/google`
2. Redirects to Google login with `prompt=consent` (forces refresh tokens)
3. Google redirects back to `/api/auth/google/callback`
4. Exchange code for tokens, save in secure cookies
5. Main page calls `/api/emails` with Bearer token
6. Fetch email list + individual email details
7. Display real Gmail data

## Project Status

- ✅ OAuth working with phone network access
- ✅ Real Gmail data (subjects, senders, snippets)
- ✅ Bypass googleapis library auth bug
- ⏳ AI integration (next step)
- ⏳ Email actions (archive, reply, etc.)

## Commit Messages (How to Git)

```bash
git add .
git commit -m "Brief description

- Bullet point of what changed
- Another change
- Fix issue with whatever

🤖 Generated with [Claude Code](https://claude.ai/code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

**Remember**: If you're reading this in 6 months and nothing works, check:
1. Google Cloud Console APIs still enabled
2. OAuth credentials still valid  
3. IP address hasn't changed (update .env.local)
4. The `googleapis` library still broken (probably yes)