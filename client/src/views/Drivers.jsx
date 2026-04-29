import { useState, useEffect } from 'react';
import { Plus, Pencil, Phone, User } from 'lucide-react';
import { api } from '../utils/api';
import { TableSkeleton } from '../components/LoadingSkeleton';
import DriverModal from '../components/DriverModal';
import { useToast } from '../hooks/useToast';

const STATUS_STYLES = {
  'Available': 'bg-green-400/15 text-green-300 ring-1 ring-green-400/30',
  'On Run':    'bg-purple-400/15 text-purple-300 ring-1 ring-purple-400/30',
  'Off Duty':  'bg-gray-700 text-gray-400 ring-1 ring-gray-600',
};

const STATUS_DOTS = {
  'Available': 'bg-green-400',
  'On Run':    'bg-purple-400 animate-pulse',
  'Off Duty':  'bg-gray-500',
};

const DRIVER_STATUSES = ['Available', 'On Run', 'Off Duty'];

function DriverStatusBadge({ status }) {
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-medium ${STATUS_STYLES[status] || STATUS_STYLES['Off Duty']}`}>
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${STATUS_DOTS[status] || 'bg-gray-500'}`} />
      {status}
    </span>
  );
}

export default function Drivers() {
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingDriver, setEditingDriver] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const { addToast } = useToast();

  const fetchDrivers = async () => {
    try {
      const data = await api.get('/drivers');
      setDrivers(data);
    } catch {
      addToast('Failed to load drivers', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchDrivers(); }, []);

  const handleStatusChange = async (id, status) => {
    try {
      const updated = await api.patch(`/drivers/${id}`, { status });
      setDrivers(prev => prev.map(d => d.id === id ? updated : d));
      addToast('Driver status updated', 'success');
    } catch { addToast('Failed to update status', 'error'); }
  };

  const handleSaved = (driver) => {
    if (editingDriver) {
      setDrivers(prev => prev.map(d => d.id === driver.id ? driver : d));
    } else {
      setDrivers(prev => [...prev, driver].sort((a, b) => a.name.localeCompare(b.name)));
    }
    setShowModal(false); setEditingDriver(null);
  };

  const available = drivers.filter(d => d.status === 'Available').length;
  const onRun     = drivers.filter(d => d.status === 'On Run').length;
  const offDuty   = drivers.filter(d => d.status === 'Off Duty').length;

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Drivers</h1>
          <p className="text-sm text-gray-500 mt-0.5">{drivers.length} on roster</p>
        </div>
        <button onClick={() => { setEditingDriver(null); setShowModal(true); }}
          className="flex items-center gap-1.5 px-4 py-2 bg-brand-500 hover:bg-brand-400 text-black font-semibold text-sm rounded-lg transition-colors">
          <Plus size={15} /> Add Driver
        </button>
      </div>

      {/* Stat pills */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: 'Available', count: available, dot: 'bg-green-400' },
          { label: 'On Run',    count: onRun,     dot: 'bg-purple-400 animate-pulse' },
          { label: 'Off Duty',  count: offDuty,   dot: 'bg-gray-500' },
        ].map(({ label, count, dot }) => (
          <div key={label} className="bg-gray-900 border border-gray-800 rounded-xl p-4 flex items-center gap-4">
            <div className={`w-3 h-3 rounded-full shrink-0 ${dot}`} />
            <div>
              <div className="text-2xl font-bold text-white">{count}</div>
              <div className="text-xs text-gray-500 mt-0.5">{label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Drivers grid */}
      {loading ? <TableSkeleton rows={3} /> : drivers.length === 0 ? (
        <div className="text-center py-20 text-gray-600">
          <div className="text-4xl mb-3">👤</div>
          <p className="text-lg font-medium text-gray-500">No drivers on roster</p>
          <p className="text-sm mt-1">Add your first driver above.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {drivers.map(d => (
            <div key={d.id} className="bg-gray-900 border border-gray-800 rounded-xl p-5 hover:border-gray-700 transition-colors">
              {/* Avatar & name */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center text-white font-semibold text-sm shrink-0">
                    {d.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <div className="text-white font-semibold text-sm">{d.name}</div>
                    {d.phone && (
                      <div className="flex items-center gap-1 text-xs text-gray-500 mt-0.5">
                        <Phone size={10} />
                        {d.phone}
                      </div>
                    )}
                  </div>
                </div>
                <button onClick={() => { setEditingDriver(d); setShowModal(true); }}
                  className="p-1.5 rounded-lg text-gray-600 hover:text-white hover:bg-gray-800 transition-colors">
                  <Pencil size={13} />
                </button>
              </div>

              {/* Status */}
              <div className="flex items-center justify-between">
                <DriverStatusBadge status={d.status} />
                <select
                  value={d.status}
                  onChange={e => handleStatusChange(d.id, e.target.value)}
                  className="bg-gray-800 border border-gray-700 text-gray-400 text-xs rounded-lg px-2 py-1 cursor-pointer focus:outline-none"
                >
                  {DRIVER_STATUSES.map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <DriverModal driver={editingDriver} onClose={() => { setShowModal(false); setEditingDriver(null); }} onSaved={handleSaved} />
      )}
    </div>
  );
}
