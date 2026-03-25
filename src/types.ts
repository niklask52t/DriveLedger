export type FuelType = 'diesel' | 'benzin' | 'elektro' | 'hybrid' | 'lpg';
export type VehicleStatus = 'owned' | 'planned';
export type CostFrequency = 'einmalig' | 'monatlich' | 'quartal' | 'halbjaehrlich' | 'jaehrlich';
export type CostCategory = 'steuer' | 'versicherung' | 'sprit' | 'pflege' | 'reparatur' | 'tuev' | 'finanzierung' | 'sparen' | 'sonstiges';
export type Page = 'dashboard' | 'vehicles' | 'vehicle-detail' | 'costs' | 'loans' | 'savings' | 'repairs' | 'purchase-planner' | 'login' | 'register' | 'forgot-password' | 'reset-password' | 'settings' | 'wiki';

export interface Vehicle {
  id: string;
  name: string;
  brand: string;
  model: string;
  variant: string;
  licensePlate: string;
  hsn: string;
  tsn: string;
  firstRegistration: string;
  purchasePrice: number;
  purchaseDate: string;
  currentMileage: number;
  annualMileage: number;
  fuelType: FuelType;
  avgConsumption: number;
  fuelPrice: number;
  horsePower: number;
  imageUrl: string;
  status: VehicleStatus;
  mobileDeLink: string;
  notes: string;
  color: string;
  createdAt: string;
}

export interface Cost {
  id: string;
  vehicleId: string;
  name: string;
  category: CostCategory;
  amount: number;
  frequency: CostFrequency;
  paidBy: string;
  startDate: string;
  endDate: string;
  notes: string;
  createdAt: string;
}

export interface Loan {
  id: string;
  vehicleId: string;
  name: string;
  totalAmount: number;
  monthlyPayment: number;
  interestRate: number;
  startDate: string;
  durationMonths: number;
  additionalSavingsPerMonth: number;
  notes: string;
  createdAt: string;
}

export interface Repair {
  id: string;
  vehicleId: string;
  date: string;
  description: string;
  category: string;
  notes: string;
  cost: number;
  mileage: number;
  workshop: string;
  createdAt: string;
}

export interface SavingsGoal {
  id: string;
  vehicleId: string;
  name: string;
  targetAmount: number;
  monthlyContribution: number;
  startDate: string;
  notes: string;
  createdAt: string;
}

export interface SavingsTransaction {
  id: string;
  savingsGoalId: string;
  date: string;
  amount: number;
  type: 'deposit' | 'withdrawal';
  description: string;
}

export interface PlannedPurchase {
  id: string;
  brand: string;
  model: string;
  variant: string;
  price: number;
  mobileDeLink: string;
  imageUrl: string;
  year: number;
  mileage: number;
  fuelType: FuelType;
  horsePower: number;
  // Finanzierung
  downPayment: number;
  financingMonths: number;
  interestRate: number;
  monthlyRate: number;
  // Geschätzte Kosten
  estimatedInsurance: number;
  estimatedTax: number;
  estimatedFuelMonthly: number;
  estimatedMaintenance: number;
  // Sonstiges
  notes: string;
  pros: string;
  cons: string;
  rating: number;
  createdAt: string;
}

export interface Person {
  id: string;
  name: string;
  color: string;
}

export interface User {
  id: string;
  email: string;
  username: string;
  isAdmin: boolean;
  emailVerified: boolean;
  createdAt: string;
}

export interface ApiToken {
  id: string;
  name: string;
  tokenPrefix: string;
  permissions: string[];
  active: boolean;
  lastUsed: string | null;
  createdAt: string;
}

export interface RegistrationToken {
  id: string;
  token: string;
  used: boolean;
  usedBy: string | null;
  createdAt: string;
  expiresAt: string;
}

export interface AppState {
  vehicles: Vehicle[];
  costs: Cost[];
  loans: Loan[];
  repairs: Repair[];
  savingsGoals: SavingsGoal[];
  savingsTransactions: SavingsTransaction[];
  plannedPurchases: PlannedPurchase[];
  persons: Person[];
}
