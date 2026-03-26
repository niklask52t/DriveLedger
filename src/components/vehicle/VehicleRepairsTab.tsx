import { useState } from 'react';
import { Plus, Pencil, Trash2, Wrench } from 'lucide-react';
import Modal from '../../components/Modal';
import { formatCurrency, formatDate, getTotalRepairCosts } from '../../utils';
import { emptyRepair } from './constants';
import type { Repair, Vehicle } from '../../types';

const inputClass =
  'w-full h-10 bg-zinc-950 border border-zinc-800 rounded-lg px-3 text-sm text-zinc-50 placeholder:text-zinc-600 outline-none focus:border-violet-500/50';

const labelClass = 'block text-sm font-medium text-zinc-400 mb-2';

interface VehicleRepairsTabProps {
  vehicleRepairs: Repair[];
  showRepairModal: boolean;
  setShowRepairModal: (v: boolean) => void;
  repairForm: Omit<Repair, 'id' | 'createdAt'>;
  setRepairForm: (v: Omit<Repair, 'id' | 'createdAt'>) => void;
  editingRepairId: string | null;
  setEditingRepairId: (v: string | null) => void;
  onAddRepair: () => void;
  onEditRepair: (repair: Repair) => void;
  onSaveRepair: () => void;
  onDeleteRepair: (id: string) => void;
  vehicles: Vehicle[];
}

