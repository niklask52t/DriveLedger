import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Plus, Pencil, Trash2, ArrowUpDown, Fuel as FuelIcon, Printer } from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend,
} from 'recharts';
import Modal from '../components/Modal';
import TagInput from '../components/TagInput';
import TagFilter from '../components/TagFilter';
import BulkActions from '../components/BulkActions';
import ExtraFields from '../components/ExtraFields';
import { useExtraFields } from '../hooks/useExtraFields';
import ColumnSettings, { useColumnPreferences } from '../components/ColumnSettings';
import { cn } from '../lib/utils';
import { formatCurrency, formatDate, formatNumber } from '../utils';
import { parseISO, format } from 'date-fns';
import { api } from '../api';
import { useUnits } from '../hooks/useUnits';
import { useI18n } from '../contexts/I18nContext';
import { useUserConfig } from '../contexts/UserConfigContext';
import type { AppState, FuelRecord } from '../types';

interface Props {
  state: AppState;
  setState: (s: AppState) => void;
}

const emptyForm = {
  vehicleId: '',
  date: '',
  mileage: 0,
  fuelAmount: 0,
  fuelCost: 0,
  isPartialFill: false,
  isMissedEntry: false,
  fuelType: '',
  station: '',
  notes: '',
  tags: [] as string[],
  costInputMode: 'total' as 'total' | 'perUnit',
  pricePerUnit: 0,
};

type SortKey = 'date' | 'mileage' | 'fuelAmount' | 'fuelCost' | 'station';

const fuelColumns = [
  { key: 'vehicle', label: 'Vehicle' },
  { key: 'date', label: 'Date' },
  { key: 'mileage', label: 'Mileage' },
  { key: 'fuelAmount', label: 'Liters' },
  { key: 'fuelCost', label: 'Cost' },
  { key: 'consumption', label: 'L/100km' },
  { key: 'station', label: 'Station' },
  { key: 'partial', label: 'Partial?' },
  { key: 'tags', label: 'Tags' },
];

