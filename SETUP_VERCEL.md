# Vercel Environment Variables Setup Guide

## Problem
Your login is failing with "Failed to fetch" because the environment variables are not set in Vercel. They exist in `.env.local` (local development only), but Vercel needs them in the dashboard.

## Solution: Add Environment Variables to Vercel

### Step 1: Go to Vercel Dashboard
1. Visit https://vercel.com
2. Sign in with your account
3. Select the **furniture-design-app-rkqx** project

### Step 2: Go to Environment Variables
1. Click on **Settings** (top menu)
2. Click on **Environment Variables** (left sidebar)

### Step 3: Add Each Variable

Add these 3 environment variables (click "Add New" for each):

#### Variable 1: MONGODB_URI
- **Name:** `MONGODB_URI`
- **Value:** `mongodb+srv://nethunavo24_db_user:fVfABWPJdQY34deh@cluster0.3uyia58.mongodb.net/?appName=Cluster0`
- **Environment:** Select all three (✓ Production, ✓ Preview, ✓ Development)
- **Click:** Save

#### Variable 2: JWT_SECRET
- **Name:** `JWT_SECRET`
- **Value:** `your-super-secret-jwt-key-change-this-in-production-at-least-32-characters`
- **Environment:** Select all three (✓ Production, ✓ Preview, ✓ Development)
- **Click:** Save

#### Variable 3: NEXT_PUBLIC_API_URL
- **Name:** `NEXT_PUBLIC_API_URL`
- **Value:** `https://furniture-design-app-rkqx.vercel.app`
- **Environment:** Select all three (✓ Production, ✓ Preview, ✓ Development)
- **Click:** Save

### Step 4: Redeploy Your App
1. Go to the **Deployments** tab
2. Find the latest deployment (marked as "Latest")
3. Click the **...** menu → **Redeploy**
4. Wait for deployment to complete (~2 minutes)

### Step 5: Test Login
1. Go to https://furniture-design-app-rkqx.vercel.app/login
2. Try logging in with valid credentials
3. Should work now! ✅

## If Login Still Fails

### Check MongoDB Connection
1. Go to https://cloud.mongodb.com
2. Click on your cluster
3. Click "Connect" → "Drivers"
4. Verify the connection string matches your `MONGODB_URI`
5. Make sure your IP address is whitelisted (or add `0.0.0.0/0`)

### Check Vercel Logs
1. In Vercel dashboard, go to **Deployments** tab
2. Click on your latest deployment
3. Click on **Logs** tab to see server errors
4. Look for any error messages related to:
   - MongoDB connection
   - Environment variables not set
   - JWT errors

### Generate a Stronger JWT_SECRET (Optional but Recommended)
Instead of the default placeholder, generate a secure random string:

```bash
# On Windows PowerShell:
[System.Convert]::ToBase64String([System.Text.Encoding]::UTF8.GetBytes((Get-Random -InputObject @('a'..'z') | Measure-Object -Line).Line)) | Out-File jwtkey.txt

# Or use online: https://www.random.org/strings/
# Generate: 1 string, 32 characters, letters+numbers+symbols
```

Then update `JWT_SECRET` in Vercel with the new value.

## Summary Checklist
- [ ] MONGODB_URI added to Vercel ✓
- [ ] JWT_SECRET added to Vercel ✓
- [ ] NEXT_PUBLIC_API_URL added to Vercel ✓
- [ ] Selected all 3 environments for each variable ✓
- [ ] Clicked Save for each variable ✓
- [ ] Redeployed the app ✓
- [ ] Waited 2-3 minutes for deployment ✓
- [ ] Tested login at https://furniture-design-app-rkqx.vercel.app/login ✓

Done! Your login should now work! 🎉
