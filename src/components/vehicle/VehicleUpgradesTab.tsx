import { useState } from 'react';
import { Plus, Pencil, Trash2, ArrowRightLeft } from 'lucide-react';
import Modal from '../Modal';
import TagInput from '../TagInput';
import SupplyPicker from '../SupplyPicker';
import { api } from '../../api';
import { formatCurrency, formatDate, formatNumber } from '../../utils';
import { useI18n } from '../../contexts/I18nContext';
import { useUnits } from '../../hooks/useUnits';
import { useUserConfig } from '../../contexts/UserConfigContext';
import type { AppState, UpgradeRecord } from '../../types';

const inputClass =
  'w-full h-10 bg-zinc-950 border border-zinc-800 rounded-lg px-3 text-sm text-zinc-50 placeholder:text-zinc-600 outline-none focus:border-violet-500/50';

const labelClass = 'block text-sm font-medium text-zinc-400 mb-2';

interface Props {
  vehicleId: string;
  state: AppState;
  setState: (s: AppState) => void;
}

const emptyForm = {
  date: '',
  description: '',
  mileage: 0,
  cost: 0,
  notes: '',
  tags: [] as string[],
};

const selectClass =
  'w-full h-10 bg-zinc-950 border border-zinc-800 rounded-lg px-3 text-sm text-zinc-50 outline-none focus:border-violet-500/50 appearance-none';

const selectChevron = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%2371717a' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`;

