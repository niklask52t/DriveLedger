import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  PieChart, Pie, Cell, BarChart, Bar, AreaChart, Area,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts';
import { Car, Wrench, PiggyBank, TrendingUp, Fuel, ClipboardCheck, Receipt, AlertTriangle, Package } from 'lucide-react';
import type { AppState, Page } from '../types';
import {
  formatCurrency, toMonthly, toYearly, getCategoryLabel,
  getCategoryColor, getCostsByCategory, getCostsByPerson,
  getTotalMonthlyCosts, getTotalYearlyCosts, getTotalRepairCosts,
  getSavingsBalance, getSavingsProgress, getLoanProgress,
} from '../utils';

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

export default function Dashboard({ state, onNavigate }: DashboardProps) {
  const { vehicles, costs, loans, repairs, savingsGoals, savingsTransactions, persons,
    serviceRecords, fuelRecords, inspections, taxRecords, supplies } = state;

  const [selectedYear, setSelectedYear] = useState<string>('all');

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
    taxRecords.forEach(t => {
      if (t.dueDate) {
        const due = new Date(t.dueDate);
        if (due <= now) {
          const vehicle = vehicles.find(v => v.id === t.vehicleId);
          items.push({
            type: 'tax',
            label: t.description || 'Tax payment',
            detail: `${vehicle?.name || 'Unknown'} - due ${t.dueDate}`,
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
          label: insp.title || 'Inspection',
          detail: `${vehicle?.name || 'Unknown'} - ${insp.date}`,
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
          detail: `${s.quantity} remaining`,
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
      {/* Year Filter */}
      <motion.div {...fadeUp} className="flex items-center justify-end">
        <select
          value={selectedYear}
          onChange={(e) => setSelectedYear(e.target.value)}
          className="h-9 bg-zinc-900 border border-zinc-800 rounded-lg px-3 text-sm text-zinc-50 outline-none focus:border-violet-500/50"
        >
          <option value="all">All Years</option>
          {availableYears.map(y => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
      </motion.div>

      {/* Stats */}
      <motion.div {...fadeUp} className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6">
        <div>
          <p className="text-3xl font-bold text-violet-400">{vehicles.length}</p>
          <p className="text-xs text-zinc-500 uppercase tracking-wider mt-1">Vehicles</p>
        </div>
        <div>
          <p className="text-3xl font-bold text-emerald-400">{formatCurrency(totalMonthly)}</p>
          <p className="text-xs text-zinc-500 uppercase tracking-wider mt-1">Monthly Costs</p>
        </div>
        <div>
          <p className="text-3xl font-bold text-amber-400">{formatCurrency(totalYearly)}</p>
          <p className="text-xs text-zinc-500 uppercase tracking-wider mt-1">Yearly Costs</p>
        </div>
        <div>
          <p className="text-3xl font-bold text-red-400">{loans.length}</p>
          <p className="text-xs text-zinc-500 uppercase tracking-wider mt-1">Active Loans</p>
        </div>
        <div>
          <p className="text-3xl font-bold text-cyan-400">{serviceRecords.length}</p>
          <p className="text-xs text-zinc-500 uppercase tracking-wider mt-1">Services</p>
        </div>
        <div>
          <p className="text-3xl font-bold text-orange-400">
            {avgFuelConsumption !== null ? `${avgFuelConsumption} L` : '-'}
          </p>
          <p className="text-xs text-zinc-500 uppercase tracking-wider mt-1">Avg L/100km</p>
        </div>
      </motion.div>

      {/* Charts */}
      <motion.div {...fadeUp} transition={{ duration: 0.35, delay: 0.05 }} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Pie - Categories */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
          <h3 className="text-sm font-medium text-zinc-400 mb-4">Costs by Category</h3>
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
              No cost data
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
          <h3 className="text-sm font-medium text-zinc-400 mb-4">Costs by Person</h3>
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
              No cost data
            </div>
          )}
        </div>

        {/* Area - Timeline */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
          <h3 className="text-sm font-medium text-zinc-400 mb-4">Cost Timeline</h3>
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
              No timeline data
            </div>
          )}
        </div>
      </motion.div>

      {/* Vehicles */}
      <motion.div {...fadeUp} transition={{ duration: 0.35, delay: 0.1 }}>
        <h2 className="text-lg font-semibold text-zinc-50 mb-4">Your Vehicles</h2>
        {vehicleCards.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {vehicleCards.map(v => (
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
                  <span className="font-semibold text-zinc-50 truncate">{v.name}</span>
                </div>
                <p className="text-sm text-zinc-400 mb-3">{v.brand} {v.model}</p>
                <p className="text-sm font-medium text-emerald-400">{formatCurrency(v.monthly)}/mo</p>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-10 text-center">
            <Car className="mx-auto text-zinc-600 mb-3" size={32} />
            <p className="text-sm text-zinc-500">No vehicles added yet</p>
          </div>
        )}
      </motion.div>

      {/* Bottom grid: Savings, Repairs, Loans, Upcoming */}
      <motion.div {...fadeUp} transition={{ duration: 0.35, delay: 0.15 }} className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-6">
        {/* Savings */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
          <div className="flex items-center gap-2 mb-5">
            <PiggyBank size={16} className="text-emerald-400" />
            <h3 className="text-sm font-medium text-zinc-50">Savings Goals</h3>
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
            <p className="text-sm text-zinc-600 text-center py-6">No savings goals</p>
          )}
        </div>

        {/* Repairs */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <Wrench size={16} className="text-red-400" />
              <h3 className="text-sm font-medium text-zinc-50">Recent Repairs</h3>
            </div>
            <span className="text-xs text-zinc-500">{formatCurrency(getTotalRepairCosts(filteredRepairs))} total</span>
          </div>
          {recentRepairs.length > 0 ? (
            <div className="space-y-3">
              {recentRepairs.map(r => {
                const vehicle = vehicles.find(v => v.id === r.vehicleId);
                return (
                  <div key={r.id} className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm text-zinc-300 truncate">{r.description}</p>
                      <p className="text-xs text-zinc-500">{vehicle?.name} &middot; {r.date}</p>
                    </div>
                    <span className="text-sm font-medium text-red-400 shrink-0">
                      {formatCurrency(r.cost)}
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-zinc-600 text-center py-6">No repairs recorded</p>
          )}
        </div>

        {/* Loans */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
          <div className="flex items-center gap-2 mb-5">
            <TrendingUp size={16} className="text-amber-400" />
            <h3 className="text-sm font-medium text-zinc-50">Loan Progress</h3>
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
            <p className="text-sm text-zinc-600 text-center py-6">No active loans</p>
          )}
        </div>

        {/* Upcoming */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
          <div className="flex items-center gap-2 mb-5">
            <AlertTriangle size={16} className="text-orange-400" />
            <h3 className="text-sm font-medium text-zinc-50">Upcoming</h3>
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
            <p className="text-sm text-zinc-600 text-center py-6">Nothing upcoming</p>
          )}
        </div>
      </motion.div>
    </div>
  );
}
