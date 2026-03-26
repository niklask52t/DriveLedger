import type { Vehicle } from '../../types';
import { fuelTypeOptions, statusOptions } from './constants';

const selectChevron = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%2371717a' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`;

const inputClass =
  'w-full h-10 bg-zinc-950 border border-zinc-800 rounded-lg px-3 text-sm text-zinc-50 placeholder:text-zinc-600 outline-none focus:border-violet-500/50';

const selectClass =
  'w-full h-10 bg-zinc-950 border border-zinc-800 rounded-lg px-3 text-sm text-zinc-50 outline-none focus:border-violet-500/50 appearance-none';

const labelClass = 'block text-sm font-medium text-zinc-400 mb-2';

interface VehicleEditFormProps {
  form: Partial<Vehicle>;
  updateForm: (updates: Partial<Vehicle>) => void;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-sm font-semibold text-zinc-300 mb-4">{title}</h3>
      <div className="grid grid-cols-2 gap-4">{children}</div>
    </div>
  );
}

export default function VehicleEditForm({ form, updateForm }: VehicleEditFormProps) {
  return (
    <div className="space-y-8">
      {/* Basic Info */}
      <Section title="Basic Info">
        <div>
          <label className={labelClass}>Name</label>
          <input
            type="text"
            className={inputClass}
            placeholder="e.g. Daily Driver"
            value={form.name || ''}
            onChange={(e) => updateForm({ name: e.target.value })}
          />
        </div>
        <div>
          <label className={labelClass}>Brand</label>
          <input
            type="text"
            className={inputClass}
            placeholder="e.g. BMW"
            value={form.brand || ''}
            onChange={(e) => updateForm({ brand: e.target.value })}
          />
        </div>
        <div>
          <label className={labelClass}>Model</label>
          <input
            type="text"
            className={inputClass}
            placeholder="e.g. 3 Series"
            value={form.model || ''}
            onChange={(e) => updateForm({ model: e.target.value })}
          />
        </div>
        <div>
          <label className={labelClass}>Variant</label>
          <input
            type="text"
            className={inputClass}
            placeholder="e.g. 320d xDrive"
            value={form.variant || ''}
            onChange={(e) => updateForm({ variant: e.target.value })}
          />
        </div>
      </Section>

      {/* Registration */}
      <Section title="Registration">
        <div>
          <label className={labelClass}>License Plate</label>
          <input
            type="text"
            className={inputClass}
            placeholder="e.g. M-AB 1234"
            value={form.licensePlate || ''}
            onChange={(e) => updateForm({ licensePlate: e.target.value })}
          />
        </div>
        <div>
          <label className={labelClass}>First Registration</label>
          <input
            type="date"
            className={inputClass}
            value={form.firstRegistration || ''}
            onChange={(e) => updateForm({ firstRegistration: e.target.value })}
          />
        </div>
        <div>
          <label className={labelClass}>HSN</label>
          <input
            type="text"
            className={inputClass}
            placeholder="Manufacturer code"
            value={form.hsn || ''}
            onChange={(e) => updateForm({ hsn: e.target.value })}
          />
        </div>
        <div>
          <label className={labelClass}>TSN</label>
          <input
            type="text"
            className={inputClass}
            placeholder="Type code"
            value={form.tsn || ''}
            onChange={(e) => updateForm({ tsn: e.target.value })}
          />
        </div>
        <div>
          <label className={labelClass}>Purchase Date</label>
          <input
            type="date"
            className={inputClass}
            value={form.purchaseDate || ''}
            onChange={(e) => updateForm({ purchaseDate: e.target.value })}
          />
        </div>
        <div>
          <label className={labelClass}>Purchase Price</label>
          <input
            type="number"
            className={inputClass}
            placeholder="0"
            value={form.purchasePrice || ''}
            onChange={(e) => updateForm({ purchasePrice: parseFloat(e.target.value) || 0 })}
          />
        </div>
      </Section>

      {/* Mileage & Fuel */}
      <Section title="Mileage & Fuel">
        <div>
          <label className={labelClass}>Current Mileage (km)</label>
          <input
            type="number"
            className={inputClass}
            placeholder="0"
            value={form.currentMileage || ''}
            onChange={(e) => updateForm({ currentMileage: parseFloat(e.target.value) || 0 })}
          />
        </div>
        <div>
          <label className={labelClass}>Annual Mileage (km)</label>
          <input
            type="number"
            className={inputClass}
            placeholder="0"
            value={form.annualMileage || ''}
            onChange={(e) => updateForm({ annualMileage: parseFloat(e.target.value) || 0 })}
          />
        </div>
        <div>
          <label className={labelClass}>Fuel Type</label>
          <select
            className={selectClass}
            style={{ backgroundImage: selectChevron, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 0.75rem center' }}
            value={form.fuelType || 'benzin'}
            onChange={(e) => updateForm({ fuelType: e.target.value as Vehicle['fuelType'] })}
          >
            {fuelTypeOptions.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelClass}>Avg. Consumption (L/100km)</label>
          <input
            type="number"
            step="0.1"
            className={inputClass}
            placeholder="0.0"
            value={form.avgConsumption || ''}
            onChange={(e) => updateForm({ avgConsumption: parseFloat(e.target.value) || 0 })}
          />
        </div>
        <div>
          <label className={labelClass}>Fuel Price (EUR/L)</label>
          <input
            type="number"
            step="0.01"
            className={inputClass}
            placeholder="0.00"
            value={form.fuelPrice || ''}
            onChange={(e) => updateForm({ fuelPrice: parseFloat(e.target.value) || 0 })}
          />
        </div>
        <div>
          <label className={labelClass}>Horsepower (PS)</label>
          <input
            type="number"
            className={inputClass}
            placeholder="0"
            value={form.horsePower || ''}
            onChange={(e) => updateForm({ horsePower: parseFloat(e.target.value) || 0 })}
          />
        </div>
      </Section>

      {/* Status */}
      <Section title="Status">
        <div>
          <label className={labelClass}>Status</label>
          <select
            className={selectClass}
            style={{ backgroundImage: selectChevron, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 0.75rem center' }}
            value={form.status || 'owned'}
            onChange={(e) => updateForm({ status: e.target.value as Vehicle['status'] })}
          >
            {statusOptions.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelClass}>Color</label>
          <input
            type="text"
            className={inputClass}
            placeholder="e.g. Black"
            value={form.color || ''}
            onChange={(e) => updateForm({ color: e.target.value })}
          />
        </div>
        <div>
          <label className={labelClass}>mobile.de Link</label>
          <input
            type="url"
            className={inputClass}
            placeholder="https://..."
            value={form.mobileDeLink || ''}
            onChange={(e) => updateForm({ mobileDeLink: e.target.value })}
          />
        </div>
        <div>
          <label className={labelClass}>Image URL</label>
          <input
            type="url"
            className={inputClass}
            placeholder="https://..."
            value={form.imageUrl || ''}
            onChange={(e) => updateForm({ imageUrl: e.target.value })}
          />
        </div>
        <div className="col-span-2">
          <label className={labelClass}>Notes</label>
          <textarea
            className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2.5 text-sm text-zinc-50 placeholder:text-zinc-600 outline-none focus:border-violet-500/50 min-h-[100px] resize-none"
            placeholder="Additional notes..."
            value={form.notes || ''}
            onChange={(e) => updateForm({ notes: e.target.value })}
          />
        </div>
      </Section>
    </div>
  );
}
