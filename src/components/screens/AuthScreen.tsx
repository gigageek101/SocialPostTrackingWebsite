import { useState } from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Lock, User, LogIn, UserPlus, Globe, AlertTriangle } from 'lucide-react';
import { createCreatorWithPassword, authenticateCreator } from '../../services/supabaseService';

interface AuthScreenProps {
  username?: string; // From URL parameter
  onAuthenticated: (creatorId: string, username: string) => void;
}

export function AuthScreen({ username: urlUsername, onAuthenticated }: AuthScreenProps) {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [username, setUsername] = useState(urlUsername || '');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [timezone, setTimezone] = useState('America/Chicago');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rememberMe, setRememberMe] = useState(true); // Default to true

  const handleLogin = async () => {
    if (!username.trim() || !password.trim()) {
      setError('Username and password are required');
      return;
    }

    setLoading(true);
    setError(null);

    const { creator, error: authError } = await authenticateCreator(username, password);

    if (authError || !creator) {
      setError(authError || 'Authentication failed');
      setLoading(false);
      return;
    }

    // Save to localStorage if "Remember Forever" is checked
    if (rememberMe) {
      localStorage.setItem('rememberedAuth', JSON.stringify({
        creatorId: creator.id,
        username: username,
        timestamp: new Date().toISOString(),
      }));
    }

    onAuthenticated(creator.id, username);
    setLoading(false);
  };

  const handleSignup = async () => {
    if (!username.trim() || !password.trim() || !name.trim()) {
      setError('All fields are required');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    setError(null);

    const { creator, error: createError } = await createCreatorWithPassword(
      username,
      password,
      name,
      timezone
    );

    if (createError || !creator) {
      setError(createError || 'Failed to create creator');
      setLoading(false);
      return;
    }

    // Auto-save for new accounts
    if (rememberMe) {
      localStorage.setItem('rememberedAuth', JSON.stringify({
        creatorId: creator.id,
        username: username,
        timestamp: new Date().toISOString(),
      }));
    }

    onAuthenticated(creator.id, username);
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 flex items-center justify-center p-4">
      <Card className="max-w-md w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <Globe className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-black text-gray-900 mb-2">
            Social Post Tracker
          </h1>
          <p className="text-gray-600">
            {mode === 'login' ? 'Welcome back!' : 'Create your account'}
          </p>
          {urlUsername && (
            <div className="mt-3 p-3 bg-blue-50 border-2 border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800">
                🔗 Accessing: <strong>{urlUsername}</strong>
              </p>
            </div>
          )}
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border-2 border-red-200 rounded-lg flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0" />
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        {/* Form */}
        <div className="space-y-4 mb-6">
          {/* Username */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              <User className="w-4 h-4 inline mr-1" />
              Username
            </label>
            <Input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value.toLowerCase())}
              placeholder="e.g., allison"
              disabled={!!urlUsername || loading}
            />
            {mode === 'signup' && (
              <p className="text-xs text-gray-500 mt-1">
                Your URL will be: yoursite.com/<strong>{username || 'username'}</strong>
              </p>
            )}
          </div>

          {/* Password */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              <Lock className="w-4 h-4 inline mr-1" />
              Password
            </label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              disabled={loading}
            />
          </div>

          {/* Remember Forever */}
          <div className="flex items-center gap-3 p-3 bg-green-50 border-2 border-green-200 rounded-lg">
            <input
              type="checkbox"
              id="rememberMe"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="w-5 h-5 rounded border-gray-300 text-green-600 focus:ring-green-500"
            />
            <label htmlFor="rememberMe" className="flex-1 text-sm font-semibold text-green-900 cursor-pointer">
              🔒 Remember me forever on this device
            </label>
          </div>

          {/* Signup Only Fields */}
          {mode === 'signup' && (
            <>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Creator Name
                </label>
                <Input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., Allison Gray"
                  disabled={loading}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Timezone
                </label>
                <Input
                  type="text"
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                  placeholder="America/Chicago"
                  disabled={loading}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Default: America/Chicago (US Central Time)
                </p>
              </div>
            </>
          )}
        </div>

        {/* Action Buttons */}
        <div className="space-y-3">
          {mode === 'login' ? (
            <>
              <Button
                onClick={handleLogin}
                fullWidth
                disabled={loading}
                className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
              >
                {loading ? (
                  'Logging in...'
                ) : (
                  <>
                    <LogIn className="w-5 h-5 mr-2" />
                    Log In
                  </>
                )}
              </Button>
              <Button
                onClick={() => {
                  setMode('signup');
                  setError(null);
                }}
                variant="secondary"
                fullWidth
                disabled={loading}
              >
                <UserPlus className="w-5 h-5 mr-2" />
                Create New Account
              </Button>
            </>
          ) : (
            <>
              <Button
                onClick={handleSignup}
                fullWidth
                disabled={loading}
                className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
              >
                {loading ? (
                  'Creating...'
                ) : (
                  <>
                    <UserPlus className="w-5 h-5 mr-2" />
                    Create Account
                  </>
                )}
              </Button>
              <Button
                onClick={() => {
                  setMode('login');
                  setError(null);
                }}
                variant="secondary"
                fullWidth
                disabled={loading}
              >
                <LogIn className="w-5 h-5 mr-2" />
                Already Have an Account
              </Button>
            </>
          )}
        </div>

        {/* Info */}
        <div className="mt-8 p-4 bg-blue-50 border-2 border-blue-200 rounded-lg">
          <p className="text-xs text-blue-800 text-center">
            🔒 Your password is encrypted and secure<br />
            💾 All data syncs across devices automatically<br />
            🌐 Access from anywhere with your username + password
          </p>
        </div>
      </Card>
    </div>
  );
}

