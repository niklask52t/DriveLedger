import { useState, useMemo } from 'react';
import { Calculator } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import { formatCurrency, calculateFinancing } from '../../utils';

const inputClass =
  'w-full bg-dark-900 border border-dark-600 rounded-lg px-3 py-2 text-dark-100 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none transition-colors';

const labelClass = 'block text-sm font-medium text-dark-300 mb-1';

export default function FinancingCalculator() {
  const [calcPrice, setCalcPrice] = useState(25000);
  const [calcDown, setCalcDown] = useState(5000);
  const [calcMonths, setCalcMonths] = useState(48);
  const [calcRate, setCalcRate] = useState(3.9);

  const calcResult = useMemo(
    () => calculateFinancing(calcPrice, calcDown, calcMonths, calcRate),
    [calcPrice, calcDown, calcMonths, calcRate]
  );

  const amortizationData = useMemo(() => {
    const loanAmount = calcPrice - calcDown;
    if (loanAmount <= 0 || calcMonths <= 0) return [];
    const r = calcRate / 100 / 12;
    let remaining = loanAmount;
    const data = [];
    for (let m = 1; m <= calcMonths; m++) {
      const interest = remaining * r;
      const principal = calcResult.monthlyPayment - interest;
      remaining = Math.max(0, remaining - principal);
      if (m % Math.max(1, Math.floor(calcMonths / 24)) === 0 || m === 1 || m === calcMonths) {
        data.push({
          month: m,
          remaining: Math.round(remaining),
          paid: Math.round(loanAmount - remaining),
          interest: Math.round(interest),
        });
      }
    }
    return data;
  }, [calcPrice, calcDown, calcMonths, calcRate, calcResult.monthlyPayment]);

  return (
    <div className="bg-dark-800 border border-dark-700 rounded-2xl p-6 space-y-6">
      <div className="flex items-center gap-3 mb-2">
        <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-amber-500/15">
          <Calculator size={22} className="text-amber-400" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-dark-50">Financing Calculator</h3>
          <p className="text-sm text-dark-400">Explore different financing scenarios</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Price */}
        <div>
          <label className={labelClass}>Vehicle Price</label>
          <input
            type="number"
            className={inputClass}
            value={calcPrice || ''}
            onChange={(e) => setCalcPrice(Number(e.target.value))}
          />
        </div>
        {/* Down Payment */}
        <div>
          <label className={labelClass}>Down Payment</label>
          <input
            type="number"
            className={inputClass}
            value={calcDown || ''}
            onChange={(e) => setCalcDown(Number(e.target.value))}
          />
        </div>
        {/* Duration slider */}
        <div>
          <label className={labelClass}>Duration: {calcMonths} months</label>
          <input
            type="range"
            min={6}
            max={120}
            step={6}
            value={calcMonths}
            onChange={(e) => setCalcMonths(Number(e.target.value))}
            className="w-full accent-primary-500 mt-2"
          />
          <div className="flex justify-between text-xs text-dark-500 mt-1">
            <span>6 mo</span>
            <span>120 mo</span>
          </div>
        </div>
        {/* Interest slider */}
        <div>
          <label className={labelClass}>Interest Rate: {calcRate.toFixed(1)}%</label>
          <input
            type="range"
            min={0}
            max={15}
            step={0.1}
            value={calcRate}
            onChange={(e) => setCalcRate(Number(e.target.value))}
            className="w-full accent-primary-500 mt-2"
          />
          <div className="flex justify-between text-xs text-dark-500 mt-1">
            <span>0%</span>
            <span>15%</span>
          </div>
        </div>
      </div>

      {/* Results */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-dark-850 rounded-xl p-4 border border-dark-700">
          <p className="text-sm text-dark-400">Monthly Payment</p>
          <p className="text-2xl font-bold text-primary-400 mt-1">{formatCurrency(calcResult.monthlyPayment)}</p>
        </div>
        <div className="bg-dark-850 rounded-xl p-4 border border-dark-700">
          <p className="text-sm text-dark-400">Total Interest</p>
          <p className="text-2xl font-bold text-amber-400 mt-1">{formatCurrency(calcResult.totalInterest)}</p>
        </div>
        <div className="bg-dark-850 rounded-xl p-4 border border-dark-700">
          <p className="text-sm text-dark-400">Total Cost</p>
          <p className="text-2xl font-bold text-dark-100 mt-1">{formatCurrency(calcResult.totalCost)}</p>
        </div>
      </div>

      {/* Amortization Chart */}
      {amortizationData.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-dark-300 mb-3">Amortization Schedule</h4>
          <div className="h-64 bg-dark-850 rounded-xl p-4 border border-dark-700">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={amortizationData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="month" stroke="#64748b" fontSize={12} label={{ value: 'Month', position: 'insideBottom', offset: -5, fill: '#64748b' }} />
                <YAxis stroke="#64748b" fontSize={12} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
                  labelStyle={{ color: '#94a3b8' }}
                  formatter={(value, name) => [formatCurrency(Number(value)), String(name) === 'remaining' ? 'Remaining' : 'Paid Off']}
                  labelFormatter={(label) => `Month ${String(label)}`}
                />
                <Bar dataKey="paid" stackId="a" fill="#22c55e" radius={[0, 0, 0, 0]} name="Paid Off" />
                <Bar dataKey="remaining" stackId="a" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Remaining" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}
