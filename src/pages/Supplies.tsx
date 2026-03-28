import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Plus, Pencil, Trash2, ArrowUpDown, Package, AlertCircle, ClipboardList, History, Undo2, Download, Printer } from 'lucide-react';
import Modal from '../components/Modal';
import TagInput from '../components/TagInput';
import TagFilter from '../components/TagFilter';
import BulkActions from '../components/BulkActions';
import ExtraFields from '../components/ExtraFields';
import AttachmentManager from '../components/AttachmentManager';
import { useExtraFields } from '../hooks/useExtraFields';
import ColumnSettings, { useColumnPreferences } from '../components/ColumnSettings';
import { cn } from '../lib/utils';
import { useI18n } from '../contexts/I18nContext';
import { formatCurrency, formatDate } from '../utils';
import { api } from '../api';
import type { AppState, Supply, SupplyRequisition } from '../types';

interface Props {
  state: AppState;
  setState: (s: AppState) => void;
}

const emptyForm = {
  vehicleId: '' as string | null,
  name: '',
  partNumber: '',
  quantity: 0,
  unitCost: 0,
  description: '',
  notes: '',
  tags: [] as string[],
};

const emptyRequisitionForm = {
  quantity: 1,
  recordType: '',
  recordId: '',
  description: '',
};

type SortKey = 'name' | 'partNumber' | 'quantity' | 'unitCost';
type FilterMode = 'all' | 'shop' | 'vehicle';

const suppliesColumns = [
  { key: 'name', label: 'Name' },
  { key: 'partNumber', label: 'Part Number' },
  { key: 'vehicle', label: 'Vehicle' },
  { key: 'quantity', label: 'Quantity' },
  { key: 'available', label: 'Available' },
  { key: 'unitCost', label: 'Unit Cost' },
  { key: 'totalValue', label: 'Total Value' },
  { key: 'tags', label: 'Tags' },
];

