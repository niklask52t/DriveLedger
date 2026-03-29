import { useState, useMemo, useEffect, lazy, Suspense } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowLeft, Pencil, Trash2, DollarSign, Wrench, ArrowUpCircle,
  CreditCard, PiggyBank, BarChart3, Fuel, Gauge, ClipboardCheck, FileText, Receipt,
  TrendingDown, Map, QrCode, History, Bell,
} from 'lucide-react';
import Modal from '../components/Modal';
import { cn } from '../lib/utils';
import type { AppState, Page, Vehicle, FuelType, VehicleStatus, Reminder } from '../types';
import {
  formatCurrency, formatDate, formatNumber, getFuelTypeLabel,
  getTotalMonthlyCosts, getTotalYearlyCosts, getTotalRepairCosts, toMonthly,
} from '../utils';
import { useI18n } from '../contexts/I18nContext';
import { useUnits } from '../hooks/useUnits';
import { api } from '../api';

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
const MapTab = lazy(() => import('../components/vehicle/VehicleMapTab'));
const HistoryTab = lazy(() => import('../components/vehicle/VehicleHistoryTab'));
const QRCodeComponent = lazy(() => import('../components/QRCode'));

interface VehicleDetailProps {
  state: AppState;
  setState: (s: AppState) => void;
  vehicleId: string;
  onNavigate: (page: Page, vehicleId?: string) => void;
}

type Tab = 'costs' | 'services' | 'upgrades' | 'repairs' | 'fuel' | 'odometer' | 'loans' | 'savings' | 'inspections' | 'notes' | 'taxes' | 'statistics' | 'map' | 'history';

const tabDefs: { key: Tab; i18nKey: string; icon: React.ElementType }[] = [
  { key: 'costs', i18nKey: 'vehicle_detail.tab_costs', icon: DollarSign },
  { key: 'services', i18nKey: 'vehicle_detail.tab_services', icon: Wrench },
  { key: 'upgrades', i18nKey: 'vehicle_detail.tab_upgrades', icon: ArrowUpCircle },
  { key: 'repairs', i18nKey: 'vehicle_detail.tab_repairs', icon: Wrench },
  { key: 'fuel', i18nKey: 'vehicle_detail.tab_fuel', icon: Fuel },
  { key: 'odometer', i18nKey: 'vehicle_detail.tab_odometer', icon: Gauge },
  { key: 'loans', i18nKey: 'vehicle_detail.tab_loans', icon: CreditCard },
  { key: 'savings', i18nKey: 'vehicle_detail.tab_savings', icon: PiggyBank },
  { key: 'inspections', i18nKey: 'vehicle_detail.tab_inspections', icon: ClipboardCheck },
  { key: 'notes', i18nKey: 'vehicle_detail.tab_notes', icon: FileText },
  { key: 'taxes', i18nKey: 'vehicle_detail.tab_taxes', icon: Receipt },
  { key: 'statistics', i18nKey: 'vehicle_detail.tab_statistics', icon: BarChart3 },
  { key: 'map', i18nKey: 'vehicle_detail.tab_map', icon: Map },
  { key: 'history', i18nKey: 'vehicle_detail.tab_history', icon: History },
];

const fadeUp = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.35 },
};

