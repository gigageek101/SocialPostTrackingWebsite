# Schedule Update Summary

## Changes Made

### ✅ Threads Platform Updates

**Posting Times (US Time):**
- **Morning Shift:** 05:00, 06:00, 07:00 (3 posts)
- **Evening Shift:** 18:30, 19:30, 20:30 (3 posts)
- **Total:** 6 posts per day

**Cooldown Time:**
- Changed from **120 minutes** to **60 minutes**

---

### ✅ TikTok Platform Updates

**Posting Times (US Time):**
- **Morning Shift:** 05:00, 08:00 (2 posts)
- **Evening Shift:** 17:30, 20:30 (2 posts)
- **Total:** 4 posts per day

**Cooldown Time:**
- Remains at **120 minutes** (2 hours)

---

## Files Modified

1. **`src/constants/platforms.ts`**
   - Updated `PLATFORM_BASE_TIMES.tiktok`
   - Updated `PLATFORM_BASE_TIMES.threads`
   - Updated `COOLDOWN_MINUTES.threads` from 120 to 60

2. **`src/utils/dynamicScheduler.ts`**
   - Updated `getMaxPostsForPlatformShift()` function to reflect 3 posts per shift for Threads
   - Updated `getBaseTimeForShift()` function comments to reflect new times

---

## Summary of Changes

### Previous Schedule:
- **TikTok:** 05:45, 10:00, 18:30, 20:30 (120 min cooldown)
- **Threads:** 07:30, 10:00, 13:00, 16:00, 19:00, 20:30 (120 min cooldown)

### New Schedule:
- **TikTok:** 05:00, 08:00, 17:30, 20:30 (120 min cooldown)
- **Threads:** 05:00, 06:00, 07:00, 18:30, 19:30, 20:30 (60 min cooldown)

---

## Impact

- Threads posts are now more concentrated with 1-hour intervals between posts instead of variable intervals
- Threads posts are split evenly: 3 morning, 3 evening
- TikTok maintains 2 posts per shift with 120-minute cooldown
- All times are in US Central Time (America/Chicago timezone)

---

**Date Updated:** November 14, 2025

