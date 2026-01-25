# How to Set Environment Variables on Windows

Environment variables are settings that your app uses. Here's how to set them:

## Method 1: PowerShell (Easiest - Recommended) ⭐

### Step-by-Step:

1. **Open PowerShell** in your project folder:
   - Right-click in the folder where `server.js` is located
   - Select "Open in Terminal" or "Open PowerShell window here"
   - OR open PowerShell and type: `cd C:\Users\melih\Downloads\pantry-recipe-app`

2. **Type these commands** (replace with your actual values):
   ```powershell
   $env:EMAIL_USER="your-email@gmail.com"
   $env:EMAIL_PASSWORD="your-app-password"
   ```

3. **Verify they're set** (optional):
   ```powershell
   echo $env:EMAIL_USER
   echo $env:EMAIL_PASSWORD
   ```

4. **Start your server**:
   ```powershell
   npm start
   ```

**Important:** These variables only last for THIS terminal session. If you close PowerShell, you'll need to set them again.

---

## Method 2: Command Prompt (CMD)

1. **Open Command Prompt** in your project folder:
   - Right-click in the folder → "Open in Terminal"
   - OR press `Win + R`, type `cmd`, press Enter, then `cd` to your folder

2. **Type these commands**:
   ```cmd
   set EMAIL_USER=your-email@gmail.com
   set EMAIL_PASSWORD=your-app-password
   ```

3. **Start your server**:
   ```cmd
   npm start
   ```

---

## Method 3: Set Once, Use Forever (.env file) ⭐⭐⭐

This is the BEST method - you set it once and it works every time!

### Step 1: Install dotenv package
```powershell
npm install dotenv
```

### Step 2: Check if server.js already uses dotenv
Open `server.js` and look at the top. If you see `require('dotenv').config();`, skip to Step 3.

If NOT, add this line at the very top of `server.js` (after line 1):
```javascript
require('dotenv').config();
```

### Step 3: Create a `.env` file
In your project folder (same folder as `server.js`), create a new file named `.env` (just `.env`, no extension)

Add these lines to the `.env` file:
```
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password
EMAIL_SERVICE=gmail
```

**Important:** 
- No spaces around the `=` sign
- No quotes needed
- Replace with your actual values

### Step 4: Add `.env` to `.gitignore`
Create or edit `.gitignore` file and add:
```
.env
node_modules/
pantry_pal.db
```

This prevents accidentally sharing your email password!

### Step 5: Start your server normally
```powershell
npm start
```

Now you don't need to set environment variables every time! 🎉

---

## Method 4: Windows System Environment Variables (Permanent)

⚠️ **Not recommended for development** - This sets them for your entire computer.

1. Press `Win + X` and select "System"
2. Click "Advanced system settings"
3. Click "Environment Variables"
4. Under "User variables", click "New"
5. Add:
   - Variable name: `EMAIL_USER`
   - Variable value: `your-email@gmail.com`
6. Repeat for `EMAIL_PASSWORD`
7. Click OK on all windows
8. **Restart your terminal/PowerShell** for changes to take effect

---

## Quick Reference

### PowerShell (Temporary - Current Session Only)
```powershell
$env:EMAIL_USER="your-email@gmail.com"
$env:EMAIL_PASSWORD="your-password"
npm start
```

### Command Prompt (Temporary - Current Session Only)
```cmd
set EMAIL_USER=your-email@gmail.com
set EMAIL_PASSWORD=your-password
npm start
```

### .env File (Permanent - Recommended!)
1. Create `.env` file with:
   ```
   EMAIL_USER=your-email@gmail.com
   EMAIL_PASSWORD=your-password
   ```
2. Make sure `server.js` has `require('dotenv').config();` at the top
3. Just run `npm start` - no need to set variables each time!

---

## Which Method Should I Use?

- **Just testing?** → Method 1 (PowerShell) - Quick and easy
- **Developing regularly?** → Method 3 (.env file) - Set once, use forever
- **Don't want to type commands?** → Method 3 (.env file) - Easiest long-term

---

## Troubleshooting

### "Variable not found" error
- Make sure you set the variables BEFORE running `npm start`
- Check for typos in variable names (EMAIL_USER not EMAIL_USERNAME)
- If using PowerShell, make sure you use `$env:` prefix

### Variables disappear when I close terminal
- That's normal for Method 1 and 2! They're temporary.
- Use Method 3 (.env file) if you want them to persist

### .env file not working
- Make sure `dotenv` package is installed: `npm install dotenv`
- Make sure `server.js` has `require('dotenv').config();` at the top
- Make sure `.env` file is in the same folder as `server.js`
- Make sure there are no spaces around `=` in `.env` file


