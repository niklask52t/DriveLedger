import { useState } from 'react';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import Modal from '../../components/Modal';
import { cn } from '../../lib/utils';
import { formatCurrency, getFrequencyLabel, getCategoryLabel, toMonthly, formatDate } from '../../utils';
import { costCategoryOptions, costFrequencyOptions, emptyCost } from './constants';
import { useI18n } from '../../contexts/I18nContext';
import type { Cost, Vehicle, Person } from '../../types';

const selectChevron = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%2371717a' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`;

const inputClass =
  'w-full h-10 bg-zinc-950 border border-zinc-800 rounded-lg px-3 text-sm text-zinc-50 placeholder:text-zinc-600 outline-none focus:border-violet-500/50';

const selectClass =
  'w-full h-10 bg-zinc-950 border border-zinc-800 rounded-lg px-3 text-sm text-zinc-50 outline-none focus:border-violet-500/50 appearance-none';

const labelClass = 'block text-sm font-medium text-zinc-400 mb-2';

interface VehicleCostsTabProps {
  vehicleCosts: Cost[];
  showCostModal: boolean;
  setShowCostModal: (v: boolean) => void;
  costForm: Omit<Cost, 'id' | 'createdAt'>;
  setCostForm: (v: Omit<Cost, 'id' | 'createdAt'>) => void;
  editingCostId: string | null;
  setEditingCostId: (v: string | null) => void;
  onAddCost: () => void;
  onEditCost: (cost: Cost) => void;
  onSaveCost: () => void;
  onDeleteCost: (id: string) => void;
  vehicles: Vehicle[];
  persons: Person[];
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
  vehicles,
  persons,
}: VehicleCostsTabProps) {
  const { t } = useI18n();
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const totalMonthly = vehicleCosts.reduce((sum, c) => sum + toMonthly(c.amount, c.frequency), 0);

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-sm text-zinc-400">
            {t('vehicle_tab.costs.count', { count: vehicleCosts.length })} &middot; {formatCurrency(totalMonthly)}{t('unit.per_month')}
          </p>
        </div>
        <button
          onClick={onAddCost}
          className="bg-violet-500 hover:bg-violet-400 text-white rounded-lg h-10 px-5 text-sm font-medium inline-flex items-center gap-2 transition-colors"
        >
          <Plus size={16} />
          {t('costs.add')}
        </button>
      </div>

      {/* Table */}
      {vehicleCosts.length === 0 ? (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 text-center">
          <p className="text-zinc-500 text-sm">{t('vehicle_tab.costs.no_costs')}</p>
        </div>
      ) : (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-zinc-800">
                  <th className="px-4 py-3.5 text-left text-xs text-zinc-500 uppercase tracking-wider font-medium">{t('common.name')}</th>
                  <th className="px-4 py-3.5 text-left text-xs text-zinc-500 uppercase tracking-wider font-medium">{t('common.category')}</th>
                  <th className="px-4 py-3.5 text-right text-xs text-zinc-500 uppercase tracking-wider font-medium">{t('common.amount')}</th>
                  <th className="px-4 py-3.5 text-left text-xs text-zinc-500 uppercase tracking-wider font-medium">{t('common.frequency')}</th>
                  <th className="px-4 py-3.5 text-right text-xs text-zinc-500 uppercase tracking-wider font-medium">{t('common.monthly')}</th>
                  <th className="px-4 py-3.5 text-left text-xs text-zinc-500 uppercase tracking-wider font-medium">{t('vehicle_tab.costs.paid_by')}</th>
                  <th className="px-4 py-3.5 text-right text-xs text-zinc-500 uppercase tracking-wider font-medium">{t('common.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {vehicleCosts.map((cost) => {
                  const person = persons.find((p) => p.id === cost.paidBy);
                  return (
                    <tr key={cost.id} className="border-b border-zinc-800/50 hover:bg-zinc-800/30 transition-colors">
                      <td className="px-4 py-3.5 text-sm text-zinc-50">{cost.name}</td>
                      <td className="px-4 py-3.5 text-sm text-zinc-400">{getCategoryLabel(cost.category)}</td>
                      <td className="px-4 py-3.5 text-sm text-zinc-50 text-right">{formatCurrency(cost.amount)}</td>
                      <td className="px-4 py-3.5 text-sm text-zinc-400">{getFrequencyLabel(cost.frequency)}</td>
                      <td className="px-4 py-3.5 text-sm text-zinc-50 text-right">{formatCurrency(toMonthly(cost.amount, cost.frequency))}</td>
                      <td className="px-4 py-3.5 text-sm text-zinc-400">{person?.name || '-'}</td>
                      <td className="px-4 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => onEditCost(cost)}
                            className="text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-lg h-9 px-3 text-sm inline-flex items-center transition-colors"
                          >
                            <Pencil size={14} />
                          </button>
                          {deleteConfirm === cost.id ? (
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => {
                                  onDeleteCost(cost.id);
                                  setDeleteConfirm(null);
                                }}
                                className="bg-red-400/10 text-red-400 hover:bg-red-400/20 rounded-lg h-9 px-3 text-xs transition-colors"
                              >
                                {t('common.confirm')}
                              </button>
                              <button
                                onClick={() => setDeleteConfirm(null)}
                                className="text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-lg h-9 px-3 text-xs transition-colors"
                              >
                                {t('common.cancel')}
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setDeleteConfirm(cost.id)}
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

      {/* Cost Modal */}
      <Modal
        isOpen={showCostModal}
        onClose={() => {
          setShowCostModal(false);
          setEditingCostId(null);
        }}
        title={editingCostId ? t('costs.edit') : t('costs.add')}
        footer={
          <>
            <button
              onClick={() => {
                setShowCostModal(false);
                setEditingCostId(null);
              }}
              className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg h-10 px-4 text-sm transition-colors"
            >
              {t('common.cancel')}
            </button>
            <button
              onClick={onSaveCost}
              className="bg-violet-500 hover:bg-violet-400 text-white rounded-lg h-10 px-5 text-sm font-medium transition-colors"
            >
              {editingCostId ? t('common.update') : t('common.add')}
            </button>
          </>
        }
      >
        <div className="space-y-5">
          <div>
            <label className={labelClass}>{t('common.name')}</label>
            <input
              type="text"
              className={inputClass}
              placeholder="e.g. Insurance"
              value={costForm.name}
              onChange={(e) => setCostForm({ ...costForm, name: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>{t('common.category')}</label>
              <select
                className={selectClass}
                style={{ backgroundImage: selectChevron, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 0.75rem center' }}
                value={costForm.category}
                onChange={(e) => setCostForm({ ...costForm, category: e.target.value as Cost['category'] })}
              >
                {costCategoryOptions.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>{t('common.frequency')}</label>
              <select
                className={selectClass}
                style={{ backgroundImage: selectChevron, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 0.75rem center' }}
                value={costForm.frequency}
                onChange={(e) => setCostForm({ ...costForm, frequency: e.target.value as Cost['frequency'] })}
              >
                {costFrequencyOptions.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>{t('vehicle_tab.costs.amount_eur')}</label>
              <input
                type="number"
                step="0.01"
                className={inputClass}
                placeholder="0.00"
                value={costForm.amount || ''}
                onChange={(e) => setCostForm({ ...costForm, amount: parseFloat(e.target.value) || 0 })}
              />
            </div>
            <div>
              <label className={labelClass}>{t('vehicle_tab.costs.paid_by')}</label>
              <select
                className={selectClass}
                style={{ backgroundImage: selectChevron, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 0.75rem center' }}
                value={costForm.paidBy}
                onChange={(e) => setCostForm({ ...costForm, paidBy: e.target.value })}
              >
                <option value="">{t('vehicle_tab.costs.select_person')}</option>
                {persons.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>{t('common.start_date')}</label>
              <input
                type="date"
                className={inputClass}
                value={costForm.startDate}
                onChange={(e) => setCostForm({ ...costForm, startDate: e.target.value })}
              />
            </div>
            <div>
              <label className={labelClass}>{t('common.end_date')}</label>
              <input
                type="date"
                className={inputClass}
                value={costForm.endDate}
                onChange={(e) => setCostForm({ ...costForm, endDate: e.target.value })}
              />
            </div>
          </div>
          <div>
            <label className={labelClass}>{t('common.vehicle')}</label>
            <select
              className={selectClass}
              style={{ backgroundImage: selectChevron, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 0.75rem center' }}
              value={costForm.vehicleId}
              onChange={(e) => setCostForm({ ...costForm, vehicleId: e.target.value })}
            >
              <option value="">{t('vehicle_tab.costs.select_vehicle')}</option>
              {vehicles.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name || `${v.brand} ${v.model}`}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass}>{t('common.notes')}</label>
            <textarea
              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2.5 text-sm text-zinc-50 placeholder:text-zinc-600 outline-none focus:border-violet-500/50 min-h-[100px] resize-none"
              placeholder={t('common.optional_notes')}
              value={costForm.notes}
              onChange={(e) => setCostForm({ ...costForm, notes: e.target.value })}
            />
          </div>
        </div>
      </Modal>
    </div>
  );
}
