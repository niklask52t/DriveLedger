import { useState } from 'react';
import { api } from '../api';
import Modal from './Modal';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  recordIds: string[];
  recordType: string;
  onComplete: () => void;
}

// Fields available per record type
const FIELDS_BY_TYPE: Record<string, { key: string; label: string; type: 'text' | 'number' | 'date' | 'textarea' }[]> = {
  services: [
    { key: 'date', label: 'Date', type: 'date' },
    { key: 'cost', label: 'Cost', type: 'number' },
    { key: 'category', label: 'Category', type: 'text' },
    { key: 'notes', label: 'Notes', type: 'textarea' },
    { key: 'description', label: 'Description', type: 'text' },
    { key: 'mileage', label: 'Mileage', type: 'number' },
  ],
  repairs: [
    { key: 'date', label: 'Date', type: 'date' },
    { key: 'cost', label: 'Cost', type: 'number' },
    { key: 'category', label: 'Category', type: 'text' },
    { key: 'notes', label: 'Notes', type: 'textarea' },
    { key: 'description', label: 'Description', type: 'text' },
    { key: 'mileage', label: 'Mileage', type: 'number' },
    { key: 'workshop', label: 'Workshop', type: 'text' },
  ],
  upgrades: [
    { key: 'date', label: 'Date', type: 'date' },
    { key: 'cost', label: 'Cost', type: 'number' },
    { key: 'notes', label: 'Notes', type: 'textarea' },
    { key: 'description', label: 'Description', type: 'text' },
    { key: 'mileage', label: 'Mileage', type: 'number' },
  ],
  fuel: [
    { key: 'date', label: 'Date', type: 'date' },
    { key: 'fuelCost', label: 'Fuel Cost', type: 'number' },
    { key: 'fuelAmount', label: 'Fuel Amount', type: 'number' },
    { key: 'fuelType', label: 'Fuel Type', type: 'text' },
    { key: 'station', label: 'Station', type: 'text' },
    { key: 'notes', label: 'Notes', type: 'textarea' },
    { key: 'mileage', label: 'Mileage', type: 'number' },
  ],
  costs: [
    { key: 'name', label: 'Name', type: 'text' },
    { key: 'category', label: 'Category', type: 'text' },
    { key: 'amount', label: 'Amount', type: 'number' },
    { key: 'notes', label: 'Notes', type: 'textarea' },
  ],
  taxes: [
    { key: 'date', label: 'Date', type: 'date' },
    { key: 'cost', label: 'Cost', type: 'number' },
    { key: 'description', label: 'Description', type: 'text' },
    { key: 'notes', label: 'Notes', type: 'textarea' },
  ],
  supplies: [
    { key: 'name', label: 'Name', type: 'text' },
    { key: 'description', label: 'Description', type: 'text' },
    { key: 'unitCost', label: 'Unit Cost', type: 'number' },
    { key: 'notes', label: 'Notes', type: 'textarea' },
  ],
  equipment: [
    { key: 'name', label: 'Name', type: 'text' },
    { key: 'description', label: 'Description', type: 'text' },
    { key: 'notes', label: 'Notes', type: 'textarea' },
  ],
};

export default function BulkEditModal({ isOpen, onClose, recordIds, recordType, onComplete }: Props) {
  const fields = FIELDS_BY_TYPE[recordType] || [];
  const [enabled, setEnabled] = useState<Record<string, boolean>>({});
  const [values, setValues] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const toggleField = (key: string) => {
    setEnabled(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const setValue = (key: string, val: string) => {
    setValues(prev => ({ ...prev, [key]: val }));
  };

  const setClear = (key: string) => {
    setValues(prev => ({ ...prev, [key]: '---' }));
  };

  const handleSubmit = async () => {
    setError('');
    const updates: Record<string, any> = {};
    for (const field of fields) {
      if (enabled[field.key]) {
        const val = values[field.key] ?? '';
        if (field.type === 'number' && val !== '---' && val !== '') {
          updates[field.key] = parseFloat(val);
        } else {
          updates[field.key] = val;
        }
      }
    }

    if (Object.keys(updates).length === 0) {
      setError('Please select at least one field to update.');
      return;
    }

    setLoading(true);
    try {
      await api.bulkEdit(recordIds, recordType, updates);
      onComplete();
      onClose();
      setEnabled({});
      setValues({});
    } catch (err: any) {
      setError(err.message || 'Failed to update records');
    } finally {
      setLoading(false);
    }
  };

  const footer = (
    <>
      <button
        onClick={onClose}
        className="px-4 py-2 text-sm text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-lg transition-colors"
      >
        Cancel
      </button>
      <button
        onClick={handleSubmit}
        disabled={loading}
        className="px-4 py-2 text-sm bg-violet-600 hover:bg-violet-500 text-white rounded-lg transition-colors disabled:opacity-50"
      >
        {loading ? 'Updating...' : `Update ${recordIds.length} Records`}
      </button>
    </>
  );

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Bulk Edit (${recordIds.length} records)`} footer={footer} size="lg">
      {error && (
        <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
          {error}
        </div>
      )}

      {fields.length === 0 ? (
        <p className="text-zinc-400 text-sm">No editable fields for this record type.</p>
      ) : (
        <div className="space-y-3">
          <p className="text-zinc-500 text-xs mb-4">
            Check the fields you want to update. Only checked fields will be modified. Use "Clear" to set a text field to empty.
          </p>
          {fields.map(field => (
            <div key={field.key} className="flex items-start gap-3">
              <label className="flex items-center gap-2 min-w-[140px] pt-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={!!enabled[field.key]}
                  onChange={() => toggleField(field.key)}
                  className="rounded border-zinc-600 bg-zinc-800 text-violet-500 focus:ring-violet-500"
                />
                <span className="text-sm text-zinc-300">{field.label}</span>
              </label>

              <div className="flex-1 flex items-center gap-2">
                {field.type === 'textarea' ? (
                  <textarea
                    disabled={!enabled[field.key]}
                    value={values[field.key] === '---' ? '' : (values[field.key] || '')}
                    onChange={e => setValue(field.key, e.target.value)}
                    placeholder={values[field.key] === '---' ? '(will be cleared)' : ''}
                    rows={2}
                    className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 disabled:opacity-40 placeholder:text-zinc-600"
                  />
                ) : (
                  <input
                    type={field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : 'text'}
                    disabled={!enabled[field.key]}
                    value={values[field.key] === '---' ? '' : (values[field.key] || '')}
                    onChange={e => setValue(field.key, e.target.value)}
                    placeholder={values[field.key] === '---' ? '(will be cleared)' : ''}
                    step={field.type === 'number' ? '0.01' : undefined}
                    className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 disabled:opacity-40 placeholder:text-zinc-600"
                  />
                )}

                {field.type !== 'date' && field.type !== 'number' && enabled[field.key] && (
                  <button
                    onClick={() => setClear(field.key)}
                    className={`text-xs px-2 py-1.5 rounded-lg transition-colors ${
                      values[field.key] === '---'
                        ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                        : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 border border-zinc-700'
                    }`}
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </Modal>
  );
}
