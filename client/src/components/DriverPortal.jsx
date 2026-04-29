import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import { LogOut, RefreshCw } from 'lucide-react';
import DriverProfile from './DriverProfile';
import DriverTripList from './DriverTripList';
import DriverReviews from './DriverReviews';
import DriverSettings from './DriverSettings';
import DriverLocationTracker from './DriverLocationTracker';

export default function DriverPortal() {
  const [activeTab, setActiveTab] = useState('today');
  const [profile, setProfile] = useState(null);
  const [trips, setTrips] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { user, logout } = useAuth();
  const { addToast } = useToast();

  const fetchData = async (forceRefresh = false) => {
    if (forceRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const headers = { 'Authorization': `Bearer ${localStorage.getItem('token')}` };

      const [profileRes, tripsRes, reviewsRes] = await Promise.all([
        fetch('/api/drivers/portal/profile', { headers }),
        fetch('/api/drivers/portal/trips', { headers }),
        fetch('/api/drivers/portal/reviews', { headers }),
      ]);

      if (!profileRes.ok || !tripsRes.ok || !reviewsRes.ok) {
        throw new Error('Failed to fetch data');
      }

      setProfile(await profileRes.json());
      setTrips(await tripsRes.json());
      setReviews(await reviewsRes.json());
    } catch (err) {
      addToast(err.message, 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-yellow-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-800">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-yellow-500 rounded-full flex items-center justify-center">
              <span className="text-black font-bold text-sm">🚗</span>
            </div>
            <div>
              <h1 className="text-2xl font-bold">CJ Dior</h1>
              <p className="text-sm text-gray-400">Driver Portal</p>
            </div>
          </div>
          <button
            onClick={() => logout()}
            className="flex items-center gap-2 px-4 py-2 bg-gray-900 hover:bg-gray-800 rounded border border-gray-700 text-sm"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>

        {/* Profile Section */}
        {profile && <DriverProfile profile={profile} />}

        {/* Tabs */}
        <div className="flex gap-6 px-6 pt-6 border-b border-gray-800">
          {['today', 'all', 'tracking', 'reviews', 'settings'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`pb-3 font-medium text-sm transition ${
                activeTab === tab
                  ? 'text-yellow-500 border-b-2 border-yellow-500'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              {tab === 'today' && '📅 Today'}
              {tab === 'all' && '📋 All Trips'}
              {tab === 'tracking' && '📍 Location'}
              {tab === 'reviews' && '⭐ Reviews'}
              {tab === 'settings' && '⚙️ Settings'}
            </button>
          ))}
          <div className="flex-1" />
          <button
            onClick={() => fetchData(true)}
            disabled={refreshing}
            className="pb-3 text-gray-400 hover:text-white disabled:opacity-50"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {activeTab === 'today' && <DriverTripList trips={trips.filter(t => {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const tripDate = new Date(t.pickup_datetime);
            tripDate.setHours(0, 0, 0, 0);
            return tripDate.getTime() === today.getTime();
          })} />}

          {activeTab === 'all' && <DriverTripList trips={trips} />}

          {activeTab === 'tracking' && (
            <DriverLocationTracker
              isOnTrip={trips.some(t => ['Confirmed', 'En Route', 'Arrived', 'Passenger Onboard', 'In Transit'].includes(t.status))}
              driverToken={localStorage.getItem('cj_token')}
            />
          )}

          {activeTab === 'reviews' && <DriverReviews reviews={reviews} />}

          {activeTab === 'settings' && <DriverSettings />}
        </div>
      </div>
    </div>
  );
}
