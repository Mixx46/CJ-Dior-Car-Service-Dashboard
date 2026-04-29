import { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, useParams } from 'react-router-dom';
import { ToastProvider } from './hooks/useToast';
import { AuthProvider, useAuth } from './hooks/useAuth';
import Sidebar from './components/Sidebar';
import LoginPage from './components/LoginPage';
import DriverLoginPage from './components/DriverLoginPage';
import DriverPortal from './components/DriverPortal';
import TodaysRuns from './views/TodaysRuns';
import Upcoming from './views/Upcoming';
import AllReservations from './views/AllReservations';
import Drivers from './views/Drivers';
import Customers from './views/Customers';
import Reviews from './views/Reviews';
import Settings from './views/Settings';
import DispatcherMap from './views/DispatcherMap';
import TrackingPage from './pages/TrackingPage';

const VIEWS = {
  today:     TodaysRuns,
  upcoming:  Upcoming,
  all:       AllReservations,
  drivers:   Drivers,
  customers: Customers,
  reviews:   Reviews,
  map:       DispatcherMap,
  settings:  Settings,
};

function Dashboard() {
  const [currentView, setCurrentView] = useState('today');
  const View = VIEWS[currentView];

  return (
    <div className="flex h-screen bg-gray-950 text-white overflow-hidden">
      <Sidebar currentView={currentView} onNavigate={setCurrentView} />
      <main className="flex-1 overflow-y-auto scrollbar-thin">
        <View key={currentView} />
      </main>
    </div>
  );
}

function AuthGate() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <AuthSelection />;
  }

  if (user.user_type === 'driver') {
    return <DriverPortal />;
  }

  return <Dashboard />;
}

function AuthSelection() {
  const [userType, setUserType] = useState(null);

  if (userType === 'driver') {
    return <DriverLoginPage />;
  }
  if (userType === 'admin') {
    return <LoginPage />;
  }

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <div className="text-center">
        <div className="w-16 h-16 bg-yellow-500 rounded-full flex items-center justify-center mx-auto mb-6">
          <span className="text-4xl">🚗</span>
        </div>
        <h1 className="text-4xl font-bold text-white mb-2">CJ Dior</h1>
        <p className="text-gray-400 mb-8">Dispatch & Driver Portal</p>

        <div className="flex gap-4 flex-col sm:flex-row justify-center max-w-md mx-auto">
          <button
            onClick={() => setUserType('driver')}
            className="flex-1 px-6 py-3 bg-yellow-500 hover:bg-yellow-600 text-black font-bold rounded transition"
          >
            👨‍🚗 Driver Portal
          </button>
          <button
            onClick={() => setUserType('admin')}
            className="flex-1 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded transition"
          >
            📊 Admin Portal
          </button>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <Router>
      <Routes>
        {/* Public tracking page - no auth required */}
        <Route path="/track/:token" element={<TrackingPage />} />

        {/* All other routes require auth */}
        <Route
          path="/*"
          element={
            <ToastProvider>
              <AuthProvider>
                <AuthGate />
              </AuthProvider>
            </ToastProvider>
          }
        />
      </Routes>
    </Router>
  );
}
