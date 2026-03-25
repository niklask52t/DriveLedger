import { useState, useMemo } from 'react';
import { v4 as uuidv4 } from 'uuid';
import {
  Plus, Pencil, Trash2, Filter, Download, ArrowUpDown,
  DollarSign, CalendarDays, TrendingUp, Users
} from 'lucide-react';
import Modal from '../components/Modal';
import type { AppState, Cost, CostCategory, CostFrequency } from '../types';
import {
  formatCurrency, toMonthly,
  getCategoryLabel, getCategoryColor, getFrequencyLabel,
  getTotalMonthlyCosts, getTotalYearlyCosts, getCostsByCategory, getCostsByPerson
} from '../utils';

interface CostsProps {
  state: AppState;
  setState: (state: AppState) => void;
}

const CATEGORIES: CostCategory[] = [
  'steuer', 'versicherung', 'sprit', 'pflege', 'reparatur',
  'tuev', 'finanzierung', 'sparen', 'sonstiges'
];

const FREQUENCIES: CostFrequency[] = [
  'monatlich', 'quartal', 'halbjaehrlich', 'jaehrlich', 'einmalig'
];

const inputClass = 'w-full bg-dark-900 border border-dark-600 rounded-lg px-3 py-2 text-dark-100 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none';
const labelClass = 'block text-sm font-medium text-dark-300 mb-1';

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

type SortKey = 'vehicle' | 'name' | 'category' | 'amount' | 'frequency' | 'monthly' | 'paidBy';
type SortDir = 'asc' | 'desc';

