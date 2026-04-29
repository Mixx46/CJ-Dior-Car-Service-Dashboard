import { useEffect, useRef, useState } from 'react';
import { Loader } from 'lucide-react';

let googleMapsPromise = null;

function getGoogleMapsPromise() {
  if (!googleMapsPromise) {
    googleMapsPromise = new Promise((resolve, reject) => {
      const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || 'your_api_key_here';
      if (!apiKey || apiKey === 'your_api_key_here') {
        reject(new Error('Google Maps API key not configured'));
        return;
      }

      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=geometry`;
      script.async = true;
      script.defer = true;
      script.onload = () => resolve(window.google);
      script.onerror = () => reject(new Error('Failed to load Google Maps'));
      document.head.appendChild(script);
    });
  }
  return googleMapsPromise;
}

export default function LiveMapComponent({
  driverLocation,
  pickupAddress,
  dropoffAddress,
  pickupLat,
  pickupLon,
  dropoffLat,
  dropoffLon,
  status,
  driverName,
}) {
  const mapRef = useRef(null);
  const [map, setMap] = useState(null);
  const [google, setGoogle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const markersRef = useRef({});
  const polylineRef = useRef(null);

  // Initialize map
  useEffect(() => {
    if (!mapRef.current) return;

    const initMap = async () => {
      try {
        const g = await getGoogleMapsPromise();
        setGoogle(g);

        // Center on pickup location or driver location
        const center = driverLocation
          ? { lat: driverLocation.latitude, lng: driverLocation.longitude }
          : (pickupLat && pickupLon ? { lat: pickupLat, lng: pickupLon } : { lat: 25.7617, lng: -80.1918 });

        const mapInstance = new g.maps.Map(mapRef.current, {
          zoom: 14,
          center,
          mapTypeControl: false,
          fullscreenControl: false,
          streetViewControl: false,
          zoomControl: true,
          styles: [
            { elementType: 'geometry', stylers: [{ color: '#1a1a1a' }] },
            { elementType: 'labels.text.stroke', stylers: [{ color: '#1a1a1a' }] },
            { elementType: 'labels.text.fill', stylers: [{ color: '#7c7c7c' }] },
            {
              featureType: 'administrative.locality',
              elementType: 'labels.text.fill',
              stylers: [{ color: '#d59563' }],
            },
            {
              featureType: 'poi',
              elementType: 'labels.text.fill',
              stylers: [{ color: '#d59563' }],
            },
            {
              featureType: 'poi.park',
              elementType: 'geometry',
              stylers: [{ color: '#263c3f' }],
            },
            {
              featureType: 'road',
              elementType: 'geometry',
              stylers: [{ color: '#38414e' }],
            },
            {
              featureType: 'road',
              elementType: 'geometry.stroke',
              stylers: [{ color: '#212a37' }],
            },
            {
              featureType: 'water',
              elementType: 'geometry',
              stylers: [{ color: '#17263c' }],
            },
          ],
        });

        setMap(mapInstance);
        setLoading(false);
      } catch (err) {
        setError(err.message);
        setLoading(false);
      }
    };

    initMap();
  }, []);

  // Update markers and route
  useEffect(() => {
    if (!map || !google) return;

    // Remove old markers
    Object.values(markersRef.current).forEach(marker => marker.setMap(null));
    markersRef.current = {};

    // Remove old polyline
    if (polylineRef.current) polylineRef.current.setMap(null);

    // Determine marker colors based on status
    const getStatusColor = () => {
      switch (status) {
        case 'Arrived': return '#00ff00';
        case 'Passenger Onboard': return '#ffff00';
        case 'In Transit': return '#ffff00';
        case 'En Route': return '#0066ff';
        default: return '#8b8b8b';
      }
    };

    // Pickup marker (green)
    if (pickupLat && pickupLon) {
      const pickupMarker = new google.maps.Marker({
        position: { lat: pickupLat, lng: pickupLon },
        map,
        title: 'Pickup',
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 10,
          fillColor: '#22c55e',
          fillOpacity: 0.8,
          strokeColor: '#ffffff',
          strokeWeight: 2,
        },
      });
      markersRef.current.pickup = pickupMarker;
    }

    // Dropoff marker (red)
    if (dropoffLat && dropoffLon) {
      const dropoffMarker = new google.maps.Marker({
        position: { lat: dropoffLat, lng: dropoffLon },
        map,
        title: 'Dropoff',
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 10,
          fillColor: '#ef4444',
          fillOpacity: 0.8,
          strokeColor: '#ffffff',
          strokeWeight: 2,
        },
      });
      markersRef.current.dropoff = dropoffMarker;
    }

    // Driver marker (blue, animated)
    if (driverLocation) {
      const driverMarker = new google.maps.Marker({
        position: { lat: driverLocation.latitude, lng: driverLocation.longitude },
        map,
        title: driverName || 'Driver',
        icon: {
          path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
          scale: 12,
          fillColor: getStatusColor(),
          fillOpacity: 1,
          strokeColor: '#ffffff',
          strokeWeight: 2,
          rotation: driverLocation.bearing || 0,
        },
      });
      markersRef.current.driver = driverMarker;

      // Smooth zoom/pan to driver
      map.setCenter({ lat: driverLocation.latitude, lng: driverLocation.longitude });

      // Draw route from driver to pickup to dropoff
      if (pickupLat && pickupLon && dropoffLat && dropoffLon) {
        const routePoints = [
          { lat: driverLocation.latitude, lng: driverLocation.longitude },
          { lat: pickupLat, lng: pickupLon },
          { lat: dropoffLat, lng: dropoffLon },
        ];

        polylineRef.current = new google.maps.Polyline({
          path: routePoints,
          geodesic: true,
          strokeColor: '#0066ff',
          strokeOpacity: 0.6,
          strokeWeight: 3,
          map,
        });
      }
    }
  }, [map, google, driverLocation, pickupLat, pickupLon, dropoffLat, dropoffLon, status, driverName]);

  if (error) {
    return (
      <div className="w-full h-full bg-gray-900 rounded-xl flex items-center justify-center p-6">
        <div className="text-center">
          <p className="text-red-400 text-sm">{error}</p>
          <p className="text-gray-400 text-xs mt-2">Check .env for VITE_GOOGLE_MAPS_API_KEY</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full bg-gray-900 rounded-xl overflow-hidden">
      {loading && (
        <div className="absolute inset-0 bg-gray-950/50 flex items-center justify-center z-10">
          <Loader className="w-6 h-6 text-brand-500 animate-spin" />
        </div>
      )}
      <div ref={mapRef} className="w-full h-full" />
    </div>
  );
}
