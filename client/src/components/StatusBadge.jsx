const STYLES = {
  'Pending':   'bg-amber-400/15  text-amber-300   ring-1 ring-amber-400/30',
  'Confirmed': 'bg-blue-400/15   text-blue-300    ring-1 ring-blue-400/30',
  'En Route':  'bg-purple-400/15 text-purple-300  ring-1 ring-purple-400/30',
  'Completed': 'bg-green-400/15  text-green-300   ring-1 ring-green-400/30',
  'Cancelled': 'bg-rose-400/15   text-rose-400    ring-1 ring-rose-400/30',
};

const DOTS = {
  'Pending':   'bg-amber-400',
  'Confirmed': 'bg-blue-400',
  'En Route':  'bg-purple-400 animate-pulse',
  'Completed': 'bg-green-400',
  'Cancelled': 'bg-rose-400',
};

export default function StatusBadge({ status, size = 'sm' }) {
  const base = STYLES[status] || 'bg-gray-700 text-gray-300 ring-1 ring-gray-600';
  const dot  = DOTS[status]  || 'bg-gray-400';
  const text = size === 'xs' ? 'text-[10px] px-1.5 py-0.5 gap-1' : 'text-xs px-2.5 py-1 gap-1.5';

  return (
    <span className={`inline-flex items-center rounded-full font-medium ${text} ${base}`}>
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dot}`} />
      {status}
    </span>
  );
}
