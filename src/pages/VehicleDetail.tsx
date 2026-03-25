import { useState, useMemo } from 'react';
import { v4 as uuidv4 } from 'uuid';
import {
  ArrowLeft,
  Pencil,
  Trash2,
  Plus,
  ExternalLink,
  Fuel,
  Gauge,
  Calendar,
  Car,
  CreditCard,
  Wrench,
  PiggyBank,
  BarChart3,
  BadgeInfo,
  FileText,
} from 'lucide-react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import Modal from '../components/Modal';
import type {
  AppState,
  Vehicle,
  Cost,
  Repair,
  FuelType,
  VehicleStatus,
  CostCategory,
  CostFrequency,
  Page,
} from '../types';
import {
  formatCurrency,
  formatDate,
  formatNumber,
  getCategoryLabel,
  getCategoryColor,
  getFrequencyLabel,
  getFuelTypeLabel,
  toMonthly,
  toYearly,
  getLoanProgress,
  getSavingsBalance,
  getSavingsProgress,
  getCostsByCategory,
} from '../utils';

interface VehicleDetailProps {
  state: AppState;
  setState: (state: AppState) => void;
  vehicleId: string;
  onNavigate: (page: Page, vehicleId?: string) => void;
}

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

const categoryOptions: { value: CostCategory; label: string }[] = [
  { value: 'steuer', label: 'Tax' },
  { value: 'versicherung', label: 'Insurance' },
  { value: 'sprit', label: 'Fuel' },
  { value: 'pflege', label: 'Care & Cleaning' },
  { value: 'reparatur', label: 'Repair' },
  { value: 'tuev', label: 'Inspection (TUeV)' },
  { value: 'finanzierung', label: 'Financing' },
  { value: 'sparen', label: 'Savings' },
  { value: 'sonstiges', label: 'Other' },
];

const frequencyOptions: { value: CostFrequency; label: string }[] = [
  { value: 'monatlich', label: 'Monthly' },
  { value: 'quartal', label: 'Quarterly' },
  { value: 'halbjaehrlich', label: 'Semi-annual' },
  { value: 'jaehrlich', label: 'Yearly' },
  { value: 'einmalig', label: 'One-time' },
];

type TabId = 'costs' | 'repairs' | 'loans' | 'savings' | 'statistics';

const tabs: { id: TabId; label: string; icon: React.ReactNode }[] = [
  { id: 'costs', label: 'Costs', icon: <CreditCard size={16} /> },
  { id: 'repairs', label: 'Repairs', icon: <Wrench size={16} /> },
  { id: 'loans', label: 'Loans', icon: <FileText size={16} /> },
  { id: 'savings', label: 'Savings', icon: <PiggyBank size={16} /> },
  { id: 'statistics', label: 'Statistics', icon: <BarChart3 size={16} /> },
];

const emptyCost: Omit<Cost, 'id' | 'createdAt'> = {
  vehicleId: '',
  name: '',
  category: 'sonstiges',
  amount: 0,
  frequency: 'monatlich',
  paidBy: '',
  startDate: '',
  endDate: '',
  notes: '',
};

const emptyRepair: Omit<Repair, 'id' | 'createdAt'> = {
  vehicleId: '',
  date: '',
  description: '',
  category: '',
  notes: '',
  cost: 0,
  mileage: 0,
  workshop: '',
};

