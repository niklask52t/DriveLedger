import type { Vehicle, FuelType, VehicleStatus } from '../../types';
import { inputClass, labelClass, fuelTypeOptions, statusOptions } from './constants';

interface VehicleEditFormProps {
  form: Omit<Vehicle, 'id' | 'createdAt'>;
  updateForm: <K extends keyof Omit<Vehicle, 'id' | 'createdAt'>>(key: K, value: Omit<Vehicle, 'id' | 'createdAt'>[K]) => void;
}

export default function VehicleEditForm({ form, updateForm }: VehicleEditFormProps) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-semibold text-dark-200 uppercase tracking-wider mb-3">Basic Information</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Name *</label>
            <input type="text" className={inputClass} value={form.name} onChange={(e) => updateForm('name', e.target.value)} />
          </div>
          <div>
            <label className={labelClass}>Brand</label>
            <input type="text" className={inputClass} value={form.brand} onChange={(e) => updateForm('brand', e.target.value)} />
          </div>
          <div>
            <label className={labelClass}>Model</label>
            <input type="text" className={inputClass} value={form.model} onChange={(e) => updateForm('model', e.target.value)} />
          </div>
          <div>
            <label className={labelClass}>Variant</label>
            <input type="text" className={inputClass} value={form.variant} onChange={(e) => updateForm('variant', e.target.value)} />
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-dark-200 uppercase tracking-wider mb-3">Registration & Purchase</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>License Plate</label>
            <input type="text" className={inputClass} value={form.licensePlate} onChange={(e) => updateForm('licensePlate', e.target.value)} />
          </div>
          <div>
            <label className={labelClass}>First Registration</label>
            <input type="date" className={inputClass} value={form.firstRegistration} onChange={(e) => updateForm('firstRegistration', e.target.value)} />
          </div>
          <div>
            <label className={labelClass}>HSN</label>
            <input type="text" className={inputClass} value={form.hsn} onChange={(e) => updateForm('hsn', e.target.value)} />
          </div>
          <div>
            <label className={labelClass}>TSN</label>
            <input type="text" className={inputClass} value={form.tsn} onChange={(e) => updateForm('tsn', e.target.value)} />
          </div>
          <div>
            <label className={labelClass}>Purchase Date</label>
            <input type="date" className={inputClass} value={form.purchaseDate} onChange={(e) => updateForm('purchaseDate', e.target.value)} />
          </div>
          <div>
            <label className={labelClass}>Purchase Price</label>
            <input type="number" className={inputClass} value={form.purchasePrice || ''} onChange={(e) => updateForm('purchasePrice', parseFloat(e.target.value) || 0)} />
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-dark-200 uppercase tracking-wider mb-3">Mileage & Fuel</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Current Mileage (km)</label>
            <input type="number" className={inputClass} value={form.currentMileage || ''} onChange={(e) => updateForm('currentMileage', parseFloat(e.target.value) || 0)} />
          </div>
          <div>
            <label className={labelClass}>Annual Mileage (km)</label>
            <input type="number" className={inputClass} value={form.annualMileage || ''} onChange={(e) => updateForm('annualMileage', parseFloat(e.target.value) || 0)} />
          </div>
          <div>
            <label className={labelClass}>Fuel Type</label>
            <select className={inputClass} value={form.fuelType} onChange={(e) => updateForm('fuelType', e.target.value as FuelType)}>
              {fuelTypeOptions.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
            </select>
          </div>
          <div>
            <label className={labelClass}>Avg. Consumption (L/100km)</label>
            <input type="number" step="0.1" className={inputClass} value={form.avgConsumption || ''} onChange={(e) => updateForm('avgConsumption', parseFloat(e.target.value) || 0)} />
          </div>
          <div>
            <label className={labelClass}>Fuel Price (EUR/L)</label>
            <input type="number" step="0.01" className={inputClass} value={form.fuelPrice || ''} onChange={(e) => updateForm('fuelPrice', parseFloat(e.target.value) || 0)} />
          </div>
          <div>
            <label className={labelClass}>Horse Power (PS)</label>
            <input type="number" className={inputClass} value={form.horsePower || ''} onChange={(e) => updateForm('horsePower', parseFloat(e.target.value) || 0)} />
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-dark-200 uppercase tracking-wider mb-3">Status & Extras</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Status</label>
            <select className={inputClass} value={form.status} onChange={(e) => updateForm('status', e.target.value as VehicleStatus)}>
              {statusOptions.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
            </select>
          </div>
          <div>
            <label className={labelClass}>Color</label>
            <div className="flex items-center gap-3">
              <input type="color" className="w-10 h-10 rounded-lg border border-dark-600 cursor-pointer bg-dark-900 shrink-0" value={form.color} onChange={(e) => updateForm('color', e.target.value)} />
              <input type="text" className={inputClass} value={form.color} onChange={(e) => updateForm('color', e.target.value)} />
            </div>
          </div>
          <div>
            <label className={labelClass}>mobile.de Link</label>
            <input type="url" className={inputClass} value={form.mobileDeLink} onChange={(e) => updateForm('mobileDeLink', e.target.value)} />
          </div>
          <div>
            <label className={labelClass}>Image URL</label>
            <input type="url" className={inputClass} value={form.imageUrl} onChange={(e) => updateForm('imageUrl', e.target.value)} />
          </div>
          <div className="sm:col-span-2">
            <label className={labelClass}>Notes</label>
            <textarea className={`${inputClass} resize-none`} rows={3} value={form.notes} onChange={(e) => updateForm('notes', e.target.value)} />
          </div>
        </div>
      </div>
    </div>
  );
}
