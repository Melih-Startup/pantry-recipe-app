# Admin Account Setup for Testing

This application is configured for **admin-only testing mode**. Only one account can be created - the admin account.

## Setting Your Admin Email

By default, the admin email is set to `admin@pantrypal.com`. To change it, you have two options:

### Option 1: Environment Variable (Recommended)

Set the `ADMIN_EMAIL` environment variable before starting the server:

**Windows (PowerShell):**
```powershell
$env:ADMIN_EMAIL="your-email@example.com"
npm start
```

**Windows (Command Prompt):**
```cmd
set ADMIN_EMAIL=your-email@example.com
npm start
```

**Linux/Mac:**
```bash
export ADMIN_EMAIL="your-email@example.com"
npm start
```

### Option 2: Edit server.js

You can directly modify the admin email in `server.js` (line ~25):

```javascript
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'your-email@example.com';
```

## How It Works

1. **Only the admin email can sign up** - All other email addresses will be rejected
2. **Only one account can exist** - Once the admin account is created, no more signups are allowed
3. **OAuth is restricted** - Social login (Google, Facebook, GitHub) only works for the admin email
4. **Regular login works** - Once created, the admin can login with email/password or OAuth (if configured)

## Creating Your Admin Account

1. Make sure `ADMIN_EMAIL` is set to your email (or edit `server.js`)
2. Start the server: `npm start`
3. Go to the app and click **Sign Up**
4. Use your admin email and create a password
5. The account will be automatically marked as admin

## Testing Mode Features

- ✅ Prevents multiple user signups
- ✅ Restricts OAuth to admin email only
- ✅ Logs admin email at server startup
- ✅ Clear error messages for unauthorized attempts

## Disabling Admin Mode

To allow all users to sign up, you would need to modify the signup endpoint in `server.js` to remove the admin restrictions. This is intended for testing purposes only.















