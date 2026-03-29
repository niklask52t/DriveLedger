import { Star } from 'lucide-react';
import { useUnits } from '../../hooks/useUnits';
import { useI18n } from '../../contexts/I18nContext';
import type { FuelType } from '../../types';

const selectChevron = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%2371717a' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`;

const inputClass =
  'w-full h-10 bg-zinc-950 border border-zinc-800 rounded-lg px-3 text-sm text-zinc-50 placeholder:text-zinc-600 outline-none focus:border-violet-500/50';

const selectClass =
  'w-full h-10 bg-zinc-950 border border-zinc-800 rounded-lg px-3 text-sm text-zinc-50 outline-none focus:border-violet-500/50 appearance-none';

const labelClass = 'block text-sm font-medium text-zinc-400 mb-2';

export interface PurchaseFormData {
  brand: string;
  model: string;
  variant: string;
  price: number;
  mobileDeLink: string;
  imageUrl: string;
  year: number;
  mileage: number;
  fuelType: FuelType;
  horsePower: number;
  downPayment: number;
  financingMonths: number;
  interestRate: number;
  monthlyRate: number;
  estimatedInsurance: number;
  estimatedTax: number;
  estimatedFuelMonthly: number;
  estimatedMaintenance: number;
  notes: string;
  pros: string;
  cons: string;
  rating: number;
}

const fuelTypeOptions: { value: FuelType; label: string }[] = [
  { value: 'benzin', label: 'Gasoline' },
  { value: 'diesel', label: 'Diesel' },
  { value: 'elektro', label: 'Electric' },
  { value: 'hybrid', label: 'Hybrid' },
  { value: 'lpg', label: 'LPG' },
];

interface PurchaseFormProps {
  formData: PurchaseFormData;
  setFormData: (data: PurchaseFormData) => void;
  onSubmit: () => void;
  onCancel: () => void;
  isEdit: boolean;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-sm font-semibold text-zinc-300 mb-4">{title}</h3>
      <div className="grid grid-cols-2 gap-4">{children}</div>
    </div>
  );
}

