import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  Car,
  DollarSign,
  CreditCard,
  PiggyBank,
  Wrench,
  Bell,
  ShoppingCart,
  BookOpen,
  Settings,
  LogOut,
  Menu,
  X,
  Fuel,
  ClipboardCheck,
  Receipt,
  Package,
  Cog,
  Columns3,
} from 'lucide-react';
import type { Page, User } from '../types';
import { cn } from '../utils';
import SearchBar from './SearchBar';

interface LayoutProps {
  currentPage: Page;
  onNavigate: (page: Page, vehicleId?: string) => void;
  user: User;
  onLogout: () => void;
  dueReminderCount: number;
  children: React.ReactNode;
}

interface NavSection {
  label: string;
  items: { page: Page; label: string; icon: React.ElementType }[];
}

const navSections: NavSection[] = [
  {
    label: 'Overview',
    items: [
      { page: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    ],
  },
  {
    label: 'Fleet',
    items: [
      { page: 'vehicles', label: 'Vehicles', icon: Car },
    ],
  },
  {
    label: 'Records',
    items: [
      { page: 'costs', label: 'Costs', icon: DollarSign },
      { page: 'services', label: 'Services', icon: Wrench },
      { page: 'fuel', label: 'Fuel', icon: Fuel },
      { page: 'repairs', label: 'Repairs', icon: Wrench },
      { page: 'inspections', label: 'Inspections', icon: ClipboardCheck },
      { page: 'taxes', label: 'Taxes', icon: Receipt },
    ],
  },
  {
    label: 'Financial',
    items: [
      { page: 'loans', label: 'Loans', icon: CreditCard },
      { page: 'savings', label: 'Savings', icon: PiggyBank },
    ],
  },
  {
    label: 'Inventory',
    items: [
      { page: 'supplies', label: 'Supplies', icon: Package },
      { page: 'equipment', label: 'Equipment', icon: Cog },
    ],
  },
  {
    label: 'Planning',
    items: [
      { page: 'reminders', label: 'Reminders', icon: Bell },
      { page: 'planner', label: 'Planner', icon: Columns3 },
      { page: 'purchase-planner', label: 'Purchases', icon: ShoppingCart },
    ],
  },
];

const bottomItems: { page: Page; label: string; icon: React.ElementType }[] = [
  { page: 'wiki', label: 'Docs', icon: BookOpen },
  { page: 'settings', label: 'Settings', icon: Settings },
];

const pageTitles: Record<string, string> = {
  dashboard: 'Dashboard',
  vehicles: 'Vehicles',
  'vehicle-detail': 'Vehicle Details',
  costs: 'Costs',
  services: 'Service Records',
  fuel: 'Fuel Tracking',
  inspections: 'Inspections',
  taxes: 'Taxes & Registration',
  loans: 'Loans',
  savings: 'Savings',
  repairs: 'Repairs',
  reminders: 'Reminders',
  planner: 'Task Planner',
  'purchase-planner': 'Purchase Planner',
  supplies: 'Supplies',
  equipment: 'Equipment',
  settings: 'Settings',
  wiki: 'Documentation',
};

export default function Layout({
  currentPage,
  onNavigate,
  user,
  onLogout,
  dueReminderCount,
  children,
}: LayoutProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  const initial = user.username?.charAt(0).toUpperCase() || user.email.charAt(0).toUpperCase();

  function handleNav(page: Page) {
    onNavigate(page);
    setMobileOpen(false);
  }

  function renderNavItem(item: { page: Page; label: string; icon: React.ElementType }, active: boolean) {
    const Icon = item.icon;
    const isReminder = item.page === 'reminders';

    return (
      <button
        key={item.page}
        onClick={() => handleNav(item.page)}
        className={cn(
          'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm cursor-pointer transition-colors w-full text-left',
          active ? 'bg-zinc-800 text-zinc-50' : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50'
        )}
      >
        <div className="relative">
          <Icon size={18} />
          {isReminder && dueReminderCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 bg-red-400 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
              {dueReminderCount > 9 ? '9+' : dueReminderCount}
            </span>
          )}
        </div>
        <span>{item.label}</span>
      </button>
    );
  }

  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="p-5 flex items-center gap-3">
        <img src="/logo.png" alt="Logo" className="h-7 w-auto object-contain" />
        <span className="text-base font-semibold text-zinc-50">DriveLedger</span>
      </div>

      {/* Main nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-2 space-y-0.5">
        {navSections.map((section) => (
          <div key={section.label}>
            <p className="text-[10px] text-zinc-600 uppercase tracking-wider font-medium px-3 mt-4 mb-1">
              {section.label}
            </p>
            {section.items.map((item) => renderNavItem(item, currentPage === item.page))}
          </div>
        ))}
      </nav>

      {/* Bottom nav */}
      <div className="border-t border-zinc-800 px-3 py-3 space-y-1">
        {bottomItems.map((item) => renderNavItem(item, currentPage === item.page))}
      </div>

      {/* User */}
      <div className="border-t border-zinc-800 p-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-violet-500 text-white flex items-center justify-center text-sm font-medium shrink-0">
            {initial}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-zinc-50 truncate">{user.username}</p>
          </div>
          <button
            onClick={onLogout}
            className="text-zinc-500 hover:text-zinc-300 transition-colors p-1.5 rounded-lg hover:bg-zinc-800"
            title="Logout"
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-zinc-950">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex fixed left-0 top-0 w-60 h-screen bg-zinc-900 border-r border-zinc-800 flex-col z-30">
        {sidebarContent}
      </aside>

      {/* Mobile hamburger */}
      <button
        onClick={() => setMobileOpen(true)}
        className="lg:hidden fixed top-3 left-3 z-40 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-lg h-9 w-9 flex items-center justify-center transition-colors"
      >
        <Menu size={20} />
      </button>

      {/* Mobile sidebar overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              className="fixed inset-0 bg-black/60 z-40 lg:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileOpen(false)}
            />
            <motion.aside
              className="fixed left-0 top-0 w-60 h-screen bg-zinc-900 border-r border-zinc-800 flex flex-col z-50 lg:hidden"
              initial={{ x: -240 }}
              animate={{ x: 0 }}
              exit={{ x: -240 }}
              transition={{ type: 'tween', duration: 0.25 }}
            >
              <button
                onClick={() => setMobileOpen(false)}
                className="absolute top-4 right-3 text-zinc-500 hover:text-zinc-300 transition-colors p-1"
              >
                <X size={18} />
              </button>
              {sidebarContent}
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main content */}
      <main className="lg:ml-60 min-h-screen">
        {/* Header */}
        <header className="h-14 flex items-center px-8 border-b border-zinc-800 gap-4">
          <div className="lg:hidden w-9" />
          <h1 className="text-lg font-semibold text-zinc-50">
            {pageTitles[currentPage] || 'DriveLedger'}
          </h1>
          <div className="flex-1 max-w-md">
            <SearchBar onNavigate={onNavigate} />
          </div>
        </header>

        {/* Page content */}
        <motion.div
          key={currentPage}
          className="p-8 max-w-6xl"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
        >
          {children}
        </motion.div>
      </main>
    </div>
  );
}
