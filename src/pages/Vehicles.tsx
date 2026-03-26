import { useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, Car } from 'lucide-react';
import Modal from '../components/Modal';
import type { AppState, Page, Vehicle, FuelType, VehicleStatus } from '../types';
import { formatCurrency, getFuelTypeLabel, toMonthly } from '../utils';

interface VehiclesProps {
  state: AppState;
  setState: (s: AppState) => void;
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
  annualMileage: 0,
  fuelType: 'benzin',
  avgConsumption: 0,
  fuelPrice: 0,
  horsePower: 0,
  imageUrl: '',
  status: 'owned',
  mobileDeLink: '',
  notes: '',
  color: '#8b5cf6',
};

const fuelColors: Record<FuelType, string> = {
  diesel: 'text-amber-400',
  benzin: 'text-red-400',
  elektro: 'text-emerald-400',
  hybrid: 'text-sky-400',
  lpg: 'text-violet-400',
};

const fadeUp = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.35 },
};

export default function Vehicles({ state, setState, onNavigate }: VehiclesProps) {
  const { vehicles, costs } = state;
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState(emptyVehicle);

  const getMonthly = (vehicleId: string) => {
    const vCosts = costs.filter(c => c.vehicleId === vehicleId);
    return vCosts.reduce((sum, c) => sum + toMonthly(c.amount, c.frequency), 0);
  };

  const handleChange = (field: string, value: string | number) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = () => {
    const newVehicle: Vehicle = {
      ...form,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    };
    setState({ ...state, vehicles: [...vehicles, newVehicle] });
    setForm(emptyVehicle);
    setShowAdd(false);
  };

  const inputCls = 'w-full h-10 bg-zinc-950 border border-zinc-800 rounded-lg px-3 text-sm text-zinc-50 placeholder:text-zinc-600 outline-none focus:border-violet-500/50';
  const labelCls = 'block text-sm font-medium text-zinc-400 mb-2';

  return (
    <div className="space-y-8">
      {/* Header */}
      <motion.div {...fadeUp} className="flex items-center justify-between">
        <p className="text-sm text-zinc-400">
          Manage your vehicles and track their costs
        </p>
        <button
          onClick={() => setShowAdd(true)}
          className="bg-violet-500 hover:bg-violet-400 text-white rounded-lg h-10 px-5 text-sm font-medium inline-flex items-center gap-2 transition-colors"
        >
          <Plus size={16} />
          Add Vehicle
        </button>
      </motion.div>

      {/* Vehicle Grid */}
      {vehicles.length > 0 ? (
        <motion.div {...fadeUp} transition={{ duration: 0.35, delay: 0.05 }} className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {vehicles.map(v => (
            <div
              key={v.id}
              onClick={() => onNavigate('vehicle-detail', v.id)}
              className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 cursor-pointer hover:border-zinc-700 transition-colors overflow-hidden relative"
            >
              {/* Color bar */}
              <div
                className="absolute top-0 left-0 right-0 h-1"
                style={{ backgroundColor: v.color || '#8b5cf6' }}
              />

              <div className="mt-1">
                <h3 className="font-semibold text-zinc-50">{v.name}</h3>
                <p className="text-sm text-zinc-400 mt-0.5">
                  {v.brand} {v.model}
                </p>

                <div className="flex items-center gap-2 mt-3">
                  <span className={`bg-zinc-800 rounded-md px-2 py-0.5 text-xs ${fuelColors[v.fuelType]}`}>
                    {getFuelTypeLabel(v.fuelType)}
                  </span>
                </div>

                <p className="text-sm font-medium text-emerald-400 mt-3">
                  {formatCurrency(getMonthly(v.id))}/mo
                </p>
              </div>
            </div>
          ))}
        </motion.div>
      ) : (
        <motion.div {...fadeUp} transition={{ duration: 0.35, delay: 0.05 }} className="bg-zinc-900 border border-zinc-800 rounded-xl p-16 text-center">
          <Car className="mx-auto text-zinc-600 mb-4" size={40} />
          <p className="text-zinc-400 mb-1">No vehicles yet</p>
          <p className="text-sm text-zinc-600 mb-5">Add your first vehicle to start tracking costs</p>
          <button
            onClick={() => setShowAdd(true)}
            className="bg-violet-500 hover:bg-violet-400 text-white rounded-lg h-10 px-5 text-sm font-medium inline-flex items-center gap-2 transition-colors"
          >
            <Plus size={16} />
            Add Vehicle
          </button>
        </motion.div>
      )}

      {/* Add Vehicle Modal */}
      <Modal
        isOpen={showAdd}
        onClose={() => { setShowAdd(false); setForm(emptyVehicle); }}
        title="Add Vehicle"
        size="3xl"
        footer={
          <>
            <button
              onClick={() => { setShowAdd(false); setForm(emptyVehicle); }}
              className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg h-10 px-4 text-sm transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={!form.name.trim()}
              className="bg-violet-500 hover:bg-violet-400 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg h-10 px-5 text-sm font-medium transition-colors"
            >
              Add Vehicle
            </button>
          </>
        }
      >
        <div className="space-y-8">
          {/* Basic Info */}
          <div>
            <h3 className="text-sm font-semibold text-zinc-50 mb-4">Basic Information</h3>
            <div className="space-y-5">
              <div className="grid grid-cols-2 gap-5">
                <div>
                  <label className={labelCls}>Name *</label>
                  <input
                    className={inputCls}
                    placeholder="e.g. My BMW"
                    value={form.name}
                    onChange={e => handleChange('name', e.target.value)}
                  />
                </div>
                <div>
                  <label className={labelCls}>Color</label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={form.color}
                      onChange={e => handleChange('color', e.target.value)}
                      className="w-10 h-10 rounded-lg border border-zinc-800 bg-zinc-950 cursor-pointer"
                    />
                    <input
                      className={inputCls}
                      value={form.color}
                      onChange={e => handleChange('color', e.target.value)}
                    />
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-5">
                <div>
                  <label className={labelCls}>Brand</label>
                  <input
                    className={inputCls}
                    placeholder="e.g. BMW"
                    value={form.brand}
                    onChange={e => handleChange('brand', e.target.value)}
                  />
                </div>
                <div>
                  <label className={labelCls}>Model</label>
                  <input
                    className={inputCls}
                    placeholder="e.g. 320d"
                    value={form.model}
                    onChange={e => handleChange('model', e.target.value)}
                  />
                </div>
                <div>
                  <label className={labelCls}>Variant</label>
                  <input
                    className={inputCls}
                    placeholder="e.g. xDrive"
                    value={form.variant}
                    onChange={e => handleChange('variant', e.target.value)}
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-5">
                <div>
                  <label className={labelCls}>Fuel Type</label>
                  <select
                    className={inputCls}
                    value={form.fuelType}
                    onChange={e => handleChange('fuelType', e.target.value)}
                  >
                    <option value="benzin">Gasoline</option>
                    <option value="diesel">Diesel</option>
                    <option value="elektro">Electric</option>
                    <option value="hybrid">Hybrid</option>
                    <option value="lpg">LPG</option>
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Horsepower</label>
                  <input
                    type="number"
                    className={inputCls}
                    placeholder="0"
                    value={form.horsePower || ''}
                    onChange={e => handleChange('horsePower', Number(e.target.value))}
                  />
                </div>
                <div>
                  <label className={labelCls}>Purchase Price</label>
                  <input
                    type="number"
                    className={inputCls}
                    placeholder="0.00"
                    value={form.purchasePrice || ''}
                    onChange={e => handleChange('purchasePrice', Number(e.target.value))}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Registration */}
          <div>
            <h3 className="text-sm font-semibold text-zinc-50 mb-4">Registration</h3>
            <div className="space-y-5">
              <div className="grid grid-cols-3 gap-5">
                <div>
                  <label className={labelCls}>License Plate</label>
                  <input
                    className={inputCls}
                    placeholder="e.g. M-AB 1234"
                    value={form.licensePlate}
                    onChange={e => handleChange('licensePlate', e.target.value)}
                  />
                </div>
                <div>
                  <label className={labelCls}>HSN</label>
                  <input
                    className={inputCls}
                    placeholder="e.g. 0005"
                    value={form.hsn}
                    onChange={e => handleChange('hsn', e.target.value)}
                  />
                </div>
                <div>
                  <label className={labelCls}>TSN</label>
                  <input
                    className={inputCls}
                    placeholder="e.g. BNA"
                    value={form.tsn}
                    onChange={e => handleChange('tsn', e.target.value)}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-5">
                <div>
                  <label className={labelCls}>First Registration</label>
                  <input
                    type="date"
                    className={inputCls}
                    value={form.firstRegistration}
                    onChange={e => handleChange('firstRegistration', e.target.value)}
                  />
                </div>
                <div>
                  <label className={labelCls}>Purchase Date</label>
                  <input
                    type="date"
                    className={inputCls}
                    value={form.purchaseDate}
                    onChange={e => handleChange('purchaseDate', e.target.value)}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Mileage */}
          <div>
            <h3 className="text-sm font-semibold text-zinc-50 mb-4">Mileage & Consumption</h3>
            <div className="space-y-5">
              <div className="grid grid-cols-2 gap-5">
                <div>
                  <label className={labelCls}>Current Mileage (km)</label>
                  <input
                    type="number"
                    className={inputCls}
                    placeholder="0"
                    value={form.currentMileage || ''}
                    onChange={e => handleChange('currentMileage', Number(e.target.value))}
                  />
                </div>
                <div>
                  <label className={labelCls}>Annual Mileage (km)</label>
                  <input
                    type="number"
                    className={inputCls}
                    placeholder="0"
                    value={form.annualMileage || ''}
                    onChange={e => handleChange('annualMileage', Number(e.target.value))}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-5">
                <div>
                  <label className={labelCls}>Avg. Consumption (l/100km)</label>
                  <input
                    type="number"
                    step="0.1"
                    className={inputCls}
                    placeholder="0.0"
                    value={form.avgConsumption || ''}
                    onChange={e => handleChange('avgConsumption', Number(e.target.value))}
                  />
                </div>
                <div>
                  <label className={labelCls}>Fuel Price (EUR/l)</label>
                  <input
                    type="number"
                    step="0.01"
                    className={inputCls}
                    placeholder="0.00"
                    value={form.fuelPrice || ''}
                    onChange={e => handleChange('fuelPrice', Number(e.target.value))}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Status & Notes */}
          <div>
            <h3 className="text-sm font-semibold text-zinc-50 mb-4">Status & Links</h3>
            <div className="space-y-5">
              <div className="grid grid-cols-2 gap-5">
                <div>
                  <label className={labelCls}>Status</label>
                  <select
                    className={inputCls}
                    value={form.status}
                    onChange={e => handleChange('status', e.target.value)}
                  >
                    <option value="owned">Owned</option>
                    <option value="planned">Planned</option>
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Image URL</label>
                  <input
                    className={inputCls}
                    placeholder="https://..."
                    value={form.imageUrl}
                    onChange={e => handleChange('imageUrl', e.target.value)}
                  />
                </div>
              </div>
              <div>
                <label className={labelCls}>mobile.de Link</label>
                <input
                  className={inputCls}
                  placeholder="https://www.mobile.de/..."
                  value={form.mobileDeLink}
                  onChange={e => handleChange('mobileDeLink', e.target.value)}
                />
              </div>
              <div>
                <label className={labelCls}>Notes</label>
                <textarea
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2.5 text-sm text-zinc-50 placeholder:text-zinc-600 outline-none focus:border-violet-500/50 min-h-[80px] resize-y"
                  placeholder="Additional notes..."
                  value={form.notes}
                  onChange={e => handleChange('notes', e.target.value)}
                />
              </div>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}
