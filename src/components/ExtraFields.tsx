import { MapPin } from 'lucide-react';
import type { ExtraFieldDefinition } from '../types';

interface ExtraFieldsProps {
  recordType: string;
  values: Record<string, string>;
  onChange: (values: Record<string, string>) => void;
  definitions: ExtraFieldDefinition[];
}

const inputClasses = "w-full h-10 bg-zinc-950 border border-zinc-800 rounded-lg px-3 text-sm text-zinc-50 placeholder:text-zinc-600 outline-none focus:border-violet-500/50";

export default function ExtraFields({ recordType, values, onChange, definitions }: ExtraFieldsProps) {
  const fields = definitions
    .filter(d => d.recordType === recordType)
    .sort((a, b) => a.sortOrder - b.sortOrder);

  if (fields.length === 0) return null;

  const handleChange = (fieldName: string, value: string) => {
    onChange({ ...values, [fieldName]: value });
  };

  return (
    <div className="space-y-4">
      <p className="text-xs text-zinc-500 uppercase tracking-wider font-medium">Custom Fields</p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {fields.map(field => (
          <div key={field.id}>
            <label className="block text-sm font-medium text-zinc-400 mb-2">
              {field.fieldName}
              {field.isRequired && <span className="text-red-400 ml-1">*</span>}
            </label>
            {field.fieldType === 'text' && (
              <input
                type="text"
                value={values[field.fieldName] || ''}
                onChange={e => handleChange(field.fieldName, e.target.value)}
                placeholder={field.fieldName}
                className={inputClasses}
              />
            )}
            {field.fieldType === 'number' && (
              <input
                type="number"
                value={values[field.fieldName] || ''}
                onChange={e => handleChange(field.fieldName, e.target.value)}
                placeholder="0"
                className={inputClasses}
              />
            )}
            {field.fieldType === 'decimal' && (
              <input
                type="number"
                step="0.01"
                value={values[field.fieldName] || ''}
                onChange={e => handleChange(field.fieldName, e.target.value)}
                placeholder="0.00"
                className={inputClasses}
              />
            )}
            {field.fieldType === 'date' && (
              <input
                type="date"
                value={values[field.fieldName] || ''}
                onChange={e => handleChange(field.fieldName, e.target.value)}
                className={inputClasses}
              />
            )}
            {field.fieldType === 'time' && (
              <input
                type="time"
                value={values[field.fieldName] || ''}
                onChange={e => handleChange(field.fieldName, e.target.value)}
                className={inputClasses}
              />
            )}
            {field.fieldType === 'location' && (
              <div className="relative">
                <MapPin size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                <input
                  type="text"
                  value={values[field.fieldName] || ''}
                  onChange={e => handleChange(field.fieldName, e.target.value)}
                  placeholder="Enter location"
                  className={`${inputClasses} pl-9`}
                />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
