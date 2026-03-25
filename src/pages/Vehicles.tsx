import { useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import {
  Plus,
  Car,
  Fuel,
  Gauge,
  DollarSign,
  ImageIcon,
} from 'lucide-react';
import Modal from '../components/Modal';
import type { AppState, Vehicle, FuelType, VehicleStatus, Page } from '../types';
import {
  formatCurrency,
  getFuelTypeLabel,
  toMonthly,
} from '../utils';

interface VehiclesProps {
  state: AppState;
  setState: (state: AppState) => void;
  onNavigate: (page: Page, vehicleId?: string) => void;
}

const emptyVehicle: Omit<Vehicle, 'id' | 'createdAt'> = {
  name: '',
  brand: '',
  model: '',
  variant: '',
  licensePlate: '',
  hsn: '',
  tsn: '',
  firstRegistration: '',
  purchasePrice: 0,
  purchaseDate: '',
  currentMileage: 0,
  annualMileage: 15000,
  fuelType: 'benzin',
  avgConsumption: 7,
  fuelPrice: 1.75,
  horsePower: 0,
  imageUrl: '',
  status: 'owned',
  mobileDeLink: '',
  notes: '',
  color: '#3b82f6',
};

const inputClass =
  'w-full bg-dark-900 border border-dark-600 rounded-lg px-3 py-2 text-dark-100 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none transition-colors';

const labelClass = 'block text-sm font-medium text-dark-300 mb-1';

const fuelTypeOptions: { value: FuelType; label: string }[] = [
  { value: 'benzin', label: 'Gasoline' },
  { value: 'diesel', label: 'Diesel' },
  { value: 'elektro', label: 'Electric' },
  { value: 'hybrid', label: 'Hybrid' },
  { value: 'lpg', label: 'LPG' },
];

const statusOptions: { value: VehicleStatus; label: string }[] = [
  { value: 'owned', label: 'Owned' },
  { value: 'planned', label: 'Planned' },
];

function getFuelBadgeColor(ft: FuelType): string {
  switch (ft) {
    case 'diesel': return 'bg-yellow-500/20 text-yellow-400';
    case 'benzin': return 'bg-red-500/20 text-red-400';
    case 'elektro': return 'bg-green-500/20 text-green-400';
    case 'hybrid': return 'bg-cyan-500/20 text-cyan-400';
    case 'lpg': return 'bg-purple-500/20 text-purple-400';
  }
}

function getStatusBadge(status: VehicleStatus) {
  if (status === 'owned') {
    return <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-success/20 text-success">Owned</span>;
  }
  return <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-warning/20 text-warning">Planned</span>;
}

interface VehicleFormProps {
  form: Omit<Vehicle, 'id' | 'createdAt'>;
  updateForm: <K extends keyof Omit<Vehicle, 'id' | 'createdAt'>>(key: K, value: Omit<Vehicle, 'id' | 'createdAt'>[K]) => void;
}

function VehicleForm({ form, updateForm }: VehicleFormProps) {
  return (
    <div className="space-y-6">
      {/* Basic Info */}
      <div>
        <h3 className="text-sm font-semibold text-dark-200 uppercase tracking-wider mb-3">Basic Information</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Name *</label>
            <input
              type="text"
              className={inputClass}
              placeholder="e.g. My BMW"
              value={form.name}
              onChange={(e) => updateForm('name', e.target.value)}
            />
          </div>
          <div>
            <label className={labelClass}>Brand</label>
            <input
              type="text"
              className={inputClass}
              placeholder="e.g. BMW"
              value={form.brand}
              onChange={(e) => updateForm('brand', e.target.value)}
            />
          </div>
          <div>
            <label className={labelClass}>Model</label>
            <input
              type="text"
              className={inputClass}
              placeholder="e.g. 3 Series"
              value={form.model}
              onChange={(e) => updateForm('model', e.target.value)}
            />
          </div>
          <div>
            <label className={labelClass}>Variant</label>
            <input
              type="text"
              className={inputClass}
              placeholder="e.g. 320d xDrive"
              value={form.variant}
              onChange={(e) => updateForm('variant', e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Registration & Purchase */}
      <div>
        <h3 className="text-sm font-semibold text-dark-200 uppercase tracking-wider mb-3">Registration & Purchase</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>License Plate</label>
            <input
              type="text"
              className={inputClass}
              placeholder="e.g. B-AB 1234"
              value={form.licensePlate}
              onChange={(e) => updateForm('licensePlate', e.target.value)}
            />
          </div>
          <div>
            <label className={labelClass}>First Registration</label>
            <input
              type="date"
              className={inputClass}
              value={form.firstRegistration}
              onChange={(e) => updateForm('firstRegistration', e.target.value)}
            />
          </div>
          <div>
            <label className={labelClass}>HSN</label>
            <input
              type="text"
              className={inputClass}
              placeholder="Manufacturer key"
              value={form.hsn}
              onChange={(e) => updateForm('hsn', e.target.value)}
            />
          </div>
          <div>
            <label className={labelClass}>TSN</label>
            <input
              type="text"
              className={inputClass}
              placeholder="Type key"
              value={form.tsn}
              onChange={(e) => updateForm('tsn', e.target.value)}
            />
          </div>
          <div>
            <label className={labelClass}>Purchase Date</label>
            <input
              type="date"
              className={inputClass}
              value={form.purchaseDate}
              onChange={(e) => updateForm('purchaseDate', e.target.value)}
            />
          </div>
          <div>
            <label className={labelClass}>Purchase Price</label>
            <input
              type="number"
              className={inputClass}
              placeholder="0"
              value={form.purchasePrice || ''}
              onChange={(e) => updateForm('purchasePrice', parseFloat(e.target.value) || 0)}
            />
          </div>
        </div>
      </div>

      {/* Mileage & Fuel */}
      <div>
        <h3 className="text-sm font-semibold text-dark-200 uppercase tracking-wider mb-3">Mileage & Fuel</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Current Mileage (km)</label>
            <input
              type="number"
              className={inputClass}
              placeholder="0"
              value={form.currentMileage || ''}
              onChange={(e) => updateForm('currentMileage', parseFloat(e.target.value) || 0)}
            />
          </div>
          <div>
            <label className={labelClass}>Annual Mileage (km)</label>
            <input
              type="number"
              className={inputClass}
              placeholder="15000"
              value={form.annualMileage || ''}
              onChange={(e) => updateForm('annualMileage', parseFloat(e.target.value) || 0)}
            />
          </div>
          <div>
            <label className={labelClass}>Fuel Type</label>
            <select
              className={inputClass}
              value={form.fuelType}
              onChange={(e) => updateForm('fuelType', e.target.value as FuelType)}
            >
              {fuelTypeOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
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
              placeholder="7.0"
              value={form.avgConsumption || ''}
              onChange={(e) => updateForm('avgConsumption', parseFloat(e.target.value) || 0)}
            />
          </div>
          <div>
            <label className={labelClass}>Fuel Price (EUR/L)</label>
            <input
              type="number"
              step="0.01"
              className={inputClass}
              placeholder="1.75"
              value={form.fuelPrice || ''}
              onChange={(e) => updateForm('fuelPrice', parseFloat(e.target.value) || 0)}
            />
          </div>
          <div>
            <label className={labelClass}>Horse Power (PS)</label>
            <input
              type="number"
              className={inputClass}
              placeholder="0"
              value={form.horsePower || ''}
              onChange={(e) => updateForm('horsePower', parseFloat(e.target.value) || 0)}
            />
          </div>
        </div>
      </div>

      {/* Status & Extras */}
      <div>
        <h3 className="text-sm font-semibold text-dark-200 uppercase tracking-wider mb-3">Status & Extras</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Status</label>
            <select
              className={inputClass}
              value={form.status}
              onChange={(e) => updateForm('status', e.target.value as VehicleStatus)}
            >
              {statusOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass}>Color</label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                className="w-10 h-10 rounded-lg border border-dark-600 cursor-pointer bg-dark-900 shrink-0"
                value={form.color}
                onChange={(e) => updateForm('color', e.target.value)}
              />
              <input
                type="text"
                className={inputClass}
                value={form.color}
                onChange={(e) => updateForm('color', e.target.value)}
              />
            </div>
          </div>
          <div>
            <label className={labelClass}>mobile.de Link</label>
            <input
              type="url"
              className={inputClass}
              placeholder="https://www.mobile.de/..."
              value={form.mobileDeLink}
              onChange={(e) => updateForm('mobileDeLink', e.target.value)}
            />
          </div>
          <div>
            <label className={labelClass}>Image URL</label>
            <div className="flex items-center gap-2">
              <ImageIcon size={16} className="text-dark-500 shrink-0" />
              <input
                type="url"
                className={inputClass}
                placeholder="https://..."
                value={form.imageUrl}
                onChange={(e) => updateForm('imageUrl', e.target.value)}
              />
            </div>
          </div>
          <div className="sm:col-span-2">
            <label className={labelClass}>Notes</label>
            <textarea
              className={`${inputClass} resize-none`}
              rows={3}
              placeholder="Any additional notes..."
              value={form.notes}
              onChange={(e) => updateForm('notes', e.target.value)}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Vehicles({ state, setState, onNavigate }: VehiclesProps) {
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(emptyVehicle);

  const getVehicleMonthlyCost = (vehicleId: string) => {
    const costs = state.costs.filter((c) => c.vehicleId === vehicleId);
    return costs.reduce((sum, c) => sum + toMonthly(c.amount, c.frequency), 0);
  };

  const handleSubmit = () => {
    if (!form.name.trim()) return;
    const newVehicle: Vehicle = {
      ...form,
      id: uuidv4(),
      createdAt: new Date().toISOString(),
    };
    setState({ ...state, vehicles: [...state.vehicles, newVehicle] });
    setForm(emptyVehicle);
    setShowModal(false);
  };

  const updateForm = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-dark-50">Vehicles</h1>
          <p className="text-dark-400 mt-1">Manage your vehicles and track costs</p>
        </div>
        <button
          onClick={() => {
            setForm(emptyVehicle);
            setShowModal(true);
          }}
          className="flex items-center gap-2 px-4 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-medium transition-colors shadow-lg shadow-primary-600/20 cursor-pointer"
        >
          <Plus size={18} />
          Add Vehicle
        </button>
      </div>

      {/* Vehicle Grid */}
      {state.vehicles.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-dark-400">
          <Car size={56} className="mb-4 opacity-40" />
          <p className="text-lg font-medium mb-1">No vehicles yet</p>
          <p className="text-sm">Add your first vehicle to get started</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {state.vehicles.map((v) => {
            const monthlyCost = getVehicleMonthlyCost(v.id);
            return (
              <div
                key={v.id}
                onClick={() => onNavigate('vehicle-detail', v.id)}
                className="bg-dark-800 border border-dark-700 rounded-xl overflow-hidden hover:border-dark-500 transition-all cursor-pointer group hover:shadow-lg hover:shadow-black/20"
              >
                {/* Accent bar */}
                <div className="h-1.5" style={{ backgroundColor: v.color || '#3b82f6' }} />

                <div className="p-5">
                  <div className="flex items-start gap-4">
                    {/* Brand logo circle */}
                    <div
                      className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg shrink-0 shadow-lg"
                      style={{ backgroundColor: v.color || '#3b82f6' }}
                    >
                      {v.brand ? v.brand.charAt(0).toUpperCase() : v.name.charAt(0).toUpperCase()}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <h3 className="font-semibold text-dark-50 truncate group-hover:text-primary-400 transition-colors">
                            {v.name}
                          </h3>
                          <p className="text-sm text-dark-400 truncate">
                            {[v.brand, v.model, v.variant].filter(Boolean).join(' ')}
                          </p>
                        </div>
                        {getStatusBadge(v.status)}
                      </div>
                    </div>
                  </div>

                  {/* Details */}
                  <div className="mt-4 grid grid-cols-2 gap-3">
                    <div className="flex items-center gap-2 text-sm text-dark-300">
                      <Fuel size={14} className="text-dark-500" />
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getFuelBadgeColor(v.fuelType)}`}>
                        {getFuelTypeLabel(v.fuelType)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-dark-300">
                      <Gauge size={14} className="text-dark-500" />
                      <span>{v.annualMileage.toLocaleString('de-DE')} km/yr</span>
                    </div>
                  </div>

                  {/* Monthly Cost Summary */}
                  <div className="mt-4 pt-4 border-t border-dark-700 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm text-dark-400">
                      <DollarSign size={14} />
                      <span>Monthly costs</span>
                    </div>
                    <span className="font-semibold text-dark-100">{formatCurrency(monthlyCost)}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Vehicle Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title="Add Vehicle"
        size="3xl"
        footer={
          <>
            <button
              onClick={() => setShowModal(false)}
              className="px-4 py-2 rounded-lg text-dark-300 hover:text-dark-100 hover:bg-dark-700 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={!form.name.trim()}
              className="px-6 py-2 bg-primary-600 hover:bg-primary-700 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors cursor-pointer"
            >
              Add Vehicle
            </button>
          </>
        }
      >
        <VehicleForm form={form} updateForm={updateForm} />
      </Modal>
    </div>
  );
}
