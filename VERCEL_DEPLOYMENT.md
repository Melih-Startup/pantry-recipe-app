# Vercel Deployment Guide

## ✅ EASY SOLUTION: Use Supabase (Recommended)

Since Vercel Postgres requires a paid plan, we've set up **Supabase** support which is completely free!

**👉 See [SUPABASE_SETUP.md](./SUPABASE_SETUP.md) for step-by-step instructions.**

The app is already configured to automatically use Supabase when you set the `DATABASE_URL` environment variable.

---

## Important: Database Migration Required

⚠️ **SQLite does NOT work on Vercel** because Vercel's filesystem is read-only. You **must** migrate to a cloud database before deploying.

## Quick Fix Options

### Option 1: Vercel Postgres (Recommended)
1. Go to your Vercel project dashboard
2. Navigate to Storage → Create Database → Postgres
3. Copy the connection string
4. Install the Postgres client:
   ```bash
   npm install @vercel/postgres
   ```
5. Update `server.js` to use Postgres instead of SQLite

### Option 2: Supabase (Free tier available)
1. Sign up at https://supabase.com
2. Create a new project
3. Get your connection string from Settings → Database
4. Install: `npm install pg`
5. Update `server.js` to use Supabase Postgres

### Option 3: PlanetScale (MySQL)
1. Sign up at https://planetscale.com
2. Create a database
3. Get connection string
4. Install: `npm install @planetscale/database`
5. Update `server.js` to use PlanetScale

## Current Status

The app has been configured for Vercel serverless functions, but **will crash** until you:
1. Migrate from SQLite to a cloud database
2. Update the database connection code in `server.js`
3. Set all required environment variables in Vercel dashboard

## Environment Variables to Set in Vercel

Go to your Vercel project → Settings → Environment Variables and add:

- `JWT_SECRET` - A secure random string for JWT tokens
- `GROQ_API_KEY` - Your Groq API key (currently hardcoded - move to env var!)
- `EMAIL_USER` - Gmail address for sending emails
- `EMAIL_PASSWORD` - Gmail app password
- `GOOGLE_CLIENT_ID` - (if using Google OAuth)
- `GOOGLE_CLIENT_SECRET` - (if using Google OAuth)
- `FACEBOOK_APP_ID` - (if using Facebook OAuth)
- `FACEBOOK_APP_SECRET` - (if using Facebook OAuth)
- `GITHUB_CLIENT_ID` - (if using GitHub OAuth)
- `GITHUB_CLIENT_SECRET` - (if using GitHub OAuth)
- `ADMIN_EMAIL` - (optional) Admin email for testing

## OAuth Callback URLs

Update your OAuth provider callback URLs to:
- Google: `https://your-domain.vercel.app/api/auth/google/callback`
- Facebook: `https://your-domain.vercel.app/api/auth/facebook/callback`
- GitHub: `https://your-domain.vercel.app/api/auth/github/callback`

## Next Steps

1. **Migrate database** - Choose one of the options above
2. **Update server.js** - Replace SQLite code with your chosen database
3. **Set environment variables** in Vercel dashboard
4. **Deploy** - Push to your connected Git repository or use `vercel deploy`

## Testing Locally

The app still works locally with SQLite. Run:
```bash
npm start
```

The serverless function wrapper (`api/index.js`) is only used on Vercel.

