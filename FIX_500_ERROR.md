# Fix: Serverless Function Crashed (500 Error)

This error means your function crashed when trying to run. Here's how to fix it:

## Step 1: Check Function Logs (Most Important!)

1. Go to **Vercel Dashboard** → Your Project
2. Click **Deployments** tab
3. Click on the **latest deployment** (the one with the error)
4. Click **Functions** tab (or look for function logs)
5. Click on **`api/index`** (or the function that's failing)
6. Scroll down to see **Logs**
7. **Copy the error message** - this tells us exactly what's wrong!

Common errors you'll see:

### "DATABASE_URL not configured"
**Fix:** Make sure `DATABASE_URL` environment variable is set in Vercel

### "Cannot find module 'pg'"
**Fix:** The `pg` package isn't installed or wasn't deployed

### "Connection timeout" or "Connection refused"
**Fix:** Database connection issue - check your `DATABASE_URL`

### "relation 'users' does not exist"
**Fix:** Tables don't exist in Supabase - run the SQL from `SUPABASE_SETUP.md`

## Step 2: Most Common Fixes

### Fix 1: Install and Deploy `pg` Package

Make sure `pg` is installed and in your code:

```bash
npm install pg
```

Then:
- If using GitHub: Push your code (Vercel will rebuild)
- If not: You may need to manually redeploy or add it to package.json

### Fix 2: Verify Environment Variables

1. Go to **Settings** → **Environment Variables**
2. Make sure you have:
   - ✅ `DATABASE_URL` - Your Supabase connection string
   - ✅ `GROQ_API_KEY` - Your Groq API key
   - ✅ `JWT_SECRET` - A random string
3. Make sure all are set for **Production, Preview, and Development**

### Fix 3: Redeploy After Setting Variables

**This is critical!** Environment variables only take effect after redeploy:

1. **Deployments** tab
2. Click **⋯** (three dots) on latest deployment
3. Click **Redeploy**

### Fix 4: Check Database Connection String

Your `DATABASE_URL` should:
- ✅ Start with `postgresql://`
- ✅ Have your actual password (not `[YOUR-PASSWORD]`)
- ✅ Be one continuous string (no line breaks)
- ✅ Look like: `postgresql://postgres:PASSWORD@db.xxxxx.supabase.co:5432/postgres`

### Fix 5: Create Tables in Supabase

1. Go to Supabase → Your Project → **SQL Editor**
2. Run this SQL:

```sql
-- Create users table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password TEXT,
    name TEXT,
    provider TEXT,
    provider_id TEXT,
    is_admin INTEGER DEFAULT 0,
    email_verified INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(provider, provider_id)
);

-- Create verification_codes table
CREATE TABLE IF NOT EXISTS verification_codes (
    id SERIAL PRIMARY KEY,
    email TEXT NOT NULL,
    code TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL,
    used INTEGER DEFAULT 0
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_provider ON users(provider, provider_id);
CREATE INDEX IF NOT EXISTS idx_verification_codes_email ON verification_codes(email);
```

3. Click **Run**

## Step 3: Verify Your Setup

Run through this checklist:

- [ ] `DATABASE_URL` is set in Vercel environment variables
- [ ] `GROQ_API_KEY` is set in Vercel environment variables
- [ ] `JWT_SECRET` is set in Vercel environment variables
- [ ] All variables are set for **all environments** (Production, Preview, Development)
- [ ] You **redeployed** after setting variables
- [ ] `pg` package is in `package.json` (run `npm list pg` to check)
- [ ] Tables exist in Supabase (check Table Editor)
- [ ] Your `DATABASE_URL` has the correct password

## Step 4: Test Locally (Optional)

To test if the code works:

```bash
npm install
npm start
```

This will use SQLite locally (which is fine for testing).

## What to Share

When asking for help, share:

1. **The exact error from function logs** (Step 1)
2. **Your `DATABASE_URL` format** (without the password! Just show the structure)
3. **Whether you redeployed** after setting env vars
4. **Whether `pg` is in package.json** (run `npm list pg`)

## Still Not Working?

1. Check function logs first (Step 1) - that's where the real error is
2. Make sure you redeployed after setting environment variables
3. Verify all environment variables are set correctly
4. Check that tables exist in Supabase

The error message in the logs will tell you exactly what's wrong!




