import { useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { ArrowLeft, Pencil, Trash2, ExternalLink, Fuel, Gauge, Calendar, Car, CreditCard, Wrench, PiggyBank, BarChart3, BadgeInfo, FileText } from 'lucide-react';
import Modal from '../components/Modal';
import VehicleCostsTab from '../components/vehicle/VehicleCostsTab';
import VehicleRepairsTab from '../components/vehicle/VehicleRepairsTab';
import VehicleLoansTab from '../components/vehicle/VehicleLoansTab';
import VehicleSavingsTab from '../components/vehicle/VehicleSavingsTab';
import VehicleStatsTab from '../components/vehicle/VehicleStatsTab';
import VehicleEditForm from '../components/vehicle/VehicleEditForm';
import { emptyCost, emptyRepair } from '../components/vehicle/constants';
import type { AppState, Vehicle, Cost, Repair, Page } from '../types';
import { formatCurrency, formatDate, formatNumber, getFuelTypeLabel, toMonthly, toYearly } from '../utils';

interface VehicleDetailProps {
  state: AppState;
  setState: (state: AppState) => void;
  vehicleId: string;
  onNavigate: (page: Page, vehicleId?: string) => void;
}

type TabId = 'costs' | 'repairs' | 'loans' | 'savings' | 'statistics';

const tabs: { id: TabId; label: string; icon: React.ReactNode }[] = [
  { id: 'costs', label: 'Costs', icon: <CreditCard size={16} /> },
  { id: 'repairs', label: 'Repairs', icon: <Wrench size={16} /> },
  { id: 'loans', label: 'Loans', icon: <FileText size={16} /> },
  { id: 'savings', label: 'Savings', icon: <PiggyBank size={16} /> },
  { id: 'statistics', label: 'Statistics', icon: <BarChart3 size={16} /> },
];

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
        <button onClick={() => onNavigate('vehicles')} className="mt-4 px-4 py-2 bg-dark-700 hover:bg-dark-600 rounded-lg transition-colors cursor-pointer">
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
  const fuelCostMonthly = vehicle.annualMileage > 0 ? (vehicle.avgConsumption / 100) * vehicle.fuelPrice * (vehicle.annualMileage / 12) : 0;

  const openEditModal = () => { const { id, createdAt, ...rest } = vehicle; setEditForm(rest); setShowEditModal(true); };
  const handleSaveVehicle = () => {
    if (!editForm || !editForm.name.trim()) return;
    setState({ ...state, vehicles: state.vehicles.map((v) => v.id === vehicleId ? { ...v, ...editForm } : v) });
    setShowEditModal(false);
    setEditForm(null);
  };
  const updateEditForm = <K extends keyof Omit<Vehicle, 'id' | 'createdAt'>>(key: K, value: Omit<Vehicle, 'id' | 'createdAt'>[K]) => {
    setEditForm((prev) => (prev ? { ...prev, [key]: value } : prev));
  };
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

  const openAddCost = () => { setCostForm({ ...emptyCost, vehicleId }); setEditingCostId(null); setShowCostModal(true); };
  const openEditCost = (cost: Cost) => { const { id, createdAt, ...rest } = cost; setCostForm(rest); setEditingCostId(id); setShowCostModal(true); };
  const handleSaveCost = () => {
    if (!costForm.name.trim()) return;
    if (editingCostId) {
      setState({ ...state, costs: state.costs.map((c) => c.id === editingCostId ? { ...c, ...costForm } : c) });
    } else {
      setState({ ...state, costs: [...state.costs, { ...costForm, vehicleId, id: uuidv4(), createdAt: new Date().toISOString() }] });
    }
    setShowCostModal(false);
    setEditingCostId(null);
  };
  const handleDeleteCost = (costId: string) => { setState({ ...state, costs: state.costs.filter((c) => c.id !== costId) }); };

  const openAddRepair = () => { setRepairForm({ ...emptyRepair, vehicleId }); setEditingRepairId(null); setShowRepairModal(true); };
  const openEditRepair = (repair: Repair) => { const { id, createdAt, ...rest } = repair; setRepairForm(rest); setEditingRepairId(id); setShowRepairModal(true); };
  const handleSaveRepair = () => {
    if (!repairForm.description.trim()) return;
    if (editingRepairId) {
      setState({ ...state, repairs: state.repairs.map((r) => r.id === editingRepairId ? { ...r, ...repairForm } : r) });
    } else {
      setState({ ...state, repairs: [...state.repairs, { ...repairForm, vehicleId, id: uuidv4(), createdAt: new Date().toISOString() }] });
    }
    setShowRepairModal(false);
    setEditingRepairId(null);
  };
  const handleDeleteRepair = (repairId: string) => { setState({ ...state, repairs: state.repairs.filter((r) => r.id !== repairId) }); };

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
      <button onClick={() => onNavigate('vehicles')} className="flex items-center gap-2 text-dark-400 hover:text-dark-100 transition-colors cursor-pointer">
        <ArrowLeft size={18} />
        <span className="text-sm font-medium">Back to Vehicles</span>
      </button>

      {/* Vehicle Header */}
      <div className="bg-dark-800 border border-dark-700 rounded-xl overflow-hidden">
        <div className="h-2" style={{ backgroundColor: vehicle.color || '#3b82f6' }} />
        <div className="p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full flex items-center justify-center text-white font-bold text-xl shrink-0 shadow-lg" style={{ backgroundColor: vehicle.color || '#3b82f6' }}>
                {vehicle.brand ? vehicle.brand.charAt(0).toUpperCase() : vehicle.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <h1 className="text-2xl font-bold text-dark-50">{vehicle.name}</h1>
                <p className="text-dark-400 mt-0.5">{[vehicle.brand, vehicle.model, vehicle.variant].filter(Boolean).join(' ')}</p>
                <div className="flex items-center gap-2 mt-2">
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${vehicle.status === 'owned' ? 'bg-success/20 text-success' : 'bg-warning/20 text-warning'}`}>
                    {vehicle.status === 'owned' ? 'Owned' : 'Planned'}
                  </span>
                  {vehicle.purchasePrice > 0 && <span className="text-sm text-dark-400">Purchase: {formatCurrency(vehicle.purchasePrice)}</span>}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {vehicle.mobileDeLink && (
                <a href={vehicle.mobileDeLink} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 px-3 py-2 bg-dark-700 hover:bg-dark-600 rounded-lg text-sm text-dark-300 hover:text-dark-100 transition-colors">
                  <ExternalLink size={14} /> mobile.de
                </a>
              )}
              <button onClick={openEditModal} className="flex items-center gap-1.5 px-3 py-2 bg-primary-600 hover:bg-primary-700 rounded-lg text-sm text-white transition-colors cursor-pointer">
                <Pencil size={14} /> Edit
              </button>
              <button onClick={() => setShowDeleteConfirm(true)} className="flex items-center gap-1.5 px-3 py-2 bg-danger/20 hover:bg-danger/30 rounded-lg text-sm text-danger transition-colors cursor-pointer">
                <Trash2 size={14} /> Delete
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
                activeTab === tab.id ? 'border-primary-500 text-primary-400' : 'border-transparent text-dark-400 hover:text-dark-200 hover:border-dark-600'
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
        {activeTab === 'costs' && (
          <VehicleCostsTab vehicleCosts={vehicleCosts} showCostModal={showCostModal} setShowCostModal={setShowCostModal}
            costForm={costForm} setCostForm={setCostForm} editingCostId={editingCostId} setEditingCostId={setEditingCostId}
            onAddCost={openAddCost} onEditCost={openEditCost} onSaveCost={handleSaveCost} onDeleteCost={handleDeleteCost} />
        )}
        {activeTab === 'repairs' && (
          <VehicleRepairsTab vehicleRepairs={vehicleRepairs} showRepairModal={showRepairModal} setShowRepairModal={setShowRepairModal}
            repairForm={repairForm} setRepairForm={setRepairForm} editingRepairId={editingRepairId} setEditingRepairId={setEditingRepairId}
            onAddRepair={openAddRepair} onEditRepair={openEditRepair} onSaveRepair={handleSaveRepair} onDeleteRepair={handleDeleteRepair} />
        )}
        {activeTab === 'loans' && <VehicleLoansTab vehicleLoans={vehicleLoans} onNavigate={onNavigate} />}
        {activeTab === 'savings' && (
          <VehicleSavingsTab vehicleSavings={vehicleSavings} savingsTransactions={state.savingsTransactions} onNavigate={onNavigate} />
        )}
        {activeTab === 'statistics' && <VehicleStatsTab vehicleCosts={vehicleCosts} vehicle={vehicle} />}
      </div>

      {/* Edit Vehicle Modal */}
      {editForm && (
        <Modal isOpen={showEditModal} onClose={() => { setShowEditModal(false); setEditForm(null); }} title="Edit Vehicle" size="3xl"
          footer={<>
            <button onClick={() => { setShowEditModal(false); setEditForm(null); }} className="px-4 py-2 rounded-lg text-dark-300 hover:text-dark-100 hover:bg-dark-700 transition-colors cursor-pointer">Cancel</button>
            <button onClick={handleSaveVehicle} disabled={!editForm.name.trim()} className="px-6 py-2 bg-primary-600 hover:bg-primary-700 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors cursor-pointer">Save Changes</button>
          </>}
        >
          <VehicleEditForm form={editForm} updateForm={updateEditForm} />
        </Modal>
      )}

      {/* Delete Confirmation Modal */}
      <Modal isOpen={showDeleteConfirm} onClose={() => setShowDeleteConfirm(false)} title="Delete Vehicle" size="sm"
        footer={<>
          <button onClick={() => setShowDeleteConfirm(false)} className="px-4 py-2 rounded-lg text-dark-300 hover:text-dark-100 hover:bg-dark-700 transition-colors cursor-pointer">Cancel</button>
          <button onClick={handleDelete} className="px-6 py-2 bg-danger hover:bg-red-600 text-white rounded-lg font-medium transition-colors cursor-pointer">Delete</button>
        </>}
      >
        <p className="text-dark-300">
          Are you sure you want to delete <span className="font-semibold text-dark-100">{vehicle.name}</span>?
          This will also remove all associated costs, repairs, loans, and savings goals. This action cannot be undone.
        </p>
      </Modal>
    </div>
  );
}