export default function VehicleDetail({ state, setState, vehicleId, onNavigate }: VehicleDetailProps) {
  const vehicle = state.vehicles.find((v) => v.id === vehicleId);
  const [activeTab, setActiveTab] = useState<TabId>('costs');
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showCostModal, setShowCostModal] = useState(false);
  const [showRepairModal, setShowRepairModal] = useState(false);
  const [editForm, setEditForm] = useState<Omit<Vehicle, 'id' | 'createdAt'> | null>(null);
  const [costForm, setCostForm] = useState(emptyCost);
  const [editingCostId, setEditingCostId] = useState<string | null>(null);
  const [repairForm, setRepairForm] = useState(emptyRepair);
  const [editingRepairId, setEditingRepairId] = useState<string | null>(null);

  if (!vehicle) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-dark-400">
        <Car size={56} className="mb-4 opacity-40" />
        <p className="text-lg font-medium mb-1">Vehicle not found</p>
        <button
          onClick={() => onNavigate('vehicles')}
          className="mt-4 px-4 py-2 bg-dark-700 hover:bg-dark-600 rounded-lg transition-colors cursor-pointer"
        >
          Back to Vehicles
        </button>
      </div>
    );
  }

  const vehicleCosts = state.costs.filter((c) => c.vehicleId === vehicleId);
  const vehicleRepairs = state.repairs.filter((r) => r.vehicleId === vehicleId);
  const vehicleLoans = state.loans.filter((l) => l.vehicleId === vehicleId);
  const vehicleSavings = state.savingsGoals.filter((s) => s.vehicleId === vehicleId);

  const totalMonthlyCost = vehicleCosts.reduce((sum, c) => sum + toMonthly(c.amount, c.frequency), 0);
  const totalYearlyCost = vehicleCosts.reduce((sum, c) => sum + toYearly(c.amount, c.frequency), 0);
  const totalRepairCost = vehicleRepairs.reduce((sum, r) => sum + r.cost, 0);

  // Edit vehicle
  const openEditModal = () => {
    const { id, createdAt, ...rest } = vehicle;
    setEditForm(rest);
    setShowEditModal(true);
  };

  const handleSaveVehicle = () => {
    if (!editForm || !editForm.name.trim()) return;
    setState({
      ...state,
      vehicles: state.vehicles.map((v) =>
        v.id === vehicleId ? { ...v, ...editForm } : v
      ),
    });
    setShowEditModal(false);
    setEditForm(null);
  };

  const updateEditForm = <K extends keyof Omit<Vehicle, 'id' | 'createdAt'>>(
    key: K,
    value: Omit<Vehicle, 'id' | 'createdAt'>[K]
  ) => {
    setEditForm((prev) => (prev ? { ...prev, [key]: value } : prev));
  };

  // Delete vehicle
  const handleDelete = () => {
    setState({
      ...state,
      vehicles: state.vehicles.filter((v) => v.id !== vehicleId),
      costs: state.costs.filter((c) => c.vehicleId !== vehicleId),
      repairs: state.repairs.filter((r) => r.vehicleId !== vehicleId),
      loans: state.loans.filter((l) => l.vehicleId !== vehicleId),
      savingsGoals: state.savingsGoals.filter((s) => s.vehicleId !== vehicleId),
    });
    onNavigate('vehicles');
  };

  // Cost CRUD
  const openAddCost = () => {
    setCostForm({ ...emptyCost, vehicleId });
    setEditingCostId(null);
    setShowCostModal(true);
  };

  const openEditCost = (cost: Cost) => {
    const { id, createdAt, ...rest } = cost;
    setCostForm(rest);
    setEditingCostId(id);
    setShowCostModal(true);
  };

  const handleSaveCost = () => {
    if (!costForm.name.trim()) return;
    if (editingCostId) {
      setState({
        ...state,
        costs: state.costs.map((c) =>
          c.id === editingCostId ? { ...c, ...costForm } : c
        ),
      });
    } else {
      const newCost: Cost = {
        ...costForm,
        vehicleId,
        id: uuidv4(),
        createdAt: new Date().toISOString(),
      };
      setState({ ...state, costs: [...state.costs, newCost] });
    }
    setShowCostModal(false);
    setEditingCostId(null);
  };

  const handleDeleteCost = (costId: string) => {
    setState({ ...state, costs: state.costs.filter((c) => c.id !== costId) });
  };

  // Repair CRUD
  const openAddRepair = () => {
    setRepairForm({ ...emptyRepair, vehicleId });
    setEditingRepairId(null);
    setShowRepairModal(true);
  };

  const openEditRepair = (repair: Repair) => {
    const { id, createdAt, ...rest } = repair;
    setRepairForm(rest);
    setEditingRepairId(id);
    setShowRepairModal(true);
  };

  const handleSaveRepair = () => {
    if (!repairForm.description.trim()) return;
    if (editingRepairId) {
      setState({
        ...state,
        repairs: state.repairs.map((r) =>
          r.id === editingRepairId ? { ...r, ...repairForm } : r
        ),
      });
    } else {
      const newRepair: Repair = {
        ...repairForm,
        vehicleId,
        id: uuidv4(),
        createdAt: new Date().toISOString(),
      };
      setState({ ...state, repairs: [...state.repairs, newRepair] });
    }
    setShowRepairModal(false);
    setEditingRepairId(null);
  };

  const handleDeleteRepair = (repairId: string) => {
    setState({ ...state, repairs: state.repairs.filter((r) => r.id !== repairId) });
  };

  // Statistics data
  const categoryData = useMemo(() => {
    const byCategory = getCostsByCategory(vehicleCosts);
    return Object.entries(byCategory)
      .map(([cat, amount]) => ({
        name: getCategoryLabel(cat),
        value: Math.round(amount * 100) / 100,
        color: getCategoryColor(cat),
      }))
      .filter((d) => d.value > 0)
      .sort((a, b) => b.value - a.value);
  }, [vehicleCosts]);

  const monthlyBarData = useMemo(() => {
    const data: { name: string; amount: number }[] = [];
    const byCategory = getCostsByCategory(vehicleCosts);
    for (const [cat, amount] of Object.entries(byCategory)) {
      if (amount > 0) {
        data.push({ name: getCategoryLabel(cat), amount: Math.round(amount * 100) / 100 });
      }
    }
    return data.sort((a, b) => b.amount - a.amount);
  }, [vehicleCosts]);

  const costPerKm = vehicle.annualMileage > 0 ? totalYearlyCost / vehicle.annualMileage : 0;
  const fuelCostMonthly =
    vehicle.annualMileage > 0
      ? (vehicle.avgConsumption / 100) * vehicle.fuelPrice * (vehicle.annualMileage / 12)
      : 0;

  const infoItems = [
    { label: 'First Registration', value: formatDate(vehicle.firstRegistration), icon: <Calendar size={16} /> },
    { label: 'Current Mileage', value: `${formatNumber(vehicle.currentMileage)} km`, icon: <Gauge size={16} /> },
    { label: 'Annual Mileage', value: `${formatNumber(vehicle.annualMileage)} km`, icon: <Gauge size={16} /> },
    { label: 'Fuel Type', value: getFuelTypeLabel(vehicle.fuelType), icon: <Fuel size={16} /> },
    { label: 'Consumption', value: `${vehicle.avgConsumption} L/100km`, icon: <Fuel size={16} /> },
    { label: 'Horse Power', value: `${vehicle.horsePower} PS`, icon: <Car size={16} /> },
    { label: 'License Plate', value: vehicle.licensePlate || '-', icon: <BadgeInfo size={16} /> },
    { label: 'HSN / TSN', value: [vehicle.hsn, vehicle.tsn].filter(Boolean).join(' / ') || '-', icon: <BadgeInfo size={16} /> },
  ];

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <button
        onClick={() => onNavigate('vehicles')}
        className="flex items-center gap-2 text-dark-400 hover:text-dark-100 transition-colors cursor-pointer"
      >
        <ArrowLeft size={18} />
        <span className="text-sm font-medium">Back to Vehicles</span>
      </button>

      {/* Vehicle Header */}
      <div className="bg-dark-800 border border-dark-700 rounded-xl overflow-hidden">
        <div className="h-2" style={{ backgroundColor: vehicle.color || '#3b82f6' }} />
        <div className="p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-4">
              <div
                className="w-14 h-14 rounded-full flex items-center justify-center text-white font-bold text-xl shrink-0 shadow-lg"
                style={{ backgroundColor: vehicle.color || '#3b82f6' }}
              >
                {vehicle.brand ? vehicle.brand.charAt(0).toUpperCase() : vehicle.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <h1 className="text-2xl font-bold text-dark-50">{vehicle.name}</h1>
                <p className="text-dark-400 mt-0.5">
                  {[vehicle.brand, vehicle.model, vehicle.variant].filter(Boolean).join(' ')}
                </p>
                <div className="flex items-center gap-2 mt-2">
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      vehicle.status === 'owned' ? 'bg-success/20 text-success' : 'bg-warning/20 text-warning'
                    }`}
                  >
                    {vehicle.status === 'owned' ? 'Owned' : 'Planned'}
                  </span>
                  {vehicle.purchasePrice > 0 && (
                    <span className="text-sm text-dark-400">
                      Purchase: {formatCurrency(vehicle.purchasePrice)}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {vehicle.mobileDeLink && (
                <a
                  href={vehicle.mobileDeLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-3 py-2 bg-dark-700 hover:bg-dark-600 rounded-lg text-sm text-dark-300 hover:text-dark-100 transition-colors"
                >
                  <ExternalLink size={14} />
                  mobile.de
                </a>
              )}
              <button
                onClick={openEditModal}
                className="flex items-center gap-1.5 px-3 py-2 bg-primary-600 hover:bg-primary-700 rounded-lg text-sm text-white transition-colors cursor-pointer"
              >
                <Pencil size={14} />
                Edit
              </button>
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="flex items-center gap-1.5 px-3 py-2 bg-danger/20 hover:bg-danger/30 rounded-lg text-sm text-danger transition-colors cursor-pointer"
              >
                <Trash2 size={14} />
                Delete
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Info Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {infoItems.map((item) => (
          <div key={item.label} className="bg-dark-800 border border-dark-700 rounded-xl p-4">
            <div className="flex items-center gap-2 text-dark-500 mb-1">
              {item.icon}
              <span className="text-xs font-medium uppercase tracking-wider">{item.label}</span>
            </div>
            <p className="text-dark-100 font-semibold">{item.value}</p>
          </div>
        ))}
      </div>

      {/* Cost Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-dark-800 border border-dark-700 rounded-xl p-5">
          <p className="text-sm text-dark-400 mb-1">Monthly Costs</p>
          <p className="text-2xl font-bold text-dark-50">{formatCurrency(totalMonthlyCost)}</p>
          <p className="text-xs text-dark-500 mt-1">+ ~{formatCurrency(fuelCostMonthly)} fuel</p>
        </div>
        <div className="bg-dark-800 border border-dark-700 rounded-xl p-5">
          <p className="text-sm text-dark-400 mb-1">Yearly Costs</p>
          <p className="text-2xl font-bold text-dark-50">{formatCurrency(totalYearlyCost)}</p>
          <p className="text-xs text-dark-500 mt-1">Total recurring per year</p>
        </div>
        <div className="bg-dark-800 border border-dark-700 rounded-xl p-5">
          <p className="text-sm text-dark-400 mb-1">Total Repairs</p>
          <p className="text-2xl font-bold text-dark-50">{formatCurrency(totalRepairCost)}</p>
          <p className="text-xs text-dark-500 mt-1">{vehicleRepairs.length} repair(s)</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-dark-700">
        <div className="flex gap-1 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap cursor-pointer ${
                activeTab === tab.id
                  ? 'border-primary-500 text-primary-400'
                  : 'border-transparent text-dark-400 hover:text-dark-200 hover:border-dark-600'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div>
        {/* COSTS TAB */}
        {activeTab === 'costs' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-dark-100">Recurring Costs</h2>
              <button
                onClick={openAddCost}
                className="flex items-center gap-1.5 px-3 py-2 bg-primary-600 hover:bg-primary-700 rounded-lg text-sm text-white transition-colors cursor-pointer"
              >
                <Plus size={14} />
                Add Cost
              </button>
            </div>

            {vehicleCosts.length === 0 ? (
              <div className="text-center py-12 text-dark-400">
                <CreditCard size={40} className="mx-auto mb-3 opacity-40" />
                <p>No costs tracked yet</p>
              </div>
            ) : (
              <div className="bg-dark-800 border border-dark-700 rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-dark-700">
                        <th className="text-left px-4 py-3 text-xs font-semibold text-dark-400 uppercase tracking-wider">Category</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-dark-400 uppercase tracking-wider">Name</th>
                        <th className="text-right px-4 py-3 text-xs font-semibold text-dark-400 uppercase tracking-wider">Amount</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-dark-400 uppercase tracking-wider">Frequency</th>
                        <th className="text-right px-4 py-3 text-xs font-semibold text-dark-400 uppercase tracking-wider">Monthly</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-dark-400 uppercase tracking-wider">Paid by</th>
                        <th className="text-right px-4 py-3 text-xs font-semibold text-dark-400 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {vehicleCosts.map((cost) => (
                        <tr key={cost.id} className="border-b border-dark-700/50 hover:bg-dark-750/50">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <div
                                className="w-3 h-3 rounded-full shrink-0"
                                style={{ backgroundColor: getCategoryColor(cost.category) }}
                              />
                              <span className="text-sm text-dark-200">{getCategoryLabel(cost.category)}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm text-dark-100 font-medium">{cost.name}</td>
                          <td className="px-4 py-3 text-sm text-dark-100 text-right font-medium">{formatCurrency(cost.amount)}</td>
                          <td className="px-4 py-3 text-sm text-dark-300">{getFrequencyLabel(cost.frequency)}</td>
                          <td className="px-4 py-3 text-sm text-dark-100 text-right">{formatCurrency(toMonthly(cost.amount, cost.frequency))}</td>
                          <td className="px-4 py-3 text-sm text-dark-300">{cost.paidBy || '-'}</td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => openEditCost(cost)}
                                className="p-1.5 rounded-lg text-dark-400 hover:text-primary-400 hover:bg-dark-700 transition-colors cursor-pointer"
                              >
                                <Pencil size={14} />
                              </button>
                              <button
                                onClick={() => handleDeleteCost(cost.id)}
                                className="p-1.5 rounded-lg text-dark-400 hover:text-danger hover:bg-dark-700 transition-colors cursor-pointer"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* REPAIRS TAB */}
        {activeTab === 'repairs' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-dark-100">Repair History</h2>
              <button
                onClick={openAddRepair}
                className="flex items-center gap-1.5 px-3 py-2 bg-primary-600 hover:bg-primary-700 rounded-lg text-sm text-white transition-colors cursor-pointer"
              >
                <Plus size={14} />
                Add Repair
              </button>
            </div>

            {vehicleRepairs.length === 0 ? (
              <div className="text-center py-12 text-dark-400">
                <Wrench size={40} className="mx-auto mb-3 opacity-40" />
                <p>No repairs recorded yet</p>
              </div>
            ) : (
              <div className="bg-dark-800 border border-dark-700 rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-dark-700">
                        <th className="text-left px-4 py-3 text-xs font-semibold text-dark-400 uppercase tracking-wider">Date</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-dark-400 uppercase tracking-wider">Description</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-dark-400 uppercase tracking-wider">Workshop</th>
                        <th className="text-right px-4 py-3 text-xs font-semibold text-dark-400 uppercase tracking-wider">Mileage</th>
                        <th className="text-right px-4 py-3 text-xs font-semibold text-dark-400 uppercase tracking-wider">Cost</th>
                        <th className="text-right px-4 py-3 text-xs font-semibold text-dark-400 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {vehicleRepairs
                        .sort((a, b) => (b.date || '').localeCompare(a.date || ''))
                        .map((repair) => (
                          <tr key={repair.id} className="border-b border-dark-700/50 hover:bg-dark-750/50">
                            <td className="px-4 py-3 text-sm text-dark-300">{formatDate(repair.date)}</td>
                            <td className="px-4 py-3 text-sm text-dark-100 font-medium">{repair.description}</td>
                            <td className="px-4 py-3 text-sm text-dark-300">{repair.workshop || '-'}</td>
                            <td className="px-4 py-3 text-sm text-dark-300 text-right">
                              {repair.mileage ? `${formatNumber(repair.mileage)} km` : '-'}
                            </td>
                            <td className="px-4 py-3 text-sm text-dark-100 text-right font-medium">{formatCurrency(repair.cost)}</td>
                            <td className="px-4 py-3 text-right">
                              <div className="flex items-center justify-end gap-1">
                                <button
                                  onClick={() => openEditRepair(repair)}
                                  className="p-1.5 rounded-lg text-dark-400 hover:text-primary-400 hover:bg-dark-700 transition-colors cursor-pointer"
                                >
                                  <Pencil size={14} />
                                </button>
                                <button
                                  onClick={() => handleDeleteRepair(repair.id)}
                                  className="p-1.5 rounded-lg text-dark-400 hover:text-danger hover:bg-dark-700 transition-colors cursor-pointer"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* LOANS TAB */}
        {activeTab === 'loans' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-dark-100">Loans & Financing</h2>
            </div>

            {vehicleLoans.length === 0 ? (
              <div className="text-center py-12 text-dark-400">
                <FileText size={40} className="mx-auto mb-3 opacity-40" />
                <p>No loans linked to this vehicle</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {vehicleLoans.map((loan) => {
                  const progress = getLoanProgress(loan);
                  return (
                    <div
                      key={loan.id}
                      className="bg-dark-800 border border-dark-700 rounded-xl p-5 hover:border-dark-500 transition-colors cursor-pointer"
                      onClick={() => onNavigate('loans')}
                    >
                      <h3 className="font-semibold text-dark-100 mb-3">{loan.name}</h3>
                      <div className="space-y-3">
                        <div className="flex justify-between text-sm">
                          <span className="text-dark-400">Total Amount</span>
                          <span className="text-dark-100 font-medium">{formatCurrency(loan.totalAmount)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-dark-400">Monthly Payment</span>
                          <span className="text-dark-100 font-medium">{formatCurrency(loan.monthlyPayment)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-dark-400">Interest Rate</span>
                          <span className="text-dark-100 font-medium">{loan.interestRate}%</span>
                        </div>
                        {/* Progress bar */}
                        <div>
                          <div className="flex justify-between text-xs text-dark-400 mb-1">
                            <span>{formatCurrency(progress.paid)} paid</span>
                            <span>{Math.round(progress.percent)}%</span>
                          </div>
                          <div className="w-full h-2 bg-dark-700 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-primary-500 rounded-full transition-all"
                              style={{ width: `${Math.min(100, progress.percent)}%` }}
                            />
                          </div>
                          <p className="text-xs text-dark-500 mt-1">
                            {formatCurrency(progress.remaining)} remaining
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* SAVINGS TAB */}
        {activeTab === 'savings' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-dark-100">Savings Goals</h2>
            </div>

            {vehicleSavings.length === 0 ? (
              <div className="text-center py-12 text-dark-400">
                <PiggyBank size={40} className="mx-auto mb-3 opacity-40" />
                <p>No savings goals for this vehicle</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {vehicleSavings.map((goal) => {
                  const txns = state.savingsTransactions.filter((t) => t.savingsGoalId === goal.id);
                  const balance = getSavingsBalance(goal, txns);
                  const progress = getSavingsProgress(goal, txns);
                  return (
                    <div
                      key={goal.id}
                      className="bg-dark-800 border border-dark-700 rounded-xl p-5 hover:border-dark-500 transition-colors cursor-pointer"
                      onClick={() => onNavigate('savings')}
                    >
                      <h3 className="font-semibold text-dark-100 mb-3">{goal.name}</h3>
                      <div className="space-y-3">
                        <div className="flex justify-between text-sm">
                          <span className="text-dark-400">Target</span>
                          <span className="text-dark-100 font-medium">{formatCurrency(goal.targetAmount)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-dark-400">Monthly Contribution</span>
                          <span className="text-dark-100 font-medium">{formatCurrency(goal.monthlyContribution)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-dark-400">Current Balance</span>
                          <span className="text-success font-medium">{formatCurrency(balance)}</span>
                        </div>
                        {/* Progress bar */}
                        <div>
                          <div className="flex justify-between text-xs text-dark-400 mb-1">
                            <span>{formatCurrency(balance)}</span>
                            <span>{Math.round(progress)}%</span>
                          </div>
                          <div className="w-full h-2 bg-dark-700 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-success rounded-full transition-all"
                              style={{ width: `${Math.min(100, progress)}%` }}
                            />
                          </div>
                          <p className="text-xs text-dark-500 mt-1">
                            {formatCurrency(Math.max(0, goal.targetAmount - balance))} remaining
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* STATISTICS TAB */}
        {activeTab === 'statistics' && (
          <div className="space-y-6">
            <h2 className="text-lg font-semibold text-dark-100">Vehicle Statistics</h2>

            {/* Key Metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-dark-800 border border-dark-700 rounded-xl p-5">
                <p className="text-sm text-dark-400 mb-1">Cost per km</p>
                <p className="text-2xl font-bold text-dark-50">
                  {costPerKm > 0 ? `${(costPerKm * 100).toFixed(1)} ct` : '-'}
                </p>
                <p className="text-xs text-dark-500 mt-1">Based on recurring costs</p>
              </div>
              <div className="bg-dark-800 border border-dark-700 rounded-xl p-5">
                <p className="text-sm text-dark-400 mb-1">Est. Fuel Cost / Month</p>
                <p className="text-2xl font-bold text-dark-50">{formatCurrency(fuelCostMonthly)}</p>
                <p className="text-xs text-dark-500 mt-1">
                  {vehicle.avgConsumption} L/100km at {formatCurrency(vehicle.fuelPrice)}/L
                </p>
              </div>
              <div className="bg-dark-800 border border-dark-700 rounded-xl p-5">
                <p className="text-sm text-dark-400 mb-1">Total incl. Fuel / Month</p>
                <p className="text-2xl font-bold text-primary-400">{formatCurrency(totalMonthlyCost + fuelCostMonthly)}</p>
                <p className="text-xs text-dark-500 mt-1">All recurring + estimated fuel</p>
              </div>
            </div>

            {vehicleCosts.length === 0 ? (
              <div className="text-center py-12 text-dark-400">
                <BarChart3 size={40} className="mx-auto mb-3 opacity-40" />
                <p>Add costs to see statistics</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Pie Chart */}
                <div className="bg-dark-800 border border-dark-700 rounded-xl p-5">
                  <h3 className="text-sm font-semibold text-dark-200 uppercase tracking-wider mb-4">Cost Breakdown (Monthly)</h3>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={categoryData}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          outerRadius={90}
                          innerRadius={50}
                          paddingAngle={2}
                          stroke="none"
                        >
                          {categoryData.map((entry, index) => (
                            <Cell key={index} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{
                            backgroundColor: '#1e293b',
                            border: '1px solid #334155',
                            borderRadius: '8px',
                            color: '#f1f5f9',
                          }}
                          formatter={(value) => formatCurrency(Number(value))}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  {/* Legend */}
                  <div className="flex flex-wrap gap-3 mt-2">
                    {categoryData.map((d) => (
                      <div key={d.name} className="flex items-center gap-1.5 text-xs text-dark-300">
                        <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: d.color }} />
                        <span>{d.name}</span>
                        <span className="text-dark-500">{formatCurrency(d.value)}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Bar Chart */}
                <div className="bg-dark-800 border border-dark-700 rounded-xl p-5">
                  <h3 className="text-sm font-semibold text-dark-200 uppercase tracking-wider mb-4">Monthly Costs by Category</h3>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={monthlyBarData} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" horizontal={false} />
                        <XAxis type="number" tickFormatter={(v) => `${v}`} stroke="#64748b" fontSize={12} />
                        <YAxis dataKey="name" type="category" width={100} stroke="#64748b" fontSize={12} />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: '#1e293b',
                            border: '1px solid #334155',
                            borderRadius: '8px',
                            color: '#f1f5f9',
                          }}
                          formatter={(value) => formatCurrency(Number(value))}
                        />
                        <Bar dataKey="amount" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Edit Vehicle Modal */}
      {editForm && (
        <Modal
          isOpen={showEditModal}
          onClose={() => {
            setShowEditModal(false);
            setEditForm(null);
          }}
          title="Edit Vehicle"
          size="3xl"
          footer={
            <>
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setEditForm(null);
                }}
                className="px-4 py-2 rounded-lg text-dark-300 hover:text-dark-100 hover:bg-dark-700 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveVehicle}
                disabled={!editForm.name.trim()}
                className="px-6 py-2 bg-primary-600 hover:bg-primary-700 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors cursor-pointer"
              >
                Save Changes
              </button>
            </>
          }
        >
          <VehicleEditForm form={editForm} updateForm={updateEditForm} />
        </Modal>
      )}

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        title="Delete Vehicle"
        size="sm"
        footer={
          <>
            <button
              onClick={() => setShowDeleteConfirm(false)}
              className="px-4 py-2 rounded-lg text-dark-300 hover:text-dark-100 hover:bg-dark-700 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={handleDelete}
              className="px-6 py-2 bg-danger hover:bg-red-600 text-white rounded-lg font-medium transition-colors cursor-pointer"
            >
              Delete
            </button>
          </>
        }
      >
        <p className="text-dark-300">
          Are you sure you want to delete <span className="font-semibold text-dark-100">{vehicle.name}</span>?
          This will also remove all associated costs, repairs, loans, and savings goals. This action cannot be undone.
        </p>
      </Modal>

      {/* Cost Modal */}
      <Modal
        isOpen={showCostModal}
        onClose={() => {
          setShowCostModal(false);
          setEditingCostId(null);
        }}
        title={editingCostId ? 'Edit Cost' : 'Add Cost'}
        size="xl"
        footer={
          <>
            <button
              onClick={() => {
                setShowCostModal(false);
                setEditingCostId(null);
              }}
              className="px-4 py-2 rounded-lg text-dark-300 hover:text-dark-100 hover:bg-dark-700 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveCost}
              disabled={!costForm.name.trim()}
              className="px-6 py-2 bg-primary-600 hover:bg-primary-700 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors cursor-pointer"
            >
              {editingCostId ? 'Save Changes' : 'Add Cost'}
            </button>
          </>
        }
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Name *</label>
            <input
              type="text"
              className={inputClass}
              placeholder="e.g. Car Insurance"
              value={costForm.name}
              onChange={(e) => setCostForm((f) => ({ ...f, name: e.target.value }))}
            />
          </div>
          <div>
            <label className={labelClass}>Category</label>
            <select
              className={inputClass}
              value={costForm.category}
              onChange={(e) => setCostForm((f) => ({ ...f, category: e.target.value as CostCategory }))}
            >
              {categoryOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass}>Amount (EUR)</label>
            <input
              type="number"
              step="0.01"
              className={inputClass}
              placeholder="0"
              value={costForm.amount || ''}
              onChange={(e) => setCostForm((f) => ({ ...f, amount: parseFloat(e.target.value) || 0 }))}
            />
          </div>
          <div>
            <label className={labelClass}>Frequency</label>
            <select
              className={inputClass}
              value={costForm.frequency}
              onChange={(e) => setCostForm((f) => ({ ...f, frequency: e.target.value as CostFrequency }))}
            >
              {frequencyOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass}>Paid By</label>
            <input
              type="text"
              className={inputClass}
              placeholder="Person name"
              value={costForm.paidBy}
              onChange={(e) => setCostForm((f) => ({ ...f, paidBy: e.target.value }))}
            />
          </div>
          <div>
            <label className={labelClass}>Start Date</label>
            <input
              type="date"
              className={inputClass}
              value={costForm.startDate}
              onChange={(e) => setCostForm((f) => ({ ...f, startDate: e.target.value }))}
            />
          </div>
          <div>
            <label className={labelClass}>End Date</label>
            <input
              type="date"
              className={inputClass}
              value={costForm.endDate}
              onChange={(e) => setCostForm((f) => ({ ...f, endDate: e.target.value }))}
            />
          </div>
          <div className="sm:col-span-2">
            <label className={labelClass}>Notes</label>
            <textarea
              className={`${inputClass} resize-none`}
              rows={2}
              placeholder="Any notes..."
              value={costForm.notes}
              onChange={(e) => setCostForm((f) => ({ ...f, notes: e.target.value }))}
            />
          </div>
        </div>
      </Modal>

      {/* Repair Modal */}
      <Modal
        isOpen={showRepairModal}
        onClose={() => {
          setShowRepairModal(false);
          setEditingRepairId(null);
        }}
        title={editingRepairId ? 'Edit Repair' : 'Add Repair'}
        size="xl"
        footer={
          <>
            <button
              onClick={() => {
                setShowRepairModal(false);
                setEditingRepairId(null);
              }}
              className="px-4 py-2 rounded-lg text-dark-300 hover:text-dark-100 hover:bg-dark-700 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveRepair}
              disabled={!repairForm.description.trim()}
              className="px-6 py-2 bg-primary-600 hover:bg-primary-700 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors cursor-pointer"
            >
              {editingRepairId ? 'Save Changes' : 'Add Repair'}
            </button>
          </>
        }
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className={labelClass}>Description *</label>
            <input
              type="text"
              className={inputClass}
              placeholder="e.g. Brake pad replacement"
              value={repairForm.description}
              onChange={(e) => setRepairForm((f) => ({ ...f, description: e.target.value }))}
            />
          </div>
          <div>
            <label className={labelClass}>Date</label>
            <input
              type="date"
              className={inputClass}
              value={repairForm.date}
              onChange={(e) => setRepairForm((f) => ({ ...f, date: e.target.value }))}
            />
          </div>
          <div>
            <label className={labelClass}>Cost (EUR)</label>
            <input
              type="number"
              step="0.01"
              className={inputClass}
              placeholder="0"
              value={repairForm.cost || ''}
              onChange={(e) => setRepairForm((f) => ({ ...f, cost: parseFloat(e.target.value) || 0 }))}
            />
          </div>
          <div>
            <label className={labelClass}>Mileage at Repair (km)</label>
            <input
              type="number"
              className={inputClass}
              placeholder="0"
              value={repairForm.mileage || ''}
              onChange={(e) => setRepairForm((f) => ({ ...f, mileage: parseFloat(e.target.value) || 0 }))}
            />
          </div>
          <div>
            <label className={labelClass}>Workshop</label>
            <input
              type="text"
              className={inputClass}
              placeholder="Workshop name"
              value={repairForm.workshop}
              onChange={(e) => setRepairForm((f) => ({ ...f, workshop: e.target.value }))}
            />
          </div>
          <div>
            <label className={labelClass}>Category</label>
            <input
              type="text"
              className={inputClass}
              placeholder="e.g. Brakes, Engine, etc."
              value={repairForm.category}
              onChange={(e) => setRepairForm((f) => ({ ...f, category: e.target.value }))}
            />
          </div>
          <div className="sm:col-span-2">
            <label className={labelClass}>Notes</label>
            <textarea
              className={`${inputClass} resize-none`}
              rows={2}
              placeholder="Any notes..."
              value={repairForm.notes}
              onChange={(e) => setRepairForm((f) => ({ ...f, notes: e.target.value }))}
            />
          </div>
        </div>
      </Modal>
    </div>
  );
}

/* Reusable Vehicle Edit Form (same fields as Add in Vehicles page) */
function VehicleEditForm({
  form,
  updateForm,
}: {
  form: Omit<Vehicle, 'id' | 'createdAt'>;
  updateForm: <K extends keyof Omit<Vehicle, 'id' | 'createdAt'>>(key: K, value: Omit<Vehicle, 'id' | 'createdAt'>[K]) => void;
}) {
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
