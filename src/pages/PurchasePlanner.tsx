import { useState, useMemo } from 'react';
import {
  Car, ExternalLink, Star, Plus, Trash2, Edit, Calculator,
  ArrowRight, DollarSign, TrendingUp, BarChart3, ChevronDown, ChevronUp, Fuel
} from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import Modal from '../components/Modal';
import type { AppState, Page, PlannedPurchase, FuelType } from '../types';
import { formatCurrency, formatNumber, calculateFinancing, getFuelTypeLabel } from '../utils';

interface PurchasePlannerProps {
  state: AppState;
  setState: (state: AppState) => void;
  onNavigate: (page: Page, vehicleId?: string) => void;
}

const inputClass =
  'w-full bg-dark-900 border border-dark-600 rounded-lg px-3 py-2 text-dark-100 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none transition-colors';

const labelClass = 'block text-sm font-medium text-dark-300 mb-1';

const emptyPurchase: Omit<PlannedPurchase, 'id' | 'createdAt' | 'monthlyRate'> = {
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

// Fuel calculator helper
function calcMonthlyFuel(kmPerMonth: number, consumptionPer100: number, pricePerLiter: number): number {
  return (kmPerMonth / 100) * consumptionPer100 * pricePerLiter;
}

function StarRating({ rating, onChange, size = 20 }: { rating: number; onChange?: (r: number) => void; size?: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <button
          key={i}
          type="button"
          onClick={() => onChange?.(i)}
          className={`transition-colors ${onChange ? 'cursor-pointer hover:scale-110' : 'cursor-default'}`}
          disabled={!onChange}
        >
          <Star
            size={size}
            className={i <= rating ? 'text-amber-400 fill-amber-400' : 'text-dark-600'}
          />
        </button>
      ))}
    </div>
  );
}

