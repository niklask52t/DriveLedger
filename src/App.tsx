import { useState, useEffect, useCallback } from 'react';
import { Loader2, RefreshCw, AlertTriangle, CheckCircle2, X } from 'lucide-react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { useUserConfig } from './contexts/UserConfigContext';
import { useI18n } from './contexts/I18nContext';
import { api, ApiError } from './api';
import { loadState, emptyState, loadDueReminders } from './store';
import type { Page, AppState, AppConfig, Reminder } from './types';

// Layout & Error Boundary
import Layout from './components/Layout';
import ErrorBoundary from './components/ErrorBoundary';

// Auth pages
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';

// App pages
import Dashboard from './pages/Dashboard';
import Vehicles from './pages/Vehicles';
import VehicleDetail from './pages/VehicleDetail';
import Costs from './pages/Costs';
import Loans from './pages/Loans';
import Savings from './pages/Savings';
import Repairs from './pages/Repairs';
import Reminders from './pages/Reminders';
import PurchasePlanner from './pages/PurchasePlanner';
import Settings from './pages/Settings';
import Wiki from './pages/Wiki';
import Fuel from './pages/Fuel';
import Inspections from './pages/Inspections';
import Taxes from './pages/Taxes';
import Supplies from './pages/Supplies';
import Equipment from './pages/Equipment';
import Planner from './pages/Planner';
import Kiosk from './pages/Kiosk';


