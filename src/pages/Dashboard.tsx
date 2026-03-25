import { useMemo } from 'react';
import {
  PieChart, Pie, Cell,
  BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer,
  AreaChart, Area,
} from 'recharts';
import {
  Car, CreditCard, CalendarClock, Landmark,
  Wrench, PiggyBank, ChevronRight, TrendingUp,
} from 'lucide-react';
import { addMonths, format } from 'date-fns';
import type { AppState, Page } from '../types';
import {
  formatCurrency,
  getCategoryColor,
  getCategoryLabel,
  getLoanProgress,
  getSavingsBalance,
  getSavingsProgress,
  getTotalMonthlyCosts,
  getTotalYearlyCosts,
  getCostsByCategory,
  getCostsByPerson,
  toMonthly,
  formatDate,
} from '../utils';

interface DashboardProps {
  state: AppState;
  onNavigate: (page: Page, vehicleId?: string) => void;
}

/* ---------- tiny helpers ---------- */

function StatCard({
  icon, label, value, gradient,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  gradient: string;
}) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-dark-700 bg-dark-800 p-5">
      <div className={`absolute -right-4 -top-4 h-24 w-24 rounded-full opacity-20 blur-2xl ${gradient}`} />
      <div className="flex items-center gap-3">
        <div className={`flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${gradient} text-white`}>
          {icon}
        </div>
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-dark-400">{label}</p>
          <p className="text-xl font-bold text-white">{value}</p>
        </div>
      </div>
    </div>
  );
}

function SectionHeader({ title, icon }: { title: string; icon: React.ReactNode }) {
  return (
    <div className="mb-3 flex items-center gap-2 text-dark-300">
      {icon}
      <h2 className="text-sm font-semibold uppercase tracking-wider">{title}</h2>
    </div>
  );
}

/* ---------- custom recharts tooltip ---------- */

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-dark-700 bg-dark-850 px-3 py-2 text-xs shadow-xl">
      {label && <p className="mb-1 font-medium text-dark-300">{label}</p>}
      {payload.map((p: any, i: number) => (
        <p key={i} style={{ color: p.color || p.fill }} className="font-semibold">
          {p.name}: {formatCurrency(p.value)}
        </p>
      ))}
    </div>
  );
}

/* ====================================================================== */

