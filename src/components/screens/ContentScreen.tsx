import { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { PlatformIcon } from '../ui/PlatformIcon';
import { PLATFORM_NAMES } from '../../constants/platforms';
import { FileText, Plus, Trash2, Copy, Check, RotateCcw, Calendar, Sunrise, Sunset } from 'lucide-react';
import { parseCaptionText } from '../../utils/captionParser';
import { format, addDays } from 'date-fns';

export function ContentScreen() {
  const { state, updateAccount } = useApp();
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const [captionText, setCaptionText] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleAddCaptions = () => {
    if (!selectedAccountId || !captionText.trim()) return;

    const parsedCaptions = parseCaptionText(captionText);
    
    if (parsedCaptions.length === 0) {
      alert('No captions detected. Please check your format.');
      return;
    }

    const account = state.accounts.find(a => a.id === selectedAccountId);
    if (!account) return;

    const existingCaptions = account.captions || [];
    const newCaptions = [...existingCaptions, ...parsedCaptions].slice(0, 6); // Max 6 captions

    updateAccount(selectedAccountId, { captions: newCaptions });
    
    setCaptionText('');
    setShowAddModal(false);
    setSelectedAccountId(null);
  };

  const handleDeleteCaption = (accountId: string, captionId: string) => {
    const account = state.accounts.find(a => a.id === accountId);
    if (!account || !account.captions) return;

    const updatedCaptions = account.captions.filter(c => c.id !== captionId);
    updateAccount(accountId, { captions: updatedCaptions });
  };

  const handleResetCaptions = (accountId: string) => {
    const account = state.accounts.find(a => a.id === accountId);
    if (!account || !account.captions) return;

    const resetCaptions = account.captions.map(c => ({ ...c, used: false }));
    updateAccount(accountId, { captions: resetCaptions });
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Get today and tomorrow dates
  const today = new Date();
  const tomorrow = addDays(today, 1);
  const todayStr = format(today, 'MMMM d');
  const tomorrowStr = format(tomorrow, 'MMMM d');

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4">
      <div className="max-w-6xl mx-auto py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-black text-gray-900 mb-2">Content Management</h1>
          <p className="text-gray-600 mb-4">
            Manage captions for your TikTok posts. Paste formatted captions and they'll be auto-assigned when you post.
          </p>
          
          {/* Content Preparation Timeline */}
          <Card className="bg-gradient-to-r from-indigo-50 to-purple-50 border-2 border-indigo-200">
            <div className="flex items-start gap-3">
              <Calendar className="w-6 h-6 text-indigo-600 mt-1 flex-shrink-0" />
              <div className="flex-1">
                <h3 className="font-bold text-indigo-900 mb-2">📅 Content Preparation Schedule</h3>
                <p className="text-sm text-indigo-800 mb-3">
                  Prepare captions for the next posting sessions:
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="bg-white p-3 rounded-lg border-l-4 border-orange-400">
                    <div className="flex items-center gap-2 mb-1">
                      <Sunset className="w-5 h-5 text-orange-600" />
                      <span className="font-semibold text-gray-900">Today Evening Shift</span>
                    </div>
                    <p className="text-xs text-gray-600">{todayStr} • After 2:00 PM</p>
                    <p className="text-xs text-orange-600 font-medium mt-1">3 captions needed per account</p>
                  </div>
                  <div className="bg-white p-3 rounded-lg border-l-4 border-blue-400">
                    <div className="flex items-center gap-2 mb-1">
                      <Sunrise className="w-5 h-5 text-blue-600" />
                      <span className="font-semibold text-gray-900">Tomorrow Morning Shift</span>
                    </div>
                    <p className="text-xs text-gray-600">{tomorrowStr} • Before 2:00 PM</p>
                    <p className="text-xs text-blue-600 font-medium mt-1">3 captions needed per account</p>
                  </div>
                </div>
                <p className="text-xs text-indigo-700 mt-3">
                  💡 Add 6 captions per account below (they'll auto-assign as you post)
                </p>
              </div>
            </div>
          </Card>
        </div>

        {/* No Content */}
        {state.accounts.length === 0 && (
          <Card className="text-center p-12">
            <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-2xl font-bold text-gray-900 mb-2">No Accounts Yet</h3>
            <p className="text-gray-600">
              Add accounts first to manage their content
            </p>
          </Card>
        )}

        {/* Accounts List */}
        <div className="space-y-6">
          {state.accounts.map(account => {
            const creator = state.creators.find(c => c.id === account.creatorId);
            if (!creator) return null;

            const captions = account.captions || [];
            const platformAccounts = state.accounts.filter(a => a.platform === account.platform);
            const accountIndex = platformAccounts.findIndex(a => a.id === account.id) + 1;
            
            // Split captions: first 3 = today evening, next 3 = tomorrow morning
            const eveningCaptions = captions.slice(0, 3);
            const morningCaptions = captions.slice(3, 6);
            
            const eveningUnused = eveningCaptions.filter(c => !c.used).length;
            const morningUnused = morningCaptions.filter(c => !c.used).length;
            
            const eveningNeeded = 3 - eveningCaptions.length;
            const morningNeeded = 3 - morningCaptions.length;

            return (
              <Card key={account.id} className="shadow-lg">
                <div className="border-b-2 border-gray-200 pb-4 mb-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <PlatformIcon platform={account.platform} className="w-10 h-10" />
                      <div>
                        <h2 className="text-2xl font-bold text-gray-900">
                          {PLATFORM_NAMES[account.platform]} {accountIndex} - {creator.name}
                        </h2>
                        <p className="text-sm text-gray-600">@{account.handle} • 📱 {account.device}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-3xl font-black text-blue-600">
                        {captions.length}/6
                      </div>
                      <p className="text-xs text-gray-600">Total captions</p>
                    </div>
                  </div>
                </div>

                {/* Today Evening Shift */}
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-3 pb-2 border-b-2 border-orange-300">
                    <div className="flex items-center gap-2">
                      <Sunset className="w-6 h-6 text-orange-600" />
                      <h3 className="text-xl font-bold text-gray-900">Today Evening Shift</h3>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-orange-600">{todayStr}</p>
                      <p className="text-xs text-gray-600">After 2:00 PM</p>
                    </div>
                  </div>

                  <div className="p-3 bg-orange-50 rounded-lg mb-3 border-l-4 border-orange-400">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold text-orange-900">
                          {eveningCaptions.length}/3 captions prepared
                        </p>
                        {eveningNeeded > 0 && (
                          <p className="text-xs text-orange-700 mt-1">
                            ⚠️ <strong>{eveningNeeded} caption{eveningNeeded > 1 ? 's' : ''} missing!</strong>
                          </p>
                        )}
                        {eveningCaptions.length === 3 && (
                          <p className="text-xs text-green-700 mt-1">
                            ✓ All captions ready • {eveningUnused} unused
                          </p>
                        )}
                      </div>
                      {eveningNeeded > 0 && (
                        <Button
                          onClick={() => {
                            setSelectedAccountId(account.id);
                            setShowAddModal(true);
                          }}
                          size="sm"
                          className="bg-orange-600 hover:bg-orange-700"
                        >
                          <Plus className="w-4 h-4 mr-1" />
                          Add
                        </Button>
                      )}
                    </div>
                  </div>

                  {eveningCaptions.length === 0 ? (
                    <div className="text-center py-6 bg-gray-50 rounded-lg">
                      <FileText className="w-10 h-10 text-gray-400 mx-auto mb-2" />
                      <p className="text-sm text-gray-600">No evening shift captions yet</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {eveningCaptions.map((caption, index) => (
                      <div
                        key={caption.id}
                        className={`border-2 rounded-lg p-4 ${
                          caption.used ? 'bg-gray-100 border-gray-300' : 'bg-white border-blue-300'
                        }`}
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <span className="text-lg font-bold text-gray-900">Caption {index + 1}</span>
                            {caption.used && (
                              <span className="px-2 py-1 bg-gray-600 text-white text-xs rounded-full">Used</span>
                            )}
                          </div>
                          <button
                            onClick={() => handleDeleteCaption(account.id, caption.id)}
                            className="p-2 hover:bg-red-100 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-4 h-4 text-red-600" />
                          </button>
                        </div>

                        {/* Slides */}
                        <div className="space-y-2 mb-3">
                          <p className="text-sm font-semibold text-gray-700">Slides ({caption.slides.length}):</p>
                          {caption.slides.map((slide, i) => (
                            <div key={i} className="flex items-start gap-2 bg-gray-50 p-2 rounded">
                              <span className="text-xs font-bold text-gray-500 mt-1">{i + 1}.</span>
                              <p className="text-sm text-gray-800 flex-1">{slide}</p>
                              <button
                                onClick={() => copyToClipboard(slide, `${caption.id}-slide-${i}`)}
                                className="p-1 hover:bg-gray-200 rounded transition-colors flex-shrink-0"
                              >
                                {copiedId === `${caption.id}-slide-${i}` ? (
                                  <Check className="w-4 h-4 text-green-600" />
                                ) : (
                                  <Copy className="w-4 h-4 text-gray-600" />
                                )}
                              </button>
                            </div>
                          ))}
                        </div>

                        {/* Title + Hashtags */}
                        <div className="bg-blue-50 p-3 rounded-lg">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1">
                              <p className="text-xs font-semibold text-blue-700 mb-1">Title + Hashtags:</p>
                              <p className="text-sm text-gray-900 font-medium">{caption.title}</p>
                              <p className="text-sm text-blue-700 mt-1">{caption.hashtags}</p>
                            </div>
                            <button
                              onClick={() => copyToClipboard(`${caption.title}\n\n${caption.hashtags}`, `${caption.id}-title`)}
                              className="p-2 hover:bg-blue-200 rounded transition-colors flex-shrink-0"
                            >
                              {copiedId === `${caption.id}-title` ? (
                                <Check className="w-5 h-5 text-green-600" />
                              ) : (
                                <Copy className="w-5 h-5 text-blue-600" />
                              )}
                            </button>
                          </div>
                        </div>
                      </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Tomorrow Morning Shift */}
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-3 pb-2 border-b-2 border-blue-300">
                    <div className="flex items-center gap-2">
                      <Sunrise className="w-6 h-6 text-blue-600" />
                      <h3 className="text-xl font-bold text-gray-900">Tomorrow Morning Shift</h3>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-blue-600">{tomorrowStr}</p>
                      <p className="text-xs text-gray-600">Before 2:00 PM</p>
                    </div>
                  </div>

                  <div className="p-3 bg-blue-50 rounded-lg mb-3 border-l-4 border-blue-400">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold text-blue-900">
                          {morningCaptions.length}/3 captions prepared
                        </p>
                        {morningNeeded > 0 && (
                          <p className="text-xs text-blue-700 mt-1">
                            ⚠️ <strong>{morningNeeded} caption{morningNeeded > 1 ? 's' : ''} missing!</strong>
                          </p>
                        )}
                        {morningCaptions.length === 3 && (
                          <p className="text-xs text-green-700 mt-1">
                            ✓ All captions ready • {morningUnused} unused
                          </p>
                        )}
                      </div>
                      {morningNeeded > 0 && (
                        <Button
                          onClick={() => {
                            setSelectedAccountId(account.id);
                            setShowAddModal(true);
                          }}
                          size="sm"
                          className="bg-blue-600 hover:bg-blue-700"
                        >
                          <Plus className="w-4 h-4 mr-1" />
                          Add
                        </Button>
                      )}
                    </div>
                  </div>

                  {morningCaptions.length === 0 ? (
                    <div className="text-center py-6 bg-gray-50 rounded-lg">
                      <FileText className="w-10 h-10 text-gray-400 mx-auto mb-2" />
                      <p className="text-sm text-gray-600">No morning shift captions yet</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {morningCaptions.map((caption, index) => (
                        <div
                          key={caption.id}
                          className={`border-2 rounded-lg p-4 ${
                            caption.used ? 'bg-gray-100 border-gray-300' : 'bg-white border-blue-300'
                          }`}
                        >
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <span className="text-lg font-bold text-gray-900">Caption {index + 1 + 3}</span>
                              {caption.used && (
                                <span className="px-2 py-1 bg-gray-600 text-white text-xs rounded-full">Used</span>
                              )}
                            </div>
                            <button
                              onClick={() => handleDeleteCaption(account.id, caption.id)}
                              className="p-2 hover:bg-red-100 rounded-lg transition-colors"
                            >
                              <Trash2 className="w-4 h-4 text-red-600" />
                            </button>
                          </div>

                          {/* Slides */}
                          <div className="space-y-2 mb-3">
                            <p className="text-sm font-semibold text-gray-700">Slides ({caption.slides.length}):</p>
                            {caption.slides.map((slide, i) => (
                              <div key={i} className="flex items-start gap-2 bg-gray-50 p-2 rounded">
                                <span className="text-xs font-bold text-gray-500 mt-1">{i + 1}.</span>
                                <p className="text-sm text-gray-800 flex-1">{slide}</p>
                                <button
                                  onClick={() => copyToClipboard(slide, `${caption.id}-slide-${i}`)}
                                  className="p-1 hover:bg-gray-200 rounded transition-colors flex-shrink-0"
                                >
                                  {copiedId === `${caption.id}-slide-${i}` ? (
                                    <Check className="w-4 h-4 text-green-600" />
                                  ) : (
                                    <Copy className="w-4 h-4 text-gray-600" />
                                  )}
                                </button>
                              </div>
                            ))}
                          </div>

                          {/* Title + Hashtags */}
                          <div className="bg-blue-50 p-3 rounded-lg">
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1">
                                <p className="text-xs font-semibold text-blue-700 mb-1">Title + Hashtags:</p>
                                <p className="text-sm text-gray-900 font-medium">{caption.title}</p>
                                <p className="text-sm text-blue-700 mt-1">{caption.hashtags}</p>
                              </div>
                              <button
                                onClick={() => copyToClipboard(`${caption.title}\n\n${caption.hashtags}`, `${caption.id}-title`)}
                                className="p-2 hover:bg-blue-200 rounded transition-colors flex-shrink-0"
                              >
                                {copiedId === `${caption.id}-title` ? (
                                  <Check className="w-5 h-5 text-green-600" />
                                ) : (
                                  <Copy className="w-5 h-5 text-blue-600" />
                                )}
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 pt-4 border-t-2 border-gray-200">
                  {captions.length < 6 && (
                    <Button
                      onClick={() => {
                        setSelectedAccountId(account.id);
                        setShowAddModal(true);
                      }}
                      variant="secondary"
                      className="flex-1"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add More ({6 - captions.length} slots)
                    </Button>
                  )}
                  {captions.some(c => c.used) && (
                    <Button
                      onClick={() => handleResetCaptions(account.id)}
                      variant="secondary"
                      className={captions.length < 6 ? '' : 'w-full'}
                    >
                      <RotateCcw className="w-4 h-4 mr-2" />
                      Reset All to Unused
                    </Button>
                  )}
                </div>
              </Card>
            );
          })}
        </div>

        {/* Add Captions Modal */}
        <Modal
          isOpen={showAddModal}
          onClose={() => {
            setShowAddModal(false);
            setSelectedAccountId(null);
            setCaptionText('');
          }}
          title="Add Captions"
          size="xl"
        >
          <div className="space-y-4">
            <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-900 mb-2">
                <strong>📋 Paste your formatted captions below</strong>
              </p>
              <p className="text-xs text-blue-800">
                The system will auto-detect: Slides, Title, and Hashtags from your formatted text.
                You can paste multiple captions at once (up to 6 total per account).
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Paste Formatted Captions
              </label>
              <textarea
                value={captionText}
                onChange={(e) => setCaptionText(e.target.value)}
                placeholder="Paste your formatted captions here..."
                className="w-full h-96 px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
              />
            </div>

            <div className="flex gap-3">
              <Button onClick={handleAddCaptions} fullWidth>
                Parse & Add Captions
              </Button>
              <Button
                onClick={() => {
                  setShowAddModal(false);
                  setSelectedAccountId(null);
                  setCaptionText('');
                }}
                variant="secondary"
              >
                Cancel
              </Button>
            </div>
          </div>
        </Modal>
      </div>
    </div>
  );
}

