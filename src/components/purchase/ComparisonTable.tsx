import { Star } from 'lucide-react';
import { formatCurrency, formatNumber, getFuelTypeLabel } from '../../utils';
import type { PlannedPurchase } from '../../types';

interface ComparisonTableProps {
  purchases: PlannedPurchase[];
}

interface ComparisonRow {
  label: string;
  values: (string | number | React.ReactNode)[];
  highlight?: 'lowest' | 'highest';
}

export default function ComparisonTable({ purchases }: ComparisonTableProps) {
  if (purchases.length < 2) {
    return (
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 text-center">
        <p className="text-zinc-500 text-sm">Add at least 2 purchases to compare them side by side.</p>
      </div>
    );
  }

  const getMinIdx = (vals: number[]) => {
    let min = Infinity;
    let idx = -1;
    vals.forEach((v, i) => { if (v > 0 && v < min) { min = v; idx = i; } });
    return idx;
  };

  const getMaxIdx = (vals: number[]) => {
    let max = -Infinity;
    let idx = -1;
    vals.forEach((v, i) => { if (v > max) { max = v; idx = i; } });
    return idx;
  };

  const totalMonthlies = purchases.map(
    (p) =>
      p.monthlyRate +
      p.estimatedInsurance +
      p.estimatedTax / 12 +
      p.estimatedFuelMonthly +
      p.estimatedMaintenance
  );

  const prices = purchases.map((p) => p.price);
  const mileages = purchases.map((p) => p.mileage);
  const horsePowers = purchases.map((p) => p.horsePower);
  const ratings = purchases.map((p) => p.rating);

  const bestPriceIdx = getMinIdx(prices);
  const bestMonthlyIdx = getMinIdx(totalMonthlies);
  const bestRatingIdx = getMaxIdx(ratings);

  const rows: ComparisonRow[] = [
    {
      label: 'Price',
      values: purchases.map((p, i) => (
        <span key={i} className={i === bestPriceIdx ? 'text-emerald-400 font-medium' : 'text-zinc-50'}>
          {formatCurrency(p.price)}
        </span>
      )),
    },
    {
      label: 'Year',
      values: purchases.map((p) => (p.year > 0 ? String(p.year) : '-')),
    },
    {
      label: 'Mileage',
      values: purchases.map((p) => (p.mileage > 0 ? `${formatNumber(p.mileage)} km` : '-')),
    },
    {
      label: 'Fuel Type',
      values: purchases.map((p) => (p.fuelType ? getFuelTypeLabel(p.fuelType) : '-')),
    },
    {
      label: 'Horsepower',
      values: purchases.map((p) => (p.horsePower > 0 ? `${p.horsePower} PS` : '-')),
    },
    {
      label: 'Down Payment',
      values: purchases.map((p) => (p.downPayment > 0 ? formatCurrency(p.downPayment) : '-')),
    },
    {
      label: 'Monthly Rate',
      values: purchases.map((p) => (p.monthlyRate > 0 ? formatCurrency(p.monthlyRate) : '-')),
    },
    {
      label: 'Interest Rate',
      values: purchases.map((p) => (p.interestRate > 0 ? `${p.interestRate}%` : '-')),
    },
    {
      label: 'Financing Duration',
      values: purchases.map((p) => (p.financingMonths > 0 ? `${p.financingMonths} mo` : '-')),
    },
    {
      label: 'Insurance/mo',
      values: purchases.map((p) => (p.estimatedInsurance > 0 ? formatCurrency(p.estimatedInsurance) : '-')),
    },
    {
      label: 'Tax/year',
      values: purchases.map((p) => (p.estimatedTax > 0 ? formatCurrency(p.estimatedTax) : '-')),
    },
    {
      label: 'Fuel/mo',
      values: purchases.map((p) => (p.estimatedFuelMonthly > 0 ? formatCurrency(p.estimatedFuelMonthly) : '-')),
    },
    {
      label: 'Maintenance/mo',
      values: purchases.map((p) => (p.estimatedMaintenance > 0 ? formatCurrency(p.estimatedMaintenance) : '-')),
    },
    {
      label: 'Total Monthly',
      values: purchases.map((p, i) => (
        <span key={i} className={i === bestMonthlyIdx ? 'text-emerald-400 font-semibold' : 'text-zinc-50 font-semibold'}>
          {formatCurrency(totalMonthlies[i])}
        </span>
      )),
    },
    {
      label: 'Rating',
      values: purchases.map((p, i) => (
        <div key={i} className="flex items-center gap-0.5">
          {Array.from({ length: 5 }).map((_, j) => (
            <Star
              key={j}
              size={12}
              className={j < p.rating ? 'text-amber-400 fill-amber-400' : 'text-zinc-700'}
            />
          ))}
        </div>
      )),
    },
  ];

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-zinc-800">
              <th className="px-4 py-3.5 text-left text-xs text-zinc-500 uppercase tracking-wider font-medium sticky left-0 bg-zinc-900 z-10 min-w-[140px]">
                Feature
              </th>
              {purchases.map((p) => (
                <th key={p.id} className="px-4 py-3.5 text-left text-xs text-zinc-500 uppercase tracking-wider font-medium min-w-[160px]">
                  <div>
                    <span className="text-zinc-300 normal-case text-sm font-semibold">
                      {p.brand} {p.model}
                    </span>
                    {p.variant && (
                      <span className="block text-zinc-600 normal-case text-xs font-normal mt-0.5">
                        {p.variant}
                      </span>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, ri) => (
              <tr
                key={ri}
                className="border-b border-zinc-800/50 hover:bg-zinc-800/30 transition-colors"
              >
                <td className="px-4 py-3.5 text-sm text-zinc-400 sticky left-0 bg-zinc-900 z-10">
                  {row.label}
                </td>
                {row.values.map((val, vi) => (
                  <td key={vi} className="px-4 py-3.5 text-sm text-zinc-50">
                    {val}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
