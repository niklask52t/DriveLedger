import { useState, useMemo, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Plus, Pencil, Trash2, ArrowRightLeft, Wrench } from 'lucide-react';
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
import { formatNumber } from '../utils';
import { useUnits } from '../hooks/useUnits';
import { api } from '../api';
import type { AppState, Equipment as EquipmentType } from '../types';

interface Props {
  state: AppState;
  setState: (s: AppState) => void;
}

const emptyForm = {
  vehicleId: '' as string | null,
  name: '',
  description: '',
  isEquipped: false,
  notes: '',
  tags: [] as string[],
};

const equipmentColumns = [
  { key: 'name', label: 'Name' },
  { key: 'description', label: 'Description' },
  { key: 'vehicle', label: 'Vehicle' },
  { key: 'status', label: 'Status' },
  { key: 'distance', label: 'Distance' },
  { key: 'tags', label: 'Tags' },
];

export default function Equipment({ state, setState }: Props) {
  const { t } = useI18n();
  const { fmtDistance, distanceUnit } = useUnits();
  const { visibleColumns } = useColumnPreferences('equipment', equipmentColumns);
  const isVisible = (col: string) => visibleColumns.some(c => c.key === col);
  const extraFieldDefs = useExtraFields();
  const [modalOpen, setModalOpen] = useState(false);
  const [reassignModalOpen, setReassignModalOpen] = useState(false);
  const [editing, setEditing] = useState<EquipmentType | null>(null);
  const [reassigning, setReassigning] = useState<EquipmentType | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [extraFieldValues, setExtraFieldValues] = useState<Record<string, string>>({});
  const [reassignVehicleId, setReassignVehicleId] = useState<string>('');
  const [filterTags, setFilterTags] = useState<string[]>([]);
  const [tagFilterMode, setTagFilterMode] = useState<'include' | 'exclude'>('include');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const [odometerDistances, setOdometerDistances] = useState<Record<string, number>>({});

  useEffect(() => {
    api.getEquipmentDistanceSummary().then(setOdometerDistances).catch(() => {});
  }, [state.odometerRecords]);

  const allTags = useMemo(() => [...new Set(state.equipment.flatMap(r => (r as any).tags || []))], [state.equipment]);

  const filtered = useMemo(() => {
    let items = [...state.equipment];
    if (filterTags.length > 0) {
      if (tagFilterMode === 'include') {
        items = items.filter(r => ((r as any).tags || []).some((t: string) => filterTags.includes(t)));
      } else {
        items = items.filter(r => !((r as any).tags || []).some((t: string) => filterTags.includes(t)));
      }
    }
    return items;
  }, [state.equipment, filterTags, tagFilterMode]);

  const items = useMemo(() => {
    return [...filtered].sort((a, b) => a.name.localeCompare(b.name));
  }, [filtered]);

  const totalEquipment = items.length;
  const equippedCount = items.filter(e => e.isEquipped).length;
  const getEquipmentDistance = (eq: EquipmentType) => {
    const odomDist = odometerDistances[eq.id] || 0;
    return Math.max(eq.totalDistance, odomDist);
  };
  const totalDistance = items.reduce((s, e) => s + getEquipmentDistance(e), 0);

  const getVehicleName = (id: string | null) => {
    if (!id) return t('equipment.unassigned');
    return state.vehicles.find(v => v.id === id)?.name || '-';
  };

  const openAdd = () => {
    setEditing(null);
    setForm({ ...emptyForm });
    setExtraFieldValues({});
    setModalOpen(true);
  };

  const openEdit = (equipment: EquipmentType) => {
    setEditing(equipment);
    setForm({
      vehicleId: equipment.vehicleId,
      name: equipment.name,
      description: equipment.description,
      isEquipped: equipment.isEquipped,
      notes: equipment.notes,
      tags: (equipment as any).tags || [],
    });
    setExtraFieldValues((equipment as any).extraFields || {});
    setModalOpen(true);
  };

  const openReassign = (equipment: EquipmentType) => {
    setReassigning(equipment);
    setReassignVehicleId(equipment.vehicleId || '');
    setReassignModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) return;
    const payload = {
      vehicleId: form.vehicleId || null,
      name: form.name,
      description: form.description,
      isEquipped: form.isEquipped,
      notes: form.notes,
      tags: form.tags,
      extraFields: extraFieldValues,
    };
    try {
      if (editing) {
        const updated = await api.updateEquipment(editing.id, payload);
        setState({ ...state, equipment: state.equipment.map(r => r.id === editing.id ? updated : r) });
      } else {
        const created = await api.createEquipment(payload);
        setState({ ...state, equipment: [...state.equipment, created] });
      }
      setModalOpen(false);
    } catch (e) {
      console.error('Failed to save equipment', e);
    }
  };

  const handleReassign = async () => {
    if (!reassigning) return;
    try {
      const updated = await api.reassignEquipment(reassigning.id, reassignVehicleId || null);
      setState({ ...state, equipment: state.equipment.map(r => r.id === reassigning.id ? updated : r) });
      setReassignModalOpen(false);
    } catch (e) {
      console.error('Failed to reassign equipment', e);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.deleteEquipment(id);
      setState({ ...state, equipment: state.equipment.filter(r => r.id !== id) });
    } catch (e) {
      console.error('Failed to delete equipment', e);
    }
  };

  const handleBulkDelete = async () => {
    try {
      for (const id of selectedIds) {
        await api.deleteEquipment(id);
      }
      setState({ ...state, equipment: state.equipment.filter(r => !selectedIds.has(r.id)) });
      setSelectedIds(new Set());
    } catch {
      // ignore
    }
  };

  const selectClasses = "w-full h-10 bg-zinc-950 border border-zinc-800 rounded-lg px-3 text-sm text-zinc-50 outline-none focus:border-violet-500/50 appearance-none";
  const inputClasses = "w-full h-10 bg-zinc-950 border border-zinc-800 rounded-lg px-3 text-sm text-zinc-50 placeholder:text-zinc-600 outline-none focus:border-violet-500/50";
  const chevronBg = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%2371717a' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E") no-repeat right 10px center`;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-zinc-400">{t('equipment.subtitle')}</p>
        <div className="flex items-center gap-3">
          <TagFilter
            allTags={allTags}
            selectedTags={filterTags}
            onTagsChange={setFilterTags}
            filterMode={tagFilterMode}
            onFilterModeChange={setTagFilterMode}
          />
          <ColumnSettings tableKey="equipment" allColumns={equipmentColumns} />
          <button onClick={openAdd} className="bg-violet-500 hover:bg-violet-400 text-white rounded-lg h-10 px-5 text-sm font-medium inline-flex items-center gap-2">
            <Plus size={16} />
            {t('equipment.add')}
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-6">
        {[
          { label: t('equipment.total_equipment'), value: String(totalEquipment), color: 'text-violet-400' },
          { label: t('equipment.equipped_count'), value: String(equippedCount), color: 'text-emerald-400' },
          { label: t('equipment.total_distance'), value: totalDistance > 0 ? fmtDistance(totalDistance) : '-', color: 'text-sky-400' },
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
        recordType="equipment"
        vehicles={state.vehicles}
        onComplete={async () => {
          const equipment = await api.getEquipment();
          setState({ ...state, equipment });
          setSelectedIds(new Set());
        }}
      />

      {/* Equipment Grid */}
      {items.length === 0 ? (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-12 text-center">
          <Wrench size={32} className="text-zinc-600 mx-auto mb-3" />
          <p className="text-sm text-zinc-500">{t('equipment.no_equipment')}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map(equipment => (
            <motion.div
              key={equipment.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={cn(
                "bg-zinc-900 border rounded-xl p-5",
                selectedIds.has(equipment.id) ? 'border-violet-500/50' : 'border-zinc-800'
              )}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <input
                    type="checkbox"
                    checked={selectedIds.has(equipment.id)}
                    onChange={e => {
                      const next = new Set(selectedIds);
                      if (e.target.checked) next.add(equipment.id);
                      else next.delete(equipment.id);
                      setSelectedIds(next);
                    }}
                    className="rounded border-zinc-700 bg-zinc-800 shrink-0"
                  />
                  <div className="min-w-0">
                    {isVisible('name') && <h3 className="text-sm font-medium text-zinc-50 truncate">{equipment.name}</h3>}
                    {isVisible('description') && equipment.description && (
                      <p className="text-xs text-zinc-500 mt-1 line-clamp-2">{equipment.description}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1 ml-2 flex-shrink-0">
                  <button onClick={() => openReassign(equipment)} className="text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-lg h-8 w-8 inline-flex items-center justify-center" title={t('equipment.reassign')}>
                    <ArrowRightLeft size={14} />
                  </button>
                  <button onClick={() => openEdit(equipment)} className="text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-lg h-8 w-8 inline-flex items-center justify-center">
                    <Pencil size={14} />
                  </button>
                  <button onClick={() => handleDelete(equipment.id)} className="text-zinc-400 hover:text-red-400 hover:bg-zinc-800 rounded-lg h-8 w-8 inline-flex items-center justify-center">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                {isVisible('vehicle') && (
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-zinc-500">{t('common.vehicle')}</span>
                    <span className="text-zinc-300">{getVehicleName(equipment.vehicleId)}</span>
                  </div>
                )}
                {isVisible('status') && (
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-zinc-500">{t('common.status')}</span>
                    {equipment.isEquipped ? (
                      <span className="inline-block px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-medium">{t('equipment.is_equipped')}</span>
                    ) : (
                      <span className="inline-block px-2 py-0.5 rounded-full bg-zinc-500/10 text-zinc-400 text-xs font-medium">{t('equipment.not_equipped')}</span>
                    )}
                  </div>
                )}
                {isVisible('distance') && getEquipmentDistance(equipment) > 0 && (
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-zinc-500">{t('equipment.distance')}</span>
                    <span className="text-zinc-300">{fmtDistance(getEquipmentDistance(equipment))}</span>
                  </div>
                )}
                {isVisible('tags') && ((equipment as any).tags || []).length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {((equipment as any).tags || []).map((tag: string) => (
                      <span key={tag} className="inline-block px-2 py-0.5 rounded bg-zinc-800 text-zinc-400 text-xs">{tag}</span>
                    ))}
                  </div>
                )}
              </div>

              {equipment.notes && (
                <p className="text-xs text-zinc-600 mt-3 pt-3 border-t border-zinc-800/50 line-clamp-2">{equipment.notes}</p>
              )}
            </motion.div>
          ))}
        </div>
      )}

      {/* Add/Edit Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? t('equipment.edit') : t('equipment.add')}
        size="lg"
        footer={
          <>
            <button onClick={() => setModalOpen(false)} className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg h-10 px-4 text-sm">
              {t('common.cancel')}
            </button>
            <button onClick={handleSave} className="bg-violet-500 hover:bg-violet-400 text-white rounded-lg h-10 px-5 text-sm font-medium">
              {editing ? t('common.save_changes') : t('equipment.add')}
            </button>
          </>
        }
      >
        <div className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-2">{t('common.name')}</label>
            <input
              type="text"
              value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
              placeholder="e.g. Jack, Torque wrench"
              className={inputClasses}
            />
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
            <label className="block text-sm font-medium text-zinc-400 mb-2">{t('equipment.vehicle_optional')}</label>
            <select
              value={form.vehicleId || ''}
              onChange={e => setForm({ ...form, vehicleId: e.target.value || null })}
              className={selectClasses}
              style={{ background: chevronBg }}
            >
              <option value="">{t('equipment.unassigned')}</option>
              {state.vehicles.map(v => (
                <option key={v.id} value={v.id}>{v.name}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={form.isEquipped}
              onChange={e => setForm({ ...form, isEquipped: e.target.checked })}
              className="w-4 h-4 rounded border-zinc-700 bg-zinc-950 text-violet-500 focus:ring-violet-500/50"
            />
            <span className="text-sm text-zinc-400">{t('equipment.currently_equipped')}</span>
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
            recordType="equipment"
            values={extraFieldValues}
            onChange={setExtraFieldValues}
            definitions={extraFieldDefs}
          />

          {editing && (
            <AttachmentManager recordType="equipment" recordId={editing.id} />
          )}
        </div>
      </Modal>

      {/* Reassign Modal */}
      <Modal
        isOpen={reassignModalOpen}
        onClose={() => setReassignModalOpen(false)}
        title={t('equipment.reassign')}
        size="sm"
        footer={
          <>
            <button onClick={() => setReassignModalOpen(false)} className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg h-10 px-4 text-sm">
              {t('common.cancel')}
            </button>
            <button onClick={handleReassign} className="bg-violet-500 hover:bg-violet-400 text-white rounded-lg h-10 px-5 text-sm font-medium">
              {t('equipment.reassign_btn')}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <p className="text-sm text-zinc-400">
            {t('equipment.reassign_desc').replace('{name}', reassigning?.name || '')}
          </p>
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-2">{t('equipment.target_vehicle')}</label>
            <select
              value={reassignVehicleId}
              onChange={e => setReassignVehicleId(e.target.value)}
              className={selectClasses}
              style={{ background: chevronBg }}
            >
              <option value="">{t('equipment.unassigned')}</option>
              {state.vehicles.map(v => (
                <option key={v.id} value={v.id}>{v.name}</option>
              ))}
            </select>
          </div>
        </div>
      </Modal>
    </div>
  );
}
