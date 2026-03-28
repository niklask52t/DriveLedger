import type {
  Vehicle, Cost, Loan, Repair, SavingsGoal, SavingsTransaction,
  PlannedPurchase, Person, User, ApiToken, RegistrationToken,
  Reminder, AppConfig, ServiceRecord, UpgradeRecord, FuelRecord,
  OdometerRecord, Supply, Equipment, Inspection, VehicleNote,
  TaxRecord, PlannerTask, Attachment, SearchResult, TaskStage,
  UserConfig, InspectionTemplate, PlanTemplate, SupplyRequisition,
  ExtraFieldDefinition, DashboardWidget, Household, HouseholdMember,
  CustomWidgetCode,
} from './types';

const API_BASE = '/api';

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

class ApiClient {
  private accessToken: string | null = null;

  setToken(token: string | null) {
    this.accessToken = token;
  }

  getToken() {
    return this.accessToken;
  }

  private async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (this.accessToken) headers['Authorization'] = `Bearer ${this.accessToken}`;

    const res = await fetch(`${API_BASE}${path}`, {
      method,
      headers,
      credentials: 'include',
      body: body ? JSON.stringify(body) : undefined,
    });

    if (res.status === 401) {
      const refreshed = await this.refresh();
      if (refreshed) {
        headers['Authorization'] = `Bearer ${this.accessToken}`;
        const retry = await fetch(`${API_BASE}${path}`, {
          method,
          headers,
          credentials: 'include',
          body: body ? JSON.stringify(body) : undefined,
        });
        if (!retry.ok) {
          const text = await retry.text();
          let message = text;
          try { message = JSON.parse(text).error || text; } catch { /* ignore */ }
          throw new ApiError(retry.status, message);
        }
        const ct = retry.headers.get('content-type');
        if (ct?.includes('application/json')) return retry.json();
        return {} as T;
      }
      throw new ApiError(401, 'Unauthorized');
    }

    if (!res.ok) {
      const text = await res.text();
      let message = text;
      try { message = JSON.parse(text).error || text; } catch { /* ignore */ }
      throw new ApiError(res.status, message);
    }

