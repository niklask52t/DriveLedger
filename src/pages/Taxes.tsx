import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Plus, Pencil, Trash2, ArrowUpDown, AlertTriangle, RefreshCw, FastForward, Download, Printer } from 'lucide-react';
import Modal from '../components/Modal';
import TagInput from '../components/TagInput';
import TagFilter from '../components/TagFilter';
import BulkActions from '../components/BulkActions';
import ExtraFields from '../components/ExtraFields';
import { useExtraFields } from '../hooks/useExtraFields';
import ColumnSettings, { useColumnPreferences } from '../components/ColumnSettings';
import { cn } from '../lib/utils';
import { useI18n } from '../contexts/I18nContext';
import { formatCurrency, formatDate } from '../utils';
import { api } from '../api';
import type { AppState, TaxRecord } from '../types';

interface Props {
  state: AppState;
  setState: (s: AppState) => void;
}

const emptyForm = {
  vehicleId: '',
  date: '',
  description: '',
  cost: 0,
  isRecurring: false,
  recurringInterval: '',
  recurringIntervalUnit: 'months',
  dueDate: '',
  notes: '',
  tags: [] as string[],
};

type SortKey = 'date' | 'description' | 'cost' | 'dueDate';

const taxesColumns = [
  { key: 'date', label: 'Date' },
  { key: 'vehicle', label: 'Vehicle' },
  { key: 'description', label: 'Description' },
  { key: 'cost', label: 'Cost' },
  { key: 'recurring', label: 'Recurring' },
  { key: 'dueDate', label: 'Due Date' },
  { key: 'tags', label: 'Tags' },
];

