import { Check } from 'lucide-react';
import type { Vehicle } from '../../types';
import { useUnits } from '../../hooks/useUnits';
import { fuelTypeOptions, statusOptions } from './constants';
import { useI18n } from '../../contexts/I18nContext';

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

const DASHBOARD_METRIC_OPTIONS: { value: string; label: string }[] = [
  { value: 'total_cost', label: 'Total Cost' },
  { value: 'cost_per_km', label: 'Cost per km' },
  { value: 'monthly_cost', label: 'Monthly Cost' },
  { value: 'fuel_economy', label: 'Fuel Economy' },
  { value: 'mileage', label: 'Mileage' },
  { value: 'depreciation', label: 'Depreciation' },
];

function ToggleSwitch({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <div className="col-span-2 flex items-center gap-3">
      <label className="relative inline-flex items-center cursor-pointer">
        <input
          type="checkbox"
          className="sr-only peer"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
        />
        <div className="w-9 h-5 bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-violet-500"></div>
      </label>
      <span className="text-sm text-zinc-400">{label}</span>
    </div>
  );
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
  const { t } = useI18n();
  const { distanceUnit, fuelEconomyUnitLabel } = useUnits({ useHours: !!form.useHours });

  const currentMetrics = form.dashboardMetrics || ['total_cost', 'cost_per_km'];

  const toggleMetric = (metric: string) => {
    const updated = currentMetrics.includes(metric)
      ? currentMetrics.filter((m) => m !== metric)
      : [...currentMetrics, metric];
    updateForm({ dashboardMetrics: updated });
  };

  return (
    <div className="space-y-8">
      {/* Basic Info */}
      <Section title={t("vehicle_tab.edit.basic_info")}>
        <div>
          <label className={labelClass}>{t("common.name")}</label>
          <input
            type="text"
            className={inputClass}
            placeholder="e.g. Daily Driver"
            value={form.name || ''}
            onChange={(e) => updateForm({ name: e.target.value })}
          />
        </div>
        <div>
          <label className={labelClass}>{t("vehicles.brand")}</label>
          <input
            type="text"
            className={inputClass}
            placeholder="e.g. BMW"
            value={form.brand || ''}
            onChange={(e) => updateForm({ brand: e.target.value })}
          />
        </div>
        <div>
          <label className={labelClass}>{t("vehicles.model")}</label>
          <input
            type="text"
            className={inputClass}
            placeholder="e.g. 3 Series"
            value={form.model || ''}
            onChange={(e) => updateForm({ model: e.target.value })}
          />
        </div>
        <div>
          <label className={labelClass}>{t("vehicles.variant")}</label>
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
      <Section title={t("vehicle_tab.edit.registration")}>
        <div>
          <label className={labelClass}>{t("vehicles.license_plate")}</label>
          <input
            type="text"
            className={inputClass}
            placeholder="e.g. M-AB 1234"
            value={form.licensePlate || ''}
            onChange={(e) => updateForm({ licensePlate: e.target.value })}
          />
        </div>
        <div>
          <label className={labelClass}>{t("vehicles.first_registration")}</label>
          <input
            type="date"
            className={inputClass}
            value={form.firstRegistration || ''}
            onChange={(e) => updateForm({ firstRegistration: e.target.value })}
          />
        </div>
        <div>
          <label className={labelClass}>{t("vehicles.hsn")}</label>
          <input
            type="text"
            className={inputClass}
            placeholder={t("vehicle_tab.edit.manufacturer_code")}
            value={form.hsn || ''}
            onChange={(e) => updateForm({ hsn: e.target.value })}
          />
        </div>
        <div>
          <label className={labelClass}>{t("vehicles.tsn")}</label>
          <input
            type="text"
            className={inputClass}
            placeholder={t("vehicle_tab.edit.type_code")}
            value={form.tsn || ''}
            onChange={(e) => updateForm({ tsn: e.target.value })}
          />
        </div>
        <div>
          <label className={labelClass}>{t("vehicles.purchase_date")}</label>
          <input
            type="date"
            className={inputClass}
            value={form.purchaseDate || ''}
            onChange={(e) => updateForm({ purchaseDate: e.target.value })}
          />
        </div>
        <div>
          <label className={labelClass}>{t("vehicles.purchase_price")}</label>
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
      <Section title={form.useHours ? t("vehicle_tab.edit.hours_fuel") : t("vehicle_tab.edit.mileage_fuel")}>
        <div>
          <label className={labelClass}>{form.useHours ? 'Current Hours' : 'Current Mileage'} ({distanceUnit})</label>
          <input
            type="number"
            className={inputClass}
            placeholder="0"
            value={form.currentMileage || ''}
            onChange={(e) => updateForm({ currentMileage: parseFloat(e.target.value) || 0 })}
          />
        </div>
        <div>
          <label className={labelClass}>{t("vehicles.fuel_type")}</label>
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
        {form.status !== 'owned' && (
          <>
            <div>
              <label className={labelClass}>{form.useHours ? 'Annual Hours' : 'Annual Mileage'} ({distanceUnit})</label>
              <input
                type="number"
                className={inputClass}
                placeholder="0"
                value={form.annualMileage || ''}
                onChange={(e) => updateForm({ annualMileage: parseFloat(e.target.value) || 0 })}
              />
            </div>
            <div>
              <label className={labelClass}>Avg. Consumption ({fuelEconomyUnitLabel})</label>
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
              <label className={labelClass}>{t("vehicle_tab.edit.fuel_price")}</label>
              <input
                type="number"
                step="0.01"
                className={inputClass}
                placeholder="0.00"
                value={form.fuelPrice || ''}
                onChange={(e) => updateForm({ fuelPrice: parseFloat(e.target.value) || 0 })}
              />
            </div>
          </>
        )}
        <div>
          <label className={labelClass}>{t("vehicle_tab.edit.horsepower")}</label>
          <input
            type="number"
            className={inputClass}
            placeholder="0"
            value={form.horsePower || ''}
            onChange={(e) => updateForm({ horsePower: parseFloat(e.target.value) || 0 })}
          />
        </div>
      </Section>

      {/* Estimated Costs (planned only) */}
      {form.status !== 'owned' && (
        <Section title={t("vehicles.estimated_costs")}>
          <div>
            <label className={labelClass}>{t("vehicles.est_insurance")}</label>
            <input
              type="number"
              step="0.01"
              className={inputClass}
              placeholder="0.00"
              value={form.estimatedInsurance || ''}
              onChange={(e) => updateForm({ estimatedInsurance: parseFloat(e.target.value) || 0 })}
            />
          </div>
          <div>
            <label className={labelClass}>{t("vehicles.est_tax")}</label>
            <input
              type="number"
              step="0.01"
              className={inputClass}
              placeholder="0.00"
              value={form.estimatedTax || ''}
              onChange={(e) => updateForm({ estimatedTax: parseFloat(e.target.value) || 0 })}
            />
          </div>
          <div>
            <label className={labelClass}>{t("vehicles.est_maintenance")}</label>
            <input
              type="number"
              step="0.01"
              className={inputClass}
              placeholder="0.00"
              value={form.estimatedMaintenance || ''}
              onChange={(e) => updateForm({ estimatedMaintenance: parseFloat(e.target.value) || 0 })}
            />
          </div>
          <div>
            <label className={labelClass}>{t("vehicles.est_financing")}</label>
            <input
              type="number"
              step="0.01"
              className={inputClass}
              placeholder="0.00"
              value={form.estimatedFinancing || ''}
              onChange={(e) => updateForm({ estimatedFinancing: parseFloat(e.target.value) || 0 })}
            />
          </div>
        </Section>
      )}

      {/* Odometer Adjustment */}
      <Section title={t("vehicle_tab.edit.odometer_adjustment") || "Odometer Adjustment"}>
        <div>
          <label className={labelClass}>{t("vehicles.odometer_multiplier") || "Odometer Multiplier"}</label>
          <input
            type="number"
            step="0.0001"
            className={inputClass}
            placeholder="1.0"
            value={form.odometerMultiplier ?? ''}
            onChange={(e) => updateForm({ odometerMultiplier: parseFloat(e.target.value) || 1.0 })}
          />
          <p className="text-xs text-zinc-600 mt-1">
            Factor applied to raw mileage readings (default: 1.0). Use if your odometer reads differently than actual distance.
          </p>
        </div>
        <div>
          <label className={labelClass}>{t("vehicles.odometer_difference") || "Odometer Difference"}</label>
          <input
            type="number"
            className={inputClass}
            placeholder="0"
            value={form.odometerDifference ?? ''}
            onChange={(e) => updateForm({ odometerDifference: parseInt(e.target.value) || 0 })}
          />
          <p className="text-xs text-zinc-600 mt-1">
            Offset added after multiplier. Adjusted mileage = (raw * multiplier) + difference.
          </p>
        </div>
      </Section>

      {/* Sale / Depreciation */}
      <Section title={t("vehicle_tab.edit.sale_depreciation")}>
        <div>
          <label className={labelClass}>{t("vehicles.sold_price")}</label>
          <input
            type="number"
            className={inputClass}
            placeholder="0"
            value={form.soldPrice || ''}
            onChange={(e) => updateForm({ soldPrice: parseFloat(e.target.value) || 0 })}
          />
        </div>
        <div>
          <label className={labelClass}>{t("vehicles.sold_date")}</label>
          <input
            type="date"
            className={inputClass}
            value={form.soldDate || ''}
            onChange={(e) => updateForm({ soldDate: e.target.value })}
          />
        </div>
        <ToggleSwitch
          checked={!!form.isElectric}
          onChange={(v) => updateForm({ isElectric: v })}
          label={t("vehicle_tab.edit.is_electric")}
        />
        <ToggleSwitch
          checked={!!form.useHours}
          onChange={(v) => updateForm({ useHours: v })}
          label="Track Hours instead of Mileage"
        />
        <ToggleSwitch
          checked={!!form.odometerOptional}
          onChange={(v) => updateForm({ odometerOptional: v })}
          label="Odometer Optional"
        />
        <ToggleSwitch
          checked={!!form.excludeFromKiosk}
          onChange={(v) => updateForm({ excludeFromKiosk: v })}
          label="Exclude from Kiosk"
        />
      </Section>

      {/* Dashboard Metrics */}
      <Section title="Dashboard Metrics">
        <div className="col-span-2">
          <p className="text-xs text-zinc-500 mb-3">Choose which metrics to display on this vehicle's dashboard card.</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {DASHBOARD_METRIC_OPTIONS.map((opt) => {
              const isChecked = currentMetrics.includes(opt.value);
              return (
                <label
                  key={opt.value}
                  className={`flex items-center gap-2.5 px-3 py-2 rounded-lg border cursor-pointer transition-colors ${
                    isChecked
                      ? 'border-violet-500/50 bg-violet-500/10'
                      : 'border-zinc-800 hover:border-zinc-700 hover:bg-zinc-800/50'
                  }`}
                >
                  <div
                    className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${
                      isChecked
                        ? 'bg-violet-500 border-violet-500'
                        : 'border-zinc-600 bg-transparent'
                    }`}
                  >
                    {isChecked && <Check size={11} className="text-white" />}
                  </div>
                  <span className={`text-sm ${isChecked ? 'text-zinc-200' : 'text-zinc-400'}`}>
                    {opt.label}
                  </span>
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => toggleMetric(opt.value)}
                    className="sr-only"
                  />
                </label>
              );
            })}
          </div>
        </div>
      </Section>

      {/* Status */}
      <Section title={t("common.status")}>
        <div>
          <label className={labelClass}>{t("common.status")}</label>
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
          <label className={labelClass}>{t("vehicles.color")}</label>
          <input
            type="text"
            className={inputClass}
            placeholder="e.g. Black"
            value={form.color || ''}
            onChange={(e) => updateForm({ color: e.target.value })}
          />
        </div>
        {form.status !== 'owned' && (
          <div>
            <label className={labelClass}>{t("vehicles.listing_link")}</label>
            <input
              type="url"
              className={inputClass}
              placeholder="https://..."
              value={form.mobileDeLink || ''}
              onChange={(e) => updateForm({ mobileDeLink: e.target.value })}
            />
          </div>
        )}
        <div>
          <label className={labelClass}>{t("vehicles.image_url")}</label>
          <input
            type="url"
            className={inputClass}
            placeholder="https://..."
            value={form.imageUrl || ''}
            onChange={(e) => updateForm({ imageUrl: e.target.value })}
          />
        </div>
        <div className="col-span-2">
          <label className={labelClass}>{t("common.notes")}</label>
          <textarea
            className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2.5 text-sm text-zinc-50 placeholder:text-zinc-600 outline-none focus:border-violet-500/50 min-h-[100px] resize-none"
            placeholder={t("vehicle_tab.edit.additional_notes")}
            value={form.notes || ''}
            onChange={(e) => updateForm({ notes: e.target.value })}
          />
        </div>
      </Section>
    </div>
  );
}
