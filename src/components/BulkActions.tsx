import { useState } from 'react';
import { Trash2, Pencil, Copy, ArrowRightLeft, X, Truck } from 'lucide-react';
import { api } from '../api';
import type { Vehicle } from '../types';
import BulkEditModal from './BulkEditModal';
import Modal from './Modal';

interface Props {
  selectedCount: number;
  selectedIds: string[];
  onDelete: () => void;
  onDeselect: () => void;
  onMove?: (destType: string) => void;
  showMove?: boolean;
  recordType?: string;
  onComplete?: () => void;
  vehicles?: Vehicle[];
}

export default function BulkActions({ selectedCount, selectedIds, onDelete, onDeselect, onMove, showMove, recordType, onComplete, vehicles }: Props) {
  const [editOpen, setEditOpen] = useState(false);
  const [dupVehicleOpen, setDupVehicleOpen] = useState(false);
  const [targetVehicleId, setTargetVehicleId] = useState('');
  const [duplicating, setDuplicating] = useState(false);

  if (selectedCount === 0) return null;

  const moveTargets = ['services', 'repairs', 'upgrades'].filter(t => t !== recordType);

  const handleDuplicate = async () => {
    if (!recordType) return;
    setDuplicating(true);
    try {
      await api.bulkDuplicate(selectedIds, recordType);
      onComplete?.();
    } catch (err) {
      console.error('Duplicate failed:', err);
    } finally {
      setDuplicating(false);
    }
  };

  const handleDuplicateToVehicle = async () => {
    if (!recordType || !targetVehicleId) return;
    setDuplicating(true);
    try {
      await api.bulkDuplicateToVehicle(selectedIds, recordType, targetVehicleId);
      setDupVehicleOpen(false);
      setTargetVehicleId('');
      onComplete?.();
    } catch (err) {
      console.error('Duplicate to vehicle failed:', err);
    } finally {
      setDuplicating(false);
    }
  };

  return (
    <>
      <div className="flex items-center gap-3 bg-violet-500/10 border border-violet-500/20 rounded-lg px-4 py-2.5 mb-4">
        <span className="text-sm text-violet-300 font-medium">{selectedCount} selected</span>
        <div className="flex-1" />

        {recordType && (
          <button onClick={() => setEditOpen(true)}
            className="text-xs px-2.5 py-1.5 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5">
            <Pencil size={12} /> Edit Selected
          </button>
        )}

        {recordType && (
          <button onClick={handleDuplicate} disabled={duplicating}
            className="text-xs px-2.5 py-1.5 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 disabled:opacity-50">
            <Copy size={12} /> Duplicate
          </button>
        )}

        {recordType && vehicles && vehicles.length > 0 && (
          <button onClick={() => setDupVehicleOpen(true)}
            className="text-xs px-2.5 py-1.5 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5">
            <Truck size={12} /> Duplicate to Vehicle
          </button>
        )}

        {showMove && onMove && (
          <div className="flex items-center gap-1">
            {moveTargets.map(target => (
              <button key={target} onClick={() => onMove(target)}
                className="text-xs px-2.5 py-1.5 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5">
                <ArrowRightLeft size={12} />
                {target.charAt(0).toUpperCase() + target.slice(1)}
              </button>
            ))}
          </div>
        )}

        <button onClick={onDelete}
          className="text-xs px-2.5 py-1.5 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5">
          <Trash2 size={12} /> Delete
        </button>

        <button onClick={onDeselect}
          className="text-zinc-500 hover:text-zinc-300 p-1 cursor-pointer">
          <X size={14} />
        </button>
      </div>

      {/* Bulk Edit Modal */}
      {recordType && (
        <BulkEditModal
          isOpen={editOpen}
          onClose={() => setEditOpen(false)}
          recordIds={selectedIds}
          recordType={recordType}
          onComplete={() => onComplete?.()}
        />
      )}

      {/* Duplicate to Vehicle Modal */}
      <Modal
        isOpen={dupVehicleOpen}
        onClose={() => setDupVehicleOpen(false)}
        title="Duplicate to Vehicle"
        size="sm"
        footer={
          <>
            <button
              onClick={() => setDupVehicleOpen(false)}
              className="px-4 py-2 text-sm text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleDuplicateToVehicle}
              disabled={!targetVehicleId || duplicating}
              className="px-4 py-2 text-sm bg-violet-600 hover:bg-violet-500 text-white rounded-lg transition-colors disabled:opacity-50"
            >
              {duplicating ? 'Duplicating...' : 'Duplicate'}
            </button>
          </>
        }
      >
        <div className="space-y-3">
          <p className="text-zinc-400 text-sm">
            Select a vehicle to duplicate {selectedCount} record(s) to:
          </p>
          <select
            value={targetVehicleId}
            onChange={e => setTargetVehicleId(e.target.value)}
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200"
          >
            <option value="">Select vehicle...</option>
            {vehicles?.map(v => (
              <option key={v.id} value={v.id}>
                {v.name || `${v.brand} ${v.model}`}
              </option>
            ))}
          </select>
        </div>
      </Modal>
    </>
  );
}
