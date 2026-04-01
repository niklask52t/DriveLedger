export interface MapZone {
  name: string;
  tags: string[];
}

export interface VehicleMapData {
  imageUrl: string;
  zones: MapZone[];
}

export type FuelType = 'diesel' | 'benzin' | 'elektro' | 'hybrid' | 'lpg';
export type VehicleStatus = 'owned' | 'planned';
export type CostFrequency = 'einmalig' | 'monatlich' | 'quartal' | 'halbjaehrlich' | 'jaehrlich';
export type CostCategory = 'steuer' | 'versicherung' | 'sprit' | 'pflege' | 'reparatur' | 'tuev' | 'finanzierung' | 'sparen' | 'sonstiges';
export type Page = 'dashboard' | 'vehicles' | 'vehicle-detail' | 'costs' | 'loans' | 'savings' | 'repairs' | 'reminders' | 'purchase-planner' | 'login' | 'register' | 'forgot-password' | 'reset-password' | 'settings' | 'wiki' | 'services' | 'fuel' | 'inspections' | 'taxes' | 'supplies' | 'equipment' | 'planner' | 'kiosk';

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
  soldPrice?: number;
  soldDate?: string;
  isElectric?: boolean;
  mapData?: VehicleMapData | null;
  useHours?: boolean;
  odometerOptional?: boolean;
  dashboardMetrics?: string[];
  odometerMultiplier?: number;
  odometerDifference?: number;
  excludeFromKiosk?: boolean;
  estimatedInsurance?: number;
  estimatedTax?: number;
  estimatedMaintenance?: number;
  estimatedFinancing?: number;
  tags?: string[];
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
  tags?: string[];
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
  metric?: string;
  targetMileage?: number;
  mileageInterval?: number;
  vehicleId?: string;
  fixedInterval?: boolean;
  customThresholds?: {
    urgentDays?: number;
    veryUrgentDays?: number;
    urgentDistance?: number;
    veryUrgentDistance?: number;
  } | null;
  createdAt: string;
}

export interface AppConfig {
  emailEnabled: boolean;
  oidcEnabled?: boolean;
  oidcOnly?: boolean;
  oidcAutoRegister?: boolean;
  oidcProviderName?: string;
  customLogoUrl?: string;
  customMotd?: string;
  openRegistration?: boolean;
}

export type ServiceCategory = 'oil' | 'brakes' | 'filters' | 'tires' | 'fluids' | 'electrical' | 'body' | 'other';
export type TaskPriority = 'critical' | 'normal' | 'low';
export type TaskStage = 'planned' | 'doing' | 'testing' | 'done';
export type TaskCategory = 'service' | 'repair' | 'upgrade';
export type InspectionResultValue = 'pass' | 'fail' | 'na';
export type InspectionResult = InspectionResultValue;

export interface ServiceRecord {
  id: string; vehicleId: string; date: string; description: string; mileage: number; cost: number; notes: string; tags: string[]; category: ServiceCategory; createdAt: string;
}
export interface UpgradeRecord {
  id: string; vehicleId: string; date: string; description: string; cost: number; mileage: number; notes: string; tags: string[]; createdAt: string;
}
export interface FuelRecord {
  id: string; vehicleId: string; date: string; mileage: number; fuelAmount: number; fuelCost: number; isPartialFill: boolean; isMissedEntry: boolean; fuelType: string; station: string; notes: string; tags: string[]; fuelEconomy?: number | null; createdAt: string;
}
export interface OdometerRecord {
  id: string; vehicleId: string; date: string; mileage: number; initialMileage?: number; distanceTraveled?: number; equipmentIds?: string[]; notes: string; tags: string[]; createdAt: string;
}

