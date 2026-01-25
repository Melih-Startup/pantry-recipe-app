# Quick Guide: Finding Supabase Connection String

## 🎯 Fastest Way

1. **Look for "Connect" button** in the top bar of your Supabase project dashboard
2. Click it → Connection string is right there!

## 🔍 Alternative Locations

If you don't see "Connect" button:

1. **Settings** (⚙️) → **Database** → Scroll down to find connection info
2. **Project Settings** → **Database** → Connection string section
3. **Settings** → **API** → Sometimes shows database URL

## 📝 What It Looks Like

Your connection string will look like:
```
postgresql://postgres:[YOUR-PASSWORD]@db.xxxxx.supabase.co:5432/postgres
```

**Important**: Replace `[YOUR-PASSWORD]` with your actual database password (the one you created when setting up the project).

## ✅ For Vercel

Use **Session mode** connection pooling if available (better for serverless):
```
postgresql://postgres.xxxxx:[PASSWORD]@aws-0-us-east-1.pooler.supabase.com:6543/postgres
```

## 🆘 Still Can't Find It?

1. Check if your project is still provisioning (wait 2-3 minutes)
2. Try refreshing the page
3. Use Method 3 from SUPABASE_SETUP.md to build it manually from connection parameters




