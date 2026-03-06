# Supabase Setup Instructions

To connect your app to Supabase and restore your data:

## 1. Get Your Supabase Credentials

### Detailed Steps:

1. **Go to Supabase Dashboard**
   - Open: https://app.supabase.com
   - Sign in to your account

2. **Select Your Project**
   - Click on your pantry-recipe-app project from the list

3. **Navigate to API Settings**
   - Click **Settings** (gear icon) in the left sidebar
   - Click **API** in the settings menu

4. **Find Your Keys**
   - **Project URL**: At the top of the page, copy the full URL (e.g., `https://abc123xyz.supabase.co`)
   - **anon key**: Scroll down to "Project API keys" section
     - Look for the key labeled **`anon` `public`** (NOT the service_role one!)
     - It's a long string starting with `eyJ...` - copy the entire thing

### What is the "anon" key?
- It's the **public/anonymous** API key
- Safe to use in frontend code (browser)
- It's different from `service_role` (which is secret - don't use that one!)
- See `FIND_SUPABASE_KEYS.md` for more detailed instructions with visual guide

## 2. Create Environment File

Create a file named `.env` in the root directory with:

```
VITE_SUPABASE_URL=your_project_url_here
VITE_SUPABASE_ANON_KEY=your_anon_key_here
```

Replace `your_project_url_here` and `your_anon_key_here` with your actual credentials.

## 3. Restart the Development Server

After creating the `.env` file, restart the server:

```bash
npm run dev
```

## 4. Database Tables

The app will automatically try to connect to these tables:
- `pantry_items` (or `pantry`, `items`, `pantryItems`, `ingredients`)
- `recipes` (or `recipe`, `recipe_list`)

If your tables have different names, the app will try to detect them automatically.

## Troubleshooting

- Make sure your `.env` file is in the root directory (same level as `package.json`)
- Restart the dev server after creating/updating `.env`
- Check the browser console for any error messages
- Verify your Supabase project is active and the tables exist

