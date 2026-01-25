# What is DATABASE_URL?

The `DATABASE_URL` is your **Supabase connection string** - it's the address/credentials that tells your app how to connect to your Supabase database.

## What It Looks Like

Your `DATABASE_URL` will look like one of these:

### Format 1: Direct Connection
```
postgresql://postgres:YOUR_PASSWORD@db.xxxxx.supabase.co:5432/postgres
```

### Format 2: Connection Pooling (Recommended for Vercel)
```
postgresql://postgres.xxxxx:YOUR_PASSWORD@aws-0-us-east-1.pooler.supabase.com:6543/postgres
```

## Breaking It Down

- `postgresql://` - Protocol (tells it to use PostgreSQL)
- `postgres` - Database username (usually "postgres")
- `YOUR_PASSWORD` - Your database password (the one you created in Supabase)
- `@db.xxxxx.supabase.co` - Your Supabase server address
- `:5432` or `:6543` - Port number
- `/postgres` - Database name (usually "postgres")

## Where to Find It

### Option 1: "Connect" Button
1. Go to your Supabase project dashboard
2. Look for a **"Connect"** button in the top bar
3. Click it - the connection string is shown there

### Option 2: Settings → Database
1. Go to **Settings** (⚙️) → **Database**
2. Scroll down to find:
   - **Connection string** section, OR
   - **Connection info**, OR  
   - **Connection pooling** section
3. Copy the connection string

### Option 3: Build It Manually
If you can see connection parameters but not the full string:

1. In **Settings** → **Database**, find:
   - **Host**: `db.xxxxx.supabase.co`
   - **Database**: `postgres`
   - **Port**: `5432` (or `6543` for pooling)
   - **User**: `postgres`
   - **Password**: The password you created when setting up Supabase

2. Build it like this:
   ```
   postgresql://postgres:YOUR_PASSWORD@HOST:PORT/postgres
   ```

   **Example:**
   ```
   postgresql://postgres:MyPassword123@db.abcdefghijklmnop.supabase.co:5432/postgres
   ```

## Important: Replace the Password!

When you copy the connection string from Supabase, it might look like:
```
postgresql://postgres:[YOUR-PASSWORD]@db.xxxxx.supabase.co:5432/postgres
```

**You MUST replace `[YOUR-PASSWORD]` with your actual database password!**

**Example:**
- ❌ Wrong: `postgresql://postgres:[YOUR-PASSWORD]@db.xxxxx.supabase.co:5432/postgres`
- ✅ Correct: `postgresql://postgres:MyActualPassword123@db.xxxxx.supabase.co:5432/postgres`

## Which One to Use?

For **Vercel** (serverless), use **Session mode** connection pooling if available:
- Better performance
- Handles many connections
- Designed for serverless

It will look like:
```
postgresql://postgres.xxxxx:YOUR_PASSWORD@aws-0-us-east-1.pooler.supabase.com:6543/postgres
```

## Quick Example

If your Supabase:
- Host: `db.abcdefghijklmnop.supabase.co`
- Password: `MySecurePassword!123`
- Port: `5432`

Your DATABASE_URL would be:
```
postgresql://postgres:MySecurePassword!123@db.abcdefghijklmnop.supabase.co:5432/postgres
```

## Copy-Paste This to Vercel

1. Copy your full connection string (with password replaced)
2. Go to Vercel → Your Project → Settings → Environment Variables
3. Add new variable:
   - **Name**: `DATABASE_URL`
   - **Value**: Paste your connection string here
   - **Environment**: Check all (Production, Preview, Development)
4. Click Save

## Test It Works

Your connection string should:
- ✅ Start with `postgresql://`
- ✅ Contain your actual password (not `[YOUR-PASSWORD]`)
- ✅ Contain a valid Supabase host (`db.xxxxx.supabase.co` or `.pooler.supabase.com`)
- ✅ Be one continuous string (no line breaks)

## Still Confused?

1. **Go to Supabase** → Your Project → Settings → Database
2. **Look for any connection info** - it might say "Connection string", "URI", or show connection parameters
3. **If you see parameters separately**, build it using: `postgresql://postgres:PASSWORD@HOST:PORT/postgres`

The connection string is essentially the "address" to your database - just like a web URL is an address to a website!




