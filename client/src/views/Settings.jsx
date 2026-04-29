import { useState, useEffect, useCallback } from 'react';
import { KeyRound, LogOut, Loader2, User, Link2, Phone, Mail, Plane, MessageSquare, ChevronDown, ChevronUp, Save } from 'lucide-react';
import { api } from '../utils/api';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';

function StatusBadge({ connected, label }) {
  return (
    <span className={`text-xs font-medium px-2.5 py-1 rounded-full border ${
      connected
        ? 'text-green-400 border-green-500/30 bg-green-500/10'
        : 'text-gray-500 border-gray-700 bg-gray-800'
    }`}>
      {label || (connected ? 'Connected' : 'Not Connected')}
    </span>
  );
}

function IntegrationCard({ icon: Icon, iconColor, title, subtitle, connected, statusLabel, children }) {
  return (
    <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${iconColor}`}>
            <Icon size={18} />
          </div>
          <div>
            <p className="text-white text-sm font-semibold">{title}</p>
            <p className="text-gray-500 text-xs">{subtitle}</p>
          </div>
        </div>
        <StatusBadge connected={connected} label={statusLabel} />
      </div>
      {children}
    </div>
  );
}

export default function Settings() {
  const { user, logout } = useAuth();
  const { addToast } = useToast();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);

  const [integrations, setIntegrations] = useState(null);
  const [savingKeys, setSavingKeys] = useState(false);
  const [showVickyConfig, setShowVickyConfig] = useState(false);
  const [keys, setKeys] = useState({
    RETELL_API_KEY: '',
    RETELL_WEBHOOK_URL: '',
    RETELL_PHONE_NUMBER: '',
    TWILIO_ACCOUNT_SID: '',
    TWILIO_AUTH_TOKEN: '',
    TWILIO_PHONE_NUMBER: '',
    SENDGRID_API_KEY: '',
    AVIATIONSTACK_API_KEY: '',
  });

  const loadIntegrations = useCallback(() => {
    api.get('/integrations').then(setIntegrations).catch(() => {});
  }, []);

  useEffect(() => { loadIntegrations(); }, [loadIntegrations]);

  useEffect(() => {
    if (!integrations) return;
    setKeys(k => ({
      ...k,
      RETELL_WEBHOOK_URL: integrations.retell.webhookUrl || k.RETELL_WEBHOOK_URL,
      RETELL_PHONE_NUMBER: integrations.retell.phoneNumber || k.RETELL_PHONE_NUMBER,
      TWILIO_PHONE_NUMBER: integrations.twilio.phoneNumber || k.TWILIO_PHONE_NUMBER,
    }));
  }, [integrations]);

  const inputCls = 'w-full bg-gray-800 border border-gray-700 text-white text-sm rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500/50 placeholder:text-gray-600 transition-colors';
  const readOnlyCls = 'w-full bg-gray-800/60 border border-gray-700/50 text-gray-400 text-sm rounded-lg px-3 py-2.5 font-mono';

  const setKey = (field) => (e) => setKeys(k => ({ ...k, [field]: e.target.value }));

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
    setSaving(true);
    try {
      await api.post('/auth/change-password', { currentPassword, newPassword });
      addToast('Password changed successfully', 'success');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      addToast(err.message || 'Failed to change password', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveKeys = async () => {
    const updates = {};
    for (const [k, v] of Object.entries(keys)) {
      if (v.trim()) updates[k] = v.trim();
    }
    if (!Object.keys(updates).length) {
      addToast('No keys to save', 'error');
      return;
    }
    setSavingKeys(true);
    try {
      await api.patch('/integrations', updates);
      addToast('Integration settings saved', 'success');
      loadIntegrations();
    } catch (err) {
      addToast(err.message || 'Failed to save', 'error');
    } finally {
      setSavingKeys(false);
    }
  };

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Settings</h1>
        <p className="text-gray-500 text-sm mt-1">Manage your account and preferences</p>
      </div>

      {/* Account Info */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
        <div className="flex items-center gap-3 mb-4">
          <User size={16} className="text-brand-400" />
          <h2 className="text-white font-semibold text-sm">Account</h2>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-white text-sm font-medium">{user?.username}</p>
            <p className="text-gray-500 text-xs mt-0.5">Logged in</p>
          </div>
          <button
            onClick={logout}
            className="flex items-center gap-2 px-4 py-2 text-sm text-rose-400 hover:bg-rose-500/10 border border-rose-500/30 rounded-lg transition-colors"
          >
            <LogOut size={14} />
            Sign Out
          </button>
        </div>
      </div>

      {/* Change Password */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
        <div className="flex items-center gap-3 mb-4">
          <KeyRound size={16} className="text-brand-400" />
          <h2 className="text-white font-semibold text-sm">Change Password</h2>
        </div>
        <form onSubmit={handleChangePassword} className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1.5">Current Password</label>
            <input type="password" className={inputCls} value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} placeholder="Enter current password" required />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1.5">New Password</label>
            <input type="password" className={inputCls} value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="Enter new password" required />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1.5">Confirm New Password</label>
            <input type="password" className={inputCls} value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="Confirm new password" required />
          </div>
          <div className="pt-2">
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 px-5 py-2 bg-brand-500 hover:bg-brand-400 disabled:opacity-60 text-black font-semibold text-sm rounded-lg transition-colors"
            >
              {saving && <Loader2 size={14} className="animate-spin" />}
              {saving ? 'Saving…' : 'Update Password'}
            </button>
          </div>
        </form>
      </div>

      {/* Integration Settings */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
        <div className="flex items-center gap-3 mb-2">
          <Link2 size={16} className="text-brand-400" />
          <h2 className="text-white font-semibold text-sm">Integration Settings</h2>
        </div>
        <p className="text-gray-500 text-xs mb-5">Configure third-party service integrations</p>

        <div className="space-y-4">
          {/* RetellAI Voice Agent (Vicky) */}
          <IntegrationCard
            icon={Phone}
            iconColor="bg-brand-500/15 text-brand-400"
            title="RetellAI Voice Agent (Vicky)"
            subtitle="AI-powered phone booking system"
            connected={integrations?.retell.connected}
          >
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">API Key</label>
              <input className={inputCls} type="password" value={keys.RETELL_API_KEY} onChange={setKey('RETELL_API_KEY')} placeholder="Enter Retell API key" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">Webhook URL</label>
              <input className={readOnlyCls} value={keys.RETELL_WEBHOOK_URL} onChange={setKey('RETELL_WEBHOOK_URL')} placeholder="https://your-domain.com/api/webhook/vicky" />
            </div>
            <button
              type="button"
              onClick={() => setShowVickyConfig(!showVickyConfig)}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm text-gray-400 hover:text-white bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg transition-colors"
            >
              {showVickyConfig ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              View Vicky Agent Script & Config
            </button>
            {showVickyConfig && (
              <div className="bg-gray-900 border border-gray-700 rounded-lg p-3 text-xs text-gray-400 space-y-2">
                <p className="text-gray-300 font-medium">Agent Configuration</p>
                <p>The Vicky AI agent handles inbound calls and collects: client name, phone, pickup/dropoff addresses, date/time, passenger count, and car type preference.</p>
                <p>Webhook payload is sent to your configured URL on call completion with all booking data extracted from the conversation.</p>
              </div>
            )}
          </IntegrationCard>

          {/* Twilio SMS */}
          <IntegrationCard
            icon={MessageSquare}
            iconColor="bg-purple-500/15 text-purple-400"
            title="Twilio SMS"
            subtitle="SMS notifications and driver dispatch"
            connected={integrations?.twilio.connected}
          >
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5">Account SID</label>
                <input className={inputCls} value={keys.TWILIO_ACCOUNT_SID} onChange={setKey('TWILIO_ACCOUNT_SID')} placeholder="ACxxxxxxxx" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5">Auth Token</label>
                <input className={inputCls} type="password" value={keys.TWILIO_AUTH_TOKEN} onChange={setKey('TWILIO_AUTH_TOKEN')} placeholder="Enter auth token" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">AI Agent Phone Number</label>
              <input className={inputCls} value={keys.TWILIO_PHONE_NUMBER} onChange={setKey('TWILIO_PHONE_NUMBER')} placeholder="(475) 291-4348" />
              <p className="text-gray-600 text-xs mt-1.5">Customers call this number to book reservations via AI voice agent</p>
            </div>
          </IntegrationCard>

          {/* SendGrid Email */}
          <IntegrationCard
            icon={Mail}
            iconColor="bg-cyan-500/15 text-cyan-400"
            title="SendGrid Email"
            subtitle="Email confirmations and notifications"
            connected={integrations?.sendgrid.connected}
            statusLabel={integrations?.sendgrid.connected ? 'Verified' : undefined}
          >
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">API Key</label>
              <input className={inputCls} type="password" value={keys.SENDGRID_API_KEY} onChange={setKey('SENDGRID_API_KEY')} placeholder="SG.xxxxxxxx" />
            </div>
          </IntegrationCard>

          {/* AviationStack */}
          <IntegrationCard
            icon={Plane}
            iconColor="bg-amber-500/15 text-amber-400"
            title="AviationStack"
            subtitle="Real-time flight tracking"
            connected={integrations?.aviationstack.connected}
          >
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">API Key</label>
              <input className={inputCls} type="password" value={keys.AVIATIONSTACK_API_KEY} onChange={setKey('AVIATIONSTACK_API_KEY')} placeholder="Enter AviationStack API key" />
            </div>
            <p className="text-gray-600 text-xs">Live flight tracking powered by AviationStack API.</p>
          </IntegrationCard>
        </div>

        {/* Save All Keys */}
        <div className="pt-4 mt-4 border-t border-gray-800">
          <button
            type="button"
            onClick={handleSaveKeys}
            disabled={savingKeys}
            className="flex items-center gap-2 px-5 py-2 bg-brand-500 hover:bg-brand-400 disabled:opacity-60 text-black font-semibold text-sm rounded-lg transition-colors"
          >
            {savingKeys ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            {savingKeys ? 'Saving…' : 'Save Integration Settings'}
          </button>
        </div>
      </div>
    </div>
  );
}
