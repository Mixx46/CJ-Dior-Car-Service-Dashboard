import { Star, MessageCircle } from 'lucide-react';

export default function DriverReviews({ reviews }) {
  if (!reviews || reviews.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-4xl mb-3">⭐</div>
        <p className="text-gray-400">No reviews yet</p>
        <p className="text-sm text-gray-500 mt-1">Reviews from customers will appear here</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {reviews.map((review) => (
        <div key={review.id} className="bg-gray-900 rounded border border-gray-800 p-4">
          <div className="flex items-start justify-between mb-3">
            <div>
              <h3 className="font-bold text-white">{review.client_name}</h3>
              <p className="text-sm text-gray-400">{new Date(review.submitted_at).toLocaleDateString()}</p>
            </div>
            <div className="flex items-center gap-1">
              {[...Array(5)].map((_, i) => (
                <Star
                  key={i}
                  className={`w-4 h-4 ${
                    i < (review.rating || 0)
                      ? 'fill-yellow-500 text-yellow-500'
                      : 'text-gray-600'
                  }`}
                />
              ))}
            </div>
          </div>

          {review.comment && (
            <div className="flex gap-2">
              <MessageCircle className="w-4 h-4 text-gray-500 flex-shrink-0 mt-0.5" />
              <p className="text-gray-300">{review.comment}</p>
            </div>
          )}

          {review.tip_amount > 0 && (
            <div className="mt-3 pt-3 border-t border-gray-800 text-sm text-yellow-500">
              💰 Tip: ${review.tip_amount.toFixed(2)}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
