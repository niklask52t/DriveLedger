import { api } from './api';
import type { AppState, Reminder } from './types';

export async function loadState(): Promise<AppState> {
  // First load everything that's independent
  const [vehicles, costs, loans, repairs, savingsGoals, plannedPurchases, persons] = await Promise.all([
    api.getVehicles(),
    api.getCosts(),
    api.getLoans(),
    api.getRepairs(),
    api.getSavingsGoals(),
    api.getPlannedPurchases(),
    api.getPersons(),
  ]);

  // Then load savings transactions (depends on goals)
  const savingsTransactions = await api.getSavingsTransactions();

  return { vehicles, costs, loans, repairs, savingsGoals, savingsTransactions, plannedPurchases, persons };
}

export function emptyState(): AppState {
  return {
    vehicles: [],
    costs: [],
    loans: [],
    repairs: [],
    savingsGoals: [],
    savingsTransactions: [],
    plannedPurchases: [],
    persons: [],
  };
}

export async function loadReminders(): Promise<Reminder[]> {
  return api.getReminders();
}

export async function loadDueReminders(): Promise<Reminder[]> {
  return api.getDueReminders();
}

export function exportData(state: AppState): string {
  return JSON.stringify(state, null, 2);
}

export function importData(json: string): AppState | null {
  try {
    const parsed = JSON.parse(json);
    if (parsed.vehicles && parsed.costs) return parsed;
  } catch {
    // ignore
  }
  return null;
}