function AppContent() {
  const { user, loading: authLoading, logout, refreshUser } = useAuth();
  const { loadConfig } = useUserConfig();
  const { lang, setCustomTranslations } = useI18n();

  // Read initial page + vehicleId from URL hash (e.g. #costs or #vehicle-detail/abc123)
  const getHashState = (): { page: Page; vehicleId: string | null } => {
    const hash = window.location.hash.slice(1); // remove #
    if (!hash) return { page: 'dashboard', vehicleId: null };
    const [page, vehicleId] = hash.split('/');
    const validPages: Page[] = [
      'dashboard','vehicles','vehicle-detail','costs','services','fuel','repairs',
      'inspections','taxes','loans','savings','supplies','equipment','reminders',
      'planner','purchase-planner','settings','wiki','login','register',
      'forgot-password','reset-password','kiosk'
    ];
    if (validPages.includes(page as Page)) {
      return { page: page as Page, vehicleId: vehicleId || null };
    }
    return { page: 'dashboard', vehicleId: null };
  };

  const initialHash = getHashState();

  // App state
  const [state, setState] = useState<AppState>(emptyState());
  const [currentPage, setCurrentPage] = useState<Page>(initialHash.page);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(initialHash.vehicleId);
  const [dataLoading, setDataLoading] = useState(false);
  const [dataError, setDataError] = useState<string | null>(null);
  const [appConfig, setAppConfig] = useState<AppConfig>({ emailEnabled: false });
  const [dueReminders, setDueReminders] = useState<Reminder[]>([]);

  // Verification banner
  const [verificationBannerDismissed, setVerificationBannerDismissed] = useState(false);
  const [resendingVerification, setResendingVerification] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);

  // Handle URL-based navigation for password reset
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('token') && window.location.pathname.includes('reset-password')) {
      setCurrentPage('reset-password');
    }
  }, []);

  // Listen for browser back/forward (hash changes)
  useEffect(() => {
    const onHashChange = () => {
      const { page, vehicleId } = getHashState();
      setCurrentPage(page);
      if (vehicleId) setSelectedVehicleId(vehicleId);
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  // Load config on mount
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const config = await api.getConfig();
        if (!cancelled) setAppConfig(config);
      } catch {
        // Config not available
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Load data when user logs in
  const loadData = useCallback(async () => {
    setDataLoading(true);
    setDataError(null);
    try {
      const [appState, reminders] = await Promise.all([
        loadState(),
        loadDueReminders(),
      ]);
      setState(appState);
      setDueReminders(reminders);
    } catch (err) {
      if (err instanceof ApiError) {
        setDataError(err.message);
      } else {
        setDataError('Failed to load data. Please try again.');
      }
    } finally {
      setDataLoading(false);
    }
  }, []);

  // Load custom translations when user logs in or language changes
  const loadCustomTranslations = useCallback(async () => {
    try {
      const res = await fetch(`/api/translations/${lang}`, {
        headers: api.getToken() ? { 'Authorization': `Bearer ${api.getToken()}` } : {},
        credentials: 'include',
      });
      if (res.ok) {
        const custom = await res.json();
        if (custom && typeof custom === 'object' && Object.keys(custom).length > 0) {
          setCustomTranslations(custom);
        }
      }
    } catch {
      // Custom translations not available, use built-in
    }
  }, [lang, setCustomTranslations]);

  useEffect(() => {
    if (user) {
      loadData();
      loadConfig();
      loadCustomTranslations();
    }
  }, [user, loadData, loadConfig, loadCustomTranslations]);

  // Refresh helper
  const refreshData = useCallback(async () => {
    try {
      const [appState, reminders] = await Promise.all([
        loadState(),
        loadDueReminders(),
      ]);
      setState(appState);
      setDueReminders(reminders);
    } catch {
      // Silent refresh failure
    }
  }, []);

  // Navigation - syncs to URL hash so Ctrl+R keeps the page
  const navigate = useCallback((page: Page, vehicleId?: string) => {
    setCurrentPage(page);
    if (page === 'vehicle-detail' && vehicleId) {
      setSelectedVehicleId(vehicleId);
      window.location.hash = `vehicle-detail/${vehicleId}`;
    } else if (page !== 'vehicle-detail') {
      setSelectedVehicleId(null);
      window.location.hash = page;
    } else {
      window.location.hash = page;
    }
  }, []);

  const navigateToVehicle = useCallback((vehicleId: string) => {
    setSelectedVehicleId(vehicleId);
    setCurrentPage('vehicle-detail');
    window.location.hash = `vehicle-detail/${vehicleId}`;
  }, []);

  // Logout
  const handleLogout = useCallback(async () => {
    await logout();
    setState(emptyState());
    setCurrentPage('dashboard');
    setDueReminders([]);
    setVerificationBannerDismissed(false);
    setResendSuccess(false);
    window.location.hash = '';
  }, [logout]);

  // Resend verification email
  const handleResendVerification = useCallback(async () => {
    setResendingVerification(true);
    try {
      await api.resendVerification();
      setResendSuccess(true);
    } catch {
      // Silently fail
    } finally {
      setResendingVerification(false);
    }
  }, []);

  // ── Auth loading ──
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-950">
        <Loader2 size={28} className="animate-spin text-violet-400" />
      </div>
    );
  }

  // ── Kiosk mode (standalone, no auth required) ──
  if (currentPage === 'kiosk') {
    return <Kiosk />;
  }

  // ── Not logged in ──
  if (!user) {
    switch (currentPage) {
      case 'register':
        return <Register onNavigate={navigate} />;
      case 'forgot-password':
        return <ForgotPassword onNavigate={navigate} />;
      case 'reset-password':
        return <ResetPassword onNavigate={navigate} />;
      default:
        return <Login onNavigate={navigate} />;
    }
  }

  // ── Data loading ──
  if (dataLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-zinc-950 gap-4">
        <Loader2 size={28} className="animate-spin text-violet-400" />
        <p className="text-sm text-zinc-500">Loading your data...</p>
      </div>
    );
  }

  // ── Data error ──
  if (dataError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-950 px-6">
        <div className="text-center max-w-sm">
          <div className="w-12 h-12 rounded-full bg-red-400/10 flex items-center justify-center mx-auto mb-5">
            <AlertTriangle size={22} className="text-red-400" />
          </div>
          <h2 className="text-lg font-semibold text-zinc-50 mb-2">Something went wrong</h2>
          <p className="text-sm text-zinc-400 mb-6">{dataError}</p>
          <button
            onClick={loadData}
            className="bg-violet-500 hover:bg-violet-400 text-white rounded-lg h-10 px-5 text-sm font-medium transition-colors inline-flex items-center gap-2"
          >
            <RefreshCw size={16} />
            Retry
          </button>
        </div>
      </div>
    );
  }

  // ── Verification banner ──
  const showVerificationBanner =
    appConfig.emailEnabled &&
    user &&
    !user.emailVerified &&
    !verificationBannerDismissed;

  // ── Render current page ──
  function renderPage() {
    switch (currentPage) {
      case 'dashboard':
        return (
          <Dashboard
            state={state}
            onNavigate={navigate}
            onNavigateToVehicle={navigateToVehicle}
          />
        );
      case 'vehicles':
        return (
          <Vehicles
            state={state}
            setState={setState}
            onNavigate={navigate}
          />
        );
      case 'vehicle-detail':
        return (
          <VehicleDetail
            state={state}
            setState={setState}
            vehicleId={selectedVehicleId || ''}
            onNavigate={navigate}
            refreshData={refreshData}
          />
        );
      case 'costs':
        return (
          <Costs
            state={state}
            setState={setState}
            refreshData={refreshData}
          />
        );
      case 'loans':
        return (
          <Loans
            state={state}
            setState={setState}
            refreshData={refreshData}
          />
        );
      case 'savings':
        return (
          <Savings
            state={state}
            setState={setState}
            refreshData={refreshData}
          />
        );
      case 'repairs':
        return (
          <Repairs
            state={state}
            setState={setState}
            refreshData={refreshData}
          />
        );
      case 'reminders':
        return (
          <Reminders
            state={state}
            emailEnabled={appConfig.emailEnabled}
            onRefreshDue={refreshData}
          />
        );
      case 'purchase-planner':
        return (
          <PurchasePlanner
            state={state}
            setState={setState}
            onNavigate={navigate}
          />
        );
      case 'services':
        return <Vehicles state={state} setState={setState} onNavigate={navigate} />;  // Services are per-vehicle in VehicleDetail
      case 'fuel':
        return (
          <Fuel
            state={state}
            setState={setState}
            refreshData={refreshData}
          />
        );
      case 'inspections':
        return (
          <Inspections
            state={state}
            setState={setState}
            refreshData={refreshData}
          />
        );
      case 'taxes':
        return (
          <Taxes
            state={state}
            setState={setState}
            refreshData={refreshData}
          />
        );
      case 'supplies':
        return (
          <Supplies
            state={state}
            setState={setState}
            refreshData={refreshData}
          />
        );
      case 'equipment':
        return (
          <Equipment
            state={state}
            setState={setState}
            refreshData={refreshData}
          />
        );
      case 'planner':
        return (
          <Planner
            state={state}
            setState={setState}
            refreshData={refreshData}
          />
        );
      case 'settings':
        return <Settings />;
      case 'wiki':
        return <Wiki />;
      case 'kiosk':
        return <Kiosk />;
      default:
        return (
          <Dashboard
            state={state}
            onNavigate={navigate}
            onNavigateToVehicle={navigateToVehicle}
          />
        );
    }
  }

  return (
    <Layout
      currentPage={currentPage}
      onNavigate={navigate}
      user={user}
      onLogout={handleLogout}
      dueReminderCount={dueReminders.length}
    >
      {/* Email verification banner */}
      {showVerificationBanner && (
        <div className="bg-amber-400/10 border border-amber-400/20 rounded-lg px-5 py-3 mb-6 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <AlertTriangle size={16} className="text-amber-400 shrink-0" />
            <p className="text-sm text-amber-400">
              Your email is not verified.
              {resendSuccess ? (
                <span className="inline-flex items-center gap-1 ml-2 text-emerald-400">
                  <CheckCircle2 size={14} />
                  Verification email sent!
                </span>
              ) : (
                <button
                  onClick={handleResendVerification}
                  disabled={resendingVerification}
                  className="ml-2 underline hover:no-underline text-amber-300 disabled:opacity-50"
                >
                  {resendingVerification ? 'Sending...' : 'Resend verification email'}
                </button>
              )}
            </p>
          </div>
          <button
            onClick={() => setVerificationBannerDismissed(true)}
            className="text-amber-400/60 hover:text-amber-400 transition-colors shrink-0"
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
    <ErrorBoundary>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ErrorBoundary>
  );
}
