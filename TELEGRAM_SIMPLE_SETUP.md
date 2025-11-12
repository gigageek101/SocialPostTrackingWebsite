# Telegram Notifications - Simple Setup (No Database)

## Overview

The app now includes a **simplified Telegram notification system** that works **without any database**! Notifications are triggered automatically while the app is open.

## Features

✅ No database required (Supabase/Neon not needed)
✅ Works entirely client-side
✅ Auto-checks every 5 minutes when app is open
✅ Sends notifications when posts are due (within 5-minute window)

## Setup Steps

### 1. Create a Telegram Bot

1. Open Telegram and search for `@BotFather`
2. Send `/newbot` command
3. Follow instructions to create your bot
4. Save the Bot Token (looks like: `1234567890:ABCdefGHIjklMNOpqrsTUVwxyz`)

### 2. Get Your Chat ID

#### For Personal Messages:
1. Search for `@userinfobot` on Telegram
2. Send `/start`
3. Copy your Chat ID (looks like: `123456789`)

#### For Groups:
1. Add your bot to the group
2. Send a message in the group
3. Visit: `https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getUpdates`
4. Look for `"chat":{"id":-1001234567890}` (negative number for groups)
5. Copy the chat ID

### 3. Start Conversation with Bot

**Important:** You must start a conversation with your bot first!

1. Search for your bot in Telegram (use the username you created)
2. Send `/start` to the bot
3. If using a group, make sure the bot is a member

### 4. Configure in App

1. Open the app
2. Go to **Settings**
3. Scroll to **"Telegram Notifications"** section
4. Enter your **Bot Token** and **Chat ID**
5. Click **"Save Telegram Settings"**
6. Enable notifications with the toggle

## How It Works

1. **When app is open**: Checks every 5 minutes for upcoming posts
2. **Within 5-minute window**: Sends notification if a post is due
3. **No database**: Uses your local browser data to calculate schedule
4. **Manual trigger**: You can also manually call the API endpoint

## Notification Format

```
🔔 Time to Post!

📱 Platform: TIKTOK
👤 Account: @yourhandle
📊 Post: #2
⏰ Scheduled: 10:00 AM

✅ Open the app and make your post now!
```

## Important Notes

### ⚠️ App Must Be Open

- Notifications only work while the app tab is open in your browser
- Keep the app running in a browser tab to receive notifications
- Close other tabs if needed, but keep this one open

### 💡 Tips

1. **Pin the tab** in your browser to keep it always available
2. **Enable browser notifications** (separate from Telegram) for backup alerts
3. **Keep volume on** so you hear Telegram notification sounds
4. **Check regularly** even if you don't get notifications

### 🔧 Troubleshooting

#### Not receiving notifications?

1. ✅ Check bot conversation is started (send `/start` to your bot)
2. ✅ Verify Bot Token and Chat ID are correct in Settings
3. ✅ Ensure Telegram notifications are enabled (toggle in Settings)
4. ✅ Keep the app tab open in your browser
5. ✅ Check browser console for errors (F12 → Console)

#### Still not working?

1. Test manually by going to: `https://api.telegram.org/bot<YOUR_BOT_TOKEN>/sendMessage?chat_id=<YOUR_CHAT_ID>&text=Test`
2. If that works, the issue is with the app
3. If that doesn't work, check your Bot Token and Chat ID

## API Endpoint

For advanced users, you can manually trigger notifications:

```bash
curl -X POST https://your-app.vercel.app/api/check-and-notify \
  -H "Content-Type: application/json" \
  -d '{
    "botToken": "your_bot_token",
    "chatId": "your_chat_id",
    "accounts": [...],
    "todayPosts": [...],
    "userTimezone": "America/Chicago"
  }'
```

## Cost

- **Telegram**: Free! ✅
- **Vercel**: Free tier is sufficient (no Cron Jobs needed)
- **Database**: Not required ✅

## Shift Times

- **Morning Shift**: Before 12:00 PM (noon)
- **Evening Shift**: 12:00 PM (noon) and after

Shift switching happens at lunchtime (12:00 PM) instead of 2:00 PM.

