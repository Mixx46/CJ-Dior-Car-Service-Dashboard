import { useState, useEffect, useCallback } from 'react';
import { Star, MessageSquare, Clock } from 'lucide-react';
import { api, fmtDateTime } from '../utils/api';
import { TableSkeleton } from '../components/LoadingSkeleton';

function Stars({ rating, size = 16 }) {
  return (
    <span className="inline-flex gap-0.5">
      {[1, 2, 3, 4, 5].map(n => (
        <Star key={n} size={size} className={n <= rating ? 'text-amber-400 fill-amber-400' : 'text-gray-700'} />
      ))}
    </span>
  );
}

function StatCard({ icon: Icon, iconColor, label, children }) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 flex items-center justify-between">
      <div>
        <div className="text-xs text-gray-500 mb-1">{label}</div>
        <div className="text-2xl font-bold text-white">{children}</div>
      </div>
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${iconColor}`}>
        <Icon size={18} />
      </div>
    </div>
  );
}

function ReviewCard({ review }) {
  const pending = !review.submitted;

  return (
    <div className={`bg-gray-900 border rounded-xl p-5 transition-colors ${
      pending ? 'border-gray-800/50 opacity-60' : 'border-gray-800'
    }`}>
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <div className="text-white font-semibold text-sm">{review.client_name}</div>
          {review.driver_name && (
            <div className="text-xs text-gray-500 mt-0.5">Driver: {review.driver_name}</div>
          )}
        </div>
        <div className="text-right shrink-0">
          {pending ? (
            <span className="inline-flex items-center gap-1 text-xs text-gray-500 bg-gray-800 px-2.5 py-1 rounded-full">
              <Clock size={10} />
              Awaiting review
            </span>
          ) : (
            <Stars rating={review.rating} />
          )}
        </div>
      </div>

      {review.comment && (
        <p className="text-gray-300 text-sm mb-3 leading-relaxed">"{review.comment}"</p>
      )}

      <div className="flex items-center gap-3 text-xs text-gray-600 flex-wrap">
        {review.booking_id && <span className="font-mono">{review.booking_id}</span>}
        {review.pickup_datetime && <span>{fmtDateTime(review.pickup_datetime)}</span>}
        {review.submitted_at && <span>Reviewed {fmtDateTime(review.submitted_at)}</span>}
      </div>
    </div>
  );
}

export default function Reviews() {
  const [reviews, setReviews] = useState([]);
  const [stats, setStats] = useState({ totalReviews: 0, averageRating: 0 });
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const [reviewsData, statsData] = await Promise.all([
        api.get('/reviews'),
        api.get('/reviews/stats'),
      ]);
      setReviews(reviewsData);
      setStats(statsData);
    } catch {} finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const submitted = reviews.filter(r => r.submitted);
  const pending = reviews.filter(r => !r.submitted);

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Customer Reviews</h1>
        <p className="text-sm text-gray-500 mt-0.5">See what customers are saying about their rides</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <StatCard icon={MessageSquare} iconColor="bg-gray-800 text-gray-400" label="Total Reviews">
          {stats.totalReviews}
        </StatCard>
        <StatCard icon={Star} iconColor="bg-amber-500/15 text-amber-400" label="Average Rating">
          <span className="flex items-center gap-2">
            {stats.averageRating}
            <Star size={20} className="text-amber-400 fill-amber-400" />
          </span>
        </StatCard>
        <StatCard icon={Clock} iconColor="bg-gray-800 text-gray-400" label="Pending Reviews">
          {pending.length}
        </StatCard>
      </div>

      {/* Reviews list */}
      {loading ? <TableSkeleton rows={3} /> : reviews.length === 0 ? (
        <div className="bg-gray-900 border border-gray-800 rounded-xl text-center py-16">
          <Star size={40} className="text-gray-700 mx-auto mb-3" />
          <p className="text-lg font-medium text-gray-500">No reviews yet</p>
          <p className="text-sm text-gray-600 mt-1">Reviews will appear here after customers rate their trips</p>
        </div>
      ) : (
        <div className="space-y-3">
          {submitted.length > 0 && (
            <>
              <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Submitted ({submitted.length})</h2>
              {submitted.map(r => <ReviewCard key={r.id} review={r} />)}
            </>
          )}
          {pending.length > 0 && (
            <>
              <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mt-6">Awaiting Review ({pending.length})</h2>
              {pending.map(r => <ReviewCard key={r.id} review={r} />)}
            </>
          )}
        </div>
      )}
    </div>
  );
}
