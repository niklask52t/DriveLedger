import { Pencil, Trash2, Plus, Wrench } from 'lucide-react';
import Modal from '../Modal';
import type { Repair } from '../../types';
import { formatCurrency, formatDate, formatNumber } from '../../utils';
import { inputClass, labelClass } from './constants';

interface VehicleRepairsTabProps {
  vehicleRepairs: Repair[];
  showRepairModal: boolean;
  setShowRepairModal: (show: boolean) => void;
  repairForm: Omit<Repair, 'id' | 'createdAt'>;
  setRepairForm: React.Dispatch<React.SetStateAction<Omit<Repair, 'id' | 'createdAt'>>>;
  editingRepairId: string | null;
  setEditingRepairId: (id: string | null) => void;
  onAddRepair: () => void;
  onEditRepair: (repair: Repair) => void;
  onSaveRepair: () => void;
  onDeleteRepair: (repairId: string) => void;
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
}: VehicleRepairsTabProps) {
  return (
    <>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-dark-100">Repair History</h2>
          <button
            onClick={onAddRepair}
            className="flex items-center gap-1.5 px-3 py-2 bg-primary-600 hover:bg-primary-700 rounded-lg text-sm text-white transition-colors cursor-pointer"
          >
            <Plus size={14} />
            Add Repair
          </button>
        </div>

        {vehicleRepairs.length === 0 ? (
          <div className="text-center py-12 text-dark-400">
            <Wrench size={40} className="mx-auto mb-3 opacity-40" />
            <p>No repairs recorded yet</p>
          </div>
        ) : (
          <div className="bg-dark-800 border border-dark-700 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-dark-700">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-dark-400 uppercase tracking-wider">Date</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-dark-400 uppercase tracking-wider">Description</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-dark-400 uppercase tracking-wider">Workshop</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-dark-400 uppercase tracking-wider">Mileage</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-dark-400 uppercase tracking-wider">Cost</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-dark-400 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {vehicleRepairs
                    .sort((a, b) => (b.date || '').localeCompare(a.date || ''))
                    .map((repair) => (
                      <tr key={repair.id} className="border-b border-dark-700/50 hover:bg-dark-750/50">
                        <td className="px-4 py-3 text-sm text-dark-300">{formatDate(repair.date)}</td>
                        <td className="px-4 py-3 text-sm text-dark-100 font-medium">{repair.description}</td>
                        <td className="px-4 py-3 text-sm text-dark-300">{repair.workshop || '-'}</td>
                        <td className="px-4 py-3 text-sm text-dark-300 text-right">
                          {repair.mileage ? `${formatNumber(repair.mileage)} km` : '-'}
                        </td>
                        <td className="px-4 py-3 text-sm text-dark-100 text-right font-medium">{formatCurrency(repair.cost)}</td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => onEditRepair(repair)}
                              className="p-1.5 rounded-lg text-dark-400 hover:text-primary-400 hover:bg-dark-700 transition-colors cursor-pointer"
                            >
                              <Pencil size={14} />
                            </button>
                            <button
                              onClick={() => onDeleteRepair(repair.id)}
                              className="p-1.5 rounded-lg text-dark-400 hover:text-danger hover:bg-dark-700 transition-colors cursor-pointer"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Repair Modal */}
      <Modal
        isOpen={showRepairModal}
        onClose={() => {
          setShowRepairModal(false);
          setEditingRepairId(null);
        }}
        title={editingRepairId ? 'Edit Repair' : 'Add Repair'}
        size="xl"
        footer={
          <>
            <button
              onClick={() => {
                setShowRepairModal(false);
                setEditingRepairId(null);
              }}
              className="px-4 py-2 rounded-lg text-dark-300 hover:text-dark-100 hover:bg-dark-700 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={onSaveRepair}
              disabled={!repairForm.description.trim()}
              className="px-6 py-2 bg-primary-600 hover:bg-primary-700 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors cursor-pointer"
            >
              {editingRepairId ? 'Save Changes' : 'Add Repair'}
            </button>
          </>
        }
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className={labelClass}>Description *</label>
            <input
              type="text"
              className={inputClass}
              placeholder="e.g. Brake pad replacement"
              value={repairForm.description}
              onChange={(e) => setRepairForm((f) => ({ ...f, description: e.target.value }))}
            />
          </div>
          <div>
            <label className={labelClass}>Date</label>
            <input
              type="date"
              className={inputClass}
              value={repairForm.date}
              onChange={(e) => setRepairForm((f) => ({ ...f, date: e.target.value }))}
            />
          </div>
          <div>
            <label className={labelClass}>Cost (EUR)</label>
            <input
              type="number"
              step="0.01"
              className={inputClass}
              placeholder="0"
              value={repairForm.cost || ''}
              onChange={(e) => setRepairForm((f) => ({ ...f, cost: parseFloat(e.target.value) || 0 }))}
            />
          </div>
          <div>
            <label className={labelClass}>Mileage at Repair (km)</label>
            <input
              type="number"
              className={inputClass}
              placeholder="0"
              value={repairForm.mileage || ''}
              onChange={(e) => setRepairForm((f) => ({ ...f, mileage: parseFloat(e.target.value) || 0 }))}
            />
          </div>
          <div>
            <label className={labelClass}>Workshop</label>
            <input
              type="text"
              className={inputClass}
              placeholder="Workshop name"
              value={repairForm.workshop}
              onChange={(e) => setRepairForm((f) => ({ ...f, workshop: e.target.value }))}
            />
          </div>
          <div>
            <label className={labelClass}>Category</label>
            <input
              type="text"
              className={inputClass}
              placeholder="e.g. Brakes, Engine, etc."
              value={repairForm.category}
              onChange={(e) => setRepairForm((f) => ({ ...f, category: e.target.value }))}
            />
          </div>
          <div className="sm:col-span-2">
            <label className={labelClass}>Notes</label>
            <textarea
              className={`${inputClass} resize-none`}
              rows={2}
              placeholder="Any notes..."
              value={repairForm.notes}
              onChange={(e) => setRepairForm((f) => ({ ...f, notes: e.target.value }))}
            />
          </div>
        </div>
      </Modal>
    </>
  );
}
