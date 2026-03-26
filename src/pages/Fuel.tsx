import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Plus, Pencil, Trash2, ArrowUpDown, Fuel as FuelIcon } from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend,
} from 'recharts';
import Modal from '../components/Modal';
import { cn } from '../lib/utils';
import { formatCurrency, formatDate, formatNumber } from '../utils';
import { parseISO, format } from 'date-fns';
import { api } from '../api';
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
  tags: '',
};

type SortKey = 'date' | 'mileage' | 'fuelAmount' | 'fuelCost' | 'station';

export default function Fuel({ state, setState }: Props) {
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<FuelRecord | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [filterVehicle, setFilterVehicle] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('date');
  const [sortAsc, setSortAsc] = useState(false);

  const filtered = useMemo(() => {
    let items = [...state.fuelRecords];
    if (filterVehicle) items = items.filter(r => r.vehicleId === filterVehicle);
    return items;
  }, [state.fuelRecords, filterVehicle]);

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

  // Calculate L/100km for each record by comparing to previous fill
  const consumptionMap = useMemo(() => {
    const map = new Map<string, number>();
    const byVehicle = new Map<string, FuelRecord[]>();
    for (const r of state.fuelRecords) {
      const arr = byVehicle.get(r.vehicleId) || [];
      arr.push(r);
      byVehicle.set(r.vehicleId, arr);
    }
    for (const [, records] of byVehicle) {
      const s = [...records].sort((a, b) => a.mileage - b.mileage);
      for (let i = 1; i < s.length; i++) {
        if (s[i].isPartialFill || s[i].isMissedEntry) continue;
        const dist = s[i].mileage - s[i - 1].mileage;
        if (dist > 0 && s[i].fuelAmount > 0) {
          map.set(s[i].id, (s[i].fuelAmount / dist) * 100);
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
    setForm({ ...emptyForm, vehicleId: state.vehicles[0]?.id || '', date: new Date().toISOString().split('T')[0] });
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
      tags: (record.tags || []).join(', '),
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.vehicleId || !form.date) return;
    const tags = form.tags.split(',').map(t => t.trim()).filter(Boolean);
    const payload = {
      vehicleId: form.vehicleId,
      date: form.date,
      mileage: form.mileage,
      fuelAmount: form.fuelAmount,
      fuelCost: form.fuelCost,
      isPartialFill: form.isPartialFill,
      isMissedEntry: form.isMissedEntry,
      fuelType: form.fuelType,
      station: form.station,
      notes: form.notes,
      tags,
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
        <p className="text-sm text-zinc-400">Track fuel consumption and costs across your vehicles.</p>
        <button onClick={openAdd} className="bg-violet-500 hover:bg-violet-400 text-white rounded-lg h-10 px-5 text-sm font-medium inline-flex items-center gap-2">
          <Plus size={16} />
          Add Fill-up
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Total Spent', value: formatCurrency(totalSpent), color: 'text-red-400' },
          { label: 'Total Liters', value: `${formatNumber(totalLiters, 1)} L`, color: 'text-sky-400' },
          { label: 'Avg. L/100km', value: avgConsumption > 0 ? formatNumber(avgConsumption, 2) : '-', color: 'text-amber-400' },
          { label: 'Fill-ups', value: String(filtered.length), color: 'text-violet-400' },
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
            <label className="block text-sm font-medium text-zinc-400 mb-2">Vehicle</label>
            <select
              value={filterVehicle}
              onChange={e => setFilterVehicle(e.target.value)}
              className={selectClasses}
              style={{ background: chevronBg }}
            >
              <option value="">All Vehicles</option>
              {state.vehicles.map(v => (
                <option key={v.id} value={v.id}>{v.name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-zinc-950/50">
              <tr>
                <th className="px-4 py-3 text-xs text-zinc-500 uppercase tracking-wider text-left">Vehicle</th>
                <SortHeader label="Date" col="date" />
                <SortHeader label="Mileage" col="mileage" />
                <SortHeader label="Liters" col="fuelAmount" />
                <SortHeader label="Cost" col="fuelCost" />
                <th className="px-4 py-3 text-xs text-zinc-500 uppercase tracking-wider">L/100km</th>
                <SortHeader label="Station" col="station" />
                <th className="px-4 py-3 text-xs text-zinc-500 uppercase tracking-wider">Partial?</th>
                <th className="px-4 py-3 text-xs text-zinc-500 uppercase tracking-wider">Tags</th>
                <th className="px-4 py-3 text-xs text-zinc-500 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {sorted.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-4 py-12 text-center text-sm text-zinc-500">
                    No fuel records found. Add your first fill-up to start tracking.
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
                      className="border-b border-zinc-800/50 hover:bg-zinc-800/30 transition-colors"
                    >
                      <td className="px-4 py-3.5 text-sm text-zinc-400">{getVehicleName(record.vehicleId)}</td>
                      <td className="px-4 py-3.5 text-sm text-zinc-400">{formatDate(record.date)}</td>
                      <td className="px-4 py-3.5 text-sm text-zinc-400">{formatNumber(record.mileage)} km</td>
                      <td className="px-4 py-3.5 text-sm text-zinc-50 font-medium">{formatNumber(record.fuelAmount, 2)} L</td>
                      <td className="px-4 py-3.5 text-sm text-red-400 font-medium">{formatCurrency(record.fuelCost)}</td>
                      <td className="px-4 py-3.5 text-sm text-amber-400 font-medium">
                        {consumption !== undefined ? formatNumber(consumption, 2) : '-'}
                      </td>
                      <td className="px-4 py-3.5 text-sm text-zinc-400">{record.station || '-'}</td>
                      <td className="px-4 py-3.5 text-sm text-center">
                        {record.isPartialFill && (
                          <span className="inline-block px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 text-xs">Partial</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-sm">
                        <div className="flex flex-wrap gap-1">
                          {(record.tags || []).map(tag => (
                            <span key={tag} className="inline-block px-2 py-0.5 rounded bg-zinc-800 text-zinc-400 text-xs">{tag}</span>
                          ))}
                        </div>
                      </td>
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
        <h3 className="text-sm font-medium text-zinc-50 mb-5">Fuel Consumption Over Time (L/100km)</h3>
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
                  formatter={(val: number) => `${formatNumber(val, 2)} L/100km`}
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
          <p className="text-sm text-zinc-500 text-center py-12">Not enough data to calculate consumption. Add at least two non-partial fill-ups per vehicle.</p>
        )}
      </div>

      {/* Add/Edit Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Edit Fill-up' : 'Add Fill-up'}
        size="lg"
        footer={
          <>
            <button onClick={() => setModalOpen(false)} className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg h-10 px-4 text-sm">
              Cancel
            </button>
            <button onClick={handleSave} className="bg-violet-500 hover:bg-violet-400 text-white rounded-lg h-10 px-5 text-sm font-medium">
              {editing ? 'Save Changes' : 'Add Fill-up'}
            </button>
          </>
        }
      >
        <div className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-2">Vehicle</label>
              <select
                value={form.vehicleId}
                onChange={e => setForm({ ...form, vehicleId: e.target.value })}
                className={selectClasses}
                style={{ background: chevronBg }}
              >
                <option value="">Select vehicle</option>
                {state.vehicles.map(v => (
                  <option key={v.id} value={v.id}>{v.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-2">Date</label>
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
              <label className="block text-sm font-medium text-zinc-400 mb-2">Mileage (km)</label>
              <input
                type="number"
                value={form.mileage || ''}
                onChange={e => setForm({ ...form, mileage: parseInt(e.target.value) || 0 })}
                placeholder="0"
                className={inputClasses}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-2">Liters</label>
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
              <label className="block text-sm font-medium text-zinc-400 mb-2">Cost</label>
              <input
                type="number"
                step="0.01"
                value={form.fuelCost || ''}
                onChange={e => setForm({ ...form, fuelCost: parseFloat(e.target.value) || 0 })}
                placeholder="0.00"
                className={inputClasses}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-2">Fuel Type</label>
              <select
                value={form.fuelType}
                onChange={e => setForm({ ...form, fuelType: e.target.value })}
                className={selectClasses}
                style={{ background: chevronBg }}
              >
                <option value="">Select type</option>
                <option value="diesel">Diesel</option>
                <option value="benzin">Gasoline</option>
                <option value="elektro">Electric</option>
                <option value="hybrid">Hybrid</option>
                <option value="lpg">LPG</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-2">Station</label>
              <input
                type="text"
                value={form.station}
                onChange={e => setForm({ ...form, station: e.target.value })}
                placeholder="e.g. Shell, Aral"
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
              <span className="text-sm text-zinc-400">Partial fill</span>
            </label>
            <label className="inline-flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.isMissedEntry}
                onChange={e => setForm({ ...form, isMissedEntry: e.target.checked })}
                className="w-4 h-4 rounded border-zinc-700 bg-zinc-950 text-violet-500 focus:ring-violet-500/50"
              />
              <span className="text-sm text-zinc-400">Missed entry</span>
            </label>
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-2">Tags (comma-separated)</label>
            <input
              type="text"
              value={form.tags}
              onChange={e => setForm({ ...form, tags: e.target.value })}
              placeholder="e.g. highway, winter"
              className={inputClasses}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-2">Notes</label>
            <textarea
              value={form.notes}
              onChange={e => setForm({ ...form, notes: e.target.value })}
              placeholder="Optional notes..."
              className="w-full min-h-[80px] h-auto bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2.5 text-sm text-zinc-50 placeholder:text-zinc-600 outline-none focus:border-violet-500/50 resize-none"
            />
          </div>
        </div>
      </Modal>
    </div>
  );
}
