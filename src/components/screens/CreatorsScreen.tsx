import { useState } from 'react';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { PlatformIcon } from '../ui/PlatformIcon';
import { Plus, Trash2, User } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { COMMON_TIMEZONES } from '../../utils/timezone';
import { DEFAULT_CREATOR_TIMEZONE, PLATFORM_NAMES } from '../../constants/platforms';
import { Platform } from '../../types';

export function CreatorsScreen() {
  const { state, addCreator, addAccount, deleteCreator, deleteAccount, updateCreator } = useApp();
  const [showCreatorModal, setShowCreatorModal] = useState(false);
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [selectedCreatorId, setSelectedCreatorId] = useState<string | null>(null);
  
  // Creator form
  const [creatorName, setCreatorName] = useState('');
  const [creatorTimezone, setCreatorTimezone] = useState(DEFAULT_CREATOR_TIMEZONE);
  const [creatorProfilePicture, setCreatorProfilePicture] = useState('');
  
  // Account form
  const [accountPlatform, setAccountPlatform] = useState<Platform>('tiktok');
  const [accountHandle, setAccountHandle] = useState('');
  const [accountDevice, setAccountDevice] = useState('');
  const [accountProfileLink, setAccountProfileLink] = useState('');

  const handleAddCreator = () => {
    if (!creatorName.trim()) return;
    
    const creator = addCreator(creatorName, creatorTimezone);
    if (creatorProfilePicture) {
      updateCreator(creator.id, { profilePicture: creatorProfilePicture });
    }
    setCreatorName('');
    setCreatorTimezone(DEFAULT_CREATOR_TIMEZONE);
    setCreatorProfilePicture('');
    setShowCreatorModal(false);
  };

  const handleProfilePictureUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      setCreatorProfilePicture(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleAddAccount = () => {
    if (!selectedCreatorId || !accountHandle.trim() || !accountDevice.trim()) return;
    
    addAccount(selectedCreatorId, accountPlatform, accountHandle, accountDevice, accountProfileLink);
    setAccountHandle('');
    setAccountDevice('');
    setAccountProfileLink('');
    setShowAccountModal(false);
  };

  const timezoneOptions = COMMON_TIMEZONES.map((tz) => ({
    value: tz,
    label: tz.replace(/_/g, ' '),
  }));

  const platformOptions = Object.entries(PLATFORM_NAMES).map(([value, label]) => ({
    value,
    label,
  }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Creators & Accounts</h1>
          <p className="text-white/80 mt-1">Manage your creators and their platform accounts</p>
        </div>
        <Button onClick={() => setShowCreatorModal(true)}>
          <Plus className="w-5 h-5 mr-2" />
          Add Creator
        </Button>
      </div>

      {/* Creators List */}
      {state.creators.length === 0 ? (
        <Card>
          <div className="text-center py-12">
            <div className="inline-flex items-center justify-center p-4 bg-gray-100 rounded-full mb-4">
              <User className="w-12 h-12 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Creators Yet</h3>
            <p className="text-gray-600 mb-4">
              Add your first creator to start tracking posts
            </p>
            <Button onClick={() => setShowCreatorModal(true)}>
              <Plus className="w-5 h-5 mr-2" />
              Add Creator
            </Button>
          </div>
        </Card>
      ) : (
        <div className="grid gap-6">
          {state.creators.map((creator) => {
            const accounts = state.accounts.filter((a) => a.creatorId === creator.id);
            
            return (
              <Card key={creator.id}>
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-4">
                    {creator.profilePicture ? (
                      <img 
                        src={creator.profilePicture} 
                        alt={creator.name}
                        className="w-16 h-16 rounded-full object-cover border-2 border-gray-200"
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white text-2xl font-bold">
                        {creator.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div>
                      <h3 className="text-xl font-bold text-gray-900">{creator.name}</h3>
                      <p className="text-sm text-gray-600">
                        Timezone: {creator.timezone.replace(/_/g, ' ')}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => {
                        setSelectedCreatorId(creator.id);
                        setShowAccountModal(true);
                      }}
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      Add Account
                    </Button>
                    <Button
                      size="sm"
                      variant="danger"
                      onClick={() => {
                        if (confirm(`Delete ${creator.name} and all their accounts?`)) {
                          deleteCreator(creator.id);
                        }
                      }}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                {/* Accounts */}
                {accounts.length === 0 ? (
                  <div className="text-center py-6 bg-gray-50 rounded-lg">
                    <p className="text-gray-600 text-sm">No accounts added yet</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {accounts.map((account) => (
                      <div
                        key={account.id}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          <PlatformIcon platform={account.platform} className="w-8 h-8" />
                          <div>
                            <p className="font-medium text-gray-900">
                              {PLATFORM_NAMES[account.platform]}
                            </p>
                            <p className="text-sm text-gray-600">{account.handle}</p>
                            <p className="text-xs text-gray-500">📱 {account.device}</p>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            if (confirm(`Delete ${account.handle}?`)) {
                              deleteAccount(account.id);
                            }
                          }}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* Add Creator Modal */}
      <Modal
        isOpen={showCreatorModal}
        onClose={() => setShowCreatorModal(false)}
        title="Add Creator"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Profile Picture (Optional)
            </label>
            {creatorProfilePicture && (
              <div className="mb-3 flex justify-center">
                <img 
                  src={creatorProfilePicture} 
                  alt="Preview"
                  className="w-24 h-24 rounded-full object-cover border-2 border-gray-200"
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

          <Input
            label="Creator Name"
            placeholder="Enter creator name"
            value={creatorName}
            onChange={(e) => setCreatorName(e.target.value)}
          />
          
          <Select
            label="Creator Timezone"
            options={timezoneOptions}
            value={creatorTimezone}
            onChange={(e) => setCreatorTimezone(e.target.value)}
          />

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-sm text-blue-900">
              Default timezone is Chicago (CT). This is used for Instagram and Facebook posting times.
            </p>
          </div>

          <div className="flex gap-3">
            <Button onClick={handleAddCreator} fullWidth>
              Add Creator
            </Button>
            <Button onClick={() => setShowCreatorModal(false)} fullWidth variant="secondary">
              Cancel
            </Button>
          </div>
        </div>
      </Modal>

      {/* Add Account Modal */}
      <Modal
        isOpen={showAccountModal}
        onClose={() => setShowAccountModal(false)}
        title="Add Platform Account"
      >
        <div className="space-y-4">
          <Select
            label="Platform"
            options={platformOptions}
            value={accountPlatform}
            onChange={(e) => setAccountPlatform(e.target.value as Platform)}
          />
          
          <Input
            label="Handle / Username"
            placeholder="@username"
            value={accountHandle}
            onChange={(e) => setAccountHandle(e.target.value)}
          />

          <Input
            label="Device"
            placeholder="e.g., iPhone 12, Samsung S21, iPad Pro"
            value={accountDevice}
            onChange={(e) => setAccountDevice(e.target.value)}
          />
          
          <Input
            label="Profile Link (Optional)"
            placeholder="https://..."
            value={accountProfileLink}
            onChange={(e) => setAccountProfileLink(e.target.value)}
          />

          <div className="flex gap-3">
            <Button onClick={handleAddAccount} fullWidth>
              Add Account
            </Button>
            <Button onClick={() => setShowAccountModal(false)} fullWidth variant="secondary">
              Cancel
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

