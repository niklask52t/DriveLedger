import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Plus, Car, ArrowUpDown } from 'lucide-react';
import { api } from '../api';
import Modal from '../components/Modal';
import TagInput from '../components/TagInput';
import type { AppState, Page, Vehicle, FuelType, VehicleStatus } from '../types';
import { formatCurrency, getFuelTypeLabel, toMonthly } from '../utils';
import { useI18n } from '../contexts/I18nContext';
import { useUserConfig } from '../contexts/UserConfigContext';

type VehicleSortKey = 'date_added' | 'name' | 'year' | 'mileage' | 'monthly_cost';

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
  tags: [],
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
  const { t } = useI18n();
  const { config } = useUserConfig();
  const { vehicles: allVehicles, costs } = state;

  // Filter out sold vehicles if hideSoldVehicles is enabled
  const vehicles = useMemo(() => {
    if (config.hideSoldVehicles) {
      return allVehicles.filter(v => !v.soldDate);
    }
    return allVehicles;
  }, [allVehicles, config.hideSoldVehicles]);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState(emptyVehicle);
  const [sortBy, setSortBy] = useState<VehicleSortKey>('date_added');

  const getMonthly = (vehicleId: string) => {
    const vCosts = costs.filter(c => c.vehicleId === vehicleId);
    return vCosts.reduce((sum, c) => sum + toMonthly(c.amount, c.frequency), 0);
  };

  const sortedVehicles = useMemo(() => {
    const sorted = [...vehicles];
    switch (sortBy) {
      case 'name':
        sorted.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case 'year':
        sorted.sort((a, b) => {
          const yearA = a.firstRegistration ? new Date(a.firstRegistration).getFullYear() : 0;
          const yearB = b.firstRegistration ? new Date(b.firstRegistration).getFullYear() : 0;
          return yearB - yearA;
        });
        break;
      case 'mileage':
        sorted.sort((a, b) => b.currentMileage - a.currentMileage);
        break;
      case 'monthly_cost':
        sorted.sort((a, b) => getMonthly(b.id) - getMonthly(a.id));
        break;
      case 'date_added':
      default:
        sorted.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        break;
    }
    return sorted;
  }, [vehicles, sortBy, costs]);

  const handleChange = (field: string, value: string | number) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    try {
      const newVehicle = await api.createVehicle(form);
      setState({ ...state, vehicles: [...vehicles, newVehicle] });
      setForm(emptyVehicle);
      setShowAdd(false);
    } catch {
      // ignore
    }
  };

  const inputCls = 'w-full h-10 bg-zinc-950 border border-zinc-800 rounded-lg px-3 text-sm text-zinc-50 placeholder:text-zinc-600 outline-none focus:border-violet-500/50';
  const labelCls = 'block text-sm font-medium text-zinc-400 mb-2';

  return (
    <div className="space-y-8">
      {/* Header */}
      <motion.div {...fadeUp} className="flex items-center justify-between">
        <p className="text-sm text-zinc-400">
          {t('vehicles.subtitle')}
        </p>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <ArrowUpDown size={14} className="text-zinc-500" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as VehicleSortKey)}
              className="h-10 bg-zinc-900 border border-zinc-800 rounded-lg px-3 text-sm text-zinc-50 outline-none focus:border-violet-500/50 appearance-none"
            >
              <option value="date_added">{t('vehicles.sort_date_added') || 'Date Added'}</option>
              <option value="name">{t('vehicles.sort_name') || 'Name'}</option>
              <option value="year">{t('vehicles.sort_year') || 'Year'}</option>
              <option value="mileage">{t('vehicles.sort_mileage') || 'Mileage'}</option>
              <option value="monthly_cost">{t('vehicles.sort_monthly_cost') || 'Monthly Cost'}</option>
            </select>
          </div>
          <button
            onClick={() => setShowAdd(true)}
            className="bg-violet-500 hover:bg-violet-400 text-white rounded-lg h-10 px-5 text-sm font-medium inline-flex items-center gap-2 transition-colors"
          >
            <Plus size={16} />
            {t('vehicles.add')}
          </button>
        </div>
      </motion.div>

      {/* Vehicle Grid */}
      {sortedVehicles.length > 0 ? (
        <motion.div {...fadeUp} transition={{ duration: 0.35, delay: 0.05 }} className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {sortedVehicles.map(v => (
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

              {/* Vehicle thumbnail */}
              {(config.showVehicleThumbnail !== false) && v.imageUrl && (
                <div className="mt-2 mb-3 -mx-5">
                  <img
                    src={v.imageUrl}
                    alt={v.name}
                    className="w-full h-32 object-cover"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                  />
                </div>
              )}

              <div className="mt-1">
                <h3 className="font-semibold text-zinc-50">{v.name}</h3>
                <p className="text-sm text-zinc-400 mt-0.5">
                  {v.brand} {v.model}
                </p>

                <div className="flex items-center gap-2 mt-3 flex-wrap">
                  <span className={`bg-zinc-800 rounded-md px-2 py-0.5 text-xs ${fuelColors[v.fuelType]}`}>
                    {getFuelTypeLabel(v.fuelType)}
                  </span>
                  {(v.tags || []).map(tag => (
                    <span key={tag} className="bg-violet-500/10 text-violet-400 rounded-md px-2 py-0.5 text-xs">
                      {tag}
                    </span>
                  ))}
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
          <p className="text-zinc-400 mb-1">{t('vehicles.no_vehicles')}</p>
          <p className="text-sm text-zinc-600 mb-5">{t('vehicles.no_vehicles_hint')}</p>
          <button
            onClick={() => setShowAdd(true)}
            className="bg-violet-500 hover:bg-violet-400 text-white rounded-lg h-10 px-5 text-sm font-medium inline-flex items-center gap-2 transition-colors"
          >
            <Plus size={16} />
            {t('vehicles.add')}
          </button>
        </motion.div>
      )}

      {/* Add Vehicle Modal */}
      <Modal
        isOpen={showAdd}
        onClose={() => { setShowAdd(false); setForm(emptyVehicle); }}
        title={t('vehicles.add')}
        size="3xl"
        footer={
          <>
            <button
              onClick={() => { setShowAdd(false); setForm(emptyVehicle); }}
              className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg h-10 px-4 text-sm transition-colors"
            >
              {t('common.cancel')}
            </button>
            <button
              onClick={handleSubmit}
              disabled={!form.name.trim()}
              className="bg-violet-500 hover:bg-violet-400 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg h-10 px-5 text-sm font-medium transition-colors"
            >
              {t('vehicles.add')}
            </button>
          </>
        }
      >
        <div className="space-y-8">
          {/* Basic Info */}
          <div>
            <h3 className="text-sm font-semibold text-zinc-50 mb-4">{t('vehicles.basic_info')}</h3>
            <div className="space-y-5">
              <div className="grid grid-cols-2 gap-5">
                <div>
                  <label className={labelCls}>{t('common.name')} *</label>
                  <input
                    className={inputCls}
                    placeholder="e.g. My BMW"
                    value={form.name}
                    onChange={e => handleChange('name', e.target.value)}
                  />
                </div>
                <div>
                  <label className={labelCls}>{t('vehicles.color')}</label>
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
                  <label className={labelCls}>{t('vehicles.brand')}</label>
                  <input
                    className={inputCls}
                    placeholder="e.g. BMW"
                    value={form.brand}
                    onChange={e => handleChange('brand', e.target.value)}
                  />
                </div>
                <div>
                  <label className={labelCls}>{t('vehicles.model')}</label>
                  <input
                    className={inputCls}
                    placeholder="e.g. 320d"
                    value={form.model}
                    onChange={e => handleChange('model', e.target.value)}
                  />
                </div>
                <div>
                  <label className={labelCls}>{t('vehicles.variant')}</label>
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
                  <label className={labelCls}>{t('vehicles.fuel_type')}</label>
                  <select
                    className={inputCls}
                    value={form.fuelType}
                    onChange={e => handleChange('fuelType', e.target.value)}
                  >
                    <option value="benzin">{t('fuel_type.benzin')}</option>
                    <option value="diesel">{t('fuel_type.diesel')}</option>
                    <option value="elektro">{t('fuel_type.elektro')}</option>
                    <option value="hybrid">{t('fuel_type.hybrid')}</option>
                    <option value="lpg">{t('fuel_type.lpg')}</option>
                  </select>
                </div>
                <div>
                  <label className={labelCls}>{t('vehicles.horsepower')}</label>
                  <input
                    type="number"
                    className={inputCls}
                    placeholder="0"
                    value={form.horsePower || ''}
                    onChange={e => handleChange('horsePower', Number(e.target.value))}
                  />
                </div>
                <div>
                  <label className={labelCls}>{t('vehicles.purchase_price')}</label>
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
            <h3 className="text-sm font-semibold text-zinc-50 mb-4">{t('vehicles.registration')}</h3>
            <div className="space-y-5">
              <div className="grid grid-cols-3 gap-5">
                <div>
                  <label className={labelCls}>{t('vehicles.license_plate')}</label>
                  <input
                    className={inputCls}
                    placeholder="e.g. M-AB 1234"
                    value={form.licensePlate}
                    onChange={e => handleChange('licensePlate', e.target.value)}
                  />
                </div>
                <div>
                  <label className={labelCls}>{t('vehicles.hsn')}</label>
                  <input
                    className={inputCls}
                    placeholder="e.g. 0005"
                    value={form.hsn}
                    onChange={e => handleChange('hsn', e.target.value)}
                  />
                </div>
                <div>
                  <label className={labelCls}>{t('vehicles.tsn')}</label>
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
                  <label className={labelCls}>{t('vehicles.first_registration')}</label>
                  <input
                    type="date"
                    className={inputCls}
                    value={form.firstRegistration}
                    onChange={e => handleChange('firstRegistration', e.target.value)}
                  />
                </div>
                <div>
                  <label className={labelCls}>{t('vehicles.purchase_date')}</label>
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
            <h3 className="text-sm font-semibold text-zinc-50 mb-4">{t('vehicles.mileage_consumption')}</h3>
            <div className="space-y-5">
              <div className="grid grid-cols-2 gap-5">
                <div>
                  <label className={labelCls}>{t('vehicles.current_mileage')}</label>
                  <input
                    type="number"
                    className={inputCls}
                    placeholder="0"
                    value={form.currentMileage || ''}
                    onChange={e => handleChange('currentMileage', Number(e.target.value))}
                  />
                </div>
                <div>
                  <label className={labelCls}>{t('vehicles.annual_mileage')}</label>
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
                  <label className={labelCls}>{t('vehicles.avg_consumption')}</label>
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
                  <label className={labelCls}>{t('vehicles.fuel_price')}</label>
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
            <h3 className="text-sm font-semibold text-zinc-50 mb-4">{t('vehicles.status_links')}</h3>
            <div className="space-y-5">
              <div className="grid grid-cols-2 gap-5">
                <div>
                  <label className={labelCls}>{t('vehicles.status')}</label>
                  <select
                    className={inputCls}
                    value={form.status}
                    onChange={e => handleChange('status', e.target.value)}
                  >
                    <option value="owned">{t('vehicles.owned')}</option>
                    <option value="planned">{t('vehicles.planned')}</option>
                  </select>
                </div>
                <div>
                  <label className={labelCls}>{t('vehicles.image_url')}</label>
                  <input
                    className={inputCls}
                    placeholder="https://..."
                    value={form.imageUrl}
                    onChange={e => handleChange('imageUrl', e.target.value)}
                  />
                </div>
              </div>
              <div>
                <label className={labelCls}>{t('vehicles.mobile_de_link')}</label>
                <input
                  className={inputCls}
                  placeholder="https://www.mobile.de/..."
                  value={form.mobileDeLink}
                  onChange={e => handleChange('mobileDeLink', e.target.value)}
                />
              </div>
              <div>
                <label className={labelCls}>{t('common.tags')}</label>
                <TagInput
                  tags={(form.tags as string[]) || []}
                  onChange={tags => setForm(prev => ({ ...prev, tags }))}
                />
              </div>
              <div>
                <label className={labelCls}>{t('common.notes')}</label>
                <textarea
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2.5 text-sm text-zinc-50 placeholder:text-zinc-600 outline-none focus:border-violet-500/50 min-h-[80px] resize-y"
                  placeholder={t('common.optional_notes')}
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
