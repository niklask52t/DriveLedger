import { useState, useEffect, useCallback } from 'react';
import { Plus, Trash2, Loader2, GripVertical } from 'lucide-react';
import { api } from '../../api';
import type { ExtraFieldDefinition } from '../../types';

const inputClass =
  'w-full h-10 bg-zinc-950 border border-zinc-800 rounded-lg px-3 text-sm text-zinc-50 placeholder:text-zinc-600 outline-none focus:border-violet-500/50';

const selectClass =
  'w-full h-10 bg-zinc-950 border border-zinc-800 rounded-lg px-3 text-sm text-zinc-50 outline-none focus:border-violet-500/50 appearance-none';

const labelClass = 'block text-sm font-medium text-zinc-400 mb-2';

const RECORD_TYPES = [
  { value: 'service', label: 'Services' },
  { value: 'repair', label: 'Repairs' },
  { value: 'upgrade', label: 'Upgrades' },
  { value: 'fuel', label: 'Fuel Records' },
  { value: 'tax', label: 'Taxes' },
  { value: 'supply', label: 'Supplies' },
  { value: 'equipment', label: 'Equipment' },
  { value: 'inspection', label: 'Inspections' },
  { value: 'odometer', label: 'Odometer' },
  { value: 'cost', label: 'Costs' },
];

const FIELD_TYPES = [
  { value: 'text', label: 'Text' },
  { value: 'number', label: 'Number' },
  { value: 'decimal', label: 'Decimal' },
  { value: 'date', label: 'Date' },
  { value: 'time', label: 'Time' },
  { value: 'location', label: 'Location' },
];

export default function ExtraFieldsTab() {
  const [definitions, setDefinitions] = useState<ExtraFieldDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // New field form
  const [showAdd, setShowAdd] = useState(false);
  const [newRecordType, setNewRecordType] = useState('service');
  const [newFieldName, setNewFieldName] = useState('');
  const [newFieldType, setNewFieldType] = useState('text');
  const [newIsRequired, setNewIsRequired] = useState(false);
  const [creating, setCreating] = useState(false);

  const loadDefinitions = useCallback(async () => {
    try {
      const data = await api.getExtraFieldDefinitions();
      setDefinitions(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load field definitions.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDefinitions();
  }, [loadDefinitions]);

  const handleCreate = async () => {
    if (!newFieldName.trim()) return;
    setCreating(true);
    setError(null);
    try {
      const maxSort = definitions
        .filter(d => d.recordType === newRecordType)
        .reduce((max, d) => Math.max(max, d.sortOrder), 0);

      const created = await api.createExtraFieldDefinition({
        recordType: newRecordType,
        fieldName: newFieldName.trim(),
        fieldType: newFieldType,
        isRequired: newIsRequired,
        sortOrder: maxSort + 1,
      });
      setDefinitions([...definitions, created]);
      setNewFieldName('');
      setNewIsRequired(false);
      setShowAdd(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to create field.';
      setError(msg);
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.deleteExtraFieldDefinition(id);
      setDefinitions(definitions.filter(d => d.id !== id));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to delete field.';
      setError(msg);
    }
  };

  const handleMoveUp = async (def: ExtraFieldDefinition) => {
    const sameType = definitions
      .filter(d => d.recordType === def.recordType)
      .sort((a, b) => a.sortOrder - b.sortOrder);
    const idx = sameType.findIndex(d => d.id === def.id);
    if (idx <= 0) return;
    const prev = sameType[idx - 1];
    try {
      await api.updateExtraFieldDefinition(def.id, { sortOrder: prev.sortOrder });
      await api.updateExtraFieldDefinition(prev.id, { sortOrder: def.sortOrder });
      loadDefinitions();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to reorder.';
      setError(msg);
    }
  };

  // Group by record type
  const grouped = RECORD_TYPES.map(rt => ({
    ...rt,
    fields: definitions
      .filter(d => d.recordType === rt.value)
      .sort((a, b) => a.sortOrder - b.sortOrder),
  })).filter(g => g.fields.length > 0);

  const chevronBg = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%2371717a' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E") no-repeat right 10px center`;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 size={24} className="animate-spin text-zinc-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-zinc-50">Extra Fields</h2>
          <p className="text-sm text-zinc-500 mt-1">Define custom fields for different record types.</p>
        </div>
        <button
          onClick={() => setShowAdd(!showAdd)}
          className="bg-violet-500 hover:bg-violet-400 text-white rounded-lg h-10 px-5 text-sm font-medium inline-flex items-center gap-2"
        >
          <Plus size={16} />
          Add Field
        </button>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      {/* Add form */}
      {showAdd && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Record Type</label>
              <select
                value={newRecordType}
                onChange={e => setNewRecordType(e.target.value)}
                className={selectClass}
                style={{ background: chevronBg }}
              >
                {RECORD_TYPES.map(rt => (
                  <option key={rt.value} value={rt.value}>{rt.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>Field Name</label>
              <input
                type="text"
                value={newFieldName}
                onChange={e => setNewFieldName(e.target.value)}
                placeholder="e.g. Technician"
                className={inputClass}
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Field Type</label>
              <select
                value={newFieldType}
                onChange={e => setNewFieldType(e.target.value)}
                className={selectClass}
                style={{ background: chevronBg }}
              >
                {FIELD_TYPES.map(ft => (
                  <option key={ft.value} value={ft.value}>{ft.label}</option>
                ))}
              </select>
            </div>
            <div className="flex items-end gap-4">
              <label className="flex items-center gap-2 h-10">
                <input
                  type="checkbox"
                  checked={newIsRequired}
                  onChange={e => setNewIsRequired(e.target.checked)}
                  className="w-4 h-4 rounded border-zinc-700 bg-zinc-950 text-violet-500 focus:ring-violet-500/50"
                />
                <span className="text-sm text-zinc-400">Required</span>
              </label>
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <button
              onClick={() => setShowAdd(false)}
              className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg h-10 px-4 text-sm"
            >
              Cancel
            </button>
            <button
              onClick={handleCreate}
              disabled={creating || !newFieldName.trim()}
              className="bg-violet-500 hover:bg-violet-400 disabled:opacity-50 text-white rounded-lg h-10 px-5 text-sm font-medium inline-flex items-center gap-2"
            >
              {creating ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
              Create Field
            </button>
          </div>
        </div>
      )}

      {/* Existing fields grouped by type */}
      {grouped.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-sm text-zinc-500">No custom fields defined yet. Click "Add Field" to create one.</p>
        </div>
      ) : (
        grouped.map(group => (
          <div key={group.value} className="space-y-3">
            <h3 className="text-sm font-medium text-zinc-300 uppercase tracking-wider">{group.label}</h3>
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden divide-y divide-zinc-800">
              {group.fields.map(field => (
                <div key={field.id} className="flex items-center justify-between px-4 py-3 hover:bg-zinc-800/30 transition-colors">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => handleMoveUp(field)}
                      className="text-zinc-600 hover:text-zinc-400 cursor-grab"
                      title="Move up"
                    >
                      <GripVertical size={14} />
                    </button>
                    <div>
                      <p className="text-sm text-zinc-50 font-medium">
                        {field.fieldName}
                        {field.isRequired && <span className="text-red-400 ml-1 text-xs">(required)</span>}
                      </p>
                      <p className="text-xs text-zinc-500 capitalize">{field.fieldType}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDelete(field.id)}
                    className="text-zinc-500 hover:text-red-400 p-2 rounded-lg hover:bg-zinc-800 transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
