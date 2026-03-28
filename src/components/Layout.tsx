import { useState, useEffect, useMemo } from 'react';
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
  ChevronRight,
} from 'lucide-react';
import type { Page, User } from '../types';
import { cn } from '../lib/utils';
import SearchBar from './SearchBar';
import { useI18n } from '../contexts/I18nContext';
import { useUserConfig } from '../contexts/UserConfigContext';

interface LayoutProps {
  currentPage: Page;
  onNavigate: (page: Page, vehicleId?: string) => void;
  user: User;
  onLogout: () => void;
  dueReminderCount: number;
  children: React.ReactNode;
}

interface NavItem {
  page: Page;
  label: string;
  icon: React.ElementType;
}

interface NavSection {
  key: string;
  label: string;
  icon: React.ElementType;
  items: NavItem[];
}

export default function Layout({
  currentPage,
  onNavigate,
  user,
  onLogout,
  dueReminderCount,
  children,
}: LayoutProps) {
  const { t } = useI18n();
  const { config } = useUserConfig();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [customLogoUrl, setCustomLogoUrl] = useState('');

  useEffect(() => {
    fetch('/api/config')
      .then(res => res.json())
      .then(data => {
        if (data.customLogoUrl) setCustomLogoUrl(data.customLogoUrl);
      })
      .catch(() => { /* ignore */ });
  }, []);

  const navSections: NavSection[] = useMemo(() => [
    {
      key: 'records',
      label: t('nav.records'),
      icon: DollarSign,
      items: [
        { page: 'costs' as Page, label: t('nav.costs'), icon: DollarSign },
        { page: 'fuel' as Page, label: t('nav.fuel'), icon: Fuel },
        { page: 'repairs' as Page, label: t('nav.repairs'), icon: Wrench },
        { page: 'inspections' as Page, label: t('nav.inspections'), icon: ClipboardCheck },
        { page: 'taxes' as Page, label: t('nav.taxes'), icon: Receipt },
      ],
    },
    {
      key: 'financial',
      label: t('nav.financial'),
      icon: CreditCard,
      items: [
        { page: 'loans' as Page, label: t('nav.loans'), icon: CreditCard },
        { page: 'savings' as Page, label: t('nav.savings'), icon: PiggyBank },
      ],
    },
    {
      key: 'inventory',
      label: t('nav.inventory'),
      icon: Package,
      items: [
        { page: 'supplies' as Page, label: t('nav.supplies'), icon: Package },
        { page: 'equipment' as Page, label: t('nav.equipment'), icon: Cog },
      ],
    },
    {
      key: 'planning',
      label: t('nav.planning'),
      icon: Columns3,
      items: [
        { page: 'reminders' as Page, label: t('nav.reminders'), icon: Bell },
        { page: 'planner' as Page, label: t('nav.planner'), icon: Columns3 },
        { page: 'purchase-planner' as Page, label: t('nav.purchases'), icon: ShoppingCart },
      ],
    },
  ], [t]);

  // Filter sections by visible tabs and respect tab order
  const filteredSections = useMemo(() => {
    const visibleTabs = config.visibleTabs;
    const tabOrder = config.tabOrder;

    return navSections
      .map((section) => {
        let items = section.items.filter((item) => visibleTabs.includes(item.page));

        // Reorder items according to tabOrder if non-empty
        if (tabOrder && tabOrder.length > 0) {
          items.sort((a, b) => {
            const ai = tabOrder.indexOf(a.page);
            const bi = tabOrder.indexOf(b.page);
            // Items not in tabOrder go to the end, preserving original order
            const aIdx = ai === -1 ? Infinity : ai;
            const bIdx = bi === -1 ? Infinity : bi;
            return aIdx - bIdx;
          });
        }

        return { ...section, items };
      })
      .filter((section) => section.items.length > 0);
  }, [navSections, config.visibleTabs, config.tabOrder]);

  const pageTitles: Record<string, string> = useMemo(() => ({
    dashboard: t('page.dashboard'),
    vehicles: t('page.vehicles'),
    'vehicle-detail': t('page.vehicle_detail'),
    costs: t('page.costs'),
    services: t('page.services'),
    fuel: t('page.fuel'),
    inspections: t('page.inspections'),
    taxes: t('page.taxes'),
    loans: t('page.loans'),
    savings: t('page.savings'),
    repairs: t('page.repairs'),
    reminders: t('page.reminders'),
    planner: t('page.planner'),
    'purchase-planner': t('page.purchase_planner'),
    supplies: t('page.supplies'),
    equipment: t('page.equipment'),
    settings: t('page.settings'),
    wiki: t('page.wiki'),
  }), [t]);

  // Find which section contains the current page
  function getSectionForPage(page: Page): string | null {
    for (const section of filteredSections) {
      if (section.items.some((item) => item.page === page)) return section.key;
    }
    return null;
  }

  const [openSections, setOpenSections] = useState<Set<string>>(() => {
    const active = getSectionForPage(currentPage);
    return active ? new Set([active]) : new Set();
  });

  // Auto-open section when navigating to a page in it
  useEffect(() => {
    const section = getSectionForPage(currentPage);
    if (section && !openSections.has(section)) {
      setOpenSections((prev) => new Set([...prev, section]));
    }
  }, [currentPage, filteredSections]);

  const initial = user.username?.charAt(0).toUpperCase() || user.email.charAt(0).toUpperCase();

  function handleNav(page: Page) {
    onNavigate(page);
    setMobileOpen(false);
  }

  function toggleSection(key: string) {
    setOpenSections((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function renderNavItem(item: { page: Page; label: string; icon: React.ElementType }, active: boolean, nested = false) {
    const Icon = item.icon;
    const isReminder = item.page === 'reminders';

    return (
      <button
        key={item.page}
        onClick={() => handleNav(item.page)}
        className={cn(
          'flex items-center gap-3 rounded-lg text-sm cursor-pointer transition-colors w-full text-left',
          nested ? 'px-3 py-2 pl-10' : 'px-3 py-2.5',
          active ? 'bg-zinc-800 text-zinc-50' : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50'
        )}
      >
        <div className="relative">
          <Icon size={nested ? 16 : 18} />
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

  function renderSection(section: NavSection) {
    const isOpen = openSections.has(section.key);
    const hasActivePage = section.items.some((item) => item.page === currentPage);
    const SectionIcon = section.icon;

    return (
      <div key={section.key}>
        <button
          onClick={() => toggleSection(section.key)}
          className={cn(
            'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm cursor-pointer transition-colors w-full text-left group',
            hasActivePage && !isOpen
              ? 'text-violet-400'
              : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50'
          )}
        >
          <SectionIcon size={18} />
          <span className="flex-1 font-medium">{section.label}</span>
          {hasActivePage && !isOpen && (
            <span className="w-1.5 h-1.5 rounded-full bg-violet-400" />
          )}
          <ChevronRight
            size={14}
            className={cn(
              'transition-transform duration-200 text-zinc-600 group-hover:text-zinc-500',
              isOpen && 'rotate-90'
            )}
          />
        </button>
        <AnimatePresence initial={false}>
          {isOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="py-0.5">
                {section.items.map((item) =>
                  renderNavItem(item, currentPage === item.page, true)
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  const showDashboard = config.visibleTabs.includes('dashboard');
  const showVehicles = config.visibleTabs.includes('vehicles');

  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="p-5 flex items-center gap-3">
        <img src={customLogoUrl || '/logo.png'} alt="Logo" className="h-7 w-auto object-contain" />
        <span className="text-base font-semibold text-zinc-50">DriveLedger</span>
      </div>

      {/* Main nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-2 space-y-1">
        {/* Top-level pages */}
        {showDashboard && renderNavItem({ page: 'dashboard', label: t('nav.dashboard'), icon: LayoutDashboard }, currentPage === 'dashboard')}
        {showVehicles && renderNavItem({ page: 'vehicles', label: t('nav.vehicles'), icon: Car }, currentPage === 'vehicles' || currentPage === 'vehicle-detail' || currentPage === 'services')}

        {/* Separator - only show if there are top-level items and sections */}
        {(showDashboard || showVehicles) && filteredSections.length > 0 && (
          <div className="h-px bg-zinc-800/60 my-2" />
        )}

        {/* Collapsible sections */}
        {filteredSections.map(renderSection)}
      </nav>

      {/* Bottom nav */}
      <div className="border-t border-zinc-800 px-3 py-3 space-y-1">
        {renderNavItem({ page: 'wiki', label: t('nav.docs'), icon: BookOpen }, currentPage === 'wiki')}
        {renderNavItem({ page: 'settings', label: t('nav.settings'), icon: Settings }, currentPage === 'settings')}
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
            title={t('auth.logout')}
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
          {(config.showSearch !== false) && (
            <div className="flex-1 max-w-md">
              <SearchBar onNavigate={onNavigate} />
            </div>
          )}
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
