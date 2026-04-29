import { useState, useEffect } from 'react';
import { X, Loader2 } from 'lucide-react';
import { api } from '../utils/api';
import { useToast } from '../hooks/useToast';

const STATUSES = ['Available', 'On Run', 'Off Duty'];

const inputCls = 'w-full bg-gray-800 border border-gray-700 text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500/50 placeholder:text-gray-600 transition-colors';

function Field({ label, required, children }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-400 mb-1.5">
        {label}{required && <span className="text-rose-400 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}

export default function DriverModal({ driver, onClose, onSaved }) {
  const { addToast } = useToast();
  const [saving, setSaving] = useState(false);
  const isEdit = !!driver;

  const [form, setForm] = useState({ name: '', phone: '', status: 'Available' });

  useEffect(() => {
    if (driver) setForm({ name: driver.name, phone: driver.phone || '', status: driver.status });
  }, [driver]);

  const set = (field) => (e) => setForm(f => ({ ...f, [field]: e.target.value }));

  const handlePhoneChange = (e) => {
    const digits = e.target.value.replace(/\D/g, '').slice(0, 10);
    let formatted = digits;
    if (digits.length > 6) formatted = `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
    else if (digits.length > 3) formatted = `${digits.slice(0, 3)}-${digits.slice(3)}`;
    setForm(f => ({ ...f, phone: formatted }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      let result;
      if (isEdit) {
        result = await api.patch(`/drivers/${driver.id}`, form);
        addToast(`${result.name} updated`, 'success');
      } else {
        result = await api.post('/drivers', form);
        addToast(`${result.name} added to roster`, 'success');
      }
      onSaved(result);
    } catch (err) {
      addToast(err.message || 'Save failed', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in" onClick={onClose}>
      <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-md shadow-2xl animate-slide-up" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
          <h2 className="text-white font-semibold">{isEdit ? 'Edit Driver' : 'Add Driver'}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-500 hover:text-white hover:bg-gray-800 transition-colors">
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <Field label="Full Name" required>
            <input className={inputCls} value={form.name} onChange={set('name')} placeholder="Driver name" required />
          </Field>
          <Field label="Phone">
            <input className={inputCls} value={form.phone} onChange={handlePhoneChange} placeholder="305-555-0000" />
          </Field>
          <Field label="Status">
            <select className={`${inputCls} cursor-pointer`} value={form.status} onChange={set('status')}>
              {STATUSES.map(s => <option key={s}>{s}</option>)}
            </select>
          </Field>

          <div className="flex items-center justify-end gap-3 pt-2 border-t border-gray-800">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={saving}
              className="flex items-center gap-2 px-5 py-2 bg-brand-500 hover:bg-brand-400 disabled:opacity-60 text-black font-semibold text-sm rounded-lg transition-colors">
              {saving && <Loader2 size={14} className="animate-spin" />}
              {isEdit ? 'Save Changes' : 'Add Driver'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
