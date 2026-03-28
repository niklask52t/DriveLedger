import { useState } from 'react';
import { Plus, Pencil, Trash2, RefreshCw } from 'lucide-react';
import Modal from '../Modal';
import TagInput from '../TagInput';
import { api } from '../../api';
import { formatDate, formatNumber } from '../../utils';
import { useI18n } from '../../contexts/I18nContext';
import { useUnits } from '../../hooks/useUnits';
import type { AppState, OdometerRecord } from '../../types';

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
  mileage: 0,
  initialMileage: 0,
  notes: '',
  tags: [] as string[],
  equipmentIds: [] as string[],
};

export default function VehicleOdometerTab({ vehicleId, state, setState }: Props) {
  const { t } = useI18n();
  const { fmtDistance, distanceUnit } = useUnits();
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [recalculating, setRecalculating] = useState(false);

  const records = state.odometerRecords
    .filter((r) => r.vehicleId === vehicleId)
    .sort((a, b) => (b.date || '').localeCompare(a.date || ''));

  const openAdd = () => {
    // Auto-fill initial mileage from the latest record's mileage
    const latestRecord = records.length > 0 ? records[0] : null;
    setForm({
      ...emptyForm,
      initialMileage: latestRecord ? latestRecord.mileage : 0,
    });
    setEditingId(null);
    setShowModal(true);
  };

  const vehicleEquipment = state.equipment.filter(
    (e) => e.vehicleId === vehicleId
  );

  const openEdit = (r: OdometerRecord) => {
    setForm({
      date: r.date,
      mileage: r.mileage,
      initialMileage: r.initialMileage || 0,
      notes: r.notes,
      tags: r.tags || [],
      equipmentIds: r.equipmentIds || [],
    });
    setEditingId(r.id);
    setShowModal(true);
  };

  const handleSave = async () => {
    try {
      if (editingId) {
        const updated = await api.updateOdometerRecord(editingId, { ...form, vehicleId });
        setState({ ...state, odometerRecords: state.odometerRecords.map((r) => (r.id === editingId ? updated : r)) });
      } else {
        const created = await api.createOdometerRecord({ ...form, vehicleId });
        setState({ ...state, odometerRecords: [...state.odometerRecords, created] });
      }
      setShowModal(false);
      setEditingId(null);
    } catch (e) {
      console.error('Failed to save odometer record', e);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.deleteOdometerRecord(id);
      setState({ ...state, odometerRecords: state.odometerRecords.filter((r) => r.id !== id) });
    } catch (e) {
      console.error('Failed to delete odometer record', e);
    }
  };

  const handleRecalculate = async () => {
    try {
      setRecalculating(true);
      const updatedRecords = await api.recalculateOdometerDistances(vehicleId);
      // Replace all odometer records for this vehicle
      const otherRecords = state.odometerRecords.filter((r) => r.vehicleId !== vehicleId);
      setState({ ...state, odometerRecords: [...otherRecords, ...updatedRecords] });
    } catch (e) {
      console.error('Failed to recalculate distances', e);
    } finally {
      setRecalculating(false);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <p className="text-sm text-zinc-400">
          {t("vehicle_tab.odometer.count", { count: records.length })}
        </p>
        <div className="flex items-center gap-2">
          {records.length > 0 && (
            <button
              onClick={handleRecalculate}
              disabled={recalculating}
              className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg h-10 px-4 text-sm font-medium inline-flex items-center gap-2 transition-colors disabled:opacity-50"
            >
              <RefreshCw size={16} className={recalculating ? 'animate-spin' : ''} />
              {t("vehicle_tab.odometer.recalculate") || "Recalculate Distances"}
            </button>
          )}
          <button
            onClick={openAdd}
            className="bg-violet-500 hover:bg-violet-400 text-white rounded-lg h-10 px-5 text-sm font-medium inline-flex items-center gap-2 transition-colors"
          >
            <Plus size={16} />
            {t("vehicle_tab.odometer.add")}
          </button>
        </div>
      </div>

      {records.length === 0 ? (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 text-center">
          <p className="text-zinc-500 text-sm">{t("vehicle_tab.odometer.no_readings")}</p>
        </div>
      ) : (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-zinc-800">
                  <th className="px-4 py-3.5 text-left text-xs text-zinc-500 uppercase tracking-wider font-medium">{t("common.date")}</th>
                  <th className="px-4 py-3.5 text-right text-xs text-zinc-500 uppercase tracking-wider font-medium">{t("vehicle_tab.odometer.initial_mileage") || "Initial"}</th>
                  <th className="px-4 py-3.5 text-right text-xs text-zinc-500 uppercase tracking-wider font-medium">{t("vehicle_tab.odometer.final_mileage") || "Final"}</th>
                  <th className="px-4 py-3.5 text-right text-xs text-zinc-500 uppercase tracking-wider font-medium">{t("vehicle_tab.odometer.distance") || "Distance"}</th>
                  <th className="px-4 py-3.5 text-left text-xs text-zinc-500 uppercase tracking-wider font-medium">{t("common.notes")}</th>
                  <th className="px-4 py-3.5 text-left text-xs text-zinc-500 uppercase tracking-wider font-medium">{t("common.tags")}</th>
                  <th className="px-4 py-3.5 text-right text-xs text-zinc-500 uppercase tracking-wider font-medium">{t("common.actions")}</th>
                </tr>
              </thead>
              <tbody>
                {records.map((r) => {
                  const initialMileage = r.initialMileage || 0;
                  const distanceTraveled = r.distanceTraveled ?? (r.mileage - initialMileage);
                  return (
                    <tr key={r.id} className="border-b border-zinc-800/50 hover:bg-zinc-800/30 transition-colors">
                      <td className="px-4 py-3.5 text-sm text-zinc-50">{formatDate(r.date)}</td>
                      <td className="px-4 py-3.5 text-sm text-zinc-400 text-right">{formatNumber(initialMileage)} {distanceUnit}</td>
                      <td className="px-4 py-3.5 text-sm text-zinc-50 text-right font-medium">{formatNumber(r.mileage)} {distanceUnit}</td>
                      <td className="px-4 py-3.5 text-sm text-right">
                        <span className={distanceTraveled > 0 ? 'text-emerald-400 font-medium' : 'text-zinc-500'}>
                          {distanceTraveled > 0 ? `+${formatNumber(distanceTraveled)}` : formatNumber(distanceTraveled)} {distanceUnit}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-sm text-zinc-400 max-w-[200px] truncate">{r.notes || '-'}</td>
                      <td className="px-4 py-3.5">
                        <div className="flex flex-wrap gap-1">
                          {(r.tags || []).map((t, i) => (
                            <span key={i} className="bg-zinc-800 rounded-md px-2 py-0.5 text-xs text-zinc-300">{t}</span>
                          ))}
                        </div>
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
        title={editingId ? 'Edit Reading' : '{t("vehicle_tab.odometer.add")}'}
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
          <div className="grid grid-cols-2 gap-4">
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
              <label className={labelClass}>{t("vehicle_tab.odometer.initial_mileage") || "Initial Mileage"} ({distanceUnit})</label>
              <input
                type="number"
                className={inputClass}
                placeholder="0"
                value={form.initialMileage || ''}
                onChange={(e) => setForm({ ...form, initialMileage: parseFloat(e.target.value) || 0 })}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>{t("vehicle_tab.odometer.final_mileage") || "Final Mileage"} ({distanceUnit})</label>
              <input
                type="number"
                className={inputClass}
                placeholder="0"
                value={form.mileage || ''}
                onChange={(e) => setForm({ ...form, mileage: parseFloat(e.target.value) || 0 })}
              />
            </div>
            <div>
              <label className={labelClass}>{t("vehicle_tab.odometer.distance") || "Distance Traveled"}</label>
              <div className="h-10 bg-zinc-950 border border-zinc-800 rounded-lg px-3 flex items-center text-sm text-zinc-400">
                {formatNumber((form.mileage || 0) - (form.initialMileage || 0))} {distanceUnit}
              </div>
            </div>
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
          {vehicleEquipment.length > 0 && (
            <div>
              <label className={labelClass}>Linked Equipment</label>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {vehicleEquipment.map((eq) => (
                  <label key={eq.id} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      className="w-4 h-4 rounded border-zinc-700 bg-zinc-950 text-violet-500 focus:ring-violet-500/30"
                      checked={form.equipmentIds.includes(eq.id)}
                      onChange={(e) => {
                        const next = e.target.checked
                          ? [...form.equipmentIds, eq.id]
                          : form.equipmentIds.filter((id) => id !== eq.id);
                        setForm({ ...form, equipmentIds: next });
                      }}
                    />
                    <span className="text-sm text-zinc-300">{eq.name}</span>
                  </label>
                ))}
              </div>
              <p className="text-xs text-zinc-600 mt-1">Distance will be attributed to selected equipment items.</p>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}
