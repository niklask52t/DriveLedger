import { useState } from 'react';
import { Car, DollarSign, TrendingUp, Star, Fuel } from 'lucide-react';
import type { PlannedPurchase, FuelType } from '../../types';
import { formatCurrency, calculateFinancing } from '../../utils';

const inputClass =
  'w-full bg-dark-900 border border-dark-600 rounded-lg px-3 py-2 text-dark-100 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none transition-colors';

const labelClass = 'block text-sm font-medium text-dark-300 mb-1';

export type PurchaseFormData = Omit<PlannedPurchase, 'id' | 'createdAt' | 'monthlyRate'>;

function StarRating({ rating, onChange, size = 24 }: { rating: number; onChange: (r: number) => void; size?: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <button
          key={i}
          type="button"
          onClick={() => onChange(i)}
          className="transition-colors cursor-pointer hover:scale-110"
        >
          <Star
            size={size}
            className={i <= rating ? 'text-amber-400 fill-amber-400' : 'text-dark-600'}
          />
        </button>
      ))}
    </div>
  );
}

// Fuel calculator helper
function calcMonthlyFuel(kmPerMonth: number, consumptionPer100: number, pricePerLiter: number): number {
  return (kmPerMonth / 100) * consumptionPer100 * pricePerLiter;
}

interface PurchaseFormProps {
  formData: PurchaseFormData;
  setFormData: (data: PurchaseFormData) => void;
  onSubmit: () => void;
  onCancel: () => void;
  isEdit: boolean;
}