export default function Dashboard({ state, onNavigate }: DashboardProps) {
  const { vehicles, costs, loans, repairs, savingsGoals, savingsTransactions, persons } = state;

  const ownedVehicles = useMemo(() => vehicles.filter(v => v.status === 'owned'), [vehicles]);
  const activeLoans = useMemo(() => loans, [loans]);

  /* --- top stats --- */
  const totalMonthly = useMemo(() => getTotalMonthlyCosts(costs), [costs]);
  const totalYearly = useMemo(() => getTotalYearlyCosts(costs), [costs]);

  /* --- cost breakdown by category (monthly) --- */
  const categoryData = useMemo(() => {
    const map = getCostsByCategory(costs);
    return Object.entries(map)
      .filter(([, v]) => v > 0)
      .map(([cat, value]) => ({
        name: getCategoryLabel(cat),
        value: Math.round(value * 100) / 100,
        color: getCategoryColor(cat),
      }))
      .sort((a, b) => b.value - a.value);
  }, [costs]);

  /* --- cost split by person (monthly) --- */
  const personData = useMemo(() => {
    const map = getCostsByPerson(costs);
    return Object.entries(map).map(([name, value]) => {
      const person = persons.find(p => p.name === name);
      return { name, value: Math.round(value * 100) / 100, color: person?.color || '#6b7280' };
    }).sort((a, b) => b.value - a.value);
  }, [costs, persons]);

  /* --- monthly cost timeline (next 12 months) --- */
  const timelineData = useMemo(() => {
    const now = new Date();
    const monthlyBase = totalMonthly;
    return Array.from({ length: 12 }, (_, i) => {
      const month = addMonths(now, i);
      // one-time costs that fall in this month could be added here; for now project recurring
      return {
        month: format(month, 'MMM yy'),
        costs: Math.round(monthlyBase * 100) / 100,
      };
    });
  }, [totalMonthly]);

  /* --- vehicle monthly costs map --- */
  const vehicleMonthlyCosts = useMemo(() => {
    const map: Record<string, number> = {};
    for (const c of costs) {
      map[c.vehicleId] = (map[c.vehicleId] || 0) + toMonthly(c.amount, c.frequency);
    }
    return map;
  }, [costs]);

  /* --- recent repairs (last 5) --- */
  const recentRepairs = useMemo(
    () => [...repairs].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5),
    [repairs],
  );

  /* --- helpers to get vehicle name by id --- */
  const vehicleName = (id: string) => vehicles.find(v => v.id === id)?.name || 'Unknown';

  /* ====================================================================== */

  return (
    <div className="space-y-6">
      {/* ---- Top Stats Row ---- */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={<Car size={20} />}
          label="Total Vehicles"
          value={String(ownedVehicles.length)}
          gradient="from-blue-500 to-cyan-400"
        />
        <StatCard
          icon={<CreditCard size={20} />}
          label="Monthly Costs"
          value={formatCurrency(totalMonthly)}
          gradient="from-emerald-500 to-teal-400"
        />
        <StatCard
          icon={<CalendarClock size={20} />}
          label="Yearly Costs"
          value={formatCurrency(totalYearly)}
          gradient="from-amber-500 to-orange-400"
        />
        <StatCard
          icon={<Landmark size={20} />}
          label="Active Loans"
          value={String(activeLoans.length)}
          gradient="from-pink-500 to-rose-400"
        />
      </div>

      {/* ---- Charts Row ---- */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Cost Breakdown by Category */}
        <div className="rounded-2xl border border-dark-700 bg-dark-800 p-5">
          <SectionHeader title="Cost Breakdown" icon={<TrendingUp size={16} />} />
          {categoryData.length === 0 ? (
            <p className="py-10 text-center text-sm text-dark-500">No cost data yet.</p>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={90}
                  paddingAngle={3}
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
          )}
          {/* Legend */}
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs">
            {categoryData.map((d) => (
              <span key={d.name} className="flex items-center gap-1.5">
                <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: d.color }} />
                <span className="text-dark-300">{d.name}</span>
                <span className="font-medium text-dark-100">{formatCurrency(d.value)}</span>
              </span>
            ))}
          </div>
        </div>

        {/* Cost Split by Person */}
        <div className="rounded-2xl border border-dark-700 bg-dark-800 p-5">
          <SectionHeader title="Cost Split by Person" icon={<CreditCard size={16} />} />
          {personData.length === 0 ? (
            <p className="py-10 text-center text-sm text-dark-500">No cost data yet.</p>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={personData} layout="vertical" margin={{ left: 10, right: 20 }}>
                <XAxis type="number" tickFormatter={(v: number) => formatCurrency(v)} tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="name" tick={{ fill: '#d1d5db', fontSize: 12 }} axisLine={false} tickLine={false} width={70} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
                <Bar dataKey="value" name="Monthly" radius={[0, 6, 6, 0]} barSize={28}>
                  {personData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Monthly Cost Timeline */}
        <div className="rounded-2xl border border-dark-700 bg-dark-800 p-5">
          <SectionHeader title="12-Month Projection" icon={<CalendarClock size={16} />} />
          {timelineData.length === 0 ? (
            <p className="py-10 text-center text-sm text-dark-500">No data.</p>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={timelineData} margin={{ top: 5, right: 10, bottom: 0, left: 10 }}>
                <defs>
                  <linearGradient id="costGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="month" tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={(v: number) => `${Math.round(v)}€`} tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} width={50} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="costs" name="Costs" stroke="#3b82f6" fill="url(#costGrad)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* ---- Vehicle Quick Cards ---- */}
      {ownedVehicles.length > 0 && (
        <div>
          <SectionHeader title="Your Vehicles" icon={<Car size={16} />} />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {ownedVehicles.map((v) => {
              const monthly = vehicleMonthlyCosts[v.id] || 0;
              const vehicleLoan = loans.find(l => l.vehicleId === v.id);
              const loanProg = vehicleLoan ? getLoanProgress(vehicleLoan) : null;

              return (
                <button
                  key={v.id}
                  onClick={() => onNavigate('vehicle-detail', v.id)}
                  className="group flex flex-col gap-3 rounded-2xl border border-dark-700 bg-dark-800 p-5 text-left transition hover:border-dark-600 hover:bg-dark-850"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-base font-bold text-white">{v.name}</p>
                      <p className="text-xs text-dark-400">{v.brand} {v.model}</p>
                    </div>
                    <ChevronRight size={18} className="text-dark-500 transition group-hover:text-dark-300" />
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-lg font-semibold text-emerald-400">{formatCurrency(monthly)}</span>
                    <span className="text-xs text-dark-500">/ month</span>
                  </div>
                  {loanProg && (
                    <div>
                      <div className="mb-1 flex justify-between text-[11px] text-dark-400">
                        <span>Loan payoff</span>
                        <span>{Math.round(loanProg.percent)}%</span>
                      </div>
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-dark-700">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-blue-500 to-cyan-400 transition-all"
                          style={{ width: `${Math.min(100, loanProg.percent)}%` }}
                        />
                      </div>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ---- Bottom Grid: Savings / Recent Repairs / Loan Status ---- */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Savings Overview */}
        <div className="rounded-2xl border border-dark-700 bg-dark-800 p-5">
          <SectionHeader title="Savings Goals" icon={<PiggyBank size={16} />} />
          {savingsGoals.length === 0 ? (
            <p className="py-6 text-center text-sm text-dark-500">No savings goals yet.</p>
          ) : (
            <div className="space-y-4">
              {savingsGoals.map((g) => {
                const balance = getSavingsBalance(g, savingsTransactions);
                const progress = getSavingsProgress(g, savingsTransactions);
                return (
                  <div key={g.id}>
                    <div className="mb-1 flex items-center justify-between">
                      <p className="text-sm font-medium text-white">{g.name}</p>
                      <p className="text-xs text-dark-400">
                        {formatCurrency(balance)} / {formatCurrency(g.targetAmount)}
                      </p>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-dark-700">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all"
                        style={{ width: `${Math.min(100, progress)}%` }}
                      />
                    </div>
                    <p className="mt-0.5 text-right text-[11px] text-dark-500">{Math.round(progress)}%</p>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Recent Repairs */}
        <div className="rounded-2xl border border-dark-700 bg-dark-800 p-5">
          <SectionHeader title="Recent Repairs" icon={<Wrench size={16} />} />
          {recentRepairs.length === 0 ? (
            <p className="py-6 text-center text-sm text-dark-500">No repairs logged.</p>
          ) : (
            <ul className="divide-y divide-dark-700">
              {recentRepairs.map((r) => (
                <li key={r.id} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-white">{r.description}</p>
                    <p className="text-xs text-dark-400">{vehicleName(r.vehicleId)} &middot; {formatDate(r.date)}</p>
                  </div>
                  <p className="ml-3 shrink-0 text-sm font-semibold text-orange-400">{formatCurrency(r.cost)}</p>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Loan Status */}
        <div className="rounded-2xl border border-dark-700 bg-dark-800 p-5">
          <SectionHeader title="Loan Status" icon={<Landmark size={16} />} />
          {activeLoans.length === 0 ? (
            <p className="py-6 text-center text-sm text-dark-500">No active loans.</p>
          ) : (
            <div className="space-y-4">
              {activeLoans.map((l) => {
                const prog = getLoanProgress(l);
                return (
                  <div key={l.id}>
                    <div className="mb-1 flex items-center justify-between">
                      <p className="text-sm font-medium text-white">{l.name}</p>
                      <p className="text-xs text-dark-400">
                        {formatCurrency(prog.paid)} / {formatCurrency(l.totalAmount)}
                      </p>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-dark-700">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-pink-500 to-rose-400 transition-all"
                        style={{ width: `${Math.min(100, prog.percent)}%` }}
                      />
                    </div>
                    <div className="mt-0.5 flex justify-between text-[11px] text-dark-500">
                      <span>Remaining: {formatCurrency(prog.remaining)}</span>
                      <span>{Math.round(prog.percent)}%</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