export default function VehicleDetail({ state, setState, vehicleId, onNavigate }: VehicleDetailProps) {
  const { t } = useI18n();
  const { fmtDistance, fmtFuelEconomy, distanceUnit } = useUnits();
  const vehicle = state.vehicles.find(v => v.id === vehicleId);
  const [activeTab, setActiveTab] = useState<Tab>('costs');
  const [showEdit, setShowEdit] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [showQRCode, setShowQRCode] = useState(false);
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

  // Fetch reminders for urgent/past-due bell animation
  const [urgentReminders, setUrgentReminders] = useState<Reminder[]>([]);
  useEffect(() => {
    api.getReminders().then((all) => {
      const now = new Date();
      const vehicleUrgent = all.filter((r) => {
        if (!r.active || r.sent) return false;
        if (r.vehicleId !== vehicleId && r.entityId !== vehicleId) return false;
        if (!r.remindAt) return false;
        return new Date(r.remindAt) <= now;
      });
      setUrgentReminders(vehicleUrgent);
    }).catch(() => {});
  }, [vehicleId]);

  if (!vehicle) {
    return (
      <div className="space-y-8">
        <button
          onClick={() => onNavigate('vehicles')}
          className="inline-flex items-center gap-2 text-zinc-400 hover:text-zinc-200 text-sm transition-colors"
        >
          <ArrowLeft size={16} />
          {t('vehicle_detail.back_to_vehicles')}
        </button>
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-16 text-center">
          <p className="text-zinc-400">{t('vehicle_detail.not_found')}</p>
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

  const statusLabel = vehicle.status === 'owned' ? t('vehicles.owned') : t('vehicles.planned');
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
          {t('vehicle_detail.back_to_vehicles')}
        </button>
      </motion.div>

      {/* Header Card */}
      <motion.div {...fadeUp} transition={{ duration: 0.35, delay: 0.03 }} className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden relative">
        <div className="absolute top-0 left-0 right-0 h-1" style={{ backgroundColor: vehicle.color || '#8b5cf6' }} />
        <div className="p-6 pt-7 flex items-start justify-between">
          <div>
            <h2 className="text-xl font-bold text-zinc-50 flex items-center gap-2">
              {vehicle.name}
              {urgentReminders.length > 0 && (
                <span className="relative inline-flex items-center" title={`${urgentReminders.length} past-due reminder${urgentReminders.length > 1 ? 's' : ''}`}>
                  <Bell size={18} className="text-amber-400 animate-[bell-ring_1s_ease-in-out_infinite]" />
                  <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-red-500 rounded-full text-[9px] font-bold text-white flex items-center justify-center animate-pulse">
                    {urgentReminders.length}
                  </span>
                </span>
              )}
            </h2>
            <p className="text-sm text-zinc-400 mt-0.5">
              {vehicle.brand} {vehicle.model}{vehicle.variant ? ` ${vehicle.variant}` : ''}
            </p>
            <span className={cn('inline-block mt-3 rounded-md px-2.5 py-1 text-xs font-medium', statusColor)}>
              {statusLabel}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowQRCode(true)}
              className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg h-10 px-4 text-sm inline-flex items-center gap-2 transition-colors"
              title={t('qr_code.title')}
            >
              <QrCode size={14} />
              {t('qr_code.title')}
            </button>
            <button
              onClick={openEdit}
              className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg h-10 px-4 text-sm inline-flex items-center gap-2 transition-colors"
            >
              <Pencil size={14} />
              {t('common.edit')}
            </button>
            <button
              onClick={() => setShowDelete(true)}
              className="bg-zinc-800 hover:bg-red-500/20 text-red-400 rounded-lg h-10 px-4 text-sm inline-flex items-center gap-2 transition-colors"
            >
              <Trash2 size={14} />
              {t('common.delete')}
            </button>
          </div>
        </div>
      </motion.div>

      {/* Info Card */}
      <motion.div {...fadeUp} transition={{ duration: 0.35, delay: 0.06 }} className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-5">
          <div>
            <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">{t('vehicles.license_plate')}</p>
            <p className="text-sm text-zinc-50">{vehicle.licensePlate || '-'}</p>
          </div>
          <div>
            <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">{t('vehicles.fuel_type')}</p>
            <p className="text-sm text-zinc-50">{getFuelTypeLabel(vehicle.fuelType)}</p>
          </div>
          <div>
            <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">{t('vehicles.horsepower')}</p>
            <p className="text-sm text-zinc-50">{vehicle.horsePower ? `${vehicle.horsePower} HP` : '-'}</p>
          </div>
          <div>
            <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">{t('vehicles.purchase_price')}</p>
            <p className="text-sm text-zinc-50">{vehicle.purchasePrice ? formatCurrency(vehicle.purchasePrice) : '-'}</p>
          </div>
          <div>
            <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">{t('vehicles.first_registration')}</p>
            <p className="text-sm text-zinc-50">{vehicle.firstRegistration ? formatDate(vehicle.firstRegistration) : '-'}</p>
          </div>
          <div>
            <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">{t('common.mileage')}</p>
            <p className="text-sm text-zinc-50">{vehicle.currentMileage ? fmtDistance(vehicle.currentMileage) : '-'}</p>
          </div>
          {vehicle.status !== 'owned' && (
            <>
              <div>
                <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">{t('vehicles.annual_mileage')}</p>
                <p className="text-sm text-zinc-50">{vehicle.annualMileage ? fmtDistance(vehicle.annualMileage) : '-'}</p>
              </div>
              <div>
                <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">{t('vehicle_detail.consumption')}</p>
                <p className="text-sm text-zinc-50">{vehicle.avgConsumption ? fmtFuelEconomy(vehicle.avgConsumption) : '-'}</p>
              </div>
            </>
          )}
        </div>
      </motion.div>

      {/* Stats Row */}
      <motion.div {...fadeUp} transition={{ duration: 0.35, delay: 0.09 }} className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
        <div className="flex items-center divide-x divide-zinc-800">
          <div className="flex-1 text-center">
            <p className="text-2xl font-bold text-emerald-400">{formatCurrency(monthlyCost)}</p>
            <p className="text-xs text-zinc-500 uppercase tracking-wider mt-1">{t('common.monthly')}</p>
          </div>
          <div className="flex-1 text-center">
            <p className="text-2xl font-bold text-amber-400">{formatCurrency(yearlyCost)}</p>
            <p className="text-xs text-zinc-500 uppercase tracking-wider mt-1">{t('common.yearly')}</p>
          </div>
          <div className="flex-1 text-center">
            <p className="text-2xl font-bold text-red-400">{formatCurrency(repairTotal)}</p>
            <p className="text-xs text-zinc-500 uppercase tracking-wider mt-1">{t('nav.repairs')}</p>
          </div>
        </div>
      </motion.div>

      {/* Depreciation Card */}
      {vehicle.purchasePrice > 0 && vehicle.purchaseDate && (
        <motion.div {...fadeUp} transition={{ duration: 0.35, delay: 0.105 }} className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <TrendingDown size={16} className="text-violet-400" />
            <h3 className="text-sm font-semibold text-zinc-50">{t('depreciation.title')}</h3>
          </div>
          {(() => {
            const purchaseDate = new Date(vehicle.purchaseDate);
            const endDate = vehicle.soldDate ? new Date(vehicle.soldDate) : new Date();
            const daysOwned = Math.max(1, Math.floor((endDate.getTime() - purchaseDate.getTime()) / (1000 * 60 * 60 * 24)));
            const currentValue = vehicle.soldPrice || vehicle.purchasePrice * Math.max(0, 1 - (daysOwned / 365) * 0.15);
            const totalDepreciation = vehicle.purchasePrice - currentValue;
            const depPerDay = totalDepreciation / daysOwned;
            const kmDriven = vehicle.currentMileage > 0 ? vehicle.currentMileage : 0;
            const depPerKm = kmDriven > 0 ? totalDepreciation / kmDriven : null;
            const isAppreciation = totalDepreciation < 0;

            return (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-x-6 gap-y-4">
                <div>
                  <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">{t('depreciation.purchase_price')}</p>
                  <p className="text-sm font-medium text-zinc-50">{formatCurrency(vehicle.purchasePrice)}</p>
                  <p className="text-xs text-zinc-500">{formatDate(vehicle.purchaseDate)}</p>
                </div>
                <div>
                  <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">
                    {vehicle.soldPrice ? t('vehicle_detail.sold_price_label') : t('vehicle_detail.est_current_value')}
                  </p>
                  <p className="text-sm font-medium text-zinc-50">{formatCurrency(currentValue)}</p>
                  {vehicle.soldDate && <p className="text-xs text-zinc-500">{formatDate(vehicle.soldDate)}</p>}
                </div>
                <div>
                  <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">{t('vehicle_detail.days_owned')}</p>
                  <p className="text-sm font-medium text-zinc-50">{formatNumber(daysOwned)}</p>
                </div>
                <div>
                  <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">
                    {isAppreciation ? t('vehicle_detail.total_appreciation') : t('vehicle_detail.total_depreciation')}
                  </p>
                  <p className={`text-sm font-medium ${isAppreciation ? 'text-emerald-400' : 'text-red-400'}`}>
                    {isAppreciation ? '+' : '-'}{formatCurrency(Math.abs(totalDepreciation))}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">{t('depreciation.per_day')}</p>
                  <p className={`text-sm font-medium ${isAppreciation ? 'text-emerald-400' : 'text-red-400'}`}>
                    {isAppreciation ? '+' : '-'}{formatCurrency(Math.abs(depPerDay))}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">{t('depreciation.per_km')}</p>
                  <p className={`text-sm font-medium ${depPerKm !== null ? (isAppreciation ? 'text-emerald-400' : 'text-red-400') : 'text-zinc-50'}`}>
                    {depPerKm !== null ? `${isAppreciation ? '+' : '-'}${formatCurrency(Math.abs(depPerKm))}` : '-'}
                  </p>
                </div>
              </div>
            );
          })()}
        </motion.div>
      )}

      {/* Tab Bar */}
      <motion.div {...fadeUp} transition={{ duration: 0.35, delay: 0.12 }}>
        <div className="flex border-b border-zinc-800 overflow-x-auto flex-nowrap scrollbar-hide" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
          {tabDefs.map(tab => {
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
                {t(tab.i18nKey)}
              </button>
            );
          })}
        </div>
      </motion.div>

      {/* Tab Content */}
      <Suspense fallback={<div className="text-sm text-zinc-500">{t('common.loading')}</div>}>
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
        {activeTab === 'map' && (
          <MapTab vehicleId={vehicleId} state={state} setState={setState} />
        )}
        {activeTab === 'history' && (
          <HistoryTab vehicleId={vehicleId} />
        )}
      </Suspense>

      {/* Edit Modal */}
      {editForm && (
        <Modal
          isOpen={showEdit}
          onClose={() => { setShowEdit(false); setEditForm(null); }}
          title={t('vehicle_detail.edit_vehicle')}
          size="3xl"
          footer={
            <>
              <button
                onClick={() => { setShowEdit(false); setEditForm(null); }}
                className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg h-10 px-4 text-sm transition-colors"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={handleEditSubmit}
                disabled={!editForm.name.trim()}
                className="bg-violet-500 hover:bg-violet-400 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg h-10 px-5 text-sm font-medium transition-colors"
              >
                {t('common.save_changes')}
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
                      value={editForm.name}
                      onChange={e => handleEditChange('name', e.target.value)}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>{t('vehicles.color')}</label>
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
                    <label className={labelCls}>{t('vehicles.brand')}</label>
                    <input
                      className={inputCls}
                      value={editForm.brand}
                      onChange={e => handleEditChange('brand', e.target.value)}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>{t('vehicles.model')}</label>
                    <input
                      className={inputCls}
                      value={editForm.model}
                      onChange={e => handleEditChange('model', e.target.value)}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>{t('vehicles.variant')}</label>
                    <input
                      className={inputCls}
                      value={editForm.variant}
                      onChange={e => handleEditChange('variant', e.target.value)}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-5">
                  <div>
                    <label className={labelCls}>{t('vehicles.fuel_type')}</label>
                    <select
                      className={inputCls}
                      value={editForm.fuelType}
                      onChange={e => handleEditChange('fuelType', e.target.value)}
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
                      value={editForm.horsePower || ''}
                      onChange={e => handleEditChange('horsePower', Number(e.target.value))}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>{t('vehicles.purchase_price')}</label>
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
              <h3 className="text-sm font-semibold text-zinc-50 mb-4">{t('vehicles.registration')}</h3>
              <div className="space-y-5">
                <div className="grid grid-cols-3 gap-5">
                  <div>
                    <label className={labelCls}>{t('vehicles.license_plate')}</label>
                    <input
                      className={inputCls}
                      value={editForm.licensePlate}
                      onChange={e => handleEditChange('licensePlate', e.target.value)}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>{t('vehicles.hsn')}</label>
                    <input
                      className={inputCls}
                      value={editForm.hsn}
                      onChange={e => handleEditChange('hsn', e.target.value)}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>{t('vehicles.tsn')}</label>
                    <input
                      className={inputCls}
                      value={editForm.tsn}
                      onChange={e => handleEditChange('tsn', e.target.value)}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-5">
                  <div>
                    <label className={labelCls}>{t('vehicles.first_registration')}</label>
                    <input
                      type="date"
                      className={inputCls}
                      value={editForm.firstRegistration}
                      onChange={e => handleEditChange('firstRegistration', e.target.value)}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>{t('vehicles.purchase_date')}</label>
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
              <h3 className="text-sm font-semibold text-zinc-50 mb-4">{t('vehicles.mileage_consumption')}</h3>
              <div className="space-y-5">
                <div>
                  <label className={labelCls}>{t('vehicles.current_mileage')}</label>
                  <input
                    type="number"
                    className={inputCls}
                    value={editForm.currentMileage || ''}
                    onChange={e => handleEditChange('currentMileage', Number(e.target.value))}
                  />
                </div>
                {editForm.status !== 'owned' && (
                  <>
                    <div className="grid grid-cols-3 gap-5">
                      <div>
                        <label className={labelCls}>{t('vehicles.annual_mileage')}</label>
                        <input
                          type="number"
                          className={inputCls}
                          value={editForm.annualMileage || ''}
                          onChange={e => handleEditChange('annualMileage', Number(e.target.value))}
                        />
                      </div>
                      <div>
                        <label className={labelCls}>{t('vehicles.avg_consumption')}</label>
                        <input
                          type="number"
                          step="0.1"
                          className={inputCls}
                          value={editForm.avgConsumption || ''}
                          onChange={e => handleEditChange('avgConsumption', Number(e.target.value))}
                        />
                      </div>
                      <div>
                        <label className={labelCls}>{t('vehicles.fuel_price')}</label>
                        <input
                          type="number"
                          step="0.01"
                          className={inputCls}
                          value={editForm.fuelPrice || ''}
                          onChange={e => handleEditChange('fuelPrice', Number(e.target.value))}
                        />
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Estimated Costs (planned only) */}
            {editForm.status !== 'owned' && (
              <div>
                <h3 className="text-sm font-semibold text-zinc-50 mb-4">{t('vehicles.estimated_costs')}</h3>
                <div className="space-y-5">
                  <div className="grid grid-cols-2 gap-5">
                    <div>
                      <label className={labelCls}>{t('vehicles.est_insurance')}</label>
                      <input
                        type="number"
                        step="0.01"
                        className={inputCls}
                        value={editForm.estimatedInsurance || ''}
                        onChange={e => handleEditChange('estimatedInsurance', Number(e.target.value))}
                      />
                    </div>
                    <div>
                      <label className={labelCls}>{t('vehicles.est_tax')}</label>
                      <input
                        type="number"
                        step="0.01"
                        className={inputCls}
                        value={editForm.estimatedTax || ''}
                        onChange={e => handleEditChange('estimatedTax', Number(e.target.value))}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-5">
                    <div>
                      <label className={labelCls}>{t('vehicles.est_maintenance')}</label>
                      <input
                        type="number"
                        step="0.01"
                        className={inputCls}
                        value={editForm.estimatedMaintenance || ''}
                        onChange={e => handleEditChange('estimatedMaintenance', Number(e.target.value))}
                      />
                    </div>
                    <div>
                      <label className={labelCls}>{t('vehicles.est_financing')}</label>
                      <input
                        type="number"
                        step="0.01"
                        className={inputCls}
                        value={editForm.estimatedFinancing || ''}
                        onChange={e => handleEditChange('estimatedFinancing', Number(e.target.value))}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Sale / Depreciation */}
            <div>
              <h3 className="text-sm font-semibold text-zinc-50 mb-4">{t('vehicle_detail.sale_depreciation')}</h3>
              <div className="space-y-5">
                <div className="grid grid-cols-2 gap-5">
                  <div>
                    <label className={labelCls}>{t('vehicles.sold_price')}</label>
                    <input
                      type="number"
                      className={inputCls}
                      value={editForm.soldPrice || ''}
                      onChange={e => handleEditChange('soldPrice', Number(e.target.value))}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>{t('vehicles.sold_date')}</label>
                    <input
                      type="date"
                      className={inputCls}
                      value={editForm.soldDate || ''}
                      onChange={e => handleEditChange('soldDate', e.target.value)}
                    />
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      className="sr-only peer"
                      checked={!!editForm.isElectric}
                      onChange={e => handleEditChange('isElectric', e.target.checked ? 1 : 0)}
                    />
                    <div className="w-9 h-5 bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-violet-500"></div>
                  </label>
                  <span className="text-sm text-zinc-400">{t('vehicle_detail.is_electric')}</span>
                </div>
              </div>
            </div>

            {/* Status */}
            <div>
              <h3 className="text-sm font-semibold text-zinc-50 mb-4">{t('vehicles.status_links')}</h3>
              <div className="space-y-5">
                <div className="grid grid-cols-2 gap-5">
                  <div>
                    <label className={labelCls}>{t('vehicles.status')}</label>
                    <select
                      className={inputCls}
                      value={editForm.status}
                      onChange={e => handleEditChange('status', e.target.value)}
                    >
                      <option value="owned">{t('vehicles.owned')}</option>
                      <option value="planned">{t('vehicles.planned')}</option>
                    </select>
                  </div>
                  <div>
                    <label className={labelCls}>{t('vehicles.image_url')}</label>
                    <input
                      className={inputCls}
                      value={editForm.imageUrl}
                      onChange={e => handleEditChange('imageUrl', e.target.value)}
                    />
                  </div>
                </div>
                {editForm.status !== 'owned' && (
                  <div>
                    <label className={labelCls}>{t('vehicles.listing_link')}</label>
                    <input
                      className={inputCls}
                      value={editForm.mobileDeLink}
                      onChange={e => handleEditChange('mobileDeLink', e.target.value)}
                    />
                  </div>
                )}
                <div>
                  <label className={labelCls}>{t('common.notes')}</label>
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
        title={t('vehicle_detail.delete_vehicle')}
        size="md"
        footer={
          <>
            <button
              onClick={() => setShowDelete(false)}
              className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg h-10 px-4 text-sm transition-colors"
            >
              {t('common.cancel')}
            </button>
            <button
              onClick={handleDelete}
              className="bg-red-400 hover:bg-red-500 text-white rounded-lg h-10 px-5 text-sm font-medium transition-colors"
            >
              {t('vehicle_detail.delete_vehicle')}
            </button>
          </>
        }
      >
        <p className="text-sm text-zinc-300">
          {t('vehicle_detail.delete_confirm', { name: vehicle.name })}
        </p>
      </Modal>

      {/* QR Code Modal */}
      <Modal
        isOpen={showQRCode}
        onClose={() => setShowQRCode(false)}
        title={t('qr_code.vehicle_qr')}
        size="md"
      >
        <div className="flex justify-center py-4">
          <Suspense fallback={<div className="text-sm text-zinc-500">{t('common.loading')}</div>}>
            <QRCodeComponent
              data={`${window.location.origin}/#vehicle-detail/${vehicleId}`}
              size={250}
              label={vehicle.name}
            />
          </Suspense>
        </div>
      </Modal>
    </div>
  );
}