export default function Supplies({ state, setState }: Props) {
  const { t } = useI18n();
  const { visibleColumns } = useColumnPreferences('supplies', suppliesColumns);
  const isVisible = (col: string) => visibleColumns.some(c => c.key === col);
  const extraFieldDefs = useExtraFields();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Supply | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [extraFieldValues, setExtraFieldValues] = useState<Record<string, string>>({});
  const [filterMode, setFilterMode] = useState<FilterMode>('all');
  const [sortKey, setSortKey] = useState<SortKey>('name');
  const [sortAsc, setSortAsc] = useState(true);
  const [filterTags, setFilterTags] = useState<string[]>([]);
  const [tagFilterMode, setTagFilterMode] = useState<'include' | 'exclude'>('include');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Requisition modal
  const [requisitionModalOpen, setRequisitionModalOpen] = useState(false);
  const [requisitionSupply, setRequisitionSupply] = useState<Supply | null>(null);
  const [requisitionForm, setRequisitionForm] = useState(emptyRequisitionForm);

  // History modal
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [historySupply, setHistorySupply] = useState<Supply | null>(null);
  const [requisitions, setRequisitions] = useState<SupplyRequisition[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const allTags = useMemo(() => [...new Set(state.supplies.flatMap(r => r.tags || []))], [state.supplies]);

  const filtered = useMemo(() => {
    let items = [...state.supplies];
    if (filterMode === 'shop') items = items.filter(s => !s.vehicleId);
    if (filterMode === 'vehicle') items = items.filter(s => !!s.vehicleId);
    if (filterTags.length > 0) {
      if (tagFilterMode === 'include') {
        items = items.filter(r => (r.tags || []).some(t => filterTags.includes(t)));
      } else {
        items = items.filter(r => !(r.tags || []).some(t => filterTags.includes(t)));
      }
    }
    return items;
  }, [state.supplies, filterMode, filterTags, tagFilterMode]);

  const sorted = useMemo(() => {
    const arr = [...filtered];
    arr.sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case 'name': cmp = a.name.localeCompare(b.name); break;
        case 'partNumber': cmp = (a.partNumber || '').localeCompare(b.partNumber || ''); break;
        case 'quantity': cmp = a.quantity - b.quantity; break;
        case 'unitCost': cmp = a.unitCost - b.unitCost; break;
      }
      return sortAsc ? cmp : -cmp;
    });
    return arr;
  }, [filtered, sortKey, sortAsc]);

  const totalItems = filtered.length;
  const totalValue = filtered.reduce((s, r) => s + r.quantity * r.unitCost, 0);
  const lowStockCount = filtered.filter(r => {
    const avail = r.availableQuantity !== undefined && r.availableQuantity !== null ? r.availableQuantity : r.quantity;
    return avail <= 2;
  }).length;

  const getVehicleName = (id: string | null) => {
    if (!id) return t('supplies.shop_supplies');
    return state.vehicles.find(v => v.id === id)?.name || '-';
  };

  const getAvailable = (supply: Supply) => {
    return supply.availableQuantity !== undefined && supply.availableQuantity !== null
      ? supply.availableQuantity
      : supply.quantity;
  };

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc(!sortAsc);
    else { setSortKey(key); setSortAsc(true); }
  };

  const openAdd = () => {
    setEditing(null);
    setForm({ ...emptyForm });
    setExtraFieldValues({});
    setModalOpen(true);
  };

  const openEdit = (supply: Supply) => {
    setEditing(supply);
    setForm({
      vehicleId: supply.vehicleId,
      name: supply.name,
      partNumber: supply.partNumber,
      quantity: supply.quantity,
      unitCost: supply.unitCost,
      description: supply.description,
      notes: supply.notes,
      tags: supply.tags || [],
    });
    setExtraFieldValues((supply as any).extraFields || {});
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) return;
    const payload = {
      vehicleId: form.vehicleId || null,
      name: form.name,
      partNumber: form.partNumber,
      quantity: form.quantity,
      unitCost: form.unitCost,
      description: form.description,
      notes: form.notes,
      tags: form.tags,
      extraFields: extraFieldValues,
    };
    try {
      if (editing) {
        const updated = await api.updateSupply(editing.id, payload);
        setState({ ...state, supplies: state.supplies.map(r => r.id === editing.id ? updated : r) });
      } else {
        const created = await api.createSupply(payload);
        setState({ ...state, supplies: [...state.supplies, created] });
      }
      setModalOpen(false);
    } catch (e) {
      console.error('Failed to save supply', e);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.deleteSupply(id);
      setState({ ...state, supplies: state.supplies.filter(r => r.id !== id) });
    } catch (e) {
      console.error('Failed to delete supply', e);
    }
  };

  const handleBulkDelete = async () => {
    try {
      for (const id of selectedIds) {
        await api.deleteSupply(id);
      }
      setState({ ...state, supplies: state.supplies.filter(r => !selectedIds.has(r.id)) });
      setSelectedIds(new Set());
    } catch {
      // ignore
    }
  };

  const handleExport = () => {
    const header = 'Name,Part Number,Vehicle,Quantity,Available,Unit Cost,Total Value\n';
    const rows = filtered.map(s =>
      `"${s.name}","${s.partNumber || ''}","${getVehicleName(s.vehicleId)}",${s.quantity},${getAvailable(s)},${s.unitCost},${s.quantity * s.unitCost}`
    ).join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'supplies.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  // Requisition handlers
  const openRequisition = (supply: Supply) => {
    setRequisitionSupply(supply);
    setRequisitionForm({ ...emptyRequisitionForm });
    setRequisitionModalOpen(true);
  };

  const handleRequisition = async () => {
    if (!requisitionSupply || requisitionForm.quantity <= 0) return;
    try {
      const updated = await api.requisitionSupply(requisitionSupply.id, {
        quantity: requisitionForm.quantity,
        recordType: requisitionForm.recordType,
        recordId: requisitionForm.recordId,
        description: requisitionForm.description,
      });
      setState({ ...state, supplies: state.supplies.map(r => r.id === requisitionSupply.id ? updated : r) });
      setRequisitionModalOpen(false);
    } catch (e) {
      console.error('Failed to requisition supply', e);
    }
  };

  // History handlers
  const openHistory = async (supply: Supply) => {
    setHistorySupply(supply);
    setHistoryModalOpen(true);
    setLoadingHistory(true);
    try {
      const data = await api.getSupplyRequisitions(supply.id);
      setRequisitions(data);
    } catch (e) {
      console.error('Failed to load requisitions', e);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleRestore = async (requisition: SupplyRequisition) => {
    if (!historySupply) return;
    try {
      const updated = await api.restoreSupply(historySupply.id, requisition.id);
      setState({ ...state, supplies: state.supplies.map(r => r.id === historySupply.id ? updated : r) });
      setRequisitions(requisitions.filter(r => r.id !== requisition.id));
    } catch (e) {
      console.error('Failed to restore supply', e);
    }
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
        <p className="text-sm text-zinc-400">{t('supplies.subtitle')}</p>
        <div className="flex items-center gap-3">
          <TagFilter
            allTags={allTags}
            selectedTags={filterTags}
            onTagsChange={setFilterTags}
            filterMode={tagFilterMode}
            onFilterModeChange={setTagFilterMode}
          />
          <ColumnSettings tableKey="supplies" allColumns={suppliesColumns} />
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
            {t('supplies.add')}
          </button>
        </div>
      </div>

      {/* Toggle + Stats */}
      <div className="flex flex-col md:flex-row gap-6">
        {/* Toggle */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-1.5 inline-flex self-start">
          {(['all', 'shop', 'vehicle'] as FilterMode[]).map(mode => (
            <button
              key={mode}
              onClick={() => setFilterMode(mode)}
              className={cn(
                'rounded-lg h-9 px-4 text-sm transition-colors',
                filterMode === mode ? 'bg-violet-500 text-white' : 'text-zinc-400 hover:text-zinc-200'
              )}
            >
              {mode === 'all' ? t('supplies.filter_all') : mode === 'shop' ? t('supplies.filter_shop') : t('supplies.filter_vehicle')}
            </button>
          ))}
        </div>

        {/* Stats */}
        <div className="flex gap-8 items-center">
          {[
            { label: t('supplies.total_items'), value: String(totalItems), color: 'text-violet-400' },
            { label: t('supplies.total_value'), value: formatCurrency(totalValue), color: 'text-sky-400' },
            { label: t('supplies.low_stock'), value: String(lowStockCount), color: lowStockCount > 0 ? 'text-amber-400' : 'text-emerald-400' },
          ].map(s => (
            <div key={s.label}>
              <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">{s.label}</p>
              <p className={cn('text-2xl font-semibold', s.color)}>{s.value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Bulk Actions */}
      <BulkActions
        selectedCount={selectedIds.size}
        selectedIds={Array.from(selectedIds)}
        onDelete={handleBulkDelete}
        onDeselect={() => setSelectedIds(new Set())}
        recordType="supplies"
        vehicles={state.vehicles}
        onComplete={async () => {
          const supplies = await api.getSupplies();
          setState({ ...state, supplies });
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
                {isVisible('name') && <SortHeader label={t('common.name')} col="name" />}
                {isVisible('partNumber') && <SortHeader label={t('supplies.part_number')} col="partNumber" />}
                {isVisible('vehicle') && <th className="px-4 py-3 text-xs text-zinc-500 uppercase tracking-wider text-left">{t('common.vehicle')}</th>}
                {isVisible('quantity') && <SortHeader label={t('supplies.quantity')} col="quantity" />}
                {isVisible('available') && <th className="px-4 py-3 text-xs text-zinc-500 uppercase tracking-wider">{t('supplies.available')}</th>}
                {isVisible('unitCost') && <SortHeader label={t('supplies.unit_cost')} col="unitCost" />}
                {isVisible('totalValue') && <th className="px-4 py-3 text-xs text-zinc-500 uppercase tracking-wider">{t('supplies.total_value')}</th>}
                {isVisible('tags') && <th className="px-4 py-3 text-xs text-zinc-500 uppercase tracking-wider">{t('common.tags')}</th>}
                <th className="px-4 py-3 text-xs text-zinc-500 uppercase tracking-wider text-right">{t('common.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {sorted.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-4 py-12 text-center text-sm text-zinc-500">
                    {t('supplies.no_supplies')}
                  </td>
                </tr>
              ) : (
                sorted.map(supply => {
                  const avail = getAvailable(supply);
                  return (
                    <motion.tr
                      key={supply.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="border-b border-zinc-800/50 hover:bg-zinc-800/30 transition-colors"
                    >
                      <td className="px-4 py-3.5 text-sm w-10">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(supply.id)}
                          onChange={e => {
                            const next = new Set(selectedIds);
                            if (e.target.checked) next.add(supply.id);
                            else next.delete(supply.id);
                            setSelectedIds(next);
                          }}
                          className="rounded border-zinc-700 bg-zinc-800"
                        />
                      </td>
                      {isVisible('name') && (
                        <td className="px-4 py-3.5 text-sm text-zinc-50 font-medium">
                          <div className="flex items-center gap-2">
                            <Package size={14} className="text-zinc-500 flex-shrink-0" />
                            {supply.name}
                          </div>
                        </td>
                      )}
                      {isVisible('partNumber') && <td className="px-4 py-3.5 text-sm text-zinc-400 font-mono">{supply.partNumber || '-'}</td>}
                      {isVisible('vehicle') && (
                        <td className="px-4 py-3.5 text-sm text-zinc-400">
                          {!supply.vehicleId ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 text-xs font-medium">
                              <Package size={10} />
                              {t('supplies.shop_supplies')}
                            </span>
                          ) : getVehicleName(supply.vehicleId)}
                        </td>
                      )}
                      {isVisible('quantity') && (
                        <td className="px-4 py-3.5 text-sm text-center">
                          <span className={cn(
                            'font-medium',
                            supply.quantity <= 2 ? 'text-amber-400' : 'text-zinc-50'
                          )}>
                            {supply.quantity <= 2 && <AlertCircle size={12} className="inline mr-1" />}
                            {supply.quantity}
                          </span>
                        </td>
                      )}
                      {isVisible('available') && (
                        <td className="px-4 py-3.5 text-sm text-center">
                          <span className={cn(
                            'font-medium',
                            avail <= 2 ? 'text-amber-400' : 'text-emerald-400'
                          )}>
                            {avail} / {supply.quantity}
                          </span>
                        </td>
                      )}
                      {isVisible('unitCost') && <td className="px-4 py-3.5 text-sm text-zinc-400 text-center">{formatCurrency(supply.unitCost)}</td>}
                      {isVisible('totalValue') && <td className="px-4 py-3.5 text-sm text-sky-400 font-medium text-center">{formatCurrency(supply.quantity * supply.unitCost)}</td>}
                      {isVisible('tags') && (
                        <td className="px-4 py-3.5 text-sm">
                          <div className="flex flex-wrap gap-1">
                            {(supply.tags || []).map(tag => (
                              <span key={tag} className="inline-block px-2 py-0.5 rounded bg-zinc-800 text-zinc-400 text-xs">{tag}</span>
                            ))}
                          </div>
                        </td>
                      )}
                      <td className="px-4 py-3.5 text-sm text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => openRequisition(supply)}
                            title={t('supplies.requisition')}
                            className="text-zinc-400 hover:text-violet-400 hover:bg-zinc-800 rounded-lg h-9 px-3 text-sm inline-flex items-center"
                          >
                            <ClipboardList size={14} />
                          </button>
                          <button
                            onClick={() => openHistory(supply)}
                            title={t('supplies.requisition_history')}
                            className="text-zinc-400 hover:text-sky-400 hover:bg-zinc-800 rounded-lg h-9 px-3 text-sm inline-flex items-center"
                          >
                            <History size={14} />
                          </button>
                          <button onClick={() => openEdit(supply)} className="text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-lg h-9 px-3 text-sm inline-flex items-center">
                            <Pencil size={14} />
                          </button>
                          <button onClick={() => handleDelete(supply.id)} className="text-zinc-400 hover:text-red-400 hover:bg-zinc-800 rounded-lg h-9 px-3 text-sm inline-flex items-center">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add/Edit Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? t('supplies.edit') : t('supplies.add')}
        size="lg"
        footer={
          <>
            <button onClick={() => setModalOpen(false)} className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg h-10 px-4 text-sm">
              {t('common.cancel')}
            </button>
            <button onClick={handleSave} className="bg-violet-500 hover:bg-violet-400 text-white rounded-lg h-10 px-5 text-sm font-medium">
              {editing ? t('common.save_changes') : t('supplies.add')}
            </button>
          </>
        }
      >
        <div className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-2">{t('common.name')}</label>
              <input
                type="text"
                value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. Oil filter"
                className={inputClasses}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-2">{t('supplies.part_number')}</label>
              <input
                type="text"
                value={form.partNumber}
                onChange={e => setForm({ ...form, partNumber: e.target.value })}
                placeholder="e.g. OC 456"
                className={inputClasses}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-2">{t('supplies.vehicle_optional')}</label>
            <select
              value={form.vehicleId || ''}
              onChange={e => setForm({ ...form, vehicleId: e.target.value || null })}
              className={selectClasses}
              style={{ background: chevronBg }}
            >
              <option value="">{t('supplies.none_shop')}</option>
              {state.vehicles.map(v => (
                <option key={v.id} value={v.id}>{v.name}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-2">{t('supplies.quantity')}</label>
              <input
                type="number"
                value={form.quantity || ''}
                onChange={e => setForm({ ...form, quantity: parseInt(e.target.value) || 0 })}
                placeholder="0"
                className={inputClasses}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-2">{t('supplies.unit_cost')}</label>
              <input
                type="number"
                step="0.01"
                value={form.unitCost || ''}
                onChange={e => setForm({ ...form, unitCost: parseFloat(e.target.value) || 0 })}
                placeholder="0.00"
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
              placeholder={t('common.optional_description')}
              className={inputClasses}
            />
          </div>

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
            recordType="supply"
            values={extraFieldValues}
            onChange={setExtraFieldValues}
            definitions={extraFieldDefs}
          />

          {editing && (
            <AttachmentManager recordType="supply" recordId={editing.id} />
          )}
        </div>
      </Modal>

      {/* Requisition Modal */}
      <Modal
        isOpen={requisitionModalOpen}
        onClose={() => setRequisitionModalOpen(false)}
        title={`${t('supplies.requisition')}: ${requisitionSupply?.name || ''}`}
        size="md"
        footer={
          <>
            <button onClick={() => setRequisitionModalOpen(false)} className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg h-10 px-4 text-sm">
              {t('common.cancel')}
            </button>
            <button onClick={handleRequisition} className="bg-violet-500 hover:bg-violet-400 text-white rounded-lg h-10 px-5 text-sm font-medium">
              {t('supplies.consume')}
            </button>
          </>
        }
      >
        <div className="space-y-5">
          {requisitionSupply && (
            <p className="text-sm text-zinc-400">
              {t('supplies.available')}: <span className="text-zinc-50 font-medium">{getAvailable(requisitionSupply)}</span> of {requisitionSupply.quantity}
            </p>
          )}
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-2">{t('supplies.quantity_consume')}</label>
            <input
              type="number"
              min={1}
              max={requisitionSupply ? getAvailable(requisitionSupply) : 1}
              value={requisitionForm.quantity}
              onChange={e => setRequisitionForm({ ...requisitionForm, quantity: parseInt(e.target.value) || 0 })}
              className={inputClasses}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-2">{t('supplies.description_reason')}</label>
            <input
              type="text"
              value={requisitionForm.description}
              onChange={e => setRequisitionForm({ ...requisitionForm, description: e.target.value })}
              placeholder="e.g. Used for oil change"
              className={inputClasses}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-2">{t('supplies.record_type')}</label>
              <input
                type="text"
                value={requisitionForm.recordType}
                onChange={e => setRequisitionForm({ ...requisitionForm, recordType: e.target.value })}
                placeholder="e.g. service"
                className={inputClasses}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-2">{t('supplies.record_id')}</label>
              <input
                type="text"
                value={requisitionForm.recordId}
                onChange={e => setRequisitionForm({ ...requisitionForm, recordId: e.target.value })}
                placeholder="Link to record"
                className={inputClasses}
              />
            </div>
          </div>
        </div>
      </Modal>

      {/* History Modal */}
      <Modal
        isOpen={historyModalOpen}
        onClose={() => setHistoryModalOpen(false)}
        title={`${t('supplies.requisition_history')}: ${historySupply?.name || ''}`}
        size="xl"
      >
        {loadingHistory ? (
          <p className="text-sm text-zinc-500 text-center py-8">{t('common.loading')}</p>
        ) : requisitions.length === 0 ? (
          <p className="text-sm text-zinc-500 text-center py-8">{t('supplies.no_requisitions')}</p>
        ) : (
          <div className="space-y-3">
            {requisitions.map(req => (
              <div key={req.id} className="flex items-center justify-between bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-3">
                <div>
                  <p className="text-sm text-zinc-50 font-medium">
                    {req.quantity}x {t('supplies.consumed')}
                    {req.description && <span className="text-zinc-400"> &mdash; {req.description}</span>}
                  </p>
                  <p className="text-xs text-zinc-500 mt-0.5">
                    {formatDate(req.date)}
                    {req.recordType && ` | ${req.recordType}`}
                    {req.cost > 0 && ` | ${formatCurrency(req.cost)}`}
                  </p>
                </div>
                <button
                  onClick={() => handleRestore(req)}
                  title={t('supplies.restore')}
                  className="text-zinc-400 hover:text-emerald-400 hover:bg-zinc-800 rounded-lg h-9 px-3 text-sm inline-flex items-center gap-1"
                >
                  <Undo2 size={14} />
                  <span className="text-xs">{t('supplies.restore')}</span>
                </button>
              </div>
            ))}
          </div>
        )}
      </Modal>
    </div>
  );
}
