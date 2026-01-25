# How to Set Environment Variables in Vercel

## Step-by-Step Guide

### Step 1: Go to Your Vercel Project

1. Go to https://vercel.com
2. Sign in to your account
3. Click on your **project name** (the pantry-recipe-app project)

### Step 2: Navigate to Environment Variables

1. Click **Settings** in the top menu (next to Deployments, Analytics, etc.)
2. In the left sidebar, click **Environment Variables**

You should now see a page with:
- A table showing existing environment variables (if any)
- An **"Add"** or **"Add New"** button

### Step 3: Add Each Environment Variable

Click **"Add"** or **"Add New"** for each variable below:

---

## Required Environment Variables

### 1. DATABASE_URL

**Name:**
```
DATABASE_URL
```

**Value:**
```
postgresql://postgres:YOUR_PASSWORD@db.xxxxx.supabase.co:5432/postgres
```
*(Replace YOUR_PASSWORD and the host with your actual Supabase connection string)*

**Environment:**
- ✅ Check **Production**
- ✅ Check **Preview** 
- ✅ Check **Development**

Click **Save**

---

### 2. GROQ_API_KEY

**Name:**
```
GROQ_API_KEY
```

**Value:**
```
your-groq-api-key-here
```
*(Get your API key from https://console.groq.com/ - it will start with `gsk_`)*

**Environment:**
- ✅ Check **Production**
- ✅ Check **Preview**
- ✅ Check **Development**

Click **Save**

---

### 3. JWT_SECRET

**Name:**
```
JWT_SECRET
```

**Value:**
1. Go to https://randomkeygen.com
2. Scroll to **"CodeIgniter Encryption Keys"**
3. Copy one of the keys (it's a long random string)
4. Paste it here

**Environment:**
- ✅ Check **Production**
- ✅ Check **Preview**
- ✅ Check **Development**

Click **Save**

---

## Optional Environment Variables (For Email)

### 4. EMAIL_USER (Optional)

**Name:**
```
EMAIL_USER
```

**Value:**
```
your-email@gmail.com
```
*(Your Gmail address)*

**Environment:**
- ✅ Check **Production**
- ✅ Check **Preview**
- ✅ Check **Development**

Click **Save**

---

### 5. EMAIL_PASSWORD (Optional)

**Name:**
```
EMAIL_PASSWORD
```

**Value:**
```
your-gmail-app-password
```
*(Not your regular Gmail password! It's a 16-character app password)*

**How to get Gmail App Password:**
1. Go to https://myaccount.google.com/apppasswords
2. Enable 2-Step Verification first if needed
3. Generate an App Password for "Mail"
4. Copy the 16-character password

**Environment:**
- ✅ Check **Production**
- ✅ Check **Preview**
- ✅ Check **Development**

Click **Save**

---

## Optional: OAuth Variables (Only if using OAuth)

If you're using Google/Facebook/GitHub login, add these:

### Google OAuth:
- `GOOGLE_CLIENT_ID` = Your Google OAuth client ID
- `GOOGLE_CLIENT_SECRET` = Your Google OAuth secret

### Facebook OAuth:
- `FACEBOOK_APP_ID` = Your Facebook app ID
- `FACEBOOK_APP_SECRET` = Your Facebook app secret

### GitHub OAuth:
- `GITHUB_CLIENT_ID` = Your GitHub OAuth client ID
- `GITHUB_CLIENT_SECRET` = Your GitHub OAuth secret

---

## Visual Guide

When adding a variable, you'll see a form like this:

```
┌─────────────────────────────────────┐
│ Key (name)                           │
│ [DATABASE_URL________________]      │
│                                      │
│ Value                                │
│ [postgresql://postgres:...]         │
│                                      │
│ Environment                          │
│ ☑ Production                         │
│ ☑ Preview                            │
│ ☑ Development                        │
│                                      │
│ [Cancel]  [Save]                     │
┌─────────────────────────────────────┐
```

---

## Important Notes

1. **Always check all three environments** (Production, Preview, Development) unless you have a specific reason not to

2. **After adding variables**, you need to **redeploy**:
   - Go to **Deployments** tab
   - Click the three dots (⋯) on the latest deployment
   - Click **Redeploy**

3. **For DATABASE_URL**: Make sure you replace `[YOUR-PASSWORD]` with your actual Supabase database password

4. **Sensitive values are hidden**: Once saved, the value will show as dots (••••) for security

---

## Quick Checklist

After adding all variables, verify you have:

- [ ] `DATABASE_URL` (Required)
- [ ] `GROQ_API_KEY` (Required)
- [ ] `JWT_SECRET` (Required)
- [ ] `EMAIL_USER` (Optional - for email features)
- [ ] `EMAIL_PASSWORD` (Optional - for email features)
- [ ] OAuth variables (Optional - only if using OAuth)

---

## After Setting Variables

1. **Redeploy your app**:
   - Go to **Deployments** tab
   - Click **⋯** (three dots) on latest deployment
   - Click **Redeploy**

2. **Wait for deployment** to complete (usually 1-2 minutes)

3. **Test your app** by visiting your Vercel domain

4. **Check logs if there are errors**:
   - Go to **Functions** tab
   - Click on a function
   - View logs to see any errors

---

## Troubleshooting

**Variables not working?**
- Make sure you redeployed after adding variables
- Check that all three environments are selected
- Verify the values are correct (especially DATABASE_URL password)

**Can't see the variables?**
- Make sure you're in the correct project
- Check that you have permission to edit settings
- Try refreshing the page

**Need to edit a variable?**
- Click on the variable name in the list
- Edit the value
- Click Save
- Redeploy


