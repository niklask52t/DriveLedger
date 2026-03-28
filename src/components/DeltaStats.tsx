import { useMemo } from 'react';
import { Calendar, Route, DollarSign, TrendingUp } from 'lucide-react';
import { formatCurrency, formatDate } from '../utils';

interface Record {
  date: string;
  mileage: number;
  cost: number;
}

interface Props {
  records: Record[];
}

export default function DeltaStats({ records }: Props) {
  const stats = useMemo(() => {
    if (records.length < 2) return null;

    const sorted = [...records].sort((a, b) => a.date.localeCompare(b.date));
    const first = sorted[0];
    const last = sorted[sorted.length - 1];

    const dateRange = `${formatDate(first.date)} - ${formatDate(last.date)}`;
    const mileageDelta = last.mileage - first.mileage;
    const totalCost = records.reduce((sum, r) => sum + r.cost, 0);
    const avgCostPerKm = mileageDelta > 0 ? totalCost / mileageDelta : 0;

    return { dateRange, mileageDelta, totalCost, avgCostPerKm };
  }, [records]);

  if (!stats) return null;

  return (
    <div className="bg-violet-500/5 border border-violet-500/20 rounded-lg px-4 py-3 mb-4 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
      <span className="text-xs font-medium text-violet-400 uppercase tracking-wider mr-2">
        Selection ({records.length} records)
      </span>
      <span className="flex items-center gap-1.5 text-zinc-300">
        <Calendar size={13} className="text-violet-400" />
        {stats.dateRange}
      </span>
      <span className="flex items-center gap-1.5 text-zinc-300">
        <Route size={13} className="text-violet-400" />
        {stats.mileageDelta.toLocaleString()} km delta
      </span>
      <span className="flex items-center gap-1.5 text-zinc-300">
        <DollarSign size={13} className="text-violet-400" />
        {formatCurrency(stats.totalCost)} total
      </span>
      {stats.avgCostPerKm > 0 && (
        <span className="flex items-center gap-1.5 text-zinc-300">
          <TrendingUp size={13} className="text-violet-400" />
          {formatCurrency(stats.avgCostPerKm)}/km avg
        </span>
      )}
    </div>
  );
}
