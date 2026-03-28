import { useMemo, useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  PieChart, Pie, Cell, BarChart, Bar, AreaChart, Area,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts';
import { Car, Wrench, PiggyBank, TrendingUp, Fuel, ClipboardCheck, Receipt, AlertTriangle, Package, Settings2, Plus, X, Loader2 } from 'lucide-react';
import type { AppState, Page, DashboardWidget as WidgetData, WidgetType, CustomWidgetCode } from '../types';
import {
  formatCurrency, toMonthly, toYearly, getCategoryLabel,
  getCategoryColor, getCostsByCategory, getCostsByPerson,
  getTotalMonthlyCosts, getTotalYearlyCosts, getTotalRepairCosts,
  getSavingsBalance, getSavingsProgress, getLoanProgress,
} from '../utils';
import { api } from '../api';
import DashboardWidgetCard from '../components/DashboardWidget';
import CustomWidgetRenderer from '../components/CustomWidgetRenderer';
import Modal from '../components/Modal';
import { useI18n } from '../contexts/I18nContext';
import { useUserConfig } from '../contexts/UserConfigContext';
import { useUnits } from '../hooks/useUnits';
import { getVehicleLabel } from '../utils/vehicleLabel';

interface DashboardProps {
  state: AppState;
  onNavigate: (page: Page, vehicleId?: string) => void;
  onNavigateToVehicle?: (vehicleId: string) => void;
}

const fadeUp = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.35 },
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-xs">
      {label && <p className="text-zinc-400 mb-1">{label}</p>}
      {payload.map((p: any, i: number) => (
        <p key={i} style={{ color: p.color }} className="font-medium">
          {p.name}: {formatCurrency(p.value)}
        </p>
      ))}
    </div>
  );
};

const WIDGET_TYPE_KEYS: { value: WidgetType; key: string }[] = [
  { value: 'cost_summary', key: 'dashboard.widget_type.cost_summary' },
  { value: 'fuel_economy', key: 'dashboard.widget_type.fuel_economy' },
  { value: 'upcoming_reminders', key: 'dashboard.widget_type.upcoming_reminders' },
  { value: 'recent_records', key: 'dashboard.widget_type.recent_records' },
  { value: 'vehicle_status', key: 'dashboard.widget_type.vehicle_status' },
  { value: 'custom_chart', key: 'dashboard.widget_type.custom_chart' },
];