export interface VehicleHistoryRecord {
  id: string;
  recordType: 'service' | 'repair' | 'upgrade' | 'fuel' | 'tax' | 'inspection' | 'odometer';
  description: string;
  cost: number;
  date: string;
  mileage: number;
}
export interface Supply {
  id: string; vehicleId: string | null; name: string; partNumber: string; description: string; quantity: number; unitCost: number; notes: string; tags: string[]; supplier?: string; availableQuantity?: number; createdAt: string;
}
export interface Equipment {
  id: string; vehicleId: string | null; name: string; description: string; isEquipped: boolean; totalDistance: number; notes: string; tags?: string[]; createdAt: string;
}
export interface InspectionItem { name: string; result: InspectionResult; notes: string; }
export interface Inspection {
  id: string; vehicleId: string; date: string; title: string; items: InspectionItem[]; overallResult: string; mileage: number; cost: number; notes: string; tags?: string[]; templateName?: string; results?: InspectionResultEntry[]; failed?: boolean; createdAt: string;
}
export interface VehicleNote {
  id: string; vehicleId: string; title: string; content: string; isPinned: boolean; pinned?: boolean; tags: string[]; createdAt: string;
}
export interface TaxRecord {
  id: string; vehicleId: string; date: string; description: string; cost: number; isRecurring: boolean; recurringInterval: string; recurringIntervalUnit?: string; dueDate: string; notes: string; tags: string[]; createdAt: string;
}
export interface PlannerTask {
  id: string; vehicleId: string | null; title: string; description: string; priority: TaskPriority; stage: TaskStage; category: TaskCategory; notes: string; tags?: string[]; targetType?: string; estimatedCost?: number; reminderRecordId?: string | null; updatedAt?: string | null; createdAt: string;
}
export interface Attachment {
  id: string; recordType: string; recordId: string; fileName: string; filePath: string; mimeType: string; fileSize: number; uploadedAt: string;
}
export interface SearchResult {
  type: string; id: string; title: string; snippet: string; vehicleId?: string; date?: string;
}

export interface ColumnPreference {
  visibleColumns: string[];
  columnOrder: string[];
}

export interface UserConfig {
  language: string;
  theme: string;
  useSystemTheme: boolean;
  unitSystem: string;
  fuelEconomyUnit: string;
  useUkMpg: boolean;
  preferredGasUnit: string;
  visibleTabs: string[];
  tabOrder: string[];
  defaultTab: string;
  enableCsvImports: boolean;
  enableMarkdownNotes: boolean;
  showCalendar: boolean;
  hideZeroCosts: boolean;
  currency: string;
  dateFormat: string;
  columnPreferences?: Record<string, ColumnPreference>;
  vehicleIdentifier?: string;
  showVehicleThumbnail?: boolean;
  autoDecimalFormat?: boolean;
  hideSoldVehicles?: boolean;
  threeDecimalFuel?: boolean;
  enableAutoFillOdometer?: boolean;
  useDescending?: boolean;
  enableAutoReminderRefresh?: boolean;
  showSearch?: boolean;
}

export type WidgetType = 'cost_summary' | 'fuel_economy' | 'upcoming_reminders' | 'recent_records' | 'vehicle_status' | 'custom_chart';

export interface DashboardWidget {
  id: string;
  name: string;
  widgetType: WidgetType;
  config: Record<string, any> | null;
  sortOrder: number;
  createdAt: string;
}

export interface Household {
  id: string;
  name: string;
  headUserId: string;
  createdAt: string;
}

export interface HouseholdMember {
  id: string;
  householdId: string;
  userId: string;
  email: string;
  username: string;
  permissions: string[];
  createdAt: string;
}

export interface ExtraFieldDefinition {
  id: string;
  recordType: string;
  fieldName: string;
  fieldType: string;
  isRequired: boolean;
  sortOrder: number;
  createdAt: string;
}

export interface SupplyRequisition {
  id: string;
  supplyId: string;
  recordType: string;
  recordId: string;
  quantity: number;
  cost: number;
  date: string;
  description: string;
}

export interface InspectionFieldOption {
  description: string;
  isFail: boolean;
}

export interface InspectionField {
  description: string;
  fieldType: 'radio' | 'check' | 'text';
  options: InspectionFieldOption[];
  hasActionItem?: boolean;
  actionItemType?: 'service' | 'repair' | 'upgrade';
  actionItemDescription?: string;
  actionItemPriority?: 'critical' | 'normal' | 'low';
}

export interface InspectionResultEntry {
  fieldDescription: string;
  fieldType: 'radio' | 'check' | 'text';
  value: string;
  selectedOptions: string[];
  passed: boolean;
  hasActionItem?: boolean;
  actionItemType?: 'service' | 'repair' | 'upgrade';
  actionItemDescription?: string;
  actionItemPriority?: 'critical' | 'normal' | 'low';
}

export interface InspectionTemplate {
  id: string;
  name: string;
  fields: InspectionField[];
  createdAt: string;
}

export interface PlanTemplate {
  id: string;
  name: string;
  description: string;
  targetType: string;
  priority: string;
  estimatedCost: number;
  supplyIds: string[] | null;
  createdAt: string;
}

export interface CustomWidgetCode {
  id: string;
  name: string;
  code: string;
  enabled: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
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
