import { useState } from 'react';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Select } from '../ui/Select';
import { Input } from '../ui/Input';
import { Settings as SettingsIcon, Download, Upload, Bell, BellOff, Trash2, Smartphone, Plus, X } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { COMMON_TIMEZONES } from '../../utils/timezone';
import { exportData, importData, clearStorage } from '../../utils/storage';
import { requestNotificationPermission } from '../../utils/helpers';

export function SettingsScreen() {
  const { state, updateUserSettings, importData: handleImport, addDevicePreset, removeDevicePreset } = useApp();
  const [importing, setImporting] = useState(false);
  const [newDevice, setNewDevice] = useState('');

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

  const timezoneOptions = COMMON_TIMEZONES.map((tz) => ({
    value: tz,
    label: tz.replace(/_/g, ' '),
  }));

  const handleAddDevice = () => {
    if (!newDevice.trim()) return;
    addDevicePreset(newDevice.trim());
    setNewDevice('');
  };

  const handleRemoveDevice = (deviceName: string) => {
    if (confirm(`Remove "${deviceName}" from device presets?`)) {
      removeDevicePreset(deviceName);
    }
  };

  return (
    <div className="space-y-6">
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

      {/* Device Management */}
      <Card>
        <div className="flex items-center gap-2 mb-4">
          <Smartphone className="w-6 h-6 text-blue-600" />
          <h2 className="text-xl font-bold text-gray-900">Device Presets</h2>
        </div>
        <p className="text-sm text-gray-600 mb-4">
          Manage preset device names for quick selection when adding accounts
        </p>

        {/* Add New Device */}
        <div className="flex gap-2 mb-4">
          <Input
            placeholder="e.g., iPhone 15 Pro, Samsung S24"
            value={newDevice}
            onChange={(e) => setNewDevice(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleAddDevice()}
          />
          <Button onClick={handleAddDevice} disabled={!newDevice.trim()}>
            <Plus className="w-4 h-4 mr-2" />
            Add
          </Button>
        </div>

        {/* Device Tags */}
        <div className="flex flex-wrap gap-2">
          {userSettings.devicePresets.length === 0 ? (
            <p className="text-sm text-gray-500 italic">No device presets yet. Add some above!</p>
          ) : (
            userSettings.devicePresets.map((device) => (
              <div
                key={device}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 border-2 border-blue-200 rounded-lg hover:bg-blue-100 transition-colors"
              >
                <Smartphone className="w-4 h-4 text-blue-600" />
                <span className="font-medium text-blue-900">{device}</span>
                <button
                  onClick={() => handleRemoveDevice(device)}
                  className="ml-2 text-blue-600 hover:text-red-600 transition-colors"
                  title="Remove device"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))
          )}
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

