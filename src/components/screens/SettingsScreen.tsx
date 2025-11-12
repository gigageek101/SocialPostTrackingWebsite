import { useState } from 'react';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Select } from '../ui/Select';
import { Input } from '../ui/Input';
import { Settings as SettingsIcon, Download, Upload, Bell, BellOff, Trash2, CalendarX, LogOut, RefreshCw, Send } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { COMMON_TIMEZONES } from '../../utils/timezone';
import { exportData, importData, clearStorage } from '../../utils/storage';
import { requestNotificationPermission } from '../../utils/helpers';

export function SettingsScreen() {
  const { state, updateUserSettings, importData: handleImport, clearScheduleData, setAuthState, setCurrentScreen, manualSync } = useApp();
  const [importing, setImporting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [telegramBotToken, setTelegramBotToken] = useState(state.userSettings?.telegramBotToken || '');
  const [telegramChatId, setTelegramChatId] = useState(state.userSettings?.telegramChatId || '');

  if (!state.userSettings) return null;
  
  const userSettings = state.userSettings; // Store in variable for TypeScript

  const handleTimezoneChange = (timezone: string) => {
    updateUserSettings({ userTimezone: timezone });
  };

  const handleNotificationToggle = async () => {
    if (!userSettings.notificationsEnabled) {
      const granted = await requestNotificationPermission();
      updateUserSettings({ notificationsEnabled: granted });
    } else {
      updateUserSettings({ notificationsEnabled: false });
    }
  };

  const handleSaveTelegramSettings = () => {
    updateUserSettings({
      telegramBotToken: telegramBotToken.trim(),
      telegramChatId: telegramChatId.trim(),
      telegramNotificationsEnabled: telegramBotToken.trim() !== '' && telegramChatId.trim() !== '',
    });
    alert('✅ Telegram settings saved! You will now receive posting reminders.');
  };

  const handleToggleTelegramNotifications = () => {
    updateUserSettings({
      telegramNotificationsEnabled: !userSettings.telegramNotificationsEnabled,
    });
  };

  const handleExport = () => {
    exportData(state);
  };

  const handleImportClick = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json';
    input.onchange = async (e: Event) => {
      const target = e.target as HTMLInputElement;
      const file = target?.files?.[0];
      if (!file) return;

      try {
        setImporting(true);
        const data = await importData(file);
        handleImport(data);
        alert('Data imported successfully!');
      } catch (error) {
        alert('Failed to import data. Please check the file format.');
      } finally {
        setImporting(false);
      }
    };
    input.click();
  };

  const handleClearSchedule = async () => {
    if (
      confirm(
        '⚠️ Clear Schedule Data?\n\nThis will delete:\n• All posted logs\n• All daily plans\n• Reset all captions to unused\n\nThis will keep:\n✓ All creators\n✓ All accounts\n✓ User settings\n\nContinue?'
      )
    ) {
      try {
        await clearScheduleData();
        alert('✅ Schedule data cleared from cloud and locally! Your accounts are safe.');
      } catch (err: any) {
        alert(`❌ Error clearing schedule: ${err.message}`);
      }
    }
  };

  const handleClearData = () => {
    if (
      confirm(
        'Are you sure you want to clear all data? This action cannot be undone.'
      )
    ) {
      clearStorage();
      window.location.reload();
    }
  };

  const handleLogout = () => {
    if (confirm('🚪 Logout?\n\nYou will need to login again. Your data is saved in the cloud!')) {
      // Clear remembered auth
      localStorage.removeItem('rememberedAuth');
      
      // Reset auth state
      setAuthState({
        isAuthenticated: false,
        currentCreatorId: null,
        currentUsername: null,
      });
      
      // Go to auth screen
      setCurrentScreen('auth');
    }
  };

  const handleManualSync = async () => {
    if (!state.authState?.currentCreatorId) {
      alert('⚠️ Not logged in!');
      return;
    }

    setSyncing(true);
    console.log('🔄 Manual sync requested...');

    try {
      await manualSync();
      alert('✅ Data synced from cloud!');
    } catch (err: any) {
      alert(`❌ Sync failed: ${err.message}`);
    } finally {
      setSyncing(false);
    }
  };

  const timezoneOptions = COMMON_TIMEZONES.map((tz) => ({
    value: tz,
    label: tz.replace(/_/g, ' '),
  }));

  return (
    <div className="space-y-6 p-3 sm:p-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <SettingsIcon className="w-8 h-8 text-white" />
        <h1 className="text-3xl font-bold text-white">Settings</h1>
      </div>

      {/* User Preferences */}
      <Card>
        <h2 className="text-xl font-bold text-gray-900 mb-4">User Preferences</h2>

        <div className="space-y-4">
          <Select
            label="Your Timezone"
            options={timezoneOptions}
            value={userSettings.userTimezone}
            onChange={(e) => handleTimezoneChange(e.target.value)}
          />

          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-3">
              {userSettings.notificationsEnabled ? (
                <Bell className="w-6 h-6 text-green-600" />
              ) : (
                <BellOff className="w-6 h-6 text-gray-400" />
              )}
              <div>
                <h3 className="font-semibold text-gray-900">Push Notifications</h3>
                <p className="text-sm text-gray-600">
                  Get notified when post windows open
                </p>
              </div>
            </div>
            <Button
              variant={userSettings.notificationsEnabled ? 'secondary' : 'primary'}
              onClick={handleNotificationToggle}
            >
              {userSettings.notificationsEnabled ? 'Disable' : 'Enable'}
            </Button>
          </div>
        </div>
      </Card>

      {/* Telegram Notifications */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900">Telegram Notifications</h2>
          {userSettings.telegramNotificationsEnabled && (
            <span className="text-xs bg-green-100 text-green-800 px-3 py-1 rounded-full font-semibold">
              Active
            </span>
          )}
        </div>

        <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-900 mb-2">
            <strong>📱 Get automated posting reminders!</strong>
          </p>
          <p className="text-xs text-blue-700">
            Our system will check your schedule every 10 minutes and send you Telegram notifications when it's time to post.
          </p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Telegram Bot Token
            </label>
            <Input
              type="text"
              value={telegramBotToken}
              onChange={(e) => setTelegramBotToken(e.target.value)}
              placeholder="1234567890:ABCdefGHIjklMNOpqrsTUVwxyz"
              className="font-mono text-sm"
            />
            <p className="text-xs text-gray-500 mt-1">
              Create a bot with @BotFather on Telegram
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Telegram Chat ID
            </label>
            <Input
              type="text"
              value={telegramChatId}
              onChange={(e) => setTelegramChatId(e.target.value)}
              placeholder="-1001234567890"
              className="font-mono text-sm"
            />
            <p className="text-xs text-gray-500 mt-1">
              Get your chat ID from @userinfobot
            </p>
          </div>

          <Button
            onClick={handleSaveTelegramSettings}
            fullWidth
            className="flex items-center justify-center gap-2"
            disabled={!telegramBotToken.trim() || !telegramChatId.trim()}
          >
            <Send className="w-4 h-4" />
            Save Telegram Settings
          </Button>

          {userSettings.telegramBotToken && userSettings.telegramChatId && (
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3">
                {userSettings.telegramNotificationsEnabled ? (
                  <Bell className="w-6 h-6 text-green-600" />
                ) : (
                  <BellOff className="w-6 h-6 text-gray-400" />
                )}
                <div>
                  <h3 className="font-semibold text-gray-900">Telegram Reminders</h3>
                  <p className="text-sm text-gray-600">
                    {userSettings.telegramNotificationsEnabled
                      ? 'You will receive notifications'
                      : 'Notifications are paused'}
                  </p>
                </div>
              </div>
              <Button
                variant={userSettings.telegramNotificationsEnabled ? 'secondary' : 'primary'}
                onClick={handleToggleTelegramNotifications}
              >
                {userSettings.telegramNotificationsEnabled ? 'Pause' : 'Enable'}
              </Button>
            </div>
          )}

          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-xs text-yellow-800">
              <strong>ℹ️ How to set up:</strong><br />
              1. Create a bot with @BotFather on Telegram<br />
              2. Get your chat ID from @userinfobot<br />
              3. Start a conversation with your bot<br />
              4. Enter the details above and save
            </p>
          </div>
        </div>
      </Card>

      {/* Data Management */}
      <Card>
        <h2 className="text-xl font-bold text-gray-900 mb-4">Data Management</h2>

        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center gap-3">
              <Download className="w-6 h-6 text-blue-600" />
              <div>
                <h3 className="font-semibold text-gray-900">Export Data</h3>
                <p className="text-sm text-gray-600">
                  Download your data as JSON backup
                </p>
              </div>
            </div>
            <Button variant="secondary" onClick={handleExport}>
              Export
            </Button>
          </div>

          <div className="flex items-center justify-between p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center gap-3">
              <Upload className="w-6 h-6 text-green-600" />
              <div>
                <h3 className="font-semibold text-gray-900">Import Data</h3>
                <p className="text-sm text-gray-600">
                  Restore from a backup file
                </p>
              </div>
            </div>
            <Button
              variant="secondary"
              onClick={handleImportClick}
              disabled={importing}
            >
              {importing ? 'Importing...' : 'Import'}
            </Button>
          </div>

          <div className="flex items-center justify-between p-4 bg-orange-50 border border-orange-200 rounded-lg">
            <div className="flex items-center gap-3">
              <CalendarX className="w-6 h-6 text-orange-600" />
              <div>
                <h3 className="font-semibold text-gray-900">Clear Schedule Data</h3>
                <p className="text-sm text-gray-600">
                  Delete all posts but keep your accounts
                </p>
              </div>
            </div>
            <Button variant="secondary" onClick={handleClearSchedule}>
              Clear Schedule
            </Button>
          </div>

          <div className="flex items-center justify-between p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center gap-3">
              <Trash2 className="w-6 h-6 text-red-600" />
              <div>
                <h3 className="font-semibold text-gray-900">Clear All Data</h3>
                <p className="text-sm text-gray-600">
                  Delete everything and start fresh
                </p>
              </div>
            </div>
            <Button variant="danger" onClick={handleClearData}>
              Clear Data
            </Button>
          </div>
        </div>
      </Card>

      {/* Account Management */}
      <Card>
        <h2 className="text-xl font-bold text-gray-900 mb-4">Account & Sync</h2>
        
        <div className="space-y-4">
          <div className="p-4 bg-blue-50 border-2 border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800 mb-2">
              <strong>Logged in as:</strong> {state.authState?.currentUsername || 'Unknown'}
            </p>
            <p className="text-xs text-blue-600">
              ☁️ All your data is synced to the cloud
            </p>
          </div>

          <Button 
            onClick={handleManualSync}
            variant="secondary"
            fullWidth
            disabled={syncing}
            className="flex items-center justify-center gap-2"
          >
            <RefreshCw className={`w-5 h-5 ${syncing ? 'animate-spin' : ''}`} />
            {syncing ? 'Syncing...' : 'Sync from Cloud Now'}
          </Button>

          <Button 
            onClick={handleLogout}
            variant="danger"
            fullWidth
            className="flex items-center justify-center gap-2"
          >
            <LogOut className="w-5 h-5" />
            Logout
          </Button>
        </div>
      </Card>

      {/* App Info */}
      <Card>
        <h2 className="text-xl font-bold text-gray-900 mb-4">App Information</h2>

        <div className="space-y-2 text-sm text-gray-700">
          <div className="flex justify-between">
            <span>Version:</span>
            <span className="font-medium">1.0.0</span>
          </div>
          <div className="flex justify-between">
            <span>Creators:</span>
            <span className="font-medium">{state.creators.length}</span>
          </div>
          <div className="flex justify-between">
            <span>Accounts:</span>
            <span className="font-medium">{state.accounts.length}</span>
          </div>
          <div className="flex justify-between">
            <span>Total Posts Logged:</span>
            <span className="font-medium">{state.postLogs.length}</span>
          </div>
          <div className="flex justify-between">
            <span>Last Sync:</span>
            <span className="font-medium">
              {new Date(state.lastSync).toLocaleString()}
            </span>
          </div>
        </div>
      </Card>
    </div>
  );
}

