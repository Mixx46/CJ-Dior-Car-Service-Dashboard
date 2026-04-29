import { useEffect, useRef, useState } from 'react';
import { MapPin, AlertCircle, CheckCircle2, Zap } from 'lucide-react';

function calculateBearing(lat1, lon1, lat2, lon2) {
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const y = Math.sin(dLon) * Math.cos(lat2 * Math.PI / 180);
  const x = Math.cos(lat1 * Math.PI / 180) * Math.sin(lat2 * Math.PI / 180) -
    Math.sin(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.cos(dLon);
  return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
}

export default function DriverLocationTracker({ isOnTrip, driverToken, tripId }) {
  const [isSharing, setIsSharing] = useState(false);
  const [status, setStatus] = useState('ready');
  const [error, setError] = useState(null);
  const [accuracy, setAccuracy] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(null);
  const watchIdRef = useRef(null);
  const lastLocationRef = useRef(null);

  // Request permission
  const requestPermission = async () => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported on this device');
      return;
    }

    try {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setStatus('ready');
          setError(null);
          setIsSharing(true);
          startTracking();
        },
        (err) => {
          let errorMsg = 'Unable to get your location';
          if (err.code === err.PERMISSION_DENIED) {
            errorMsg = 'Location permission denied. Please enable in settings.';
          } else if (err.code === err.POSITION_UNAVAILABLE) {
            errorMsg = 'Location service unavailable';
          }
          setError(errorMsg);
          setStatus('error');
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        }
      );
    } catch (err) {
      setError(err.message);
      setStatus('error');
    }
  };

  // Start location tracking
  const startTracking = () => {
    if (watchIdRef.current !== null) return;

    watchIdRef.current = navigator.geolocation.watchPosition(
      async (position) => {
        const { latitude, longitude, accuracy: acc, heading, speed } = position.coords;

        setAccuracy(acc);
        setStatus('sharing');
        setError(null);
        setLastUpdate(new Date().toLocaleTimeString());

        // Calculate bearing from last known position
        let bearing = heading || 0;
        if (lastLocationRef.current) {
          bearing = calculateBearing(
            lastLocationRef.current.latitude,
            lastLocationRef.current.longitude,
            latitude,
            longitude
          );
        }
        lastLocationRef.current = { latitude, longitude };

        // Send to server
        try {
          const token = localStorage.getItem('cj_token');
          if (!token) {
            throw new Error('Not authenticated');
          }

          await fetch('/api/tracking/location', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({
              latitude,
              longitude,
              accuracy: acc,
              bearing,
              speed: speed || null,
            }),
          });
        } catch (err) {
          console.error('Failed to send location:', err);
          setError('Failed to send location - check connection');
          setStatus('error');
        }
      },
      (err) => {
        let errorMsg = 'Failed to track location';
        if (err.code === err.PERMISSION_DENIED) {
          errorMsg = 'Location permission denied';
        }
        setError(errorMsg);
        setStatus('error');
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  };

  // Stop tracking
  const stopTracking = () => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setIsSharing(false);
    setStatus('ready');
    setLastUpdate(null);
    setAccuracy(null);
    lastLocationRef.current = null;
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopTracking();
    };
  }, []);

  if (!isOnTrip) {
    return (
      <div className="bg-gray-800 border border-gray-700 rounded-lg p-4 text-center">
        <p className="text-gray-400 text-sm">No active trip - location sharing unavailable</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Main Toggle Card */}
      <div className={`rounded-lg border p-4 transition-all ${
        isSharing
          ? 'bg-green-500/10 border-green-500/30'
          : 'bg-gray-800 border-gray-700'
      }`}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <MapPin className={`w-5 h-5 ${isSharing ? 'text-green-400' : 'text-gray-400'}`} />
            <div>
              <p className="text-white font-semibold text-sm">Live Location Sharing</p>
              <p className={`text-xs ${isSharing ? 'text-green-300' : 'text-gray-400'}`}>
                {isSharing ? 'Currently sharing your location' : 'Help customers find you'}
              </p>
            </div>
          </div>
        </div>

        {/* Status Indicator */}
        {isSharing && (
          <div className="mb-3 flex items-center gap-2 text-xs text-green-300">
            <CheckCircle2 className="w-4 h-4" />
            <span>Sharing active</span>
            {lastUpdate && <span className="text-gray-400">• Updated {lastUpdate}</span>}
          </div>
        )}

        {/* Accuracy Display */}
        {accuracy && (
          <div className="mb-3 text-xs text-gray-400">
            <p>Accuracy: ±{Math.round(accuracy)} meters</p>
            {accuracy > 100 && (
              <div className="flex items-center gap-1 text-amber-400 mt-1">
                <AlertCircle className="w-3 h-3" />
                <span>Consider moving to improve signal</span>
              </div>
            )}
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mb-3 bg-red-500/10 border border-red-500/30 rounded p-2">
            <p className="text-red-300 text-xs flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />
              {error}
            </p>
          </div>
        )}

        {/* Button */}
        <button
          onClick={isSharing ? stopTracking : requestPermission}
          disabled={status === 'loading'}
          className={`w-full py-2 rounded-lg font-semibold text-sm transition-all ${
            isSharing
              ? 'bg-red-600 hover:bg-red-700 text-white'
              : 'bg-brand-500 hover:bg-brand-600 text-black'
          } disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          {status === 'loading' ? 'Requesting Permission...' : isSharing ? 'Stop Sharing' : 'Start Sharing Location'}
        </button>
      </div>

      {/* Info Cards */}
      {isSharing && (
        <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-3 space-y-2 text-xs text-gray-400">
          <div className="flex items-start gap-2">
            <Zap className="w-4 h-4 text-brand-400 mt-0.5 shrink-0" />
            <div>
              <p className="font-semibold text-gray-300 mb-1">Battery Usage</p>
              <p>Location sharing uses battery. Keep your phone plugged in if possible.</p>
            </div>
          </div>
        </div>
      )}

      {/* Privacy Notice */}
      <div className="text-xs text-gray-500 text-center">
        <p>Your location is only shared for your active trip</p>
        <p>and automatically stops when the trip ends.</p>
      </div>
    </div>
  );
}
