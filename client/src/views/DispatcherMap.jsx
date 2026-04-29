import { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { MapPin, Phone, Star, AlertCircle, Loader } from 'lucide-react';
import { api, fmtTime } from '../utils/api';
import LiveMapComponent from '../components/LiveMapComponent';

export default function DispatcherMap() {
  const [activeTrips, setActiveTrips] = useState([]);
  const [selectedTrip, setSelectedTrip] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const socketRef = useRef(null);

  // Fetch active drivers
  useEffect(() => {
    const fetchActive = async () => {
      try {
        const data = await api.get('/tracking/admin/active-drivers');
        setActiveTrips(data);
        setLoading(false);
      } catch (err) {
        setError(err.message);
        setLoading(false);
      }
    };

    fetchActive();
  }, []);

  // Setup WebSocket
  useEffect(() => {
    socketRef.current = io(window.location.origin, {
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
    });

    socketRef.current.on('connect', () => {
      // Subscribe to all active drivers
      activeTrips.forEach(trip => {
        if (trip.driver_id) {
          socketRef.current.emit('subscribe-trip', trip.driver_id);
        }
      });
    });

    socketRef.current.on('location-update', (data) => {
      setActiveTrips(prev =>
        prev.map(trip =>
          trip.driver_id === data.driver_id
            ? { ...trip, location: data, location_timestamp: data.timestamp }
            : trip
        )
      );
    });

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [activeTrips]);

  const getStatusColor = (status) => {
    switch (status) {
      case 'En Route': return 'bg-blue-500/10 border-blue-500/20 text-blue-300';
      case 'Arrived': return 'bg-green-500/10 border-green-500/20 text-green-300';
      case 'Passenger Onboard': return 'bg-yellow-500/10 border-yellow-500/20 text-yellow-300';
      case 'In Transit': return 'bg-yellow-500/10 border-yellow-500/20 text-yellow-300';
      default: return 'bg-gray-500/10 border-gray-500/20 text-gray-300';
    }
  };

  const getMarkerColor = (status) => {
    switch (status) {
      case 'Arrived': return '#22c55e';
      case 'Passenger Onboard': return '#eab308';
      case 'In Transit': return '#eab308';
      case 'En Route': return '#0066ff';
      default: return '#8b8b8b';
    }
  };

  if (loading) {
    return (
      <div className="w-full h-screen flex items-center justify-center bg-gray-950">
        <div className="text-center">
          <Loader className="w-8 h-8 text-brand-500 animate-spin mx-auto mb-4" />
          <p className="text-gray-300">Loading live drivers...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full h-screen flex items-center justify-center bg-gray-950 p-6">
        <div className="bg-gray-900 border border-red-500/20 rounded-xl p-8 max-w-md text-center">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <p className="text-gray-400 text-sm">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-screen flex gap-4 p-4 bg-gray-950">
      {/* Main Map */}
      <div className="flex-1 bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
        {selectedTrip && selectedTrip.location ? (
          <LiveMapComponent
            driverLocation={selectedTrip.location}
            pickupAddress={selectedTrip.pickup_address}
            dropoffAddress={selectedTrip.dropoff_address}
            pickupLat={25.7617}
            pickupLon={-80.1918}
            dropoffLat={25.8042}
            dropoffLon={-80.1937}
            status={selectedTrip.status}
            driverName={selectedTrip.driver_name}
          />
        ) : activeTrips.length > 0 && activeTrips[0]?.location ? (
          <LiveMapComponent
            driverLocation={activeTrips[0].location}
            pickupAddress={activeTrips[0].pickup_address}
            dropoffAddress={activeTrips[0].dropoff_address}
            pickupLat={25.7617}
            pickupLon={-80.1918}
            dropoffLat={25.8042}
            dropoffLon={-80.1937}
            status={activeTrips[0].status}
            driverName={activeTrips[0].driver_name}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <div className="text-center">
              <MapPin className="w-12 h-12 text-gray-700 mx-auto mb-3" />
              <p className="text-gray-400">No active trips with location data</p>
            </div>
          </div>
        )}
      </div>

      {/* Sidebar - Active Trips List */}
      <div className="w-80 bg-gray-900 rounded-xl border border-gray-800 flex flex-col overflow-hidden">
        <div className="p-4 border-b border-gray-800">
          <h2 className="text-white font-bold text-lg">Live Drivers</h2>
          <p className="text-gray-500 text-xs mt-1">{activeTrips.length} active trips</p>
        </div>

        <div className="flex-1 overflow-y-auto">
          {activeTrips.length === 0 ? (
            <div className="p-6 text-center">
              <p className="text-gray-400 text-sm">No active trips right now</p>
            </div>
          ) : (
            <div className="p-3 space-y-2">
              {activeTrips.map(trip => (
                <button
                  key={trip.trip_id}
                  onClick={() => setSelectedTrip(trip)}
                  className={`w-full text-left p-3 rounded-lg border transition-all ${
                    selectedTrip?.trip_id === trip.trip_id
                      ? 'bg-brand-500/20 border-brand-500/40'
                      : 'bg-gray-800 border-gray-700 hover:bg-gray-750'
                  }`}
                >
                  {/* Driver Name & Status */}
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="text-white font-semibold text-sm">{trip.driver_name}</p>
                      <p className="text-gray-400 text-xs">{trip.vehicle}</p>
                    </div>
                    {trip.rating && (
                      <div className="flex items-center gap-0.5 bg-gray-700 rounded px-1.5 py-0.5">
                        <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                        <span className="text-white text-xs font-semibold">{trip.rating.toFixed(1)}</span>
                      </div>
                    )}
                  </div>

                  {/* Status Badge */}
                  <div className={`rounded px-2 py-1 inline-block text-xs font-semibold mb-2 ${getStatusColor(trip.status)}`}>
                    {trip.status}
                  </div>

                  {/* Trip Info */}
                  <p className="text-gray-400 text-xs line-clamp-1 mb-1">
                    {trip.passenger_count} {trip.passenger_count === 1 ? 'passenger' : 'passengers'}
                  </p>

                  {/* Booking ID & Time */}
                  <p className="text-gray-500 text-xs font-mono">{trip.booking_id}</p>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Trip Details Panel */}
        {selectedTrip && (
          <div className="border-t border-gray-800 p-4 space-y-3 bg-gray-950">
            <div>
              <p className="text-gray-500 text-xs uppercase tracking-wide mb-1">Pickup</p>
              <p className="text-white text-xs line-clamp-2">{selectedTrip.pickup_address}</p>
            </div>
            <div>
              <p className="text-gray-500 text-xs uppercase tracking-wide mb-1">Dropoff</p>
              <p className="text-white text-xs line-clamp-2">{selectedTrip.dropoff_address}</p>
            </div>
            {selectedTrip.location && (
              <div className="text-xs text-gray-400">
                <p>Last update: {new Date(selectedTrip.location_timestamp).toLocaleTimeString()}</p>
                {selectedTrip.location.accuracy && (
                  <p>Accuracy: ±{Math.round(selectedTrip.location.accuracy)}m</p>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
