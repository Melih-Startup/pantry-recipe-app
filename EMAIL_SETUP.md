# Email Verification Setup

Pantry Pal now requires email verification with a 6-digit code when signing up. You need to configure email sending to enable this feature.

## Setting Up Email (Gmail Example)

### Option 1: Gmail with App Password (Recommended)

1. **Enable 2-Step Verification** on your Google account:
   - Go to [Google Account Security](https://myaccount.google.com/security)
   - Enable 2-Step Verification if not already enabled

2. **Generate an App Password**:
   - Go to [App Passwords](https://myaccount.google.com/apppasswords)
   - Select "Mail" and "Other (Custom name)"
   - Enter "Pantry Pal" as the name
   - Click "Generate"
   - Copy the 16-character password (no spaces)

3. **Set Environment Variables**:

   **Windows (PowerShell):**
   ```powershell
   $env:EMAIL_USER="your-email@gmail.com"
   $env:EMAIL_PASSWORD="your-16-char-app-password"
   npm start
   ```

   **Windows (Command Prompt):**
   ```cmd
   set EMAIL_USER=your-email@gmail.com
   set EMAIL_PASSWORD=your-16-char-app-password
   npm start
   ```

   **Linux/Mac:**
   ```bash
   export EMAIL_USER="your-email@gmail.com"
   export EMAIL_PASSWORD="your-16-char-app-password"
   npm start
   ```

### Option 2: Other Email Providers

You can use any SMTP service. Update the email transporter configuration in `server.js`:

```javascript
emailTransporter = nodemailer.createTransport({
    host: 'smtp.your-provider.com',
    port: 587,
    secure: false, // true for 465, false for other ports
    auth: {
        user: EMAIL_USER,
        pass: EMAIL_PASSWORD
    }
});
```

## Testing Email Configuration

1. Start the server with email credentials set
2. You should see: `📧 Email service configured` in the console
3. Try signing up - a verification code will be sent to the email

## Troubleshooting

### "Email service not configured" error
- Make sure `EMAIL_USER` and `EMAIL_PASSWORD` are set
- Restart the server after setting environment variables

### "Failed to send verification email" error
- Check your email credentials
- For Gmail: Make sure you're using an App Password, not your regular password
- Check that 2-Step Verification is enabled for App Passwords to work
- Check your internet connection
- Check spam folder - verification emails might be there

### Using .env file (Optional)

For easier management, you can use a `.env` file:

1. Install dotenv: `npm install dotenv`
2. Add to the top of `server.js`: `require('dotenv').config();`
3. Create `.env` file:
   ```
   EMAIL_USER=your-email@gmail.com
   EMAIL_PASSWORD=your-app-password
   ```
4. Add `.env` to `.gitignore` (never commit email credentials!)

## How It Works

1. User enters email and password in signup form
2. System sends a 6-digit verification code to their email
3. User enters the code to verify their email
4. Account is created only after successful verification
5. Code expires after 10 minutes
6. User can request a new code if needed

## Security Notes

- Verification codes expire after 10 minutes
- Each code can only be used once
- Old codes are automatically deleted when a new one is requested
- Email credentials should never be committed to version control
- Use App Passwords instead of your main password for security

