import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Download, ArrowUpDown, Pencil, Trash2 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import Modal from '../components/Modal';
import { cn } from '../lib/utils';
import {
  formatCurrency,
  toMonthly,
  toYearly,
  getFrequencyLabel,
  getCategoryLabel,
  getCategoryColor,
  getTotalMonthlyCosts,
  getTotalYearlyCosts,
  getCostsByCategory,
  getCostsByPerson,
} from '../utils';
import type { AppState, Cost, CostCategory, CostFrequency } from '../types';

interface Props {
  state: AppState;
  setState: (s: AppState) => void;
}

const categories: CostCategory[] = [
  'steuer', 'versicherung', 'sprit', 'pflege', 'reparatur', 'tuev', 'finanzierung', 'sparen', 'sonstiges',
];

const frequencies: { value: CostFrequency; label: string }[] = [
  { value: 'monatlich', label: 'Monthly' },
  { value: 'quartal', label: 'Quarterly' },
  { value: 'halbjaehrlich', label: 'Semi-annual' },
  { value: 'jaehrlich', label: 'Yearly' },
  { value: 'einmalig', label: 'One-time' },
];

const emptyCost: Omit<Cost, 'id' | 'createdAt'> = {
  vehicleId: '',
  name: '',
  category: 'sonstiges',
  amount: 0,
  frequency: 'monatlich',
  paidBy: '',
  startDate: '',
  endDate: '',
  notes: '',
};

type SortKey = 'name' | 'category' | 'amount' | 'frequency' | 'monthly' | 'paidBy';

