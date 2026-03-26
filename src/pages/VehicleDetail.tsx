import { useState, useMemo, lazy, Suspense } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowLeft, Pencil, Trash2, DollarSign, Wrench, ArrowUpCircle,
  CreditCard, PiggyBank, BarChart3, Fuel, Gauge, ClipboardCheck, FileText, Receipt,
} from 'lucide-react';
import Modal from '../components/Modal';
import { cn } from '../lib/utils';
import type { AppState, Page, Vehicle, FuelType, VehicleStatus } from '../types';
import {
  formatCurrency, formatDate, formatNumber, getFuelTypeLabel,
  getTotalMonthlyCosts, getTotalYearlyCosts, getTotalRepairCosts, toMonthly,
} from '../utils';

const CostsTab = lazy(() => import('../components/vehicle/VehicleCostsTab'));
const RepairsTab = lazy(() => import('../components/vehicle/VehicleRepairsTab'));
const LoansTab = lazy(() => import('../components/vehicle/VehicleLoansTab'));
const SavingsTab = lazy(() => import('../components/vehicle/VehicleSavingsTab'));
const StatisticsTab = lazy(() => import('../components/vehicle/VehicleStatsTab'));
const ServicesTab = lazy(() => import('../components/vehicle/VehicleServicesTab'));
const UpgradesTab = lazy(() => import('../components/vehicle/VehicleUpgradesTab'));
const FuelTab = lazy(() => import('../components/vehicle/VehicleFuelTab'));
const OdometerTab = lazy(() => import('../components/vehicle/VehicleOdometerTab'));
const InspectionsTab = lazy(() => import('../components/vehicle/VehicleInspectionsTab'));
const NotesTab = lazy(() => import('../components/vehicle/VehicleNotesTab'));
const TaxesTab = lazy(() => import('../components/vehicle/VehicleTaxesTab'));

interface VehicleDetailProps {
  state: AppState;
  setState: (s: AppState) => void;
  vehicleId: string;
  onNavigate: (page: Page, vehicleId?: string) => void;
}

type Tab = 'costs' | 'services' | 'upgrades' | 'repairs' | 'fuel' | 'odometer' | 'loans' | 'savings' | 'inspections' | 'notes' | 'taxes' | 'statistics';

const tabs: { key: Tab; label: string; icon: React.ElementType }[] = [
  { key: 'costs', label: 'Costs', icon: DollarSign },
  { key: 'services', label: 'Services', icon: Wrench },
  { key: 'upgrades', label: 'Upgrades', icon: ArrowUpCircle },
  { key: 'repairs', label: 'Repairs', icon: Wrench },
  { key: 'fuel', label: 'Fuel', icon: Fuel },
  { key: 'odometer', label: 'Odometer', icon: Gauge },
  { key: 'loans', label: 'Loans', icon: CreditCard },
  { key: 'savings', label: 'Savings', icon: PiggyBank },
  { key: 'inspections', label: 'Inspections', icon: ClipboardCheck },
  { key: 'notes', label: 'Notes', icon: FileText },
  { key: 'taxes', label: 'Taxes', icon: Receipt },
  { key: 'statistics', label: 'Statistics', icon: BarChart3 },
];

const fadeUp = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.35 },
};

