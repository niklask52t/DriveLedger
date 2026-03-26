import { useState, useMemo } from 'react';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import Modal from '../Modal';
import { api } from '../../api';
import { formatCurrency, formatDate, formatNumber } from '../../utils';
import type { AppState, FuelRecord } from '../../types';

const inputClass =
  'w-full h-10 bg-zinc-950 border border-zinc-800 rounded-lg px-3 text-sm text-zinc-50 placeholder:text-zinc-600 outline-none focus:border-violet-500/50';

const selectClass =
  'w-full h-10 bg-zinc-950 border border-zinc-800 rounded-lg px-3 text-sm text-zinc-50 outline-none focus:border-violet-500/50 appearance-none';

const labelClass = 'block text-sm font-medium text-zinc-400 mb-2';

const selectChevron = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%2371717a' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`;

interface Props {
  vehicleId: string;
  state: AppState;
  setState: (s: AppState) => void;
}

const emptyForm = {
  date: '',
  mileage: 0,
  fuelAmount: 0,
  fuelCost: 0,
  isPartialFill: false,
  isMissedEntry: false,
  fuelType: '',
  station: '',
  notes: '',
};

export default function VehicleFuelTab({ vehicleId, state, setState }: Props) {
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const records = useMemo(
    () =>
      state.fuelRecords
        .filter((r) => r.vehicleId === vehicleId)
        .sort((a, b) => (a.date || '').localeCompare(b.date || '') || a.mileage - b.mileage),
    [state.fuelRecords, vehicleId]
  );

  // Calculate L/100km for consecutive full fills
  const consumptionMap = useMemo(() => {
    const map: Record<string, number | null> = {};
    let prevFull: FuelRecord | null = null;
    let accLiters = 0;

    for (const r of records) {
      if (r.isMissedEntry) {
        prevFull = null;
        accLiters = 0;
        map[r.id] = null;
        continue;
      }

      accLiters += r.fuelAmount;

      if (!r.isPartialFill && prevFull) {
        const dist = r.mileage - prevFull.mileage;
        if (dist > 0) {
          map[r.id] = (accLiters / dist) * 100;
        } else {
          map[r.id] = null;
        }
        prevFull = r;
        accLiters = 0;
      } else if (!r.isPartialFill) {
        prevFull = r;
        accLiters = 0;
        map[r.id] = null;
      } else {
        map[r.id] = null;
      }
    }
    return map;
  }, [records]);

  const chartData = useMemo(
    () =>
      records
        .filter((r) => consumptionMap[r.id] != null)
        .map((r) => ({
          date: formatDate(r.date),
          consumption: Math.round((consumptionMap[r.id]!) * 100) / 100,
        })),
    [records, consumptionMap]
  );

  const totalCost = records.reduce((s, r) => s + r.fuelCost, 0);
  const sorted = [...records].reverse();

  const openAdd = () => {
    setForm({ ...emptyForm });
    setEditingId(null);
    setShowModal(true);
  };

  const openEdit = (r: FuelRecord) => {
    setForm({
      date: r.date,
      mileage: r.mileage,
      fuelAmount: r.fuelAmount,
      fuelCost: r.fuelCost,
      isPartialFill: r.isPartialFill,
      isMissedEntry: r.isMissedEntry,
      fuelType: r.fuelType,
      station: r.station,
      notes: r.notes,
    });
    setEditingId(r.id);
    setShowModal(true);
  };

  const handleSave = async () => {
    try {
      if (editingId) {
        const updated = await api.updateFuelRecord(editingId, { ...form, vehicleId });
        setState({ ...state, fuelRecords: state.fuelRecords.map((r) => (r.id === editingId ? updated : r)) });
      } else {
        const created = await api.createFuelRecord({ ...form, vehicleId });
        setState({ ...state, fuelRecords: [...state.fuelRecords, created] });
      }
      setShowModal(false);
      setEditingId(null);
    } catch (e) {
      console.error('Failed to save fuel record', e);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.deleteFuelRecord(id);
      setState({ ...state, fuelRecords: state.fuelRecords.filter((r) => r.id !== id) });
    } catch (e) {
      console.error('Failed to delete fuel record', e);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <p className="text-sm text-zinc-400">
          {records.length} entry{records.length !== 1 ? '' : ''} &middot; Total: {formatCurrency(totalCost)}
        </p>
        <button
          onClick={openAdd}
          className="bg-violet-500 hover:bg-violet-400 text-white rounded-lg h-10 px-5 text-sm font-medium inline-flex items-center gap-2 transition-colors"
        >
          <Plus size={16} />
          Add Fuel Entry
        </button>
      </div>

      {/* Consumption Chart */}
      {chartData.length >= 2 && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 mb-6">
          <h3 className="text-sm font-medium text-zinc-300 mb-4">Consumption (L/100km)</h3>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                <XAxis dataKey="date" tick={{ fill: '#71717a', fontSize: 11 }} tickLine={false} axisLine={{ stroke: '#3f3f46' }} />
                <YAxis tick={{ fill: '#71717a', fontSize: 11 }} tickLine={false} axisLine={{ stroke: '#3f3f46' }} domain={['auto', 'auto']} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#18181b', border: '1px solid #3f3f46', borderRadius: '8px', fontSize: '12px' }}
                  labelStyle={{ color: '#a1a1aa' }}
                  itemStyle={{ color: '#8b5cf6' }}
                  formatter={(value: number) => [`${value.toFixed(2)} L/100km`, 'Consumption']}
                />
                <Line type="monotone" dataKey="consumption" stroke="#8b5cf6" strokeWidth={2} dot={{ r: 3, fill: '#8b5cf6' }} activeDot={{ r: 5 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Table */}
      {sorted.length === 0 ? (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 text-center">
          <p className="text-zinc-500 text-sm">No fuel entries recorded yet.</p>
        </div>
      ) : (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-zinc-800">
                  <th className="px-4 py-3.5 text-left text-xs text-zinc-500 uppercase tracking-wider font-medium">Date</th>
                  <th className="px-4 py-3.5 text-right text-xs text-zinc-500 uppercase tracking-wider font-medium">Mileage</th>
                  <th className="px-4 py-3.5 text-right text-xs text-zinc-500 uppercase tracking-wider font-medium">Liters</th>
                  <th className="px-4 py-3.5 text-right text-xs text-zinc-500 uppercase tracking-wider font-medium">Cost</th>
                  <th className="px-4 py-3.5 text-right text-xs text-zinc-500 uppercase tracking-wider font-medium">L/100km</th>
                  <th className="px-4 py-3.5 text-left text-xs text-zinc-500 uppercase tracking-wider font-medium">Station</th>
                  <th className="px-4 py-3.5 text-center text-xs text-zinc-500 uppercase tracking-wider font-medium">Partial?</th>
                  <th className="px-4 py-3.5 text-right text-xs text-zinc-500 uppercase tracking-wider font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((r) => {
                  const consumption = consumptionMap[r.id];
                  return (
                    <tr key={r.id} className="border-b border-zinc-800/50 hover:bg-zinc-800/30 transition-colors">
                      <td className="px-4 py-3.5 text-sm text-zinc-50">{formatDate(r.date)}</td>
                      <td className="px-4 py-3.5 text-sm text-zinc-400 text-right">{formatNumber(r.mileage)} km</td>
                      <td className="px-4 py-3.5 text-sm text-zinc-50 text-right">{formatNumber(r.fuelAmount, 2)} L</td>
                      <td className="px-4 py-3.5 text-sm text-zinc-50 text-right">{formatCurrency(r.fuelCost)}</td>
                      <td className="px-4 py-3.5 text-sm text-right">
                        {consumption != null ? (
                          <span className="text-violet-400 font-medium">{consumption.toFixed(2)}</span>
                        ) : (
                          <span className="text-zinc-600">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-sm text-zinc-400">{r.station || '-'}</td>
                      <td className="px-4 py-3.5 text-center">
                        {r.isPartialFill ? (
                          <span className="text-xs bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded-md">Partial</span>
                        ) : (
                          <span className="text-xs text-zinc-600">Full</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => openEdit(r)}
                            className="text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-lg h-9 px-3 text-sm inline-flex items-center transition-colors"
                          >
                            <Pencil size={14} />
                          </button>
                          {deleteConfirm === r.id ? (
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => { handleDelete(r.id); setDeleteConfirm(null); }}
                                className="bg-red-400/10 text-red-400 hover:bg-red-400/20 rounded-lg h-9 px-3 text-xs transition-colors"
                              >
                                Confirm
                              </button>
                              <button
                                onClick={() => setDeleteConfirm(null)}
                                className="text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-lg h-9 px-3 text-xs transition-colors"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setDeleteConfirm(r.id)}
                              className="text-zinc-400 hover:text-red-400 hover:bg-zinc-800 rounded-lg h-9 px-3 text-sm inline-flex items-center transition-colors"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Modal
        isOpen={showModal}
        onClose={() => { setShowModal(false); setEditingId(null); }}
        title={editingId ? 'Edit Fuel Entry' : 'Add Fuel Entry'}
        footer={
          <>
            <button
              onClick={() => { setShowModal(false); setEditingId(null); }}
              className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg h-10 px-4 text-sm transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="bg-violet-500 hover:bg-violet-400 text-white rounded-lg h-10 px-5 text-sm font-medium transition-colors"
            >
              {editingId ? 'Update' : 'Add'}
            </button>
          </>
        }
      >
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Date</label>
              <input
                type="date"
                className={inputClass}
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
              />
            </div>
            <div>
              <label className={labelClass}>Mileage (km)</label>
              <input
                type="number"
                className={inputClass}
                placeholder="0"
                value={form.mileage || ''}
                onChange={(e) => setForm({ ...form, mileage: parseFloat(e.target.value) || 0 })}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Liters</label>
              <input
                type="number"
                step="0.01"
                className={inputClass}
                placeholder="0.00"
                value={form.fuelAmount || ''}
                onChange={(e) => setForm({ ...form, fuelAmount: parseFloat(e.target.value) || 0 })}
              />
            </div>
            <div>
              <label className={labelClass}>Cost (EUR)</label>
              <input
                type="number"
                step="0.01"
                className={inputClass}
                placeholder="0.00"
                value={form.fuelCost || ''}
                onChange={(e) => setForm({ ...form, fuelCost: parseFloat(e.target.value) || 0 })}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Fuel Type</label>
              <select
                className={selectClass}
                style={{ backgroundImage: selectChevron, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 0.75rem center' }}
                value={form.fuelType}
                onChange={(e) => setForm({ ...form, fuelType: e.target.value })}
              >
                <option value="">Select...</option>
                <option value="diesel">Diesel</option>
                <option value="benzin">Gasoline</option>
                <option value="elektro">Electric</option>
                <option value="lpg">LPG</option>
              </select>
            </div>
            <div>
              <label className={labelClass}>Station</label>
              <input
                type="text"
                className={inputClass}
                placeholder="e.g. Shell, Aral"
                value={form.station}
                onChange={(e) => setForm({ ...form, station: e.target.value })}
              />
            </div>
          </div>
          <div className="flex items-center gap-6">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                className="w-4 h-4 rounded border-zinc-700 bg-zinc-950 text-violet-500 focus:ring-violet-500/30"
                checked={form.isPartialFill}
                onChange={(e) => setForm({ ...form, isPartialFill: e.target.checked })}
              />
              <span className="text-sm text-zinc-300">Partial fill</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                className="w-4 h-4 rounded border-zinc-700 bg-zinc-950 text-violet-500 focus:ring-violet-500/30"
                checked={form.isMissedEntry}
                onChange={(e) => setForm({ ...form, isMissedEntry: e.target.checked })}
              />
              <span className="text-sm text-zinc-300">Missed entry</span>
            </label>
          </div>
          <div>
            <label className={labelClass}>Notes</label>
            <textarea
              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2.5 text-sm text-zinc-50 placeholder:text-zinc-600 outline-none focus:border-violet-500/50 min-h-[80px] resize-none"
              placeholder="Optional notes..."
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
          </div>
        </div>
      </Modal>
    </div>
  );
}
