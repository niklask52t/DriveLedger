import { useState, useCallback, useEffect } from 'react';
import { Loader2, AlertTriangle, X } from 'lucide-react';
import type { Page, AppState, Reminder, AppConfig } from './types';
import { loadState, emptyState, loadDueReminders } from './store';
import { api } from './api';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Vehicles from './pages/Vehicles';
import VehicleDetail from './pages/VehicleDetail';
import Costs from './pages/Costs';
import Loans from './pages/Loans';
import Savings from './pages/Savings';
import Repairs from './pages/Repairs';
import Reminders from './pages/Reminders';
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
  reminders: 'Reminders',
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
  const [appConfig, setAppConfig] = useState<AppConfig>({ emailEnabled: false });
  const [dueReminders, setDueReminders] = useState<Reminder[]>([]);
  const [verificationBannerDismissed, setVerificationBannerDismissed] = useState(false);
  const [resendingVerification, setResendingVerification] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);

  const refreshData = useCallback(async () => {
    try {
      const newState = await loadState();
      setStateRaw(newState);
    } catch (err) {
      console.error('Failed to refresh data:', err);
      setDataError('Failed to load data from server.');
    }
  }, []);

  const refreshDueReminders = useCallback(async () => {
    try {
      const due = await loadDueReminders();
      setDueReminders(due);
    } catch {
      // silently ignore
    }
  }, []);

  // Load config on mount
  useEffect(() => {
    api.getConfig()
      .then((cfg) => setAppConfig(cfg))
      .catch(() => { /* config endpoint may not exist yet */ });
  }, []);

  // Load data when user logs in
  useEffect(() => {
    if (user) {
      setDataLoading(true);
      setDataError('');
      Promise.all([
        loadState(),
        loadDueReminders(),
        api.getConfig().catch(() => ({ emailEnabled: false })),
      ])
        .then(([s, due, cfg]) => {
          setStateRaw(s);
          setDueReminders(due);
          setAppConfig(cfg);
        })
        .catch(() => setDataError('Failed to load data from server.'))
        .finally(() => setDataLoading(false));
    } else {
      setStateRaw(emptyState());
      setDueReminders([]);
      setVerificationBannerDismissed(false);
      setResendSuccess(false);
    }
  }, [user]);

  const handleResendVerification = async () => {
    setResendingVerification(true);
    try {
      await api.resendVerification();
      setResendSuccess(true);
    } catch {
      // ignore
    } finally {
      setResendingVerification(false);
    }
  };

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
      case 'reminders':
        return <Reminders state={state} emailEnabled={appConfig.emailEnabled} onRefreshDue={refreshDueReminders} />;
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

  const showVerificationBanner = appConfig.emailEnabled && user && !user.emailVerified && !verificationBannerDismissed;

  return (
    <Layout
      currentPage={currentPage}
      onNavigate={handleNavigate}
      pageTitle={pageTitles[currentPage] || 'DriveLedger'}
      dueReminderCount={dueReminders.length}
    >
      {showVerificationBanner && (
        <div className="flex items-center gap-3 bg-amber-500/15 border border-amber-500/30 rounded-lg px-4 py-3 mb-4">
          <AlertTriangle size={18} className="text-amber-400 shrink-0" />
          <p className="text-sm text-amber-200 flex-1">
            Please verify your email. Check your inbox or{' '}
            {resendSuccess ? (
              <span className="text-amber-300 font-medium">Verification email sent!</span>
            ) : (
              <button
                onClick={handleResendVerification}
                disabled={resendingVerification}
                className="text-amber-300 hover:text-amber-100 underline font-medium cursor-pointer disabled:opacity-50"
              >
                {resendingVerification ? 'Sending...' : 'click here to resend'}
              </button>
            )}
            .
          </p>
          <button
            onClick={() => setVerificationBannerDismissed(true)}
            className="p-1 rounded text-amber-400 hover:text-amber-200 transition-colors cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>
      )}
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
