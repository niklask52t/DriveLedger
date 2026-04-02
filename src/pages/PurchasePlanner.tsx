import { useState } from 'react';
import { Plus, Calculator, Trash2 } from 'lucide-react';
import { api } from '../api';
import { cn } from '../lib/utils';
import { formatCurrency } from '../utils';
import Modal from '../components/Modal';
import PurchaseCard from '../components/purchase/PurchaseCard';
import ComparisonTable from '../components/purchase/ComparisonTable';
import FinancingCalculator from '../components/purchase/FinancingCalculator';
import PurchaseForm from '../components/purchase/PurchaseForm';
import type { AppState, Page, PlannedPurchase } from '../types';
import { useI18n } from '../contexts/I18nContext';

interface Props {
  state: AppState;
  setState: (s: AppState) => void;
  onNavigate: (page: Page, vehicleId?: string) => void;
}

const emptyPurchase: Partial<PlannedPurchase> = {
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
  monthlyRate: 0,
  estimatedInsurance: 0,
  estimatedTax: 0,
  estimatedFuelMonthly: 0,
  estimatedMaintenance: 0,
  notes: '',
  pros: '',
  cons: '',
  rating: 3,
};

export default function PurchasePlanner({ state, setState, onNavigate }: Props) {
  const { t } = useI18n();
  const { plannedPurchases } = state;
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<Partial<PlannedPurchase>>(emptyPurchase);
  const [showCalculator, setShowCalculator] = useState(false);
  const [saving, setSaving] = useState(false);

  const openAdd = () => {
    setEditingId(null);
    setForm(emptyPurchase);
    setModalOpen(true);
  };

  const openEdit = (p: PlannedPurchase) => {
    setEditingId(p.id);
    setForm({ ...p });
    setModalOpen(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (editingId) {
        const updated = await api.updatePlannedPurchase(editingId, form);
        setState({
          ...state,
          plannedPurchases: plannedPurchases.map((p) => (p.id === editingId ? updated : p)),
        });
      } else {
        const created = await api.createPlannedPurchase(form);
        setState({
          ...state,
          plannedPurchases: [...plannedPurchases, created],
        });
      }
      setModalOpen(false);
    } catch {
      // ignore
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    await api.deletePlannedPurchase(id);
    setState({
      ...state,
      plannedPurchases: plannedPurchases.filter((p) => p.id !== id),
    });
  };

  const handleConvert = async (purchase: PlannedPurchase) => {
    try {
      const vehicle = await api.createVehicle({
        name: `${purchase.brand} ${purchase.model}`,
        brand: purchase.brand,
        model: purchase.model,
        variant: purchase.variant,
        purchasePrice: purchase.price,
        currentMileage: purchase.mileage,
        fuelType: purchase.fuelType,
        horsePower: purchase.horsePower,
        imageUrl: purchase.imageUrl,
        mobileDeLink: purchase.mobileDeLink,
        status: 'owned',
        notes: purchase.notes,
        purchaseDate: new Date().toISOString().slice(0, 10),
      });
      await api.deletePlannedPurchase(purchase.id);
      setState({
        ...state,
        vehicles: [...state.vehicles, vehicle],
        plannedPurchases: plannedPurchases.filter((p) => p.id !== purchase.id),
      });
      onNavigate('vehicle-detail', vehicle.id);
    } catch {
      // ignore
    }
  };

  const totalEstimated = plannedPurchases.reduce((sum, p) => sum + p.price, 0);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5">
        <div>
          <h1 className="text-2xl font-bold text-zinc-50">{t('purchase_planner.title')}</h1>
          <p className="text-sm text-zinc-500 mt-1">
            {t('purchase_planner.subtitle')}
            {plannedPurchases.length > 0 && (
              <span className="ml-2 text-zinc-400">
                &middot; {plannedPurchases.length} vehicle{plannedPurchases.length !== 1 ? 's' : ''} &middot; Total {formatCurrency(totalEstimated)}
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowCalculator(!showCalculator)}
            className={cn(
              'rounded-lg h-10 px-4 text-sm flex items-center gap-2',
              showCalculator
                ? 'bg-violet-500/15 text-violet-400 border border-violet-500/30'
                : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300'
            )}
          >
            <Calculator size={16} />
            {t('purchase_planner.calculator')}
          </button>
          <button
            onClick={openAdd}
            className="bg-violet-500 hover:bg-violet-400 text-white rounded-lg h-10 px-5 text-sm font-medium flex items-center gap-2"
          >
            <Plus size={16} />
            {t('purchase_planner.add')}
          </button>
        </div>
      </div>

      {/* Financing Calculator */}
      {showCalculator && (
        <FinancingCalculator />
      )}

      {/* Purchase Grid */}
      {plannedPurchases.length === 0 ? (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
          <div className="text-center py-12">
            <div className="w-12 h-12 rounded-full bg-zinc-800 flex items-center justify-center mx-auto mb-4">
              <Plus size={24} className="text-zinc-500" />
            </div>
            <p className="text-zinc-400 text-sm">{t('purchase_planner.no_purchases')}</p>
            <p className="text-zinc-600 text-xs mt-1">{t('purchase_planner.no_purchases_hint')}</p>
            <button
              onClick={openAdd}
              className="bg-violet-500 hover:bg-violet-400 text-white rounded-lg h-10 px-5 text-sm font-medium mt-5"
            >
              {t('purchase_planner.add_first')}
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {plannedPurchases.map((purchase) => (
            <PurchaseCard
              key={purchase.id}
              purchase={purchase}
              onEdit={() => openEdit(purchase)}
              onDelete={() => handleDelete(purchase.id)}
              onConvert={() => handleConvert(purchase)}
            />
          ))}
        </div>
      )}

      {/* Comparison Table */}
      {plannedPurchases.length >= 2 && (
        <ComparisonTable purchases={plannedPurchases} />
      )}

      {/* Add / Edit Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingId ? t('purchase_planner.edit_vehicle') : t('purchase_planner.add')}
        size="3xl"
        footer={
          <>
            {editingId && (
              <button
                onClick={() => {
                  handleDelete(editingId);
                  setModalOpen(false);
                }}
                className="mr-auto p-2 text-zinc-500 hover:text-red-400 hover:bg-zinc-800 rounded-lg transition-colors"
              >
                <Trash2 size={16} />
              </button>
            )}
            <button
              onClick={() => setModalOpen(false)}
              className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg h-10 px-4 text-sm"
            >
              {t('common.cancel')}
            </button>
            <button
              onClick={handleSave}
              disabled={saving || !form.brand || !form.model}
              className="bg-violet-500 hover:bg-violet-400 text-white rounded-lg h-10 px-5 text-sm font-medium disabled:opacity-50"
            >
              {saving ? t('common.saving') : editingId ? t('common.update') : t('common.create')}
            </button>
          </>
        }
      >
        <PurchaseForm formData={form} setFormData={setForm} onSubmit={handleSave} onCancel={() => setModalOpen(false)} isEdit={!!editingId} />
      </Modal>
    </div>
  );
}
