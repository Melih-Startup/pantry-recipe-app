# How to Create Tables in Supabase

Your pantry and recipe tables don't exist yet. Follow these steps to create them:

## Step 1: Open SQL Editor

1. Go to your Supabase project: https://app.supabase.com
2. Click on **SQL Editor** in the left sidebar
3. Click **"New query"**

## Step 2: Run the SQL Script

1. Open the file `supabase_setup.sql` in this project
2. Copy the entire contents
3. Paste it into the SQL Editor in Supabase
4. Click **"Run"** or press `Ctrl+Enter`

## Step 3: Verify Tables Were Created

1. Go to **Table Editor** in the left sidebar
2. You should now see:
   - `pantry_items` table
   - `recipes` table

## Step 4: Test the App

1. Refresh your app at `https://localhost:3443`
2. Try adding a pantry item
3. It should now save to Supabase!

## What the Script Does:

- Creates `pantry_items` table with columns: id, name, quantity, unit, expiry_date, etc.
- Creates `recipes` table with columns: id, name, description, ingredients, instructions, etc.
- Sets up Row Level Security (RLS) policies to allow access
- Creates indexes for better performance
- Sets up auto-update triggers for `updated_at` fields

## If You Had Data Before:

If you had data in these tables before and they got deleted, you might need to:
1. Check Supabase backups (Settings → Database → Backups)
2. Restore from a backup if available
3. Or manually re-enter your data

## Troubleshooting:

**Error: "permission denied"**
- Make sure you're the project owner or have admin access

**Error: "relation already exists"**
- The tables might already exist with different structure
- Check Table Editor first before running the script

**Tables created but app still doesn't work**
- Check RLS policies are set correctly
- Refresh the app and check browser console for errors








