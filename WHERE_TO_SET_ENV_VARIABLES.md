# Where to Set Environment Variables

## Quick Answer:

- **Local Development** → Set in `.env` file in your project folder
- **Vercel (Production)** → Set in Vercel dashboard
- **Supabase** → You DON'T set variables here, you just GET the connection string from here

---

## 1. For Local Development (Right Now)

**Location:** `.env` file in your project folder

**What to add:**
```env
# Get this from Supabase: Settings → Database → Connection string → URI
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@db.xckyjiuplffowkqybqdh.supabase.co:5432/postgres

# Optional: For AI recipe generation
GROQ_API_KEY=your-groq-api-key-here

# Optional: For authentication
JWT_SECRET=your-random-secret-key-here
```

**Steps:**
1. Open `.env` file in your project
2. Add `DATABASE_URL` (get the connection string from Supabase - see below)
3. Save the file
4. Restart server: `npm start`

---

## 2. For Vercel (When Deploying)

**Location:** Vercel Dashboard → Your Project → Settings → Environment Variables

**Steps:**
1. Go to https://vercel.com
2. Sign in and select your project
3. Go to **Settings** → **Environment Variables**
4. Click **"Add"** for each variable:
   - `DATABASE_URL` (from Supabase)
   - `GROQ_API_KEY` (if you use AI features)
   - `JWT_SECRET` (for authentication)
5. Check all environments: **Production**, **Preview**, **Development**
6. Click **Save**

**Important:** After adding variables, you need to **redeploy** your app for them to take effect.

---

## 3. Getting DATABASE_URL from Supabase

**You DON'T set variables in Supabase** - you just copy the connection string:

1. Go to https://app.supabase.com
2. Click your project
3. Go to **Settings** → **Database**
4. Scroll to **Connection string**
5. Select **URI** (not "Session mode")
6. Copy the string - it looks like:
   ```
   postgresql://postgres:[YOUR-PASSWORD]@db.xckyjiuplffowkqybqdh.supabase.co:5432/postgres
   ```
7. Replace `[YOUR-PASSWORD]` with your actual database password
8. Use this in your `.env` file or Vercel

**If you forgot your database password:**
- Go to **Settings** → **Database**
- Look for **Database password** section
- You can reset it if needed

---

## Summary

| Where | What | When |
|-------|------|------|
| `.env` file | Set all variables | Local development (right now) |
| Vercel Dashboard | Set all variables | Production deployment |
| Supabase | Get connection string only | Both local and Vercel |

---

## Right Now (Local Development):

1. ✅ Get `DATABASE_URL` from Supabase (Settings → Database → Connection string → URI)
2. ✅ Add it to your `.env` file
3. ✅ Restart server: `npm start`
4. ✅ Your app will connect to Supabase!








