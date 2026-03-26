import { useMemo } from 'react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { formatCurrency, getCostsByCategory, getCategoryLabel, getCategoryColor, toMonthly, toYearly, getTotalMonthlyCosts, getTotalYearlyCosts } from '../../utils';
import type { Cost, Vehicle } from '../../types';

interface VehicleStatsTabProps {
  vehicleCosts: Cost[];
  vehicle: Vehicle;
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

export default function VehicleStatsTab({ vehicleCosts, vehicle }: VehicleStatsTabProps) {
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

  if (vehicleCosts.length === 0) {
    return (
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 text-center">
        <p className="text-zinc-500 text-sm">No cost data to analyze yet. Add costs to see statistics.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
          <p className="text-xs text-zinc-500 uppercase tracking-wider mb-2">Monthly Total</p>
          <p className="text-lg font-semibold text-zinc-50">{formatCurrency(totalMonthly)}</p>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
          <p className="text-xs text-zinc-500 uppercase tracking-wider mb-2">Yearly Total</p>
          <p className="text-lg font-semibold text-zinc-50">{formatCurrency(totalYearly)}</p>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
          <p className="text-xs text-zinc-500 uppercase tracking-wider mb-2">Est. Fuel/Month</p>
          <p className="text-lg font-semibold text-zinc-50">
            {estimatedFuelMonthly > 0 ? formatCurrency(estimatedFuelMonthly) : '-'}
          </p>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
          <p className="text-xs text-zinc-500 uppercase tracking-wider mb-2">Cost Entries</p>
          <p className="text-lg font-semibold text-zinc-50">{vehicleCosts.length}</p>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pie Chart */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
          <h3 className="text-sm font-semibold text-zinc-300 mb-4">Cost Distribution</h3>
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
          <h3 className="text-sm font-semibold text-zinc-300 mb-4">Monthly vs. Yearly</h3>
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

      {/* Category Breakdown Table */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-zinc-800">
          <h3 className="text-sm font-semibold text-zinc-300">Category Breakdown</h3>
        </div>
        <table className="w-full">
          <thead>
            <tr className="border-b border-zinc-800">
              <th className="px-4 py-3.5 text-left text-xs text-zinc-500 uppercase tracking-wider font-medium">Category</th>
              <th className="px-4 py-3.5 text-right text-xs text-zinc-500 uppercase tracking-wider font-medium">Monthly</th>
              <th className="px-4 py-3.5 text-right text-xs text-zinc-500 uppercase tracking-wider font-medium">Yearly</th>
              <th className="px-4 py-3.5 text-right text-xs text-zinc-500 uppercase tracking-wider font-medium">Share</th>
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
    </div>
  );
}
