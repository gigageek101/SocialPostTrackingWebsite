import { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Settings, Bell, User, Clock, Image, Save, HelpCircle } from 'lucide-react';

export function CreatorSettingsScreen() {
  const { state, updateCreator } = useApp();
  const [selectedCreatorId, setSelectedCreatorId] = useState<string | null>(
    state.creators[0]?.id || null
  );
  const [showTelegramHelp, setShowTelegramHelp] = useState(false);

  const selectedCreator = state.creators.find(c => c.id === selectedCreatorId);

  const [name, setName] = useState(selectedCreator?.name || '');
  const [timezone, setTimezone] = useState(selectedCreator?.timezone || 'America/Chicago');
  const [profilePicture, setProfilePicture] = useState(selectedCreator?.profilePicture || '');
  const [telegramBotToken, setTelegramBotToken] = useState(selectedCreator?.telegramBotToken || '');
  const [telegramChatId, setTelegramChatId] = useState(selectedCreator?.telegramChatId || '');

  const handleProfilePictureUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      setProfilePicture(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSave = () => {
    if (!selectedCreatorId) return;

    updateCreator(selectedCreatorId, {
      name,
      timezone,
      profilePicture,
      telegramBotToken: telegramBotToken.trim(),
      telegramChatId: telegramChatId.trim(),
    });

    alert('✅ Creator settings saved successfully!');
  };

  // Update form when creator changes
  const handleCreatorChange = (creatorId: string) => {
    setSelectedCreatorId(creatorId);
    const creator = state.creators.find(c => c.id === creatorId);
    if (creator) {
      setName(creator.name);
      setTimezone(creator.timezone);
      setProfilePicture(creator.profilePicture || '');
      setTelegramBotToken(creator.telegramBotToken || '');
      setTelegramChatId(creator.telegramChatId || '');
    }
  };

  if (state.creators.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-3 sm:p-4 pb-24 sm:pb-4">
        <div className="max-w-4xl mx-auto py-8">
          <Card className="text-center p-8">
            <User className="w-16 h-16 mx-auto text-gray-400 mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">No Creators Yet</h2>
            <p className="text-gray-600 mb-4">
              Go to the Creators tab to add your first creator
            </p>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-3 sm:p-4 pb-24 sm:pb-4">
      <div className="max-w-4xl mx-auto py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-black text-gray-900 mb-2 flex items-center gap-3">
            <Settings className="w-10 h-10 text-indigo-600" />
            Creator Settings
          </h1>
          <p className="text-gray-600">
            Manage your creator profile, notifications, and preferences
          </p>
        </div>

        {/* Creator Selector */}
        {state.creators.length > 1 && (
          <Card className="mb-6">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Select Creator
            </label>
            <select
              value={selectedCreatorId || ''}
              onChange={(e) => handleCreatorChange(e.target.value)}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
              {state.creators.map((creator) => (
                <option key={creator.id} value={creator.id}>
                  {creator.name}
                </option>
              ))}
            </select>
          </Card>
        )}

        {selectedCreator && (
          <>
            {/* Profile Settings */}
            <Card className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <User className="w-6 h-6 text-indigo-600" />
                Profile Information
              </h2>

              <div className="space-y-4">
                {/* Profile Picture */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    <Image className="w-4 h-4 inline mr-1" />
                    Profile Picture
                  </label>
                  {profilePicture && (
                    <div className="mb-3">
                      <img
                        src={profilePicture}
                        alt="Profile"
                        className="w-24 h-24 rounded-full object-cover border-4 border-indigo-200"
                      />
                    </div>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleProfilePictureUpload}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus-ring"
                  />
                </div>

                {/* Name */}
                <Input
                  label="Creator Name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., Allison Gray"
                />

                {/* Timezone */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    <Clock className="w-4 h-4 inline mr-1" />
                    Timezone
                  </label>
                  <Input
                    value={timezone}
                    onChange={(e) => setTimezone(e.target.value)}
                    placeholder="America/Chicago"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Default: America/Chicago (US Central Time)
                  </p>
                </div>
              </div>
            </Card>

            {/* Telegram Notifications */}
            <Card className="mb-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                  <Bell className="w-6 h-6 text-indigo-600" />
                  Telegram Notifications
                </h2>
                <Button
                  onClick={() => setShowTelegramHelp(!showTelegramHelp)}
                  variant="secondary"
                  size="sm"
                  className="flex items-center gap-2"
                >
                  <HelpCircle className="w-4 h-4" />
                  {showTelegramHelp ? 'Hide' : 'Show'} Instructions
                </Button>
              </div>

              {/* Instructions */}
              {showTelegramHelp && (
                <div className="mb-6 p-6 bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-300 rounded-xl">
                  <h3 className="text-xl font-bold text-blue-900 mb-4">
                    📱 How to Setup Telegram Bot Notifications
                  </h3>

                  {/* Step 1: Create Bot */}
                  <div className="mb-6 p-4 bg-white rounded-lg border-2 border-blue-200">
                    <h4 className="font-bold text-blue-900 mb-3 text-lg">
                      🤖 Step 1: Create Your Bot
                    </h4>
                    <ol className="space-y-2 text-sm text-gray-800">
                      <li className="flex gap-2">
                        <span className="font-bold text-blue-600">1️⃣</span>
                        <span>Open <strong>Telegram</strong> app on your phone or desktop</span>
                      </li>
                      <li className="flex gap-2">
                        <span className="font-bold text-blue-600">2️⃣</span>
                        <span>Search for <code className="px-2 py-1 bg-gray-100 rounded">@BotFather</code> (official bot)</span>
                      </li>
                      <li className="flex gap-2">
                        <span className="font-bold text-blue-600">3️⃣</span>
                        <span>Start chat and send: <code className="px-2 py-1 bg-gray-100 rounded">/newbot</code></span>
                      </li>
                      <li className="flex gap-2">
                        <span className="font-bold text-blue-600">4️⃣</span>
                        <span>Give your bot a <strong>name</strong> (e.g., "My Post Tracker")</span>
                      </li>
                      <li className="flex gap-2">
                        <span className="font-bold text-blue-600">5️⃣</span>
                        <span>Give your bot a <strong>username</strong> (must end with "bot", e.g., "myposttracker_bot")</span>
                      </li>
                      <li className="flex gap-2">
                        <span className="font-bold text-blue-600">6️⃣</span>
                        <span>BotFather will send you a <strong>token</strong> like:<br />
                          <code className="px-2 py-1 bg-yellow-100 rounded text-xs break-all">
                            1234567890:ABCdefGHIjklMNOpqrsTUVwxyz
                          </code>
                        </span>
                      </li>
                      <li className="flex gap-2">
                        <span className="font-bold text-green-600">✅</span>
                        <span><strong>Copy this token</strong> and paste it below!</span>
                      </li>
                    </ol>
                  </div>

                  {/* Step 2: Get Chat ID */}
                  <div className="mb-6 p-4 bg-white rounded-lg border-2 border-purple-200">
                    <h4 className="font-bold text-purple-900 mb-3 text-lg">
                      💬 Step 2: Get Your Chat ID
                    </h4>
                    
                    <div className="mb-4">
                      <p className="font-semibold text-purple-800 mb-2">📱 Option A: For Personal Chat (Easiest)</p>
                      <ol className="space-y-2 text-sm text-gray-800">
                        <li className="flex gap-2">
                          <span className="font-bold text-purple-600">1️⃣</span>
                          <span>Search for <code className="px-2 py-1 bg-gray-100 rounded">@userinfobot</code> in Telegram</span>
                        </li>
                        <li className="flex gap-2">
                          <span className="font-bold text-purple-600">2️⃣</span>
                          <span>Start the bot (click START)</span>
                        </li>
                        <li className="flex gap-2">
                          <span className="font-bold text-purple-600">3️⃣</span>
                          <span>It will show your <strong>ID</strong> (e.g., <code className="px-2 py-1 bg-yellow-100 rounded">987654321</code>)</span>
                        </li>
                        <li className="flex gap-2">
                          <span className="font-bold text-green-600">✅</span>
                          <span><strong>Copy this ID</strong> and paste it below!</span>
                        </li>
                      </ol>
                    </div>

                    <div className="p-3 bg-purple-50 rounded-lg border border-purple-200">
                      <p className="font-semibold text-purple-800 mb-2">👥 Option B: For Group Chat (Advanced)</p>
                      <ol className="space-y-2 text-sm text-gray-800">
                        <li className="flex gap-2">
                          <span className="font-bold text-purple-600">1️⃣</span>
                          <span>Create a group in Telegram</span>
                        </li>
                        <li className="flex gap-2">
                          <span className="font-bold text-purple-600">2️⃣</span>
                          <span>Add your bot to the group (search by username)</span>
                        </li>
                        <li className="flex gap-2">
                          <span className="font-bold text-purple-600">3️⃣</span>
                          <span>Send a message in the group (e.g., "Hello bot!")</span>
                        </li>
                        <li className="flex gap-2">
                          <span className="font-bold text-purple-600">4️⃣</span>
                          <span>Open this URL in browser (replace TOKEN with your bot token):<br />
                            <code className="px-2 py-1 bg-gray-100 rounded text-xs break-all">
                              https://api.telegram.org/bot<strong>YOUR_TOKEN</strong>/getUpdates
                            </code>
                          </span>
                        </li>
                        <li className="flex gap-2">
                          <span className="font-bold text-purple-600">5️⃣</span>
                          <span>Look for <code className="px-2 py-1 bg-yellow-100 rounded">"chat":{'{'}  "id":-1001234567890{'}'}</code></span>
                        </li>
                        <li className="flex gap-2">
                          <span className="font-bold text-purple-600">6️⃣</span>
                          <span>Group IDs start with <strong>-100</strong> (e.g., <code className="px-2 py-1 bg-yellow-100 rounded">-1001234567890</code>)</span>
                        </li>
                        <li className="flex gap-2">
                          <span className="font-bold text-green-600">✅</span>
                          <span><strong>Copy this ID</strong> (including the minus sign!) and paste below!</span>
                        </li>
                      </ol>
                    </div>
                  </div>

                  {/* Step 3: Enable */}
                  <div className="p-4 bg-white rounded-lg border-2 border-green-200">
                    <h4 className="font-bold text-green-900 mb-3 text-lg">
                      🔔 Step 3: Enable Notifications
                    </h4>
                    <ol className="space-y-2 text-sm text-gray-800">
                      <li className="flex gap-2">
                        <span className="font-bold text-green-600">1️⃣</span>
                        <span>Paste your <strong>Bot Token</strong> below</span>
                      </li>
                      <li className="flex gap-2">
                        <span className="font-bold text-green-600">2️⃣</span>
                        <span>Paste your <strong>Chat ID</strong> below</span>
                      </li>
                      <li className="flex gap-2">
                        <span className="font-bold text-green-600">3️⃣</span>
                        <span>Click <strong>"Save Settings"</strong></span>
                      </li>
                      <li className="flex gap-2">
                        <span className="font-bold text-green-600">4️⃣</span>
                        <span><strong>Important:</strong> Start a chat with your bot (search for it in Telegram and click START)</span>
                      </li>
                      <li className="flex gap-2">
                        <span className="font-bold text-green-600">✨</span>
                        <span><strong>Done!</strong> You'll now receive notifications! 🎉</span>
                      </li>
                    </ol>
                  </div>

                  {/* What You'll Get */}
                  <div className="mt-4 p-4 bg-gradient-to-r from-yellow-50 to-orange-50 rounded-lg border-2 border-yellow-300">
                    <h4 className="font-bold text-yellow-900 mb-2">
                      🎁 What You'll Get:
                    </h4>
                    <ul className="space-y-1 text-sm text-gray-800">
                      <li>⏰ <strong>Post Reminders:</strong> "Time to post TikTok 1!"</li>
                      <li>✅ <strong>Post Confirmations:</strong> "Post done! Wait 2 hours."</li>
                      <li>📊 <strong>Daily Summary:</strong> "12 posts complete! Great work!"</li>
                    </ul>
                  </div>
                </div>
              )}

              {/* Form Fields */}
              <div className="space-y-4">
                <Input
                  label="🤖 Bot Token"
                  value={telegramBotToken}
                  onChange={(e) => setTelegramBotToken(e.target.value)}
                  placeholder="1234567890:ABCdefGHIjklMNOpqrsTUVwxyz"
                />

                <Input
                  label="💬 Chat ID"
                  value={telegramChatId}
                  onChange={(e) => setTelegramChatId(e.target.value)}
                  placeholder="987654321 or -1001234567890"
                />

                {telegramBotToken && telegramChatId && (
                  <div className="p-3 bg-green-50 border-2 border-green-300 rounded-lg">
                    <p className="text-sm text-green-800">
                      ✅ <strong>Notifications Enabled!</strong> You'll receive Telegram messages for your posts.
                    </p>
                  </div>
                )}

                {(!telegramBotToken || !telegramChatId) && (
                  <div className="p-3 bg-yellow-50 border-2 border-yellow-300 rounded-lg">
                    <p className="text-sm text-yellow-800">
                      ⚠️ <strong>Notifications Disabled:</strong> Add both Bot Token and Chat ID to enable.
                    </p>
                  </div>
                )}
              </div>
            </Card>

            {/* Save Button */}
            <div className="flex gap-3">
              <Button onClick={handleSave} fullWidth className="bg-gradient-to-r from-indigo-600 to-purple-600">
                <Save className="w-5 h-5 mr-2" />
                Save Settings
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

