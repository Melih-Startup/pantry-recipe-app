# How to Find Your Supabase Keys

## Step-by-Step Guide

### Step 1: Go to Supabase Dashboard
1. Open your browser and go to: **https://app.supabase.com**
2. Sign in to your account

### Step 2: Select Your Project
1. You'll see a list of your projects
2. Click on the **pantry-recipe-app** project (or whatever you named it)

### Step 3: Navigate to API Settings
1. In the left sidebar, click on **Settings** (gear icon at the bottom)
2. Then click on **API** in the settings menu

### Step 4: Find Your Keys
You'll see a page with several sections. Look for:

#### **Project URL**
- Located at the top, labeled "Project URL"
- Looks like: `https://xxxxxxxxxxxxx.supabase.co`
- Copy this entire URL

#### **Project API keys**
- Scroll down to find "Project API keys" section
- You'll see several keys:
  - **`anon` `public`** - This is the one you need! ✅
  - `service_role` `secret` - DO NOT use this one (it's for backend only)
  
### Step 5: Copy the Keys
1. Copy the **Project URL** (the full URL starting with https://)
2. Copy the **anon public** key (it's a long string of characters)

### Step 6: Add to Your .env File
Create a file named `.env` in your project root and add:

```
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlvdXItcmVmIiwicm9sZSI6ImFub24iLCJpYXQiOjE2NDUxOTIwMDAsImV4cCI6MTk2MDc2ODAwMH0.your-actual-key-here
```

Replace with your actual values!

## Visual Guide

```
Supabase Dashboard
├── Projects List
│   └── [Your Project] ← Click here
│       ├── Table Editor
│       ├── SQL Editor
│       ├── Authentication
│       └── Settings ← Click here
│           ├── General
│           ├── API ← Click here (THIS IS WHERE YOU FIND THE KEYS!)
│           ├── Database
│           └── ...
```

## What is the "anon" key?

- **anon** = anonymous/public key
- It's safe to use in frontend code (browser)
- It respects your Row Level Security (RLS) policies
- It allows your app to read/write data according to your database rules
- It's different from the `service_role` key (which bypasses security - only for backend)

## Security Note

✅ **Safe to use in frontend:** The anon key is designed to be public
❌ **Never expose:** The service_role key (keep it secret, backend only)

## Troubleshooting

**Can't find the API section?**
- Make sure you're logged in
- Make sure you've selected your project
- Look for "Settings" in the left sidebar (usually at the bottom)

**The key looks weird?**
- It should be a very long string (JWT token)
- It starts with `eyJ...` usually
- Copy the entire key, including all characters

**Still having trouble?**
- Try refreshing the page
- Make sure you have access to the project
- Check if you're in the correct Supabase organization