export default function VehicleUpgradesTab({ vehicleId, state, setState }: Props) {
  const vehicle = state.vehicles.find((v) => v.id === vehicleId);
  const { fmtDistance, distanceUnit } = useUnits({ useHours: !!vehicle?.useHours });
  const { config } = useUserConfig();
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [moveMenuOpen, setMoveMenuOpen] = useState<string | null>(null);
  const [selectedSupplies, setSelectedSupplies] = useState<{ supplyId: string; quantity: number }[]>([]);
  const [createReminder, setCreateReminder] = useState(false);
  const [reminderDate, setReminderDate] = useState('');
  const [reminderRecurring, setReminderRecurring] = useState<'' | 'yearly'>('');

  const { t } = useI18n();
  
  const handleMove = async (recordId: string, destType: 'services' | 'repairs') => {
    try {
      await api.moveRecords([recordId], 'upgrades', destType);
      const [services, repairs, upgrades] = await Promise.all([
        api.getServices(),
        api.getRepairs(),
        api.getUpgrades(),
      ]);
      setState({ ...state, serviceRecords: services, repairs, upgradeRecords: upgrades });
      setMoveMenuOpen(null);
    } catch (e) {
      console.error('Failed to move record', e);
    }
  };

  const records = state.upgradeRecords
    .filter((r) => r.vehicleId === vehicleId)
    .sort((a, b) => (b.date || '').localeCompare(a.date || ''));

  const totalCost = records.reduce((s, r) => s + r.cost, 0);

  const openAdd = () => {
    const autoMileage = (config.enableAutoFillOdometer !== false && vehicle)
      ? vehicle.currentMileage || 0
      : 0;
    setForm({ ...emptyForm, mileage: autoMileage });
    setEditingId(null);
    setSelectedSupplies([]);
    setCreateReminder(false);
    setReminderDate('');
    setReminderRecurring('');
    setShowModal(true);
  };

  const openEdit = (r: UpgradeRecord) => {
    setForm({
      date: r.date,
      description: r.description,
      mileage: r.mileage,
      cost: r.cost,
      notes: r.notes,
      tags: r.tags || [],
    });
    setEditingId(r.id);
    setSelectedSupplies([]);
    setCreateReminder(false);
    setReminderDate('');
    setReminderRecurring('');
    setShowModal(true);
  };

  const handleSave = async () => {
    try {
      let recordId: string;
      if (editingId) {
        const updated = await api.updateUpgrade(editingId, { ...form, vehicleId });
        setState({ ...state, upgradeRecords: state.upgradeRecords.map((r) => (r.id === editingId ? updated : r)) });
        recordId = editingId;
      } else {
        const created = await api.createUpgrade({ ...form, vehicleId });
        setState({ ...state, upgradeRecords: [...state.upgradeRecords, created] });
        recordId = created.id;
      }
      // Requisition selected supplies
      for (const sel of selectedSupplies) {
        try {
          await api.requisitionSupply(sel.supplyId, {
            quantity: sel.quantity,
            recordType: 'upgrade',
            recordId,
            description: form.description || 'Upgrade',
          });
        } catch {
          // continue even if one fails
        }
      }
      // Refresh supplies if any were requisitioned
      if (selectedSupplies.length > 0) {
        try {
          const updatedSupplies = await api.getSupplies();
          setState({ ...state, supplies: updatedSupplies });
        } catch { /* ignore */ }
      }
      // Create reminder if checked
      if (createReminder && reminderDate) {
        try {
          await api.createReminder({
            title: `Upgrade: ${form.description || 'Untitled'}`,
            description: `Reminder for upgrade record`,
            type: 'custom',
            entityType: 'upgrade',
            entityId: recordId,
            remindAt: reminderDate,
            recurring: reminderRecurring || '',
            emailNotify: true,
            sent: false,
            active: true,
            vehicleId,
          });
        } catch { /* ignore */ }
      }
      setShowModal(false);
      setEditingId(null);
      setSelectedSupplies([]);
      setCreateReminder(false);
    } catch (e) {
      console.error('Failed to save upgrade', e);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.deleteUpgrade(id);
      setState({ ...state, upgradeRecords: state.upgradeRecords.filter((r) => r.id !== id) });
    } catch (e) {
      console.error('Failed to delete upgrade', e);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <p className="text-sm text-zinc-400">
          {t("vehicle_tab.upgrades.count", { count: records.length })} &middot; Total: {formatCurrency(totalCost)}
        </p>
        <button
          onClick={openAdd}
          className="bg-violet-500 hover:bg-violet-400 text-white rounded-lg h-10 px-5 text-sm font-medium inline-flex items-center gap-2 transition-colors"
        >
          <Plus size={16} />
          Add Upgrade
        </button>
      </div>

      {records.length === 0 ? (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 text-center">
          <p className="text-zinc-500 text-sm">{t("vehicle_tab.upgrades.no_upgrades")}</p>
        </div>
      ) : (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-zinc-800">
                  <th className="px-4 py-3.5 text-left text-xs text-zinc-500 uppercase tracking-wider font-medium">{t("common.date")}</th>
                  <th className="px-4 py-3.5 text-left text-xs text-zinc-500 uppercase tracking-wider font-medium">{t("common.description")}</th>
                  <th className="px-4 py-3.5 text-right text-xs text-zinc-500 uppercase tracking-wider font-medium">{t("common.mileage")}</th>
                  <th className="px-4 py-3.5 text-right text-xs text-zinc-500 uppercase tracking-wider font-medium">{t("common.cost")}</th>
                  <th className="px-4 py-3.5 text-left text-xs text-zinc-500 uppercase tracking-wider font-medium">{t("common.tags")}</th>
                  <th className="px-4 py-3.5 text-right text-xs text-zinc-500 uppercase tracking-wider font-medium">{t("common.actions")}</th>
                </tr>
              </thead>
              <tbody>
                {records.map((r) => (
                  <tr key={r.id} className="border-b border-zinc-800/50 hover:bg-zinc-800/30 transition-colors">
                    <td className="px-4 py-3.5 text-sm text-zinc-50">{formatDate(r.date)}</td>
                    <td className="px-4 py-3.5 text-sm text-zinc-50 max-w-[250px] truncate" title={r.description}>{r.description}</td>
                    <td className="px-4 py-3.5 text-sm text-zinc-400 text-right">
                      {r.mileage ? fmtDistance(r.mileage) : '-'}
                    </td>
                    <td className="px-4 py-3.5 text-sm text-zinc-50 text-right">{formatCurrency(r.cost)}</td>
                    <td className="px-4 py-3.5">
                      <div className="flex flex-wrap gap-1">
                        {(r.tags || []).map((t, i) => (
                          <span key={i} className="bg-zinc-800 rounded-md px-2 py-0.5 text-xs text-zinc-300">{t}</span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {/* Move To dropdown */}
                        <div className="relative">
                          <button
                            onClick={() => setMoveMenuOpen(moveMenuOpen === r.id ? null : r.id)}
                            className="text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-lg h-9 px-3 text-sm inline-flex items-center transition-colors"
                            title="Move to..."
                          >
                            <ArrowRightLeft size={14} />
                          </button>
                          {moveMenuOpen === r.id && (
                            <>
                              <div className="fixed inset-0 z-10" onClick={() => setMoveMenuOpen(null)} />
                              <div className="absolute right-0 mt-1 w-44 bg-zinc-900 border border-zinc-800 rounded-lg shadow-xl z-20 py-1">
                                <button
                                  onClick={() => handleMove(r.id, 'services')}
                                  className="w-full text-left px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-800 transition-colors"
                                >
                                  {t("vehicle_tab.upgrades.move_to_services")}
                                </button>
                                <button
                                  onClick={() => handleMove(r.id, 'repairs')}
                                  className="w-full text-left px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-800 transition-colors"
                                >
                                  {t("vehicle_tab.upgrades.move_to_repairs")}
                                </button>
                              </div>
                            </>
                          )}
                        </div>
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
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Modal
        isOpen={showModal}
        onClose={() => { setShowModal(false); setEditingId(null); }}
        title={editingId ? t("vehicle_tab.upgrades.edit") : t("vehicle_tab.upgrades.add")}
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
              {editingId ? t("common.update") : t("common.add")}
            </button>
          </>
        }
      >
        <div className="space-y-5">
          <div>
            <label className={labelClass}>{t("common.description")}</label>
            <input
              type="text"
              className={inputClass}
              placeholder="e.g. Sport exhaust"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>{t("common.date")}</label>
              <input
                type="date"
                className={inputClass}
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
              />
            </div>
            <div>
              <label className={labelClass}>{t("common.cost")} (EUR)</label>
              <input
                type="number"
                step="0.01"
                className={inputClass}
                placeholder="0.00"
                value={form.cost || ''}
                onChange={(e) => setForm({ ...form, cost: parseFloat(e.target.value) || 0 })}
              />
            </div>
          </div>
          <div>
            <label className={labelClass}>{t("common.mileage")} ({distanceUnit})</label>
            <input
              type="number"
              className={inputClass}
              placeholder="0"
              value={form.mileage || ''}
              onChange={(e) => setForm({ ...form, mileage: parseFloat(e.target.value) || 0 })}
            />
          </div>
          <div>
            <label className={labelClass}>{t("common.notes")}</label>
            <textarea
              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2.5 text-sm text-zinc-50 placeholder:text-zinc-600 outline-none focus:border-violet-500/50 min-h-[100px] resize-none"
              placeholder={t("common.optional_notes")}
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
          </div>
          <div>
            <label className={labelClass}>{t("common.tags")}</label>
            <TagInput tags={form.tags} onChange={(tags) => setForm({ ...form, tags })} />
          </div>
          <SupplyPicker
            vehicleId={vehicleId}
            supplies={state.supplies}
            selected={selectedSupplies}
            onChange={setSelectedSupplies}
          />

          {/* Create Reminder */}
          <div className="border-t border-zinc-800 pt-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                className="w-4 h-4 rounded border-zinc-700 bg-zinc-950 text-violet-500 focus:ring-violet-500/30"
                checked={createReminder}
                onChange={(e) => {
                  setCreateReminder(e.target.checked);
                  if (e.target.checked && !reminderDate) {
                    const d = new Date();
                    d.setFullYear(d.getFullYear() + 1);
                    setReminderDate(d.toISOString().split('T')[0]);
                  }
                }}
              />
              <span className="text-sm text-zinc-300">Create Reminder</span>
            </label>
            {createReminder && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-3">
                <div>
                  <label className={labelClass}>Remind Date</label>
                  <input type="date" className={inputClass} value={reminderDate} onChange={(e) => setReminderDate(e.target.value)} />
                </div>
                <div>
                  <label className={labelClass}>Recurring</label>
                  <select
                    className={selectClass}
                    style={{ backgroundImage: selectChevron, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 0.75rem center' }}
                    value={reminderRecurring}
                    onChange={(e) => setReminderRecurring(e.target.value as '' | 'yearly')}
                  >
                    <option value="">One-time</option>
                    <option value="yearly">Yearly</option>
                    <option value="monthly">Monthly</option>
                  </select>
                </div>
              </div>
            )}
          </div>
        </div>
      </Modal>
    </div>
  );
}
