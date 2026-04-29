import { useEffect, useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { io } from 'socket.io-client';
import { Loader, AlertCircle } from 'lucide-react';
import LiveMapComponent from '../components/LiveMapComponent';
import ETACard from '../components/ETACard';

async function calculateETA(origin, destination) {
  try {
    const response = await fetch(`/api/integrations/distance-matrix`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ origin, destination }),
    });

    if (!response.ok) return null;
    const data = await response.json();
    if (data.duration_minutes) {
      const eta = new Date();
      eta.setMinutes(eta.getMinutes() + data.duration_minutes);
      return { eta, distance: data.distance_km };
    }
  } catch (err) {
    console.error('ETA calculation failed:', err);
  }
  return null;
}

export default function TrackingPage() {
  const { token } = useParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [trackingData, setTrackingData] = useState(null);
  const [driverLocation, setDriverLocation] = useState(null);
  const [eta, setEta] = useState(null);
  const [distance, setDistance] = useState(null);
  const [approaching, setApproaching] = useState(false);
  const socketRef = useRef(null);
  const etaRefreshRef = useRef(null);

  // Fetch tracking session
  useEffect(() => {
    const fetchTracking = async () => {
      try {
        const res = await fetch(`/api/tracking/${token}`);
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || 'Failed to load tracking data');
        }
        const data = await res.json();
        setTrackingData(data);
        setLoading(false);

        if (data.location) {
          setDriverLocation(data.location);
          // Calculate initial ETA
          if (data.location.latitude && data.location.longitude && data.reservation.pickup_address) {
            const etaData = await calculateETA(
              { lat: data.location.latitude, lng: data.location.longitude },
              data.reservation.pickup_address
            );
            if (etaData) {
              setEta(etaData.eta.toISOString());
              setDistance(etaData.distance_km);
            }
          }
        }
      } catch (err) {
        setError(err.message);
        setLoading(false);
      }
    };

    fetchTracking();
  }, [token]);

  // Setup WebSocket for real-time updates
  useEffect(() => {
    if (!trackingData?.driver?.id) return;

    socketRef.current = io(window.location.origin, {
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5,
    });

    socketRef.current.on('connect', () => {
      socketRef.current.emit('subscribe-trip', trackingData.driver.id);
    });

    socketRef.current.on('location-update', async (data) => {
      if (data.driver_id === trackingData.driver.id) {
        setDriverLocation(data);

        // Update ETA every 30s based on real-time location
        clearTimeout(etaRefreshRef.current);
        etaRefreshRef.current = setTimeout(async () => {
          try {
            const res = await fetch('/api/integrations/distance-matrix', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                origin: { lat: data.latitude, lng: data.longitude },
                destination: trackingData.reservation.pickup_address,
              }),
            });
            if (res.ok) {
              const result = await res.json();
              const eta = new Date();
              eta.setMinutes(eta.getMinutes() + result.duration_minutes);
              setEta(eta.toISOString());
              setDistance(result.distance_km);
              setApproaching(result.distance_km < 1);
            }
          } catch (err) {
            console.error('ETA update failed:', err);
          }
        }, 100);
      }
    });

    return () => {
      if (socketRef.current) {
        socketRef.current.emit('unsubscribe-trip', trackingData.driver.id);
        socketRef.current.disconnect();
      }
      clearTimeout(etaRefreshRef.current);
    };
  }, [trackingData]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <Loader className="w-8 h-8 text-brand-500 animate-spin mx-auto mb-4" />
          <p className="text-gray-300">Loading your ride information...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
        <div className="bg-gray-900 border border-red-500/20 rounded-xl p-8 max-w-md text-center">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h1 className="text-white font-bold text-lg mb-2">Unable to Load Tracking</h1>
          <p className="text-gray-400 text-sm mb-6">{error}</p>
          <p className="text-gray-500 text-xs">Please check your tracking link or contact support</p>
        </div>
      </div>
    );
  }

  if (!trackingData) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-gray-400">No tracking data available</div>
      </div>
    );
  }

  const { reservation, driver, location } = trackingData;

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Mobile Layout */}
      <div className="md:hidden flex flex-col h-screen">
        {/* Map Section */}
        <div className="flex-1 bg-gray-900 relative">
          <LiveMapComponent
            driverLocation={location}
            pickupAddress={reservation.pickup_address}
            dropoffAddress={reservation.dropoff_address}
            pickupLat={25.7617}
            pickupLon={-80.1918}
            dropoffLat={25.8042}
            dropoffLon={-80.1937}
            status={reservation.status}
            driverName={driver?.name}
          />

          {/* Header Overlay */}
          <div className="absolute top-0 left-0 right-0 p-4 bg-gradient-to-b from-black/50 to-transparent">
            <h1 className="text-xl font-bold">CJ Dior</h1>
            <p className="text-gray-300 text-xs">Premium Transportation</p>
          </div>
        </div>

        {/* Info Section */}
        <div className="bg-gray-900 border-t border-gray-800 p-4 overflow-y-auto max-h-[40%]">
          <ETACard
            driverName={driver?.name}
            driverRating={driver?.rating}
            driverReviews={driver?.reviews}
            vehicle={reservation.vehicle_assigned}
            eta={eta}
            status={reservation.status}
            distance={distance}
            approaching={approaching}
            clientName={reservation.client_name}
          />
        </div>
      </div>

      {/* Desktop Layout */}
      <div className="hidden md:grid grid-cols-3 h-screen gap-6 p-6">
        {/* Map - 2 columns */}
        <div className="col-span-2 bg-gray-900 rounded-xl overflow-hidden border border-gray-800">
          <LiveMapComponent
            driverLocation={location}
            pickupAddress={reservation.pickup_address}
            dropoffAddress={reservation.dropoff_address}
            pickupLat={25.7617}
            pickupLon={-80.1918}
            dropoffLat={25.8042}
            dropoffLon={-80.1937}
            status={reservation.status}
            driverName={driver?.name}
          />
        </div>

        {/* Sidebar Info - 1 column */}
        <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-y-auto p-6 space-y-4">
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-white">CJ Dior</h1>
            <p className="text-gray-400 text-sm">Premium Transportation</p>
          </div>

          <ETACard
            driverName={driver?.name}
            driverRating={driver?.rating}
            driverReviews={driver?.reviews}
            vehicle={reservation.vehicle_assigned}
            eta={eta}
            status={reservation.status}
            distance={distance}
            approaching={approaching}
            clientName={reservation.client_name}
          />

          {/* Route Info */}
          <div className="bg-gray-950 border border-gray-800 rounded-xl p-4 space-y-3 text-sm">
            <div>
              <p className="text-gray-500 uppercase text-xs tracking-wide mb-1">Pickup</p>
              <p className="text-white">{reservation.pickup_address}</p>
            </div>
            <div className="border-t border-gray-800 pt-3">
              <p className="text-gray-500 uppercase text-xs tracking-wide mb-1">Dropoff</p>
              <p className="text-white">{reservation.dropoff_address}</p>
            </div>
            {reservation.trip_notes && (
              <div className="border-t border-gray-800 pt-3 bg-amber-500/5 border border-amber-500/20 rounded-lg p-3 -m-4 p-4">
                <p className="text-gray-500 uppercase text-xs tracking-wide mb-1">Trip Notes</p>
                <p className="text-amber-200 text-sm">{reservation.trip_notes}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