export default function Dashboard({ state, onNavigate }: DashboardProps) {
  const { t } = useI18n();
  const { config } = useUserConfig();
  const { fmtDistance, fmtFuelEconomy } = useUnits();
  const { vehicles, costs, loans, repairs, savingsGoals, savingsTransactions, persons,
    serviceRecords, fuelRecords, inspections, taxRecords, supplies } = state;

  const [selectedYear, setSelectedYear] = useState<string>('all');

  // Widget state
  const [widgets, setWidgets] = useState<WidgetData[]>([]);
  const [widgetsLoaded, setWidgetsLoaded] = useState(false);
  const [showWidgetManager, setShowWidgetManager] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [newWidgetName, setNewWidgetName] = useState('');
  const [newWidgetType, setNewWidgetType] = useState<WidgetType>('cost_summary');
  const [addingWidget, setAddingWidget] = useState(false);

  // Custom widget code state
  const [customWidgetCode, setCustomWidgetCode] = useState<CustomWidgetCode[]>([]);

  // Load widgets
  const loadWidgets = useCallback(async () => {
    try {
      const data = await api.getWidgets();
      setWidgets(data);
    } catch {
      // Silently fail - widgets are optional
    } finally {
      setWidgetsLoaded(true);
    }
  }, []);

  // Load custom widget code (admin only, silently fails for non-admins)
  const loadCustomWidgetCode = useCallback(async () => {
    try {
      const data = await api.getCustomWidgetCode();
      setCustomWidgetCode(data.filter(w => w.enabled));
    } catch {
      // Silently fail - custom widgets are optional / admin-only
    }
  }, []);

  useEffect(() => {
    loadWidgets();
    loadCustomWidgetCode();
  }, [loadWidgets, loadCustomWidgetCode]);

  const handleAddWidget = async () => {
    if (!newWidgetName.trim()) return;
    setAddingWidget(true);
    try {
      const created = await api.createWidget({ name: newWidgetName.trim(), type: newWidgetType });
      setWidgets(prev => [...prev, created]);
      setNewWidgetName('');
      setNewWidgetType('cost_summary');
    } catch {
      // ignore
    } finally {
      setAddingWidget(false);
    }
  };

  const handleDeleteWidget = async (id: string) => {
    try {
      await api.deleteWidget(id);
      setWidgets(prev => prev.filter(w => w.id !== id));
    } catch {
      // ignore
    }
  };

  const handleMoveWidget = async (id: string, direction: 'up' | 'down') => {
    const idx = widgets.findIndex(w => w.id === id);
    if (idx === -1) return;
    const newWidgets = [...widgets];
    if (direction === 'up' && idx > 0) {
      [newWidgets[idx - 1], newWidgets[idx]] = [newWidgets[idx], newWidgets[idx - 1]];
    } else if (direction === 'down' && idx < newWidgets.length - 1) {
      [newWidgets[idx + 1], newWidgets[idx]] = [newWidgets[idx], newWidgets[idx + 1]];
    }
    setWidgets(newWidgets);
    // Update sort orders
    for (let i = 0; i < newWidgets.length; i++) {
      if (newWidgets[i].sortOrder !== i) {
        api.updateWidget(newWidgets[i].id, { sortOrder: i }).catch(() => {});
      }
    }
  };

  const availableYears = useMemo(() => {
    const years = new Set<number>();
    const now = new Date().getFullYear();
    years.add(now);
    costs.forEach(c => { if (c.startDate) years.add(new Date(c.startDate).getFullYear()); });
    repairs.forEach(r => { if (r.date) years.add(new Date(r.date).getFullYear()); });
    fuelRecords.forEach(f => { if (f.date) years.add(new Date(f.date).getFullYear()); });
    serviceRecords.forEach(s => { if (s.date) years.add(new Date(s.date).getFullYear()); });
    return Array.from(years).sort((a, b) => b - a);
  }, [costs, repairs, fuelRecords, serviceRecords]);

  const filteredCosts = useMemo(() => {
    if (selectedYear === 'all') return costs;
    return costs.filter(c => c.startDate && new Date(c.startDate).getFullYear() === Number(selectedYear));
  }, [costs, selectedYear]);

  const filteredRepairs = useMemo(() => {
    if (selectedYear === 'all') return repairs;
    return repairs.filter(r => r.date && new Date(r.date).getFullYear() === Number(selectedYear));
  }, [repairs, selectedYear]);

  const totalMonthly = useMemo(() => getTotalMonthlyCosts(filteredCosts), [filteredCosts]);
  const totalYearly = useMemo(() => getTotalYearlyCosts(filteredCosts), [filteredCosts]);

  const categoryData = useMemo(() => {
    const byCategory = getCostsByCategory(filteredCosts);
    return Object.entries(byCategory).map(([key, value]) => ({
      name: getCategoryLabel(key),
      value: Math.round(value * 100) / 100,
      color: getCategoryColor(key),
    }));
  }, [filteredCosts]);

  const personData = useMemo(() => {
    const byPerson = getCostsByPerson(filteredCosts);
    return Object.entries(byPerson).map(([name, value]) => {
      const person = persons.find(p => p.id === name || p.name === name);
      return {
        name: person?.name || name,
        value: Math.round(value * 100) / 100,
        color: person?.color || '#8b5cf6',
      };
    });
  }, [filteredCosts, persons]);

  const timelineData = useMemo(() => {
    const months: Record<string, number> = {};
    filteredCosts.forEach(c => {
      const date = c.startDate?.substring(0, 7);
      if (date) {
        months[date] = (months[date] || 0) + toMonthly(c.amount, c.frequency);
      }
    });
    return Object.entries(months)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-12)
      .map(([month, value]) => ({ month, value: Math.round(value * 100) / 100 }));
  }, [filteredCosts]);

  const vehicleCards = useMemo(() => {
    return vehicles.map(v => {
      const vCosts = filteredCosts.filter(c => c.vehicleId === v.id);
      const monthly = getTotalMonthlyCosts(vCosts);
      return { ...v, monthly };
    });
  }, [vehicles, filteredCosts]);

  const avgFuelConsumption = useMemo(() => {
    const fullFills = fuelRecords.filter(f => !f.isPartialFill && !f.isMissedEntry && f.fuelAmount > 0);
    if (fullFills.length < 2) return null;
    const sorted = [...fullFills].sort((a, b) => a.mileage - b.mileage);
    let totalFuel = 0;
    let totalDistance = 0;
    for (let i = 1; i < sorted.length; i++) {
      const dist = sorted[i].mileage - sorted[i - 1].mileage;
      if (dist > 0) {
        totalDistance += dist;
        totalFuel += sorted[i].fuelAmount;
      }
    }
    if (totalDistance === 0) return null;
    return Math.round((totalFuel / totalDistance) * 100 * 100) / 100;
  }, [fuelRecords]);

  const upcomingItems = useMemo(() => {
    const now = new Date();
    const items: { type: string; label: string; detail: string; severity: 'warning' | 'info' }[] = [];

    // Overdue taxes
    taxRecords.forEach(tx => {
      if (tx.dueDate) {
        const due = new Date(tx.dueDate);
        if (due <= now) {
          const vehicle = vehicles.find(v => v.id === tx.vehicleId);
          items.push({
            type: 'tax',
            label: tx.description || t('taxes.tax_payment'),
            detail: `${vehicle?.name || '-'} - ${tx.dueDate}`,
            severity: 'warning',
          });
        }
      }
    });

    // Upcoming inspections (within 30 days)
    const thirtyDaysOut = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    inspections.forEach(insp => {
      const inspDate = new Date(insp.date);
      if (inspDate >= now && inspDate <= thirtyDaysOut) {
        const vehicle = vehicles.find(v => v.id === insp.vehicleId);
        items.push({
          type: 'inspection',
          label: insp.title || t('nav.inspections'),
          detail: `${vehicle?.name || '-'} - ${insp.date}`,
          severity: 'info',
        });
      }
    });

    // Low stock supplies (quantity <= 2)
    supplies.forEach(s => {
      if (s.quantity <= 2) {
        items.push({
          type: 'supply',
          label: s.name,
          detail: t('supplies.remaining', { quantity: s.quantity }),
          severity: s.quantity === 0 ? 'warning' : 'info',
        });
      }
    });

    return items.slice(0, 8);
  }, [taxRecords, inspections, supplies, vehicles]);

  const savingsData = useMemo(() => {
    return savingsGoals.map(g => ({
      ...g,
      balance: getSavingsBalance(g, savingsTransactions),
      progress: getSavingsProgress(g, savingsTransactions),
    }));
  }, [savingsGoals, savingsTransactions]);

  const recentRepairs = useMemo(() => {
    return [...filteredRepairs].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5);
  }, [filteredRepairs]);

  const loanData = useMemo(() => {
    return loans.map(l => ({
      ...l,
      ...getLoanProgress(l),
    }));
  }, [loans]);

  return (
    <div className="space-y-8">
      {/* Year Filter + Customize */}
      <motion.div {...fadeUp} className="flex items-center justify-between">
        <div />
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowWidgetManager(true)}
            className="h-9 bg-zinc-900 border border-zinc-800 rounded-lg px-4 text-sm text-zinc-400 hover:text-zinc-200 hover:border-zinc-700 transition-colors inline-flex items-center gap-2"
          >
            <Settings2 size={14} />
            {t('dashboard.customize')}
          </button>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
            className="h-9 bg-zinc-900 border border-zinc-800 rounded-lg px-3 text-sm text-zinc-50 outline-none focus:border-violet-500/50"
          >
            <option value="all">{t('common.all_years')}</option>
            {availableYears.map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
      </motion.div>

      {/* Custom Widgets */}
      {widgetsLoaded && widgets.length > 0 && (
        <motion.div {...fadeUp} className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {widgets.map(w => (
            <DashboardWidgetCard
              key={w.id}
              widget={w}
              state={state}
              onDelete={handleDeleteWidget}
              isEditing={isEditing}
            />
          ))}
        </motion.div>
      )}

      {/* Custom Widget Code (HTML/JS widgets) */}
      {customWidgetCode.length > 0 && (
        <motion.div {...fadeUp} className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {customWidgetCode.map(w => (
            <CustomWidgetRenderer key={w.id} code={w.code} name={w.name} />
          ))}
        </motion.div>
      )}

      {/* Stats */}
      <motion.div {...fadeUp} className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6">
        <div>
          <p className="text-3xl font-bold text-violet-400">{vehicles.length}</p>
          <p className="text-xs text-zinc-500 uppercase tracking-wider mt-1">{t('dashboard.vehicles')}</p>
        </div>
        <div>
          <p className="text-3xl font-bold text-emerald-400">{formatCurrency(totalMonthly)}</p>
          <p className="text-xs text-zinc-500 uppercase tracking-wider mt-1">{t('dashboard.monthly_costs')}</p>
        </div>
        <div>
          <p className="text-3xl font-bold text-amber-400">{formatCurrency(totalYearly)}</p>
          <p className="text-xs text-zinc-500 uppercase tracking-wider mt-1">{t('dashboard.yearly_costs')}</p>
        </div>
        <div>
          <p className="text-3xl font-bold text-red-400">{loans.length}</p>
          <p className="text-xs text-zinc-500 uppercase tracking-wider mt-1">{t('dashboard.active_loans')}</p>
        </div>
        <div>
          <p className="text-3xl font-bold text-cyan-400">{serviceRecords.length}</p>
          <p className="text-xs text-zinc-500 uppercase tracking-wider mt-1">{t('dashboard.services')}</p>
        </div>
        <div>
          <p className="text-3xl font-bold text-orange-400">
            {avgFuelConsumption !== null ? fmtFuelEconomy(avgFuelConsumption) : '-'}
          </p>
          <p className="text-xs text-zinc-500 uppercase tracking-wider mt-1">{t('dashboard.avg_l_100km')}</p>
        </div>
      </motion.div>

      {/* Charts */}
      <motion.div {...fadeUp} transition={{ duration: 0.35, delay: 0.05 }} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Pie - Categories */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
          <h3 className="text-sm font-medium text-zinc-400 mb-4">{t('costs.by_category_dashboard')}</h3>
          {categoryData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  dataKey="value"
                  stroke="none"
                >
                  {categoryData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[220px] flex items-center justify-center text-sm text-zinc-600">
              {t('common.no_cost_data')}
            </div>
          )}
          {categoryData.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1">
              {categoryData.map((d, i) => (
                <div key={i} className="flex items-center gap-1.5 text-xs text-zinc-400">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: d.color }} />
                  {d.name}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Bar - Person */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
          <h3 className="text-sm font-medium text-zinc-400 mb-4">{t('costs.by_person_dashboard')}</h3>
          {personData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={personData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                <XAxis dataKey="name" tick={{ fill: '#71717a', fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#71717a', fontSize: 12 }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="value" name="Monthly" radius={[4, 4, 0, 0]}>
                  {personData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[220px] flex items-center justify-center text-sm text-zinc-600">
              {t('common.no_cost_data')}
            </div>
          )}
        </div>

        {/* Area - Timeline */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
          <h3 className="text-sm font-medium text-zinc-400 mb-4">{t('costs.timeline')}</h3>
          {timelineData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={timelineData}>
                <defs>
                  <linearGradient id="colorCost" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                <XAxis dataKey="month" tick={{ fill: '#71717a', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#71717a', fontSize: 12 }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Area
                  type="monotone"
                  dataKey="value"
                  name="Monthly"
                  stroke="#8b5cf6"
                  fill="url(#colorCost)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[220px] flex items-center justify-center text-sm text-zinc-600">
              {t('common.no_timeline_data')}
            </div>
          )}
        </div>
      </motion.div>

      {/* Vehicles */}
      <motion.div {...fadeUp} transition={{ duration: 0.35, delay: 0.1 }}>
        <h2 className="text-lg font-semibold text-zinc-50 mb-4">{t('vehicles.your_vehicles')}</h2>
        {vehicleCards.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {vehicleCards.map(v => {
              const metrics = (v as any).dashboardMetrics || ['total_cost', 'cost_per_km'];
              const parsedMetrics: string[] = typeof metrics === 'string' ? (() => { try { return JSON.parse(metrics); } catch { return ['total_cost','cost_per_km']; } })() : metrics;
              const vCosts = filteredCosts.filter(c => c.vehicleId === v.id);
              const vRepairs = filteredRepairs.filter(r => r.vehicleId === v.id);
              const vFuel = fuelRecords.filter(f => f.vehicleId === v.id);
              const vServices = serviceRecords.filter(s => s.vehicleId === v.id);
              const totalCostVal = vCosts.reduce((s, c) => s + toMonthly(c.amount, c.frequency) * 12, 0)
                + vRepairs.reduce((s, r) => s + r.cost, 0)
                + vServices.reduce((s, s2) => s + s2.cost, 0)
                + vFuel.reduce((s, f) => s + f.fuelCost, 0);
              const costPerKm = v.currentMileage > 0 ? totalCostVal / v.currentMileage : 0;
              const depreciation = v.purchasePrice > 0 ? v.purchasePrice - (v.soldPrice || 0) : 0;

              const metricLabels: Record<string, { label: string; value: string }> = {
                total_cost: { label: 'Total Cost', value: formatCurrency(totalCostVal) },
                cost_per_km: { label: v.useHours ? 'Cost/h' : 'Cost/km', value: formatCurrency(costPerKm) },
                monthly_cost: { label: 'Monthly', value: formatCurrency(v.monthly) },
                fuel_economy: { label: 'Fuel', value: avgFuelConsumption !== null ? fmtFuelEconomy(avgFuelConsumption) : '-' },
                mileage: { label: v.useHours ? 'Hours' : 'Mileage', value: fmtDistance(v.currentMileage) },
                depreciation: { label: 'Depreciation', value: formatCurrency(depreciation) },
              };

              return (
                <div
                  key={v.id}
                  onClick={() => onNavigate('vehicle-detail', v.id)}
                  className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 cursor-pointer hover:border-zinc-700 transition-colors"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <span
                      className="w-3 h-3 rounded-full shrink-0"
                      style={{ backgroundColor: v.color || '#8b5cf6' }}
                    />
                    <span className="font-semibold text-zinc-50 truncate">{getVehicleLabel(v, config)}</span>
                  </div>
                  <p className="text-sm text-zinc-400 mb-3">{v.brand} {v.model}</p>
                  <div className="space-y-1">
                    {parsedMetrics.slice(0, 3).map((m: string) => {
                      const info = metricLabels[m];
                      if (!info) return null;
                      return (
                        <div key={m} className="flex items-center justify-between">
                          <span className="text-xs text-zinc-500">{info.label}</span>
                          <span className="text-sm font-medium text-emerald-400">{info.value}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-10 text-center">
            <Car className="mx-auto text-zinc-600 mb-3" size={32} />
            <p className="text-sm text-zinc-500">{t('vehicles.no_vehicles_dashboard')}</p>
          </div>
        )}
      </motion.div>

      {/* Bottom grid: Savings, Repairs, Loans, Upcoming */}
      <motion.div {...fadeUp} transition={{ duration: 0.35, delay: 0.15 }} className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-6">
        {/* Savings */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
          <div className="flex items-center gap-2 mb-5">
            <PiggyBank size={16} className="text-emerald-400" />
            <h3 className="text-sm font-medium text-zinc-50">{t('dashboard.savings_goals')}</h3>
          </div>
          {savingsData.length > 0 ? (
            <div className="space-y-4">
              {savingsData.map(s => (
                <div key={s.id}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-sm text-zinc-300 truncate">{s.name}</span>
                    <span className="text-xs text-zinc-500">{Math.round(s.progress)}%</span>
                  </div>
                  <div className="w-full h-2 bg-zinc-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-400 rounded-full transition-all"
                      style={{ width: `${Math.min(100, s.progress)}%` }}
                    />
                  </div>
                  <div className="flex justify-between mt-1">
                    <span className="text-xs text-zinc-500">{formatCurrency(s.balance)}</span>
                    <span className="text-xs text-zinc-500">{formatCurrency(s.targetAmount)}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-zinc-600 text-center py-6">{t('savings.no_goals_dashboard')}</p>
          )}
        </div>

        {/* Repairs */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <Wrench size={16} className="text-red-400" />
              <h3 className="text-sm font-medium text-zinc-50">{t('dashboard.recent_repairs')}</h3>
            </div>
            <span className="text-xs text-zinc-500">{formatCurrency(getTotalRepairCosts(filteredRepairs))} {t('dashboard.total')}</span>
          </div>
          {recentRepairs.length > 0 ? (
            <div className="space-y-3">
              {recentRepairs.map(r => {
                const vehicle = vehicles.find(v => v.id === r.vehicleId);
                return (
                  <div key={r.id} className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm text-zinc-300 truncate">{r.description}</p>
                      <p className="text-xs text-zinc-500">{vehicle ? getVehicleLabel(vehicle, config) : '-'} &middot; {r.date}</p>
                    </div>
                    <span className="text-sm font-medium text-red-400 shrink-0">
                      {formatCurrency(r.cost)}
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-zinc-600 text-center py-6">{t('repairs.no_repairs_dashboard')}</p>
          )}
        </div>

        {/* Loans */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
          <div className="flex items-center gap-2 mb-5">
            <TrendingUp size={16} className="text-amber-400" />
            <h3 className="text-sm font-medium text-zinc-50">{t('dashboard.loan_progress')}</h3>
          </div>
          {loanData.length > 0 ? (
            <div className="space-y-4">
              {loanData.map(l => (
                <div key={l.id}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-sm text-zinc-300 truncate">{l.name}</span>
                    <span className="text-xs text-zinc-500">{Math.round(l.percent)}%</span>
                  </div>
                  <div className="w-full h-2 bg-zinc-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-amber-400 rounded-full transition-all"
                      style={{ width: `${Math.min(100, l.percent)}%` }}
                    />
                  </div>
                  <div className="flex justify-between mt-1">
                    <span className="text-xs text-zinc-500">{formatCurrency(l.paid)}</span>
                    <span className="text-xs text-zinc-500">{formatCurrency(l.totalAmount)}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-zinc-600 text-center py-6">{t('loans.no_active_loans')}</p>
          )}
        </div>

        {/* Upcoming */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
          <div className="flex items-center gap-2 mb-5">
            <AlertTriangle size={16} className="text-orange-400" />
            <h3 className="text-sm font-medium text-zinc-50">{t('dashboard.upcoming')}</h3>
          </div>
          {upcomingItems.length > 0 ? (
            <div className="space-y-3">
              {upcomingItems.map((item, i) => (
                <div key={i} className="flex items-start gap-3">
                  <span className={`shrink-0 mt-0.5 w-1.5 h-1.5 rounded-full ${item.severity === 'warning' ? 'bg-red-400' : 'bg-amber-400'}`} />
                  <div className="min-w-0">
                    <p className="text-sm text-zinc-300 truncate">{item.label}</p>
                    <p className="text-xs text-zinc-500">{item.detail}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-zinc-600 text-center py-6">{t('dashboard.nothing_upcoming')}</p>
          )}
        </div>
      </motion.div>

      {/* Widget Manager Modal */}
      <Modal
        isOpen={showWidgetManager}
        onClose={() => setShowWidgetManager(false)}
        title={t('dashboard.customize_dashboard')}
        size="lg"
      >
        <div className="space-y-6">
          {/* Add new widget */}
          <div>
            <h3 className="text-sm font-semibold text-zinc-300 mb-3">{t('dashboard.add_widget')}</h3>
            <div className="flex items-center gap-3">
              <input
                type="text"
                value={newWidgetName}
                onChange={e => setNewWidgetName(e.target.value)}
                placeholder={t('dashboard.widget_name')}
                className="flex-1 h-10 bg-zinc-950 border border-zinc-800 rounded-lg px-3 text-sm text-zinc-50 outline-none focus:border-violet-500/50"
                onKeyDown={e => { if (e.key === 'Enter') handleAddWidget(); }}
              />
              <select
                value={newWidgetType}
                onChange={e => setNewWidgetType(e.target.value as WidgetType)}
                className="h-10 bg-zinc-950 border border-zinc-800 rounded-lg px-3 text-sm text-zinc-50 outline-none focus:border-violet-500/50"
              >
                {WIDGET_TYPE_KEYS.map(opt => (
                  <option key={opt.value} value={opt.value}>{t(opt.key)}</option>
                ))}
              </select>
              <button
                onClick={handleAddWidget}
                disabled={addingWidget || !newWidgetName.trim()}
                className="bg-violet-500 hover:bg-violet-400 text-white rounded-lg h-10 px-4 text-sm font-medium inline-flex items-center gap-2 transition-colors disabled:opacity-50 shrink-0"
              >
                {addingWidget ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                {t('common.add')}
              </button>
            </div>
          </div>

          {/* Active widgets */}
          <div>
            <h3 className="text-sm font-semibold text-zinc-300 mb-3">
              {t('dashboard.active_widgets_count', { count: widgets.length })}
            </h3>
            {widgets.length === 0 ? (
              <p className="text-sm text-zinc-600 text-center py-6">
                {t('dashboard.no_widgets')}
              </p>
            ) : (
              <div className="space-y-2">
                {widgets.map((w, idx) => (
                  <div
                    key={w.id}
                    className="flex items-center justify-between px-4 py-3 bg-zinc-800/30 rounded-lg hover:bg-zinc-800/50 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-sm text-zinc-300 truncate">{w.name}</span>
                      <span className="text-xs bg-zinc-800 text-zinc-500 px-2 py-0.5 rounded-full shrink-0">
                        {WIDGET_TYPE_KEYS.find(o => o.value === w.widgetType) ? t(WIDGET_TYPE_KEYS.find(o => o.value === w.widgetType)!.key) : w.widgetType}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => handleMoveWidget(w.id, 'up')}
                        disabled={idx === 0}
                        className="text-zinc-500 hover:text-zinc-300 disabled:opacity-30 p-1 rounded"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 15l-6-6-6 6"/></svg>
                      </button>
                      <button
                        onClick={() => handleMoveWidget(w.id, 'down')}
                        disabled={idx === widgets.length - 1}
                        className="text-zinc-500 hover:text-zinc-300 disabled:opacity-30 p-1 rounded"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 9l6 6 6-6"/></svg>
                      </button>
                      <button
                        onClick={() => handleDeleteWidget(w.id)}
                        className="text-zinc-500 hover:text-red-400 p-1 rounded transition-colors ml-1"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </Modal>
    </div>
  );
}