export default function VehicleDetail({ state, setState, vehicleId, onNavigate }: VehicleDetailProps) {
  const vehicle = state.vehicles.find(v => v.id === vehicleId);
  const [activeTab, setActiveTab] = useState<Tab>('costs');
  const [showEdit, setShowEdit] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [editForm, setEditForm] = useState<Omit<Vehicle, 'id' | 'createdAt'> | null>(null);

  const vehicleCosts = useMemo(
    () => state.costs.filter(c => c.vehicleId === vehicleId),
    [state.costs, vehicleId],
  );
  const vehicleRepairs = useMemo(
    () => state.repairs.filter(r => r.vehicleId === vehicleId),
    [state.repairs, vehicleId],
  );
  const vehicleLoans = useMemo(
    () => state.loans.filter(l => l.vehicleId === vehicleId),
    [state.loans, vehicleId],
  );
  const vehicleSavings = useMemo(
    () => state.savingsGoals.filter(s => s.vehicleId === vehicleId),
    [state.savingsGoals, vehicleId],
  );

  const monthlyCost = useMemo(() => getTotalMonthlyCosts(vehicleCosts), [vehicleCosts]);
  const yearlyCost = useMemo(() => getTotalYearlyCosts(vehicleCosts), [vehicleCosts]);
  const repairTotal = useMemo(() => getTotalRepairCosts(vehicleRepairs), [vehicleRepairs]);

  if (!vehicle) {
    return (
      <div className="space-y-8">
        <button
          onClick={() => onNavigate('vehicles')}
          className="inline-flex items-center gap-2 text-zinc-400 hover:text-zinc-200 text-sm transition-colors"
        >
          <ArrowLeft size={16} />
          Back to Vehicles
        </button>
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-16 text-center">
          <p className="text-zinc-400">Vehicle not found</p>
        </div>
      </div>
    );
  }

  const openEdit = () => {
    const { id, createdAt, ...rest } = vehicle;
    setEditForm(rest);
    setShowEdit(true);
  };

  const handleEditChange = (field: string, value: string | number) => {
    setEditForm(prev => prev ? { ...prev, [field]: value } : prev);
  };

  const handleEditSubmit = () => {
    if (!editForm) return;
    const updated = state.vehicles.map(v =>
      v.id === vehicleId ? { ...v, ...editForm } : v,
    );
    setState({ ...state, vehicles: updated });
    setShowEdit(false);
    setEditForm(null);
  };

  const handleDelete = () => {
    setState({
      ...state,
      vehicles: state.vehicles.filter(v => v.id !== vehicleId),
      costs: state.costs.filter(c => c.vehicleId !== vehicleId),
      loans: state.loans.filter(l => l.vehicleId !== vehicleId),
      repairs: state.repairs.filter(r => r.vehicleId !== vehicleId),
      savingsGoals: state.savingsGoals.filter(s => s.vehicleId !== vehicleId),
      serviceRecords: state.serviceRecords.filter(s => s.vehicleId !== vehicleId),
      upgradeRecords: state.upgradeRecords.filter(u => u.vehicleId !== vehicleId),
      fuelRecords: state.fuelRecords.filter(f => f.vehicleId !== vehicleId),
      odometerRecords: state.odometerRecords.filter(o => o.vehicleId !== vehicleId),
      inspections: state.inspections.filter(i => i.vehicleId !== vehicleId),
      vehicleNotes: state.vehicleNotes.filter(n => n.vehicleId !== vehicleId),
      taxRecords: state.taxRecords.filter(t => t.vehicleId !== vehicleId),
    });
    onNavigate('vehicles');
  };

  const inputCls = 'w-full h-10 bg-zinc-950 border border-zinc-800 rounded-lg px-3 text-sm text-zinc-50 placeholder:text-zinc-600 outline-none focus:border-violet-500/50';
  const labelCls = 'block text-sm font-medium text-zinc-400 mb-2';

  const statusLabel = vehicle.status === 'owned' ? 'Owned' : 'Planned';
  const statusColor = vehicle.status === 'owned'
    ? 'bg-emerald-400/10 text-emerald-400'
    : 'bg-amber-400/10 text-amber-400';

  return (
    <div className="space-y-8">
      {/* Back */}
      <motion.div {...fadeUp}>
        <button
          onClick={() => onNavigate('vehicles')}
          className="inline-flex items-center gap-2 text-zinc-400 hover:text-zinc-200 text-sm transition-colors"
        >
          <ArrowLeft size={16} />
          Back to Vehicles
        </button>
      </motion.div>

      {/* Header Card */}
      <motion.div {...fadeUp} transition={{ duration: 0.35, delay: 0.03 }} className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden relative">
        <div className="absolute top-0 left-0 right-0 h-1" style={{ backgroundColor: vehicle.color || '#8b5cf6' }} />
        <div className="p-6 pt-7 flex items-start justify-between">
          <div>
            <h2 className="text-xl font-bold text-zinc-50">{vehicle.name}</h2>
            <p className="text-sm text-zinc-400 mt-0.5">
              {vehicle.brand} {vehicle.model}{vehicle.variant ? ` ${vehicle.variant}` : ''}
            </p>
            <span className={cn('inline-block mt-3 rounded-md px-2.5 py-1 text-xs font-medium', statusColor)}>
              {statusLabel}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={openEdit}
              className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg h-10 px-4 text-sm inline-flex items-center gap-2 transition-colors"
            >
              <Pencil size={14} />
              Edit
            </button>
            <button
              onClick={() => setShowDelete(true)}
              className="bg-zinc-800 hover:bg-red-500/20 text-red-400 rounded-lg h-10 px-4 text-sm inline-flex items-center gap-2 transition-colors"
            >
              <Trash2 size={14} />
              Delete
            </button>
          </div>
        </div>
      </motion.div>

      {/* Info Card */}
      <motion.div {...fadeUp} transition={{ duration: 0.35, delay: 0.06 }} className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-5">
          <div>
            <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">License Plate</p>
            <p className="text-sm text-zinc-50">{vehicle.licensePlate || '-'}</p>
          </div>
          <div>
            <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Fuel Type</p>
            <p className="text-sm text-zinc-50">{getFuelTypeLabel(vehicle.fuelType)}</p>
          </div>
          <div>
            <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Horsepower</p>
            <p className="text-sm text-zinc-50">{vehicle.horsePower ? `${vehicle.horsePower} HP` : '-'}</p>
          </div>
          <div>
            <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Purchase Price</p>
            <p className="text-sm text-zinc-50">{vehicle.purchasePrice ? formatCurrency(vehicle.purchasePrice) : '-'}</p>
          </div>
          <div>
            <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">First Registration</p>
            <p className="text-sm text-zinc-50">{vehicle.firstRegistration ? formatDate(vehicle.firstRegistration) : '-'}</p>
          </div>
          <div>
            <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Current Mileage</p>
            <p className="text-sm text-zinc-50">{vehicle.currentMileage ? `${formatNumber(vehicle.currentMileage)} km` : '-'}</p>
          </div>
          <div>
            <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Annual Mileage</p>
            <p className="text-sm text-zinc-50">{vehicle.annualMileage ? `${formatNumber(vehicle.annualMileage)} km` : '-'}</p>
          </div>
          <div>
            <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Consumption</p>
            <p className="text-sm text-zinc-50">{vehicle.avgConsumption ? `${vehicle.avgConsumption} l/100km` : '-'}</p>
          </div>
        </div>
      </motion.div>

      {/* Stats Row */}
      <motion.div {...fadeUp} transition={{ duration: 0.35, delay: 0.09 }} className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
        <div className="flex items-center divide-x divide-zinc-800">
          <div className="flex-1 text-center">
            <p className="text-2xl font-bold text-emerald-400">{formatCurrency(monthlyCost)}</p>
            <p className="text-xs text-zinc-500 uppercase tracking-wider mt-1">Monthly</p>
          </div>
          <div className="flex-1 text-center">
            <p className="text-2xl font-bold text-amber-400">{formatCurrency(yearlyCost)}</p>
            <p className="text-xs text-zinc-500 uppercase tracking-wider mt-1">Yearly</p>
          </div>
          <div className="flex-1 text-center">
            <p className="text-2xl font-bold text-red-400">{formatCurrency(repairTotal)}</p>
            <p className="text-xs text-zinc-500 uppercase tracking-wider mt-1">Repairs</p>
          </div>
        </div>
      </motion.div>

      {/* Tab Bar */}
      <motion.div {...fadeUp} transition={{ duration: 0.35, delay: 0.12 }}>
        <div className="flex border-b border-zinc-800 overflow-x-auto flex-nowrap scrollbar-hide" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
          {tabs.map(tab => {
            const TabIcon = tab.icon;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={cn(
                  'px-4 py-3 text-sm font-medium border-b-2 transition-colors -mb-px whitespace-nowrap inline-flex items-center gap-1.5 shrink-0',
                  activeTab === tab.key
                    ? 'border-violet-500 text-zinc-50'
                    : 'border-transparent text-zinc-500 hover:text-zinc-300',
                )}
              >
                <TabIcon size={14} />
                {tab.label}
              </button>
            );
          })}
        </div>
      </motion.div>

      {/* Tab Content */}
      <Suspense fallback={<div className="text-sm text-zinc-500">Loading...</div>}>
        {activeTab === 'costs' && (
          <CostsTab state={state} setState={setState} vehicleId={vehicleId} />
        )}
        {activeTab === 'services' && (
          <ServicesTab vehicleId={vehicleId} state={state} setState={setState} />
        )}
        {activeTab === 'upgrades' && (
          <UpgradesTab vehicleId={vehicleId} state={state} setState={setState} />
        )}
        {activeTab === 'repairs' && (
          <RepairsTab state={state} setState={setState} vehicleId={vehicleId} />
        )}
        {activeTab === 'fuel' && (
          <FuelTab vehicleId={vehicleId} state={state} setState={setState} />
        )}
        {activeTab === 'odometer' && (
          <OdometerTab vehicleId={vehicleId} state={state} setState={setState} />
        )}
        {activeTab === 'loans' && (
          <LoansTab state={state} setState={setState} vehicleId={vehicleId} />
        )}
        {activeTab === 'savings' && (
          <SavingsTab state={state} setState={setState} vehicleId={vehicleId} />
        )}
        {activeTab === 'inspections' && (
          <InspectionsTab vehicleId={vehicleId} state={state} setState={setState} />
        )}
        {activeTab === 'notes' && (
          <NotesTab vehicleId={vehicleId} state={state} setState={setState} />
        )}
        {activeTab === 'taxes' && (
          <TaxesTab vehicleId={vehicleId} state={state} setState={setState} />
        )}
        {activeTab === 'statistics' && (
          <StatisticsTab state={state} vehicleId={vehicleId} />
        )}
      </Suspense>

      {/* Edit Modal */}
      {editForm && (
        <Modal
          isOpen={showEdit}
          onClose={() => { setShowEdit(false); setEditForm(null); }}
          title="Edit Vehicle"
          size="3xl"
          footer={
            <>
              <button
                onClick={() => { setShowEdit(false); setEditForm(null); }}
                className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg h-10 px-4 text-sm transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleEditSubmit}
                disabled={!editForm.name.trim()}
                className="bg-violet-500 hover:bg-violet-400 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg h-10 px-5 text-sm font-medium transition-colors"
              >
                Save Changes
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
                      value={editForm.name}
                      onChange={e => handleEditChange('name', e.target.value)}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Color</label>
                    <div className="flex items-center gap-3">
                      <input
                        type="color"
                        value={editForm.color}
                        onChange={e => handleEditChange('color', e.target.value)}
                        className="w-10 h-10 rounded-lg border border-zinc-800 bg-zinc-950 cursor-pointer"
                      />
                      <input
                        className={inputCls}
                        value={editForm.color}
                        onChange={e => handleEditChange('color', e.target.value)}
                      />
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-5">
                  <div>
                    <label className={labelCls}>Brand</label>
                    <input
                      className={inputCls}
                      value={editForm.brand}
                      onChange={e => handleEditChange('brand', e.target.value)}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Model</label>
                    <input
                      className={inputCls}
                      value={editForm.model}
                      onChange={e => handleEditChange('model', e.target.value)}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Variant</label>
                    <input
                      className={inputCls}
                      value={editForm.variant}
                      onChange={e => handleEditChange('variant', e.target.value)}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-5">
                  <div>
                    <label className={labelCls}>Fuel Type</label>
                    <select
                      className={inputCls}
                      value={editForm.fuelType}
                      onChange={e => handleEditChange('fuelType', e.target.value)}
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
                      value={editForm.horsePower || ''}
                      onChange={e => handleEditChange('horsePower', Number(e.target.value))}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Purchase Price</label>
                    <input
                      type="number"
                      className={inputCls}
                      value={editForm.purchasePrice || ''}
                      onChange={e => handleEditChange('purchasePrice', Number(e.target.value))}
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
                      value={editForm.licensePlate}
                      onChange={e => handleEditChange('licensePlate', e.target.value)}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>HSN</label>
                    <input
                      className={inputCls}
                      value={editForm.hsn}
                      onChange={e => handleEditChange('hsn', e.target.value)}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>TSN</label>
                    <input
                      className={inputCls}
                      value={editForm.tsn}
                      onChange={e => handleEditChange('tsn', e.target.value)}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-5">
                  <div>
                    <label className={labelCls}>First Registration</label>
                    <input
                      type="date"
                      className={inputCls}
                      value={editForm.firstRegistration}
                      onChange={e => handleEditChange('firstRegistration', e.target.value)}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Purchase Date</label>
                    <input
                      type="date"
                      className={inputCls}
                      value={editForm.purchaseDate}
                      onChange={e => handleEditChange('purchaseDate', e.target.value)}
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
                      value={editForm.currentMileage || ''}
                      onChange={e => handleEditChange('currentMileage', Number(e.target.value))}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Annual Mileage (km)</label>
                    <input
                      type="number"
                      className={inputCls}
                      value={editForm.annualMileage || ''}
                      onChange={e => handleEditChange('annualMileage', Number(e.target.value))}
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
                      value={editForm.avgConsumption || ''}
                      onChange={e => handleEditChange('avgConsumption', Number(e.target.value))}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Fuel Price (EUR/l)</label>
                    <input
                      type="number"
                      step="0.01"
                      className={inputCls}
                      value={editForm.fuelPrice || ''}
                      onChange={e => handleEditChange('fuelPrice', Number(e.target.value))}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Status */}
            <div>
              <h3 className="text-sm font-semibold text-zinc-50 mb-4">Status & Links</h3>
              <div className="space-y-5">
                <div className="grid grid-cols-2 gap-5">
                  <div>
                    <label className={labelCls}>Status</label>
                    <select
                      className={inputCls}
                      value={editForm.status}
                      onChange={e => handleEditChange('status', e.target.value)}
                    >
                      <option value="owned">Owned</option>
                      <option value="planned">Planned</option>
                    </select>
                  </div>
                  <div>
                    <label className={labelCls}>Image URL</label>
                    <input
                      className={inputCls}
                      value={editForm.imageUrl}
                      onChange={e => handleEditChange('imageUrl', e.target.value)}
                    />
                  </div>
                </div>
                <div>
                  <label className={labelCls}>mobile.de Link</label>
                  <input
                    className={inputCls}
                    value={editForm.mobileDeLink}
                    onChange={e => handleEditChange('mobileDeLink', e.target.value)}
                  />
                </div>
                <div>
                  <label className={labelCls}>Notes</label>
                  <textarea
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2.5 text-sm text-zinc-50 placeholder:text-zinc-600 outline-none focus:border-violet-500/50 min-h-[80px] resize-y"
                    value={editForm.notes}
                    onChange={e => handleEditChange('notes', e.target.value)}
                  />
                </div>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={showDelete}
        onClose={() => setShowDelete(false)}
        title="Delete Vehicle"
        size="md"
        footer={
          <>
            <button
              onClick={() => setShowDelete(false)}
              className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg h-10 px-4 text-sm transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleDelete}
              className="bg-red-400 hover:bg-red-500 text-white rounded-lg h-10 px-5 text-sm font-medium transition-colors"
            >
              Delete Vehicle
            </button>
          </>
        }
      >
        <p className="text-sm text-zinc-300">
          Are you sure you want to delete <span className="font-semibold text-zinc-50">{vehicle.name}</span>?
          This will also remove all associated costs, loans, repairs, savings goals, services, upgrades, fuel records, odometer entries, inspections, notes, and tax records. This action cannot be undone.
        </p>
      </Modal>
    </div>
  );
}