export default function Fuel({ state, setState }: Props) {
  const { t } = useI18n();
  const { config } = useUserConfig();
  const threeDecimal = config.threeDecimalFuel || false;
  const fmtFuelCost = (v: number) => threeDecimal ? v.toFixed(3) : formatCurrency(v);
  const fmtConsumption = (v: number) => threeDecimal ? v.toFixed(3) : v.toFixed(2);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<FuelRecord | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [extraFieldValues, setExtraFieldValues] = useState<Record<string, string>>({});
  const [filterVehicle, setFilterVehicle] = useState('');

  // Detect if the filtered/selected vehicle is electric
  const selectedVehicleElectric = useMemo(() => {
    if (filterVehicle) {
      const v = state.vehicles.find(v => v.id === filterVehicle);
      return !!v?.isElectric;
    }
    return false;
  }, [filterVehicle, state.vehicles]);

  const { fmtDistance, fmtVolume, fmtFuelEconomy, distanceUnit, volumeUnit, fuelEconomyUnitLabel, toDisplayDistance, toDisplayVolume, toStorageDistance, toStorageVolume } = useUnits({ isElectric: selectedVehicleElectric });
  const extraFieldDefs = useExtraFields();
  const [filterTags, setFilterTags] = useState<string[]>([]);
  const [tagFilterMode, setTagFilterMode] = useState<'include' | 'exclude'>('include');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [sortKey, setSortKey] = useState<SortKey>('date');
  const [sortAsc, setSortAsc] = useState(false);

  const allTags = useMemo(() => [...new Set(state.fuelRecords.flatMap(r => r.tags || []))], [state.fuelRecords]);

  const filtered = useMemo(() => {
    let items = [...state.fuelRecords];
    if (filterVehicle) items = items.filter(r => r.vehicleId === filterVehicle);
    if (filterTags.length > 0) {
      if (tagFilterMode === 'include') {
        items = items.filter(r => (r.tags || []).some(t => filterTags.includes(t)));
      } else {
        items = items.filter(r => !(r.tags || []).some(t => filterTags.includes(t)));
      }
    }
    return items;
  }, [state.fuelRecords, filterVehicle, filterTags, tagFilterMode]);

  const sorted = useMemo(() => {
    const arr = [...filtered];
    arr.sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case 'date': cmp = a.date.localeCompare(b.date); break;
        case 'mileage': cmp = a.mileage - b.mileage; break;
        case 'fuelAmount': cmp = a.fuelAmount - b.fuelAmount; break;
        case 'fuelCost': cmp = a.fuelCost - b.fuelCost; break;
        case 'station': cmp = (a.station || '').localeCompare(b.station || ''); break;
      }
      return sortAsc ? cmp : -cmp;
    });
    return arr;
  }, [filtered, sortKey, sortAsc]);

  // Use server-provided fuelEconomy, fall back to client-side calculation
  const consumptionMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of state.fuelRecords) {
      if (r.fuelEconomy != null) {
        map.set(r.id, r.fuelEconomy);
      }
    }
    // Fallback: if no server values, compute client-side
    if (map.size === 0) {
      const byVehicle = new Map<string, FuelRecord[]>();
      for (const r of state.fuelRecords) {
        const arr = byVehicle.get(r.vehicleId) || [];
        arr.push(r);
        byVehicle.set(r.vehicleId, arr);
      }
      for (const [, records] of byVehicle) {
        const s = [...records].sort((a, b) => a.mileage - b.mileage);
        let lastFullFillMileage = 0;
        let accLiters = 0;
        for (const rec of s) {
          if (rec.isMissedEntry) {
            lastFullFillMileage = rec.mileage;
            accLiters = 0;
            continue;
          }
          accLiters += rec.fuelAmount;
          if (!rec.isPartialFill && lastFullFillMileage > 0) {
            const dist = rec.mileage - lastFullFillMileage;
            if (dist > 0) map.set(rec.id, (accLiters / dist) * 100);
            lastFullFillMileage = rec.mileage;
            accLiters = 0;
          } else if (!rec.isPartialFill) {
            lastFullFillMileage = rec.mileage;
            accLiters = 0;
          }
        }
      }
    }
    return map;
  }, [state.fuelRecords]);

  const totalSpent = filtered.reduce((s, r) => s + r.fuelCost, 0);
  const totalLiters = filtered.reduce((s, r) => s + r.fuelAmount, 0);
  const consumptionValues = filtered.map(r => consumptionMap.get(r.id)).filter((v): v is number => v !== undefined);
  const avgConsumption = consumptionValues.length > 0
    ? consumptionValues.reduce((a, b) => a + b, 0) / consumptionValues.length
    : 0;
  const minConsumption = consumptionValues.length > 0 ? Math.min(...consumptionValues) : 0;
  const maxConsumption = consumptionValues.length > 0 ? Math.max(...consumptionValues) : 0;

  // Extra field definitions for fuel records as table columns
  const fuelExtraFieldDefs = useMemo(() =>
    extraFieldDefs.filter(d => d.recordType === 'fuel').sort((a, b) => a.sortOrder - b.sortOrder),
    [extraFieldDefs]
  );
  const allFuelColumns = useMemo(() => [
    ...fuelColumns,
    ...fuelExtraFieldDefs.map(d => ({ key: `extra_${d.fieldName}`, label: d.fieldName })),
  ], [fuelExtraFieldDefs]);
  const { visibleColumns } = useColumnPreferences('fuel', allFuelColumns);
  const isVisible = (col: string) => visibleColumns.some(c => c.key === col);

  // Chart data: L/100km over time per vehicle
  const chartData = useMemo(() => {
    const points: { date: string; dateLabel: string; [vehicle: string]: string | number }[] = [];
    const dateMap = new Map<string, Record<string, number>>();
    for (const r of filtered) {
      const c = consumptionMap.get(r.id);
      if (c === undefined || !r.date) continue;
      const vName = state.vehicles.find(v => v.id === r.vehicleId)?.name || 'Unknown';
      if (!dateMap.has(r.date)) dateMap.set(r.date, {});
      dateMap.get(r.date)![vName] = Math.round(c * 100) / 100;
    }
    const sortedDates = [...dateMap.keys()].sort();
    for (const d of sortedDates) {
      let label = d;
      try { label = format(parseISO(d), 'dd.MM.yy'); } catch { /* keep raw */ }
      points.push({ date: d, dateLabel: label, ...dateMap.get(d)! });
    }
    return points;
  }, [filtered, consumptionMap, state.vehicles]);

  const vehicleNames = useMemo(() => {
    const names = new Set<string>();
    for (const r of filtered) {
      if (consumptionMap.has(r.id)) {
        names.add(state.vehicles.find(v => v.id === r.vehicleId)?.name || 'Unknown');
      }
    }
    return [...names];
  }, [filtered, consumptionMap, state.vehicles]);

  const lineColors = ['#8b5cf6', '#38bdf8', '#f59e0b', '#ef4444', '#10b981', '#ec4899'];

  const getVehicleName = (id: string) => state.vehicles.find(v => v.id === id)?.name || '-';

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc(!sortAsc);
    else { setSortKey(key); setSortAsc(key === 'station'); }
  };

  const openAdd = () => {
    setEditing(null);
    const defaultVehicle = state.vehicles[0];
    const autoMileage = (config.enableAutoFillOdometer !== false && defaultVehicle)
      ? defaultVehicle.currentMileage || 0
      : 0;
    setForm({ ...emptyForm, vehicleId: defaultVehicle?.id || '', date: new Date().toISOString().split('T')[0], mileage: autoMileage });
    setExtraFieldValues({});
    setModalOpen(true);
  };

  const openEdit = (record: FuelRecord) => {
    setEditing(record);
    setForm({
      vehicleId: record.vehicleId,
      date: record.date,
      mileage: record.mileage,
      fuelAmount: record.fuelAmount,
      fuelCost: record.fuelCost,
      isPartialFill: record.isPartialFill,
      isMissedEntry: record.isMissedEntry,
      fuelType: record.fuelType,
      station: record.station,
      notes: record.notes,
      tags: record.tags || [],
    });
    setExtraFieldValues((record as any).extraFields || {});
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.vehicleId || !form.date) return;
    const finalCost = form.costInputMode === 'perUnit'
      ? Math.round(form.pricePerUnit * form.fuelAmount * 100) / 100
      : form.fuelCost;
    const payload = {
      vehicleId: form.vehicleId,
      date: form.date,
      mileage: form.mileage,
      fuelAmount: form.fuelAmount,
      fuelCost: finalCost,
      isPartialFill: form.isPartialFill,
      isMissedEntry: form.isMissedEntry,
      fuelType: form.fuelType,
      station: form.station,
      notes: form.notes,
      tags: form.tags,
      extraFields: extraFieldValues,
    };
    try {
      if (editing) {
        const updated = await api.updateFuelRecord(editing.id, payload);
        setState({ ...state, fuelRecords: state.fuelRecords.map(r => r.id === editing.id ? updated : r) });
      } else {
        const created = await api.createFuelRecord(payload);
        setState({ ...state, fuelRecords: [...state.fuelRecords, created] });
      }
      setModalOpen(false);
    } catch (e) {
      console.error('Failed to save fuel record', e);
    }
  };

  const handleBulkDelete = async () => {
    try {
      for (const id of selectedIds) {
        await api.deleteFuelRecord(id);
      }
      setState({ ...state, fuelRecords: state.fuelRecords.filter(r => !selectedIds.has(r.id)) });
      setSelectedIds(new Set());
    } catch {
      // ignore
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.deleteFuelRecord(id);
      setState({ ...state, fuelRecords: state.fuelRecords.filter(r => r.id !== id) });
    } catch (e) {
      console.error('Failed to delete fuel record', e);
    }
  };

  const selectClasses = "w-full h-10 bg-zinc-950 border border-zinc-800 rounded-lg px-3 text-sm text-zinc-50 outline-none focus:border-violet-500/50 appearance-none";
  const inputClasses = "w-full h-10 bg-zinc-950 border border-zinc-800 rounded-lg px-3 text-sm text-zinc-50 placeholder:text-zinc-600 outline-none focus:border-violet-500/50";
  const chevronBg = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%2371717a' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E") no-repeat right 10px center`;

  const SortHeader = ({ label, col }: { label: string; col: SortKey }) => (
    <th
      className="px-4 py-3 text-xs text-zinc-500 uppercase tracking-wider cursor-pointer select-none"
      onClick={() => handleSort(col)}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        <ArrowUpDown size={12} className={cn(sortKey === col ? 'text-violet-400' : 'text-zinc-600')} />
      </span>
    </th>
  );

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-zinc-400">{t('fuel.subtitle')}</p>
        <div className="flex items-center gap-3">
          <ColumnSettings tableKey="fuel" allColumns={allFuelColumns} />
          <TagFilter
            allTags={allTags}
            selectedTags={filterTags}
            onTagsChange={setFilterTags}
            filterMode={tagFilterMode}
            onFilterModeChange={setTagFilterMode}
          />
          <button onClick={() => window.print()} className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg h-10 px-4 text-sm inline-flex items-center gap-2 no-print">
            <Printer size={16} />
            {t('common.print')}
          </button>
          <button onClick={openAdd} className="bg-violet-500 hover:bg-violet-400 text-white rounded-lg h-10 px-5 text-sm font-medium inline-flex items-center gap-2">
            <Plus size={16} />
            {t('fuel.add_fillup')}
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6">
        {[
          { label: t('fuel.total_cost'), value: formatCurrency(totalSpent), color: 'text-red-400' },
          { label: `${t('common.total')} ${volumeUnit}`, value: fmtVolume(totalLiters), color: 'text-sky-400' },
          { label: `${t('fuel.avg_consumption')} ${fuelEconomyUnitLabel}`, value: avgConsumption > 0 ? fmtFuelEconomy(avgConsumption) : '-', color: 'text-amber-400' },
          { label: `Min ${fuelEconomyUnitLabel}`, value: minConsumption > 0 ? fmtFuelEconomy(minConsumption) : '-', color: 'text-emerald-400' },
          { label: `Max ${fuelEconomyUnitLabel}`, value: maxConsumption > 0 ? fmtFuelEconomy(maxConsumption) : '-', color: 'text-red-400' },
          { label: t('fuel.fill_ups'), value: String(filtered.length), color: 'text-violet-400' },
        ].map(s => (
          <div key={s.label}>
            <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">{s.label}</p>
            <p className={cn('text-2xl font-semibold', s.color)}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Filter */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
        <div className="flex flex-col md:flex-row gap-5">
          <div className="flex-1">
            <label className="block text-sm font-medium text-zinc-400 mb-2">{t('common.vehicle')}</label>
            <select
              value={filterVehicle}
              onChange={e => setFilterVehicle(e.target.value)}
              className={selectClasses}
              style={{ background: chevronBg }}
            >
              <option value="">{t('costs.all_vehicles')}</option>
              {state.vehicles.map(v => (
                <option key={v.id} value={v.id}>{v.name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Bulk Actions */}
      <BulkActions
        selectedCount={selectedIds.size}
        selectedIds={Array.from(selectedIds)}
        onDelete={handleBulkDelete}
        onDeselect={() => setSelectedIds(new Set())}
        recordType="fuel"
        vehicles={state.vehicles}
        onComplete={async () => {
          const fuelRecords = await api.getFuelRecords();
          setState({ ...state, fuelRecords });
          setSelectedIds(new Set());
        }}
      />

      {/* Table */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-zinc-950/50">
              <tr>
                <th className="px-4 py-3 text-xs text-zinc-500 uppercase tracking-wider text-left">
                  <input
                    type="checkbox"
                    checked={sorted.length > 0 && selectedIds.size === sorted.length}
                    onChange={e => {
                      if (e.target.checked) setSelectedIds(new Set(sorted.map(r => r.id)));
                      else setSelectedIds(new Set());
                    }}
                    className="rounded border-zinc-700 bg-zinc-800"
                  />
                </th>
                <th className="px-4 py-3 text-xs text-zinc-500 uppercase tracking-wider text-left">{t('common.vehicle')}</th>
                <SortHeader label={t('common.date')} col="date" />
                <SortHeader label={t('common.mileage')} col="mileage" />
                <SortHeader label={volumeUnit} col="fuelAmount" />
                <SortHeader label={t('common.cost')} col="fuelCost" />
                <th className="px-4 py-3 text-xs text-zinc-500 uppercase tracking-wider">{fuelEconomyUnitLabel}</th>
                <SortHeader label={t('fuel.station')} col="station" />
                <th className="px-4 py-3 text-xs text-zinc-500 uppercase tracking-wider">{t('fuel.partial_fill')}?</th>
                <th className="px-4 py-3 text-xs text-zinc-500 uppercase tracking-wider">{t('common.tags')}</th>
                {fuelExtraFieldDefs.map(d => (
                  <th key={d.id} className="px-4 py-3 text-xs text-zinc-500 uppercase tracking-wider">{d.fieldName}</th>
                ))}
                <th className="px-4 py-3 text-xs text-zinc-500 uppercase tracking-wider text-right">{t('common.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {sorted.length === 0 ? (
                <tr>
                  <td colSpan={11 + fuelExtraFieldDefs.length} className="px-4 py-12 text-center text-sm text-zinc-500">
                    {t('fuel.no_records')}
                  </td>
                </tr>
              ) : (
                sorted.map(record => {
                  const consumption = consumptionMap.get(record.id);
                  return (
                    <motion.tr
                      key={record.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className={cn(
                        "border-b border-zinc-800/50 hover:bg-zinc-800/30 transition-colors",
                        selectedIds.has(record.id) && 'bg-violet-500/5'
                      )}
                    >
                      <td className="px-4 py-3.5 text-sm">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(record.id)}
                          onChange={e => {
                            const next = new Set(selectedIds);
                            if (e.target.checked) next.add(record.id);
                            else next.delete(record.id);
                            setSelectedIds(next);
                          }}
                          className="rounded border-zinc-700 bg-zinc-800"
                        />
                      </td>
                      <td className="px-4 py-3.5 text-sm text-zinc-400">{getVehicleName(record.vehicleId)}</td>
                      <td className="px-4 py-3.5 text-sm text-zinc-400">{formatDate(record.date)}</td>
                      <td className="px-4 py-3.5 text-sm text-zinc-400">{fmtDistance(record.mileage)}</td>
                      <td className="px-4 py-3.5 text-sm text-zinc-50 font-medium">{fmtVolume(record.fuelAmount)}</td>
                      <td className="px-4 py-3.5 text-sm text-red-400 font-medium">{threeDecimal ? fmtFuelCost(record.fuelCost) : formatCurrency(record.fuelCost)}</td>
                      <td className="px-4 py-3.5 text-sm font-medium">
                        {consumption !== undefined ? (
                          <span className={cn(
                            avgConsumption > 0 && consumption <= avgConsumption * 0.9 ? 'text-emerald-400' :
                            avgConsumption > 0 && consumption >= avgConsumption * 1.1 ? 'text-red-400' :
                            'text-amber-400'
                          )}>
                            {threeDecimal ? fmtConsumption(consumption) : fmtFuelEconomy(consumption)}
                          </span>
                        ) : (
                          <span className="text-zinc-600">{'\u2014'}</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-sm text-zinc-400">{record.station || '-'}</td>
                      <td className="px-4 py-3.5 text-sm text-center">
                        {record.isPartialFill && (
                          <span className="inline-block px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 text-xs">{t('fuel.partial')}</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-sm">
                        <div className="flex flex-wrap gap-1">
                          {(record.tags || []).map(tag => (
                            <span key={tag} className="inline-block px-2 py-0.5 rounded bg-zinc-800 text-zinc-400 text-xs">{tag}</span>
                          ))}
                        </div>
                      </td>
                      {fuelExtraFieldDefs.map(d => (
                        <td key={d.id} className="px-4 py-3.5 text-sm text-zinc-400">
                          {((record as any).extraFields || {})[d.fieldName] || '-'}
                        </td>
                      ))}
                      <td className="px-4 py-3.5 text-sm text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => openEdit(record)} className="text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-lg h-9 px-3 text-sm inline-flex items-center">
                            <Pencil size={14} />
                          </button>
                          <button onClick={() => handleDelete(record.id)} className="text-zinc-400 hover:text-red-400 hover:bg-zinc-800 rounded-lg h-9 px-3 text-sm inline-flex items-center">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Consumption Chart */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
        <h3 className="text-sm font-medium text-zinc-50 mb-5">{t('fuel.consumption_over_time')} ({fuelEconomyUnitLabel})</h3>
        {chartData.length > 0 ? (
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                <XAxis
                  dataKey="dateLabel"
                  tick={{ fontSize: 11, fill: '#71717a' }}
                  axisLine={{ stroke: '#3f3f46' }}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: '#71717a' }}
                  axisLine={{ stroke: '#3f3f46' }}
                  tickLine={false}
                  domain={['auto', 'auto']}
                />
                <Tooltip
                  contentStyle={{ backgroundColor: '#18181b', border: '1px solid #3f3f46', borderRadius: '0.5rem', fontSize: '0.8rem' }}
                  labelStyle={{ color: '#a1a1aa' }}
                  formatter={(val: number) => `${formatNumber(val, 2)} ${fuelEconomyUnitLabel}`}
                />
                <Legend wrapperStyle={{ fontSize: '0.75rem', color: '#a1a1aa' }} />
                {vehicleNames.map((name, i) => (
                  <Line
                    key={name}
                    type="monotone"
                    dataKey={name}
                    name={name}
                    stroke={lineColors[i % lineColors.length]}
                    strokeWidth={2}
                    dot={{ r: 3 }}
                    connectNulls
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p className="text-sm text-zinc-500 text-center py-12">{t('fuel.consumption_not_enough')}</p>
        )}
      </div>

      {/* Add/Edit Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? t('fuel.edit_fillup') : t('fuel.add_fillup')}
        size="lg"
        footer={
          <>
            <button onClick={() => setModalOpen(false)} className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg h-10 px-4 text-sm">
              {t('common.cancel')}
            </button>
            <button onClick={handleSave} className="bg-violet-500 hover:bg-violet-400 text-white rounded-lg h-10 px-5 text-sm font-medium">
              {editing ? t('common.save_changes') : t('fuel.add_fillup')}
            </button>
          </>
        }
      >
        <div className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-2">{t('common.vehicle')}</label>
              <select
                value={form.vehicleId}
                onChange={e => setForm({ ...form, vehicleId: e.target.value })}
                className={selectClasses}
                style={{ background: chevronBg }}
              >
                <option value="">{t('common.select_vehicle')}</option>
                {state.vehicles.map(v => (
                  <option key={v.id} value={v.id}>{v.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-2">{t('common.date')}</label>
              <input
                type="date"
                value={form.date}
                onChange={e => setForm({ ...form, date: e.target.value })}
                className={inputClasses}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-2">{t('common.mileage')} ({distanceUnit})</label>
              <input
                type="number"
                value={form.mileage || ''}
                onChange={e => setForm({ ...form, mileage: parseInt(e.target.value) || 0 })}
                placeholder="0"
                className={inputClasses}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-2">{volumeUnit}</label>
              <input
                type="number"
                step="0.01"
                value={form.fuelAmount || ''}
                onChange={e => setForm({ ...form, fuelAmount: parseFloat(e.target.value) || 0 })}
                placeholder="0.00"
                className={inputClasses}
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-zinc-400">
                  {form.costInputMode === 'perUnit' ? `Price per ${volumeUnit}` : t('common.cost')}
                </label>
                <button
                  type="button"
                  onClick={() => {
                    if (form.costInputMode === 'total') {
                      const ppu = form.fuelAmount > 0 ? form.fuelCost / form.fuelAmount : 0;
                      setForm({ ...form, costInputMode: 'perUnit', pricePerUnit: Math.round(ppu * 1000) / 1000 });
                    } else {
                      setForm({ ...form, costInputMode: 'total', fuelCost: Math.round(form.pricePerUnit * form.fuelAmount * 100) / 100 });
                    }
                  }}
                  className="text-xs text-violet-400 hover:text-violet-300"
                >
                  {form.costInputMode === 'perUnit' ? 'Switch to Total' : 'Switch to Per Unit'}
                </button>
              </div>
              {form.costInputMode === 'perUnit' ? (
                <input
                  type="number"
                  step="0.001"
                  value={form.pricePerUnit || ''}
                  onChange={e => {
                    const ppu = parseFloat(e.target.value) || 0;
                    setForm({ ...form, pricePerUnit: ppu, fuelCost: Math.round(ppu * form.fuelAmount * 100) / 100 });
                  }}
                  placeholder="0.000"
                  className={inputClasses}
                />
              ) : (
                <input
                  type="number"
                  step="0.01"
                  value={form.fuelCost || ''}
                  onChange={e => setForm({ ...form, fuelCost: parseFloat(e.target.value) || 0 })}
                  placeholder="0.00"
                  className={inputClasses}
                />
              )}
              {form.costInputMode === 'perUnit' && form.fuelAmount > 0 && (
                <p className="text-xs text-zinc-500 mt-1">Total: {formatCurrency(form.pricePerUnit * form.fuelAmount)}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-2">{t('vehicles.fuel_type')}</label>
              <select
                value={form.fuelType}
                onChange={e => setForm({ ...form, fuelType: e.target.value })}
                className={selectClasses}
                style={{ background: chevronBg }}
              >
                <option value="">{t('fuel.select_type')}</option>
                <option value="diesel">{t('fuel_type.diesel')}</option>
                <option value="benzin">{t('fuel_type.benzin')}</option>
                <option value="elektro">{t('fuel_type.elektro')}</option>
                <option value="hybrid">{t('fuel_type.hybrid')}</option>
                <option value="lpg">{t('fuel_type.lpg')}</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-2">{t('fuel.station')}</label>
              <input
                type="text"
                value={form.station}
                onChange={e => setForm({ ...form, station: e.target.value })}
                placeholder={t('fuel.station_placeholder')}
                className={inputClasses}
              />
            </div>
          </div>

          <div className="flex gap-6">
            <label className="inline-flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.isPartialFill}
                onChange={e => setForm({ ...form, isPartialFill: e.target.checked })}
                className="w-4 h-4 rounded border-zinc-700 bg-zinc-950 text-violet-500 focus:ring-violet-500/50"
              />
              <span className="text-sm text-zinc-400">{t('fuel.partial_fill_label')}</span>
            </label>
            <label className="inline-flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.isMissedEntry}
                onChange={e => setForm({ ...form, isMissedEntry: e.target.checked })}
                className="w-4 h-4 rounded border-zinc-700 bg-zinc-950 text-violet-500 focus:ring-violet-500/50"
              />
              <span className="text-sm text-zinc-400">{t('fuel.missed_entry_label')}</span>
            </label>
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-2">{t('common.tags')}</label>
            <TagInput
              tags={form.tags}
              onChange={tags => setForm({ ...form, tags })}
              suggestions={allTags}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-2">{t('common.notes')}</label>
            <textarea
              value={form.notes}
              onChange={e => setForm({ ...form, notes: e.target.value })}
              placeholder={t('common.optional_notes')}
              className="w-full min-h-[80px] h-auto bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2.5 text-sm text-zinc-50 placeholder:text-zinc-600 outline-none focus:border-violet-500/50 resize-none"
            />
          </div>

          <ExtraFields
            recordType="fuel"
            values={extraFieldValues}
            onChange={setExtraFieldValues}
            definitions={extraFieldDefs}
          />
        </div>
      </Modal>
    </div>
  );
}
