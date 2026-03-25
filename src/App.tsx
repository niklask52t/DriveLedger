import { useState, useCallback, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import type { Page, AppState } from './types';
import { loadState, emptyState } from './store';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Vehicles from './pages/Vehicles';
import VehicleDetail from './pages/VehicleDetail';
import Costs from './pages/Costs';
import Loans from './pages/Loans';
import Savings from './pages/Savings';
import Repairs from './pages/Repairs';
import PurchasePlanner from './pages/PurchasePlanner';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import Settings from './pages/Settings';
import Wiki from './pages/Wiki';

const pageTitles: Record<Page, string> = {
  dashboard: 'Dashboard',
  vehicles: 'My Vehicles',
  'vehicle-detail': 'Vehicle Details',
  costs: 'Cost Management',
  loans: 'Loans & Financing',
  savings: 'Savings Goals',
  repairs: 'Repair History',
  'purchase-planner': 'Purchase Planner',
  login: 'Login',
  register: 'Register',
  'forgot-password': 'Forgot Password',
  'reset-password': 'Reset Password',
  settings: 'Settings',
  wiki: 'Documentation',
};

function AppContent() {
  const { user, loading: authLoading } = useAuth();
  const [state, setStateRaw] = useState<AppState>(emptyState);
  const [currentPage, setCurrentPage] = useState<Page>('dashboard');
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>('');
  const [dataLoading, setDataLoading] = useState(false);
  const [dataError, setDataError] = useState('');

  const refreshData = useCallback(async () => {
    try {
      const newState = await loadState();
      setStateRaw(newState);
    } catch (err) {
      console.error('Failed to refresh data:', err);
      setDataError('Failed to load data from server.');
    }
  }, []);

  // Load data when user logs in
  useEffect(() => {
    if (user) {
      setDataLoading(true);
      setDataError('');
      loadState()
        .then((s) => setStateRaw(s))
        .catch(() => setDataError('Failed to load data from server.'))
        .finally(() => setDataLoading(false));
    } else {
      setStateRaw(emptyState());
    }
  }, [user]);

  // setState wrapper: update local state, then refresh from API to keep in sync
  const setState = useCallback((newState: AppState) => {
    setStateRaw(newState);
    // Re-sync with server after a short delay to pick up any server-side changes
    refreshData();
  }, [refreshData]);

  const handleNavigate = useCallback((page: Page, vehicleId?: string) => {
    setCurrentPage(page);
    if (vehicleId) setSelectedVehicleId(vehicleId);
  }, []);

  // Show loading spinner during initial auth check
  if (authLoading) {
    return (
      <div className="min-h-screen bg-dark-950 flex flex-col items-center justify-center gap-4">
        <img src="/logo.png" alt="DriveLedger" className="w-20 h-20 rounded-2xl shadow-lg shadow-primary-600/30 object-cover" />
        <Loader2 size={28} className="animate-spin text-primary-400" />
        <p className="text-dark-400 text-sm">Loading DriveLedger...</p>
      </div>
    );
  }

  // Not logged in - show auth pages
  if (!user) {
    switch (currentPage) {
      case 'register':
        return <Register onNavigate={handleNavigate} />;
      case 'forgot-password':
        return <ForgotPassword onNavigate={handleNavigate} />;
      case 'reset-password':
        return <ResetPassword onNavigate={handleNavigate} />;
      default:
        return <Login onNavigate={handleNavigate} />;
    }
  }

  // Logged in but data still loading
  if (dataLoading) {
    return (
      <div className="min-h-screen bg-dark-950 flex flex-col items-center justify-center gap-4">
        <Loader2 size={28} className="animate-spin text-primary-400" />
        <p className="text-dark-400 text-sm">Loading your data...</p>
      </div>
    );
  }

  // Data error
  if (dataError) {
    return (
      <div className="min-h-screen bg-dark-950 flex flex-col items-center justify-center gap-4">
        <p className="text-danger">{dataError}</p>
        <button
          onClick={() => {
            setDataError('');
            setDataLoading(true);
            loadState()
              .then((s) => setStateRaw(s))
              .catch(() => setDataError('Failed to load data.'))
              .finally(() => setDataLoading(false));
          }}
          className="text-primary-400 hover:text-primary-300 font-medium cursor-pointer"
        >
          Retry
        </button>
      </div>
    );
  }

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <Dashboard state={state} onNavigate={handleNavigate} />;
      case 'vehicles':
        return <Vehicles state={state} setState={setState} onNavigate={handleNavigate} />;
      case 'vehicle-detail':
        return (
          <VehicleDetail
            state={state}
            setState={setState}
            vehicleId={selectedVehicleId}
            onNavigate={handleNavigate}
          />
        );
      case 'costs':
        return <Costs state={state} setState={setState} />;
      case 'loans':
        return <Loans state={state} setState={setState} />;
      case 'savings':
        return <Savings state={state} setState={setState} />;
      case 'repairs':
        return <Repairs state={state} setState={setState} />;
      case 'purchase-planner':
        return <PurchasePlanner state={state} setState={setState} onNavigate={handleNavigate} />;
      case 'settings':
        return <Settings />;
      case 'wiki':
        return <Wiki />;
      default:
        return <Dashboard state={state} onNavigate={handleNavigate} />;
    }
  };

  return (
    <Layout
      currentPage={currentPage}
      onNavigate={handleNavigate}
      pageTitle={pageTitles[currentPage] || 'DriveLedger'}
    >
      {renderPage()}
    </Layout>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