export default function Costs({ state, setState }: Props) {
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Cost | null>(null);
  const [form, setForm] = useState(emptyCost);
  const [filterVehicle, setFilterVehicle] = useState('');
  const [filterPerson, setFilterPerson] = useState('');
  const [filterCategories, setFilterCategories] = useState<CostCategory[]>([]);
  const [sortKey, setSortKey] = useState<SortKey>('name');
  const [sortAsc, setSortAsc] = useState(true);

  const filtered = useMemo(() => {
    let items = [...state.costs];
    if (filterVehicle) items = items.filter(c => c.vehicleId === filterVehicle);
    if (filterPerson) items = items.filter(c => c.paidBy === filterPerson);
    if (filterCategories.length > 0) items = items.filter(c => filterCategories.includes(c.category));
    return items;
  }, [state.costs, filterVehicle, filterPerson, filterCategories]);

  const sorted = useMemo(() => {
    const arr = [...filtered];
    arr.sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case 'name': cmp = a.name.localeCompare(b.name); break;
        case 'category': cmp = a.category.localeCompare(b.category); break;
        case 'amount': cmp = a.amount - b.amount; break;
        case 'frequency': cmp = a.frequency.localeCompare(b.frequency); break;
        case 'monthly': cmp = toMonthly(a.amount, a.frequency) - toMonthly(b.amount, b.frequency); break;
        case 'paidBy': cmp = a.paidBy.localeCompare(b.paidBy); break;
      }
      return sortAsc ? cmp : -cmp;
    });
    return arr;
  }, [filtered, sortKey, sortAsc]);

  const monthlyTotal = getTotalMonthlyCosts(filtered);
  const yearlyTotal = getTotalYearlyCosts(filtered);
  const recurringCount = filtered.filter(c => c.frequency !== 'einmalig').length;
  const oneTimeCount = filtered.filter(c => c.frequency === 'einmalig').length;

  const categoryData = useMemo(() => {
    const byCategory = getCostsByCategory(filtered);
    return Object.entries(byCategory)
      .map(([cat, val]) => ({ name: getCategoryLabel(cat), value: val, color: getCategoryColor(cat) }))
      .sort((a, b) => b.value - a.value);
  }, [filtered]);

  const personData = useMemo(() => {
    const byPerson = getCostsByPerson(filtered);
    const personColors = ['#8b5cf6', '#38bdf8', '#34d399', '#fbbf24', '#f87171', '#ec4899'];
    return Object.entries(byPerson)
      .map(([name, val], i) => ({ name, value: val, color: personColors[i % personColors.length] }))
      .sort((a, b) => b.value - a.value);
  }, [filtered]);

  const maxCategoryVal = Math.max(...categoryData.map(d => d.value), 1);
  const maxPersonVal = Math.max(...personData.map(d => d.value), 1);

  const getVehicleName = (id: string) => state.vehicles.find(v => v.id === id)?.name || '-';

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc(!sortAsc);
    else { setSortKey(key); setSortAsc(true); }
  };

  const openAdd = () => {
    setEditing(null);
    setForm({ ...emptyCost, vehicleId: state.vehicles[0]?.id || '', paidBy: state.persons[0]?.name || '' });
    setModalOpen(true);
  };

  const openEdit = (cost: Cost) => {
    setEditing(cost);
    setForm({
      vehicleId: cost.vehicleId,
      name: cost.name,
      category: cost.category,
      amount: cost.amount,
      frequency: cost.frequency,
      paidBy: cost.paidBy,
      startDate: cost.startDate,
      endDate: cost.endDate,
      notes: cost.notes,
    });
    setModalOpen(true);
  };

  const handleSave = () => {
    if (!form.name.trim() || !form.vehicleId) return;
    if (editing) {
      setState({
        ...state,
        costs: state.costs.map(c =>
          c.id === editing.id ? { ...c, ...form } : c
        ),
      });
    } else {
      const newCost: Cost = {
        ...form,
        id: crypto.randomUUID(),
        createdAt: new Date().toISOString(),
      };
      setState({ ...state, costs: [...state.costs, newCost] });
    }
    setModalOpen(false);
  };

  const handleDelete = (id: string) => {
    setState({ ...state, costs: state.costs.filter(c => c.id !== id) });
  };

  const handleExport = () => {
    const header = 'Vehicle,Name,Category,Amount,Frequency,Monthly,Paid By\n';
    const rows = filtered.map(c =>
      `"${getVehicleName(c.vehicleId)}","${c.name}","${getCategoryLabel(c.category)}",${c.amount},"${getFrequencyLabel(c.frequency)}",${toMonthly(c.amount, c.frequency).toFixed(2)},"${c.paidBy}"`
    ).join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'costs.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const toggleCategory = (cat: CostCategory) => {
    setFilterCategories(prev =>
      prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]
    );
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
      {/* Header row */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-zinc-400">Manage recurring and one-time vehicle expenses across all your vehicles.</p>
        <div className="flex items-center gap-3">
          <button onClick={handleExport} className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg h-10 px-4 text-sm inline-flex items-center gap-2">
            <Download size={16} />
            Export
          </button>
          <button onClick={openAdd} className="bg-violet-500 hover:bg-violet-400 text-white rounded-lg h-10 px-5 text-sm font-medium inline-flex items-center gap-2">
            <Plus size={16} />
            Add Cost
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Monthly Total', value: formatCurrency(monthlyTotal), color: 'text-violet-400' },
          { label: 'Yearly Total', value: formatCurrency(yearlyTotal), color: 'text-sky-400' },
          { label: 'Recurring', value: String(recurringCount), color: 'text-emerald-400' },
          { label: 'One-time', value: String(oneTimeCount), color: 'text-amber-400' },
        ].map(s => (
          <div key={s.label}>
            <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">{s.label}</p>
            <p className={cn('text-2xl font-semibold', s.color)}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Filter card */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
          <div>
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
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-2">Paid By</label>
            <select
              value={filterPerson}
              onChange={e => setFilterPerson(e.target.value)}
              className={selectClasses}
              style={{ background: chevronBg }}
            >
              <option value="">All Persons</option>
              {state.persons.map(p => (
                <option key={p.id} value={p.name}>{p.name}</option>
              ))}
            </select>
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-400 mb-2">Categories</label>
          <div className="flex flex-wrap gap-2">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => toggleCategory(cat)}
                className={cn(
                  'px-3 h-8 rounded-full text-xs font-medium transition-colors border',
                  filterCategories.includes(cat)
                    ? 'border-violet-500 bg-violet-500/10 text-violet-400'
                    : 'border-zinc-700 bg-zinc-800 text-zinc-400 hover:border-zinc-600'
                )}
              >
                {getCategoryLabel(cat)}
              </button>
            ))}
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
                <SortHeader label="Name" col="name" />
                <SortHeader label="Category" col="category" />
                <SortHeader label="Amount" col="amount" />
                <SortHeader label="Frequency" col="frequency" />
                <SortHeader label="Monthly" col="monthly" />
                <SortHeader label="Paid By" col="paidBy" />
                <th className="px-4 py-3 text-xs text-zinc-500 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {sorted.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-sm text-zinc-500">
                    No costs found. Add your first cost to get started.
                  </td>
                </tr>
              ) : (
                sorted.map(cost => (
                  <motion.tr
                    key={cost.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="border-b border-zinc-800/50 hover:bg-zinc-800/30 transition-colors"
                  >
                    <td className="px-4 py-3.5 text-sm text-zinc-400">{getVehicleName(cost.vehicleId)}</td>
                    <td className="px-4 py-3.5 text-sm text-zinc-50 font-medium">{cost.name}</td>
                    <td className="px-4 py-3.5 text-sm">
                      <span className="inline-flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: getCategoryColor(cost.category) }} />
                        <span className="text-zinc-300">{getCategoryLabel(cost.category)}</span>
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-sm text-zinc-50">{formatCurrency(cost.amount)}</td>
                    <td className="px-4 py-3.5 text-sm text-zinc-400">{getFrequencyLabel(cost.frequency)}</td>
                    <td className="px-4 py-3.5 text-sm text-violet-400 font-medium">{formatCurrency(toMonthly(cost.amount, cost.frequency))}</td>
                    <td className="px-4 py-3.5 text-sm text-zinc-400">{cost.paidBy || '-'}</td>
                    <td className="px-4 py-3.5 text-sm text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => openEdit(cost)} className="text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-lg h-9 px-3 text-sm inline-flex items-center">
                          <Pencil size={14} />
                        </button>
                        <button onClick={() => handleDelete(cost.id)} className="text-zinc-400 hover:text-red-400 hover:bg-zinc-800 rounded-lg h-9 px-3 text-sm inline-flex items-center">
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

      {/* Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Category breakdown */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
          <h3 className="text-sm font-medium text-zinc-50 mb-5">By Category (Monthly)</h3>
          <div className="space-y-3">
            {categoryData.map(d => (
              <div key={d.name}>
                <div className="flex items-center justify-between text-sm mb-1.5">
                  <span className="text-zinc-400">{d.name}</span>
                  <span className="text-zinc-50 font-medium">{formatCurrency(d.value)}</span>
                </div>
                <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full rounded-full"
                    style={{ backgroundColor: d.color }}
                    initial={{ width: 0 }}
                    animate={{ width: `${(d.value / maxCategoryVal) * 100}%` }}
                    transition={{ duration: 0.5 }}
                  />
                </div>
              </div>
            ))}
            {categoryData.length === 0 && (
              <p className="text-sm text-zinc-500 text-center py-4">No data</p>
            )}
          </div>
        </div>

        {/* Person breakdown */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
          <h3 className="text-sm font-medium text-zinc-50 mb-5">By Person (Monthly)</h3>
          <div className="space-y-3">
            {personData.map(d => (
              <div key={d.name}>
                <div className="flex items-center justify-between text-sm mb-1.5">
                  <span className="text-zinc-400">{d.name}</span>
                  <span className="text-zinc-50 font-medium">{formatCurrency(d.value)}</span>
                </div>
                <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full rounded-full"
                    style={{ backgroundColor: d.color }}
                    initial={{ width: 0 }}
                    animate={{ width: `${(d.value / maxPersonVal) * 100}%` }}
                    transition={{ duration: 0.5 }}
                  />
                </div>
              </div>
            ))}
            {personData.length === 0 && (
              <p className="text-sm text-zinc-500 text-center py-4">No data</p>
            )}
          </div>
        </div>
      </div>

      {/* Add/Edit Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Edit Cost' : 'Add Cost'}
        size="lg"
        footer={
          <>
            <button onClick={() => setModalOpen(false)} className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg h-10 px-4 text-sm">
              Cancel
            </button>
            <button onClick={handleSave} className="bg-violet-500 hover:bg-violet-400 text-white rounded-lg h-10 px-5 text-sm font-medium">
              {editing ? 'Save Changes' : 'Add Cost'}
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
              <label className="block text-sm font-medium text-zinc-400 mb-2">Name</label>
              <input
                type="text"
                value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. Liability Insurance"
                className="w-full h-10 bg-zinc-950 border border-zinc-800 rounded-lg px-3 text-sm text-zinc-50 placeholder:text-zinc-600 outline-none focus:border-violet-500/50"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-2">Category</label>
              <select
                value={form.category}
                onChange={e => setForm({ ...form, category: e.target.value as CostCategory })}
                className={selectClasses}
                style={{ background: chevronBg }}
              >
                {categories.map(cat => (
                  <option key={cat} value={cat}>{getCategoryLabel(cat)}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-2">Frequency</label>
              <select
                value={form.frequency}
                onChange={e => setForm({ ...form, frequency: e.target.value as CostFrequency })}
                className={selectClasses}
                style={{ background: chevronBg }}
              >
                {frequencies.map(f => (
                  <option key={f.value} value={f.value}>{f.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-2">Amount</label>
              <input
                type="number"
                value={form.amount || ''}
                onChange={e => setForm({ ...form, amount: parseFloat(e.target.value) || 0 })}
                placeholder="0.00"
                className="w-full h-10 bg-zinc-950 border border-zinc-800 rounded-lg px-3 text-sm text-zinc-50 placeholder:text-zinc-600 outline-none focus:border-violet-500/50"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-2">Paid By</label>
              <select
                value={form.paidBy}
                onChange={e => setForm({ ...form, paidBy: e.target.value })}
                className={selectClasses}
                style={{ background: chevronBg }}
              >
                <option value="">Select person</option>
                {state.persons.map(p => (
                  <option key={p.id} value={p.name}>{p.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-2">Start Date</label>
              <input
                type="date"
                value={form.startDate}
                onChange={e => setForm({ ...form, startDate: e.target.value })}
                className="w-full h-10 bg-zinc-950 border border-zinc-800 rounded-lg px-3 text-sm text-zinc-50 placeholder:text-zinc-600 outline-none focus:border-violet-500/50"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-2">End Date</label>
              <input
                type="date"
                value={form.endDate}
                onChange={e => setForm({ ...form, endDate: e.target.value })}
                className="w-full h-10 bg-zinc-950 border border-zinc-800 rounded-lg px-3 text-sm text-zinc-50 placeholder:text-zinc-600 outline-none focus:border-violet-500/50"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-2">Notes</label>
            <textarea
              value={form.notes}
              onChange={e => setForm({ ...form, notes: e.target.value })}
              placeholder="Optional notes..."
              className="w-full min-h-[100px] h-auto bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2.5 text-sm text-zinc-50 placeholder:text-zinc-600 outline-none focus:border-violet-500/50 resize-none"
            />
          </div>
        </div>
      </Modal>
    </div>
  );
}
