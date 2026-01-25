# OpenSSL Installation Guide for Windows

## Step-by-Step Instructions

### 1. Download OpenSSL

1. Go to: **https://slproweb.com/products/Win32OpenSSL.html**
2. Scroll down to the "Download Win32/Win64 OpenSSL Installer" section
3. Click on **"Win64 OpenSSL v3.3.x Light"** (about 32MB) - this is the smaller version and sufficient for our needs
   - OR download the "Full" version if you prefer (larger file)

### 2. Install OpenSSL

1. Run the downloaded `.exe` file (e.g., `Win64OpenSSL_Light-3_3_*.exe`)
2. Click "Next" through the installation wizard
3. **IMPORTANT**: When you reach the "Select Additional Tasks" screen, make sure to check:
   - ✅ **"The Windows system directory"** (adds OpenSSL to system PATH)
   - OR
   - ✅ **"The OpenSSL binaries (/bin) directory"** (adds OpenSSL to user PATH)
4. Complete the installation by clicking "Next" → "Install" → "Finish"

### 3. Verify Installation

1. **Close your current terminal/PowerShell/Command Prompt window** (important - you need to open a new one for PATH changes to take effect)
2. Open a **new** PowerShell or Command Prompt window
3. Type: `openssl version`
4. You should see something like: `OpenSSL 3.3.x`
5. If you see an error, OpenSSL wasn't added to PATH correctly - try reinstalling and make sure to check the PATH option

### 4. Generate the Certificate

After OpenSSL is installed:

1. Open PowerShell in your project folder (`C:\Users\melih\Downloads\pantry-recipe-app`)
2. Run: `.\generate-cert.ps1`
3. The certificate will be created in the `certs` folder

### 5. Start the Server

After the certificate is generated:

1. Start your server: `node server.js`
2. You should now see: `🔒 HTTPS Server is running!`
3. Use the HTTPS URL on your mobile device

## Troubleshooting

**If OpenSSL command still doesn't work after installation:**
- Make sure you closed and reopened your terminal
- Try restarting your computer
- Manually add OpenSSL to PATH:
  1. Find where OpenSSL was installed (usually `C:\Program Files\OpenSSL-Win64\bin`)
  2. Add that folder to your system PATH environment variable

**Alternative: Use Git Bash**
If you have Git installed, you can use Git Bash instead:
1. Open Git Bash in your project folder
2. Run: `openssl req -x509 -newkey rsa:2048 -keyout certs/key.pem -out certs/cert.pem -days 365 -nodes -subj "/CN=YOUR_IP"`








