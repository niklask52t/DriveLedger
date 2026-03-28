import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Pencil, Trash2, ArrowUpDown, List, Clock, Printer } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell,
  PieChart, Pie,
} from 'recharts';
import { api } from '../api';
import Modal from '../components/Modal';
import TagInput from '../components/TagInput';
import TagFilter from '../components/TagFilter';
import BulkActions from '../components/BulkActions';
import ExtraFields from '../components/ExtraFields';
import { useExtraFields } from '../hooks/useExtraFields';
import ColumnSettings, { useColumnPreferences } from '../components/ColumnSettings';
import { cn } from '../lib/utils';
import { formatCurrency, formatDate, formatNumber, getTotalRepairCosts, getCategoryColor, getCategoryLabel } from '../utils';
import { parseISO, format } from 'date-fns';
import { useUnits } from '../hooks/useUnits';
import { useI18n } from '../contexts/I18nContext';
import type { AppState, Repair } from '../types';

interface Props {
  state: AppState;
  setState: (s: AppState) => void;
}

const repairCategories = [
  'Engine', 'Brakes', 'Suspension', 'Electrical', 'Bodywork', 'Tires',
  'Exhaust', 'Transmission', 'Interior', 'Maintenance', 'Other',
];

const categoryColors: Record<string, string> = {
  Engine: '#f87171', Brakes: '#fbbf24', Suspension: '#34d399', Electrical: '#38bdf8',
  Bodywork: '#a78bfa', Tires: '#f97316', Exhaust: '#ec4899', Transmission: '#8b5cf6',
  Interior: '#06b6d4', Maintenance: '#10b981', Other: '#71717a',
};

const emptyRepair: Omit<Repair, 'id' | 'createdAt'> = {
  vehicleId: '',
  date: '',
  description: '',
  category: 'Other',
  notes: '',
  cost: 0,
  mileage: 0,
  workshop: '',
  tags: [],
};

type SortKey = 'date' | 'description' | 'category' | 'cost' | 'mileage' | 'workshop';
type ViewMode = 'table' | 'timeline';

const repairsColumns = [
  { key: 'vehicle', label: 'Vehicle' },
  { key: 'date', label: 'Date' },
  { key: 'description', label: 'Description' },
  { key: 'category', label: 'Category' },
  { key: 'cost', label: 'Cost' },
  { key: 'mileage', label: 'Mileage' },
  { key: 'workshop', label: 'Workshop' },
];

