# Debug Checklist - Step by Step

Let's go through this systematically to find the exact problem:

## ✅ Step 1: Get the Actual Error Message

**This is the most important step!** Without the error message, we're just guessing.

### How to see the error:

1. Go to **https://vercel.com** → Your Project
2. Click **Deployments** tab (top menu)
3. Find the **latest deployment** (should show the error)
4. **Click on that deployment** (not just hover - actually click it)
5. Look for **"Functions"** or **"Runtime Logs"** tab
6. Click on **`api/index`** or **`api`** function
7. Scroll to see the **logs/errors**

**What you're looking for:**
- Red error messages
- Stack traces
- Something like "Error:", "Cannot find", "Connection", etc.

**Please copy/paste the exact error message here!**

---

## ✅ Step 2: Verify Environment Variables

1. Go to **Settings** → **Environment Variables**
2. Verify these exist (check all three):
   - [ ] `DATABASE_URL` - Should have your Supabase connection string
   - [ ] `GROQ_API_KEY` - Should have your API key
   - [ ] `JWT_SECRET` - Should have a random string
3. Make sure they're enabled for:
   - [ ] Production ✅
   - [ ] Preview ✅
   - [ ] Development ✅

---

## ✅ Step 3: Did You Redeploy?

**Environment variables only work after redeploy!**

1. Did you click **Redeploy** after setting environment variables?
   - If NO: Go to Deployments → Click ⋯ (three dots) → Redeploy
   - If YES: Skip this step

---

## ✅ Step 4: Check Database Connection String

Your `DATABASE_URL` should:
- ✅ Start with `postgresql://`
- ✅ Have your actual password (not `[YOUR-PASSWORD]`)
- ✅ Be one continuous string (no spaces or line breaks)
- ✅ Look like: `postgresql://postgres:PASSWORD@db.xxxxx.supabase.co:5432/postgres`

**Quick test:** Can you access your Supabase dashboard? Is the project active?

---

## ✅ Step 5: Check Supabase Tables

1. Go to **Supabase Dashboard** → Your Project
2. Click **Table Editor** (left sidebar)
3. Do you see:
   - [ ] `users` table?
   - [ ] `verification_codes` table?

**If tables don't exist:**
- Go to **SQL Editor**
- Run the SQL from `SUPABASE_SETUP.md` (Step 4)

---

## ✅ Step 6: Check Code is Deployed

1. Is your code on **GitHub**?
   - If YES: Make sure you pushed the latest code (with `pg` package)
   - If NO: Did you manually deploy?

2. Check if `package.json` includes `pg`:
   - Look in Vercel: Go to **Settings** → **General** → Check **Root Directory**
   - Or check GitHub: Does your `package.json` have `"pg": "^8.x.x"`?

---

## ✅ Step 7: Test Locally (Optional)

Try running it locally to see if it works:

```bash
npm install
npm start
```

If it works locally but not on Vercel, it's likely:
- Environment variables not set
- Missing `pg` package in deployment
- Database connection issue

---

## 🎯 Most Common Issues

### Issue A: "Cannot find module 'pg'"
**Fix:** Push your code to GitHub or ensure `pg` is in `package.json`

### Issue B: "DATABASE_URL is not defined"
**Fix:** Set environment variable and redeploy

### Issue C: "Connection timeout"
**Fix:** Check your `DATABASE_URL` password is correct

### Issue D: "relation 'users' does not exist"
**Fix:** Run SQL in Supabase to create tables

### Issue E: Code error in server.js
**Fix:** Check function logs for the exact error line

---

## 📝 What I Need From You

To help you better, please share:

1. **The exact error message from function logs** (Step 1)
2. **Screenshot or copy of the error** (if possible)
3. **Did you redeploy after setting env vars?** (Yes/No)
4. **Do you see tables in Supabase?** (Yes/No)
5. **Is your code on GitHub?** (Yes/No)

The error message will tell us exactly what's wrong!




