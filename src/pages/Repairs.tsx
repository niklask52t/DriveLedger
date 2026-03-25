import { useState, useMemo } from 'react';
import {
  Wrench, Plus, Trash2, Edit3, Filter, DollarSign,
  Hash, TrendingUp, AlertTriangle, Clock, MapPin, Gauge
} from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';
import { format, parseISO } from 'date-fns';
import Modal from '../components/Modal';
import { formatCurrency, formatDate, getTotalRepairCosts, formatNumber } from '../utils';
import type { AppState, Repair } from '../types';

interface RepairsProps {
  state: AppState;
  setState: (state: AppState) => void;
}

const inputClass = 'w-full bg-dark-900 border border-dark-600 rounded-lg px-3 py-2 text-dark-100 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none';

const REPAIR_CATEGORIES = [
  'Service', 'Brakes', 'Engine', 'Tires', 'Electrical', 'Body', 'Suspension', 'Other'
] as const;

const CATEGORY_COLORS: Record<string, string> = {
  Service: '#3b82f6',
  Brakes: '#ef4444',
  Engine: '#f97316',
  Tires: '#6b7280',
  Electrical: '#eab308',
  Body: '#8b5cf6',
  Suspension: '#06b6d4',
  Other: '#a855f7',
};

const emptyRepair: Omit<Repair, 'id' | 'createdAt'> = {
  vehicleId: '',
  date: new Date().toISOString().split('T')[0],
  description: '',
  category: 'Service',
  notes: '',
  cost: 0,
  mileage: 0,
  workshop: '',
};

