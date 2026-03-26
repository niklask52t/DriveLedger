import type { FuelType, VehicleStatus, CostCategory, CostFrequency, Cost, Repair } from '../../types';

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

export const costCategoryOptions: { value: CostCategory; label: string }[] = [
  { value: 'steuer', label: 'Tax' },
  { value: 'versicherung', label: 'Insurance' },
  { value: 'sprit', label: 'Fuel' },
  { value: 'pflege', label: 'Care & Cleaning' },
  { value: 'reparatur', label: 'Repair' },
  { value: 'tuev', label: 'Inspection (TUV)' },
  { value: 'finanzierung', label: 'Financing' },
  { value: 'sparen', label: 'Savings' },
  { value: 'sonstiges', label: 'Other' },
];

export const costFrequencyOptions: { value: CostFrequency; label: string }[] = [
  { value: 'einmalig', label: 'One-time' },
  { value: 'monatlich', label: 'Monthly' },
  { value: 'quartal', label: 'Quarterly' },
  { value: 'halbjaehrlich', label: 'Semi-annual' },
  { value: 'jaehrlich', label: 'Yearly' },
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
