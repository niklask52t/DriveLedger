import { useState, useMemo } from 'react';
import { v4 as uuidv4 } from 'uuid';
import {
  Plus, Pencil, Trash2, Landmark,
  DollarSign, ChevronDown, ChevronUp, CalendarCheck
} from 'lucide-react';
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts';
import Modal from '../components/Modal';
import type { AppState, Loan } from '../types';
import {
  formatCurrency, formatDate, formatMonthYear,
  generateLoanSchedule, getLoanProgress
} from '../utils';

interface LoansProps {
  state: AppState;
  setState: (state: AppState) => void;
}

const inputClass = 'w-full bg-dark-900 border border-dark-600 rounded-lg px-3 py-2 text-dark-100 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none';
const labelClass = 'block text-sm font-medium text-dark-300 mb-1';

const emptyLoan: Omit<Loan, 'id' | 'createdAt'> = {
  vehicleId: '',
  name: '',
  totalAmount: 0,
  monthlyPayment: 0,
  interestRate: 0,
  startDate: '',
  durationMonths: 0,
  additionalSavingsPerMonth: 0,
  notes: '',
};

export default function Loans({ state, setState }: LoansProps) {
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyLoan);
  const [expandedLoan, setExpandedLoan] = useState<string | null>(null);

  const getVehicleName = (id: string) => {
    const v = state.vehicles.find(vh => vh.id === id);
    return v ? `${v.brand} ${v.model}` : 'Unknown';
  };

  const openAddModal = () => {
    setEditingId(null);
    setForm({
      ...emptyLoan,
      vehicleId: state.vehicles[0]?.id || '',
      startDate: new Date().toISOString().split('T')[0],
    });
    setShowModal(true);
  };

  const openEditModal = (loan: Loan) => {
    setEditingId(loan.id);
    setForm({
      vehicleId: loan.vehicleId, name: loan.name, totalAmount: loan.totalAmount,
      monthlyPayment: loan.monthlyPayment, interestRate: loan.interestRate,
      startDate: loan.startDate, durationMonths: loan.durationMonths,
      additionalSavingsPerMonth: loan.additionalSavingsPerMonth, notes: loan.notes,
    });
    setShowModal(true);
  };

  const handleSave = () => {
    if (!form.name || !form.vehicleId || form.totalAmount <= 0 || form.monthlyPayment <= 0) return;
    if (editingId) {
      setState({ ...state, loans: state.loans.map(l => l.id === editingId ? { ...l, ...form } : l) });
    } else {
      const newLoan: Loan = { id: uuidv4(), ...form, createdAt: new Date().toISOString() };
      setState({ ...state, loans: [...state.loans, newLoan] });
    }
    setShowModal(false);
  };

  const handleDelete = (id: string) => {
    setState({ ...state, loans: state.loans.filter(l => l.id !== id) });
  };

  // Summary calculations
  const totalDebt = state.loans.reduce((sum, l) => {
    const progress = getLoanProgress(l);
    return sum + progress.remaining;
  }, 0);

  const totalMonthlyPayments = state.loans.reduce((sum, l) => sum + l.monthlyPayment + l.additionalSavingsPerMonth, 0);

  const ProgressCircle = ({ percent }: { percent: number }) => {
    const radius = 36;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (Math.min(percent, 100) / 100) * circumference;
    return (
      <div className="relative w-24 h-24">
        <svg className="w-24 h-24 -rotate-90" viewBox="0 0 80 80">
          <circle cx="40" cy="40" r={radius} stroke="currentColor" strokeWidth="6" fill="none" className="text-dark-700" />
          <circle cx="40" cy="40" r={radius} stroke="currentColor" strokeWidth="6" fill="none"
            className="text-primary-500 transition-all duration-700"
            strokeDasharray={circumference} strokeDashoffset={strokeDashoffset} strokeLinecap="round" />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-sm font-bold text-dark-100">{Math.min(percent, 100).toFixed(0)}%</span>
        </div>
      </div>
    );
  };

  const LoanCard = ({ loan }: { loan: Loan }) => {
    const progress = getLoanProgress(loan);
    const schedule = useMemo(() => generateLoanSchedule(loan), [loan]);
    const isExpanded = expandedLoan === loan.id;
    const monthsRemaining = Math.max(0, loan.durationMonths - progress.monthsElapsed);


    // Chart data - sample every few rows for large schedules
    const chartData = useMemo(() => {
      if (schedule.length <= 60) return schedule;
      const step = Math.ceil(schedule.length / 60);
      return schedule.filter((_, i) => i % step === 0 || i === schedule.length - 1);
    }, [schedule]);

    return (
      <div className="bg-dark-800 border border-dark-700 rounded-xl overflow-hidden">
        {/* Loan Header */}
        <div className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-1">
                <h3 className="text-lg font-semibold text-dark-50">{loan.name}</h3>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-dark-700 text-dark-300">{getVehicleName(loan.vehicleId)}</span>
              </div>
              <p className="text-sm text-dark-400">Started {formatDate(loan.startDate)}</p>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => openEditModal(loan)} className="p-2 rounded-lg text-dark-400 hover:text-primary-400 hover:bg-dark-700 transition-colors">
                <Pencil size={16} />
              </button>
              <button onClick={() => handleDelete(loan.id)} className="p-2 rounded-lg text-dark-400 hover:text-danger hover:bg-dark-700 transition-colors">
                <Trash2 size={16} />
              </button>
            </div>
          </div>

          <div className="flex items-center gap-8">
            <ProgressCircle percent={progress.percent} />
            <div className="flex-1 grid grid-cols-2 sm:grid-cols-3 gap-4">
              <div>
                <p className="text-xs text-dark-500 mb-1">Total Amount</p>
                <p className="text-sm font-semibold text-dark-100">{formatCurrency(loan.totalAmount)}</p>
              </div>
              <div>
                <p className="text-xs text-dark-500 mb-1">Monthly Payment</p>
                <p className="text-sm font-semibold text-primary-400">{formatCurrency(loan.monthlyPayment)}</p>
              </div>
              <div>
                <p className="text-xs text-dark-500 mb-1">Months Remaining</p>
                <p className="text-sm font-semibold text-dark-100">{monthsRemaining}</p>
              </div>
              <div>
                <p className="text-xs text-dark-500 mb-1">Amount Paid</p>
                <p className="text-sm font-semibold text-success">{formatCurrency(progress.paid)}</p>
              </div>
              <div>
                <p className="text-xs text-dark-500 mb-1">Amount Remaining</p>
                <p className="text-sm font-semibold text-warning">{formatCurrency(progress.remaining)}</p>
              </div>
              {loan.additionalSavingsPerMonth > 0 && (
                <div>
                  <p className="text-xs text-dark-500 mb-1">Add. Savings/mo</p>
                  <p className="text-sm font-semibold text-info">{formatCurrency(loan.additionalSavingsPerMonth)}</p>
                </div>
              )}
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mt-5">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs text-dark-400">Progress</span>
              <span className="text-xs text-dark-400">{formatCurrency(progress.paid)} / {formatCurrency(loan.totalAmount)}</span>
            </div>
            <div className="h-2.5 bg-dark-900 rounded-full overflow-hidden">
              <div className="h-full rounded-full bg-gradient-to-r from-primary-600 to-primary-400 transition-all duration-700"
                style={{ width: `${Math.min(progress.percent, 100)}%` }} />
            </div>
          </div>
        </div>

        {/* Expand/Collapse */}
        <button
          onClick={() => setExpandedLoan(isExpanded ? null : loan.id)}
          className="w-full px-6 py-3 flex items-center justify-center gap-2 border-t border-dark-700 text-sm text-dark-400 hover:text-dark-200 hover:bg-dark-850 transition-colors"
        >
          {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          {isExpanded ? 'Hide Details' : 'Show Amortization Schedule & Chart'}
        </button>

        {/* Expanded Content */}
        {isExpanded && (
          <div className="border-t border-dark-700">
            {/* Debt Chart */}
            <div className="p-6">
              <h4 className="text-sm font-semibold text-dark-200 mb-4">Remaining Debt Over Time</h4>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                    <defs>
                      <linearGradient id={`debtGrad-${loan.id}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id={`savingsGrad-${loan.id}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis dataKey="date" tickFormatter={(d: string) => formatMonthYear(d)} tick={{ fill: '#94a3b8', fontSize: 11 }}
                      interval={Math.max(0, Math.floor(chartData.length / 8))} stroke="#475569" />
                    <YAxis tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}k`} tick={{ fill: '#94a3b8', fontSize: 11 }} stroke="#475569" />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px', fontSize: '12px' }}
                      labelStyle={{ color: '#f1f5f9' }}
                      formatter={(value, name) => [formatCurrency(Number(value)), String(name) === 'remainingDebt' ? 'Remaining Debt' : 'Total Saved']}
                      labelFormatter={(label) => formatMonthYear(String(label))}
                    />
                    <Area type="monotone" dataKey="remainingDebt" stroke="#3b82f6" strokeWidth={2}
                      fill={`url(#debtGrad-${loan.id})`} name="remainingDebt" />
                    {loan.additionalSavingsPerMonth > 0 && (
                      <Area type="monotone" dataKey="totalSaved" stroke="#10b981" strokeWidth={2}
                        fill={`url(#savingsGrad-${loan.id})`} name="totalSaved" />
                    )}
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Amortization Schedule Table */}
            <div className="px-6 pb-6">
              <h4 className="text-sm font-semibold text-dark-200 mb-3">Amortization Schedule</h4>
              <div className="max-h-80 overflow-y-auto rounded-lg border border-dark-700">
                <table className="w-full text-sm">
                  <thead className="bg-dark-850 sticky top-0">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-medium text-dark-400">Nr</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-dark-400">Date</th>
                      <th className="px-3 py-2 text-right text-xs font-medium text-dark-400">Payment</th>
                      <th className="px-3 py-2 text-right text-xs font-medium text-dark-400">Principal</th>
                      <th className="px-3 py-2 text-right text-xs font-medium text-dark-400">Savings</th>
                      <th className="px-3 py-2 text-right text-xs font-medium text-dark-400">Remaining</th>
                      <th className="px-3 py-2 text-right text-xs font-medium text-dark-400">Total Saved</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-dark-700/50">
                    {schedule.map(row => (
                      <tr key={row.nr} className={`hover:bg-dark-850/50 ${row.nr === progress.monthsElapsed ? 'bg-primary-500/5 border-l-2 border-l-primary-500' : ''}`}>
                        <td className="px-3 py-2 text-dark-300">{row.nr}</td>
                        <td className="px-3 py-2 text-dark-200">{formatMonthYear(row.date)}</td>
                        <td className="px-3 py-2 text-right text-dark-100">{formatCurrency(row.payment)}</td>
                        <td className="px-3 py-2 text-right text-dark-200">{formatCurrency(row.principal)}</td>
                        <td className="px-3 py-2 text-right text-success">{formatCurrency(row.savings)}</td>
                        <td className="px-3 py-2 text-right font-medium text-dark-100">{formatCurrency(row.remainingDebt)}</td>
                        <td className="px-3 py-2 text-right text-info">{formatCurrency(row.totalSaved)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-dark-50">Loans</h1>
          <p className="text-dark-400 mt-1">Track and manage vehicle financing</p>
        </div>
        <button onClick={openAddModal} className="flex items-center gap-2 px-4 py-2.5 bg-primary-600 text-white rounded-xl hover:bg-primary-500 transition-colors font-medium">
          <Plus size={18} /> Add Loan
        </button>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-dark-800 border border-dark-700 rounded-xl p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2.5 bg-danger/10 rounded-lg"><Landmark size={20} className="text-danger" /></div>
            <span className="text-sm text-dark-400">Total Debt</span>
          </div>
          <p className="text-2xl font-bold text-dark-50">{formatCurrency(totalDebt)}</p>
          <p className="text-xs text-dark-500 mt-1">remaining across {state.loans.length} loan{state.loans.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="bg-dark-800 border border-dark-700 rounded-xl p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2.5 bg-primary-500/10 rounded-lg"><DollarSign size={20} className="text-primary-400" /></div>
            <span className="text-sm text-dark-400">Monthly Payments</span>
          </div>
          <p className="text-2xl font-bold text-dark-50">{formatCurrency(totalMonthlyPayments)}</p>
          <p className="text-xs text-dark-500 mt-1">total monthly obligations</p>
        </div>
        <div className="bg-dark-800 border border-dark-700 rounded-xl p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2.5 bg-success/10 rounded-lg"><CalendarCheck size={20} className="text-success" /></div>
            <span className="text-sm text-dark-400">Active Loans</span>
          </div>
          <p className="text-2xl font-bold text-dark-50">{state.loans.filter(l => getLoanProgress(l).remaining > 0).length}</p>
          <p className="text-xs text-dark-500 mt-1">of {state.loans.length} total</p>
        </div>
      </div>

      {/* Loan Cards */}
      {state.loans.length === 0 ? (
        <div className="bg-dark-800 border border-dark-700 rounded-xl p-12 text-center">
          <Landmark size={48} className="text-dark-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-dark-300 mb-2">No loans yet</h3>
          <p className="text-dark-500 mb-6">Add your first vehicle loan to start tracking your payments.</p>
          <button onClick={openAddModal} className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary-600 text-white rounded-xl hover:bg-primary-500 transition-colors font-medium">
            <Plus size={18} /> Add Loan
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {state.loans.map(loan => <LoanCard key={loan.id} loan={loan} />)}
        </div>
      )}

      {/* Summary Footer */}
      {state.loans.length > 0 && (
        <div className="bg-dark-800 border border-dark-700 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-dark-100 mb-4">Loan Summary</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-dark-700">
                  <th className="px-3 py-2 text-left text-xs font-medium text-dark-400">Loan</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-dark-400">Vehicle</th>
                  <th className="px-3 py-2 text-right text-xs font-medium text-dark-400">Total</th>
                  <th className="px-3 py-2 text-right text-xs font-medium text-dark-400">Monthly</th>
                  <th className="px-3 py-2 text-right text-xs font-medium text-dark-400">Remaining</th>
                  <th className="px-3 py-2 text-right text-xs font-medium text-dark-400">Progress</th>
                  <th className="px-3 py-2 text-right text-xs font-medium text-dark-400">Projected Payoff</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dark-700/50">
                {state.loans.map(loan => {
                  const progress = getLoanProgress(loan);
                  const monthsRemaining = Math.max(0, loan.durationMonths - progress.monthsElapsed);
                  const payoffDate = new Date();
                  payoffDate.setMonth(payoffDate.getMonth() + monthsRemaining);

                  return (
                    <tr key={loan.id} className="hover:bg-dark-850/50">
                      <td className="px-3 py-3 font-medium text-dark-100">{loan.name}</td>
                      <td className="px-3 py-3 text-dark-300">{getVehicleName(loan.vehicleId)}</td>
                      <td className="px-3 py-3 text-right text-dark-200">{formatCurrency(loan.totalAmount)}</td>
                      <td className="px-3 py-3 text-right text-primary-400">{formatCurrency(loan.monthlyPayment + loan.additionalSavingsPerMonth)}</td>
                      <td className="px-3 py-3 text-right text-warning">{formatCurrency(progress.remaining)}</td>
                      <td className="px-3 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <div className="w-16 h-1.5 bg-dark-900 rounded-full overflow-hidden">
                            <div className="h-full rounded-full bg-primary-500" style={{ width: `${Math.min(progress.percent, 100)}%` }} />
                          </div>
                          <span className="text-dark-300 text-xs w-10 text-right">{progress.percent.toFixed(0)}%</span>
                        </div>
                      </td>
                      <td className="px-3 py-3 text-right text-dark-200">
                        {progress.remaining <= 0 ? (
                          <span className="text-success font-medium">Paid off</span>
                        ) : (
                          formatMonthYear(payoffDate.toISOString())
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot className="border-t-2 border-dark-600">
                <tr>
                  <td colSpan={2} className="px-3 py-3 font-semibold text-dark-100">Total</td>
                  <td className="px-3 py-3 text-right font-semibold text-dark-100">
                    {formatCurrency(state.loans.reduce((s, l) => s + l.totalAmount, 0))}
                  </td>
                  <td className="px-3 py-3 text-right font-semibold text-primary-400">
                    {formatCurrency(totalMonthlyPayments)}
                  </td>
                  <td className="px-3 py-3 text-right font-semibold text-warning">
                    {formatCurrency(totalDebt)}
                  </td>
                  <td colSpan={2}></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* Add/Edit Loan Modal */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editingId ? 'Edit Loan' : 'Add Loan'}>
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Vehicle *</label>
              <select value={form.vehicleId} onChange={e => setForm({ ...form, vehicleId: e.target.value })} className={inputClass}>
                <option value="">Select vehicle...</option>
                {state.vehicles.map(v => <option key={v.id} value={v.id}>{v.brand} {v.model}</option>)}
              </select>
            </div>
            <div>
              <label className={labelClass}>Name *</label>
              <input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className={inputClass} placeholder="e.g. Auto Credit" />
            </div>
            <div>
              <label className={labelClass}>Total Amount (EUR) *</label>
              <input type="number" value={form.totalAmount || ''} onChange={e => setForm({ ...form, totalAmount: parseFloat(e.target.value) || 0 })} className={inputClass} placeholder="0.00" min="0" step="0.01" />
            </div>
            <div>
              <label className={labelClass}>Monthly Payment (EUR) *</label>
              <input type="number" value={form.monthlyPayment || ''} onChange={e => setForm({ ...form, monthlyPayment: parseFloat(e.target.value) || 0 })} className={inputClass} placeholder="0.00" min="0" step="0.01" />
            </div>
            <div>
              <label className={labelClass}>Interest Rate (%)</label>
              <input type="number" value={form.interestRate || ''} onChange={e => setForm({ ...form, interestRate: parseFloat(e.target.value) || 0 })} className={inputClass} placeholder="0.0" min="0" step="0.1" />
            </div>
            <div>
              <label className={labelClass}>Start Date *</label>
              <input type="date" value={form.startDate} onChange={e => setForm({ ...form, startDate: e.target.value })} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Duration (Months) *</label>
              <input type="number" value={form.durationMonths || ''} onChange={e => setForm({ ...form, durationMonths: parseInt(e.target.value) || 0 })} className={inputClass} placeholder="e.g. 48" min="1" />
            </div>
            <div>
              <label className={labelClass}>Add. Savings / Month</label>
              <input type="number" value={form.additionalSavingsPerMonth || ''} onChange={e => setForm({ ...form, additionalSavingsPerMonth: parseFloat(e.target.value) || 0 })} className={inputClass} placeholder="0.00" min="0" step="0.01" />
            </div>
          </div>
          <div>
            <label className={labelClass}>Notes</label>
            <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} className={`${inputClass} resize-none`} rows={3} placeholder="Optional notes..." />
          </div>

          {/* Preview calculations */}
          {form.totalAmount > 0 && form.monthlyPayment > 0 && form.durationMonths > 0 && (
            <div className="bg-dark-900 border border-dark-700 rounded-lg p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-dark-400">Total payments over term</span>
                <span className="text-sm font-semibold text-dark-100">{formatCurrency(form.monthlyPayment * form.durationMonths)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-dark-400">Total with savings</span>
                <span className="text-sm font-semibold text-dark-100">{formatCurrency((form.monthlyPayment + form.additionalSavingsPerMonth) * form.durationMonths)}</span>
              </div>
              {form.additionalSavingsPerMonth > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-dark-400">Total saved at end</span>
                  <span className="text-sm font-semibold text-success">{formatCurrency(form.additionalSavingsPerMonth * form.durationMonths)}</span>
                </div>
              )}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button onClick={() => setShowModal(false)} className="px-4 py-2.5 bg-dark-700 text-dark-200 rounded-xl hover:bg-dark-600 transition-colors">Cancel</button>
            <button onClick={handleSave}
              disabled={!form.name || !form.vehicleId || form.totalAmount <= 0 || form.monthlyPayment <= 0 || form.durationMonths <= 0}
              className="px-6 py-2.5 bg-primary-600 text-white rounded-xl hover:bg-primary-500 transition-colors font-medium disabled:opacity-40 disabled:cursor-not-allowed">
              {editingId ? 'Save Changes' : 'Add Loan'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
