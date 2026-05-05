# QZ Industrial — Repair Ticketing System

## Quick Deploy Guide

### Step 1 — Supabase (Database)
1. Go to https://supabase.com → Create new project: `qz-ticketing`
2. Open SQL Editor → New Query
3. Paste and run the contents of `supabase-schema.sql`
4. Go to Settings → API and copy:
   - **Project URL** (looks like: https://xxxxxxxxxxxx.supabase.co)
   - **anon / public key** (long JWT string)

### Step 2 — GitHub (Code Host)
1. Go to https://github.com → New repository → name: `qz-ticketing`
2. Upload all project files (drag and drop or use Git)

### Step 3 — Netlify (Deployment)
1. Go to https://netlify.com → Add new site → Import from GitHub
2. Select your `qz-ticketing` repo
3. Build settings:
   - Build command: `npm run build`
   - Publish directory: `build`
4. Environment variables (Site settings → Environment variables):
   - `REACT_APP_SUPABASE_URL` = your Supabase Project URL
   - `REACT_APP_SUPABASE_ANON_KEY` = your Supabase anon key
5. Click Deploy Site

### Step 4 — Share with your team
- Your app will be live at: `https://your-site-name.netlify.app`
- Anyone with the link can access it simultaneously
- All data syncs in real time via Supabase

---

## Local Development

```bash
npm install
cp .env.example .env
# Fill in your Supabase URL and key in .env
npm start
```

## Features
- Intake → Approved → Completed workflow
- Real-time sync across all users (Supabase Realtime)
- Search and priority filtering
- Ticket detail view
- Works offline in local mode (no Supabase needed)
