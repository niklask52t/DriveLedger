import { useState } from 'react';
import { Car, Plus, Calculator } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import Modal from '../components/Modal';
import PurchaseCard from '../components/purchase/PurchaseCard';
import ComparisonTable from '../components/purchase/ComparisonTable';
import FinancingCalculator from '../components/purchase/FinancingCalculator';
import PurchaseForm from '../components/purchase/PurchaseForm';
import type { PurchaseFormData } from '../components/purchase/PurchaseForm';
import type { AppState, Page, PlannedPurchase } from '../types';
import { calculateFinancing } from '../utils';

interface PurchasePlannerProps {
  state: AppState;
  setState: (state: AppState) => void;
  onNavigate: (page: Page, vehicleId?: string) => void;
}

const emptyPurchase: PurchaseFormData = {
  brand: '',
  model: '',
  variant: '',
  price: 0,
  mobileDeLink: '',
  imageUrl: '',
  year: new Date().getFullYear(),
  mileage: 0,
  fuelType: 'benzin',
  horsePower: 0,
  downPayment: 0,
  financingMonths: 48,
  interestRate: 3.9,
  estimatedInsurance: 0,
  estimatedTax: 0,
  estimatedFuelMonthly: 0,
  estimatedMaintenance: 0,
  notes: '',
  pros: '',
  cons: '',
  rating: 3,
};

export default function PurchasePlanner({ state, setState, onNavigate }: PurchasePlannerProps) {
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showCalc, setShowCalc] = useState(false);
  const [form, setForm] = useState<PurchaseFormData>(emptyPurchase);

  const purchases = state.plannedPurchases;

  // ============= FORM HELPERS =============

  const openAdd = () => {
    setEditingId(null);
    setForm({ ...emptyPurchase });
    setShowModal(true);
  };

  const openEdit = (p: PlannedPurchase) => {
    setEditingId(p.id);
    const { id, createdAt, monthlyRate, ...rest } = p;
    setForm(rest);
    setShowModal(true);
  };

  const handleSave = () => {
    const fin = calculateFinancing(form.price, form.downPayment, form.financingMonths, form.interestRate);

    if (editingId) {
      setState({
        ...state,
        plannedPurchases: state.plannedPurchases.map((p) =>
          p.id === editingId
            ? { ...p, ...form, monthlyRate: fin.monthlyPayment }
            : p
        ),
      });
    } else {
      const newPurchase: PlannedPurchase = {
        ...form,
        id: uuidv4(),
        monthlyRate: fin.monthlyPayment,
        createdAt: new Date().toISOString(),
      };
      setState({
        ...state,
        plannedPurchases: [...state.plannedPurchases, newPurchase],
      });
    }
    setShowModal(false);
  };

  const handleDelete = (id: string) => {
    setState({
      ...state,
      plannedPurchases: state.plannedPurchases.filter((p) => p.id !== id),
    });
  };

  const handleConvertToVehicle = (p: PlannedPurchase) => {
    const vehicleId = uuidv4();
    setState({
      ...state,
      vehicles: [
        ...state.vehicles,
        {
          id: vehicleId,
          name: `${p.brand} ${p.model}`,
          brand: p.brand,
          model: p.model,
          variant: p.variant,
          licensePlate: '',
          hsn: '',
          tsn: '',
          firstRegistration: `${p.year}-01-01`,
          purchasePrice: p.price,
          purchaseDate: new Date().toISOString().slice(0, 10),
          currentMileage: p.mileage,
          annualMileage: 15000,
          fuelType: p.fuelType,
          avgConsumption: 0,
          fuelPrice: 0,
          horsePower: p.horsePower,
          imageUrl: p.imageUrl,
          status: 'owned',
          mobileDeLink: p.mobileDeLink,
          notes: p.notes,
          color: '#3b82f6',
          createdAt: new Date().toISOString(),
        },
      ],
      plannedPurchases: state.plannedPurchases.filter((x) => x.id !== p.id),
    });
    onNavigate('vehicle-detail', vehicleId);
  };

  // ============= RENDER =============

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-dark-50">Purchase Planner</h2>
          <p className="text-dark-400 mt-1">Compare and plan your next car purchase</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setShowCalc(!showCalc)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-dark-800 border border-dark-700 text-dark-200 hover:bg-dark-700 hover:text-dark-100 transition-colors font-medium text-sm"
          >
            <Calculator size={18} />
            Financing Calculator
          </button>
          <button
            onClick={openAdd}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary-600 hover:bg-primary-500 text-white transition-colors font-medium text-sm shadow-lg shadow-primary-600/25"
          >
            <Plus size={18} />
            Add Planned Purchase
          </button>
        </div>
      </div>

      {/* Standalone Financing Calculator */}
      {showCalc && <FinancingCalculator />}

      {/* Purchase Cards Grid */}
      {purchases.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-dark-800/50 border border-dark-700 rounded-2xl">
          <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-dark-700/50 mb-4">
            <Car size={32} className="text-dark-500" />
          </div>
          <h3 className="text-lg font-semibold text-dark-300 mb-1">No planned purchases yet</h3>
          <p className="text-dark-500 text-sm mb-6">Start comparing cars by adding your first planned purchase</p>
          <button
            onClick={openAdd}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary-600 hover:bg-primary-500 text-white transition-colors font-medium text-sm"
          >
            <Plus size={18} />
            Add Planned Purchase
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {purchases.map((p) => (
            <PurchaseCard
              key={p.id}
              purchase={p}
              onEdit={openEdit}
              onDelete={handleDelete}
              onConvert={handleConvertToVehicle}
            />
          ))}
        </div>
      )}

      {/* Comparison Table */}
      <ComparisonTable purchases={purchases} />

      {/* Add/Edit Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editingId ? 'Edit Planned Purchase' : 'Add Planned Purchase'}
        size="xl"
      >
        <PurchaseForm
          formData={form}
          setFormData={setForm}
          onSubmit={handleSave}
          onCancel={() => setShowModal(false)}
          isEdit={!!editingId}
        />
      </Modal>
    </div>
  );
}
