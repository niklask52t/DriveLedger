import { useMemo } from 'react';
import { BarChart3 } from 'lucide-react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import type { Cost, Vehicle } from '../../types';
import { formatCurrency, getCategoryLabel, getCategoryColor, getCostsByCategory, toMonthly, toYearly } from '../../utils';

interface VehicleStatsTabProps {
  vehicleCosts: Cost[];
  vehicle: Vehicle;
}

export default function VehicleStatsTab({ vehicleCosts, vehicle }: VehicleStatsTabProps) {
  const totalMonthlyCost = vehicleCosts.reduce((sum, c) => sum + toMonthly(c.amount, c.frequency), 0);
  const totalYearlyCost = vehicleCosts.reduce((sum, c) => sum + toYearly(c.amount, c.frequency), 0);
  const costPerKm = vehicle.annualMileage > 0 ? totalYearlyCost / vehicle.annualMileage : 0;
  const fuelCostMonthly =
    vehicle.annualMileage > 0
      ? (vehicle.avgConsumption / 100) * vehicle.fuelPrice * (vehicle.annualMileage / 12)
      : 0;

  const categoryData = useMemo(() => {
    const byCategory = getCostsByCategory(vehicleCosts);
    return Object.entries(byCategory)
      .map(([cat, amount]) => ({
        name: getCategoryLabel(cat),
        value: Math.round(amount * 100) / 100,
        color: getCategoryColor(cat),
      }))
      .filter((d) => d.value > 0)
      .sort((a, b) => b.value - a.value);
  }, [vehicleCosts]);

  const monthlyBarData = useMemo(() => {
    const data: { name: string; amount: number }[] = [];
    const byCategory = getCostsByCategory(vehicleCosts);
    for (const [cat, amount] of Object.entries(byCategory)) {
      if (amount > 0) {
        data.push({ name: getCategoryLabel(cat), amount: Math.round(amount * 100) / 100 });
      }
    }
    return data.sort((a, b) => b.amount - a.amount);
  }, [vehicleCosts]);

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold text-dark-100">Vehicle Statistics</h2>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-dark-800 border border-dark-700 rounded-xl p-5">
          <p className="text-sm text-dark-400 mb-1">Cost per km</p>
          <p className="text-2xl font-bold text-dark-50">
            {costPerKm > 0 ? `${(costPerKm * 100).toFixed(1)} ct` : '-'}
          </p>
          <p className="text-xs text-dark-500 mt-1">Based on recurring costs</p>
        </div>
        <div className="bg-dark-800 border border-dark-700 rounded-xl p-5">
          <p className="text-sm text-dark-400 mb-1">Est. Fuel Cost / Month</p>
          <p className="text-2xl font-bold text-dark-50">{formatCurrency(fuelCostMonthly)}</p>
          <p className="text-xs text-dark-500 mt-1">
            {vehicle.avgConsumption} L/100km at {formatCurrency(vehicle.fuelPrice)}/L
          </p>
        </div>
        <div className="bg-dark-800 border border-dark-700 rounded-xl p-5">
          <p className="text-sm text-dark-400 mb-1">Total incl. Fuel / Month</p>
          <p className="text-2xl font-bold text-primary-400">{formatCurrency(totalMonthlyCost + fuelCostMonthly)}</p>
          <p className="text-xs text-dark-500 mt-1">All recurring + estimated fuel</p>
        </div>
      </div>

      {vehicleCosts.length === 0 ? (
        <div className="text-center py-12 text-dark-400">
          <BarChart3 size={40} className="mx-auto mb-3 opacity-40" />
          <p>Add costs to see statistics</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Pie Chart */}
          <div className="bg-dark-800 border border-dark-700 rounded-xl p-5">
            <h3 className="text-sm font-semibold text-dark-200 uppercase tracking-wider mb-4">Cost Breakdown (Monthly)</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={90}
                    innerRadius={50}
                    paddingAngle={2}
                    stroke="none"
                  >
                    {categoryData.map((entry, index) => (
                      <Cell key={index} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1e293b',
                      border: '1px solid #334155',
                      borderRadius: '8px',
                      color: '#f1f5f9',
                    }}
                    formatter={(value) => formatCurrency(Number(value))}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            {/* Legend */}
            <div className="flex flex-wrap gap-3 mt-2">
              {categoryData.map((d) => (
                <div key={d.name} className="flex items-center gap-1.5 text-xs text-dark-300">
                  <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: d.color }} />
                  <span>{d.name}</span>
                  <span className="text-dark-500">{formatCurrency(d.value)}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Bar Chart */}
          <div className="bg-dark-800 border border-dark-700 rounded-xl p-5">
            <h3 className="text-sm font-semibold text-dark-200 uppercase tracking-wider mb-4">Monthly Costs by Category</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyBarData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" horizontal={false} />
                  <XAxis type="number" tickFormatter={(v) => `${v}`} stroke="#64748b" fontSize={12} />
                  <YAxis dataKey="name" type="category" width={100} stroke="#64748b" fontSize={12} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1e293b',
                      border: '1px solid #334155',
                      borderRadius: '8px',
                      color: '#f1f5f9',
                    }}
                    formatter={(value) => formatCurrency(Number(value))}
                  />
                  <Bar dataKey="amount" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
