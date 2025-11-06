import { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { PlatformIcon } from '../ui/PlatformIcon';
import { PLATFORM_NAMES } from '../../constants/platforms';
import { FileText, Plus, Trash2, Copy, Check } from 'lucide-react';
import { parseCaptionText } from '../../utils/captionParser';

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

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4">
      <div className="max-w-6xl mx-auto py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-black text-gray-900 mb-2">Content Management</h1>
          <p className="text-gray-600">
            Manage captions for your TikTok posts. Paste formatted captions and they'll be auto-assigned when you post.
          </p>
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
            const unusedCount = captions.filter(c => !c.used).length;

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
                      <p className="text-xs text-gray-600">{unusedCount} unused</p>
                    </div>
                  </div>
                </div>

                {/* Captions */}
                {captions.length === 0 ? (
                  <div className="text-center py-8">
                    <FileText className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-600 mb-4">No captions yet</p>
                    <Button
                      onClick={() => {
                        setSelectedAccountId(account.id);
                        setShowAddModal(true);
                      }}
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add Captions
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {captions.map((caption, index) => (
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

                    {captions.length < 6 && (
                      <Button
                        onClick={() => {
                          setSelectedAccountId(account.id);
                          setShowAddModal(true);
                        }}
                        variant="secondary"
                        className="w-full"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Add More Captions ({6 - captions.length} slots available)
                      </Button>
                    )}
                  </div>
                )}
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