export default function Costs({ state, setState }: CostsProps) {
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyCost);
  const [filterVehicle, setFilterVehicle] = useState('all');
  const [filterCategories, setFilterCategories] = useState<CostCategory[]>([]);
  const [filterPerson, setFilterPerson] = useState('all');
  const [sortKey, setSortKey] = useState<SortKey>('name');
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  const getVehicleName = (id: string) => {
    const v = state.vehicles.find(vh => vh.id === id);
    return v ? `${v.brand} ${v.model}` : 'Unknown';
  };

  const getPersonName = (id: string) => {
    const p = state.persons.find(pe => pe.id === id);
    return p ? p.name : id;
  };

  const filteredCosts = useMemo(() => {
    let costs = [...state.costs];
    if (filterVehicle !== 'all') costs = costs.filter(c => c.vehicleId === filterVehicle);
    if (filterCategories.length > 0) costs = costs.filter(c => filterCategories.includes(c.category));
    if (filterPerson !== 'all') costs = costs.filter(c => c.paidBy === filterPerson);
    return costs;
  }, [state.costs, filterVehicle, filterCategories, filterPerson]);

  const sortedCosts = useMemo(() => {
    const sorted = [...filteredCosts];
    sorted.sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case 'vehicle': cmp = getVehicleName(a.vehicleId).localeCompare(getVehicleName(b.vehicleId)); break;
        case 'name': cmp = a.name.localeCompare(b.name); break;
        case 'category': cmp = getCategoryLabel(a.category).localeCompare(getCategoryLabel(b.category)); break;
        case 'amount': cmp = a.amount - b.amount; break;
        case 'frequency': cmp = a.frequency.localeCompare(b.frequency); break;
        case 'monthly': cmp = toMonthly(a.amount, a.frequency) - toMonthly(b.amount, b.frequency); break;
        case 'paidBy': cmp = getPersonName(a.paidBy).localeCompare(getPersonName(b.paidBy)); break;
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return sorted;
  }, [filteredCosts, sortKey, sortDir]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
  };

  const totalMonthly = getTotalMonthlyCosts(filteredCosts);
  const totalYearly = getTotalYearlyCosts(filteredCosts);
  const oneTimeCosts = filteredCosts.filter(c => c.frequency === 'einmalig').reduce((sum, c) => sum + c.amount, 0);
  const recurringCount = filteredCosts.filter(c => c.frequency !== 'einmalig').length;
  const categoryBreakdown = getCostsByCategory(filteredCosts);
  const categoryTotal = Object.values(categoryBreakdown).reduce((s, v) => s + v, 0);
  const personBreakdown = getCostsByPerson(filteredCosts);

  const openAddModal = () => {
    setEditingId(null);
    setForm({
      ...emptyCost,
      vehicleId: state.vehicles[0]?.id || '',
      paidBy: state.persons[0]?.id || '',
      startDate: new Date().toISOString().split('T')[0],
    });
    setShowModal(true);
  };

  const openEditModal = (cost: Cost) => {
    setEditingId(cost.id);
    setForm({
      vehicleId: cost.vehicleId, name: cost.name, category: cost.category,
      amount: cost.amount, frequency: cost.frequency, paidBy: cost.paidBy,
      startDate: cost.startDate, endDate: cost.endDate, notes: cost.notes,
    });
    setShowModal(true);
  };

  const handleSave = () => {
    if (!form.name || !form.vehicleId || form.amount <= 0) return;
    if (editingId) {
      setState({ ...state, costs: state.costs.map(c => c.id === editingId ? { ...c, ...form } : c) });
    } else {
      const newCost: Cost = { id: uuidv4(), ...form, createdAt: new Date().toISOString() };
      setState({ ...state, costs: [...state.costs, newCost] });
    }
    setShowModal(false);
  };

  const handleDelete = (id: string) => {
    setState({ ...state, costs: state.costs.filter(c => c.id !== id) });
  };

  const toggleCategoryFilter = (cat: CostCategory) => {
    setFilterCategories(prev => prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]);
  };

  const exportCosts = () => {
    const header = 'Vehicle,Name,Category,Amount,Frequency,Monthly,Paid By,Start,End,Notes';
    const rows = filteredCosts.map(c => [
      getVehicleName(c.vehicleId), c.name, getCategoryLabel(c.category), c.amount,
      getFrequencyLabel(c.frequency), toMonthly(c.amount, c.frequency).toFixed(2),
      getPersonName(c.paidBy), c.startDate, c.endDate, '"' + c.notes.replace(/"/g, '""') + '"',
    ].join(','));
    const csv = [header, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'driveledger-costs.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  const SortHeader = ({ label, sortKeyName }: { label: string; sortKeyName: SortKey }) => (
    <th
      className="px-4 py-3 text-left text-xs font-medium text-dark-400 uppercase tracking-wider cursor-pointer hover:text-dark-200 transition-colors select-none"
      onClick={() => toggleSort(sortKeyName)}
    >
      <div className="flex items-center gap-1">
        {label}
        <ArrowUpDown size={12} className={sortKey === sortKeyName ? 'text-primary-400' : 'text-dark-600'} />
      </div>
    </th>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-dark-50">Costs</h1>
          <p className="text-dark-400 mt-1">Manage and track all vehicle-related expenses</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={exportCosts} className="flex items-center gap-2 px-4 py-2.5 bg-dark-800 border border-dark-600 text-dark-200 rounded-xl hover:bg-dark-700 transition-colors">
            <Download size={16} /> Export CSV
          </button>
          <button onClick={openAddModal} className="flex items-center gap-2 px-4 py-2.5 bg-primary-600 text-white rounded-xl hover:bg-primary-500 transition-colors font-medium">
            <Plus size={18} /> Add Cost
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-dark-800 border border-dark-700 rounded-xl p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2.5 bg-primary-500/10 rounded-lg"><DollarSign size={20} className="text-primary-400" /></div>
            <span className="text-sm text-dark-400">Total Monthly</span>
          </div>
          <p className="text-2xl font-bold text-dark-50">{formatCurrency(totalMonthly)}</p>
        </div>
        <div className="bg-dark-800 border border-dark-700 rounded-xl p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2.5 bg-accent/10 rounded-lg"><CalendarDays size={20} className="text-accent" /></div>
            <span className="text-sm text-dark-400">Total Yearly</span>
          </div>
          <p className="text-2xl font-bold text-dark-50">{formatCurrency(totalYearly)}</p>
        </div>
        <div className="bg-dark-800 border border-dark-700 rounded-xl p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2.5 bg-success/10 rounded-lg"><TrendingUp size={20} className="text-success" /></div>
            <span className="text-sm text-dark-400">Recurring Costs</span>
          </div>
          <p className="text-2xl font-bold text-dark-50">{recurringCount}</p>
          <p className="text-xs text-dark-500 mt-1">active entries</p>
        </div>
        <div className="bg-dark-800 border border-dark-700 rounded-xl p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2.5 bg-warning/10 rounded-lg"><DollarSign size={20} className="text-warning" /></div>
            <span className="text-sm text-dark-400">One-time Costs</span>
          </div>
          <p className="text-2xl font-bold text-dark-50">{formatCurrency(oneTimeCosts)}</p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-dark-800 border border-dark-700 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-3 text-dark-400">
          <Filter size={16} /><span className="text-sm font-medium">Filters</span>
        </div>
        <div className="flex flex-wrap items-end gap-4">
          <div className="min-w-[180px]">
            <label className="block text-xs text-dark-500 mb-1">Vehicle</label>
            <select value={filterVehicle} onChange={e => setFilterVehicle(e.target.value)} className={inputClass}>
              <option value="all">All Vehicles</option>
              {state.vehicles.map(v => <option key={v.id} value={v.id}>{v.brand} {v.model}</option>)}
            </select>
          </div>
          <div className="min-w-[160px]">
            <label className="block text-xs text-dark-500 mb-1">Paid By</label>
            <select value={filterPerson} onChange={e => setFilterPerson(e.target.value)} className={inputClass}>
              <option value="all">All Persons</option>
              {state.persons.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div className="flex-1">
            <label className="block text-xs text-dark-500 mb-1">Categories</label>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map(cat => (
                <button key={cat} onClick={() => toggleCategoryFilter(cat)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
                    filterCategories.length === 0 || filterCategories.includes(cat)
                      ? 'bg-dark-700 border-dark-500 text-dark-100'
                      : 'bg-dark-900 border-dark-700 text-dark-500'
                  }`}>
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: getCategoryColor(cat) }} />
                  {getCategoryLabel(cat)}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Costs Table */}
      <div className="bg-dark-800 border border-dark-700 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-dark-850 border-b border-dark-700">
              <tr>
                <SortHeader label="Vehicle" sortKeyName="vehicle" />
                <SortHeader label="Name" sortKeyName="name" />
                <SortHeader label="Category" sortKeyName="category" />
                <SortHeader label="Amount" sortKeyName="amount" />
                <SortHeader label="Frequency" sortKeyName="frequency" />
                <SortHeader label="Monthly" sortKeyName="monthly" />
                <SortHeader label="Paid By" sortKeyName="paidBy" />
                <th className="px-4 py-3 text-right text-xs font-medium text-dark-400 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-dark-700/50">
              {sortedCosts.length === 0 ? (
                <tr><td colSpan={8} className="px-4 py-12 text-center text-dark-500">No costs found. Add your first cost to get started.</td></tr>
              ) : sortedCosts.map(cost => {
                const person = state.persons.find(p => p.id === cost.paidBy);
                return (
                  <tr key={cost.id} className="hover:bg-dark-850/50 transition-colors">
                    <td className="px-4 py-3 text-sm text-dark-200">{getVehicleName(cost.vehicleId)}</td>
                    <td className="px-4 py-3 text-sm font-medium text-dark-100">{cost.name}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: getCategoryColor(cost.category) }} />
                        <span className="text-sm text-dark-200">{getCategoryLabel(cost.category)}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-dark-100 font-medium">{formatCurrency(cost.amount)}</td>
                    <td className="px-4 py-3 text-sm text-dark-300">{getFrequencyLabel(cost.frequency)}</td>
                    <td className="px-4 py-3 text-sm text-primary-400 font-medium">
                      {cost.frequency === 'einmalig' ? '-' : formatCurrency(toMonthly(cost.amount, cost.frequency))}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {person && <span className="w-2 h-2 rounded-full" style={{ backgroundColor: person.color }} />}
                        <span className="text-sm text-dark-200">{getPersonName(cost.paidBy)}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => openEditModal(cost)} className="p-1.5 rounded-lg text-dark-400 hover:text-primary-400 hover:bg-dark-700 transition-colors"><Pencil size={15} /></button>
                        <button onClick={() => handleDelete(cost.id)} className="p-1.5 rounded-lg text-dark-400 hover:text-danger hover:bg-dark-700 transition-colors"><Trash2 size={15} /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Breakdown Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Category Breakdown */}
        <div className="bg-dark-800 border border-dark-700 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-dark-100 mb-4">Cost by Category</h3>
          {categoryTotal === 0 ? (
            <p className="text-dark-500 text-sm">No recurring costs to display.</p>
          ) : (
            <div className="space-y-3">
              {Object.entries(categoryBreakdown)
                .sort(([, a], [, b]) => b - a)
                .map(([cat, amount]) => {
                  const pct = (amount / categoryTotal) * 100;
                  return (
                    <div key={cat}>
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <span className="w-3 h-3 rounded-full" style={{ backgroundColor: getCategoryColor(cat) }} />
                          <span className="text-sm text-dark-200">{getCategoryLabel(cat)}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-medium text-dark-100">{formatCurrency(amount)}/mo</span>
                          <span className="text-xs text-dark-400 w-12 text-right">{pct.toFixed(1)}%</span>
                        </div>
                      </div>
                      <div className="h-2 bg-dark-900 rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: getCategoryColor(cat) }} />
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </div>

        {/* Person Breakdown */}
        <div className="bg-dark-800 border border-dark-700 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-dark-100 mb-4">Cost by Person</h3>
          {Object.keys(personBreakdown).length === 0 ? (
            <p className="text-dark-500 text-sm">No recurring costs to display.</p>
          ) : (
            <div className="space-y-4">
              {Object.entries(personBreakdown)
                .sort(([, a], [, b]) => b - a)
                .map(([personId, amount]) => {
                  const person = state.persons.find(p => p.id === personId);
                  const totalPersons = Object.values(personBreakdown).reduce((s, v) => s + v, 0);
                  const pct = totalPersons > 0 ? (amount / totalPersons) * 100 : 0;
                  return (
                    <div key={personId} className="flex items-center gap-4">
                      <div className="flex items-center gap-2 min-w-[120px]">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
                          style={{ backgroundColor: person?.color || '#6b7280' }}>
                          {(person?.name || personId).charAt(0).toUpperCase()}
                        </div>
                        <span className="text-sm font-medium text-dark-100">{person?.name || personId}</span>
                      </div>
                      <div className="flex-1">
                        <div className="h-2.5 bg-dark-900 rounded-full overflow-hidden">
                          <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: person?.color || '#6b7280' }} />
                        </div>
                      </div>
                      <div className="text-right min-w-[100px]">
                        <p className="text-sm font-medium text-dark-100">{formatCurrency(amount)}/mo</p>
                        <p className="text-xs text-dark-400">{pct.toFixed(1)}%</p>
                      </div>
                    </div>
                  );
                })}
              <div className="pt-3 border-t border-dark-700 flex items-center justify-between">
                <span className="text-sm text-dark-400 flex items-center gap-2"><Users size={14} /> Total across all persons</span>
                <span className="text-sm font-semibold text-dark-100">{formatCurrency(Object.values(personBreakdown).reduce((s, v) => s + v, 0))}/mo</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Add/Edit Cost Modal */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editingId ? 'Edit Cost' : 'Add Cost'}>
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Vehicle *</label>
              <select value={form.vehicleId} onChange={e => setForm({ ...form, vehicleId: e.target.value })} className={inputClass}>
                <option value="">Select vehicle...</option>
                {state.vehicles.map(v => <option key={v.id} value={v.id}>{v.brand} {v.model}</option>)}
              </select>
            </div>
            <div>
              <label className={labelClass}>Name *</label>
              <input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className={inputClass} placeholder="e.g. Car Insurance" />
            </div>
            <div>
              <label className={labelClass}>Category</label>
              <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value as CostCategory })} className={inputClass}>
                {CATEGORIES.map(cat => <option key={cat} value={cat}>{getCategoryLabel(cat)}</option>)}
              </select>
            </div>
            <div>
              <label className={labelClass}>Amount (EUR) *</label>
              <input type="number" value={form.amount || ''} onChange={e => setForm({ ...form, amount: parseFloat(e.target.value) || 0 })} className={inputClass} placeholder="0.00" min="0" step="0.01" />
            </div>
            <div>
              <label className={labelClass}>Frequency</label>
              <select value={form.frequency} onChange={e => setForm({ ...form, frequency: e.target.value as CostFrequency })} className={inputClass}>
                {FREQUENCIES.map(freq => <option key={freq} value={freq}>{getFrequencyLabel(freq)}</option>)}
              </select>
            </div>
            <div>
              <label className={labelClass}>Paid By</label>
              <select value={form.paidBy} onChange={e => setForm({ ...form, paidBy: e.target.value })} className={inputClass}>
                <option value="">Select person...</option>
                {state.persons.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div>
              <label className={labelClass}>Start Date</label>
              <input type="date" value={form.startDate} onChange={e => setForm({ ...form, startDate: e.target.value })} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>End Date (optional)</label>
              <input type="date" value={form.endDate} onChange={e => setForm({ ...form, endDate: e.target.value })} className={inputClass} />
            </div>
          </div>
          <div>
            <label className={labelClass}>Notes</label>
            <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} className={`${inputClass} resize-none`} rows={3} placeholder="Optional notes..." />
          </div>
          {form.amount > 0 && form.frequency !== 'einmalig' && (
            <div className="bg-dark-900 border border-dark-700 rounded-lg p-3 flex items-center justify-between">
              <span className="text-sm text-dark-400">Monthly equivalent</span>
              <span className="text-sm font-semibold text-primary-400">{formatCurrency(toMonthly(form.amount, form.frequency))}</span>
            </div>
          )}
          <div className="flex justify-end gap-3 pt-2">
            <button onClick={() => setShowModal(false)} className="px-4 py-2.5 bg-dark-700 text-dark-200 rounded-xl hover:bg-dark-600 transition-colors">Cancel</button>
            <button onClick={handleSave} disabled={!form.name || !form.vehicleId || form.amount <= 0}
              className="px-6 py-2.5 bg-primary-600 text-white rounded-xl hover:bg-primary-500 transition-colors font-medium disabled:opacity-40 disabled:cursor-not-allowed">
              {editingId ? 'Save Changes' : 'Add Cost'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