export default function PurchaseForm({ formData: form, setFormData, onSubmit, onCancel, isEdit }: PurchaseFormProps) {
  const [fuelCalcKm, setFuelCalcKm] = useState(1000);
  const [fuelCalcConsumption, setFuelCalcConsumption] = useState(7);
  const [fuelCalcPrice, setFuelCalcPrice] = useState(1.75);

  const updateForm = (patch: Partial<PurchaseFormData>) => setFormData({ ...form, ...patch });

  return (
    <div className="space-y-6 max-h-[70vh] overflow-y-auto pr-2">
      {/* Vehicle Info */}
      <div>
        <h4 className="text-sm font-semibold text-dark-200 uppercase tracking-wider mb-3 flex items-center gap-2">
          <Car size={16} className="text-primary-400" />
          Vehicle Information
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className={labelClass}>Brand *</label>
            <input className={inputClass} value={form.brand} onChange={(e) => updateForm({ brand: e.target.value })} placeholder="e.g. BMW" />
          </div>
          <div>
            <label className={labelClass}>Model *</label>
            <input className={inputClass} value={form.model} onChange={(e) => updateForm({ model: e.target.value })} placeholder="e.g. 320d" />
          </div>
          <div>
            <label className={labelClass}>Variant</label>
            <input className={inputClass} value={form.variant} onChange={(e) => updateForm({ variant: e.target.value })} placeholder="e.g. M Sport" />
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4">
          <div>
            <label className={labelClass}>Asking Price *</label>
            <input type="number" className={inputClass} value={form.price || ''} onChange={(e) => updateForm({ price: Number(e.target.value) })} />
          </div>
          <div>
            <label className={labelClass}>Year</label>
            <input type="number" className={inputClass} value={form.year || ''} onChange={(e) => updateForm({ year: Number(e.target.value) })} />
          </div>
          <div>
            <label className={labelClass}>Mileage (km)</label>
            <input type="number" className={inputClass} value={form.mileage || ''} onChange={(e) => updateForm({ mileage: Number(e.target.value) })} />
          </div>
          <div>
            <label className={labelClass}>Horse Power</label>
            <input type="number" className={inputClass} value={form.horsePower || ''} onChange={(e) => updateForm({ horsePower: Number(e.target.value) })} />
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
          <div>
            <label className={labelClass}>Fuel Type</label>
            <select className={inputClass} value={form.fuelType} onChange={(e) => updateForm({ fuelType: e.target.value as FuelType })}>
              <option value="benzin">Gasoline</option>
              <option value="diesel">Diesel</option>
              <option value="elektro">Electric</option>
              <option value="hybrid">Hybrid</option>
              <option value="lpg">LPG</option>
            </select>
          </div>
          <div>
            <label className={labelClass}>mobile.de Link</label>
            <input className={inputClass} value={form.mobileDeLink} onChange={(e) => updateForm({ mobileDeLink: e.target.value })} placeholder="https://..." />
          </div>
          <div>
            <label className={labelClass}>Image URL</label>
            <input className={inputClass} value={form.imageUrl} onChange={(e) => updateForm({ imageUrl: e.target.value })} placeholder="https://..." />
          </div>
        </div>
      </div>

      {/* Financing */}
      <div>
        <h4 className="text-sm font-semibold text-dark-200 uppercase tracking-wider mb-3 flex items-center gap-2">
          <DollarSign size={16} className="text-amber-400" />
          Financing
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className={labelClass}>Down Payment</label>
            <input type="number" className={inputClass} value={form.downPayment || ''} onChange={(e) => updateForm({ downPayment: Number(e.target.value) })} />
          </div>
          <div>
            <label className={labelClass}>Duration (months)</label>
            <input type="number" className={inputClass} value={form.financingMonths || ''} onChange={(e) => updateForm({ financingMonths: Number(e.target.value) })} />
          </div>
          <div>
            <label className={labelClass}>Interest Rate (%)</label>
            <input type="number" step="0.1" className={inputClass} value={form.interestRate || ''} onChange={(e) => updateForm({ interestRate: Number(e.target.value) })} />
          </div>
        </div>
        {/* Preview */}
        {form.price > 0 && form.financingMonths > 0 && (
          <div className="mt-3 bg-dark-850 rounded-xl p-3 border border-dark-700/50 grid grid-cols-3 gap-3 text-center">
            {(() => {
              const preview = calculateFinancing(form.price, form.downPayment, form.financingMonths, form.interestRate);
              return (
                <>
                  <div>
                    <p className="text-xs text-dark-500">Monthly Rate</p>
                    <p className="text-sm font-bold text-primary-400">{formatCurrency(preview.monthlyPayment)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-dark-500">Total Interest</p>
                    <p className="text-sm font-bold text-amber-400">{formatCurrency(preview.totalInterest)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-dark-500">Total Cost</p>
                    <p className="text-sm font-bold text-dark-200">{formatCurrency(preview.totalCost)}</p>
                  </div>
                </>
              );
            })()}
          </div>
        )}
      </div>

      {/* Estimated Running Costs */}
      <div>
        <h4 className="text-sm font-semibold text-dark-200 uppercase tracking-wider mb-3 flex items-center gap-2">
          <TrendingUp size={16} className="text-emerald-400" />
          Estimated Running Costs
        </h4>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div>
            <label className={labelClass}>Insurance / mo</label>
            <input type="number" className={inputClass} value={form.estimatedInsurance || ''} onChange={(e) => updateForm({ estimatedInsurance: Number(e.target.value) })} />
          </div>
          <div>
            <label className={labelClass}>Tax / year</label>
            <input type="number" className={inputClass} value={form.estimatedTax || ''} onChange={(e) => updateForm({ estimatedTax: Number(e.target.value) })} />
          </div>
          <div>
            <label className={labelClass}>Fuel / mo</label>
            <input type="number" className={inputClass} value={form.estimatedFuelMonthly || ''} onChange={(e) => updateForm({ estimatedFuelMonthly: Number(e.target.value) })} />
          </div>
          <div>
            <label className={labelClass}>Maintenance / mo</label>
            <input type="number" className={inputClass} value={form.estimatedMaintenance || ''} onChange={(e) => updateForm({ estimatedMaintenance: Number(e.target.value) })} />
          </div>
        </div>

        {/* Fuel Calculator */}
        <div className="mt-3 bg-dark-850 rounded-xl p-4 border border-dark-700/50">
          <div className="flex items-center gap-2 mb-3">
            <Fuel size={14} className="text-dark-400" />
            <p className="text-xs font-medium text-dark-400 uppercase tracking-wider">Fuel Cost Calculator</p>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs text-dark-500 mb-1">km / month</label>
              <input type="number" className={inputClass} value={fuelCalcKm || ''} onChange={(e) => setFuelCalcKm(Number(e.target.value))} />
            </div>
            <div>
              <label className="block text-xs text-dark-500 mb-1">L / 100km</label>
              <input type="number" step="0.1" className={inputClass} value={fuelCalcConsumption || ''} onChange={(e) => setFuelCalcConsumption(Number(e.target.value))} />
            </div>
            <div>
              <label className="block text-xs text-dark-500 mb-1">Price / L</label>
              <input type="number" step="0.01" className={inputClass} value={fuelCalcPrice || ''} onChange={(e) => setFuelCalcPrice(Number(e.target.value))} />
            </div>
          </div>
          <div className="flex items-center justify-between mt-3">
            <p className="text-sm text-dark-300">
              Estimated: <span className="font-bold text-primary-400">{formatCurrency(calcMonthlyFuel(fuelCalcKm, fuelCalcConsumption, fuelCalcPrice))}</span>/mo
            </p>
            <button
              type="button"
              onClick={() => updateForm({ estimatedFuelMonthly: Math.round(calcMonthlyFuel(fuelCalcKm, fuelCalcConsumption, fuelCalcPrice) * 100) / 100 })}
              className="text-xs px-3 py-1.5 rounded-lg bg-primary-600/20 text-primary-400 hover:bg-primary-600/30 transition-colors font-medium"
            >
              Apply
            </button>
          </div>
        </div>
      </div>

      {/* Pros, Cons, Rating, Notes */}
      <div>
        <h4 className="text-sm font-semibold text-dark-200 uppercase tracking-wider mb-3 flex items-center gap-2">
          <Star size={16} className="text-amber-400" />
          Evaluation
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Pros (one per line)</label>
            <textarea
              rows={4}
              className={inputClass + ' resize-none'}
              value={form.pros}
              onChange={(e) => updateForm({ pros: e.target.value })}
              placeholder="Good fuel economy&#10;Low insurance&#10;Reliable engine"
            />
          </div>
          <div>
            <label className={labelClass}>Cons (one per line)</label>
            <textarea
              rows={4}
              className={inputClass + ' resize-none'}
              value={form.cons}
              onChange={(e) => updateForm({ cons: e.target.value })}
              placeholder="High mileage&#10;Previous accident&#10;Expensive parts"
            />
          </div>
        </div>
        <div className="mt-4 flex items-center gap-6">
          <div>
            <label className={labelClass}>Rating</label>
            <StarRating rating={form.rating} onChange={(r) => updateForm({ rating: r })} size={24} />
          </div>
        </div>
        <div className="mt-4">
          <label className={labelClass}>Notes</label>
          <textarea
            rows={3}
            className={inputClass + ' resize-none'}
            value={form.notes}
            onChange={(e) => updateForm({ notes: e.target.value })}
            placeholder="Additional notes..."
          />
        </div>
      </div>

      {/* Buttons */}
      <div className="flex justify-end gap-3 pt-4 border-t border-dark-700">
        <button
          onClick={onCancel}
          className="px-5 py-2.5 rounded-xl bg-dark-700 text-dark-300 hover:bg-dark-600 hover:text-dark-100 transition-colors font-medium text-sm"
        >
          Cancel
        </button>
        <button
          onClick={onSubmit}
          disabled={!form.brand || !form.model || !form.price}
          className="px-5 py-2.5 rounded-xl bg-primary-600 hover:bg-primary-500 disabled:bg-dark-700 disabled:text-dark-500 text-white transition-colors font-medium text-sm shadow-lg shadow-primary-600/25 disabled:shadow-none"
        >
          {isEdit ? 'Save Changes' : 'Add Purchase'}
        </button>
      </div>
    </div>
  );
}
