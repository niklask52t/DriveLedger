import { useMemo, useState, useEffect } from 'react';
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, LineChart, Line,
} from 'recharts';
import { formatCurrency, getCostsByCategory, getCategoryLabel, getCategoryColor, toMonthly, toYearly, getTotalMonthlyCosts, getTotalYearlyCosts } from '../../utils';
import { useI18n } from '../../contexts/I18nContext';
import { useUnits } from '../../hooks/useUnits';
import { api } from '../../api';
import type { AppState, Cost, Vehicle } from '../../types';

interface VehicleStatsTabProps {
  vehicleCosts?: Cost[];
  vehicle?: Vehicle;
  state?: AppState;
  vehicleId?: string;
}

interface MonthlyData {
  costByMonth: {
    services: { month: string; total: number }[];
    repairs: { month: string; total: number }[];
    upgrades: { month: string; total: number }[];
    fuel: { month: string; total: number; liters: number }[];
    taxes: { month: string; total: number }[];
  };
  distanceByMonth: { month: string; distance: number }[];
  fuelEconomyByMonth: { month: string; lPer100km: number }[];
}

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ name: string; value: number; color: string }>; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-xs shadow-lg">
      {label && <p className="text-zinc-300 mb-1">{label}</p>}
      {payload.map((entry, i) => (
        <p key={i} style={{ color: entry.color }} className="font-medium">
          {entry.name}: {formatCurrency(entry.value)}
        </p>
      ))}
    </div>
  );
}

function MonthlyTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ name: string; value: number; color: string }>; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-xs shadow-lg">
      {label && <p className="text-zinc-300 mb-1">{label}</p>}
      {payload.map((entry, i) => (
        <p key={i} style={{ color: entry.color }} className="font-medium">
          {entry.name}: {typeof entry.value === 'number' ? entry.value.toFixed(2) : entry.value}
        </p>
      ))}
    </div>
  );
}

