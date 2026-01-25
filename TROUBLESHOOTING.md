# Troubleshooting: Domain Not Working

## Quick Checklist

### 1. Did You Redeploy After Setting Environment Variables? ⚠️ IMPORTANT!

**Environment variables only take effect after redeploying!**

1. Go to Vercel Dashboard → Your Project → **Deployments** tab
2. Click the **⋯** (three dots) on the **latest deployment**
3. Click **"Redeploy"**
4. Wait for it to finish (usually 1-2 minutes)

### 2. Check Deployment Status

1. Go to **Deployments** tab in Vercel
2. Look at the **latest deployment**:
   - ✅ Green checkmark = Success
   - ❌ Red X = Failed (click it to see errors)
   - 🟡 Yellow = Building (wait)

### 3. Check Function Logs (Most Important!)

This will show you what error is happening:

1. Go to **Deployments** tab
2. Click on the **latest deployment**
3. Click **"Functions"** tab (or look for function logs)
4. Click on a function (like `api/index`)
5. Look at the **"Logs"** section
6. **Copy any error messages** you see

Common errors you might see:
- `DATABASE_URL not configured` = Environment variable not set or not redeployed
- `Connection timeout` = Database connection issue
- `Table doesn't exist` = Need to run SQL in Supabase
- `Module not found` = Missing dependencies

### 4. Check Environment Variables Were Saved

1. Go to **Settings** → **Environment Variables**
2. Verify `DATABASE_URL` is listed
3. Make sure it's set for **all environments** (Production, Preview, Development)
4. The value should show as dots (••••) - that's normal for security

### 5. Test Your Connection String

Make sure your `DATABASE_URL`:
- ✅ Starts with `postgresql://`
- ✅ Has your actual password (not `[YOUR-PASSWORD]`)
- ✅ Is one continuous string (no line breaks)
- ✅ Is set for Production, Preview, and Development

### 6. Verify Supabase Tables Exist

1. Go to Supabase Dashboard → Your Project
2. Click **Table Editor** in left sidebar
3. You should see:
   - `users` table
   - `verification_codes` table
4. If tables don't exist:
   - Go to **SQL Editor**
   - Run the table creation SQL from `SUPABASE_SETUP.md`

### 7. Check Browser Console

1. Open your Vercel domain
2. Press `F12` (or Right-click → Inspect)
3. Go to **Console** tab
4. Look for any JavaScript errors

## Common Error Messages & Fixes

### Error: "DATABASE_URL not configured"
**Fix:**
- Go to Vercel → Settings → Environment Variables
- Make sure `DATABASE_URL` exists
- **Redeploy** your app

### Error: "Connection timeout" or "Cannot connect to database"
**Fix:**
- Verify your `DATABASE_URL` has the correct password
- Check Supabase project is active (not paused)
- Make sure you're using "Session mode" connection string

### Error: "relation 'users' does not exist"
**Fix:**
- Go to Supabase → SQL Editor
- Run the table creation SQL from `SUPABASE_SETUP.md`

### Error: "Module not found: 'pg'"
**Fix:**
- Make sure you ran `npm install pg`
- Push your code to GitHub (so Vercel rebuilds with the package)

### Error: "Function has crashed"
**Fix:**
- Check function logs (Step 3 above)
- Look for the specific error message
- Common causes: Missing env var, database connection, code error

## Step-by-Step Debugging

1. **Check deployment status** → Is it successful?
2. **If failed** → Click on it to see the error
3. **If successful** → Check function logs
4. **Check environment variables** → Are they set correctly?
5. **Redeploy** → Always redeploy after adding env vars!
6. **Check browser** → What error shows on the page?
7. **Check console** → F12 → Console tab for JS errors

## Still Not Working?

Share these details:
1. What error message shows on the page? (screenshot if possible)
2. What do the Vercel function logs say? (from Step 3)
3. What's the deployment status? (green ✅ or red ❌)
4. Did you redeploy after setting environment variables?

## Quick Test

Try visiting these URLs:
- Your main domain: `https://your-app.vercel.app`
- An API endpoint: `https://your-app.vercel.app/api/auth/providers`

If the API endpoint works but the main page doesn't, it's likely a frontend issue.
If both don't work, it's likely a server/deployment issue.




