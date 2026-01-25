# Supabase Setup Guide (Free Alternative to Vercel Postgres)

Since Vercel Postgres requires a paid plan or has marketplace restrictions, we'll use **Supabase** which is completely free and works perfectly with Vercel.

## Step 1: Create Supabase Account

1. Go to https://supabase.com
2. Click "Start your project"
3. Sign up with GitHub (recommended) or email
4. Create a new organization (if prompted)
5. Click "New Project"

## Step 2: Create Your Project

1. **Project Name**: `pantry-recipe-app` (or any name)
2. **Database Password**: Create a strong password (save it!)
3. **Region**: Choose closest to you
4. **Pricing Plan**: Free (select "Free tier")
5. Click "Create new project"

Wait 2-3 minutes for the project to be created.

## Step 3: Get Your Connection String

### Method 1: "Connect" Button (Easiest - New UI)
1. In your Supabase project dashboard, look for a **"Connect"** button in the top bar/menu
2. Click **"Connect"** - this opens a panel with all connection details
3. Look for **"Connection string"** or **"URI"**
4. Copy the connection string (it looks like: `postgresql://postgres:[YOUR-PASSWORD]@db.xxxxx.supabase.co:5432/postgres`)
5. Replace `[YOUR-PASSWORD]` with the password you created in Step 2

### Method 2: Settings → Database (If Connect button not visible)
1. In your Supabase project dashboard, go to **Settings** (gear icon ⚙️)
2. Click **Database** in the left sidebar
3. Scroll down and look for:
   - **Connection string** section, OR
   - **Connection info** section, OR
   - **Connection parameters** section
4. You might see connection pooling options - use **Session mode** if available
5. Copy the connection string
6. Replace `[YOUR-PASSWORD]` with your actual database password

### Method 3: Build It Manually (If you can't find the string)
1. Go to **Settings** → **Database**
2. Find these values:
   - **Host**: `db.xxxxx.supabase.co` (or similar)
   - **Database name**: Usually `postgres`
   - **Port**: Usually `5432`
   - **User**: Usually `postgres`
   - **Password**: The password you set when creating the project
3. Build it like this:
   ```
   postgresql://postgres:YOUR_PASSWORD@HOST:5432/postgres
   ```
   Example: `postgresql://postgres:MyPassword123@db.abcdefghijklmnop.supabase.co:5432/postgres`

## Step 4: Set Up Database Tables

1. In Supabase dashboard, go to **SQL Editor** (left sidebar)
2. Click **New query**
3. Copy and paste this SQL:

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

4. Click **Run** (or press Ctrl+Enter)
5. You should see "Success. No rows returned"

## Step 5: Set Environment Variables in Vercel

1. Go to your Vercel project dashboard
2. Click **Settings** → **Environment Variables**
3. Add these variables:

### Required:
- **Name**: `DATABASE_URL`
- **Value**: Your Supabase connection string from Step 3
- **Environment**: Production, Preview, Development (select all)

### Also add these (if not already set):
- **Name**: `GROQ_API_KEY`
- **Value**: Your Groq API key
- **Environment**: All

- **Name**: `JWT_SECRET`
- **Value**: A random secure string (e.g., generate one at https://randomkeygen.com)
- **Environment**: All

- **Name**: `EMAIL_USER`
- **Value**: Your Gmail address
- **Environment**: All

- **Name**: `EMAIL_PASSWORD`
- **Value**: Your Gmail app password
- **Environment**: All

## Step 6: Install Dependencies

The code will automatically detect Supabase when `DATABASE_URL` is set. Make sure you have the `pg` package installed:

```bash
npm install pg
```

## Step 7: Deploy

1. Push your code to GitHub (if not already)
2. Vercel will automatically redeploy
3. Or manually redeploy from Vercel dashboard

## That's It! 🎉

Your app should now work on Vercel with Supabase as the database.

## Troubleshooting

**Connection errors?**
- Double-check your connection string has the correct password
- Make sure you're using "Session mode" connection string (not Transaction mode)
- Verify the `DATABASE_URL` environment variable is set in Vercel

**Tables not found?**
- Go back to Supabase SQL Editor and run the table creation SQL again
- Check the "Table Editor" in Supabase to see if tables exist

**Still having issues?**
- Check Vercel function logs: Vercel Dashboard → Your Project → Functions → View logs
- Check Supabase logs: Supabase Dashboard → Logs → Postgres Logs

