import { useState } from 'react';
import {
  LayoutDashboard, Car, DollarSign, CreditCard, PiggyBank,
  Wrench, Bell, ShoppingCart, Menu, X, Settings, BookOpen,
  LogOut, User
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import type { Page } from '../types';

interface NavItem {
  page: Page;
  label: string;
  icon: React.ReactNode;
}

interface LayoutProps {
  currentPage: Page;
  onNavigate: (page: Page) => void;
  pageTitle: string;
  children: React.ReactNode;
  dueReminderCount?: number;
}

const mainNavItems: NavItem[] = [
  { page: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={20} /> },
  { page: 'vehicles', label: 'My Vehicles', icon: <Car size={20} /> },
  { page: 'costs', label: 'Costs', icon: <DollarSign size={20} /> },
  { page: 'loans', label: 'Loans', icon: <CreditCard size={20} /> },
  { page: 'savings', label: 'Savings', icon: <PiggyBank size={20} /> },
  { page: 'repairs', label: 'Repairs', icon: <Wrench size={20} /> },
  { page: 'reminders', label: 'Reminders', icon: <Bell size={20} /> },
  { page: 'purchase-planner', label: 'Purchase Planner', icon: <ShoppingCart size={20} /> },
];

const bottomNavItems: NavItem[] = [
  { page: 'wiki', label: 'Documentation', icon: <BookOpen size={20} /> },
  { page: 'settings', label: 'Settings', icon: <Settings size={20} /> },
];

export default function Layout({ currentPage, onNavigate, pageTitle, children, dueReminderCount = 0 }: LayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, logout } = useAuth();

  const handleNavigate = (page: Page) => {
    onNavigate(page);
    setSidebarOpen(false);
  };

  const handleLogout = async () => {
    await logout();
  };

  const renderNavButton = (item: NavItem) => {
    const isActive = currentPage === item.page;
    const showBadge = item.page === 'reminders' && dueReminderCount > 0;
    return (
      <button
        key={item.page}
        onClick={() => handleNavigate(item.page)}
        className={`
          flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium
          transition-all duration-150 ease-in-out cursor-pointer
          ${
            isActive
              ? 'bg-primary-600 text-white shadow-lg shadow-primary-600/25'
              : 'text-dark-400 hover:bg-dark-800 hover:text-dark-200'
          }
        `}
      >
        <span className={`relative ${isActive ? 'text-white' : ''}`}>
          {item.icon}
          {showBadge && (
            <span className="absolute -top-1.5 -right-1.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-danger text-[10px] font-bold text-white px-1">
              {dueReminderCount > 99 ? '99+' : dueReminderCount}
            </span>
          )}
        </span>
        {item.label}
      </button>
    );
  };

  return (
    <div className="flex h-screen bg-dark-950 text-dark-100 overflow-hidden">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden transition-opacity"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-dark-900 border-r border-dark-800
          transition-transform duration-300 ease-in-out
          lg:static lg:translate-x-0
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        {/* Logo area */}
        <div className="flex h-16 items-center gap-3 px-5 border-b border-dark-800">
          <img src="/logo.png" alt="DriveLedger" className="w-9 h-9 rounded-lg object-cover" />
          <span className="text-lg font-bold tracking-tight text-dark-50">
            DriveLedger
          </span>
          {/* Close button on mobile */}
          <button
            onClick={() => setSidebarOpen(false)}
            className="ml-auto p-1 rounded-md text-dark-400 hover:text-dark-200 hover:bg-dark-800 transition-colors lg:hidden"
          >
            <X size={20} />
          </button>
        </div>

        {/* Main navigation */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          {mainNavItems.map(renderNavButton)}
        </nav>

        {/* Bottom navigation */}
        <div className="px-3 py-2 space-y-1 border-t border-dark-800">
          {bottomNavItems.map(renderNavButton)}
        </div>

        {/* User section */}
        <div className="border-t border-dark-800 px-3 py-3">
          <div className="flex items-center gap-3 px-2">
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary-600/20">
              <User size={16} className="text-primary-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-dark-200 truncate">{user?.username || 'User'}</p>
              <p className="text-xs text-dark-500 truncate">{user?.email || ''}</p>
            </div>
            <button
              onClick={handleLogout}
              className="p-1.5 rounded-lg text-dark-400 hover:text-danger hover:bg-dark-800 transition-colors cursor-pointer"
              title="Sign out"
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </aside>

      {/* Main area */}
      <div className="flex flex-1 flex-col min-w-0">
        {/* Header */}
        <header className="flex h-16 shrink-0 items-center gap-4 border-b border-dark-800 bg-dark-900/60 backdrop-blur-md px-4 lg:px-6">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 rounded-lg text-dark-400 hover:text-dark-200 hover:bg-dark-800 transition-colors lg:hidden"
          >
            <Menu size={22} />
          </button>
          <h1 className="text-lg font-semibold text-dark-50 truncate">
            {pageTitle}
          </h1>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
