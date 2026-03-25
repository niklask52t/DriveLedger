import { useState, useMemo } from 'react';
import { BarChart3, ChevronDown, ChevronUp } from 'lucide-react';
import type { PlannedPurchase } from '../../types';
import { formatCurrency, formatNumber, calculateFinancing } from '../../utils';

interface ComparisonTableProps {
  purchases: PlannedPurchase[];
}

export default function ComparisonTable({ purchases }: ComparisonTableProps) {
  const [showComparison, setShowComparison] = useState(false);

  const getFinancing = (p: PlannedPurchase) =>
    calculateFinancing(p.price, p.downPayment, p.financingMonths, p.interestRate);

  const getTotalMonthly = (p: PlannedPurchase) => {
    const fin = getFinancing(p);
    return fin.monthlyPayment + p.estimatedInsurance + p.estimatedFuelMonthly + p.estimatedMaintenance;
  };

  const getTotalYearly = (p: PlannedPurchase) => {
    return getTotalMonthly(p) * 12 + p.estimatedTax;
  };

  const comparisonRows = useMemo(() => {
    if (purchases.length < 2) return [];

    const rows: { label: string; values: number[]; format: (n: number) => string; lowerIsBetter: boolean }[] = [
      { label: 'Price', values: purchases.map((p) => p.price), format: formatCurrency, lowerIsBetter: true },
      { label: 'Monthly Rate', values: purchases.map((p) => getFinancing(p).monthlyPayment), format: formatCurrency, lowerIsBetter: true },
      { label: 'Total Finance Cost', values: purchases.map((p) => getFinancing(p).totalCost), format: formatCurrency, lowerIsBetter: true },
      { label: 'Total Interest', values: purchases.map((p) => getFinancing(p).totalInterest), format: formatCurrency, lowerIsBetter: true },
      { label: 'Insurance / mo', values: purchases.map((p) => p.estimatedInsurance), format: formatCurrency, lowerIsBetter: true },
      { label: 'Tax / year', values: purchases.map((p) => p.estimatedTax), format: formatCurrency, lowerIsBetter: true },
      { label: 'Fuel / mo', values: purchases.map((p) => p.estimatedFuelMonthly), format: formatCurrency, lowerIsBetter: true },
      { label: 'Maintenance / mo', values: purchases.map((p) => p.estimatedMaintenance), format: formatCurrency, lowerIsBetter: true },
      { label: 'Total Monthly Cost', values: purchases.map((p) => getTotalMonthly(p)), format: formatCurrency, lowerIsBetter: true },
      { label: 'Total Yearly Cost', values: purchases.map((p) => getTotalYearly(p)), format: formatCurrency, lowerIsBetter: true },
      { label: 'Mileage', values: purchases.map((p) => p.mileage), format: (n) => `${formatNumber(n)} km`, lowerIsBetter: true },
      { label: 'Horse Power', values: purchases.map((p) => p.horsePower), format: (n) => `${n} HP`, lowerIsBetter: false },
      { label: 'Year', values: purchases.map((p) => p.year), format: (n) => String(n), lowerIsBetter: false },
      { label: 'Rating', values: purchases.map((p) => p.rating), format: (n) => `${n}/5`, lowerIsBetter: false },
    ];

    return rows;
  }, [purchases]);

  const getCellColor = (row: typeof comparisonRows[0], value: number) => {
    const nonZero = row.values.filter((v) => v > 0);
    if (nonZero.length < 2) return '';
    const best = row.lowerIsBetter ? Math.min(...nonZero) : Math.max(...row.values);
    const worst = row.lowerIsBetter ? Math.max(...row.values) : Math.min(...nonZero);
    if (value === best) return 'text-emerald-400 font-semibold';
    if (value === worst && nonZero.length > 1) return 'text-red-400';
    return '';
  };

  if (purchases.length < 2) return null;

  return (
    <div className="bg-dark-800 border border-dark-700 rounded-2xl overflow-hidden">
      <button
        onClick={() => setShowComparison(!showComparison)}
        className="w-full flex items-center justify-between px-6 py-4 hover:bg-dark-750 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary-500/15">
            <BarChart3 size={22} className="text-primary-400" />
          </div>
          <div className="text-left">
            <h3 className="text-lg font-semibold text-dark-50">Side-by-Side Comparison</h3>
            <p className="text-sm text-dark-400">Compare {purchases.length} vehicles across all metrics</p>
          </div>
        </div>
        {showComparison ? <ChevronUp size={20} className="text-dark-400" /> : <ChevronDown size={20} className="text-dark-400" />}
      </button>

      {showComparison && (
        <div className="border-t border-dark-700 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-dark-700">
                <th className="text-left px-4 py-3 text-dark-400 font-medium sticky left-0 bg-dark-800 z-10 min-w-[160px]">
                  Metric
                </th>
                {purchases.map((p) => (
                  <th key={p.id} className="text-center px-4 py-3 text-dark-200 font-semibold min-w-[150px]">
                    <div>{p.brand} {p.model}</div>
                    {p.variant && <div className="text-xs text-dark-500 font-normal">{p.variant}</div>}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {comparisonRows.map((row, ri) => (
                <tr key={row.label} className={ri % 2 === 0 ? 'bg-dark-850/50' : ''}>
                  <td className="px-4 py-2.5 text-dark-300 font-medium sticky left-0 bg-dark-800 z-10">
                    {row.label}
                  </td>
                  {row.values.map((val, ci) => (
                    <td key={ci} className={`px-4 py-2.5 text-center ${getCellColor(row, val)}`}>
                      {row.format(val)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
