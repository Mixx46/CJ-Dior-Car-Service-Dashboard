import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import { LogOut } from 'lucide-react';
import ForgotPasswordModal from './ForgotPasswordModal';

export default function DriverLoginPage() {
  const [username, setUsername] = useState('driver1');
  const [password, setPassword] = useState('driver');
  const [loading, setLoading] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const { login } = useAuth();
  const { addToast } = useToast();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(username, password);
    } catch (err) {
      addToast(err.message || 'Login failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-2">
            <div className="w-10 h-10 bg-yellow-500 rounded-full flex items-center justify-center">
              <LogOut className="w-5 h-5 text-black" />
            </div>
            <h1 className="text-2xl font-bold text-white">CJ Dior</h1>
          </div>
          <p className="text-gray-400">Driver Portal</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-gray-900 border border-gray-800 rounded-lg p-6 space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-2">Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded text-white placeholder-gray-500 focus:outline-none focus:border-yellow-500"
              placeholder="driver1"
              disabled={loading}
            />
            <p className="text-xs text-gray-500 mt-1">Format: driver1, driver2, driver3</p>
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-2">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded text-white placeholder-gray-500 focus:outline-none focus:border-yellow-500"
              placeholder="••••••••"
              disabled={loading}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-yellow-500 hover:bg-yellow-600 disabled:bg-gray-700 text-black font-bold py-2 rounded transition"
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>

          <button
            type="button"
            onClick={() => setShowForgotPassword(true)}
            className="w-full text-yellow-500 hover:text-yellow-400 text-sm font-medium transition-colors"
          >
            Forgot password?
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-gray-400">
          <p>Demo Credentials:</p>
          <p className="mt-1 text-gray-500">Username: driver1, driver2, or driver3</p>
          <p className="text-gray-500">Password: driver</p>
        </div>
      </div>

      {showForgotPassword && (
        <ForgotPasswordModal onClose={() => setShowForgotPassword(false)} userType="driver" />
      )}
    </div>
  );
}
