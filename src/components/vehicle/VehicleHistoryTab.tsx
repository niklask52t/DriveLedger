import { useState, useEffect, useMemo } from 'react';
import { Clock, Filter } from 'lucide-react';
import { api } from '../../api';
import { formatDate, formatCurrency, formatNumber } from '../../utils';
import { useI18n } from '../../contexts/I18nContext';
import { useUnits } from '../../hooks/useUnits';
import type { VehicleHistoryRecord } from '../../types';

interface Props {
  vehicleId: string;
}

const recordTypeConfig: Record<string, { label: string; colorClass: string; bgClass: string }> = {
  service:    { label: 'Service',    colorClass: 'text-blue-400',   bgClass: 'bg-blue-400/10 text-blue-400 border-blue-400/20' },
  repair:     { label: 'Repair',     colorClass: 'text-red-400',    bgClass: 'bg-red-400/10 text-red-400 border-red-400/20' },
  upgrade:    { label: 'Upgrade',    colorClass: 'text-purple-400', bgClass: 'bg-purple-400/10 text-purple-400 border-purple-400/20' },
  fuel:       { label: 'Fuel',       colorClass: 'text-emerald-400',bgClass: 'bg-emerald-400/10 text-emerald-400 border-emerald-400/20' },
  tax:        { label: 'Tax',        colorClass: 'text-amber-400',  bgClass: 'bg-amber-400/10 text-amber-400 border-amber-400/20' },
  inspection: { label: 'Inspection', colorClass: 'text-cyan-400',   bgClass: 'bg-cyan-400/10 text-cyan-400 border-cyan-400/20' },
  odometer:   { label: 'Odometer',   colorClass: 'text-zinc-400',   bgClass: 'bg-zinc-700/50 text-zinc-400 border-zinc-600/20' },
};

const dotColorMap: Record<string, string> = {
  service: 'bg-blue-400',
  repair: 'bg-red-400',
  upgrade: 'bg-purple-400',
  fuel: 'bg-emerald-400',
  tax: 'bg-amber-400',
  inspection: 'bg-cyan-400',
  odometer: 'bg-zinc-500',
};

export default function VehicleHistoryTab({ vehicleId }: Props) {
  const { t } = useI18n();
  const { distanceUnit } = useUnits();
  const [records, setRecords] = useState<VehicleHistoryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState<string>('');

  useEffect(() => {
    loadHistory();
  }, [vehicleId, selectedYear]);

  const loadHistory = async () => {
    try {
      setLoading(true);
      const data = await api.getVehicleHistory(vehicleId, selectedYear || undefined);
      setRecords(data);
    } catch (e) {
      console.error('Failed to load vehicle history', e);
    } finally {
      setLoading(false);
    }
  };

  // Extract available years from records for the filter
  const availableYears = useMemo(() => {
    const years = new Set<string>();
    records.forEach((r) => {
      if (r.date) {
        const year = r.date.substring(0, 4);
        if (year && year.length === 4) years.add(year);
      }
    });
    return Array.from(years).sort((a, b) => b.localeCompare(a));
  }, [records]);

  // Group records by month
  const groupedByMonth = useMemo(() => {
    const groups: Record<string, VehicleHistoryRecord[]> = {};
    records.forEach((r) => {
      const monthKey = r.date ? r.date.substring(0, 7) : 'unknown';
      if (!groups[monthKey]) groups[monthKey] = [];
      groups[monthKey].push(r);
    });
    return Object.entries(groups).sort(([a], [b]) => b.localeCompare(a));
  }, [records]);

  const formatMonthLabel = (key: string) => {
    if (key === 'unknown') return t('common.unknown') || 'Unknown';
    const [year, month] = key.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1);
    return date.toLocaleDateString(undefined, { year: 'numeric', month: 'long' });
  };

  const totalCost = useMemo(() => records.reduce((sum, r) => sum + (r.cost || 0), 0), [records]);

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <p className="text-sm text-zinc-400">
            {records.length} {t('vehicle_tab.history.records') || 'records'}
            {totalCost > 0 && (
              <span className="ml-2 text-zinc-500">
                ({t('common.total') || 'Total'}: {formatCurrency(totalCost)})
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Filter size={14} className="text-zinc-500" />
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
            className="h-9 bg-zinc-950 border border-zinc-800 rounded-lg px-3 text-sm text-zinc-50 outline-none focus:border-violet-500/50"
          >
            <option value="">{t('vehicle_tab.history.all_years') || 'All Years'}</option>
            {availableYears.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 text-center">
          <p className="text-zinc-500 text-sm">{t('common.loading') || 'Loading...'}</p>
        </div>
      ) : records.length === 0 ? (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 text-center">
          <p className="text-zinc-500 text-sm">{t('vehicle_tab.history.no_records') || 'No records found'}</p>
        </div>
      ) : (
        <div className="space-y-8">
          {groupedByMonth.map(([monthKey, monthRecords]) => (
            <div key={monthKey}>
              {/* Month header */}
              <div className="flex items-center gap-3 mb-4">
                <Clock size={14} className="text-zinc-500" />
                <h3 className="text-sm font-semibold text-zinc-300">{formatMonthLabel(monthKey)}</h3>
                <span className="text-xs text-zinc-600">
                  ({monthRecords.length} {monthRecords.length === 1 ? 'record' : 'records'})
                </span>
              </div>

              {/* Timeline */}
              <div className="relative ml-2">
                {/* Vertical line */}
                <div className="absolute left-[7px] top-0 bottom-0 w-px bg-zinc-800" />

                <div className="space-y-1">
                  {monthRecords.map((record) => {
                    const config = recordTypeConfig[record.recordType] || recordTypeConfig.odometer;
                    const dotColor = dotColorMap[record.recordType] || 'bg-zinc-500';

                    return (
                      <div key={`${record.recordType}-${record.id}`} className="relative flex items-start gap-4 pl-6 py-2 group">
                        {/* Timeline dot */}
                        <div className={`absolute left-[3px] top-[14px] w-[9px] h-[9px] rounded-full ${dotColor} ring-2 ring-zinc-900`} />

                        {/* Content */}
                        <div className="flex-1 bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-3 group-hover:border-zinc-700 transition-colors">
                          <div className="flex items-center justify-between gap-4">
                            <div className="flex items-center gap-3 min-w-0">
                              <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium shrink-0 ${config.bgClass}`}>
                                {config.label}
                              </span>
                              <span className="text-sm text-zinc-50 truncate" title={record.description || '-'}>
                                {record.description || '-'}
                              </span>
                            </div>
                            <div className="flex items-center gap-4 shrink-0">
                              {record.mileage > 0 && (
                                <span className="text-xs text-zinc-500">
                                  {formatNumber(record.mileage)} {distanceUnit}
                                </span>
                              )}
                              {record.cost > 0 && (
                                <span className="text-sm font-medium text-zinc-50">
                                  {formatCurrency(record.cost)}
                                </span>
                              )}
                              <span className="text-xs text-zinc-500 w-[80px] text-right">
                                {formatDate(record.date)}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
