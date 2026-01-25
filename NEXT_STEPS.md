# Next Steps After Supabase Setup ✅

You've created your Supabase account! Here's what to do next:

## ✅ Step 1: Create Database Tables in Supabase

1. Go to your Supabase project dashboard
2. Click **SQL Editor** in the left sidebar
3. Click **New query**
4. Copy and paste this SQL code:

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

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_provider ON users(provider, provider_id);
CREATE INDEX IF NOT EXISTS idx_verification_codes_email ON verification_codes(email);
```

5. Click **Run** (or press Ctrl+Enter)
6. You should see "Success. No rows returned" ✅

## ✅ Step 2: Get Your Connection String

1. In Supabase dashboard, go to **Settings** (gear icon) → **Database**
2. Scroll down to **Connection string**
3. Under **Connection pooling**, select **Session mode**
4. Copy the connection string (looks like: `postgresql://postgres:[YOUR-PASSWORD]@db.xxxxx.supabase.co:5432/postgres`)
5. **Important**: Replace `[YOUR-PASSWORD]` with the database password you created when setting up the project

## ✅ Step 3: Set Environment Variables in Vercel

**👉 See [VERCEL_ENV_VARIABLES.md](./VERCEL_ENV_VARIABLES.md) for detailed step-by-step instructions with screenshots guidance.**

Quick steps:
1. Go to https://vercel.com and open your project
2. Click **Settings** (top menu) → **Environment Variables** (left sidebar)
3. Click **"Add"** or **"Add New"** button
4. Add these variables (one at a time):

### Required Variables:

**1. DATABASE_URL**
- **Name**: `DATABASE_URL`
- **Value**: Your Supabase connection string from Step 2 (with password replaced)
- **Environment**: ✅ Production, ✅ Preview, ✅ Development (check all three)

**2. GROQ_API_KEY**
- **Name**: `GROQ_API_KEY`
- **Value**: Your Groq API key from https://console.groq.com/ (starts with `gsk_`)
- **Environment**: ✅ All

**3. JWT_SECRET**
- **Name**: `JWT_SECRET`
- **Value**: Generate a random string at https://randomkeygen.com (use the "CodeIgniter Encryption Keys" - copy one)
- **Environment**: ✅ All

**4. EMAIL_USER** (Optional - for email verification)
- **Name**: `EMAIL_USER`
- **Value**: Your Gmail address
- **Environment**: ✅ All

**5. EMAIL_PASSWORD** (Optional - for email verification)
- **Name**: `EMAIL_PASSWORD`
- **Value**: Your Gmail app password (not your regular password!)
- **Environment**: ✅ All

### OAuth Variables (Optional - only if you're using OAuth):

- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `FACEBOOK_APP_ID`
- `FACEBOOK_APP_SECRET`
- `GITHUB_CLIENT_ID`
- `GITHUB_CLIENT_SECRET`

## ✅ Step 4: Deploy to Vercel

After setting all environment variables:

1. **If your code is on GitHub**: Vercel will automatically redeploy when you push
2. **If not on GitHub**: 
   - Go to Vercel dashboard → Your Project → **Deployments**
   - Click the three dots (⋯) on the latest deployment
   - Click **Redeploy**

## ✅ Step 5: Test Your App

1. Visit your Vercel domain (e.g., `https://your-app.vercel.app`)
2. Try signing up or logging in
3. Check Vercel function logs if there are errors:
   - Vercel Dashboard → Your Project → **Functions** → View logs

## 🎉 That's It!

Your app should now work on Vercel with Supabase!

## Troubleshooting

**"Database not configured" error?**
- Make sure `DATABASE_URL` is set in Vercel environment variables
- Check that the connection string has the correct password (not `[YOUR-PASSWORD]`)

**"Table doesn't exist" error?**
- Go back to Supabase SQL Editor and run the table creation SQL again
- Check Supabase → Table Editor to verify tables exist

**Connection timeout?**
- Make sure you're using "Session mode" connection string (not Transaction mode)
- Check that your Supabase project is active (not paused)

**Need help?**
- Check Vercel logs: Dashboard → Your Project → Functions → Logs
- Check Supabase logs: Dashboard → Logs → Postgres Logs

