import { useState } from 'react';
import { Plus, Pencil, Trash2, ChevronDown, ChevronUp, CheckCircle, XCircle, MinusCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Modal from '../Modal';
import { api } from '../../api';
import { formatCurrency, formatDate, formatNumber } from '../../utils';
import { useI18n } from '../../contexts/I18nContext';
import { useUnits } from '../../hooks/useUnits';
import type { AppState, Inspection, InspectionItem, InspectionResult } from '../../types';

const inputClass =
  'w-full h-10 bg-zinc-950 border border-zinc-800 rounded-lg px-3 text-sm text-zinc-50 placeholder:text-zinc-600 outline-none focus:border-violet-500/50';

const selectClass =
  'w-full h-10 bg-zinc-950 border border-zinc-800 rounded-lg px-3 text-sm text-zinc-50 outline-none focus:border-violet-500/50 appearance-none';

const labelClass = 'block text-sm font-medium text-zinc-400 mb-2';

const selectChevron = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%2371717a' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`;

const resultColors: Record<string, string> = {
  pass: 'bg-emerald-500/20 text-emerald-400',
  fail: 'bg-red-500/20 text-red-400',
  na: 'bg-zinc-600/20 text-zinc-400',
};

const resultLabels: Record<string, string> = {
  pass: 'Pass',
  fail: 'Fail',
  na: 'N/A',
};

interface Props {
  vehicleId: string;
  state: AppState;
  setState: (s: AppState) => void;
}

const emptyItem: InspectionItem = { name: '', result: 'pass', notes: '' };

const emptyForm = {
  title: '',
  date: '',
  overallResult: 'pass' as string,
  items: [{ ...emptyItem }] as InspectionItem[],
  mileage: 0,
  cost: 0,
  notes: '',
};

export default function VehicleInspectionsTab({ vehicleId, state, setState }: Props) {
  const { t } = useI18n();
  const { fmtDistance, distanceUnit } = useUnits();
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const records = state.inspections
    .filter((r) => r.vehicleId === vehicleId)
    .sort((a, b) => (b.date || '').localeCompare(a.date || ''));

  const totalCost = records.reduce((s, r) => s + r.cost, 0);

  const openAdd = () => {
    setForm({ ...emptyForm, items: [{ ...emptyItem }] });
    setEditingId(null);
    setShowModal(true);
  };

  const openEdit = (r: Inspection) => {
    setForm({
      title: r.title,
      date: r.date,
      overallResult: r.overallResult,
      items: r.items.length > 0 ? r.items.map((i) => ({ ...i })) : [{ ...emptyItem }],
      mileage: r.mileage,
      cost: r.cost,
      notes: r.notes,
    });
    setEditingId(r.id);
    setShowModal(true);
  };

  const handleSave = async () => {
    try {
      const payload = {
        ...form,
        vehicleId,
        items: form.items.filter((i) => i.name.trim()),
      };
      if (editingId) {
        const updated = await api.updateInspection(editingId, payload);
        setState({ ...state, inspections: state.inspections.map((r) => (r.id === editingId ? updated : r)) });
      } else {
        const created = await api.createInspection(payload);
        setState({ ...state, inspections: [...state.inspections, created] });
      }
      setShowModal(false);
      setEditingId(null);
    } catch (e) {
      console.error('Failed to save inspection', e);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.deleteInspection(id);
      setState({ ...state, inspections: state.inspections.filter((r) => r.id !== id) });
    } catch (e) {
      console.error('Failed to delete inspection', e);
    }
  };

  const updateItem = (index: number, field: keyof InspectionItem, value: string) => {
    const items = form.items.map((item, i) =>
      i === index ? { ...item, [field]: value } : item
    );
    setForm({ ...form, items });
  };

  const addItem = () => {
    setForm({ ...form, items: [...form.items, { ...emptyItem }] });
  };

  const removeItem = (index: number) => {
    if (form.items.length <= 1) return;
    setForm({ ...form, items: form.items.filter((_, i) => i !== index) });
  };

  const ResultIcon = ({ result }: { result: string }) => {
    if (result === 'pass') return <CheckCircle size={14} className="text-emerald-400" />;
    if (result === 'fail') return <XCircle size={14} className="text-red-400" />;
    return <MinusCircle size={14} className="text-zinc-500" />;
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <p className="text-sm text-zinc-400">
          {t('vehicle_tab.inspections.count', { count: records.length })} &middot; {t('common.total')}: {formatCurrency(totalCost)}
        </p>
        <button
          onClick={openAdd}
          className="bg-violet-500 hover:bg-violet-400 text-white rounded-lg h-10 px-5 text-sm font-medium inline-flex items-center gap-2 transition-colors"
        >
          <Plus size={16} />
          {t('vehicle_tab.inspections.add')}
        </button>
      </div>

      {records.length === 0 ? (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 text-center">
          <p className="text-zinc-500 text-sm">{t('vehicle_tab.inspections.no_inspections')}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {records.map((r) => {
            const isExpanded = expandedId === r.id;
            const passCount = r.items.filter((i) => i.result === 'pass').length;
            const failCount = r.items.filter((i) => i.result === 'fail').length;

            return (
              <div key={r.id} className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
                <div
                  className="px-5 py-4 flex items-center justify-between cursor-pointer hover:bg-zinc-800/30 transition-colors"
                  onClick={() => setExpandedId(isExpanded ? null : r.id)}
                >
                  <div className="flex items-center gap-4 min-w-0 flex-1">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-3 mb-1">
                        <h3 className="text-sm font-medium text-zinc-50 truncate" title={r.title}>{r.title}</h3>
                        <span className={`text-xs px-2 py-0.5 rounded-md font-medium shrink-0 ${resultColors[r.overallResult] || resultColors.na}`}>
                          {resultLabels[r.overallResult] || r.overallResult}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-zinc-500">
                        <span>{formatDate(r.date)}</span>
                        {r.mileage > 0 && <span>{fmtDistance(r.mileage)}</span>}
                        {r.items.length > 0 && (
                          <span>
                            {t('vehicle_tab.inspections.passed', { count: passCount })}, {t('vehicle_tab.inspections.failed', { count: failCount })}
                          </span>
                        )}
                        {r.cost > 0 && <span>{formatCurrency(r.cost)}</span>}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 ml-4">
                    <button
                      onClick={(e) => { e.stopPropagation(); openEdit(r); }}
                      className="text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-lg h-9 px-3 text-sm inline-flex items-center transition-colors"
                    >
                      <Pencil size={14} />
                    </button>
                    {deleteConfirm === r.id ? (
                      <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => { handleDelete(r.id); setDeleteConfirm(null); }}
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
                        onClick={(e) => { e.stopPropagation(); setDeleteConfirm(r.id); }}
                        className="text-zinc-400 hover:text-red-400 hover:bg-zinc-800 rounded-lg h-9 px-3 text-sm inline-flex items-center transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                    {isExpanded ? <ChevronUp size={16} className="text-zinc-500" /> : <ChevronDown size={16} className="text-zinc-500" />}
                  </div>
                </div>

                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="border-t border-zinc-800 px-5 py-4">
                        {r.items.length > 0 && (
                          <div className="space-y-2">
                            {r.items.map((item, i) => (
                              <div key={i} className="flex items-center gap-3 text-sm">
                                <ResultIcon result={item.result} />
                                <span className="text-zinc-50 flex-1">{item.name}</span>
                                <span className={`text-xs px-2 py-0.5 rounded-md ${resultColors[item.result] || resultColors.na}`}>
                                  {resultLabels[item.result] || item.result}
                                </span>
                                {item.notes && <span className="text-zinc-500 text-xs max-w-[200px] truncate" title={item.notes}>{item.notes}</span>}
                              </div>
                            ))}
                          </div>
                        )}
                        {r.notes && (
                          <p className="text-sm text-zinc-400 mt-3 pt-3 border-t border-zinc-800/50">{r.notes}</p>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      )}

      <Modal
        isOpen={showModal}
        onClose={() => { setShowModal(false); setEditingId(null); }}
        title={editingId ? t('vehicle_tab.inspections.edit') : t('vehicle_tab.inspections.add')}
        size="xl"
        footer={
          <>
            <button
              onClick={() => { setShowModal(false); setEditingId(null); }}
              className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg h-10 px-4 text-sm transition-colors"
            >
              {t('common.cancel')}
            </button>
            <button
              onClick={handleSave}
              className="bg-violet-500 hover:bg-violet-400 text-white rounded-lg h-10 px-5 text-sm font-medium transition-colors"
            >
              {editingId ? t('common.update') : t('common.add')}
            </button>
          </>
        }
      >
        <div className="space-y-5">
          <div>
            <label className={labelClass}>{t('common.title')}</label>
            <input
              type="text"
              className={inputClass}
              placeholder="e.g. Annual TUV Inspection"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className={labelClass}>{t('common.date')}</label>
              <input
                type="date"
                className={inputClass}
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
              />
            </div>
            <div>
              <label className={labelClass}>{t('vehicle_tab.inspections.overall_result')}</label>
              <select
                className={selectClass}
                style={{ backgroundImage: selectChevron, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 0.75rem center' }}
                value={form.overallResult}
                onChange={(e) => setForm({ ...form, overallResult: e.target.value })}
              >
                <option value="pass">Pass</option>
                <option value="fail">Fail</option>
                <option value="na">N/A</option>
              </select>
            </div>
            <div>
              <label className={labelClass}>{t('vehicle_tab.inspections.cost_eur')}</label>
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
            <label className={labelClass}>{t('common.mileage')} ({distanceUnit})</label>
            <input
              type="number"
              className={inputClass}
              placeholder="0"
              value={form.mileage || ''}
              onChange={(e) => setForm({ ...form, mileage: parseFloat(e.target.value) || 0 })}
            />
          </div>

          {/* Items builder */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="text-sm font-medium text-zinc-400">{t('vehicle_tab.inspections.inspection_items')}</label>
              <button
                type="button"
                onClick={addItem}
                className="text-xs text-violet-400 hover:text-violet-300 transition-colors"
              >
                {t('vehicle_tab.inspections.add_item')}
              </button>
            </div>
            <div className="space-y-2">
              {form.items.map((item, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input
                    type="text"
                    className="flex-1 h-9 bg-zinc-950 border border-zinc-800 rounded-lg px-3 text-sm text-zinc-50 placeholder:text-zinc-600 outline-none focus:border-violet-500/50"
                    placeholder={t('vehicle_tab.inspections.item_name')}
                    value={item.name}
                    onChange={(e) => updateItem(i, 'name', e.target.value)}
                  />
                  <select
                    className="w-24 h-9 bg-zinc-950 border border-zinc-800 rounded-lg px-2 text-sm text-zinc-50 outline-none focus:border-violet-500/50 appearance-none"
                    style={{ backgroundImage: selectChevron, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 0.5rem center' }}
                    value={item.result}
                    onChange={(e) => updateItem(i, 'result', e.target.value as InspectionResult)}
                  >
                    <option value="pass">Pass</option>
                    <option value="fail">Fail</option>
                    <option value="na">N/A</option>
                  </select>
                  <input
                    type="text"
                    className="w-36 h-9 bg-zinc-950 border border-zinc-800 rounded-lg px-3 text-sm text-zinc-50 placeholder:text-zinc-600 outline-none focus:border-violet-500/50"
                    placeholder={t('common.notes')}
                    value={item.notes}
                    onChange={(e) => updateItem(i, 'notes', e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => removeItem(i)}
                    className="text-zinc-500 hover:text-red-400 transition-colors p-1 shrink-0"
                    disabled={form.items.length <= 1}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div>
            <label className={labelClass}>{t('common.notes')}</label>
            <textarea
              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2.5 text-sm text-zinc-50 placeholder:text-zinc-600 outline-none focus:border-violet-500/50 min-h-[80px] resize-none"
              placeholder={t('common.optional_notes')}
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
          </div>
        </div>
      </Modal>
    </div>
  );
}