export default function PurchaseForm({ formData, setFormData, onSubmit, onCancel, isEdit }: PurchaseFormProps) {
  const { t } = useI18n();
  const { distanceUnit } = useUnits();
  const update = (updates: Partial<PurchaseFormData>) => setFormData({ ...formData, ...updates });

  return (
    <div className="space-y-8">
      {/* Vehicle Details */}
      <Section title="Vehicle Details">
        <div>
          <label className={labelClass}>Brand</label>
          <input
            type="text"
            className={inputClass}
            placeholder="e.g. BMW"
            value={formData.brand}
            onChange={(e) => update({ brand: e.target.value })}
          />
        </div>
        <div>
          <label className={labelClass}>Model</label>
          <input
            type="text"
            className={inputClass}
            placeholder="e.g. 3 Series"
            value={formData.model}
            onChange={(e) => update({ model: e.target.value })}
          />
        </div>
        <div>
          <label className={labelClass}>Variant</label>
          <input
            type="text"
            className={inputClass}
            placeholder="e.g. 320d M Sport"
            value={formData.variant}
            onChange={(e) => update({ variant: e.target.value })}
          />
        </div>
        <div>
          <label className={labelClass}>Price (EUR)</label>
          <input
            type="number"
            className={inputClass}
            placeholder="0"
            value={formData.price || ''}
            onChange={(e) => update({ price: parseFloat(e.target.value) || 0 })}
          />
        </div>
        <div>
          <label className={labelClass}>Year</label>
          <input
            type="number"
            className={inputClass}
            placeholder="e.g. 2023"
            value={formData.year || ''}
            onChange={(e) => update({ year: parseInt(e.target.value) || 0 })}
          />
        </div>
        <div>
          <label className={labelClass}>Mileage ({distanceUnit})</label>
          <input
            type="number"
            className={inputClass}
            placeholder="0"
            value={formData.mileage || ''}
            onChange={(e) => update({ mileage: parseInt(e.target.value) || 0 })}
          />
        </div>
        <div>
          <label className={labelClass}>Fuel Type</label>
          <select
            className={selectClass}
            style={{ backgroundImage: selectChevron, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 0.75rem center' }}
            value={formData.fuelType}
            onChange={(e) => update({ fuelType: e.target.value as FuelType })}
          >
            {fuelTypeOptions.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelClass}>Horsepower (PS)</label>
          <input
            type="number"
            className={inputClass}
            placeholder="0"
            value={formData.horsePower || ''}
            onChange={(e) => update({ horsePower: parseInt(e.target.value) || 0 })}
          />
        </div>
      </Section>

      {/* Links */}
      <Section title="Links & Media">
        <div>
          <label className={labelClass}>{t('vehicles.listing_link')}</label>
          <input
            type="url"
            className={inputClass}
            placeholder="https://..."
            value={formData.mobileDeLink}
            onChange={(e) => update({ mobileDeLink: e.target.value })}
          />
        </div>
        <div>
          <label className={labelClass}>Image URL</label>
          <input
            type="url"
            className={inputClass}
            placeholder="https://..."
            value={formData.imageUrl}
            onChange={(e) => update({ imageUrl: e.target.value })}
          />
        </div>
      </Section>

      {/* Financing */}
      <Section title="Financing">
        <div>
          <label className={labelClass}>Down Payment (EUR)</label>
          <input
            type="number"
            className={inputClass}
            placeholder="0"
            value={formData.downPayment || ''}
            onChange={(e) => update({ downPayment: parseFloat(e.target.value) || 0 })}
          />
        </div>
        <div>
          <label className={labelClass}>Duration (Months)</label>
          <input
            type="number"
            className={inputClass}
            placeholder="0"
            value={formData.financingMonths || ''}
            onChange={(e) => update({ financingMonths: parseInt(e.target.value) || 0 })}
          />
        </div>
        <div>
          <label className={labelClass}>Interest Rate (%)</label>
          <input
            type="number"
            step="0.01"
            className={inputClass}
            placeholder="0.00"
            value={formData.interestRate || ''}
            onChange={(e) => update({ interestRate: parseFloat(e.target.value) || 0 })}
          />
        </div>
        <div>
          <label className={labelClass}>Monthly Rate (EUR)</label>
          <input
            type="number"
            step="0.01"
            className={inputClass}
            placeholder="0.00"
            value={formData.monthlyRate || ''}
            onChange={(e) => update({ monthlyRate: parseFloat(e.target.value) || 0 })}
          />
        </div>
      </Section>

      {/* Estimated Costs */}
      <Section title="Estimated Monthly Costs">
        <div>
          <label className={labelClass}>Insurance (EUR/mo)</label>
          <input
            type="number"
            step="0.01"
            className={inputClass}
            placeholder="0.00"
            value={formData.estimatedInsurance || ''}
            onChange={(e) => update({ estimatedInsurance: parseFloat(e.target.value) || 0 })}
          />
        </div>
        <div>
          <label className={labelClass}>Tax (EUR/year)</label>
          <input
            type="number"
            step="0.01"
            className={inputClass}
            placeholder="0.00"
            value={formData.estimatedTax || ''}
            onChange={(e) => update({ estimatedTax: parseFloat(e.target.value) || 0 })}
          />
        </div>
        <div>
          <label className={labelClass}>Fuel (EUR/mo)</label>
          <input
            type="number"
            step="0.01"
            className={inputClass}
            placeholder="0.00"
            value={formData.estimatedFuelMonthly || ''}
            onChange={(e) => update({ estimatedFuelMonthly: parseFloat(e.target.value) || 0 })}
          />
        </div>
        <div>
          <label className={labelClass}>Maintenance (EUR/mo)</label>
          <input
            type="number"
            step="0.01"
            className={inputClass}
            placeholder="0.00"
            value={formData.estimatedMaintenance || ''}
            onChange={(e) => update({ estimatedMaintenance: parseFloat(e.target.value) || 0 })}
          />
        </div>
      </Section>

      {/* Evaluation */}
      <div>
        <h3 className="text-sm font-semibold text-zinc-300 mb-4">Evaluation</h3>
        <div className="space-y-5">
          {/* Rating */}
          <div>
            <label className={labelClass}>Rating</label>
            <div className="flex items-center gap-1">
              {Array.from({ length: 5 }).map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => update({ rating: i + 1 === formData.rating ? 0 : i + 1 })}
                  className="p-0.5 transition-colors"
                >
                  <Star
                    size={20}
                    className={
                      i < formData.rating
                        ? 'text-amber-400 fill-amber-400'
                        : 'text-zinc-700 hover:text-zinc-500'
                    }
                  />
                </button>
              ))}
              {formData.rating > 0 && (
                <span className="text-xs text-zinc-500 ml-2">{formData.rating}/5</span>
              )}
            </div>
          </div>

          {/* Pros */}
          <div>
            <label className={labelClass}>Pros (one per line)</label>
            <textarea
              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2.5 text-sm text-zinc-50 placeholder:text-zinc-600 outline-none focus:border-violet-500/50 min-h-[100px] resize-none"
              placeholder="Good fuel economy&#10;Spacious interior&#10;Low maintenance"
              value={formData.pros}
              onChange={(e) => update({ pros: e.target.value })}
            />
          </div>

          {/* Cons */}
          <div>
            <label className={labelClass}>Cons (one per line)</label>
            <textarea
              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2.5 text-sm text-zinc-50 placeholder:text-zinc-600 outline-none focus:border-violet-500/50 min-h-[100px] resize-none"
              placeholder="High insurance&#10;Limited cargo space"
              value={formData.cons}
              onChange={(e) => update({ cons: e.target.value })}
            />
          </div>

          {/* Notes */}
          <div>
            <label className={labelClass}>Notes</label>
            <textarea
              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2.5 text-sm text-zinc-50 placeholder:text-zinc-600 outline-none focus:border-violet-500/50 min-h-[100px] resize-none"
              placeholder="Additional notes..."
              value={formData.notes}
              onChange={(e) => update({ notes: e.target.value })}
            />
          </div>
        </div>
      </div>

      {/* Footer buttons */}
      <div className="flex items-center justify-end gap-3 pt-4 border-t border-zinc-800">
        <button
          onClick={onCancel}
          className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg h-10 px-4 text-sm transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={onSubmit}
          className="bg-violet-500 hover:bg-violet-400 text-white rounded-lg h-10 px-5 text-sm font-medium transition-colors"
        >
          {isEdit ? 'Update' : 'Add Purchase'}
        </button>
      </div>
    </div>
  );
}
