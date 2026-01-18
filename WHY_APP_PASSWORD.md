# Why You Need an App Password (Simple Explanation)

## The Short Answer

**Google doesn't allow apps to use your regular Gmail password** for security reasons. You need to create a special "App Password" that Google generates, which apps can use instead.

Think of it like this:
- Your **regular password** = The key to your house (only you should have it)
- **App Password** = A special guest key that only works for one specific app

## Why Google Does This

1. **Security**: If an app gets hacked, the hacker only gets the App Password, not your main password
2. **Control**: You can revoke an App Password anytime without changing your main password
3. **Tracking**: You can see which apps are using App Passwords and disable them individually

## How to Get One (Super Simple)

1. Go to: https://myaccount.google.com/apppasswords
2. If you see a message asking you to enable 2-Step Verification, click it and enable it first
3. Once 2-Step is enabled, come back to the App Passwords page
4. Click "Select app" → Choose "Mail"
5. Click "Select device" → Choose "Other (Custom name)"
6. Type "Pantry Pal" and click "Generate"
7. Copy the 16-character password (it looks like: `abcd efgh ijkl mnop`)
8. **Remove the spaces** when you use it: `abcdefghijklmnop`

That's it! You only need to do this once.

## Good News: Development Mode

**If you don't want to set up email right now**, the app now works in "Development Mode":
- The verification code will be shown **in the server console** (the terminal where you run `npm start`)
- The code will also appear **on the screen** in the verification step
- You can test everything without setting up email!

To use Development Mode:
- Just start the server without setting EMAIL_USER and EMAIL_PASSWORD
- When you sign up, check the server console for the verification code

## When You're Ready for Production

When you want to actually send emails to users, then you'll need to:
1. Get the App Password (steps above)
2. Set the environment variables:
   ```powershell
   $env:EMAIL_USER="your-email@gmail.com"
   $env:EMAIL_PASSWORD="your-16-char-app-password"
   ```

## Still Confused?

**Just use Development Mode for now!** You don't need to set up email to test the app. The verification code will appear in your server console.















