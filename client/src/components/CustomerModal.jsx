import { useState, useEffect } from 'react';
import { X, Loader2 } from 'lucide-react';
import { api } from '../utils/api';
import { useToast } from '../hooks/useToast';

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

export default function CustomerModal({ customer, onClose, onSaved }) {
  const { addToast } = useToast();
  const [saving, setSaving] = useState(false);
  const isEdit = !!customer;

  const [form, setForm] = useState({
    name: '', phone: '', email: '', notes: '',
  });

  useEffect(() => {
    if (customer) {
      setForm({
        name:  customer.name  || '',
        phone: customer.phone || '',
        email: customer.email || '',
        notes: customer.notes || '',
      });
    }
  }, [customer]);

  const set = (field) => (e) => setForm(f => ({ ...f, [field]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      let result;
      if (isEdit) {
        result = await api.patch(`/customers/${customer.id}`, form);
        addToast(`${result.name} updated`, 'success');
      } else {
        result = await api.post('/customers', form);
        addToast(`${result.name} added`, 'success');
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
          <h2 className="text-white font-semibold">{isEdit ? 'Edit Customer' : 'New Customer'}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-500 hover:text-white hover:bg-gray-800 transition-colors">
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <Field label="Name" required>
            <input className={inputCls} value={form.name} onChange={set('name')} placeholder="Full name" required autoFocus />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Phone" required>
              <input className={inputCls} value={form.phone} onChange={set('phone')} placeholder="(305) 555-0000" required />
            </Field>
            <Field label="Email" required>
              <input className={inputCls} type="email" value={form.email} onChange={set('email')} placeholder="email@example.com" required />
            </Field>
          </div>

          <Field label="Notes">
            <textarea className={`${inputCls} resize-none`} rows={3} value={form.notes} onChange={set('notes')} placeholder="VIP, preferences, special requests…" />
          </Field>

          <div className="flex items-center justify-end gap-3 pt-2 border-t border-gray-800">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={saving}
              className="flex items-center gap-2 px-5 py-2 bg-brand-500 hover:bg-brand-400 disabled:opacity-60 text-black font-semibold text-sm rounded-lg transition-colors">
              {saving && <Loader2 size={14} className="animate-spin" />}
              {isEdit ? 'Save Changes' : 'Add Customer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
