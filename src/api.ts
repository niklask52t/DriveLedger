import type {
  Vehicle, Cost, Loan, Repair, SavingsGoal, SavingsTransaction,
  PlannedPurchase, Person, User, ApiToken, RegistrationToken,
  Reminder, AppConfig,
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
    return this.request<Reminder>('POST', `/reminders/${id}/snooze`, { remindAt: newDate });
  }

  // ─── Data Management ──────────────────────────────────

  async exportData(): Promise<Record<string, unknown>> {
    return this.request<Record<string, unknown>>('GET', '/data/export');
  }

  async importData(data: Record<string, unknown>): Promise<void> {
    return this.request<void>('POST', '/data/import', data);
  }

  async deleteAccount(): Promise<void> {
    return this.request<void>('DELETE', '/auth/account');
  }
}

export const api = new ApiClient();
