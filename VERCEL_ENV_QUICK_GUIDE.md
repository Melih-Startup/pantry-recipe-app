# Quick Guide: Set Environment Variables on Vercel

## Step-by-Step Instructions

### Step 1: Go to Your Vercel Dashboard
1. Open https://vercel.com
2. Sign in to your account
3. Click on your **pantry-recipe-app** project

### Step 2: Navigate to Settings
1. Click **Settings** in the top menu bar
2. In the left sidebar, click **Environment Variables**

### Step 3: Add Email Variables

Click the **"Add"** or **"Add New"** button and add these one by one:

---

#### Variable 1: EMAIL_USER

**Key (Name):**
```
EMAIL_USER
```

**Value:**
```
your-email@gmail.com
```
*(The email address you want to send FROM - can be your new separate account)*

**Environment:**
- ☑ Production
- ☑ Preview  
- ☑ Development

Click **Save**

---

#### Variable 2: EMAIL_PASSWORD

**Key (Name):**
```
EMAIL_PASSWORD
```

**Value:**
```
your-16-character-app-password
```
*(NOT your regular password! It's a Gmail App Password)*

**How to get Gmail App Password:**
1. Go to: https://myaccount.google.com/apppasswords
2. Enable 2-Step Verification first (if not already enabled)
3. Select "Mail" → "Other (Custom name)" → Type "Pantry Pal"
4. Copy the 16-character password (remove spaces)

**Environment:**
- ☑ Production
- ☑ Preview
- ☑ Development

Click **Save**

---

#### Variable 3: EMAIL_SERVICE (Optional)

**Key (Name):**
```
EMAIL_SERVICE
```

**Value:**
```
gmail
```
*(Options: `gmail`, `outlook`, `yahoo`)*

**Environment:**
- ☑ Production
- ☑ Preview
- ☑ Development

Click **Save**

---

## Visual Example

When you click "Add", you'll see a form like this:

```
┌─────────────────────────────────────────┐
│ Key                                      │
│ ┌─────────────────────────────────────┐ │
│ │ EMAIL_USER                            │ │
│ └─────────────────────────────────────┘ │
│                                           │
│ Value                                     │
│ ┌─────────────────────────────────────┐ │
│ │ pantrypal.app@gmail.com              │ │
│ └─────────────────────────────────────┘ │
│                                           │
│ Environment                                │
│ ☑ Production                              │
│ ☑ Preview                                 │
│ ☑ Development                             │
│                                           │
│ [Cancel]              [Save]              │
└─────────────────────────────────────────┘
```

---

## After Adding Variables

### Important: Redeploy Your App!

1. Go to the **Deployments** tab (top menu)
2. Find your latest deployment
3. Click the **three dots (⋯)** on the right
4. Click **Redeploy**
5. Wait for deployment to complete (1-2 minutes)

**Why?** Vercel only loads environment variables when deploying. Adding new variables won't affect running deployments until you redeploy.

---

## Complete List of Variables You Might Need

### Required for Email:
- ✅ `EMAIL_USER` - Your sending email address
- ✅ `EMAIL_PASSWORD` - Gmail App Password
- ✅ `EMAIL_SERVICE` - `gmail`, `outlook`, or `yahoo`

### Other Common Variables:
- `DATABASE_URL` - Your Supabase/Postgres connection string
- `GROQ_API_KEY` - For AI features (if using)
- `JWT_SECRET` - Secret key for authentication tokens
- `ADMIN_EMAIL` - Admin email (optional)

---

## Quick Checklist

After setting up email variables:

- [ ] Added `EMAIL_USER`
- [ ] Added `EMAIL_PASSWORD` (Gmail App Password, not regular password)
- [ ] Added `EMAIL_SERVICE` (optional, defaults to `gmail`)
- [ ] Checked all three environments (Production, Preview, Development)
- [ ] Clicked Save for each variable
- [ ] Redeployed the app
- [ ] Tested email verification on your live site

---

## Troubleshooting

### Variables not working?
- ✅ Did you redeploy after adding variables? (This is required!)
- ✅ Did you check all three environments?
- ✅ Are you using a Gmail App Password (not your regular password)?

### Can't find the Settings page?
- Make sure you're logged into Vercel
- Make sure you're in the correct project
- Look for "Settings" in the top navigation bar

### Need to edit a variable?
- Go to Settings → Environment Variables
- Click on the variable name
- Edit the value
- Click Save
- **Redeploy** your app

---

## Security Note

Once you save a variable, the value will be hidden (shown as dots: ••••) for security. This is normal!

You can still edit it by clicking on the variable name.