export default function Repairs({ state, setState }: Props) {
  const { t } = useI18n();
  const { fmtDistance, distanceUnit } = useUnits();
  const extraFieldDefs = useExtraFields();
  const repairExtraFieldDefs = useMemo(() =>
    extraFieldDefs.filter(d => d.recordType === 'repair').sort((a, b) => a.sortOrder - b.sortOrder),
    [extraFieldDefs]
  );
  const allRepairsColumns = useMemo(() => [
    ...repairsColumns,
    ...repairExtraFieldDefs.map(d => ({ key: `extra_${d.fieldName}`, label: d.fieldName })),
  ], [repairExtraFieldDefs]);
  const { visibleColumns } = useColumnPreferences('repairs', allRepairsColumns);
  const isVisible = (col: string) => visibleColumns.some(c => c.key === col);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Repair | null>(null);
  const [form, setForm] = useState(emptyRepair);
  const [extraFieldValues, setExtraFieldValues] = useState<Record<string, string>>({});
  const [filterVehicle, setFilterVehicle] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterTags, setFilterTags] = useState<string[]>([]);
  const [tagFilterMode, setTagFilterMode] = useState<'include' | 'exclude'>('include');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [sortKey, setSortKey] = useState<SortKey>('date');
  const [sortAsc, setSortAsc] = useState(false);
  const [view, setView] = useState<ViewMode>('table');

  const allTags = useMemo(() => [...new Set(state.repairs.flatMap(r => r.tags || []))], [state.repairs]);

  const filtered = useMemo(() => {
    let items = [...state.repairs];
    if (filterVehicle) items = items.filter(r => r.vehicleId === filterVehicle);
    if (filterCategory) items = items.filter(r => r.category === filterCategory);
    if (filterTags.length > 0) {
      if (tagFilterMode === 'include') {
        items = items.filter(r => (r.tags || []).some(t => filterTags.includes(t)));
      } else {
        items = items.filter(r => !(r.tags || []).some(t => filterTags.includes(t)));
      }
    }
    return items;
  }, [state.repairs, filterVehicle, filterCategory, filterTags, tagFilterMode]);

  const sorted = useMemo(() => {
    const arr = [...filtered];
    arr.sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case 'date': cmp = a.date.localeCompare(b.date); break;
        case 'description': cmp = a.description.localeCompare(b.description); break;
        case 'category': cmp = a.category.localeCompare(b.category); break;
        case 'cost': cmp = a.cost - b.cost; break;
        case 'mileage': cmp = a.mileage - b.mileage; break;
        case 'workshop': cmp = a.workshop.localeCompare(b.workshop); break;
      }
      return sortAsc ? cmp : -cmp;
    });
    return arr;
  }, [filtered, sortKey, sortAsc]);

  const totalCost = getTotalRepairCosts(filtered);
  const avgCost = filtered.length > 0 ? totalCost / filtered.length : 0;
  const maxCost = filtered.length > 0 ? Math.max(...filtered.map(r => r.cost)) : 0;

  // Monthly bar chart data
  const monthlyData = useMemo(() => {
    const map: Record<string, number> = {};
    for (const r of filtered) {
      if (!r.date) continue;
      try {
        const key = format(parseISO(r.date), 'yyyy-MM');
        map[key] = (map[key] || 0) + r.cost;
      } catch { /* skip invalid dates */ }
    }
    return Object.entries(map)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-12)
      .map(([month, total]) => {
        let label = month;
        try { label = format(parseISO(month + '-01'), 'MMM yy'); } catch { /* keep raw */ }
        return { month: label, total };
      });
  }, [filtered]);

  // Category pie chart data
  const categoryPieData = useMemo(() => {
    const map: Record<string, number> = {};
    for (const r of filtered) {
      const cat = r.category || 'Other';
      map[cat] = (map[cat] || 0) + r.cost;
    }
    return Object.entries(map)
      .map(([name, value]) => ({ name, value, color: categoryColors[name] || '#71717a' }))
      .sort((a, b) => b.value - a.value);
  }, [filtered]);

  // Timeline groups
  const timelineGroups = useMemo(() => {
    const groups: Record<string, Repair[]> = {};
    for (const r of sorted) {
      let key = 'Unknown';
      if (r.date) {
        try { key = format(parseISO(r.date), 'MMMM yyyy'); } catch { /* keep default */ }
      }
      if (!groups[key]) groups[key] = [];
      groups[key].push(r);
    }
    return Object.entries(groups);
  }, [sorted]);

  const getVehicleName = (id: string) => state.vehicles.find(v => v.id === id)?.name || '-';

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc(!sortAsc);
    else { setSortKey(key); setSortAsc(key === 'description' || key === 'category'); }
  };

  const openAdd = () => {
    setEditing(null);
    setForm({ ...emptyRepair, vehicleId: state.vehicles[0]?.id || '', date: new Date().toISOString().split('T')[0] });
    setExtraFieldValues({});
    setModalOpen(true);
  };

  const openEdit = (repair: Repair) => {
    setEditing(repair);
    setForm({
      vehicleId: repair.vehicleId,
      date: repair.date,
      description: repair.description,
      category: repair.category,
      notes: repair.notes,
      cost: repair.cost,
      mileage: repair.mileage,
      workshop: repair.workshop,
      tags: repair.tags || [],
    });
    setExtraFieldValues((repair as any).extraFields || {});
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.description.trim() || !form.vehicleId) return;
    const payload = { ...form, extraFields: extraFieldValues };
    try {
      if (editing) {
        const updated = await api.updateRepair(editing.id, payload);
        setState({
          ...state,
          repairs: state.repairs.map(r =>
            r.id === editing.id ? updated : r
          ),
        });
      } else {
        const newRepair = await api.createRepair(payload);
        setState({ ...state, repairs: [...state.repairs, newRepair] });
      }
      setModalOpen(false);
    } catch {
      // ignore
    }
  };

  const handleBulkDelete = async () => {
    try {
      for (const id of selectedIds) {
        await api.deleteRepair(id);
      }
      setState({ ...state, repairs: state.repairs.filter(r => !selectedIds.has(r.id)) });
      setSelectedIds(new Set());
    } catch {
      // ignore
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.deleteRepair(id);
      setState({ ...state, repairs: state.repairs.filter(r => r.id !== id) });
    } catch {
      // ignore
    }
  };

  const handleBulkMove = async (destType: string) => {
    try {
      await api.moveRecords(Array.from(selectedIds), 'repairs', destType);
      const [repairs, services, upgrades] = await Promise.all([
        api.getRepairs(),
        api.getServices(),
        api.getUpgrades(),
      ]);
      setState({ ...state, repairs, serviceRecords: services, upgradeRecords: upgrades });
      setSelectedIds(new Set());
    } catch {
      // ignore
    }
  };

  const selectClasses = "w-full h-10 bg-zinc-950 border border-zinc-800 rounded-lg px-3 text-sm text-zinc-50 outline-none focus:border-violet-500/50 appearance-none";
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
        <p className="text-sm text-zinc-400">{t('repairs.subtitle')}</p>
        <div className="flex items-center gap-3">
          <ColumnSettings tableKey="repairs" allColumns={allRepairsColumns} />
          <TagFilter
            allTags={allTags}
            selectedTags={filterTags}
            onTagsChange={setFilterTags}
            filterMode={tagFilterMode}
            onFilterModeChange={setTagFilterMode}
          />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: t('repairs.total_spent'), value: formatCurrency(totalCost), color: 'text-red-400' },
          { label: t('repairs.repair_count'), value: String(filtered.length), color: 'text-violet-400' },
          { label: t('repairs.avg_cost'), value: formatCurrency(avgCost), color: 'text-sky-400' },
          { label: t('repairs.highest'), value: formatCurrency(maxCost), color: 'text-amber-400' },
        ].map(s => (
          <div key={s.label}>
            <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">{s.label}</p>
            <p className={cn('text-2xl font-semibold', s.color)}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Filters + View toggle */}
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
          <div className="flex-1">
            <label className="block text-sm font-medium text-zinc-400 mb-2">{t('common.category')}</label>
            <select
              value={filterCategory}
              onChange={e => setFilterCategory(e.target.value)}
              className={selectClasses}
              style={{ background: chevronBg }}
            >
              <option value="">{t('common.all_categories')}</option>
              {repairCategories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
          <div className="flex items-end gap-2">
            <button
              onClick={() => setView('table')}
              className={cn(
                'rounded-lg h-10 px-4 text-sm inline-flex items-center gap-2 transition-colors',
                view === 'table' ? 'bg-violet-500 text-white' : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300'
              )}
            >
              <List size={16} />
              {t('repairs.table_view')}
            </button>
            <button
              onClick={() => setView('timeline')}
              className={cn(
                'rounded-lg h-10 px-4 text-sm inline-flex items-center gap-2 transition-colors',
                view === 'timeline' ? 'bg-violet-500 text-white' : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300'
              )}
            >
              <Clock size={16} />
              {t('repairs.timeline_view')}
            </button>
            <button onClick={() => window.print()} className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg h-10 px-4 text-sm inline-flex items-center gap-2 no-print">
              <Printer size={16} />
              {t('common.print')}
            </button>
            <button onClick={openAdd} className="bg-violet-500 hover:bg-violet-400 text-white rounded-lg h-10 px-5 text-sm font-medium inline-flex items-center gap-2">
              <Plus size={16} />
              {t('common.add')}
            </button>
          </div>
        </div>
      </div>

      {/* Bulk Actions */}
      <BulkActions
        selectedCount={selectedIds.size}
        selectedIds={Array.from(selectedIds)}
        onDelete={handleBulkDelete}
        onDeselect={() => setSelectedIds(new Set())}
        recordType="repairs"
        vehicles={state.vehicles}
        showMove={true}
        onMove={handleBulkMove}
        onComplete={async () => {
          const repairs = await api.getRepairs();
          setState({ ...state, repairs });
          setSelectedIds(new Set());
        }}
      />

      {/* Table view */}
      {view === 'table' && (
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
                  <SortHeader label={t('common.description')} col="description" />
                  <SortHeader label={t('common.category')} col="category" />
                  <SortHeader label={t('common.cost')} col="cost" />
                  <SortHeader label={t('common.mileage')} col="mileage" />
                  <SortHeader label={t('repairs.workshop')} col="workshop" />
                  {repairExtraFieldDefs.map(d => (
                    <th key={d.id} className="px-4 py-3 text-xs text-zinc-500 uppercase tracking-wider">{d.fieldName}</th>
                  ))}
                  <th className="px-4 py-3 text-xs text-zinc-500 uppercase tracking-wider text-right">{t('common.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {sorted.length === 0 ? (
                  <tr>
                    <td colSpan={9 + repairExtraFieldDefs.length} className="px-4 py-12 text-center text-sm text-zinc-500">
                      {t('repairs.no_repairs')}
                    </td>
                  </tr>
                ) : (
                  sorted.map(repair => (
                    <motion.tr
                      key={repair.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className={cn(
                        "border-b border-zinc-800/50 hover:bg-zinc-800/30 transition-colors",
                        selectedIds.has(repair.id) && 'bg-violet-500/5'
                      )}
                    >
                      <td className="px-4 py-3.5 text-sm">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(repair.id)}
                          onChange={e => {
                            const next = new Set(selectedIds);
                            if (e.target.checked) next.add(repair.id);
                            else next.delete(repair.id);
                            setSelectedIds(next);
                          }}
                          className="rounded border-zinc-700 bg-zinc-800"
                        />
                      </td>
                      <td className="px-4 py-3.5 text-sm text-zinc-400">{getVehicleName(repair.vehicleId)}</td>
                      <td className="px-4 py-3.5 text-sm text-zinc-400">{formatDate(repair.date)}</td>
                      <td className="px-4 py-3.5 text-sm text-zinc-50 font-medium">{repair.description}</td>
                      <td className="px-4 py-3.5 text-sm">
                        <span className="inline-flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: categoryColors[repair.category] || '#71717a' }} />
                          <span className="text-zinc-300">{repair.category}</span>
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-sm text-red-400 font-medium">{formatCurrency(repair.cost)}</td>
                      <td className="px-4 py-3.5 text-sm text-zinc-400">{repair.mileage ? fmtDistance(repair.mileage) : '-'}</td>
                      <td className="px-4 py-3.5 text-sm text-zinc-400">{repair.workshop || '-'}</td>
                      {repairExtraFieldDefs.map(d => (
                        <td key={d.id} className="px-4 py-3.5 text-sm text-zinc-400">
                          {((repair as any).extraFields || {})[d.fieldName] || '-'}
                        </td>
                      ))}
                      <td className="px-4 py-3.5 text-sm text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => openEdit(repair)} className="text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-lg h-9 px-3 text-sm inline-flex items-center">
                            <Pencil size={14} />
                          </button>
                          <button onClick={() => handleDelete(repair.id)} className="text-zinc-400 hover:text-red-400 hover:bg-zinc-800 rounded-lg h-9 px-3 text-sm inline-flex items-center">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Timeline view */}
      {view === 'timeline' && (
        <div className="space-y-6">
          {timelineGroups.length === 0 ? (
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 text-center">
              <p className="text-sm text-zinc-500">{t('repairs.no_repairs_found')}</p>
            </div>
          ) : (
            timelineGroups.map(([month, repairs]) => (
              <div key={month}>
                <h3 className="text-sm font-medium text-zinc-400 mb-3">{month}</h3>
                <div className="space-y-3">
                  {repairs.map(repair => (
                    <motion.div
                      key={repair.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 flex items-start gap-4"
                    >
                      {/* Timeline dot + line */}
                      <div className="flex flex-col items-center pt-1">
                        <div
                          className="w-3 h-3 rounded-full border-2 border-zinc-700"
                          style={{ backgroundColor: categoryColors[repair.category] || '#71717a' }}
                        />
                        <div className="w-px h-full bg-zinc-800 mt-1" />
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <h4 className="text-sm font-medium text-zinc-50">{repair.description}</h4>
                            <div className="flex items-center gap-3 mt-1 text-xs text-zinc-500">
                              <span>{formatDate(repair.date)}</span>
                              <span className="inline-flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: categoryColors[repair.category] || '#71717a' }} />
                                {repair.category}
                              </span>
                              {repair.workshop && <span>{repair.workshop}</span>}
                              {repair.mileage > 0 && <span>{fmtDistance(repair.mileage)}</span>}
                            </div>
                            {repair.notes && (
                              <p className="text-xs text-zinc-500 mt-1.5">{repair.notes}</p>
                            )}
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <span className="text-sm font-medium text-red-400">{formatCurrency(repair.cost)}</span>
                            <button onClick={() => openEdit(repair)} className="text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-lg h-9 px-3 text-sm inline-flex items-center">
                              <Pencil size={14} />
                            </button>
                            <button onClick={() => handleDelete(repair.id)} className="text-zinc-400 hover:text-red-400 hover:bg-zinc-800 rounded-lg h-9 px-3 text-sm inline-flex items-center">
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-zinc-500">{getVehicleName(repair.vehicleId)}</span>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly bar chart */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
          <h3 className="text-sm font-medium text-zinc-50 mb-5">{t('repairs.monthly_costs')}</h3>
          {monthlyData.length > 0 ? (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                  <XAxis
                    dataKey="month"
                    tick={{ fontSize: 11, fill: '#71717a' }}
                    axisLine={{ stroke: '#3f3f46' }}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: '#71717a' }}
                    axisLine={{ stroke: '#3f3f46' }}
                    tickLine={false}
                    tickFormatter={v => `${v}`}
                  />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#18181b', border: '1px solid #3f3f46', borderRadius: '0.5rem', fontSize: '0.8rem' }}
                    labelStyle={{ color: '#a1a1aa' }}
                    formatter={(val: number) => formatCurrency(val)}
                  />
                  <Bar dataKey="total" name={t('common.cost')} radius={[4, 4, 0, 0]} fill="#f87171" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="text-sm text-zinc-500 text-center py-12">{t('common.no_data')}</p>
          )}
        </div>

        {/* Category pie chart */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
          <h3 className="text-sm font-medium text-zinc-50 mb-5">{t('repairs.by_category')}</h3>
          {categoryPieData.length > 0 ? (
            <div className="h-64 flex items-center">
              <div className="w-1/2 h-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categoryPieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {categoryPieData.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ backgroundColor: '#18181b', border: '1px solid #3f3f46', borderRadius: '0.5rem', fontSize: '0.8rem' }}
                      formatter={(val: number) => formatCurrency(val)}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="w-1/2 space-y-2">
                {categoryPieData.map(d => (
                  <div key={d.name} className="flex items-center justify-between text-sm">
                    <span className="inline-flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: d.color }} />
                      <span className="text-zinc-400">{d.name}</span>
                    </span>
                    <span className="text-zinc-50 font-medium">{formatCurrency(d.value)}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-sm text-zinc-500 text-center py-12">{t('common.no_data')}</p>
          )}
        </div>
      </div>

      {/* Add/Edit Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? t('repairs.edit') : t('repairs.add')}
        size="lg"
        footer={
          <>
            <button onClick={() => setModalOpen(false)} className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg h-10 px-4 text-sm">
              {t('common.cancel')}
            </button>
            <button onClick={handleSave} className="bg-violet-500 hover:bg-violet-400 text-white rounded-lg h-10 px-5 text-sm font-medium">
              {editing ? t('common.save_changes') : t('repairs.add')}
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
                className="w-full h-10 bg-zinc-950 border border-zinc-800 rounded-lg px-3 text-sm text-zinc-50 placeholder:text-zinc-600 outline-none focus:border-violet-500/50"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-2">{t('common.description')}</label>
            <input
              type="text"
              value={form.description}
              onChange={e => setForm({ ...form, description: e.target.value })}
              placeholder={t('repairs.description_placeholder')}
              className="w-full h-10 bg-zinc-950 border border-zinc-800 rounded-lg px-3 text-sm text-zinc-50 placeholder:text-zinc-600 outline-none focus:border-violet-500/50"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-2">{t('common.category')}</label>
              <select
                value={form.category}
                onChange={e => setForm({ ...form, category: e.target.value })}
                className={selectClasses}
                style={{ background: chevronBg }}
              >
                {repairCategories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-2">{t('common.cost')}</label>
              <input
                type="number"
                value={form.cost || ''}
                onChange={e => setForm({ ...form, cost: parseFloat(e.target.value) || 0 })}
                placeholder="0.00"
                className="w-full h-10 bg-zinc-950 border border-zinc-800 rounded-lg px-3 text-sm text-zinc-50 placeholder:text-zinc-600 outline-none focus:border-violet-500/50"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-2">{t('common.mileage')} ({distanceUnit})</label>
              <input
                type="number"
                value={form.mileage || ''}
                onChange={e => setForm({ ...form, mileage: parseInt(e.target.value) || 0 })}
                placeholder="0"
                className="w-full h-10 bg-zinc-950 border border-zinc-800 rounded-lg px-3 text-sm text-zinc-50 placeholder:text-zinc-600 outline-none focus:border-violet-500/50"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-2">{t('repairs.workshop')}</label>
            <input
              type="text"
              value={form.workshop}
              onChange={e => setForm({ ...form, workshop: e.target.value })}
              placeholder={t('repairs.workshop_placeholder')}
              className="w-full h-10 bg-zinc-950 border border-zinc-800 rounded-lg px-3 text-sm text-zinc-50 placeholder:text-zinc-600 outline-none focus:border-violet-500/50"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-2">{t('common.tags')}</label>
            <TagInput
              tags={form.tags || []}
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
              className="w-full min-h-[100px] h-auto bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2.5 text-sm text-zinc-50 placeholder:text-zinc-600 outline-none focus:border-violet-500/50 resize-none"
            />
          </div>

          <ExtraFields
            recordType="repairs"
            values={extraFieldValues}
            onChange={setExtraFieldValues}
            definitions={extraFieldDefs}
          />
        </div>
      </Modal>
    </div>
  );
}
