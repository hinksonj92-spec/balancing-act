# Balancing Act — Deployment Guide

This guide will walk you through getting the app running on your iPhone. No coding experience needed.

## What You'll Set Up

1. **Supabase** — Your database (where all your data lives). Free tier.
2. **Vercel** — Hosts the web app (makes it accessible from any browser). Free tier.
3. **Your iPhone** — Install as a home screen app.

Total cost: $0/month on free tiers. Handles 1-50 users easily.

---

## Step 1: Create a Supabase Project (10 minutes)

1. Go to [supabase.com](https://supabase.com) and click "Start your project"
2. Sign up with your GitHub account (or email)
3. Click "New Project"
   - Name: `balancing-act`
   - Database Password: generate a strong one and **save it somewhere safe**
   - Region: choose the closest to you (e.g., "West US" if you're in Mountain time)
4. Wait ~2 minutes for the project to be created

### Set up the database:

5. In the left sidebar, click "SQL Editor"
6. Click "New Query"
7. Open the file `supabase/schema.sql` from this project
8. Copy the ENTIRE contents and paste it into the SQL editor
9. Click "Run" (or press Cmd+Enter)
10. You should see "Success. No rows returned." — that means all 15 tables were created

### Get your API keys:

11. In the left sidebar, click "Settings" → "API"
12. Copy these three values (you'll need them in Step 2):
    - **Project URL** (looks like `https://xxxxx.supabase.co`)
    - **anon public** key (starts with `eyJ...`)
    - **service_role** key (starts with `eyJ...` — keep this secret!)

---

## Step 2: Deploy to Vercel (5 minutes)

### Option A: One-Click Deploy (Easiest)

1. Push this project folder to a GitHub repository:
   - Go to [github.com](https://github.com) → New Repository → name it `balancing-act`
   - Follow the instructions to push this code

2. Go to [vercel.com](https://vercel.com) and sign up with GitHub

3. Click "New Project" → Import your `balancing-act` repo

4. Under "Environment Variables", add these three:

   | Name | Value |
   |------|-------|
   | `NEXT_PUBLIC_SUPABASE_URL` | Your Project URL from Step 1 |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Your anon key from Step 1 |
   | `SUPABASE_SERVICE_ROLE_KEY` | Your service_role key from Step 1 |

5. Click "Deploy" — wait ~2 minutes

6. Vercel gives you a URL like `balancing-act-abc123.vercel.app` — that's your app!

### Option B: Vercel CLI

```bash
npm install -g vercel
vercel
# Follow the prompts, add env vars when asked
```

---

## Step 3: Install on Your iPhone (1 minute)

1. Open Safari on your iPhone (must be Safari, not Chrome)
2. Go to your Vercel URL (e.g., `balancing-act-abc123.vercel.app`)
3. Tap the Share button (square with arrow pointing up)
4. Scroll down and tap "Add to Home Screen"
5. Name it "Balance" (or whatever you want)
6. Tap "Add"

The app now appears as an icon on your home screen. When you tap it, it opens fullscreen — no browser bar, just like a real app.

---

## Step 4: Create Your Account

1. Open the app
2. Tap "Sign up"
3. Enter your email and a password
4. You're in! The app starts in demo mode with sample data
5. Your real data begins accumulating from your first check-in

---

## Custom Domain (Optional)

If you want a clean URL like `balance.yourdomain.com`:

1. In Vercel → your project → Settings → Domains
2. Add your custom domain
3. Follow the DNS instructions (add a CNAME record)

---

## Troubleshooting

**"Something went wrong" on login:**
- Check that your Supabase URL and anon key are correct in Vercel env vars
- Make sure you ran the schema.sql in Supabase SQL editor

**App won't install to home screen:**
- Make sure you're using Safari (not Chrome/Firefox)
- The share button is at the bottom of the screen in Safari

**Database error:**
- Go to Supabase → SQL Editor and re-run schema.sql
- Check the "Table Editor" to see if tables were created

---

## What's Next

Once this is running, come back and we'll add:
- Voice input (speak your daily update instead of typing)
- AI-powered metric extraction (natural language understanding)
- Push notifications (daily reminders, streak alerts)
- Data import from your existing Excel tracker
