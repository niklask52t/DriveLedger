import { Pencil, Trash2, Plus, CreditCard } from 'lucide-react';
import Modal from '../Modal';
import type { Cost, CostCategory, CostFrequency } from '../../types';
import { formatCurrency, getCategoryLabel, getCategoryColor, getFrequencyLabel, toMonthly } from '../../utils';
import { inputClass, labelClass, categoryOptions, frequencyOptions } from './constants';

interface VehicleCostsTabProps {
  vehicleCosts: Cost[];
  showCostModal: boolean;
  setShowCostModal: (show: boolean) => void;
  costForm: Omit<Cost, 'id' | 'createdAt'>;
  setCostForm: React.Dispatch<React.SetStateAction<Omit<Cost, 'id' | 'createdAt'>>>;
  editingCostId: string | null;
  setEditingCostId: (id: string | null) => void;
  onAddCost: () => void;
  onEditCost: (cost: Cost) => void;
  onSaveCost: () => void;
  onDeleteCost: (costId: string) => void;
}

export default function VehicleCostsTab({
  vehicleCosts,
  showCostModal,
  setShowCostModal,
  costForm,
  setCostForm,
  editingCostId,
  setEditingCostId,
  onAddCost,
  onEditCost,
  onSaveCost,
  onDeleteCost,
}: VehicleCostsTabProps) {
  return (
    <>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-dark-100">Recurring Costs</h2>
          <button
            onClick={onAddCost}
            className="flex items-center gap-1.5 px-3 py-2 bg-primary-600 hover:bg-primary-700 rounded-lg text-sm text-white transition-colors cursor-pointer"
          >
            <Plus size={14} />
            Add Cost
          </button>
        </div>

        {vehicleCosts.length === 0 ? (
          <div className="text-center py-12 text-dark-400">
            <CreditCard size={40} className="mx-auto mb-3 opacity-40" />
            <p>No costs tracked yet</p>
          </div>
        ) : (
          <div className="bg-dark-800 border border-dark-700 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-dark-700">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-dark-400 uppercase tracking-wider">Category</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-dark-400 uppercase tracking-wider">Name</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-dark-400 uppercase tracking-wider">Amount</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-dark-400 uppercase tracking-wider">Frequency</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-dark-400 uppercase tracking-wider">Monthly</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-dark-400 uppercase tracking-wider">Paid by</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-dark-400 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {vehicleCosts.map((cost) => (
                    <tr key={cost.id} className="border-b border-dark-700/50 hover:bg-dark-750/50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-3 h-3 rounded-full shrink-0"
                            style={{ backgroundColor: getCategoryColor(cost.category) }}
                          />
                          <span className="text-sm text-dark-200">{getCategoryLabel(cost.category)}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-dark-100 font-medium">{cost.name}</td>
                      <td className="px-4 py-3 text-sm text-dark-100 text-right font-medium">{formatCurrency(cost.amount)}</td>
                      <td className="px-4 py-3 text-sm text-dark-300">{getFrequencyLabel(cost.frequency)}</td>
                      <td className="px-4 py-3 text-sm text-dark-100 text-right">{formatCurrency(toMonthly(cost.amount, cost.frequency))}</td>
                      <td className="px-4 py-3 text-sm text-dark-300">{cost.paidBy || '-'}</td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => onEditCost(cost)}
                            className="p-1.5 rounded-lg text-dark-400 hover:text-primary-400 hover:bg-dark-700 transition-colors cursor-pointer"
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            onClick={() => onDeleteCost(cost.id)}
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

      {/* Cost Modal */}
      <Modal
        isOpen={showCostModal}
        onClose={() => {
          setShowCostModal(false);
          setEditingCostId(null);
        }}
        title={editingCostId ? 'Edit Cost' : 'Add Cost'}
        size="xl"
        footer={
          <>
            <button
              onClick={() => {
                setShowCostModal(false);
                setEditingCostId(null);
              }}
              className="px-4 py-2 rounded-lg text-dark-300 hover:text-dark-100 hover:bg-dark-700 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={onSaveCost}
              disabled={!costForm.name.trim()}
              className="px-6 py-2 bg-primary-600 hover:bg-primary-700 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors cursor-pointer"
            >
              {editingCostId ? 'Save Changes' : 'Add Cost'}
            </button>
          </>
        }
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Name *</label>
            <input
              type="text"
              className={inputClass}
              placeholder="e.g. Car Insurance"
              value={costForm.name}
              onChange={(e) => setCostForm((f) => ({ ...f, name: e.target.value }))}
            />
          </div>
          <div>
            <label className={labelClass}>Category</label>
            <select
              className={inputClass}
              value={costForm.category}
              onChange={(e) => setCostForm((f) => ({ ...f, category: e.target.value as CostCategory }))}
            >
              {categoryOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass}>Amount (EUR)</label>
            <input
              type="number"
              step="0.01"
              className={inputClass}
              placeholder="0"
              value={costForm.amount || ''}
              onChange={(e) => setCostForm((f) => ({ ...f, amount: parseFloat(e.target.value) || 0 }))}
            />
          </div>
          <div>
            <label className={labelClass}>Frequency</label>
            <select
              className={inputClass}
              value={costForm.frequency}
              onChange={(e) => setCostForm((f) => ({ ...f, frequency: e.target.value as CostFrequency }))}
            >
              {frequencyOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass}>Paid By</label>
            <input
              type="text"
              className={inputClass}
              placeholder="Person name"
              value={costForm.paidBy}
              onChange={(e) => setCostForm((f) => ({ ...f, paidBy: e.target.value }))}
            />
          </div>
          <div>
            <label className={labelClass}>Start Date</label>
            <input
              type="date"
              className={inputClass}
              value={costForm.startDate}
              onChange={(e) => setCostForm((f) => ({ ...f, startDate: e.target.value }))}
            />
          </div>
          <div>
            <label className={labelClass}>End Date</label>
            <input
              type="date"
              className={inputClass}
              value={costForm.endDate}
              onChange={(e) => setCostForm((f) => ({ ...f, endDate: e.target.value }))}
            />
          </div>
          <div className="sm:col-span-2">
            <label className={labelClass}>Notes</label>
            <textarea
              className={`${inputClass} resize-none`}
              rows={2}
              placeholder="Any notes..."
              value={costForm.notes}
              onChange={(e) => setCostForm((f) => ({ ...f, notes: e.target.value }))}
            />
          </div>
        </div>
      </Modal>
    </>
  );
}
