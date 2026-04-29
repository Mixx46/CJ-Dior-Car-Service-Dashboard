import { MapPin, Clock, Users } from 'lucide-react';

const STATUS_COLORS = {
  'Pending': 'bg-gray-800 text-gray-300',
  'Confirmed': 'bg-blue-900 text-blue-200',
  'En Route': 'bg-purple-900 text-purple-200',
  'Completed': 'bg-green-900 text-green-200',
  'Cancelled': 'bg-red-900 text-red-200',
};

export default function DriverTripList({ trips }) {
  if (!trips || trips.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-4xl mb-3">📭</div>
        <p className="text-gray-400">No trips scheduled</p>
        <p className="text-sm text-gray-500 mt-1">Check back later or view all trips</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {trips.map((trip) => {
        const pickupTime = new Date(trip.pickup_datetime);
        const now = new Date();
        const timeUntil = pickupTime - now;
        const hoursUntil = Math.floor(timeUntil / (1000 * 60 * 60));
        const minutesUntil = Math.floor((timeUntil % (1000 * 60 * 60)) / (1000 * 60));

        let timeLabel = '';
        if (timeUntil < 0) {
          timeLabel = 'In the past';
        } else if (hoursUntil > 0) {
          timeLabel = `In ${hoursUntil}h ${minutesUntil}m`;
        } else {
          timeLabel = `In ${minutesUntil}m`;
        }

        return (
          <div key={trip.id} className="bg-gray-900 rounded border border-gray-800 p-4 hover:border-gray-700 transition">
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="font-bold text-white">{trip.client_name}</h3>
                <p className="text-sm text-gray-400">Booking: {trip.booking_id}</p>
              </div>
              <span className={`px-3 py-1 rounded text-xs font-medium ${STATUS_COLORS[trip.status] || STATUS_COLORS['Pending']}`}>
                {trip.status}
              </span>
            </div>

            <div className="space-y-2 mb-3">
              <div className="flex gap-3 text-sm">
                <MapPin className="w-4 h-4 text-gray-500 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-gray-300">{trip.pickup_address}</p>
                  <p className="text-gray-500 text-xs mt-1">to {trip.dropoff_address}</p>
                </div>
              </div>

              <div className="flex gap-3 text-sm">
                <Clock className="w-4 h-4 text-gray-500 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-gray-300">
                    {pickupTime.toLocaleDateString()} at {pickupTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                  <p className="text-yellow-500 text-xs mt-0.5 font-medium">{timeLabel}</p>
                </div>
              </div>

              {trip.passenger_count && (
                <div className="flex gap-3 text-sm">
                  <Users className="w-4 h-4 text-gray-500 flex-shrink-0" />
                  <p className="text-gray-300">{trip.passenger_count} {trip.passenger_count === 1 ? 'passenger' : 'passengers'}</p>
                </div>
              )}
            </div>

            {trip.trip_notes && (
              <div className="bg-gray-800 rounded p-2 text-xs text-gray-300 mb-3">
                <strong className="text-yellow-500">Note:</strong> {trip.trip_notes}
              </div>
            )}

            <div className="flex gap-2 pt-2 border-t border-gray-800">
              <button className="flex-1 px-3 py-2 bg-gray-800 hover:bg-gray-700 rounded text-sm transition">
                📍 View Route
              </button>
              <button className="flex-1 px-3 py-2 bg-gray-800 hover:bg-gray-700 rounded text-sm transition">
                📞 Call Customer
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