export default function Repairs({ state, setState }: RepairsProps) {
  const [showRepairModal, setShowRepairModal] = useState(false);
  const [editingRepair, setEditingRepair] = useState<Repair | null>(null);
  const [repairForm, setRepairForm] = useState(emptyRepair);
  const [filterVehicle, setFilterVehicle] = useState<string>('');
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'table' | 'timeline'>('table');

  const vehicles = state.vehicles;
  const allRepairs = state.repairs;

  // Filtered repairs
  const repairs = useMemo(
    () => {
      const filtered = filterVehicle
        ? allRepairs.filter(r => r.vehicleId === filterVehicle)
        : allRepairs;
      return [...filtered].sort((a, b) => b.date.localeCompare(a.date));
    },
    [allRepairs, filterVehicle]
  );

  // Summary stats
  const totalCost = getTotalRepairCosts(repairs);
  const avgCost = repairs.length > 0 ? totalCost / repairs.length : 0;
  const mostExpensive = repairs.length > 0
    ? repairs.reduce((max, r) => r.cost > max.cost ? r : max, repairs[0])
    : null;

  // Monthly cost chart data
  const monthlyCostData = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of repairs) {
      try {
        const key = format(parseISO(r.date), 'yyyy-MM');
        map.set(key, (map.get(key) || 0) + r.cost);
      } catch { /* skip invalid dates */ }
    }
    return Array.from(map.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .slice(-12)
      .map(([month, cost]) => ({
        month: format(parseISO(month + '-01'), 'MMM yy'),
        cost: Math.round(cost * 100) / 100,
      }));
  }, [repairs]);

  // Category breakdown
  const categoryData = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of repairs) {
      map.set(r.category, (map.get(r.category) || 0) + r.cost);
    }
    return Array.from(map.entries())
      .map(([name, value]) => ({ name, value: Math.round(value * 100) / 100 }))
      .sort((a, b) => b.value - a.value);
  }, [repairs]);

  // Helpers
  const getVehicleName = (id: string) => vehicles.find(v => v.id === id)?.name || 'Unknown';

  // CRUD
  const openAddRepair = () => {
    setEditingRepair(null);
    setRepairForm({ ...emptyRepair, vehicleId: filterVehicle || (vehicles.length > 0 ? vehicles[0].id : '') });
    setShowRepairModal(true);
  };

  const openEditRepair = (repair: Repair) => {
    setEditingRepair(repair);
    setRepairForm({
      vehicleId: repair.vehicleId,
      date: repair.date,
      description: repair.description,
      category: repair.category,
      notes: repair.notes,
      cost: repair.cost,
      mileage: repair.mileage,
      workshop: repair.workshop,
    });
    setShowRepairModal(true);
  };

  const saveRepair = () => {
    if (!repairForm.description.trim() || !repairForm.vehicleId) return;
    if (editingRepair) {
      setState({
        ...state,
        repairs: allRepairs.map(r =>
          r.id === editingRepair.id ? { ...r, ...repairForm } : r
        ),
      });
    } else {
      const newRepair: Repair = {
        ...repairForm,
        id: uuidv4(),
        createdAt: new Date().toISOString(),
      };
      setState({ ...state, repairs: [...allRepairs, newRepair] });
    }
    setShowRepairModal(false);
  };

  const deleteRepair = (id: string) => {
    setState({ ...state, repairs: allRepairs.filter(r => r.id !== id) });
    setDeleteConfirm(null);
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-dark-800 border border-dark-700 rounded-xl p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2.5 rounded-lg bg-red-500/15">
              <DollarSign size={20} className="text-red-400" />
            </div>
            <span className="text-sm text-dark-400">Total Repair Costs</span>
          </div>
          <p className="text-2xl font-bold text-dark-50">{formatCurrency(totalCost)}</p>
        </div>

        <div className="bg-dark-800 border border-dark-700 rounded-xl p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2.5 rounded-lg bg-orange-500/15">
              <Hash size={20} className="text-orange-400" />
            </div>
            <span className="text-sm text-dark-400">Number of Repairs</span>
          </div>
          <p className="text-2xl font-bold text-dark-50">{repairs.length}</p>
        </div>

        <div className="bg-dark-800 border border-dark-700 rounded-xl p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2.5 rounded-lg bg-blue-500/15">
              <TrendingUp size={20} className="text-blue-400" />
            </div>
            <span className="text-sm text-dark-400">Average Cost</span>
          </div>
          <p className="text-2xl font-bold text-dark-50">{formatCurrency(avgCost)}</p>
        </div>

        <div className="bg-dark-800 border border-dark-700 rounded-xl p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2.5 rounded-lg bg-yellow-500/15">
              <AlertTriangle size={20} className="text-yellow-400" />
            </div>
            <span className="text-sm text-dark-400">Most Expensive</span>
          </div>
          <p className="text-2xl font-bold text-dark-50">
            {mostExpensive ? formatCurrency(mostExpensive.cost) : '-'}
          </p>
          {mostExpensive && (
            <p className="text-xs text-dark-500 mt-1 truncate">{mostExpensive.description}</p>
          )}
        </div>
      </div>

      {/* Toolbar: Filter + View Toggle + Add */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <Filter size={16} className="text-dark-400" />
          <select
            value={filterVehicle}
            onChange={e => setFilterVehicle(e.target.value)}
            className={inputClass + ' !w-auto min-w-[180px]'}
          >
            <option value="">All Vehicles</option>
            {vehicles.map(v => (
              <option key={v.id} value={v.id}>{v.name}</option>
            ))}
          </select>
        </div>

        <div className="flex items-center bg-dark-800 border border-dark-700 rounded-lg overflow-hidden">
          <button
            onClick={() => setViewMode('table')}
            className={`px-3 py-2 text-sm font-medium transition-colors cursor-pointer ${
              viewMode === 'table' ? 'bg-primary-600 text-white' : 'text-dark-400 hover:text-dark-200'
            }`}
          >
            Table
          </button>
          <button
            onClick={() => setViewMode('timeline')}
            className={`px-3 py-2 text-sm font-medium transition-colors cursor-pointer ${
              viewMode === 'timeline' ? 'bg-primary-600 text-white' : 'text-dark-400 hover:text-dark-200'
            }`}
          >
            Timeline
          </button>
        </div>

        <div className="ml-auto">
          <button
            onClick={openAddRepair}
            className="flex items-center gap-2 px-4 py-2.5 bg-primary-600 hover:bg-primary-500 text-white rounded-lg font-medium text-sm transition-colors cursor-pointer"
          >
            <Plus size={18} />
            Add Repair
          </button>
        </div>
      </div>

      {/* Repairs List */}
      {repairs.length === 0 ? (
        <div className="text-center py-16 text-dark-500">
          <Wrench size={48} className="mx-auto mb-4 opacity-40" />
          <p className="text-lg">No repairs recorded</p>
          <p className="text-sm mt-1">Add your first repair to start tracking maintenance costs</p>
        </div>
      ) : viewMode === 'table' ? (
        /* Table View */
        <div className="bg-dark-800 border border-dark-700 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-dark-700">
                  <th className="text-left px-4 py-3 text-dark-400 font-medium">Date</th>
                  <th className="text-left px-4 py-3 text-dark-400 font-medium">Vehicle</th>
                  <th className="text-left px-4 py-3 text-dark-400 font-medium">Description</th>
                  <th className="text-left px-4 py-3 text-dark-400 font-medium">Category</th>
                  <th className="text-left px-4 py-3 text-dark-400 font-medium">Workshop</th>
                  <th className="text-right px-4 py-3 text-dark-400 font-medium">Mileage</th>
                  <th className="text-right px-4 py-3 text-dark-400 font-medium">Cost</th>
                  <th className="text-right px-4 py-3 text-dark-400 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {repairs.map(repair => (
                  <tr
                    key={repair.id}
                    className="border-b border-dark-700/50 hover:bg-dark-850 transition-colors"
                  >
                    <td className="px-4 py-3 text-dark-200 whitespace-nowrap">{formatDate(repair.date)}</td>
                    <td className="px-4 py-3 text-dark-300">{getVehicleName(repair.vehicleId)}</td>
                    <td className="px-4 py-3 text-dark-100 font-medium max-w-[200px] truncate">
                      {repair.description}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
                        style={{
                          backgroundColor: (CATEGORY_COLORS[repair.category] || '#6b7280') + '20',
                          color: CATEGORY_COLORS[repair.category] || '#9ca3af',
                        }}
                      >
                        {repair.category}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-dark-400">
                      {repair.workshop && (
                        <span className="flex items-center gap-1">
                          <MapPin size={12} />
                          {repair.workshop}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-dark-300 text-right whitespace-nowrap">
                      {repair.mileage > 0 && (
                        <span className="flex items-center justify-end gap-1">
                          <Gauge size={12} />
                          {formatNumber(repair.mileage)} km
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-dark-50 whitespace-nowrap">
                      {formatCurrency(repair.cost)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => openEditRepair(repair)}
                          className="p-1.5 rounded-lg text-dark-400 hover:text-dark-200 hover:bg-dark-700 transition-colors cursor-pointer"
                        >
                          <Edit3 size={15} />
                        </button>
                        {deleteConfirm === repair.id ? (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => deleteRepair(repair.id)}
                              className="px-2 py-1 text-xs bg-red-600 text-white rounded cursor-pointer"
                            >
                              Yes
                            </button>
                            <button
                              onClick={() => setDeleteConfirm(null)}
                              className="px-2 py-1 text-xs bg-dark-700 text-dark-300 rounded cursor-pointer"
                            >
                              No
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setDeleteConfirm(repair.id)}
                            className="p-1.5 rounded-lg text-dark-400 hover:text-red-400 hover:bg-dark-700 transition-colors cursor-pointer"
                          >
                            <Trash2 size={15} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Timeline View */
        <div className="space-y-0">
          {repairs.map((repair, idx) => (
            <div key={repair.id} className="flex gap-4">
              {/* Timeline line */}
              <div className="flex flex-col items-center">
                <div
                  className="w-3 h-3 rounded-full border-2 mt-6 shrink-0"
                  style={{
                    borderColor: CATEGORY_COLORS[repair.category] || '#6b7280',
                    backgroundColor: (CATEGORY_COLORS[repair.category] || '#6b7280') + '40',
                  }}
                />
                {idx < repairs.length - 1 && (
                  <div className="w-0.5 flex-1 bg-dark-700 mt-1" />
                )}
              </div>

              {/* Card */}
              <div className="flex-1 bg-dark-800 border border-dark-700 rounded-xl p-4 mb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="font-medium text-dark-100">{repair.description}</h4>
                    <div className="flex flex-wrap items-center gap-3 mt-1 text-sm text-dark-400">
                      <span className="flex items-center gap-1">
                        <Clock size={13} />
                        {formatDate(repair.date)}
                      </span>
                      <span>{getVehicleName(repair.vehicleId)}</span>
                      <span
                        className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
                        style={{
                          backgroundColor: (CATEGORY_COLORS[repair.category] || '#6b7280') + '20',
                          color: CATEGORY_COLORS[repair.category] || '#9ca3af',
                        }}
                      >
                        {repair.category}
                      </span>
                      {repair.workshop && (
                        <span className="flex items-center gap-1">
                          <MapPin size={13} />
                          {repair.workshop}
                        </span>
                      )}
                      {repair.mileage > 0 && (
                        <span className="flex items-center gap-1">
                          <Gauge size={13} />
                          {formatNumber(repair.mileage)} km
                        </span>
                      )}
                    </div>
                    {repair.notes && (
                      <p className="text-xs text-dark-500 mt-2">{repair.notes}</p>
                    )}
                  </div>
                  <div className="text-right shrink-0 ml-4">
                    <p className="text-lg font-bold text-dark-50">{formatCurrency(repair.cost)}</p>
                    <div className="flex items-center justify-end gap-1 mt-1">
                      <button
                        onClick={() => openEditRepair(repair)}
                        className="p-1 rounded text-dark-500 hover:text-dark-200 transition-colors cursor-pointer"
                      >
                        <Edit3 size={14} />
                      </button>
                      <button
                        onClick={() => deleteRepair(repair.id)}
                        className="p-1 rounded text-dark-500 hover:text-red-400 transition-colors cursor-pointer"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Charts Row */}
      {repairs.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Monthly Cost Chart */}
          {monthlyCostData.length > 0 && (
            <div className="bg-dark-800 border border-dark-700 rounded-xl p-5">
              <h3 className="text-lg font-semibold text-dark-50 mb-4">Repair Costs by Month</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthlyCostData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis
                      dataKey="month"
                      tick={{ fill: '#9ca3af', fontSize: 12 }}
                      axisLine={{ stroke: '#374151' }}
                      tickLine={{ stroke: '#374151' }}
                    />
                    <YAxis
                      tick={{ fill: '#9ca3af', fontSize: 12 }}
                      axisLine={{ stroke: '#374151' }}
                      tickLine={{ stroke: '#374151' }}
                      tickFormatter={(v) => `${v}€`}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#1f2937',
                        border: '1px solid #374151',
                        borderRadius: '8px',
                        color: '#f3f4f6',
                      }}
                      formatter={(value) => [formatCurrency(Number(value)), 'Cost']}
                    />
                    <Bar dataKey="cost" fill="#ef4444" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Category Breakdown */}
          {categoryData.length > 0 && (
            <div className="bg-dark-800 border border-dark-700 rounded-xl p-5">
              <h3 className="text-lg font-semibold text-dark-50 mb-4">Cost by Category</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categoryData}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={85}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {categoryData.map((entry) => (
                        <Cell
                          key={entry.name}
                          fill={CATEGORY_COLORS[entry.name] || '#6b7280'}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#1f2937',
                        border: '1px solid #374151',
                        borderRadius: '8px',
                        color: '#f3f4f6',
                      }}
                      formatter={(value) => [formatCurrency(Number(value)), 'Cost']}
                    />
                    <Legend
                      formatter={(value) => <span className="text-dark-300 text-sm">{value}</span>}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Add/Edit Repair Modal */}
      <Modal
        isOpen={showRepairModal}
        onClose={() => setShowRepairModal(false)}
        title={editingRepair ? 'Edit Repair' : 'Add Repair'}
        size="lg"
        footer={
          <div className="flex gap-2">
            <button
              onClick={() => setShowRepairModal(false)}
              className="px-4 py-2 text-sm rounded-lg bg-dark-700 text-dark-300 hover:bg-dark-600 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={saveRepair}
              className="px-4 py-2 text-sm rounded-lg bg-primary-600 text-white hover:bg-primary-500 transition-colors cursor-pointer font-medium"
            >
              {editingRepair ? 'Save Changes' : 'Add Repair'}
            </button>
          </div>
        }
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-dark-300 mb-1">Vehicle *</label>
              <select
                value={repairForm.vehicleId}
                onChange={e => setRepairForm({ ...repairForm, vehicleId: e.target.value })}
                className={inputClass}
              >
                <option value="">Select vehicle</option>
                {vehicles.map(v => (
                  <option key={v.id} value={v.id}>{v.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-dark-300 mb-1">Date *</label>
              <input
                type="date"
                value={repairForm.date}
                onChange={e => setRepairForm({ ...repairForm, date: e.target.value })}
                className={inputClass}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-dark-300 mb-1">Description *</label>
            <input
              type="text"
              value={repairForm.description}
              onChange={e => setRepairForm({ ...repairForm, description: e.target.value })}
              placeholder="e.g. Oil change, brake pad replacement"
              className={inputClass}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-dark-300 mb-1">Category</label>
              <select
                value={repairForm.category}
                onChange={e => setRepairForm({ ...repairForm, category: e.target.value })}
                className={inputClass}
              >
                {REPAIR_CATEGORIES.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-dark-300 mb-1">Cost</label>
              <input
                type="number"
                value={repairForm.cost || ''}
                onChange={e => setRepairForm({ ...repairForm, cost: parseFloat(e.target.value) || 0 })}
                placeholder="0.00"
                min="0"
                step="0.01"
                className={inputClass}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-dark-300 mb-1">Mileage at Repair</label>
              <input
                type="number"
                value={repairForm.mileage || ''}
                onChange={e => setRepairForm({ ...repairForm, mileage: parseInt(e.target.value) || 0 })}
                placeholder="e.g. 85000"
                min="0"
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-dark-300 mb-1">Workshop</label>
              <input
                type="text"
                value={repairForm.workshop}
                onChange={e => setRepairForm({ ...repairForm, workshop: e.target.value })}
                placeholder="Workshop name"
                className={inputClass}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-dark-300 mb-1">Notes</label>
            <textarea
              value={repairForm.notes}
              onChange={e => setRepairForm({ ...repairForm, notes: e.target.value })}
              rows={3}
              placeholder="Optional notes..."
              className={inputClass + ' resize-none'}
            />
          </div>
        </div>
      </Modal>
    </div>
  );
}
