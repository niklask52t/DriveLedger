import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Plus, Pencil, Trash2, ArrowRightLeft, Wrench } from 'lucide-react';
import Modal from '../components/Modal';
import { cn } from '../lib/utils';
import { formatNumber } from '../utils';
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
};

export default function Equipment({ state, setState }: Props) {
  const [modalOpen, setModalOpen] = useState(false);
  const [reassignModalOpen, setReassignModalOpen] = useState(false);
  const [editing, setEditing] = useState<EquipmentType | null>(null);
  const [reassigning, setReassigning] = useState<EquipmentType | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [reassignVehicleId, setReassignVehicleId] = useState<string>('');

  const items = useMemo(() => {
    return [...state.equipment].sort((a, b) => a.name.localeCompare(b.name));
  }, [state.equipment]);

  const totalEquipment = items.length;
  const equippedCount = items.filter(e => e.isEquipped).length;
  const totalDistance = items.reduce((s, e) => s + e.totalDistance, 0);

  const getVehicleName = (id: string | null) => {
    if (!id) return 'Unassigned';
    return state.vehicles.find(v => v.id === id)?.name || '-';
  };

  const openAdd = () => {
    setEditing(null);
    setForm({ ...emptyForm });
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
    });
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

  const selectClasses = "w-full h-10 bg-zinc-950 border border-zinc-800 rounded-lg px-3 text-sm text-zinc-50 outline-none focus:border-violet-500/50 appearance-none";
  const inputClasses = "w-full h-10 bg-zinc-950 border border-zinc-800 rounded-lg px-3 text-sm text-zinc-50 placeholder:text-zinc-600 outline-none focus:border-violet-500/50";
  const chevronBg = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%2371717a' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E") no-repeat right 10px center`;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-zinc-400">Track tools, accessories, and equipment across your vehicles.</p>
        <button onClick={openAdd} className="bg-violet-500 hover:bg-violet-400 text-white rounded-lg h-10 px-5 text-sm font-medium inline-flex items-center gap-2">
          <Plus size={16} />
          Add Equipment
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-6">
        {[
          { label: 'Total Equipment', value: String(totalEquipment), color: 'text-violet-400' },
          { label: 'Equipped', value: String(equippedCount), color: 'text-emerald-400' },
          { label: 'Total Distance', value: totalDistance > 0 ? `${formatNumber(totalDistance)} km` : '-', color: 'text-sky-400' },
        ].map(s => (
          <div key={s.label}>
            <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">{s.label}</p>
            <p className={cn('text-2xl font-semibold', s.color)}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Equipment Grid */}
      {items.length === 0 ? (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-12 text-center">
          <Wrench size={32} className="text-zinc-600 mx-auto mb-3" />
          <p className="text-sm text-zinc-500">No equipment found. Add your first piece of equipment to start tracking.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map(equipment => (
            <motion.div
              key={equipment.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-zinc-900 border border-zinc-800 rounded-xl p-5"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-medium text-zinc-50 truncate">{equipment.name}</h3>
                  {equipment.description && (
                    <p className="text-xs text-zinc-500 mt-1 line-clamp-2">{equipment.description}</p>
                  )}
                </div>
                <div className="flex items-center gap-1 ml-2 flex-shrink-0">
                  <button onClick={() => openReassign(equipment)} className="text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-lg h-8 w-8 inline-flex items-center justify-center" title="Reassign">
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
                <div className="flex items-center justify-between text-xs">
                  <span className="text-zinc-500">Vehicle</span>
                  <span className="text-zinc-300">{getVehicleName(equipment.vehicleId)}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-zinc-500">Status</span>
                  {equipment.isEquipped ? (
                    <span className="inline-block px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-medium">Equipped</span>
                  ) : (
                    <span className="inline-block px-2 py-0.5 rounded-full bg-zinc-500/10 text-zinc-400 text-xs font-medium">Not Equipped</span>
                  )}
                </div>
                {equipment.totalDistance > 0 && (
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-zinc-500">Distance</span>
                    <span className="text-zinc-300">{formatNumber(equipment.totalDistance)} km</span>
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
        title={editing ? 'Edit Equipment' : 'Add Equipment'}
        size="lg"
        footer={
          <>
            <button onClick={() => setModalOpen(false)} className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg h-10 px-4 text-sm">
              Cancel
            </button>
            <button onClick={handleSave} className="bg-violet-500 hover:bg-violet-400 text-white rounded-lg h-10 px-5 text-sm font-medium">
              {editing ? 'Save Changes' : 'Add Equipment'}
            </button>
          </>
        }
      >
        <div className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-2">Name</label>
            <input
              type="text"
              value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
              placeholder="e.g. Jack, Torque wrench"
              className={inputClasses}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-2">Description</label>
            <input
              type="text"
              value={form.description}
              onChange={e => setForm({ ...form, description: e.target.value })}
              placeholder="Brief description"
              className={inputClasses}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-2">Vehicle (optional)</label>
            <select
              value={form.vehicleId || ''}
              onChange={e => setForm({ ...form, vehicleId: e.target.value || null })}
              className={selectClasses}
              style={{ background: chevronBg }}
            >
              <option value="">Unassigned</option>
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
            <span className="text-sm text-zinc-400">Currently equipped</span>
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-2">Notes</label>
            <textarea
              value={form.notes}
              onChange={e => setForm({ ...form, notes: e.target.value })}
              placeholder="Optional notes..."
              className="w-full min-h-[80px] h-auto bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2.5 text-sm text-zinc-50 placeholder:text-zinc-600 outline-none focus:border-violet-500/50 resize-none"
            />
          </div>
        </div>
      </Modal>

      {/* Reassign Modal */}
      <Modal
        isOpen={reassignModalOpen}
        onClose={() => setReassignModalOpen(false)}
        title="Reassign Equipment"
        size="sm"
        footer={
          <>
            <button onClick={() => setReassignModalOpen(false)} className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg h-10 px-4 text-sm">
              Cancel
            </button>
            <button onClick={handleReassign} className="bg-violet-500 hover:bg-violet-400 text-white rounded-lg h-10 px-5 text-sm font-medium">
              Reassign
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <p className="text-sm text-zinc-400">
            Move <span className="text-zinc-50 font-medium">{reassigning?.name}</span> to a different vehicle.
          </p>
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-2">Target Vehicle</label>
            <select
              value={reassignVehicleId}
              onChange={e => setReassignVehicleId(e.target.value)}
              className={selectClasses}
              style={{ background: chevronBg }}
            >
              <option value="">Unassigned</option>
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
