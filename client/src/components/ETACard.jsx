import { useState, useEffect } from 'react';
import { Clock, MapPin, Star, Phone, AlertCircle } from 'lucide-react';

export default function ETACard({
  driverName,
  driverRating,
  driverReviews,
  vehicle,
  eta,
  status,
  distance,
  driverPhone,
  approaching,
  clientName,
}) {
  const [etaMinutes, setEtaMinutes] = useState(null);
  const [approaching30sec, setApproaching30sec] = useState(false);

  // Calculate ETA countdown
  useEffect(() => {
    if (!eta) return;
    const updateEta = () => {
      const now = new Date();
      const etaDate = new Date(eta);
      const diffMs = etaDate - now;
      const mins = Math.max(0, Math.ceil(diffMs / 60000));
      setEtaMinutes(mins);
      setApproaching30sec(mins === 0 && diffMs > 0);
    };
    updateEta();
    const interval = setInterval(updateEta, 30000);
    return () => clearInterval(interval);
  }, [eta]);

  const getStatusColor = () => {
    switch (status) {
      case 'En Route': return 'bg-blue-500/10 border-blue-500/20 text-blue-300';
      case 'Arrived': return 'bg-green-500/10 border-green-500/20 text-green-300';
      case 'Passenger Onboard': return 'bg-yellow-500/10 border-yellow-500/20 text-yellow-300';
      case 'In Transit': return 'bg-yellow-500/10 border-yellow-500/20 text-yellow-300';
      case 'Completed': return 'bg-green-500/10 border-green-500/20 text-green-300';
      default: return 'bg-gray-500/10 border-gray-500/20 text-gray-300';
    }
  };

  const getStatusDisplay = () => {
    switch (status) {
      case 'En Route': return `${etaMinutes} min away`;
      case 'Arrived': return 'Driver has arrived';
      case 'Passenger Onboard': return 'En route to destination';
      case 'In Transit': return 'En route to destination';
      case 'Completed': return 'Completed';
      default: return status;
    }
  };

  return (
    <div className="space-y-4">
      {/* Status Banner */}
      {approaching && (
        <div className="animate-pulse bg-green-500/20 border border-green-500/40 rounded-xl p-4 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-green-400 shrink-0" />
          <div>
            <p className="text-green-300 font-semibold text-sm">Driver Approaching</p>
            <p className="text-green-200/70 text-xs">Your driver is minutes away</p>
          </div>
        </div>
      )}

      {/* Driver Card */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-white font-bold text-lg">{driverName || 'Driver'}</h3>
            <p className="text-gray-400 text-sm">{vehicle || 'Premium Vehicle'}</p>
          </div>
          {driverRating && (
            <div className="flex items-center gap-1 bg-gray-800 rounded-lg px-3 py-1">
              <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
              <span className="text-white font-semibold text-sm">{driverRating.toFixed(1)}</span>
              <span className="text-gray-500 text-xs">({driverReviews})</span>
            </div>
          )}
        </div>

        {/* Status Badge */}
        <div className={`rounded-lg border px-3 py-2 mb-4 ${getStatusColor()}`}>
          <p className="text-sm font-semibold">{getStatusDisplay()}</p>
        </div>

        {/* Details Grid */}
        <div className="space-y-2">
          {distance && (
            <div className="flex items-center gap-2 text-gray-400 text-sm">
              <MapPin className="w-4 h-4 text-brand-400" />
              <span>{distance.toFixed(1)} km away</span>
            </div>
          )}

          {eta && status === 'En Route' && (
            <div className="flex items-center gap-2 text-gray-400 text-sm">
              <Clock className="w-4 h-4 text-brand-400" />
              <span>Arriving at {new Date(eta).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            </div>
          )}

          {driverPhone && (
            <a
              href={`tel:${driverPhone}`}
              className="flex items-center gap-2 text-brand-400 hover:text-brand-300 transition-colors text-sm font-medium mt-3 pt-3 border-t border-gray-800"
            >
              <Phone className="w-4 h-4" />
              Call Driver
            </a>
          )}
        </div>
      </div>

      {/* Pickup Info */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
        <p className="text-gray-500 text-xs uppercase tracking-wide mb-1">Passenger</p>
        <p className="text-white font-semibold text-sm">{clientName || 'Client'}</p>
      </div>

      {/* Professional Footer */}
      <div className="bg-gray-950 border border-gray-800 rounded-xl p-3 text-center">
        <p className="text-gray-500 text-xs">CJ Dior Premium Transportation</p>
        <p className="text-gray-600 text-xs mt-1">Your luxury journey is our priority</p>
      </div>
    </div>
  );
}
