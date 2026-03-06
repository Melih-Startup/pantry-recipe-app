# How to Get DATABASE_URL for Supabase

The old app needs a `DATABASE_URL` connection string to connect to Supabase.

## Steps:

1. Go to your Supabase project: https://app.supabase.com
2. Click on your project
3. Go to **Settings** → **Database**
4. Scroll down to **Connection string**
5. Select **URI** (not "Session mode" or "Transaction mode")
6. Copy the connection string - it looks like:
   ```
   postgresql://postgres:[YOUR-PASSWORD]@db.xckyjiuplffowkqybqdh.supabase.co:5432/postgres
   ```
7. Replace `[YOUR-PASSWORD]` with your actual database password
8. Add it to your `.env` file as:
   ```
   DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@db.xckyjiuplffowkqybqdh.supabase.co:5432/postgres
   ```

## If you don't know your database password:

1. Go to **Settings** → **Database**
2. Look for **Database password** section
3. If you forgot it, you can reset it (this will require updating the connection string)

## After adding DATABASE_URL:

1. Restart the server: `npm start`
2. The app should now connect to your Supabase database
3. Your old data should be accessible!








