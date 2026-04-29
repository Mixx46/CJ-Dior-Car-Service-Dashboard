import { useState } from 'react';
import { X, ArrowLeft } from 'lucide-react';
import { useToast } from '../hooks/useToast';

export default function ForgotPasswordModal({ onClose, userType = 'admin' }) {
  const [step, setStep] = useState(1); // 1: enter username, 2: enter token & new password
  const [username, setUsername] = useState('');
  const [token, setToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [resetToken, setResetToken] = useState('');
  const { addToast } = useToast();

  const handleRequestReset = async (e) => {
    e.preventDefault();
    if (!username.trim()) {
      addToast('Username is required', 'error');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim() })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setResetToken(data.token);
      setStep(2);
      addToast('Reset token generated! Check the token below.', 'success');
    } catch (err) {
      addToast(err.message || 'Failed to request password reset', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!token.trim()) {
      addToast('Reset token is required', 'error');
      return;
    }
    if (newPassword !== confirmPassword) {
      addToast('Passwords do not match', 'error');
      return;
    }
    if (newPassword.length < 4) {
      addToast('Password must be at least 4 characters', 'error');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: token.trim(), newPassword })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      addToast('Password reset successfully! You can now login.', 'success');
      onClose();
    } catch (err) {
      addToast(err.message || 'Failed to reset password', 'error');
    } finally {
      setLoading(false);
    }
  };

  const inputCls = 'w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded text-white placeholder-gray-500 focus:outline-none focus:border-yellow-500';
  const labelCls = 'block text-sm text-gray-400 mb-2';

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-gray-900 border border-gray-800 rounded-lg p-6 max-w-md w-full">
        <div className="flex items-center justify-between mb-4">
          {step === 2 && (
            <button
              onClick={() => setStep(1)}
              className="flex items-center gap-1 text-gray-400 hover:text-white text-sm"
            >
              <ArrowLeft size={16} />
              Back
            </button>
          )}
          <div className="flex-1" />
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white"
          >
            <X size={20} />
          </button>
        </div>

        {step === 1 ? (
          <>
            <h2 className="text-xl font-bold text-white mb-4">Reset Password</h2>
            <form onSubmit={handleRequestReset} className="space-y-4">
              <div>
                <label className={labelCls}>Username</label>
                <input
                  type="text"
                  className={inputCls}
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder={userType === 'driver' ? 'driver1' : 'admin'}
                  disabled={loading}
                  required
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-yellow-500 hover:bg-yellow-600 disabled:bg-gray-700 text-black font-bold py-2 rounded transition"
              >
                {loading ? 'Sending...' : 'Send Reset Token'}
              </button>
            </form>
          </>
        ) : (
          <>
            <h2 className="text-xl font-bold text-white mb-4">Reset Your Password</h2>

            {/* Display the reset token */}
            <div className="bg-gray-800 border border-gray-700 rounded p-3 mb-4">
              <p className="text-xs text-gray-400 mb-2">Your Reset Token (for demo):</p>
              <p className="text-xs font-mono text-yellow-400 break-all">{resetToken}</p>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(resetToken);
                  addToast('Token copied!', 'success');
                }}
                className="text-xs text-gray-400 hover:text-white mt-2"
              >
                Copy Token
              </button>
            </div>

            <form onSubmit={handleResetPassword} className="space-y-3">
              <div>
                <label className={labelCls}>Reset Token</label>
                <input
                  type="text"
                  className={inputCls}
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  placeholder="Paste your reset token here"
                  disabled={loading}
                  required
                />
              </div>
              <div>
                <label className={labelCls}>New Password</label>
                <input
                  type="password"
                  className={inputCls}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                  disabled={loading}
                  required
                />
              </div>
              <div>
                <label className={labelCls}>Confirm Password</label>
                <input
                  type="password"
                  className={inputCls}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  disabled={loading}
                  required
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-yellow-500 hover:bg-yellow-600 disabled:bg-gray-700 text-black font-bold py-2 rounded transition"
              >
                {loading ? 'Resetting...' : 'Reset Password'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
