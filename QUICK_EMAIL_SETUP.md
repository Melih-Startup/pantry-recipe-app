# Quick Email Setup Guide

## You Need YOUR Gmail Account to Send Emails

**Important:** You use YOUR OWN Gmail account to send verification codes. The system will:
- Send emails **FROM** your Gmail account
- Send verification codes **TO** any email address (when users sign up, including yourself)

You don't need to create a separate account - just use your existing Gmail!

## Step-by-Step Setup

### Step 1: Get Gmail App Password

1. **Enable 2-Step Verification** (if not already enabled):
   - Go to: https://myaccount.google.com/security
   - Click "2-Step Verification" and enable it

2. **Generate App Password**:
   - Go to: https://myaccount.google.com/apppasswords
   - Select "Mail" as the app
   - Select "Other (Custom name)" as device
   - Enter "Pantry Pal" as the name
   - Click "Generate"
   - **Copy the 16-character password** (it looks like: `abcd efgh ijkl mnop`)
   - ⚠️ You can only see this password once, so copy it now!

### Step 2: Set Environment Variables

**Windows PowerShell (Recommended):**
```powershell
# Replace with YOUR Gmail address
$env:EMAIL_USER="your-email@gmail.com"

# Replace with the 16-character App Password you just generated (remove spaces)
$env:EMAIL_PASSWORD="abcdefghijklmnop"

# Start the server
npm start
```

**Windows Command Prompt:**
```cmd
set EMAIL_USER=your-email@gmail.com
set EMAIL_PASSWORD=abcdefghijklmnop
npm start
```

**Note:** You need to do this EVERY TIME you start the server, or the emails won't work.

### Step 3: Verify It's Working

When you start the server, you should see:
```
📧 Email service configured with: your-email@gmail.com
   Emails will be sent FROM this account TO users who sign up
```

If you see a warning instead, the email is not configured correctly.

### Step 4: Test Signup

1. Go to your app and click "Sign Up"
2. Enter your email (can be the same Gmail or any email)
3. Click "Send Verification Code"
4. Check your inbox (and spam folder) for the verification code
5. Enter the code to complete signup

## Common Issues

### ❌ "Email service not configured" error
- You didn't set the environment variables before starting the server
- Solution: Close the server, set the variables, then start again

### ❌ "Email authentication failed" error
- You're using your regular Gmail password instead of an App Password
- Solution: Generate an App Password and use that instead

### ❌ Code not received
- Check spam/junk folder
- Make sure you're using the App Password (not regular password)
- Verify 2-Step Verification is enabled
- Check server console for error messages

### ❌ Still not working?

Check the server console for detailed error messages. They will tell you exactly what's wrong.

## Alternative: Use .env File (Easier)

To avoid typing environment variables every time:

1. Install dotenv:
   ```powershell
   npm install dotenv
   ```

2. Add to the top of `server.js` (after line 1):
   ```javascript
   require('dotenv').config();
   ```

3. Create a file named `.env` in the project folder:
   ```
   EMAIL_USER=your-email@gmail.com
   EMAIL_PASSWORD=your-app-password-here
   ```

4. Add `.env` to `.gitignore` (create it if it doesn't exist):
   ```
   .env
   node_modules/
   pantry_pal.db
   ```

5. Now just run `npm start` - no need to set variables each time!

## Remember

- **EMAIL_USER** = YOUR Gmail address (the one sending emails)
- **EMAIL_PASSWORD** = App Password (16 characters, NOT your regular password)
- You can send verification codes to ANY email address (not just Gmail)
- The verification codes come FROM your Gmail account















