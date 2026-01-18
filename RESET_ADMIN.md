# How to Reset Admin Account

If you can't sign up because an admin account already exists, here are your options:

## Option 1: Login with Existing Admin Account

If you already created an admin account, just **login** instead of signing up. Use the email and password you used when you first created the account.

## Option 2: Delete Database to Reset

If you want to start fresh, you can delete the database file:

1. **Stop the server** (Ctrl+C in the terminal where it's running)

2. **Delete the database file:**
   - Windows: Delete `pantry_pal.db` file in the project folder
   - Or use command: `del pantry_pal.db` (Command Prompt) or `Remove-Item pantry_pal.db` (PowerShell)

3. **Start the server again:** `npm start`

4. **Sign up** with your email - it will become the admin account

## Option 3: Check Existing Admin Email

To see which email is the admin account, you can:
- Check the server console when it starts - it may show admin info
- Try logging in with emails you've used before
- Or delete the database and start fresh (Option 2)

## Current Behavior

- **First email to sign up** = becomes admin automatically (if ADMIN_EMAIL is not set)
- **Only one admin account** can exist at a time
- **After admin is created**, no more signups allowed
- **To sign up again**, you must delete the database file















