import type { Cost, Repair, FuelType, VehicleStatus, CostCategory, CostFrequency } from '../../types';

export const inputClass =
  'w-full bg-dark-900 border border-dark-600 rounded-lg px-3 py-2 text-dark-100 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none transition-colors';

export const labelClass = 'block text-sm font-medium text-dark-300 mb-1';

export const fuelTypeOptions: { value: FuelType; label: string }[] = [
  { value: 'benzin', label: 'Gasoline' },
  { value: 'diesel', label: 'Diesel' },
  { value: 'elektro', label: 'Electric' },
  { value: 'hybrid', label: 'Hybrid' },
  { value: 'lpg', label: 'LPG' },
];

export const statusOptions: { value: VehicleStatus; label: string }[] = [
  { value: 'owned', label: 'Owned' },
  { value: 'planned', label: 'Planned' },
];

export const categoryOptions: { value: CostCategory; label: string }[] = [
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

export const frequencyOptions: { value: CostFrequency; label: string }[] = [
  { value: 'monatlich', label: 'Monthly' },
  { value: 'quartal', label: 'Quarterly' },
  { value: 'halbjaehrlich', label: 'Semi-annual' },
  { value: 'jaehrlich', label: 'Yearly' },
  { value: 'einmalig', label: 'One-time' },
];

export const emptyCost: Omit<Cost, 'id' | 'createdAt'> = {
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

export const emptyRepair: Omit<Repair, 'id' | 'createdAt'> = {
  vehicleId: '',
  date: '',
  description: '',
  category: '',
  notes: '',
  cost: 0,
  mileage: 0,
  workshop: '',
};
