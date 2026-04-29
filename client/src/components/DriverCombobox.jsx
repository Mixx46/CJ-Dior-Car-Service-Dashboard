import { useState, useRef, useEffect } from 'react';
import { User, ChevronDown } from 'lucide-react';

export default function DriverCombobox({ value, drivers, onChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const pick = (name) => { onChange(name); setOpen(false); };

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className={`flex items-center gap-1.5 text-xs rounded-md px-2 py-1 transition-colors
          ${value
            ? 'bg-gray-800 text-gray-300 hover:bg-gray-700'
            : 'bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 border border-rose-500/20'
          }`}
      >
        <User size={11} />
        <span className="max-w-[120px] truncate">{value || 'Unassigned'}</span>
        <ChevronDown size={10} className="opacity-60" />
      </button>

      {open && (
        <div className="absolute z-50 bottom-full mb-1 left-0 min-w-[160px] bg-gray-800 border border-gray-700 rounded-lg shadow-xl overflow-hidden">
          <button
            type="button"
            onMouseDown={() => pick('')}
            className="w-full text-left px-3 py-2 text-xs text-gray-500 hover:bg-gray-700 transition-colors italic"
          >
            — Unassigned —
          </button>
          {drivers.map(d => (
            <button
              key={d.id}
              type="button"
              onMouseDown={() => pick(d.name)}
              className={`w-full text-left px-3 py-2 text-xs transition-colors flex items-center justify-between gap-2
                ${d.name === value ? 'bg-brand-500/20 text-brand-300' : 'text-gray-300 hover:bg-gray-700'}`}
            >
              <span>{d.name}</span>
              <span className={`text-[10px] ${d.status === 'Available' ? 'text-green-400' : d.status === 'On Run' ? 'text-purple-400' : 'text-gray-500'}`}>
                {d.status}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