export default function VehicleStatsTab(props: VehicleStatsTabProps) {
  const { t } = useI18n();
  const [monthlyData, setMonthlyData] = useState<MonthlyData | null>(null);
  const [yearFilter, setYearFilter] = useState<string>('all');

  // Support both direct props and state+vehicleId pattern
  const vehicle = props.vehicle || (props.state && props.vehicleId ? props.state.vehicles.find(v => v.id === props.vehicleId) : undefined);
  const vehicleCosts = props.vehicleCosts || (props.state && props.vehicleId ? props.state.costs.filter(c => c.vehicleId === props.vehicleId) : []);

  const { fmtDistance, distanceUnit } = useUnits({ useHours: !!vehicle?.useHours });

  // Gather all record costs from state for cost-per-distance
  const allRecordCosts = useMemo(() => {
    if (!props.state || !props.vehicleId) return null;
    const s = props.state;
    const vid = props.vehicleId;
    const services = s.serviceRecords.filter(r => r.vehicleId === vid);
    const repairs = s.repairs.filter(r => r.vehicleId === vid);
    const upgrades = s.upgradeRecords.filter(r => r.vehicleId === vid);
    const fuel = s.fuelRecords.filter(r => r.vehicleId === vid);
    const taxes = s.taxRecords.filter(r => r.vehicleId === vid);

    const serviceCost = services.reduce((s, r) => s + (r.cost || 0), 0);
    const repairCost = repairs.reduce((s, r) => s + (r.cost || 0), 0);
    const upgradeCost = upgrades.reduce((s, r) => s + (r.cost || 0), 0);
    const fuelCost = fuel.reduce((s, r) => s + (r.fuelCost || 0), 0);
    const taxCost = taxes.reduce((s, r) => s + (r.cost || 0), 0);
    const totalCost = serviceCost + repairCost + upgradeCost + fuelCost + taxCost;

    return { serviceCost, repairCost, upgradeCost, fuelCost, taxCost, totalCost };
  }, [props.state, props.vehicleId]);

  useEffect(() => {
    api.getMonthlyReport(vehicle.id).then((data) => {
      setMonthlyData(data as MonthlyData);
    }).catch(() => {});
  }, [vehicle.id]);

  const categoryData = useMemo(() => {
    const byCategory = getCostsByCategory(vehicleCosts);
    return Object.entries(byCategory)
      .map(([cat, monthly]) => ({
        name: getCategoryLabel(cat),
        value: monthly,
        color: getCategoryColor(cat),
      }))
      .filter((d) => d.value > 0)
      .sort((a, b) => b.value - a.value);
  }, [vehicleCosts]);

  const barData = useMemo(() => {
    const byCategory = getCostsByCategory(vehicleCosts);
    return Object.entries(byCategory)
      .map(([cat, monthly]) => ({
        name: getCategoryLabel(cat),
        monthly,
        yearly: monthly * 12,
        color: getCategoryColor(cat),
      }))
      .filter((d) => d.monthly > 0)
      .sort((a, b) => b.monthly - a.monthly);
  }, [vehicleCosts]);

  const totalMonthly = getTotalMonthlyCosts(vehicleCosts);
  const totalYearly = getTotalYearlyCosts(vehicleCosts);

  // Fuel cost estimate
  const estimatedFuelMonthly = vehicle.annualMileage > 0 && vehicle.avgConsumption > 0 && vehicle.fuelPrice > 0
    ? (vehicle.annualMileage / 12 / 100) * vehicle.avgConsumption * vehicle.fuelPrice
    : 0;

  // Collect all months from monthly data
  const allMonths = useMemo(() => {
    if (!monthlyData) return [];
    const months = new Set<string>();
    const { costByMonth } = monthlyData;
    for (const arr of [costByMonth.services, costByMonth.repairs, costByMonth.upgrades, costByMonth.fuel, costByMonth.taxes]) {
      for (const r of arr) months.add(r.month);
    }
    for (const r of monthlyData.distanceByMonth) months.add(r.month);
    for (const r of monthlyData.fuelEconomyByMonth) months.add(r.month);
    return [...months].sort();
  }, [monthlyData]);

  // Available years for filter
  const availableYears = useMemo(() => {
    const years = new Set<string>();
    for (const m of allMonths) {
      years.add(m.substring(0, 4));
    }
    return [...years].sort();
  }, [allMonths]);

  // Stacked cost chart data
  const stackedCostData = useMemo(() => {
    if (!monthlyData) return [];
    const { costByMonth } = monthlyData;
    const monthMap = new Map<string, Record<string, number>>();

    const addToMap = (arr: { month: string; total: number }[], key: string) => {
      for (const r of arr) {
        if (yearFilter !== 'all' && !r.month.startsWith(yearFilter)) continue;
        if (!monthMap.has(r.month)) monthMap.set(r.month, {});
        monthMap.get(r.month)![key] = Number(r.total) || 0;
      }
    };

    addToMap(costByMonth.services, 'Services');
    addToMap(costByMonth.repairs, 'Repairs');
    addToMap(costByMonth.upgrades, 'Upgrades');
    addToMap(costByMonth.fuel, 'Fuel');
    addToMap(costByMonth.taxes, 'Taxes');

    const filteredMonths = allMonths.filter(m => yearFilter === 'all' || m.startsWith(yearFilter));
    return filteredMonths.map(m => ({
      month: m,
      Services: monthMap.get(m)?.Services || 0,
      Repairs: monthMap.get(m)?.Repairs || 0,
      Upgrades: monthMap.get(m)?.Upgrades || 0,
      Fuel: monthMap.get(m)?.Fuel || 0,
      Taxes: monthMap.get(m)?.Taxes || 0,
    }));
  }, [monthlyData, allMonths, yearFilter]);

  // Fuel economy chart data
  const fuelEconomyData = useMemo(() => {
    if (!monthlyData) return [];
    return monthlyData.fuelEconomyByMonth
      .filter(r => yearFilter === 'all' || r.month.startsWith(yearFilter))
      .map(r => ({
        month: r.month,
        'L/100km': Math.round(r.lPer100km * 100) / 100,
      }));
  }, [monthlyData, yearFilter]);

  // Distance chart data
  const distanceData = useMemo(() => {
    if (!monthlyData) return [];
    return monthlyData.distanceByMonth
      .filter(r => yearFilter === 'all' || r.month.startsWith(yearFilter))
      .map(r => ({
        month: r.month,
        distance: Number(r.distance) || 0,
      }));
  }, [monthlyData, yearFilter]);

  const COST_COLORS: Record<string, string> = {
    Services: '#8b5cf6',
    Repairs: '#ef4444',
    Upgrades: '#38bdf8',
    Fuel: '#f59e0b',
    Taxes: '#10b981',
  };

  if (vehicleCosts.length === 0 && !monthlyData) {
    return (
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 text-center">
        <p className="text-zinc-500 text-sm">{t('vehicle_tab.stats.no_data')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
          <p className="text-xs text-zinc-500 uppercase tracking-wider mb-2">{t('vehicle_tab.stats.monthly_total')}</p>
          <p className="text-lg font-semibold text-zinc-50">{formatCurrency(totalMonthly)}</p>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
          <p className="text-xs text-zinc-500 uppercase tracking-wider mb-2">{t('vehicle_tab.stats.yearly_total')}</p>
          <p className="text-lg font-semibold text-zinc-50">{formatCurrency(totalYearly)}</p>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
          <p className="text-xs text-zinc-500 uppercase tracking-wider mb-2">{t('vehicle_tab.stats.est_fuel_month')}</p>
          <p className="text-lg font-semibold text-zinc-50">
            {estimatedFuelMonthly > 0 ? formatCurrency(estimatedFuelMonthly) : '-'}
          </p>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
          <p className="text-xs text-zinc-500 uppercase tracking-wider mb-2">{t('vehicle_tab.stats.cost_entries')}</p>
          <p className="text-lg font-semibold text-zinc-50">{vehicleCosts.length}</p>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pie Chart */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
          <h3 className="text-sm font-semibold text-zinc-300 mb-4">{t('vehicle_tab.stats.cost_distribution')}</h3>
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {categoryData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} stroke="transparent" />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend
                  formatter={(value: string) => <span className="text-xs text-zinc-400">{value}</span>}
                  iconSize={8}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Bar Chart */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
          <h3 className="text-sm font-semibold text-zinc-300 mb-4">{t('vehicle_tab.stats.monthly_vs_yearly')}</h3>
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData} layout="vertical" margin={{ left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11, fill: '#71717a' }} tickFormatter={(v: number) => `${v.toFixed(0)}`} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: '#a1a1aa' }} width={100} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="monthly" name="Monthly" fill="#8b5cf6" radius={[0, 4, 4, 0]} barSize={14} />
                <Bar dataKey="yearly" name="Yearly" fill="#a78bfa" radius={[0, 4, 4, 0]} barSize={14} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Monthly Charts Section */}
      {monthlyData && (stackedCostData.length > 0 || fuelEconomyData.length > 0 || distanceData.length > 0) && (
        <>
          {/* Year Filter */}
          <div className="flex items-center gap-3">
            <h3 className="text-sm font-semibold text-zinc-300">Monthly Trends</h3>
            <select
              value={yearFilter}
              onChange={(e) => setYearFilter(e.target.value)}
              className="h-9 bg-zinc-900 border border-zinc-800 rounded-lg px-3 text-sm text-zinc-50 outline-none focus:border-violet-500/50"
            >
              <option value="all">All Years</option>
              {availableYears.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 gap-6">
            {/* Total Cost by Month - Stacked Bar */}
            {stackedCostData.length > 0 && (
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
                <h3 className="text-sm font-semibold text-zinc-300 mb-4">Total Cost by Month</h3>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={stackedCostData} margin={{ left: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                      <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#71717a' }} />
                      <YAxis tick={{ fontSize: 11, fill: '#71717a' }} tickFormatter={(v: number) => `${v.toFixed(0)}`} />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend
                        formatter={(value: string) => <span className="text-xs text-zinc-400">{value}</span>}
                        iconSize={8}
                      />
                      {Object.entries(COST_COLORS).map(([key, color]) => (
                        <Bar key={key} dataKey={key} stackId="costs" fill={color} />
                      ))}
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Fuel Economy by Month - Line Chart */}
              {fuelEconomyData.length > 0 && (
                <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
                  <h3 className="text-sm font-semibold text-zinc-300 mb-4">Fuel Economy by Month</h3>
                  <div className="h-[250px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={fuelEconomyData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                        <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#71717a' }} />
                        <YAxis tick={{ fontSize: 11, fill: '#71717a' }} />
                        <Tooltip content={<MonthlyTooltip />} />
                        <Line type="monotone" dataKey="L/100km" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3, fill: '#f59e0b' }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              {/* Distance by Month - Bar Chart */}
              {distanceData.length > 0 && (
                <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
                  <h3 className="text-sm font-semibold text-zinc-300 mb-4">Distance by Month (km)</h3>
                  <div className="h-[250px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={distanceData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                        <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#71717a' }} />
                        <YAxis tick={{ fontSize: 11, fill: '#71717a' }} />
                        <Tooltip content={<MonthlyTooltip />} />
                        <Bar dataKey="distance" name="Distance" fill="#38bdf8" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* Category Breakdown Table */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-zinc-800">
          <h3 className="text-sm font-semibold text-zinc-300">{t('vehicle_tab.stats.category_breakdown')}</h3>
        </div>
        <table className="w-full">
          <thead>
            <tr className="border-b border-zinc-800">
              <th className="px-4 py-3.5 text-left text-xs text-zinc-500 uppercase tracking-wider font-medium">{t('common.category')}</th>
              <th className="px-4 py-3.5 text-right text-xs text-zinc-500 uppercase tracking-wider font-medium">{t('common.monthly')}</th>
              <th className="px-4 py-3.5 text-right text-xs text-zinc-500 uppercase tracking-wider font-medium">{t('common.yearly')}</th>
              <th className="px-4 py-3.5 text-right text-xs text-zinc-500 uppercase tracking-wider font-medium">{t('vehicle_tab.stats.share')}</th>
            </tr>
          </thead>
          <tbody>
            {categoryData.map((cat) => {
              const share = totalMonthly > 0 ? (cat.value / totalMonthly) * 100 : 0;
              return (
                <tr key={cat.name} className="border-b border-zinc-800/50 hover:bg-zinc-800/30 transition-colors">
                  <td className="px-4 py-3.5 text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: cat.color }} />
                      <span className="text-zinc-50">{cat.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3.5 text-sm text-zinc-50 text-right">{formatCurrency(cat.value)}</td>
                  <td className="px-4 py-3.5 text-sm text-zinc-400 text-right">{formatCurrency(cat.value * 12)}</td>
                  <td className="px-4 py-3.5 text-sm text-zinc-400 text-right">{share.toFixed(1)}%</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Cost per Distance Section */}
      {vehicle && vehicle.currentMileage > 0 && allRecordCosts && allRecordCosts.totalCost > 0 && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-zinc-800">
            <h3 className="text-sm font-semibold text-zinc-300">Cost per {distanceUnit === 'mi' ? 'Mile' : distanceUnit === 'h' ? 'Hour' : 'Kilometer'}</h3>
          </div>
          <div className="p-6">
            {/* Overall */}
            <div className="flex items-center justify-between mb-4 pb-4 border-b border-zinc-800">
              <span className="text-sm font-medium text-zinc-50">Total</span>
              <div className="text-right">
                <span className="text-lg font-bold text-violet-400">
                  {formatCurrency(allRecordCosts.totalCost / vehicle.currentMileage)}/{distanceUnit}
                </span>
                <p className="text-xs text-zinc-500">
                  {formatCurrency(allRecordCosts.totalCost)} / {fmtDistance(vehicle.currentMileage)}
                </p>
              </div>
            </div>
            {/* Breakdown by category */}
            <div className="space-y-3">
              {([
                { label: 'Services', cost: allRecordCosts.serviceCost, color: '#8b5cf6' },
                { label: 'Repairs', cost: allRecordCosts.repairCost, color: '#ef4444' },
                { label: 'Upgrades', cost: allRecordCosts.upgradeCost, color: '#38bdf8' },
                { label: 'Fuel', cost: allRecordCosts.fuelCost, color: '#f59e0b' },
                { label: 'Taxes', cost: allRecordCosts.taxCost, color: '#10b981' },
              ] as const).filter(c => c.cost > 0).map(({ label, cost, color }) => (
                <div key={label} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
                    <span className="text-sm text-zinc-300">{label}</span>
                  </div>
                  <span className="text-sm text-zinc-50">
                    {formatCurrency(cost / vehicle.currentMileage)}/{distanceUnit}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