export default function Taxes({ state, setState }: Props) {
  const { t } = useI18n();
  const extraFieldDefs = useExtraFields();
  const taxExtraFieldDefs = useMemo(() =>
    extraFieldDefs.filter(d => d.recordType === 'tax').sort((a, b) => a.sortOrder - b.sortOrder),
    [extraFieldDefs]
  );
  const allTaxesColumns = useMemo(() => [
    ...taxesColumns,
    ...taxExtraFieldDefs.map(d => ({ key: `extra_${d.fieldName}`, label: d.fieldName })),
  ], [taxExtraFieldDefs]);
  const { visibleColumns } = useColumnPreferences('taxes', allTaxesColumns);
  const isVisible = (col: string) => visibleColumns.some(c => c.key === col);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<TaxRecord | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [extraFieldValues, setExtraFieldValues] = useState<Record<string, string>>({});
  const [sortKey, setSortKey] = useState<SortKey>('date');
  const [sortAsc, setSortAsc] = useState(false);
  const [filterTags, setFilterTags] = useState<string[]>([]);
  const [tagFilterMode, setTagFilterMode] = useState<'include' | 'exclude'>('include');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const today = new Date().toISOString().split('T')[0];

  const allTags = useMemo(() => [...new Set(state.taxRecords.flatMap(r => r.tags || []))], [state.taxRecords]);

  const isOverdue = (record: TaxRecord) => record.dueDate && record.dueDate < today;

  const filtered = useMemo(() => {
    let items = [...state.taxRecords];
    if (filterTags.length > 0) {
      if (tagFilterMode === 'include') {
        items = items.filter(r => (r.tags || []).some(t => filterTags.includes(t)));
      } else {
        items = items.filter(r => !(r.tags || []).some(t => filterTags.includes(t)));
      }
    }
    return items;
  }, [state.taxRecords, filterTags, tagFilterMode]);

  const sorted = useMemo(() => {
    const arr = [...filtered];
    arr.sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case 'date': cmp = a.date.localeCompare(b.date); break;
        case 'description': cmp = a.description.localeCompare(b.description); break;
        case 'cost': cmp = a.cost - b.cost; break;
        case 'dueDate': cmp = (a.dueDate || '').localeCompare(b.dueDate || ''); break;
      }
      return sortAsc ? cmp : -cmp;
    });
    return arr;
  }, [filtered, sortKey, sortAsc]);

  const totalTaxPaid = filtered.reduce((s, r) => s + r.cost, 0);
  const recurringCount = filtered.filter(r => r.isRecurring).length;
  const overdueCount = filtered.filter(r => isOverdue(r)).length;

  const getVehicleName = (id: string) => state.vehicles.find(v => v.id === id)?.name || '-';

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc(!sortAsc);
    else { setSortKey(key); setSortAsc(key === 'description'); }
  };

  const openAdd = () => {
    setEditing(null);
    setForm({ ...emptyForm, vehicleId: state.vehicles[0]?.id || '', date: today });
    setExtraFieldValues({});
    setModalOpen(true);
  };

  const openEdit = (record: TaxRecord) => {
    setEditing(record);
    setForm({
      vehicleId: record.vehicleId,
      date: record.date,
      description: record.description,
      cost: record.cost,
      isRecurring: record.isRecurring,
      recurringInterval: record.recurringInterval,
      recurringIntervalUnit: record.recurringIntervalUnit || 'months',
      dueDate: record.dueDate,
      notes: record.notes,
      tags: record.tags || [],
    });
    setExtraFieldValues((record as any).extraFields || {});
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.vehicleId || !form.description.trim()) return;
    const payload = {
      vehicleId: form.vehicleId,
      date: form.date,
      description: form.description,
      cost: form.cost,
      isRecurring: form.isRecurring,
      recurringInterval: form.isRecurring ? form.recurringInterval : '',
      recurringIntervalUnit: form.isRecurring ? form.recurringIntervalUnit : 'months',
      dueDate: form.dueDate,
      notes: form.notes,
      tags: form.tags,
      extraFields: extraFieldValues,
    };
    try {
      if (editing) {
        const updated = await api.updateTaxRecord(editing.id, payload);
        setState({ ...state, taxRecords: state.taxRecords.map(r => r.id === editing.id ? updated : r) });
      } else {
        const created = await api.createTaxRecord(payload);
        setState({ ...state, taxRecords: [...state.taxRecords, created] });
      }
      setModalOpen(false);
    } catch (e) {
      console.error('Failed to save tax record', e);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.deleteTaxRecord(id);
      setState({ ...state, taxRecords: state.taxRecords.filter(r => r.id !== id) });
    } catch (e) {
      console.error('Failed to delete tax record', e);
    }
  };

  const handleBulkDelete = async () => {
    try {
      for (const id of selectedIds) {
        await api.deleteTaxRecord(id);
      }
      setState({ ...state, taxRecords: state.taxRecords.filter(r => !selectedIds.has(r.id)) });
      setSelectedIds(new Set());
    } catch {
      // ignore
    }
  };

  const handleAdvance = async (record: TaxRecord) => {
    try {
      const newRecord = await api.advanceTaxRecord(record.id);
      setState({ ...state, taxRecords: [...state.taxRecords, newRecord] });
    } catch (e) {
      console.error('Failed to advance tax record', e);
    }
  };

  const handleExport = () => {
    const header = 'Date,Vehicle,Description,Cost,Recurring,Due Date\n';
    const rows = filtered.map(r =>
      `"${r.date}","${getVehicleName(r.vehicleId)}","${r.description}",${r.cost},"${r.isRecurring ? 'Yes' : 'No'}","${r.dueDate || ''}"`
    ).join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'taxes.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const formatRecurringLabel = (record: TaxRecord) => {
    if (!record.isRecurring) return '-';
    const interval = record.recurringInterval || '1';
    const unit = record.recurringIntervalUnit || 'months';
    if (interval === '1' && unit === 'months') return 'Monthly';
    if (interval === '3' && unit === 'months') return 'Quarterly';
    if (interval === '6' && unit === 'months') return 'Semi-annual';
    if (interval === '12' && unit === 'months') return 'Yearly';
    // Legacy string intervals
    if (record.recurringInterval === 'monthly') return 'Monthly';
    if (record.recurringInterval === 'quarterly') return 'Quarterly';
    if (record.recurringInterval === 'yearly') return 'Yearly';
    return `Every ${interval} ${unit}`;
  };

  const selectClasses = "w-full h-10 bg-zinc-950 border border-zinc-800 rounded-lg px-3 text-sm text-zinc-50 outline-none focus:border-violet-500/50 appearance-none";
  const inputClasses = "w-full h-10 bg-zinc-950 border border-zinc-800 rounded-lg px-3 text-sm text-zinc-50 placeholder:text-zinc-600 outline-none focus:border-violet-500/50";
  const chevronBg = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%2371717a' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E") no-repeat right 10px center`;

  const SortHeader = ({ label, col }: { label: string; col: SortKey }) => (
    <th
      className="px-4 py-3 text-xs text-zinc-500 uppercase tracking-wider cursor-pointer select-none"
      onClick={() => handleSort(col)}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        <ArrowUpDown size={12} className={cn(sortKey === col ? 'text-violet-400' : 'text-zinc-600')} />
      </span>
    </th>
  );

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-zinc-400">{t('taxes.subtitle')}</p>
        <div className="flex items-center gap-3">
          <TagFilter
            allTags={allTags}
            selectedTags={filterTags}
            onTagsChange={setFilterTags}
            filterMode={tagFilterMode}
            onFilterModeChange={setTagFilterMode}
          />
          <ColumnSettings tableKey="taxes" allColumns={allTaxesColumns} />
          <button onClick={() => window.print()} className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg h-10 px-4 text-sm inline-flex items-center gap-2 no-print">
            <Printer size={16} />
            {t('common.print')}
          </button>
          <button onClick={handleExport} className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg h-10 px-4 text-sm inline-flex items-center gap-2">
            <Download size={16} />
            {t('common.export')}
          </button>
          <button onClick={openAdd} className="bg-violet-500 hover:bg-violet-400 text-white rounded-lg h-10 px-5 text-sm font-medium inline-flex items-center gap-2">
            <Plus size={16} />
            {t('taxes.add')}
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-6">
        {[
          { label: t('taxes.total_paid'), value: formatCurrency(totalTaxPaid), color: 'text-red-400' },
          { label: t('taxes.recurring_count'), value: String(recurringCount), color: 'text-violet-400' },
          { label: t('taxes.overdue'), value: String(overdueCount), color: overdueCount > 0 ? 'text-red-400' : 'text-emerald-400' },
        ].map(s => (
          <div key={s.label}>
            <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">{s.label}</p>
            <p className={cn('text-2xl font-semibold', s.color)}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Bulk Actions */}
      <BulkActions
        selectedCount={selectedIds.size}
        selectedIds={Array.from(selectedIds)}
        onDelete={handleBulkDelete}
        onDeselect={() => setSelectedIds(new Set())}
        recordType="taxes"
        vehicles={state.vehicles}
        onComplete={async () => {
          const taxRecords = await api.getTaxRecords();
          setState({ ...state, taxRecords });
          setSelectedIds(new Set());
        }}
      />

      {/* Table */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-zinc-950/50">
              <tr>
                <th className="px-4 py-3 text-xs text-zinc-500 uppercase tracking-wider text-left w-10">
                  <input
                    type="checkbox"
                    checked={sorted.length > 0 && selectedIds.size === sorted.length}
                    onChange={e => {
                      if (e.target.checked) setSelectedIds(new Set(sorted.map(r => r.id)));
                      else setSelectedIds(new Set());
                    }}
                    className="rounded border-zinc-700 bg-zinc-800"
                  />
                </th>
                {isVisible('date') && <SortHeader label={t('common.date')} col="date" />}
                {isVisible('vehicle') && <th className="px-4 py-3 text-xs text-zinc-500 uppercase tracking-wider text-left">{t('common.vehicle')}</th>}
                {isVisible('description') && <SortHeader label={t('common.description')} col="description" />}
                {isVisible('cost') && <SortHeader label={t('common.cost')} col="cost" />}
                {isVisible('recurring') && <th className="px-4 py-3 text-xs text-zinc-500 uppercase tracking-wider">{t('taxes.is_recurring')}</th>}
                {isVisible('dueDate') && <SortHeader label={t('common.due_date')} col="dueDate" />}
                {isVisible('tags') && <th className="px-4 py-3 text-xs text-zinc-500 uppercase tracking-wider">{t('common.tags')}</th>}
                {taxExtraFieldDefs.map(d => (
                  <th key={d.id} className="px-4 py-3 text-xs text-zinc-500 uppercase tracking-wider">{d.fieldName}</th>
                ))}
                <th className="px-4 py-3 text-xs text-zinc-500 uppercase tracking-wider text-right">{t('common.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {sorted.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-sm text-zinc-500">
                    {t('taxes.no_taxes')}
                  </td>
                </tr>
              ) : (
                sorted.map(record => (
                  <motion.tr
                    key={record.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className={cn(
                      'border-b border-zinc-800/50 transition-colors',
                      isOverdue(record) ? 'bg-red-950/20 hover:bg-red-950/30' : 'hover:bg-zinc-800/30'
                    )}
                  >
                    <td className="px-4 py-3.5 text-sm w-10">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(record.id)}
                        onChange={e => {
                          const next = new Set(selectedIds);
                          if (e.target.checked) next.add(record.id);
                          else next.delete(record.id);
                          setSelectedIds(next);
                        }}
                        className="rounded border-zinc-700 bg-zinc-800"
                      />
                    </td>
                    {isVisible('date') && <td className="px-4 py-3.5 text-sm text-zinc-400">{formatDate(record.date)}</td>}
                    {isVisible('vehicle') && <td className="px-4 py-3.5 text-sm text-zinc-400">{getVehicleName(record.vehicleId)}</td>}
                    {isVisible('description') && (
                      <td className="px-4 py-3.5 text-sm text-zinc-50 font-medium">
                        <div className="flex items-center gap-2">
                          {isOverdue(record) && <AlertTriangle size={14} className="text-red-400 flex-shrink-0" />}
                          {record.description}
                        </div>
                      </td>
                    )}
                    {isVisible('cost') && <td className="px-4 py-3.5 text-sm text-red-400 font-medium">{formatCurrency(record.cost)}</td>}
                    {isVisible('recurring') && (
                      <td className="px-4 py-3.5 text-sm text-center">
                        {record.isRecurring ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-violet-500/10 text-violet-400 text-xs">
                            <RefreshCw size={10} />
                            {formatRecurringLabel(record)}
                          </span>
                        ) : (
                          <span className="text-zinc-600 text-xs">-</span>
                        )}
                      </td>
                    )}
                    {isVisible('dueDate') && (
                      <td className="px-4 py-3.5 text-sm text-zinc-400">
                        {record.dueDate ? (
                          <span className={cn(isOverdue(record) && 'text-red-400 font-medium')}>
                            {formatDate(record.dueDate)}
                          </span>
                        ) : '-'}
                      </td>
                    )}
                    {isVisible('tags') && (
                      <td className="px-4 py-3.5 text-sm">
                        <div className="flex flex-wrap gap-1">
                          {(record.tags || []).map(tag => (
                            <span key={tag} className="inline-block px-2 py-0.5 rounded bg-zinc-800 text-zinc-400 text-xs">{tag}</span>
                          ))}
                        </div>
                      </td>
                    )}
                    {taxExtraFieldDefs.map(d => (
                      <td key={d.id} className="px-4 py-3.5 text-sm text-zinc-400">
                        {((record as any).extraFields || {})[d.fieldName] || '-'}
                      </td>
                    ))}
                    <td className="px-4 py-3.5 text-sm text-right">
                      <div className="flex items-center justify-end gap-1">
                        {record.isRecurring && (
                          <button
                            onClick={() => handleAdvance(record)}
                            title={t('taxes.advance')}
                            className="text-zinc-400 hover:text-emerald-400 hover:bg-zinc-800 rounded-lg h-9 px-3 text-sm inline-flex items-center"
                          >
                            <FastForward size={14} />
                          </button>
                        )}
                        <button onClick={() => openEdit(record)} className="text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-lg h-9 px-3 text-sm inline-flex items-center">
                          <Pencil size={14} />
                        </button>
                        <button onClick={() => handleDelete(record.id)} className="text-zinc-400 hover:text-red-400 hover:bg-zinc-800 rounded-lg h-9 px-3 text-sm inline-flex items-center">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add/Edit Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? t('taxes.edit') : t('taxes.add')}
        size="lg"
        footer={
          <>
            <button onClick={() => setModalOpen(false)} className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg h-10 px-4 text-sm">
              {t('common.cancel')}
            </button>
            <button onClick={handleSave} className="bg-violet-500 hover:bg-violet-400 text-white rounded-lg h-10 px-5 text-sm font-medium">
              {editing ? t('common.save_changes') : t('taxes.add')}
            </button>
          </>
        }
      >
        <div className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-2">{t('common.vehicle')}</label>
              <select
                value={form.vehicleId}
                onChange={e => setForm({ ...form, vehicleId: e.target.value })}
                className={selectClasses}
                style={{ background: chevronBg }}
              >
                <option value="">{t('common.select_vehicle')}</option>
                {state.vehicles.map(v => (
                  <option key={v.id} value={v.id}>{v.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-2">{t('common.date')}</label>
              <input
                type="date"
                value={form.date}
                onChange={e => setForm({ ...form, date: e.target.value })}
                className={inputClasses}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-2">{t('common.description')}</label>
            <input
              type="text"
              value={form.description}
              onChange={e => setForm({ ...form, description: e.target.value })}
              placeholder={t('taxes.tax_payment')}
              className={inputClasses}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-2">{t('common.cost')}</label>
              <input
                type="number"
                step="0.01"
                value={form.cost || ''}
                onChange={e => setForm({ ...form, cost: parseFloat(e.target.value) || 0 })}
                placeholder="0.00"
                className={inputClasses}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-2">{t('common.due_date')}</label>
              <input
                type="date"
                value={form.dueDate}
                onChange={e => setForm({ ...form, dueDate: e.target.value })}
                className={inputClasses}
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={form.isRecurring}
              onChange={e => setForm({ ...form, isRecurring: e.target.checked })}
              className="w-4 h-4 rounded border-zinc-700 bg-zinc-950 text-violet-500 focus:ring-violet-500/50"
            />
            <span className="text-sm text-zinc-400">{t('taxes.recurring_payment')}</span>
          </div>

          {form.isRecurring && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-2">{t('taxes.interval')}</label>
                <input
                  type="number"
                  min={1}
                  value={form.recurringInterval || ''}
                  onChange={e => setForm({ ...form, recurringInterval: e.target.value })}
                  placeholder="e.g. 12"
                  className={inputClasses}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-2">{t('taxes.unit')}</label>
                <select
                  value={form.recurringIntervalUnit}
                  onChange={e => setForm({ ...form, recurringIntervalUnit: e.target.value })}
                  className={selectClasses}
                  style={{ background: chevronBg }}
                >
                  <option value="months">{t('taxes.months')}</option>
                  <option value="days">{t('taxes.days')}</option>
                </select>
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-2">{t('common.tags')}</label>
            <TagInput
              tags={form.tags}
              onChange={tags => setForm({ ...form, tags })}
              suggestions={allTags}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-2">{t('common.notes')}</label>
            <textarea
              value={form.notes}
              onChange={e => setForm({ ...form, notes: e.target.value })}
              placeholder={t('common.optional_notes')}
              className="w-full min-h-[80px] h-auto bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2.5 text-sm text-zinc-50 placeholder:text-zinc-600 outline-none focus:border-violet-500/50 resize-none"
            />
          </div>

          <ExtraFields
            recordType="tax"
            values={extraFieldValues}
            onChange={setExtraFieldValues}
            definitions={extraFieldDefs}
          />
        </div>
      </Modal>
    </div>
  );
}
