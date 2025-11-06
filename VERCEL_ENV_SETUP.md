# 🚀 VERCEL ENVIRONMENT VARIABLES - COPY THESE EXACTLY

## ⚠️ CRITICAL: You MUST add these to Vercel for the app to work!

### Step 1: Go to Vercel Settings
1. Open: https://vercel.com
2. Select your project: **SocialPostTrackingWebsite**
3. Click **Settings** → **Environment Variables**

### Step 2: Add These TWO Variables

#### Variable 1:
```
Name: VITE_SUPABASE_URL
Value: https://tgmjxrfujztxfjuadiye.supabase.co
```
**Check:** ✅ Production, ✅ Preview, ✅ Development

#### Variable 2:
```
Name: VITE_SUPABASE_ANON_KEY
Value: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRnbWp4cmZ1anp0eGZqdWFkaXllIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI0MDcxOTEsImV4cCI6MjA3Nzk4MzE5MX0.KPMHAOizZmHP6kWyIGgh3iRopLKf_uPSQMItqS9-4jI
```
**Check:** ✅ Production, ✅ Preview, ✅ Development

### Step 3: REDEPLOY (THIS IS CRUCIAL!)
1. Go to **Deployments** tab
2. Find the latest deployment
3. Click the **"..."** menu (three dots)
4. Click **"Redeploy"**
5. Wait for deployment to finish (~2 minutes)

---

## ✅ How to Verify It's Working:

### On Your Phone:
1. Open the app in browser
2. Open browser console (if possible):
   - Safari on iPhone: Settings → Safari → Advanced → Web Inspector
   - Chrome on Android: Menu → More Tools → Remote Devices

3. Login to the app

4. You should see in console:
   ```
   🔄 Loading data from Supabase for creator: xxx
   ✅ Data loaded from Supabase: { accounts: X, postLogs: Y }
   ```

### Quick Test:
1. **Phone 1**: Login → Add a test TikTok account
2. **Phone 2**: Login with same username → Account should appear!

---

## 🎯 What This Fixes:

- ✅ Data syncs to Supabase cloud database
- ✅ Login on any device sees same data
- ✅ Posts made on one device appear on other devices
- ✅ All accounts, captions, settings sync automatically

---

## Status After Setup:
- ✅ Local development (.env.local) - DONE
- ⚠️ Production (Vercel env vars) - **YOU MUST DO THIS**
- ⚠️ Redeploy - **YOU MUST DO THIS**

