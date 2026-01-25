# Setting Up a Separate Email Account for Pantry Pal

You don't want to use your personal email? No problem! Here are your options:

## Option 1: Create a New Gmail Account (Easiest) ⭐

### Steps:
1. **Create a new Gmail account** (e.g., `pantrypal.app@gmail.com` or `your-app-name@gmail.com`)
   - Go to: https://accounts.google.com/signup
   - Use a name that represents your app

2. **Enable 2-Step Verification** on the new account:
   - Go to: https://myaccount.google.com/security
   - Enable 2-Step Verification

3. **Generate an App Password**:
   - Go to: https://myaccount.google.com/apppasswords
   - Select "Mail" and "Other (Custom name)"
   - Enter "Pantry Pal" as the name
   - Copy the 16-character password

4. **Set environment variables**:
   ```powershell
   $env:EMAIL_USER="pantrypal.app@gmail.com"
   $env:EMAIL_PASSWORD="your-16-char-app-password"
   $env:EMAIL_SERVICE="gmail"
   npm start
   ```

**Pros:** Easy setup, free, reliable
**Cons:** Still a Gmail account (if you want something more professional)

---

## Option 2: Create a New Outlook/Hotmail Account

### Steps:
1. **Create a new Outlook account**:
   - Go to: https://outlook.live.com/owa/
   - Click "Create free account"
   - Choose a name like `pantrypal@outlook.com`

2. **Enable 2-Step Verification**:
   - Go to: https://account.microsoft.com/security
   - Enable 2-Step Verification

3. **Generate an App Password**:
   - Go to: https://account.microsoft.com/security/app-passwords
   - Create a new app password for "Mail"
   - Copy the password

4. **Set environment variables**:
   ```powershell
   $env:EMAIL_USER="pantrypal@outlook.com"
   $env:EMAIL_PASSWORD="your-app-password"
   $env:EMAIL_SERVICE="outlook"
   npm start
   ```

**Pros:** Free, professional-looking email address
**Cons:** Slightly more setup steps

---

## Option 3: Use a Custom Domain Email (Professional)

If you have your own domain (e.g., `yourdomain.com`), you can:

1. **Set up email with your domain provider** (Google Workspace, Microsoft 365, etc.)
2. **Use custom SMTP settings**:
   ```powershell
   $env:EMAIL_USER="noreply@yourdomain.com"
   $env:EMAIL_PASSWORD="your-email-password"
   $env:EMAIL_HOST="smtp.yourdomain.com"
   $env:EMAIL_PORT="587"
   $env:EMAIL_SECURE="false"
   npm start
   ```

**Pros:** Most professional, branded emails
**Cons:** Requires a domain and email hosting

---

## Option 4: Use a Professional Email Service (Best for Production)

For production apps, consider services like:
- **SendGrid** (free tier: 100 emails/day)
- **Mailgun** (free tier: 5,000 emails/month)
- **AWS SES** (very cheap, pay-as-you-go)

These require API keys instead of SMTP passwords. Contact me if you want help setting these up!

---

## Quick Comparison

| Option | Cost | Setup Time | Professional? |
|--------|------|------------|---------------|
| New Gmail | Free | 5 min | ⭐⭐ |
| New Outlook | Free | 10 min | ⭐⭐⭐ |
| Custom Domain | $5-10/mo | 30 min | ⭐⭐⭐⭐⭐ |
| Email Service | Free/Cheap | 20 min | ⭐⭐⭐⭐⭐ |

---

## Recommended: New Gmail Account

For development and testing, I recommend **Option 1** (new Gmail account):
- ✅ Free
- ✅ Quick setup (5 minutes)
- ✅ Keeps your personal account separate
- ✅ Reliable and well-tested

Just create `pantrypal.app@gmail.com` (or similar) and follow the Gmail setup steps above!

---

## Testing Your Setup

After setting up, start your server and you should see:
```
📧 Email service configured with gmail: pantrypal.app@gmail.com
   Emails will be sent FROM this account TO users who sign up
```

Then test by signing up with any email address - the verification code will come FROM your new account!


