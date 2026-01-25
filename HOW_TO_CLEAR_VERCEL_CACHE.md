# How to Clear Vercel Cache

When you update your code but Vercel is still running old cached code, you need to clear the cache. Here are several methods:

## Method 1: Force Redeploy (Recommended) ✅

The easiest way to clear cache is to trigger a new deployment:

### Via Vercel Dashboard:
1. Go to [vercel.com](https://vercel.com) and log in
2. Navigate to your project
3. Go to the **Deployments** tab
4. Click the **"..."** (three dots) menu on the latest deployment
5. Select **"Redeploy"**
6. **Note**: The "Use existing Build Cache" option may not appear in all Vercel interfaces. If you don't see it, the redeploy should still clear most caches, but Method 2 (empty git commit) is more reliable for a complete cache clear.
7. Click **"Redeploy"**

### Via Vercel CLI:
```bash
# Install Vercel CLI if you haven't
npm i -g vercel

# Redeploy without cache
vercel --force
```

### Via Git (Recommended for Production):
```bash
# Make a small change to trigger new deployment
git commit --allow-empty -m "Clear Vercel cache"
git push
```

This creates an empty commit that forces Vercel to rebuild everything fresh.

## Method 2: Empty Git Commit (Easiest - Recommended) ⭐

This method forces Vercel to rebuild everything from scratch. You run these commands in your **terminal/command prompt** on your computer.

### Step-by-Step Instructions:

1. **Open Terminal/Command Prompt:**
   - **Windows**: Press `Win + R`, type `cmd` or `powershell`, press Enter
   - **Mac**: Press `Cmd + Space`, type `Terminal`, press Enter
   - **Linux**: Press `Ctrl + Alt + T`

2. **Navigate to your project folder:**
   ```bash
   cd C:\Users\melih\Downloads\pantry-recipe-app
   ```
   (Or wherever your project is located)

3. **Check if you have git initialized:**
   ```bash
   git status
   ```
   If you see "fatal: not a git repository", you need to initialize git first (see below).

4. **Create an empty commit to force rebuild:**
   ```bash
   git commit --allow-empty -m "Force Vercel cache clear"
   ```

5. **Push to trigger Vercel deployment:**
   ```bash
   git push
   ```

6. **Wait 2-5 minutes** and check your Vercel dashboard - a new deployment should start automatically.

### If Git is Not Set Up:

If you get errors, you may need to set up git first:

```bash
# Initialize git (if not already done)
git init

# Add all files
git add .

# Make initial commit
git commit -m "Initial commit"

# Add your remote (get this from Vercel dashboard → Settings → Git)
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
# OR if you're using Vercel's git integration, it should be automatic

# Push
git push -u origin main
```

### Alternative: If You Don't Want to Use Git

See Method 3 below for dashboard-only options.

## Method 3: Clear Build Cache via Dashboard (If Available)

**Note**: This option may not be available in all Vercel plans or interfaces.

1. Go to your project on [vercel.com](https://vercel.com)
2. Navigate to **Settings** → **General**
3. Scroll down to **Build & Development Settings**
4. Look for **"Clear Build Cache"** or **"Purge Cache"** button
5. If available, click it and redeploy

**If this option doesn't exist**, use Method 2 (empty git commit) or Method 4 below.

## Method 4: Use Vercel CLI to Purge Cache

```bash
# Install Vercel CLI
npm i -g vercel

# Login to Vercel
vercel login

# Link your project (if not already linked)
vercel link

# Remove deployment and cache
vercel remove --yes

# Redeploy fresh
vercel --prod
```

## Method 5: Environment Variable Trick

Sometimes changing an environment variable forces a rebuild:

1. Go to **Settings** → **Environment Variables**
2. Add or modify any environment variable (even a dummy one)
3. Save and redeploy

This forces Vercel to rebuild with the new environment.

## Method 6: Update package.json Version

A simple trick to force rebuild:

```bash
# Update version in package.json (even by 0.0.1)
# Then commit and push
git add package.json
git commit -m "Bump version to clear cache"
git push
```

## Method 7: Delete and Recreate Project (Nuclear Option)

⚠️ **Only use if nothing else works:**

1. Go to project **Settings** → **General**
2. Scroll to bottom
3. Click **"Delete Project"**
4. Create a new project with the same code
5. Re-add all environment variables

## For Your Specific Issue (Certificate Generation Error)

Since you're dealing with cached code that's trying to create `/var/task/certs`, here's the best approach:

### Step-by-Step Fix:

1. **Commit your current fixes** (the enhanced Vercel detection code):
   ```bash
   git add server.js FUNCTION_INVOCATION_FAILED_FIX.md
   git commit -m "Fix: Enhanced Vercel detection to prevent filesystem operations"
   git push
   ```

2. **Force a fresh deployment**:
   ```bash
   # Option A: Empty commit
   git commit --allow-empty -m "Force Vercel cache clear"
   git push
   
   # Option B: Use Vercel CLI
   vercel --force --prod
   ```

3. **Verify the fix**:
   - Check Vercel logs after deployment
   - The error should be gone
   - If it persists, wait 5-10 minutes (cache propagation time)

## Understanding Vercel Caching

### What Gets Cached:
- **Build artifacts**: Compiled code, dependencies
- **Function code**: Serverless function bundles
- **Static assets**: Images, CSS, JS files
- **Environment**: Environment variables (cached per deployment)

### What Doesn't Get Cached:
- **Database connections**: Fresh on each invocation
- **Runtime state**: Each function invocation is isolated
- **Request data**: Each request is independent

### Cache Invalidation:
- **Automatic**: On new git push (if connected to Git)
- **Manual**: Via dashboard redeploy
- **Time-based**: Some caches expire after inactivity

## Troubleshooting Persistent Cache Issues

If cache persists after redeploy:

1. **Wait 5-10 minutes**: Cache propagation can take time
2. **Check deployment logs**: Verify new code is actually deployed
3. **Verify git commit**: Make sure your latest code is pushed
4. **Check branch**: Ensure you're deploying the correct branch
5. **Clear browser cache**: Your browser might be caching the old version

## Quick Command Reference

```bash
# Force redeploy without cache
vercel --force

# Redeploy to production
vercel --prod

# Check current deployments
vercel ls

# View logs
vercel logs

# Remove project (careful!)
vercel remove
```

## Best Practices

1. **Always commit code before redeploying**: Ensures Vercel has your latest changes
2. **Use git for deployments**: Automatic deployments from git are more reliable
3. **Check logs after deployment**: Verify the new code is running
4. **Test locally first**: Make sure code works before deploying
5. **Use environment variables**: Don't hardcode values that might need changing

## For Your Certificate Error Specifically

After clearing cache, verify the fix worked:

1. Check Vercel function logs - should NOT see `ENOENT: no such file or directory, mkdir '/var/task/certs'`
2. Check that `IS_VERCEL` detection is working - logs should show certificate generation is skipped
3. Verify HTTPS still works - Vercel provides it automatically, so no certificates needed

If error persists after cache clear:
- Double-check your code changes were committed and pushed
- Verify you're looking at the correct deployment (check deployment URL)
- Check that environment variables are set correctly
- Review server.js to ensure all the fixes are in place