export default function VehicleRepairsTab({
  vehicleRepairs,
  showRepairModal,
  setShowRepairModal,
  repairForm,
  setRepairForm,
  editingRepairId,
  setEditingRepairId,
  onAddRepair,
  onEditRepair,
  onSaveRepair,
  onDeleteRepair,
  vehicles,
}: VehicleRepairsTabProps) {
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const totalCost = getTotalRepairCosts(vehicleRepairs);
  const sorted = [...vehicleRepairs].sort((a, b) => (b.date || '').localeCompare(a.date || ''));

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-sm text-zinc-400">
            {vehicleRepairs.length} repair{vehicleRepairs.length !== 1 ? 's' : ''} &middot; Total: {formatCurrency(totalCost)}
          </p>
        </div>
        <button
          onClick={onAddRepair}
          className="bg-violet-500 hover:bg-violet-400 text-white rounded-lg h-10 px-5 text-sm font-medium inline-flex items-center gap-2 transition-colors"
        >
          <Plus size={16} />
          Add Repair
        </button>
      </div>

      {/* Table */}
      {sorted.length === 0 ? (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 text-center">
          <p className="text-zinc-500 text-sm">No repairs recorded yet.</p>
        </div>
      ) : (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-zinc-800">
                  <th className="px-4 py-3.5 text-left text-xs text-zinc-500 uppercase tracking-wider font-medium">Date</th>
                  <th className="px-4 py-3.5 text-left text-xs text-zinc-500 uppercase tracking-wider font-medium">Description</th>
                  <th className="px-4 py-3.5 text-left text-xs text-zinc-500 uppercase tracking-wider font-medium">Category</th>
                  <th className="px-4 py-3.5 text-right text-xs text-zinc-500 uppercase tracking-wider font-medium">Cost</th>
                  <th className="px-4 py-3.5 text-right text-xs text-zinc-500 uppercase tracking-wider font-medium">Mileage</th>
                  <th className="px-4 py-3.5 text-left text-xs text-zinc-500 uppercase tracking-wider font-medium">Workshop</th>
                  <th className="px-4 py-3.5 text-right text-xs text-zinc-500 uppercase tracking-wider font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((repair) => (
                  <tr key={repair.id} className="border-b border-zinc-800/50 hover:bg-zinc-800/30 transition-colors">
                    <td className="px-4 py-3.5 text-sm text-zinc-50">{formatDate(repair.date)}</td>
                    <td className="px-4 py-3.5 text-sm text-zinc-50 max-w-[200px] truncate">{repair.description}</td>
                    <td className="px-4 py-3.5 text-sm text-zinc-400">{repair.category || '-'}</td>
                    <td className="px-4 py-3.5 text-sm text-zinc-50 text-right">{formatCurrency(repair.cost)}</td>
                    <td className="px-4 py-3.5 text-sm text-zinc-400 text-right">
                      {repair.mileage ? `${repair.mileage.toLocaleString('de-DE')} km` : '-'}
                    </td>
                    <td className="px-4 py-3.5 text-sm text-zinc-400">{repair.workshop || '-'}</td>
                    <td className="px-4 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => onEditRepair(repair)}
                          className="text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-lg h-9 px-3 text-sm inline-flex items-center transition-colors"
                        >
                          <Pencil size={14} />
                        </button>
                        {deleteConfirm === repair.id ? (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => {
                                onDeleteRepair(repair.id);
                                setDeleteConfirm(null);
                              }}
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
                            onClick={() => setDeleteConfirm(repair.id)}
                            className="text-zinc-400 hover:text-red-400 hover:bg-zinc-800 rounded-lg h-9 px-3 text-sm inline-flex items-center transition-colors"
                          >
                            <Trash2 size={14} />
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
      )}

      {/* Repair Modal */}
      <Modal
        isOpen={showRepairModal}
        onClose={() => {
          setShowRepairModal(false);
          setEditingRepairId(null);
        }}
        title={editingRepairId ? 'Edit Repair' : 'Add Repair'}
        footer={
          <>
            <button
              onClick={() => {
                setShowRepairModal(false);
                setEditingRepairId(null);
              }}
              className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg h-10 px-4 text-sm transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={onSaveRepair}
              className="bg-violet-500 hover:bg-violet-400 text-white rounded-lg h-10 px-5 text-sm font-medium transition-colors"
            >
              {editingRepairId ? 'Update' : 'Add'}
            </button>
          </>
        }
      >
        <div className="space-y-5">
          <div>
            <label className={labelClass}>Description</label>
            <input
              type="text"
              className={inputClass}
              placeholder="e.g. Oil change"
              value={repairForm.description}
              onChange={(e) => setRepairForm({ ...repairForm, description: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Date</label>
              <input
                type="date"
                className={inputClass}
                value={repairForm.date}
                onChange={(e) => setRepairForm({ ...repairForm, date: e.target.value })}
              />
            </div>
            <div>
              <label className={labelClass}>Category</label>
              <input
                type="text"
                className={inputClass}
                placeholder="e.g. Engine, Brakes"
                value={repairForm.category}
                onChange={(e) => setRepairForm({ ...repairForm, category: e.target.value })}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Cost (EUR)</label>
              <input
                type="number"
                step="0.01"
                className={inputClass}
                placeholder="0.00"
                value={repairForm.cost || ''}
                onChange={(e) => setRepairForm({ ...repairForm, cost: parseFloat(e.target.value) || 0 })}
              />
            </div>
            <div>
              <label className={labelClass}>Mileage (km)</label>
              <input
                type="number"
                className={inputClass}
                placeholder="0"
                value={repairForm.mileage || ''}
                onChange={(e) => setRepairForm({ ...repairForm, mileage: parseFloat(e.target.value) || 0 })}
              />
            </div>
          </div>
          <div>
            <label className={labelClass}>Workshop</label>
            <input
              type="text"
              className={inputClass}
              placeholder="e.g. Local garage"
              value={repairForm.workshop}
              onChange={(e) => setRepairForm({ ...repairForm, workshop: e.target.value })}
            />
          </div>
          <div>
            <label className={labelClass}>Vehicle</label>
            <select
              className="w-full h-10 bg-zinc-950 border border-zinc-800 rounded-lg px-3 text-sm text-zinc-50 outline-none focus:border-violet-500/50 appearance-none"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%2371717a' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`,
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'right 0.75rem center',
              }}
              value={repairForm.vehicleId}
              onChange={(e) => setRepairForm({ ...repairForm, vehicleId: e.target.value })}
            >
              <option value="">Select vehicle...</option>
              {vehicles.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name || `${v.brand} ${v.model}`}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass}>Notes</label>
            <textarea
              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2.5 text-sm text-zinc-50 placeholder:text-zinc-600 outline-none focus:border-violet-500/50 min-h-[100px] resize-none"
              placeholder="Optional notes..."
              value={repairForm.notes}
              onChange={(e) => setRepairForm({ ...repairForm, notes: e.target.value })}
            />
          </div>
        </div>
      </Modal>
    </div>
  );
}
