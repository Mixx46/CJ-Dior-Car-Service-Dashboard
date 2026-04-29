import { useState, useEffect, useCallback } from 'react';
import { Plus, Search, Phone, Mail, Pencil, Trash2, ChevronDown, ChevronUp, MapPin, Car } from 'lucide-react';
import { api, fmtDateTime } from '../utils/api';
import { TableSkeleton } from '../components/LoadingSkeleton';
import CustomerModal from '../components/CustomerModal';
import StatusBadge from '../components/StatusBadge';
import { useToast } from '../hooks/useToast';

function CustomerRow({ customer, onEdit, onDelete, onToggle, expanded }) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl hover:border-gray-700 transition-colors">
      <div className="flex items-center gap-4 p-4 cursor-pointer" onClick={onToggle}>
        {/* Avatar */}
        <div className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center text-white font-semibold text-sm shrink-0">
          {customer.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="text-white font-semibold text-sm">{customer.name}</div>
          <div className="flex items-center gap-3 mt-0.5 flex-wrap">
            {customer.phone && (
              <span className="flex items-center gap-1 text-xs text-gray-500">
                <Phone size={10} />{customer.phone}
              </span>
            )}
            {customer.email && (
              <span className="flex items-center gap-1 text-xs text-gray-500">
                <Mail size={10} />{customer.email}
              </span>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="text-right shrink-0 mr-2">
          <div className="text-white font-semibold text-sm">{customer.total_rides || 0}</div>
          <div className="text-[10px] text-gray-500">{customer.total_rides === 1 ? 'ride' : 'rides'}</div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 shrink-0">
          <button onClick={e => { e.stopPropagation(); onEdit(); }}
            className="p-1.5 rounded-lg text-gray-600 hover:text-white hover:bg-gray-800 transition-colors">
            <Pencil size={13} />
          </button>
          <button onClick={e => { e.stopPropagation(); onDelete(); }}
            className="p-1.5 rounded-lg text-gray-600 hover:text-rose-400 hover:bg-rose-500/10 transition-colors">
            <Trash2 size={13} />
          </button>
          {expanded ? <ChevronUp size={14} className="text-gray-500" /> : <ChevronDown size={14} className="text-gray-500" />}
        </div>
      </div>

      {/* Expanded ride history */}
      {expanded && (
        <div className="border-t border-gray-800 px-4 py-3">
          {customer.notes && (
            <p className="text-xs text-amber-400/70 mb-3">Notes: {customer.notes}</p>
          )}
          <RideHistory customerId={customer.id} />
        </div>
      )}
    </div>
  );
}

function RideHistory({ customerId }) {
  const [rides, setRides] = useState(null);

  useEffect(() => {
    api.get(`/customers/${customerId}`).then(data => setRides(data.rides || [])).catch(() => setRides([]));
  }, [customerId]);

  if (rides === null) {
    return <div className="text-xs text-gray-600 py-2">Loading ride history…</div>;
  }

  if (rides.length === 0) {
    return <div className="text-xs text-gray-600 py-2">No ride history yet.</div>;
  }

  return (
    <div className="space-y-2 max-h-60 overflow-y-auto scrollbar-thin">
      <div className="text-[10px] text-gray-500 uppercase tracking-wider font-medium mb-1">Ride History</div>
      {rides.map(r => (
        <div key={r.id} className="flex items-center gap-3 bg-gray-800/50 rounded-lg px-3 py-2 text-xs">
          <div className="shrink-0">
            <StatusBadge status={r.status} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-gray-300 font-medium">{fmtDateTime(r.pickup_datetime)}</div>
            <div className="flex items-center gap-1 text-gray-500 mt-0.5 truncate">
              <MapPin size={9} className="shrink-0" />
              <span className="truncate">{r.pickup_address}</span>
              <span className="text-gray-700 mx-1">→</span>
              <span className="truncate">{r.dropoff_address}</span>
            </div>
          </div>
          <div className="flex items-center gap-1 text-gray-500 shrink-0">
            <Car size={10} />
            <span>{r.vehicle_assigned || '—'}</span>
          </div>
          <span className="font-mono text-gray-600 shrink-0">{r.booking_id}</span>
        </div>
      ))}
    </div>
  );
}

export default function Customers() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [expandedId, setExpandedId] = useState(null);
  const { addToast } = useToast();

  const fetchCustomers = useCallback(async () => {
    try {
      const params = search ? `?search=${encodeURIComponent(search)}` : '';
      const data = await api.get(`/customers${params}`);
      setCustomers(data);
    } catch {
      addToast('Failed to load customers', 'error');
    } finally {
      setLoading(false);
    }
  }, [search, addToast]);

  useEffect(() => { fetchCustomers(); }, [fetchCustomers]);

  const handleSaved = (customer) => {
    if (editingCustomer) {
      setCustomers(prev => prev.map(c => c.id === customer.id ? { ...customer, total_rides: prev.find(p => p.id === customer.id)?.total_rides || 0 } : c));
    } else {
      setCustomers(prev => [...prev, { ...customer, total_rides: 0 }].sort((a, b) => a.name.localeCompare(b.name)));
    }
    setShowModal(false);
    setEditingCustomer(null);
  };

  const handleDelete = async (customer) => {
    try {
      await api.get(`/customers/${customer.id}`).then(() =>
        fetch(`/api/customers/${customer.id}`, { method: 'DELETE', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('cj_token')}` } })
      );
      setCustomers(prev => prev.filter(c => c.id !== customer.id));
      addToast(`${customer.name} removed`, 'success');
    } catch {
      addToast('Failed to delete customer', 'error');
    }
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Customers</h1>
          <p className="text-sm text-gray-500 mt-0.5">{customers.length} total</p>
        </div>
        <button onClick={() => { setEditingCustomer(null); setShowModal(true); }}
          className="flex items-center gap-1.5 px-4 py-2 bg-brand-500 hover:bg-brand-400 text-black font-semibold text-sm rounded-lg transition-colors">
          <Plus size={15} /> Add Customer
        </button>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
        <input
          className="w-full bg-gray-900 border border-gray-800 text-white text-sm rounded-xl pl-10 pr-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500/50 placeholder:text-gray-600 transition-colors"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by name, phone, or email…"
        />
      </div>

      {/* Customer list */}
      {loading ? <TableSkeleton rows={4} /> : customers.length === 0 ? (
        <div className="text-center py-20 text-gray-600">
          <div className="text-4xl mb-3">👥</div>
          <p className="text-lg font-medium text-gray-500">
            {search ? 'No customers match your search' : 'No customers yet'}
          </p>
          <p className="text-sm mt-1">
            {search ? 'Try a different search term.' : 'Add your first customer above.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {customers.map(c => (
            <CustomerRow
              key={c.id}
              customer={c}
              expanded={expandedId === c.id}
              onToggle={() => setExpandedId(expandedId === c.id ? null : c.id)}
              onEdit={() => { setEditingCustomer(c); setShowModal(true); }}
              onDelete={() => handleDelete(c)}
            />
          ))}
        </div>
      )}

      {showModal && (
        <CustomerModal customer={editingCustomer} onClose={() => { setShowModal(false); setEditingCustomer(null); }} onSaved={handleSaved} />
      )}
    </div>
  );
}
