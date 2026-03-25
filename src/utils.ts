import type { Cost, CostFrequency, Loan, Repair, SavingsGoal, SavingsTransaction } from './types';
import { differenceInMonths, addMonths, format, parseISO } from 'date-fns';

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(amount);
}

export function formatNumber(n: number, decimals = 0): string {
  return new Intl.NumberFormat('de-DE', { maximumFractionDigits: decimals, minimumFractionDigits: decimals }).format(n);
}

export function formatDate(dateStr: string): string {
  if (!dateStr) return '-';
  try {
    return format(parseISO(dateStr), 'dd.MM.yyyy');
  } catch {
    return dateStr;
  }
}

export function formatMonthYear(dateStr: string): string {
  if (!dateStr) return '-';
  try {
    return format(parseISO(dateStr), 'MMM yyyy');
  } catch {
    return dateStr;
  }
}

export function toMonthly(amount: number, frequency: CostFrequency): number {
  switch (frequency) {
    case 'monatlich': return amount;
    case 'quartal': return amount / 3;
    case 'halbjaehrlich': return amount / 6;
    case 'jaehrlich': return amount / 12;
    case 'einmalig': return 0;
  }
}

export function toYearly(amount: number, frequency: CostFrequency): number {
  switch (frequency) {
    case 'monatlich': return amount * 12;
    case 'quartal': return amount * 4;
    case 'halbjaehrlich': return amount * 2;
    case 'jaehrlich': return amount;
    case 'einmalig': return 0;
  }
}

export function getFrequencyLabel(freq: CostFrequency): string {
  const labels: Record<CostFrequency, string> = {
    einmalig: 'One-time',
    monatlich: 'Monthly',
    quartal: 'Quarterly',
    halbjaehrlich: 'Semi-annual',
    jaehrlich: 'Yearly',
  };
  return labels[freq];
}

export function getCategoryLabel(cat: string): string {
  const labels: Record<string, string> = {
    steuer: 'Tax',
    versicherung: 'Insurance',
    sprit: 'Fuel',
    pflege: 'Care & Cleaning',
    reparatur: 'Repair',
    tuev: 'Inspection (TÜV)',
    finanzierung: 'Financing',
    sparen: 'Savings',
    sonstiges: 'Other',
  };
  return labels[cat] || cat;
}

export function getCategoryColor(cat: string): string {
  const colors: Record<string, string> = {
    steuer: '#f59e0b',
    versicherung: '#3b82f6',
    sprit: '#ef4444',
    pflege: '#06b6d4',
    reparatur: '#f97316',
    tuev: '#8b5cf6',
    finanzierung: '#ec4899',
    sparen: '#10b981',
    sonstiges: '#6b7280',
  };
  return colors[cat] || '#6b7280';
}

export function getFuelTypeLabel(ft: string): string {
  const labels: Record<string, string> = {
    diesel: 'Diesel',
    benzin: 'Gasoline',
    elektro: 'Electric',
    hybrid: 'Hybrid',
    lpg: 'LPG',
  };
  return labels[ft] || ft;
}

export function getTotalMonthlyCosts(costs: Cost[]): number {
  return costs.reduce((sum, c) => sum + toMonthly(c.amount, c.frequency), 0);
}

export function getTotalYearlyCosts(costs: Cost[]): number {
  return costs.reduce((sum, c) => sum + toYearly(c.amount, c.frequency), 0);
}

export function getCostsByPerson(costs: Cost[]): Record<string, number> {
  const result: Record<string, number> = {};
  for (const c of costs) {
    const monthly = toMonthly(c.amount, c.frequency);
    result[c.paidBy] = (result[c.paidBy] || 0) + monthly;
  }
  return result;
}

export function getCostsByCategory(costs: Cost[]): Record<string, number> {
  const result: Record<string, number> = {};
  for (const c of costs) {
    const monthly = toMonthly(c.amount, c.frequency);
    result[c.category] = (result[c.category] || 0) + monthly;
  }
  return result;
}

export function getTotalRepairCosts(repairs: Repair[]): number {
  return repairs.reduce((sum, r) => sum + r.cost, 0);
}

export function generateLoanSchedule(loan: Loan) {
  const rows = [];
  let remaining = loan.totalAmount;
  let totalSaved = 0;
  const start = parseISO(loan.startDate);

  for (let i = 1; i <= loan.durationMonths; i++) {
    const date = addMonths(start, i - 1);
    remaining -= loan.monthlyPayment;
    totalSaved += loan.additionalSavingsPerMonth;
    rows.push({
      nr: i,
      date: format(date, 'yyyy-MM-dd'),
      payment: loan.monthlyPayment + loan.additionalSavingsPerMonth,
      principal: loan.monthlyPayment,
      savings: loan.additionalSavingsPerMonth,
      remainingDebt: Math.max(0, remaining),
      totalSaved,
    });
    if (remaining <= 0) break;
  }
  return rows;
}

export function calculateFinancing(price: number, downPayment: number, months: number, annualRate: number) {
  const loanAmount = price - downPayment;
  if (annualRate === 0) {
    const monthly = loanAmount / months;
    return { loanAmount, monthlyPayment: monthly, totalInterest: 0, totalCost: price };
  }
  const r = annualRate / 100 / 12;
  const monthly = loanAmount * (r * Math.pow(1 + r, months)) / (Math.pow(1 + r, months) - 1);
  const totalCost = monthly * months + downPayment;
  const totalInterest = totalCost - price;
  return { loanAmount, monthlyPayment: monthly, totalInterest, totalCost };
}

export function getSavingsBalance(goal: SavingsGoal, transactions: SavingsTransaction[]): number {
  const goalTxns = transactions.filter(t => t.savingsGoalId === goal.id);
  const txnTotal = goalTxns.reduce((sum, t) => sum + (t.type === 'deposit' ? t.amount : -t.amount), 0);

  // Calculate months of automatic contributions
  const start = parseISO(goal.startDate);
  const now = new Date();
  const months = Math.max(0, differenceInMonths(now, start));
  const autoContributions = months * goal.monthlyContribution;

  return autoContributions + txnTotal;
}

export function getSavingsProgress(goal: SavingsGoal, transactions: SavingsTransaction[]): number {
  const balance = getSavingsBalance(goal, transactions);
  return goal.targetAmount > 0 ? Math.min(100, (balance / goal.targetAmount) * 100) : 0;
}

export function getLoanProgress(loan: Loan): { paid: number; remaining: number; percent: number; monthsElapsed: number } {
  const start = parseISO(loan.startDate);
  const now = new Date();
  const monthsElapsed = Math.max(0, differenceInMonths(now, start));
  const paid = Math.min(loan.totalAmount, monthsElapsed * loan.monthlyPayment);
  const remaining = Math.max(0, loan.totalAmount - paid);
  const percent = (paid / loan.totalAmount) * 100;
  return { paid, remaining, percent, monthsElapsed };
}

export function cn(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(' ');
}
