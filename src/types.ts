export type FuelType = 'diesel' | 'benzin' | 'elektro' | 'hybrid' | 'lpg';
export type VehicleStatus = 'owned' | 'planned';
export type CostFrequency = 'einmalig' | 'monatlich' | 'quartal' | 'halbjaehrlich' | 'jaehrlich';
export type CostCategory = 'steuer' | 'versicherung' | 'sprit' | 'pflege' | 'reparatur' | 'tuev' | 'finanzierung' | 'sparen' | 'sonstiges';
export type Page = 'dashboard' | 'vehicles' | 'vehicle-detail' | 'costs' | 'loans' | 'savings' | 'repairs' | 'reminders' | 'purchase-planner' | 'login' | 'register' | 'forgot-password' | 'reset-password' | 'settings' | 'wiki' | 'services' | 'fuel' | 'inspections' | 'taxes' | 'supplies' | 'equipment' | 'planner';

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
  tags?: string[];
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
  tags?: string[];
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
  tags?: string[];
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
  tags?: string[];
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

export interface Reminder {
  id: string;
  title: string;
  description: string;
  type: 'cost_due' | 'loan_payment' | 'inspection' | 'insurance' | 'savings_goal' | 'custom';
  entityType: string;
  entityId: string;
  remindAt: string;
  recurring: '' | 'daily' | 'weekly' | 'monthly' | 'yearly';
  emailNotify: boolean;
  sent: boolean;
  active: boolean;
  mileageThreshold?: number;
  currentMileageAtCreation?: number;
  createdAt: string;
}

export interface AppConfig {
  emailEnabled: boolean;
}

export type ServiceCategory = 'oil' | 'brakes' | 'filters' | 'tires' | 'fluids' | 'electrical' | 'body' | 'other';
export type TaskPriority = 'critical' | 'normal' | 'low';
export type TaskStage = 'planned' | 'doing' | 'testing' | 'done';
export type TaskCategory = 'service' | 'repair' | 'upgrade';
export type InspectionResult = 'pass' | 'fail' | 'na';

export interface ServiceRecord {
  id: string; vehicleId: string; date: string; description: string; mileage: number; cost: number; notes: string; tags: string[]; category: ServiceCategory; createdAt: string;
}
export interface UpgradeRecord {
  id: string; vehicleId: string; date: string; description: string; cost: number; mileage: number; notes: string; tags: string[]; createdAt: string;
}
export interface FuelRecord {
  id: string; vehicleId: string; date: string; mileage: number; fuelAmount: number; fuelCost: number; isPartialFill: boolean; isMissedEntry: boolean; fuelType: string; station: string; notes: string; tags: string[]; createdAt: string;
}
export interface OdometerRecord {
  id: string; vehicleId: string; date: string; mileage: number; notes: string; tags: string[]; createdAt: string;
}
export interface Supply {
  id: string; vehicleId: string | null; name: string; partNumber: string; description: string; quantity: number; unitCost: number; notes: string; tags: string[]; createdAt: string;
}
export interface Equipment {
  id: string; vehicleId: string | null; name: string; description: string; isEquipped: boolean; totalDistance: number; notes: string; createdAt: string;
}
export interface InspectionItem { name: string; result: InspectionResult; notes: string; }
export interface Inspection {
  id: string; vehicleId: string; date: string; title: string; items: InspectionItem[]; overallResult: string; mileage: number; cost: number; notes: string; createdAt: string;
}
export interface VehicleNote {
  id: string; vehicleId: string; title: string; content: string; isPinned: boolean; tags: string[]; createdAt: string;
}
export interface TaxRecord {
  id: string; vehicleId: string; date: string; description: string; cost: number; isRecurring: boolean; recurringInterval: string; dueDate: string; notes: string; tags: string[]; createdAt: string;
}
export interface PlannerTask {
  id: string; vehicleId: string | null; title: string; description: string; priority: TaskPriority; stage: TaskStage; category: TaskCategory; notes: string; createdAt: string;
}
export interface Attachment {
  id: string; recordType: string; recordId: string; fileName: string; filePath: string; mimeType: string; fileSize: number; uploadedAt: string;
}
export interface SearchResult {
  type: string; id: string; title: string; snippet: string; vehicleId?: string; date?: string;
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
  serviceRecords: ServiceRecord[];
  upgradeRecords: UpgradeRecord[];
  fuelRecords: FuelRecord[];
  odometerRecords: OdometerRecord[];
  supplies: Supply[];
  equipment: Equipment[];
  inspections: Inspection[];
  vehicleNotes: VehicleNote[];
  taxRecords: TaxRecord[];
  plannerTasks: PlannerTask[];
}