    const contentType = res.headers.get('content-type');
    if (contentType?.includes('application/json')) return res.json();
    return {} as T;
  }

  // ─── Auth ──────────────────────────────────────────────

  async login(email: string, password: string): Promise<{ accessToken: string; user: User }> {
    const data = await this.request<{ accessToken: string; user: User }>('POST', '/auth/login', { email, password });
    this.accessToken = data.accessToken;
    return data;
  }

  async register(email: string, username: string, password: string, registrationToken: string): Promise<{ accessToken: string; user: User }> {
    const data = await this.request<{ accessToken: string; user: User }>('POST', '/auth/register', { email, username, password, registrationToken });
    this.accessToken = data.accessToken;
    return data;
  }

  async refresh(): Promise<boolean> {
    try {
      const res = await fetch(`${API_BASE}/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!res.ok) return false;
      const data = await res.json();
      this.accessToken = data.accessToken;
      return true;
    } catch {
      return false;
    }
  }

  async logout(): Promise<void> {
    try {
      await this.request<void>('POST', '/auth/logout');
    } finally {
      this.accessToken = null;
    }
  }

  async forgotPassword(email: string): Promise<void> {
    await this.request<void>('POST', '/auth/forgot-password', { email });
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    await this.request<void>('POST', '/auth/reset-password', { token, newPassword });
  }

  async getMe(): Promise<User> {
    const data = await this.request<{ user: User }>('GET', '/auth/me');
    return data.user;
  }

  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    await this.request<void>('POST', '/auth/change-password', { currentPassword, newPassword });
  }

  // ─── Config ──────────────────────────────────────────

  async getConfig(): Promise<AppConfig> {
    return this.request<AppConfig>('GET', '/config');
  }

  // ─── User Config ──────────────────────────────────────

  async getUserConfig(): Promise<UserConfig> {
    return this.request<UserConfig>('GET', '/user-config');
  }

  async updateUserConfig(data: Partial<UserConfig>): Promise<UserConfig> {
    return this.request<UserConfig>('PUT', '/user-config', data);
  }

  // ─── Email Verification ─────────────────────────────

  async verifyEmail(token: string): Promise<void> {
    await this.request<void>('POST', '/auth/verify-email', { token });
  }

  async resendVerification(): Promise<void> {
    await this.request<void>('POST', '/auth/resend-verification');
  }

  // ─── Vehicles ──────────────────────────────────────────

  async getVehicles(): Promise<Vehicle[]> {
    return this.request<Vehicle[]>('GET', '/vehicles');
  }

  async getVehicle(id: string): Promise<Vehicle> {
    return this.request<Vehicle>('GET', `/vehicles/${id}`);
  }

  async createVehicle(data: Partial<Vehicle>): Promise<Vehicle> {
    return this.request<Vehicle>('POST', '/vehicles', data);
  }

  async updateVehicle(id: string, data: Partial<Vehicle>): Promise<Vehicle> {
    return this.request<Vehicle>('PUT', `/vehicles/${id}`, data);
  }

  async deleteVehicle(id: string): Promise<void> {
    return this.request<void>('DELETE', `/vehicles/${id}`);
  }

  // ─── Costs ─────────────────────────────────────────────

  async getCosts(): Promise<Cost[]> {
    return this.request<Cost[]>('GET', '/costs');
  }

  async getCost(id: string): Promise<Cost> {
    return this.request<Cost>('GET', `/costs/${id}`);
  }

  async createCost(data: Partial<Cost>): Promise<Cost> {
    return this.request<Cost>('POST', '/costs', data);
  }

  async updateCost(id: string, data: Partial<Cost>): Promise<Cost> {
    return this.request<Cost>('PUT', `/costs/${id}`, data);
  }

  async deleteCost(id: string): Promise<void> {
    return this.request<void>('DELETE', `/costs/${id}`);
  }

  // ─── Loans ─────────────────────────────────────────────

  async getLoans(): Promise<Loan[]> {
    return this.request<Loan[]>('GET', '/loans');
  }

  async getLoan(id: string): Promise<Loan> {
    return this.request<Loan>('GET', `/loans/${id}`);
  }

  async createLoan(data: Partial<Loan>): Promise<Loan> {
    return this.request<Loan>('POST', '/loans', data);
  }

  async updateLoan(id: string, data: Partial<Loan>): Promise<Loan> {
    return this.request<Loan>('PUT', `/loans/${id}`, data);
  }

  async deleteLoan(id: string): Promise<void> {
    return this.request<void>('DELETE', `/loans/${id}`);
  }

  // ─── Repairs ───────────────────────────────────────────

  async getRepairs(): Promise<Repair[]> {
    return this.request<Repair[]>('GET', '/repairs');
  }

  async getRepair(id: string): Promise<Repair> {
    return this.request<Repair>('GET', `/repairs/${id}`);
  }

  async createRepair(data: Partial<Repair>): Promise<Repair> {
    return this.request<Repair>('POST', '/repairs', data);
  }

  async updateRepair(id: string, data: Partial<Repair>): Promise<Repair> {
    return this.request<Repair>('PUT', `/repairs/${id}`, data);
  }

  async deleteRepair(id: string): Promise<void> {
    return this.request<void>('DELETE', `/repairs/${id}`);
  }

  // ─── Savings Goals ────────────────────────────────────

  async getSavingsGoals(): Promise<SavingsGoal[]> {
    return this.request<SavingsGoal[]>('GET', '/savings/goals');
  }

  async getSavingsGoal(id: string): Promise<SavingsGoal> {
    return this.request<SavingsGoal>('GET', `/savings/goals/${id}`);
  }

  async createSavingsGoal(data: Partial<SavingsGoal>): Promise<SavingsGoal> {
    return this.request<SavingsGoal>('POST', '/savings/goals', data);
  }

  async updateSavingsGoal(id: string, data: Partial<SavingsGoal>): Promise<SavingsGoal> {
    return this.request<SavingsGoal>('PUT', `/savings/goals/${id}`, data);
  }

  async deleteSavingsGoal(id: string): Promise<void> {
    return this.request<void>('DELETE', `/savings/goals/${id}`);
  }

  // ─── Savings Transactions ─────────────────────────────

  async getSavingsTransactions(): Promise<SavingsTransaction[]> {
    // Fetch transactions across all goals
    const goals = await this.getSavingsGoals();
    const allTxns: SavingsTransaction[] = [];
    for (const goal of goals) {
      const txns = await this.request<SavingsTransaction[]>('GET', `/savings/goals/${goal.id}/transactions`);
      allTxns.push(...txns);
    }
    return allTxns;
  }

  async createSavingsTransaction(goalId: string, data: Partial<SavingsTransaction>): Promise<SavingsTransaction> {
    return this.request<SavingsTransaction>('POST', `/savings/goals/${goalId}/transactions`, data);
  }

  async deleteSavingsTransaction(id: string): Promise<void> {
    return this.request<void>('DELETE', `/savings/transactions/${id}`);
  }

  // ─── Planned Purchases ────────────────────────────────

  async getPlannedPurchases(): Promise<PlannedPurchase[]> {
    return this.request<PlannedPurchase[]>('GET', '/purchases');
  }

  async getPlannedPurchase(id: string): Promise<PlannedPurchase> {
    return this.request<PlannedPurchase>('GET', `/purchases/${id}`);
  }

  async createPlannedPurchase(data: Partial<PlannedPurchase>): Promise<PlannedPurchase> {
    return this.request<PlannedPurchase>('POST', '/purchases', data);
  }

  async updatePlannedPurchase(id: string, data: Partial<PlannedPurchase>): Promise<PlannedPurchase> {
    return this.request<PlannedPurchase>('PUT', `/purchases/${id}`, data);
  }

  async deletePlannedPurchase(id: string): Promise<void> {
    return this.request<void>('DELETE', `/purchases/${id}`);
  }

  // ─── Persons ───────────────────────────────────────────

  async getPersons(): Promise<Person[]> {
    return this.request<Person[]>('GET', '/persons');
  }

  async getPerson(id: string): Promise<Person> {
    return this.request<Person>('GET', `/persons/${id}`);
  }

  async createPerson(data: Partial<Person>): Promise<Person> {
    return this.request<Person>('POST', '/persons', data);
  }

  async updatePerson(id: string, data: Partial<Person>): Promise<Person> {
    return this.request<Person>('PUT', `/persons/${id}`, data);
  }

  async deletePerson(id: string): Promise<void> {
    return this.request<void>('DELETE', `/persons/${id}`);
  }

  // ─── API Tokens ────────────────────────────────────────

  async getApiTokens(): Promise<ApiToken[]> {
    return this.request<ApiToken[]>('GET', '/api-tokens');
  }

  async createApiToken(name: string, permissions: string[]): Promise<{ token: ApiToken; secret: string }> {
    return this.request<{ token: ApiToken; secret: string }>('POST', '/api-tokens', { name, permissions });
  }

  async toggleApiToken(id: string, active: boolean): Promise<ApiToken> {
    return this.request<ApiToken>('PATCH', `/api-tokens/${id}`, { active });
  }

  async deleteApiToken(id: string): Promise<void> {
    return this.request<void>('DELETE', `/api-tokens/${id}`);
  }

  // ─── Admin ─────────────────────────────────────────────

  async getUsers(): Promise<User[]> {
    return this.request<User[]>('GET', '/admin/users');
  }

  async deleteUser(id: string): Promise<void> {
    return this.request<void>('DELETE', `/admin/users/${id}`);
  }

  async generateRegistrationToken(): Promise<RegistrationToken> {
    return this.request<RegistrationToken>('POST', '/admin/registration-tokens');
  }

  async getRegistrationTokens(): Promise<RegistrationToken[]> {
    return this.request<RegistrationToken[]>('GET', '/admin/registration-tokens');
  }

  async adminResetPassword(userId: string): Promise<{ token: string }> {
    return this.request<{ token: string }>('POST', `/admin/users/${userId}/reset-password`);
  }

  // ─── Reminders ───────────────────────────────────────

  async getReminders(): Promise<Reminder[]> {
    return this.request<Reminder[]>('GET', '/reminders');
  }

  async getDueReminders(): Promise<Reminder[]> {
    return this.request<Reminder[]>('GET', '/reminders/due');
  }

  async createReminder(data: Partial<Reminder>): Promise<Reminder> {
    return this.request<Reminder>('POST', '/reminders', data);
  }

  async updateReminder(id: string, data: Partial<Reminder>): Promise<Reminder> {
    return this.request<Reminder>('PUT', `/reminders/${id}`, data);
  }

  async deleteReminder(id: string): Promise<void> {
    return this.request<void>('DELETE', `/reminders/${id}`);
  }

  async snoozeReminder(id: string, newDate: string): Promise<Reminder> {
    return this.request<Reminder>('POST', `/reminders/${id}/snooze`, { remind_at: newDate });
  }

  async completeReminder(id: string): Promise<Reminder> {
    return this.request<Reminder>('POST', `/reminders/${id}/complete`);
  }

  // ─── Data Management ──────────────────────────────────

  async exportData(): Promise<Record<string, unknown>> {
    return this.request<Record<string, unknown>>('GET', '/data/export');
  }

  async importData(data: Record<string, unknown>): Promise<void> {
    return this.request<void>('POST', '/data/import', data);
  }

  async importFromLubeLogger(data: any): Promise<{ message: string; imported: Record<string, number> }> {
    return this.request('POST', '/import/lubelogger', data);
  }

  async deleteAccount(): Promise<void> {
    return this.request<void>('DELETE', '/auth/account');
  }

  // ─── Services ─────────────────────────────────────────

  async getServices(): Promise<ServiceRecord[]> {
    return this.request<ServiceRecord[]>('GET', '/services');
  }

  async createService(data: Partial<ServiceRecord>): Promise<ServiceRecord> {
    return this.request<ServiceRecord>('POST', '/services', data);
  }

  async updateService(id: string, data: Partial<ServiceRecord>): Promise<ServiceRecord> {
    return this.request<ServiceRecord>('PUT', `/services/${id}`, data);
  }

  async deleteService(id: string): Promise<void> {
    return this.request<void>('DELETE', `/services/${id}`);
  }

  // ─── Upgrades ─────────────────────────────────────────

  async getUpgrades(): Promise<UpgradeRecord[]> {
    return this.request<UpgradeRecord[]>('GET', '/upgrades');
  }

  async createUpgrade(data: Partial<UpgradeRecord>): Promise<UpgradeRecord> {
    return this.request<UpgradeRecord>('POST', '/upgrades', data);
  }

  async updateUpgrade(id: string, data: Partial<UpgradeRecord>): Promise<UpgradeRecord> {
    return this.request<UpgradeRecord>('PUT', `/upgrades/${id}`, data);
  }

  async deleteUpgrade(id: string): Promise<void> {
    return this.request<void>('DELETE', `/upgrades/${id}`);
  }

  // ─── Fuel Records ────────────────────────────────────

  async getFuelRecords(): Promise<FuelRecord[]> {
    return this.request<FuelRecord[]>('GET', '/fuel-records');
  }

  async createFuelRecord(data: Partial<FuelRecord>): Promise<FuelRecord> {
    return this.request<FuelRecord>('POST', '/fuel-records', data);
  }

  async updateFuelRecord(id: string, data: Partial<FuelRecord>): Promise<FuelRecord> {
    return this.request<FuelRecord>('PUT', `/fuel-records/${id}`, data);
  }

  async deleteFuelRecord(id: string): Promise<void> {
    return this.request<void>('DELETE', `/fuel-records/${id}`);
  }

  async getFuelConsumption(vehicleId: string): Promise<Record<string, unknown>> {
    return this.request<Record<string, unknown>>('GET', `/fuel-records/consumption/${vehicleId}`);
  }

  // ─── Odometer Records ────────────────────────────────

  async getOdometerRecords(): Promise<OdometerRecord[]> {
    return this.request<OdometerRecord[]>('GET', '/odometer-records');
  }

  async createOdometerRecord(data: Partial<OdometerRecord>): Promise<OdometerRecord> {
    return this.request<OdometerRecord>('POST', '/odometer-records', data);
  }

  async updateOdometerRecord(id: string, data: Partial<OdometerRecord>): Promise<OdometerRecord> {
    return this.request<OdometerRecord>('PUT', `/odometer-records/${id}`, data);
  }

  async deleteOdometerRecord(id: string): Promise<void> {
    return this.request<void>('DELETE', `/odometer-records/${id}`);
  }

  async recalculateOdometerDistances(vehicleId: string): Promise<OdometerRecord[]> {
    return this.request<OdometerRecord[]>('POST', `/odometer-records/recalculate/${vehicleId}`);
  }

  // ─── Supplies ─────────────────────────────────────────

  async getSupplies(filter?: 'all' | 'shop' | 'vehicle'): Promise<Supply[]> {
    const query = filter && filter !== 'all' ? `?filter=${filter}` : '';
    return this.request<Supply[]>('GET', `/supplies${query}`);
  }

  async getShopSupplies(): Promise<Supply[]> {
    return this.request<Supply[]>('GET', '/supplies/shop');
  }

  async createSupply(data: Partial<Supply>): Promise<Supply> {
    return this.request<Supply>('POST', '/supplies', data);
  }

  async updateSupply(id: string, data: Partial<Supply>): Promise<Supply> {
    return this.request<Supply>('PUT', `/supplies/${id}`, data);
  }

  async deleteSupply(id: string): Promise<void> {
    return this.request<void>('DELETE', `/supplies/${id}`);
  }

  async requisitionSupply(id: string, data: { quantity: number; recordType: string; recordId: string; description: string }): Promise<Supply> {
    return this.request<Supply>('POST', `/supplies/${id}/requisition`, data);
  }

  async getSupplyRequisitions(id: string): Promise<SupplyRequisition[]> {
    return this.request<SupplyRequisition[]>('GET', `/supplies/${id}/requisitions`);
  }

  async restoreSupply(id: string, requisitionId: string): Promise<Supply> {
    return this.request<Supply>('POST', `/supplies/${id}/restore`, { requisitionId });
  }

  // ─── Equipment ────────────────────────────────────────

  async getEquipment(): Promise<Equipment[]> {
    return this.request<Equipment[]>('GET', '/equipment');
  }

  async createEquipment(data: Partial<Equipment>): Promise<Equipment> {
    return this.request<Equipment>('POST', '/equipment', data);
  }

  async updateEquipment(id: string, data: Partial<Equipment>): Promise<Equipment> {
    return this.request<Equipment>('PUT', `/equipment/${id}`, data);
  }

  async deleteEquipment(id: string): Promise<void> {
    return this.request<void>('DELETE', `/equipment/${id}`);
  }

  async reassignEquipment(id: string, vehicleId: string | null): Promise<Equipment> {
    return this.request<Equipment>('PATCH', `/equipment/${id}/reassign`, { vehicleId });
  }

  async getEquipmentDistanceSummary(): Promise<Record<string, number>> {
    return this.request<Record<string, number>>('GET', '/equipment/distance-summary');
  }

  // ─── Inspections ──────────────────────────────────────

  async getInspections(): Promise<Inspection[]> {
    return this.request<Inspection[]>('GET', '/inspections');
  }

  async createInspection(data: Partial<Inspection>): Promise<Inspection> {
    return this.request<Inspection>('POST', '/inspections', data);
  }

  async updateInspection(id: string, data: Partial<Inspection>): Promise<Inspection> {
    return this.request<Inspection>('PUT', `/inspections/${id}`, data);
  }

  async deleteInspection(id: string): Promise<void> {
    return this.request<void>('DELETE', `/inspections/${id}`);
  }

  // ─── Inspection Templates ──────────────────────────────

  async getInspectionTemplates(): Promise<InspectionTemplate[]> {
    return this.request<InspectionTemplate[]>('GET', '/inspections/templates');
  }

  async createInspectionTemplate(data: { name: string; fields: any[] }): Promise<InspectionTemplate> {
    return this.request<InspectionTemplate>('POST', '/inspections/templates', data);
  }

  async deleteInspectionTemplate(id: string): Promise<void> {
    return this.request<void>('DELETE', `/inspections/templates/${id}`);
  }

  // ─── Vehicle Notes ────────────────────────────────────

  async getVehicleNotes(): Promise<VehicleNote[]> {
    return this.request<VehicleNote[]>('GET', '/vehicle-notes');
  }

  async createVehicleNote(data: Partial<VehicleNote>): Promise<VehicleNote> {
    return this.request<VehicleNote>('POST', '/vehicle-notes', data);
  }

  async updateVehicleNote(id: string, data: Partial<VehicleNote>): Promise<VehicleNote> {
    return this.request<VehicleNote>('PUT', `/vehicle-notes/${id}`, data);
  }

  async deleteVehicleNote(id: string): Promise<void> {
    return this.request<void>('DELETE', `/vehicle-notes/${id}`);
  }

  async toggleNotePin(id: string): Promise<VehicleNote> {
    return this.request<VehicleNote>('PATCH', `/vehicle-notes/${id}/toggle-pin`);
  }

  async bulkPinNotes(noteIds: string[], pinned: boolean): Promise<VehicleNote[]> {
    return this.request<VehicleNote[]>('POST', '/vehicle-notes/bulk-pin', { noteIds, pinned });
  }

  // ─── Tax Records ──────────────────────────────────────

  async getTaxRecords(): Promise<TaxRecord[]> {
    return this.request<TaxRecord[]>('GET', '/tax-records');
  }

  async createTaxRecord(data: Partial<TaxRecord>): Promise<TaxRecord> {
    return this.request<TaxRecord>('POST', '/tax-records', data);
  }

  async updateTaxRecord(id: string, data: Partial<TaxRecord>): Promise<TaxRecord> {
    return this.request<TaxRecord>('PUT', `/tax-records/${id}`, data);
  }

  async deleteTaxRecord(id: string): Promise<void> {
    return this.request<void>('DELETE', `/tax-records/${id}`);
  }

  async advanceTaxRecord(id: string): Promise<TaxRecord> {
    return this.request<TaxRecord>('POST', `/tax-records/${id}/advance`);
  }

  // ─── Planner Tasks ───────────────────────────────────

  async getPlannerTasks(): Promise<PlannerTask[]> {
    return this.request<PlannerTask[]>('GET', '/planner-tasks');
  }

  async createPlannerTask(data: Partial<PlannerTask>): Promise<PlannerTask> {
    return this.request<PlannerTask>('POST', '/planner-tasks', data);
  }

  async updatePlannerTask(id: string, data: Partial<PlannerTask>): Promise<PlannerTask> {
    return this.request<PlannerTask>('PUT', `/planner-tasks/${id}`, data);
  }

  async deletePlannerTask(id: string): Promise<void> {
    return this.request<void>('DELETE', `/planner-tasks/${id}`);
  }

  async updateTaskStage(id: string, stage: TaskStage): Promise<PlannerTask> {
    return this.request<PlannerTask>('PATCH', `/planner-tasks/${id}/stage`, { stage });
  }

  // ─── Plan Templates ───────────────────────────────────

  async getPlanTemplates(): Promise<PlanTemplate[]> {
    return this.request<PlanTemplate[]>('GET', '/planner-tasks/templates');
  }

  async createPlanTemplate(data: Partial<PlanTemplate>): Promise<PlanTemplate> {
    return this.request<PlanTemplate>('POST', '/planner-tasks/templates', data);
  }

  async deletePlanTemplate(id: string): Promise<void> {
    return this.request<void>('DELETE', `/planner-tasks/templates/${id}`);
  }

  async createTaskFromTemplate(templateId: string, vehicleId: string): Promise<PlannerTask> {
    return this.request<PlannerTask>('POST', `/planner-tasks/from-template/${templateId}`, { vehicleId });
  }

  async convertPlanToRecord(taskId: string, targetType?: string): Promise<{ recordId: string; recordType: string }> {
    return this.request<{ recordId: string; recordType: string }>('POST', `/planner-tasks/${taskId}/convert`, { targetType });
  }

  // ─── Bulk Move ─────────────────────────────────────────

  async moveRecords(recordIds: string[], fromType: string, toType: string): Promise<{ moved: number }> {
    return this.request<{ moved: number }>('POST', '/bulk/move', { ids: recordIds, fromType, toType });
  }

  // ─── Bulk Edit & Duplicate ─────────────────────────────

  async bulkEdit(recordIds: string[], recordType: string, updates: Record<string, any>): Promise<{ updated: number }> {
    return this.request<{ updated: number }>('POST', '/bulk/edit', { recordIds, recordType, updates });
  }

  async bulkDuplicate(recordIds: string[], recordType: string, targetVehicleId?: string): Promise<{ duplicated: number }> {
    return this.request<{ duplicated: number }>('POST', '/bulk/duplicate', { recordIds, recordType, targetVehicleId });
  }

  async bulkDuplicateToVehicle(recordIds: string[], recordType: string, targetVehicleId: string): Promise<{ duplicated: number }> {
    return this.request<{ duplicated: number }>('POST', '/bulk/duplicate-to-vehicle', { recordIds, recordType, targetVehicleId });
  }

  // ─── Attachments ──────────────────────────────────────

  async getAttachments(recordType: string, recordId: string): Promise<Attachment[]> {
    return this.request<Attachment[]>('GET', `/attachments/${recordType}/${recordId}`);
  }

  async uploadAttachment(recordType: string, recordId: string, file: File): Promise<Attachment> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('recordType', recordType);
    formData.append('recordId', recordId);
    const headers: Record<string, string> = {};
    if (this.accessToken) headers['Authorization'] = `Bearer ${this.accessToken}`;
    const res = await fetch(`${API_BASE}/attachments`, {
      method: 'POST',
      headers,
      credentials: 'include',
      body: formData,
    });
    if (!res.ok) throw new ApiError(res.status, await res.text());
    return res.json();
  }

  async deleteAttachment(id: string): Promise<void> {
    return this.request<void>('DELETE', `/attachments/${id}`);
  }

  async addLinkAttachment(recordType: string, recordId: string, url: string, name?: string): Promise<Attachment> {
    return this.request<Attachment>('POST', '/attachments/link', { recordType, recordId, url, name });
  }

  async addReferenceAttachment(recordType: string, recordId: string, refRecordType: string, refRecordId: string): Promise<Attachment> {
    return this.request<Attachment>('POST', '/attachments/reference', { recordType, recordId, refRecordType, refRecordId });
  }

  async renameAttachment(id: string, name: string): Promise<Attachment> {
    return this.request<Attachment>('PUT', `/attachments/${id}/rename`, { name });
  }

  // ─── Search ───────────────────────────────────────────

  async globalSearch(query: string): Promise<SearchResult[]> {
    return this.request<SearchResult[]>('GET', `/search?q=${encodeURIComponent(query)}`);
  }

  // ─── Maintenance Report ───────────────────────────────

  async getMaintenanceReport(vehicleId: string, year?: number): Promise<Record<string, unknown>> {
    const params = year ? `?year=${year}` : '';
    return this.request<Record<string, unknown>>('GET', `/reports/maintenance/${vehicleId}${params}`);
  }

  // ─── Monthly Report ──────────────────────────────────────

  async getMonthlyReport(vehicleId: string): Promise<Record<string, any>> {
    return this.request<Record<string, any>>('GET', `/reports/vehicle/${vehicleId}/monthly`);
  }

  // ─── Full Backup / Restore (admin only) ────────────────

  async fullBackup(): Promise<Record<string, any>> {
    return this.request<Record<string, any>>('GET', '/data/backup');
  }

  async fullRestore(data: Record<string, any>): Promise<{ restored: number }> {
    return this.request<{ restored: number }>('POST', '/data/restore', { data });
  }

  // ─── Vehicle History ──────────────────────────────────────

  async getVehicleHistory(vehicleId: string, year?: string): Promise<any[]> {
    const qs = year ? `?year=${year}` : '';
    return this.request<any[]>('GET', `/reports/vehicle/${vehicleId}/history${qs}`);
  }

  // ─── CSV Import/Export ────────────────────────────────────

  async exportCsv(recordType: string, params?: { vehicleId?: string; startDate?: string; endDate?: string; tags?: string; tagFilter?: string }): Promise<string> {
    const query = new URLSearchParams();
    if (params?.vehicleId) query.set('vehicleId', params.vehicleId);
    if (params?.startDate) query.set('startDate', params.startDate);
    if (params?.endDate) query.set('endDate', params.endDate);
    if (params?.tags) query.set('tags', params.tags);
    if (params?.tagFilter) query.set('tagFilter', params.tagFilter);
    const qs = query.toString();
    const url = `/csv/export/${recordType}${qs ? '?' + qs : ''}`;
    const headers: Record<string, string> = {};
    if (this.accessToken) headers['Authorization'] = `Bearer ${this.accessToken}`;
    const res = await fetch(`${API_BASE}${url}`, {
      method: 'GET',
      headers,
      credentials: 'include',
    });
    if (!res.ok) throw new ApiError(res.status, await res.text());
    return res.text();
  }

  async importCsv(recordType: string, csv: string, mapping?: Record<string, string>): Promise<{ count: number }> {
    return this.request<{ count: number }>('POST', `/csv/import/${recordType}`, { csv, mapping });
  }

  async getCsvSample(recordType: string): Promise<string> {
    const headers: Record<string, string> = {};
    if (this.accessToken) headers['Authorization'] = `Bearer ${this.accessToken}`;
    const res = await fetch(`${API_BASE}/csv/sample/${recordType}`, {
      method: 'GET',
      headers,
      credentials: 'include',
    });
    if (!res.ok) throw new ApiError(res.status, await res.text());
    return res.text();
  }

  async getCsvRecordTypes(): Promise<{ key: string; columns: string[] }[]> {
    return this.request<{ key: string; columns: string[] }[]>('GET', '/csv/record-types');
  }
  // ─── Extra Fields ───────────────────────────────────

  async getExtraFieldDefinitions(): Promise<ExtraFieldDefinition[]> {
    return this.request<ExtraFieldDefinition[]>('GET', '/extra-fields');
  }

  async createExtraFieldDefinition(data: Omit<ExtraFieldDefinition, 'id' | 'createdAt'>): Promise<ExtraFieldDefinition> {
    return this.request<ExtraFieldDefinition>('POST', '/extra-fields', data);
  }

  async updateExtraFieldDefinition(id: string, data: Partial<ExtraFieldDefinition>): Promise<ExtraFieldDefinition> {
    return this.request<ExtraFieldDefinition>('PUT', `/extra-fields/${id}`, data);
  }

  async deleteExtraFieldDefinition(id: string): Promise<void> {
    return this.request<void>('DELETE', `/extra-fields/${id}`);
  }

  // ─── Dashboard Widgets ───────────────────────────────

  async getWidgets(): Promise<DashboardWidget[]> {
    return this.request<DashboardWidget[]>('GET', '/widgets');
  }

  async createWidget(data: { name: string; type: string; config?: Record<string, any> }): Promise<DashboardWidget> {
    return this.request<DashboardWidget>('POST', '/widgets', data);
  }

  async updateWidget(id: string, data: Partial<{ name: string; type: string; config: Record<string, any>; sortOrder: number }>): Promise<DashboardWidget> {
    return this.request<DashboardWidget>('PUT', `/widgets/${id}`, data);
  }

  async deleteWidget(id: string): Promise<void> {
    return this.request<void>('DELETE', `/widgets/${id}`);
  }

  // ─── Custom Widget Code ──────────────────────────────

  async getCustomWidgetCode(): Promise<CustomWidgetCode[]> {
    return this.request('GET', '/custom-widgets');
  }

  async createCustomWidgetCode(data: { name: string; code: string; enabled?: boolean; sortOrder?: number }): Promise<CustomWidgetCode> {
    return this.request('POST', '/custom-widgets', data);
  }

  async updateCustomWidgetCode(id: string, data: Partial<CustomWidgetCode>): Promise<CustomWidgetCode> {
    return this.request('PUT', `/custom-widgets/${id}`, data);
  }

  async deleteCustomWidgetCode(id: string): Promise<void> {
    return this.request('DELETE', `/custom-widgets/${id}`);
  }

  // ─── Households ──────────────────────────────────────

  async getHouseholds(): Promise<Household[]> {
    return this.request<Household[]>('GET', '/households');
  }

  async createHousehold(name: string): Promise<Household> {
    return this.request<Household>('POST', '/households', { name });
  }

  async updateHousehold(id: string, name: string): Promise<Household> {
    return this.request<Household>('PUT', `/households/${id}`, { name });
  }

  async deleteHousehold(id: string): Promise<void> {
    return this.request<void>('DELETE', `/households/${id}`);
  }

  async getHouseholdMembers(householdId: string): Promise<HouseholdMember[]> {
    return this.request<HouseholdMember[]>('GET', `/households/${householdId}/members`);
  }

  async addHouseholdMember(householdId: string, email: string, permissions?: string[]): Promise<HouseholdMember> {
    return this.request<HouseholdMember>('POST', `/households/${householdId}/members`, { email, permissions });
  }

  async removeHouseholdMember(householdId: string, memberId: string): Promise<void> {
    return this.request<void>('DELETE', `/households/${householdId}/members/${memberId}`);
  }

  // ─── Admin Defaults ─────────────────────────────────────
  async getAdminDefaults(): Promise<any> {
    return this.request('GET', '/admin/defaults');
  }

  async updateAdminDefaults(data: any): Promise<any> {
    return this.request('PUT', '/admin/defaults', data);
  }
}

export const api = new ApiClient();
