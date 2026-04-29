import { useState } from 'react';
import { KeyRound, User } from 'lucide-react';
import { api } from '../utils/api';
import { useToast } from '../hooks/useToast';

export default function DriverSettings() {
  const { addToast } = useToast();
  const [newUsername, setNewUsername] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingUsername, setSavingUsername] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  const handleChangeUsername = async (e) => {
    e.preventDefault();
    if (!newUsername.trim()) {
      addToast('Username is required', 'error');
      return;
    }
    if (newUsername.length < 3) {
      addToast('Username must be at least 3 characters', 'error');
      return;
    }
    setSavingUsername(true);
    try {
      await api.post('/auth/change-username', { newUsername });
      addToast('Username changed successfully', 'success');
      setNewUsername('');
    } catch (err) {
      addToast(err.message || 'Failed to change username', 'error');
    } finally {
      setSavingUsername(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      addToast('New passwords do not match', 'error');
      return;
    }
    if (newPassword.length < 4) {
      addToast('Password must be at least 4 characters', 'error');
      return;
    }
    setSavingPassword(true);
    try {
      await api.post('/auth/change-password', { currentPassword, newPassword });
      addToast('Password changed successfully', 'success');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      addToast(err.message || 'Failed to change password', 'error');
    } finally {
      setSavingPassword(false);
    }
  };

  const inputCls = 'w-full bg-gray-900 border border-gray-700 text-white text-sm rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-yellow-500/50 placeholder:text-gray-600';

  return (
    <div className="max-w-2xl">
      <h2 className="text-xl font-bold text-white mb-6">Account Settings</h2>

      {/* Change Username */}
      <div className="bg-gray-900 border border-gray-800 rounded-lg p-4 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <User size={16} className="text-yellow-500" />
          <h3 className="text-white font-semibold text-sm">Change Username</h3>
        </div>
        <form onSubmit={handleChangeUsername} className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1.5">New Username</label>
            <input
              type="text"
              className={inputCls}
              value={newUsername}
              onChange={e => setNewUsername(e.target.value)}
              placeholder="Enter new username"
              disabled={savingUsername}
            />
          </div>
          <button
            type="submit"
            disabled={savingUsername}
            className="px-4 py-2 bg-yellow-500 hover:bg-yellow-600 disabled:opacity-60 text-black font-semibold text-sm rounded transition-colors"
          >
            {savingUsername ? 'Saving…' : 'Update Username'}
          </button>
        </form>
      </div>

      {/* Change Password */}
      <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
        <div className="flex items-center gap-2 mb-4">
          <KeyRound size={16} className="text-yellow-500" />
          <h3 className="text-white font-semibold text-sm">Change Password</h3>
        </div>
        <form onSubmit={handleChangePassword} className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1.5">Current Password</label>
            <input
              type="password"
              className={inputCls}
              value={currentPassword}
              onChange={e => setCurrentPassword(e.target.value)}
              placeholder="Enter current password"
              disabled={savingPassword}
              required
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1.5">New Password</label>
            <input
              type="password"
              className={inputCls}
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              placeholder="Enter new password"
              disabled={savingPassword}
              required
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1.5">Confirm New Password</label>
            <input
              type="password"
              className={inputCls}
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              placeholder="Confirm new password"
              disabled={savingPassword}
              required
            />
          </div>
          <button
            type="submit"
            disabled={savingPassword}
            className="px-4 py-2 bg-yellow-500 hover:bg-yellow-600 disabled:opacity-60 text-black font-semibold text-sm rounded transition-colors"
          >
            {savingPassword ? 'Saving…' : 'Update Password'}
          </button>
        </form>
      </div>
    </div>
  );
}
