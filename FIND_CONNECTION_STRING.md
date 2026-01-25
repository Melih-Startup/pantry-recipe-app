# How to Find Your Supabase Connection String

The connection string location can vary depending on your Supabase dashboard version. Here are all the ways to find it:

## Method 1: Settings → Database (Most Common)

1. In your Supabase project dashboard, click **Settings** (gear icon ⚙️) in the left sidebar
2. Click **Database** 
3. Look for one of these sections:
   - **Connection string** (scroll down)
   - **Connection info**
   - **Connection parameters**
   - **Database URL**

4. You should see something like:
   ```
   postgresql://postgres:[YOUR-PASSWORD]@db.xxxxx.supabase.co:5432/postgres
   ```

## Method 2: Project Settings → Database

1. Click on your **project name** at the top
2. Go to **Project Settings**
3. Click **Database** in the left menu
4. Look for **Connection string** or **Connection info**

## Method 3: API Settings

1. Go to **Settings** → **API** (instead of Database)
2. Look for **Database URL** or **Connection string**
3. Sometimes it's under **Config** section

## Method 4: Build It Manually

If you can't find the connection string, you can build it from the connection parameters:

1. Go to **Settings** → **Database**
2. Look for these values:
   - **Host**: `db.xxxxx.supabase.co` (or similar)
   - **Database name**: Usually `postgres`
   - **Port**: Usually `5432`
   - **User**: Usually `postgres`
   - **Password**: The password you set when creating the project

3. Build the connection string like this:
   ```
   postgresql://postgres:YOUR_PASSWORD@HOST:5432/postgres
   ```

   Example:
   ```
   postgresql://postgres:MyPassword123@db.abcdefghijklmnop.supabase.co:5432/postgres
   ```

## Method 5: Use Connection Pooling (Recommended for Vercel)

1. Go to **Settings** → **Database**
2. Look for **Connection pooling** section
3. You should see:
   - **Session mode** connection string
   - **Transaction mode** connection string
4. **Use Session mode** for Vercel (it's better for serverless)

The connection pooling string looks like:
```
postgresql://postgres.xxxxx:[YOUR-PASSWORD]@aws-0-us-east-1.pooler.supabase.com:6543/postgres
```

## Method 6: Check Project Overview

1. Sometimes the connection info is on the main **Project Overview** page
2. Look for a **Database** card or section
3. Click "Show connection string" or similar button

## What to Look For

The connection string will look like one of these formats:

**Direct connection:**
```
postgresql://postgres:[PASSWORD]@db.xxxxx.supabase.co:5432/postgres
```

**Connection pooling (Session mode - recommended):**
```
postgresql://postgres.xxxxx:[PASSWORD]@aws-0-us-east-1.pooler.supabase.com:6543/postgres
```

## Important Notes

- Replace `[PASSWORD]` or `[YOUR-PASSWORD]` with your actual database password
- For Vercel, use **Session mode** connection pooling if available (better for serverless)
- The password is the one you created when setting up the Supabase project (not your Supabase account password)

## Still Can't Find It?

1. **Check if your project is fully set up** - It might still be provisioning (wait a few minutes)
2. **Try a different browser** - Sometimes UI elements don't load properly
3. **Check Supabase status** - Go to status.supabase.com to see if there are any issues
4. **Use the manual method** - Build it from the connection parameters shown in Settings → Database

## Quick Test

Once you have the connection string, you can test it by:
1. Copying it to a text editor
2. Replacing `[YOUR-PASSWORD]` with your actual password
3. It should look like: `postgresql://postgres:actualpassword123@db.xxxxx.supabase.co:5432/postgres`

If you can see your project dashboard but can't find the connection string, try taking a screenshot of your Settings → Database page and I can help you locate it!