export default function PurchasePlanner({ state, setState, onNavigate }: PurchasePlannerProps) {
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showCalc, setShowCalc] = useState(false);
  const [showComparison, setShowComparison] = useState(false);

  // Form state
  const [form, setForm] = useState(emptyPurchase);

  // Fuel calculator sub-state
  const [fuelCalcKm, setFuelCalcKm] = useState(1000);
  const [fuelCalcConsumption, setFuelCalcConsumption] = useState(7);
  const [fuelCalcPrice, setFuelCalcPrice] = useState(1.75);

  // Standalone financing calculator state
  const [calcPrice, setCalcPrice] = useState(25000);
  const [calcDown, setCalcDown] = useState(5000);
  const [calcMonths, setCalcMonths] = useState(48);
  const [calcRate, setCalcRate] = useState(3.9);

  const purchases = state.plannedPurchases;

  // ============= FORM HELPERS =============

  const updateForm = (patch: Partial<typeof form>) => setForm((f) => ({ ...f, ...patch }));

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

  // ============= DERIVED DATA =============

  const getFinancing = (p: PlannedPurchase) =>
    calculateFinancing(p.price, p.downPayment, p.financingMonths, p.interestRate);

  const getTotalMonthly = (p: PlannedPurchase) => {
    const fin = getFinancing(p);
    return fin.monthlyPayment + p.estimatedInsurance + p.estimatedFuelMonthly + p.estimatedMaintenance;
  };

  const getTotalYearly = (p: PlannedPurchase) => {
    return getTotalMonthly(p) * 12 + p.estimatedTax;
  };

  // Standalone calculator result
  const calcResult = useMemo(
    () => calculateFinancing(calcPrice, calcDown, calcMonths, calcRate),
    [calcPrice, calcDown, calcMonths, calcRate]
  );

  // Amortization data for chart
  const amortizationData = useMemo(() => {
    const loanAmount = calcPrice - calcDown;
    if (loanAmount <= 0 || calcMonths <= 0) return [];
    const r = calcRate / 100 / 12;
    let remaining = loanAmount;
    const data = [];
    for (let m = 1; m <= calcMonths; m++) {
      const interest = remaining * r;
      const principal = calcResult.monthlyPayment - interest;
      remaining = Math.max(0, remaining - principal);
      if (m % Math.max(1, Math.floor(calcMonths / 24)) === 0 || m === 1 || m === calcMonths) {
        data.push({
          month: m,
          remaining: Math.round(remaining),
          paid: Math.round(loanAmount - remaining),
          interest: Math.round(interest),
        });
      }
    }
    return data;
  }, [calcPrice, calcDown, calcMonths, calcRate, calcResult.monthlyPayment]);

  // Comparison helpers
  const comparisonRows = useMemo(() => {
    if (purchases.length < 2) return [];

    const rows: { label: string; values: number[]; format: (n: number) => string; lowerIsBetter: boolean }[] = [
      {
        label: 'Price',
        values: purchases.map((p) => p.price),
        format: formatCurrency,
        lowerIsBetter: true,
      },
      {
        label: 'Monthly Rate',
        values: purchases.map((p) => getFinancing(p).monthlyPayment),
        format: formatCurrency,
        lowerIsBetter: true,
      },
      {
        label: 'Total Finance Cost',
        values: purchases.map((p) => getFinancing(p).totalCost),
        format: formatCurrency,
        lowerIsBetter: true,
      },
      {
        label: 'Total Interest',
        values: purchases.map((p) => getFinancing(p).totalInterest),
        format: formatCurrency,
        lowerIsBetter: true,
      },
      {
        label: 'Insurance / mo',
        values: purchases.map((p) => p.estimatedInsurance),
        format: formatCurrency,
        lowerIsBetter: true,
      },
      {
        label: 'Tax / year',
        values: purchases.map((p) => p.estimatedTax),
        format: formatCurrency,
        lowerIsBetter: true,
      },
      {
        label: 'Fuel / mo',
        values: purchases.map((p) => p.estimatedFuelMonthly),
        format: formatCurrency,
        lowerIsBetter: true,
      },
      {
        label: 'Maintenance / mo',
        values: purchases.map((p) => p.estimatedMaintenance),
        format: formatCurrency,
        lowerIsBetter: true,
      },
      {
        label: 'Total Monthly Cost',
        values: purchases.map((p) => getTotalMonthly(p)),
        format: formatCurrency,
        lowerIsBetter: true,
      },
      {
        label: 'Total Yearly Cost',
        values: purchases.map((p) => getTotalYearly(p)),
        format: formatCurrency,
        lowerIsBetter: true,
      },
      {
        label: 'Mileage',
        values: purchases.map((p) => p.mileage),
        format: (n) => `${formatNumber(n)} km`,
        lowerIsBetter: true,
      },
      {
        label: 'Horse Power',
        values: purchases.map((p) => p.horsePower),
        format: (n) => `${n} HP`,
        lowerIsBetter: false,
      },
      {
        label: 'Year',
        values: purchases.map((p) => p.year),
        format: (n) => String(n),
        lowerIsBetter: false,
      },
      {
        label: 'Rating',
        values: purchases.map((p) => p.rating),
        format: (n) => `${n}/5`,
        lowerIsBetter: false,
      },
    ];

    return rows;
  }, [purchases]);

  const getCellColor = (row: typeof comparisonRows[0], value: number) => {
    const nonZero = row.values.filter((v) => v > 0);
    if (nonZero.length < 2) return '';
    const best = row.lowerIsBetter ? Math.min(...nonZero) : Math.max(...row.values);
    const worst = row.lowerIsBetter ? Math.max(...row.values) : Math.min(...nonZero);
    if (value === best) return 'text-emerald-400 font-semibold';
    if (value === worst && nonZero.length > 1) return 'text-red-400';
    return '';
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

      {/* ============= STANDALONE FINANCING CALCULATOR ============= */}
      {showCalc && (
        <div className="bg-dark-800 border border-dark-700 rounded-2xl p-6 space-y-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-amber-500/15">
              <Calculator size={22} className="text-amber-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-dark-50">Financing Calculator</h3>
              <p className="text-sm text-dark-400">Explore different financing scenarios</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {/* Price */}
            <div>
              <label className={labelClass}>Vehicle Price</label>
              <input
                type="number"
                className={inputClass}
                value={calcPrice || ''}
                onChange={(e) => setCalcPrice(Number(e.target.value))}
              />
            </div>
            {/* Down Payment */}
            <div>
              <label className={labelClass}>Down Payment</label>
              <input
                type="number"
                className={inputClass}
                value={calcDown || ''}
                onChange={(e) => setCalcDown(Number(e.target.value))}
              />
            </div>
            {/* Duration slider */}
            <div>
              <label className={labelClass}>Duration: {calcMonths} months</label>
              <input
                type="range"
                min={6}
                max={120}
                step={6}
                value={calcMonths}
                onChange={(e) => setCalcMonths(Number(e.target.value))}
                className="w-full accent-primary-500 mt-2"
              />
              <div className="flex justify-between text-xs text-dark-500 mt-1">
                <span>6 mo</span>
                <span>120 mo</span>
              </div>
            </div>
            {/* Interest slider */}
            <div>
              <label className={labelClass}>Interest Rate: {calcRate.toFixed(1)}%</label>
              <input
                type="range"
                min={0}
                max={15}
                step={0.1}
                value={calcRate}
                onChange={(e) => setCalcRate(Number(e.target.value))}
                className="w-full accent-primary-500 mt-2"
              />
              <div className="flex justify-between text-xs text-dark-500 mt-1">
                <span>0%</span>
                <span>15%</span>
              </div>
            </div>
          </div>

          {/* Results */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-dark-850 rounded-xl p-4 border border-dark-700">
              <p className="text-sm text-dark-400">Monthly Payment</p>
              <p className="text-2xl font-bold text-primary-400 mt-1">{formatCurrency(calcResult.monthlyPayment)}</p>
            </div>
            <div className="bg-dark-850 rounded-xl p-4 border border-dark-700">
              <p className="text-sm text-dark-400">Total Interest</p>
              <p className="text-2xl font-bold text-amber-400 mt-1">{formatCurrency(calcResult.totalInterest)}</p>
            </div>
            <div className="bg-dark-850 rounded-xl p-4 border border-dark-700">
              <p className="text-sm text-dark-400">Total Cost</p>
              <p className="text-2xl font-bold text-dark-100 mt-1">{formatCurrency(calcResult.totalCost)}</p>
            </div>
          </div>

          {/* Amortization Chart */}
          {amortizationData.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-dark-300 mb-3">Amortization Schedule</h4>
              <div className="h-64 bg-dark-850 rounded-xl p-4 border border-dark-700">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={amortizationData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis dataKey="month" stroke="#64748b" fontSize={12} label={{ value: 'Month', position: 'insideBottom', offset: -5, fill: '#64748b' }} />
                    <YAxis stroke="#64748b" fontSize={12} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
                      labelStyle={{ color: '#94a3b8' }}
                      formatter={(value, name) => [formatCurrency(Number(value)), String(name) === 'remaining' ? 'Remaining' : 'Paid Off']}
                      labelFormatter={(label) => `Month ${String(label)}`}
                    />
                    <Bar dataKey="paid" stackId="a" fill="#22c55e" radius={[0, 0, 0, 0]} name="Paid Off" />
                    <Bar dataKey="remaining" stackId="a" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Remaining" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ============= PURCHASE CARDS GRID ============= */}
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
          {purchases.map((p) => {
            const fin = getFinancing(p);
            const totalMonthly = getTotalMonthly(p);

            return (
              <div
                key={p.id}
                className="bg-dark-800 border border-dark-700 rounded-2xl overflow-hidden hover:border-dark-600 transition-colors group"
              >
                {/* Image */}
                <div className="relative h-48 bg-dark-850 overflow-hidden">
                  {p.imageUrl ? (
                    <img
                      src={p.imageUrl}
                      alt={`${p.brand} ${p.model}`}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Car size={64} className="text-dark-700" />
                    </div>
                  )}
                  {/* Rating overlay */}
                  <div className="absolute top-3 right-3 bg-dark-900/80 backdrop-blur-sm rounded-lg px-2.5 py-1.5">
                    <StarRating rating={p.rating} size={16} />
                  </div>
                  {/* Price overlay */}
                  <div className="absolute bottom-3 left-3 bg-dark-900/80 backdrop-blur-sm rounded-lg px-3 py-1.5">
                    <span className="text-lg font-bold text-primary-400">{formatCurrency(p.price)}</span>
                  </div>
                </div>

                {/* Content */}
                <div className="p-5 space-y-4">
                  {/* Title */}
                  <div>
                    <h3 className="text-lg font-bold text-dark-50">
                      {p.brand} {p.model}
                    </h3>
                    <div className="flex items-center gap-3 text-sm text-dark-400 mt-1">
                      {p.variant && <span>{p.variant}</span>}
                      <span>{p.year}</span>
                      <span>{formatNumber(p.mileage)} km</span>
                      <span>{p.horsePower} HP</span>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs px-2 py-0.5 rounded-full bg-dark-700 text-dark-300">
                        {getFuelTypeLabel(p.fuelType)}
                      </span>
                    </div>
                  </div>

                  {/* Financing Summary */}
                  <div className="bg-dark-850 rounded-xl p-3 space-y-2 border border-dark-700/50">
                    <div className="flex justify-between text-sm">
                      <span className="text-dark-400">Monthly Rate</span>
                      <span className="text-dark-100 font-medium">{formatCurrency(fin.monthlyPayment)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-dark-400">Total Interest</span>
                      <span className="text-amber-400 font-medium">{formatCurrency(fin.totalInterest)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-dark-400">Total Finance Cost</span>
                      <span className="text-dark-100 font-medium">{formatCurrency(fin.totalCost)}</span>
                    </div>
                    <div className="border-t border-dark-700 pt-2 flex justify-between text-sm">
                      <span className="text-dark-300 font-medium">Total Monthly Cost</span>
                      <span className="text-primary-400 font-bold text-base">{formatCurrency(totalMonthly)}</span>
                    </div>
                  </div>

                  {/* Running costs breakdown */}
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="bg-dark-850 rounded-lg px-2.5 py-2 border border-dark-700/50">
                      <span className="text-dark-500">Insurance</span>
                      <p className="text-dark-200 font-medium">{formatCurrency(p.estimatedInsurance)}/mo</p>
                    </div>
                    <div className="bg-dark-850 rounded-lg px-2.5 py-2 border border-dark-700/50">
                      <span className="text-dark-500">Tax</span>
                      <p className="text-dark-200 font-medium">{formatCurrency(p.estimatedTax)}/yr</p>
                    </div>
                    <div className="bg-dark-850 rounded-lg px-2.5 py-2 border border-dark-700/50">
                      <span className="text-dark-500">Fuel</span>
                      <p className="text-dark-200 font-medium">{formatCurrency(p.estimatedFuelMonthly)}/mo</p>
                    </div>
                    <div className="bg-dark-850 rounded-lg px-2.5 py-2 border border-dark-700/50">
                      <span className="text-dark-500">Maintenance</span>
                      <p className="text-dark-200 font-medium">{formatCurrency(p.estimatedMaintenance)}/mo</p>
                    </div>
                  </div>

                  {/* Pros & Cons */}
                  {(p.pros || p.cons) && (
                    <div className="space-y-2">
                      {p.pros && (
                        <div>
                          <p className="text-xs font-medium text-emerald-400 mb-1">Pros</p>
                          <ul className="text-xs text-dark-300 space-y-0.5">
                            {p.pros.split('\n').filter(Boolean).map((line, i) => (
                              <li key={i} className="flex items-start gap-1.5">
                                <span className="text-emerald-500 mt-0.5 shrink-0">+</span>
                                {line}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {p.cons && (
                        <div>
                          <p className="text-xs font-medium text-red-400 mb-1">Cons</p>
                          <ul className="text-xs text-dark-300 space-y-0.5">
                            {p.cons.split('\n').filter(Boolean).map((line, i) => (
                              <li key={i} className="flex items-start gap-1.5">
                                <span className="text-red-500 mt-0.5 shrink-0">-</span>
                                {line}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Action buttons */}
                  <div className="flex gap-2 pt-2 border-t border-dark-700">
                    {p.mobileDeLink && (
                      <a
                        href={p.mobileDeLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-dark-700 text-dark-300 hover:text-dark-100 hover:bg-dark-600 transition-colors text-xs font-medium"
                      >
                        <ExternalLink size={14} />
                        mobile.de
                      </a>
                    )}
                    <button
                      onClick={() => openEdit(p)}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-dark-700 text-dark-300 hover:text-dark-100 hover:bg-dark-600 transition-colors text-xs font-medium"
                    >
                      <Edit size={14} />
                      Edit
                    </button>
                    <button
                      onClick={() => handleConvertToVehicle(p)}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-primary-600/20 text-primary-400 hover:bg-primary-600/30 transition-colors text-xs font-medium"
                    >
                      <ArrowRight size={14} />
                      Convert to Vehicle
                    </button>
                    <button
                      onClick={() => handleDelete(p.id)}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-red-400 hover:bg-red-500/15 transition-colors text-xs font-medium ml-auto"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ============= COMPARISON TABLE ============= */}
      {purchases.length >= 2 && (
        <div className="bg-dark-800 border border-dark-700 rounded-2xl overflow-hidden">
          <button
            onClick={() => setShowComparison(!showComparison)}
            className="w-full flex items-center justify-between px-6 py-4 hover:bg-dark-750 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary-500/15">
                <BarChart3 size={22} className="text-primary-400" />
              </div>
              <div className="text-left">
                <h3 className="text-lg font-semibold text-dark-50">Side-by-Side Comparison</h3>
                <p className="text-sm text-dark-400">Compare {purchases.length} vehicles across all metrics</p>
              </div>
            </div>
            {showComparison ? <ChevronUp size={20} className="text-dark-400" /> : <ChevronDown size={20} className="text-dark-400" />}
          </button>

          {showComparison && (
            <div className="border-t border-dark-700 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-dark-700">
                    <th className="text-left px-4 py-3 text-dark-400 font-medium sticky left-0 bg-dark-800 z-10 min-w-[160px]">
                      Metric
                    </th>
                    {purchases.map((p) => (
                      <th key={p.id} className="text-center px-4 py-3 text-dark-200 font-semibold min-w-[150px]">
                        <div>{p.brand} {p.model}</div>
                        {p.variant && <div className="text-xs text-dark-500 font-normal">{p.variant}</div>}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {comparisonRows.map((row, ri) => (
                    <tr key={row.label} className={ri % 2 === 0 ? 'bg-dark-850/50' : ''}>
                      <td className="px-4 py-2.5 text-dark-300 font-medium sticky left-0 bg-dark-800 z-10">
                        {row.label}
                      </td>
                      {row.values.map((val, ci) => (
                        <td key={ci} className={`px-4 py-2.5 text-center ${getCellColor(row, val)}`}>
                          {row.format(val)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ============= ADD/EDIT MODAL ============= */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editingId ? 'Edit Planned Purchase' : 'Add Planned Purchase'}
        size="xl"
      >
        <div className="space-y-6 max-h-[70vh] overflow-y-auto pr-2">
          {/* Vehicle Info */}
          <div>
            <h4 className="text-sm font-semibold text-dark-200 uppercase tracking-wider mb-3 flex items-center gap-2">
              <Car size={16} className="text-primary-400" />
              Vehicle Information
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className={labelClass}>Brand *</label>
                <input className={inputClass} value={form.brand} onChange={(e) => updateForm({ brand: e.target.value })} placeholder="e.g. BMW" />
              </div>
              <div>
                <label className={labelClass}>Model *</label>
                <input className={inputClass} value={form.model} onChange={(e) => updateForm({ model: e.target.value })} placeholder="e.g. 320d" />
              </div>
              <div>
                <label className={labelClass}>Variant</label>
                <input className={inputClass} value={form.variant} onChange={(e) => updateForm({ variant: e.target.value })} placeholder="e.g. M Sport" />
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4">
              <div>
                <label className={labelClass}>Asking Price *</label>
                <input type="number" className={inputClass} value={form.price || ''} onChange={(e) => updateForm({ price: Number(e.target.value) })} />
              </div>
              <div>
                <label className={labelClass}>Year</label>
                <input type="number" className={inputClass} value={form.year || ''} onChange={(e) => updateForm({ year: Number(e.target.value) })} />
              </div>
              <div>
                <label className={labelClass}>Mileage (km)</label>
                <input type="number" className={inputClass} value={form.mileage || ''} onChange={(e) => updateForm({ mileage: Number(e.target.value) })} />
              </div>
              <div>
                <label className={labelClass}>Horse Power</label>
                <input type="number" className={inputClass} value={form.horsePower || ''} onChange={(e) => updateForm({ horsePower: Number(e.target.value) })} />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
              <div>
                <label className={labelClass}>Fuel Type</label>
                <select className={inputClass} value={form.fuelType} onChange={(e) => updateForm({ fuelType: e.target.value as FuelType })}>
                  <option value="benzin">Gasoline</option>
                  <option value="diesel">Diesel</option>
                  <option value="elektro">Electric</option>
                  <option value="hybrid">Hybrid</option>
                  <option value="lpg">LPG</option>
                </select>
              </div>
              <div>
                <label className={labelClass}>mobile.de Link</label>
                <input className={inputClass} value={form.mobileDeLink} onChange={(e) => updateForm({ mobileDeLink: e.target.value })} placeholder="https://..." />
              </div>
              <div>
                <label className={labelClass}>Image URL</label>
                <input className={inputClass} value={form.imageUrl} onChange={(e) => updateForm({ imageUrl: e.target.value })} placeholder="https://..." />
              </div>
            </div>
          </div>

          {/* Financing */}
          <div>
            <h4 className="text-sm font-semibold text-dark-200 uppercase tracking-wider mb-3 flex items-center gap-2">
              <DollarSign size={16} className="text-amber-400" />
              Financing
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className={labelClass}>Down Payment</label>
                <input type="number" className={inputClass} value={form.downPayment || ''} onChange={(e) => updateForm({ downPayment: Number(e.target.value) })} />
              </div>
              <div>
                <label className={labelClass}>Duration (months)</label>
                <input type="number" className={inputClass} value={form.financingMonths || ''} onChange={(e) => updateForm({ financingMonths: Number(e.target.value) })} />
              </div>
              <div>
                <label className={labelClass}>Interest Rate (%)</label>
                <input type="number" step="0.1" className={inputClass} value={form.interestRate || ''} onChange={(e) => updateForm({ interestRate: Number(e.target.value) })} />
              </div>
            </div>
            {/* Preview */}
            {form.price > 0 && form.financingMonths > 0 && (
              <div className="mt-3 bg-dark-850 rounded-xl p-3 border border-dark-700/50 grid grid-cols-3 gap-3 text-center">
                {(() => {
                  const preview = calculateFinancing(form.price, form.downPayment, form.financingMonths, form.interestRate);
                  return (
                    <>
                      <div>
                        <p className="text-xs text-dark-500">Monthly Rate</p>
                        <p className="text-sm font-bold text-primary-400">{formatCurrency(preview.monthlyPayment)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-dark-500">Total Interest</p>
                        <p className="text-sm font-bold text-amber-400">{formatCurrency(preview.totalInterest)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-dark-500">Total Cost</p>
                        <p className="text-sm font-bold text-dark-200">{formatCurrency(preview.totalCost)}</p>
                      </div>
                    </>
                  );
                })()}
              </div>
            )}
          </div>

          {/* Estimated Running Costs */}
          <div>
            <h4 className="text-sm font-semibold text-dark-200 uppercase tracking-wider mb-3 flex items-center gap-2">
              <TrendingUp size={16} className="text-emerald-400" />
              Estimated Running Costs
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div>
                <label className={labelClass}>Insurance / mo</label>
                <input type="number" className={inputClass} value={form.estimatedInsurance || ''} onChange={(e) => updateForm({ estimatedInsurance: Number(e.target.value) })} />
              </div>
              <div>
                <label className={labelClass}>Tax / year</label>
                <input type="number" className={inputClass} value={form.estimatedTax || ''} onChange={(e) => updateForm({ estimatedTax: Number(e.target.value) })} />
              </div>
              <div>
                <label className={labelClass}>Fuel / mo</label>
                <input type="number" className={inputClass} value={form.estimatedFuelMonthly || ''} onChange={(e) => updateForm({ estimatedFuelMonthly: Number(e.target.value) })} />
              </div>
              <div>
                <label className={labelClass}>Maintenance / mo</label>
                <input type="number" className={inputClass} value={form.estimatedMaintenance || ''} onChange={(e) => updateForm({ estimatedMaintenance: Number(e.target.value) })} />
              </div>
            </div>

            {/* Fuel Calculator */}
            <div className="mt-3 bg-dark-850 rounded-xl p-4 border border-dark-700/50">
              <div className="flex items-center gap-2 mb-3">
                <Fuel size={14} className="text-dark-400" />
                <p className="text-xs font-medium text-dark-400 uppercase tracking-wider">Fuel Cost Calculator</p>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs text-dark-500 mb-1">km / month</label>
                  <input type="number" className={inputClass} value={fuelCalcKm || ''} onChange={(e) => setFuelCalcKm(Number(e.target.value))} />
                </div>
                <div>
                  <label className="block text-xs text-dark-500 mb-1">L / 100km</label>
                  <input type="number" step="0.1" className={inputClass} value={fuelCalcConsumption || ''} onChange={(e) => setFuelCalcConsumption(Number(e.target.value))} />
                </div>
                <div>
                  <label className="block text-xs text-dark-500 mb-1">Price / L</label>
                  <input type="number" step="0.01" className={inputClass} value={fuelCalcPrice || ''} onChange={(e) => setFuelCalcPrice(Number(e.target.value))} />
                </div>
              </div>
              <div className="flex items-center justify-between mt-3">
                <p className="text-sm text-dark-300">
                  Estimated: <span className="font-bold text-primary-400">{formatCurrency(calcMonthlyFuel(fuelCalcKm, fuelCalcConsumption, fuelCalcPrice))}</span>/mo
                </p>
                <button
                  type="button"
                  onClick={() => updateForm({ estimatedFuelMonthly: Math.round(calcMonthlyFuel(fuelCalcKm, fuelCalcConsumption, fuelCalcPrice) * 100) / 100 })}
                  className="text-xs px-3 py-1.5 rounded-lg bg-primary-600/20 text-primary-400 hover:bg-primary-600/30 transition-colors font-medium"
                >
                  Apply
                </button>
              </div>
            </div>
          </div>

          {/* Pros, Cons, Rating, Notes */}
          <div>
            <h4 className="text-sm font-semibold text-dark-200 uppercase tracking-wider mb-3 flex items-center gap-2">
              <Star size={16} className="text-amber-400" />
              Evaluation
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Pros (one per line)</label>
                <textarea
                  rows={4}
                  className={inputClass + ' resize-none'}
                  value={form.pros}
                  onChange={(e) => updateForm({ pros: e.target.value })}
                  placeholder="Good fuel economy&#10;Low insurance&#10;Reliable engine"
                />
              </div>
              <div>
                <label className={labelClass}>Cons (one per line)</label>
                <textarea
                  rows={4}
                  className={inputClass + ' resize-none'}
                  value={form.cons}
                  onChange={(e) => updateForm({ cons: e.target.value })}
                  placeholder="High mileage&#10;Previous accident&#10;Expensive parts"
                />
              </div>
            </div>
            <div className="mt-4 flex items-center gap-6">
              <div>
                <label className={labelClass}>Rating</label>
                <StarRating rating={form.rating} onChange={(r) => updateForm({ rating: r })} size={24} />
              </div>
            </div>
            <div className="mt-4">
              <label className={labelClass}>Notes</label>
              <textarea
                rows={3}
                className={inputClass + ' resize-none'}
                value={form.notes}
                onChange={(e) => updateForm({ notes: e.target.value })}
                placeholder="Additional notes..."
              />
            </div>
          </div>

          {/* Buttons */}
          <div className="flex justify-end gap-3 pt-4 border-t border-dark-700">
            <button
              onClick={() => setShowModal(false)}
              className="px-5 py-2.5 rounded-xl bg-dark-700 text-dark-300 hover:bg-dark-600 hover:text-dark-100 transition-colors font-medium text-sm"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={!form.brand || !form.model || !form.price}
              className="px-5 py-2.5 rounded-xl bg-primary-600 hover:bg-primary-500 disabled:bg-dark-700 disabled:text-dark-500 text-white transition-colors font-medium text-sm shadow-lg shadow-primary-600/25 disabled:shadow-none"
            >
              {editingId ? 'Save Changes' : 'Add Purchase'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
