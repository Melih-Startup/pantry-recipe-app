# OAuth Authentication Setup Guide

Pantry Pal supports multiple OAuth providers for easy sign-up and login:
- **Google**
- **Facebook**
- **GitHub**

## Setting Up OAuth Providers

### Google OAuth Setup

1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the **Google+ API** for your project
4. Go to **Credentials** → **Create Credentials** → **OAuth client ID**
5. Configure the consent screen if prompted
6. Choose **Web application** as the application type
7. Add authorized redirect URIs:
   - For local development: `http://localhost:3000/api/auth/google/callback`
   - For production: `https://yourdomain.com/api/auth/google/callback`
8. Copy your **Client ID** and **Client Secret**

### Facebook OAuth Setup

1. Go to [Facebook Developers](https://developers.facebook.com/)
2. Create a new app or use an existing one
3. Add **Facebook Login** product to your app
4. Go to **Settings** → **Basic** and note your **App ID** and **App Secret**
5. Add **Valid OAuth Redirect URIs**:
   - For local development: `http://localhost:3000/api/auth/facebook/callback`
   - For production: `https://yourdomain.com/api/auth/facebook/callback`

### GitHub OAuth Setup

1. Go to your GitHub account → **Settings** → **Developer settings** → **OAuth Apps**
2. Click **New OAuth App**
3. Fill in the application details:
   - **Application name**: Pantry Pal (or your choice)
   - **Homepage URL**: `http://localhost:3000` (or your production URL)
   - **Authorization callback URL**: `http://localhost:3000/api/auth/github/callback` (or production URL)
4. Click **Register application**
5. Copy your **Client ID** and generate a **Client Secret**

## Configuring Environment Variables

Set the following environment variables before starting the server:

### Windows (PowerShell)
```powershell
$env:GOOGLE_CLIENT_ID="your-google-client-id"
$env:GOOGLE_CLIENT_SECRET="your-google-client-secret"
$env:FACEBOOK_APP_ID="your-facebook-app-id"
$env:FACEBOOK_APP_SECRET="your-facebook-app-secret"
$env:GITHUB_CLIENT_ID="your-github-client-id"
$env:GITHUB_CLIENT_SECRET="your-github-client-secret"
```

### Windows (Command Prompt)
```cmd
set GOOGLE_CLIENT_ID=your-google-client-id
set GOOGLE_CLIENT_SECRET=your-google-client-secret
set FACEBOOK_APP_ID=your-facebook-app-id
set FACEBOOK_APP_SECRET=your-facebook-app-secret
set GITHUB_CLIENT_ID=your-github-client-id
set GITHUB_CLIENT_SECRET=your-github-client-secret
```

### Linux/Mac
```bash
export GOOGLE_CLIENT_ID="your-google-client-id"
export GOOGLE_CLIENT_SECRET="your-google-client-secret"
export FACEBOOK_APP_ID="your-facebook-app-id"
export FACEBOOK_APP_SECRET="your-facebook-app-secret"
export GITHUB_CLIENT_ID="your-github-client-id"
export GITHUB_CLIENT_SECRET="your-github-client-secret"
```

## Using .env File (Recommended)

Alternatively, create a `.env` file in the project root (requires `dotenv` package):

1. Install dotenv: `npm install dotenv`
2. Add at the top of `server.js`: `require('dotenv').config();`
3. Create `.env` file:
```
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
FACEBOOK_APP_ID=your-facebook-app-id
FACEBOOK_APP_SECRET=your-facebook-app-secret
GITHUB_CLIENT_ID=your-github-client-id
GITHUB_CLIENT_SECRET=your-github-client-secret
```

## Important Notes

- **You don't need to configure all providers** - only set up the ones you want to use
- If a provider is not configured, the login buttons for that provider will not appear
- OAuth providers that are configured will automatically appear in both Login and Signup modals
- The app will work without any OAuth providers configured - users can still sign up with email/password

## Testing OAuth

1. Start your server: `npm start`
2. Open the app in your browser
3. Click **Login** or **Sign Up**
4. You should see social login buttons for any configured providers
5. Click a provider button to test the OAuth flow

## Production Deployment

When deploying to production:

1. Update all callback URLs to use your production domain (HTTPS)
2. Ensure environment variables are set securely (use your hosting platform's environment variable settings)
3. Never commit OAuth credentials to version control
4. Use HTTPS in production (set `secure: true` in session cookie configuration in `server.js`)















