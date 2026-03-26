import { useState, useMemo } from 'react';
import { Calculator } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { calculateFinancing, formatCurrency } from '../../utils';

const inputClass =
  'w-full h-10 bg-zinc-950 border border-zinc-800 rounded-lg px-3 text-sm text-zinc-50 placeholder:text-zinc-600 outline-none focus:border-violet-500/50';

const labelClass = 'block text-sm font-medium text-zinc-400 mb-2';

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

export default function FinancingCalculator() {
  const [price, setPrice] = useState(25000);
  const [downPayment, setDownPayment] = useState(5000);
  const [months, setMonths] = useState(48);
  const [rate, setRate] = useState(4.9);

  const result = useMemo(
    () => calculateFinancing(price, downPayment, months, rate),
    [price, downPayment, months, rate]
  );

  const chartData = useMemo(() => {
    const scenarios = [
      { name: '24 mo', ...calculateFinancing(price, downPayment, 24, rate) },
      { name: '36 mo', ...calculateFinancing(price, downPayment, 36, rate) },
      { name: '48 mo', ...calculateFinancing(price, downPayment, 48, rate) },
      { name: '60 mo', ...calculateFinancing(price, downPayment, 60, rate) },
      { name: '72 mo', ...calculateFinancing(price, downPayment, 72, rate) },
    ];
    return scenarios.map((s) => ({
      name: s.name,
      monthly: Math.round(s.monthlyPayment * 100) / 100,
      interest: Math.round(s.totalInterest * 100) / 100,
    }));
  }, [price, downPayment, rate]);

  return (
    <div className="space-y-6">
      {/* Inputs */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <Calculator size={16} className="text-violet-400" />
          <h3 className="text-sm font-semibold text-zinc-300">Financing Calculator</h3>
        </div>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <div>
            <label className={labelClass}>Vehicle Price (EUR)</label>
            <input
              type="number"
              className={inputClass}
              value={price || ''}
              onChange={(e) => setPrice(parseFloat(e.target.value) || 0)}
            />
          </div>
          <div>
            <label className={labelClass}>Down Payment (EUR)</label>
            <input
              type="number"
              className={inputClass}
              value={downPayment || ''}
              onChange={(e) => setDownPayment(parseFloat(e.target.value) || 0)}
            />
          </div>
          <div>
            <label className={labelClass}>Duration (Months)</label>
            <input
              type="number"
              className={inputClass}
              value={months || ''}
              onChange={(e) => setMonths(parseInt(e.target.value) || 0)}
            />
          </div>
          <div>
            <label className={labelClass}>Interest Rate (%)</label>
            <input
              type="number"
              step="0.01"
              className={inputClass}
              value={rate || ''}
              onChange={(e) => setRate(parseFloat(e.target.value) || 0)}
            />
          </div>
        </div>
      </div>

      {/* Results */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
          <p className="text-xs text-zinc-500 uppercase tracking-wider mb-2">Loan Amount</p>
          <p className="text-lg font-semibold text-zinc-50">{formatCurrency(result.loanAmount)}</p>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
          <p className="text-xs text-zinc-500 uppercase tracking-wider mb-2">Monthly Payment</p>
          <p className="text-lg font-semibold text-violet-400">{formatCurrency(result.monthlyPayment)}</p>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
          <p className="text-xs text-zinc-500 uppercase tracking-wider mb-2">Total Interest</p>
          <p className="text-lg font-semibold text-red-400">{formatCurrency(result.totalInterest)}</p>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
          <p className="text-xs text-zinc-500 uppercase tracking-wider mb-2">Total Cost</p>
          <p className="text-lg font-semibold text-zinc-50">{formatCurrency(result.totalCost)}</p>
        </div>
      </div>

      {/* Duration comparison chart */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
        <h3 className="text-sm font-semibold text-zinc-300 mb-4">Duration Comparison</h3>
        <p className="text-xs text-zinc-500 mb-4">
          Compare monthly payments and total interest across different loan durations.
        </p>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
              <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#a1a1aa' }} />
              <YAxis tick={{ fontSize: 11, fill: '#71717a' }} tickFormatter={(v: number) => `${Math.round(v)}`} />
              <Tooltip content={<CustomTooltip />} />
              <Legend
                formatter={(value: string) => <span className="text-xs text-zinc-400">{value}</span>}
                iconSize={8}
              />
              <Bar dataKey="monthly" name="Monthly Payment" fill="#8b5cf6" radius={[4, 4, 0, 0]} barSize={32} />
              <Bar dataKey="interest" name="Total Interest" fill="#f87171" radius={[4, 4, 0, 0]} barSize={32} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Summary table */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-zinc-800">
          <h3 className="text-sm font-semibold text-zinc-300">Detailed Comparison</h3>
        </div>
        <table className="w-full">
          <thead>
            <tr className="border-b border-zinc-800">
              <th className="px-4 py-3.5 text-left text-xs text-zinc-500 uppercase tracking-wider font-medium">Duration</th>
              <th className="px-4 py-3.5 text-right text-xs text-zinc-500 uppercase tracking-wider font-medium">Monthly</th>
              <th className="px-4 py-3.5 text-right text-xs text-zinc-500 uppercase tracking-wider font-medium">Interest</th>
              <th className="px-4 py-3.5 text-right text-xs text-zinc-500 uppercase tracking-wider font-medium">Total Cost</th>
            </tr>
          </thead>
          <tbody>
            {[24, 36, 48, 60, 72].map((m) => {
              const r = calculateFinancing(price, downPayment, m, rate);
              const isSelected = m === months;
              return (
                <tr
                  key={m}
                  className={`border-b border-zinc-800/50 hover:bg-zinc-800/30 transition-colors ${isSelected ? 'bg-violet-500/5' : ''}`}
                >
                  <td className="px-4 py-3.5 text-sm text-zinc-50">
                    {m} months
                    {isSelected && (
                      <span className="ml-2 text-xs text-violet-400">Selected</span>
                    )}
                  </td>
                  <td className="px-4 py-3.5 text-sm text-zinc-50 text-right">{formatCurrency(r.monthlyPayment)}</td>
                  <td className="px-4 py-3.5 text-sm text-red-400 text-right">{formatCurrency(r.totalInterest)}</td>
                  <td className="px-4 py-3.5 text-sm text-zinc-50 text-right">{formatCurrency(r.totalCost)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
