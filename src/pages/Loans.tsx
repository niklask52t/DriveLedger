import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Pencil, Trash2, ChevronDown } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import Modal from '../components/Modal';
import { cn } from '../lib/utils';
import { formatCurrency, formatDate, formatMonthYear, getLoanProgress, generateLoanSchedule } from '../utils';
import type { AppState, Loan } from '../types';

interface Props {
  state: AppState;
  setState: (s: AppState) => void;
}

const emptyLoan: Omit<Loan, 'id' | 'createdAt'> = {
  vehicleId: '',
  name: '',
  totalAmount: 0,
  monthlyPayment: 0,
  interestRate: 0,
  startDate: '',
  durationMonths: 12,
  additionalSavingsPerMonth: 0,
  notes: '',
};

export default function Loans({ state, setState }: Props) {
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Loan | null>(null);
  const [form, setForm] = useState(emptyLoan);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const totalDebt = useMemo(
    () => state.loans.reduce((sum, l) => sum + getLoanProgress(l).remaining, 0),
    [state.loans]
  );
  const totalMonthly = useMemo(
    () => state.loans.reduce((sum, l) => sum + l.monthlyPayment + l.additionalSavingsPerMonth, 0),
    [state.loans]
  );
  const activeCount = useMemo(
    () => state.loans.filter(l => getLoanProgress(l).remaining > 0).length,
    [state.loans]
  );

  const getVehicleName = (id: string) => state.vehicles.find(v => v.id === id)?.name || '-';

  const openAdd = () => {
    setEditing(null);
    setForm({ ...emptyLoan, vehicleId: state.vehicles[0]?.id || '' });
    setModalOpen(true);
  };

  const openEdit = (loan: Loan) => {
    setEditing(loan);
    setForm({
      vehicleId: loan.vehicleId,
      name: loan.name,
      totalAmount: loan.totalAmount,
      monthlyPayment: loan.monthlyPayment,
      interestRate: loan.interestRate,
      startDate: loan.startDate,
      durationMonths: loan.durationMonths,
      additionalSavingsPerMonth: loan.additionalSavingsPerMonth,
      notes: loan.notes,
    });
    setModalOpen(true);
  };

  const handleSave = () => {
    if (!form.name.trim() || !form.vehicleId) return;
    if (editing) {
      setState({
        ...state,
        loans: state.loans.map(l =>
          l.id === editing.id ? { ...l, ...form } : l
        ),
      });
    } else {
      const newLoan: Loan = {
        ...form,
        id: crypto.randomUUID(),
        createdAt: new Date().toISOString(),
      };
      setState({ ...state, loans: [...state.loans, newLoan] });
    }
    setModalOpen(false);
  };

  const handleDelete = (id: string) => {
    setState({ ...state, loans: state.loans.filter(l => l.id !== id) });
  };

  const selectClasses = "w-full h-10 bg-zinc-950 border border-zinc-800 rounded-lg px-3 text-sm text-zinc-50 outline-none focus:border-violet-500/50 appearance-none";
  const chevronBg = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%2371717a' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E") no-repeat right 10px center`;

  const CircleProgress = ({ percent }: { percent: number }) => {
    const r = 38;
    const circ = 2 * Math.PI * r;
    const offset = circ - (Math.min(percent, 100) / 100) * circ;
    return (
      <svg width="96" height="96" viewBox="0 0 96 96" className="flex-shrink-0">
        <circle cx="48" cy="48" r={r} fill="none" stroke="#27272a" strokeWidth="6" />
        <motion.circle
          cx="48" cy="48" r={r} fill="none"
          stroke="#8b5cf6"
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={circ}
          initial={{ strokeDashoffset: circ }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 0.8 }}
          transform="rotate(-90 48 48)"
        />
        <text x="48" y="48" textAnchor="middle" dominantBaseline="central" className="fill-zinc-50 text-sm font-semibold">
          {Math.round(percent)}%
        </text>
      </svg>
    );
  };

  return (
    <div className="space-y-8">
      {/* Stats + Add */}
      <div className="flex items-start justify-between">
        <div className="grid grid-cols-3 gap-6">
          {[
            { label: 'Total Debt', value: formatCurrency(totalDebt), color: 'text-red-400' },
            { label: 'Monthly Payments', value: formatCurrency(totalMonthly), color: 'text-violet-400' },
            { label: 'Active Loans', value: String(activeCount), color: 'text-emerald-400' },
          ].map(s => (
            <div key={s.label}>
              <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">{s.label}</p>
              <p className={cn('text-2xl font-semibold', s.color)}>{s.value}</p>
            </div>
          ))}
        </div>
        <button onClick={openAdd} className="bg-violet-500 hover:bg-violet-400 text-white rounded-lg h-10 px-5 text-sm font-medium inline-flex items-center gap-2">
          <Plus size={16} />
          Add Loan
        </button>
      </div>

      {/* Loan cards */}
      <div className="space-y-5">
        {state.loans.length === 0 && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 text-center">
            <p className="text-sm text-zinc-500">No loans yet. Add your first loan to track your financing.</p>
          </div>
        )}
        {state.loans.map(loan => {
          const progress = getLoanProgress(loan);
          const schedule = generateLoanSchedule(loan);
          const isExpanded = expandedId === loan.id;
          const vehicleName = getVehicleName(loan.vehicleId);

          return (
            <motion.div
              key={loan.id}
              layout
              className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden"
            >
              <div className="p-6">
                {/* Header */}
                <div className="flex items-start justify-between mb-5">
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                      <h3 className="text-base font-semibold text-zinc-50">{loan.name}</h3>
                      <span className="px-2.5 py-0.5 rounded-full text-xs bg-zinc-800 text-zinc-400 border border-zinc-700">
                        {vehicleName}
                      </span>
                    </div>
                    <p className="text-sm text-zinc-500">
                      Started {formatDate(loan.startDate)} &middot; {loan.durationMonths} months &middot; {loan.interestRate}% interest
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => openEdit(loan)} className="text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-lg h-9 px-3 text-sm inline-flex items-center">
                      <Pencil size={14} />
                    </button>
                    <button onClick={() => handleDelete(loan.id)} className="text-zinc-400 hover:text-red-400 hover:bg-zinc-800 rounded-lg h-9 px-3 text-sm inline-flex items-center">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                {/* Body */}
                <div className="flex items-center gap-6">
                  <CircleProgress percent={progress.percent} />
                  <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-5">
                    <div>
                      <p className="text-xs text-zinc-500 mb-0.5">Total</p>
                      <p className="text-sm font-medium text-zinc-50">{formatCurrency(loan.totalAmount)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-zinc-500 mb-0.5">Paid</p>
                      <p className="text-sm font-medium text-emerald-400">{formatCurrency(progress.paid)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-zinc-500 mb-0.5">Remaining</p>
                      <p className="text-sm font-medium text-red-400">{formatCurrency(progress.remaining)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-zinc-500 mb-0.5">Monthly</p>
                      <p className="text-sm font-medium text-violet-400">{formatCurrency(loan.monthlyPayment + loan.additionalSavingsPerMonth)}</p>
                    </div>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="mt-5">
                  <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full rounded-full bg-violet-500"
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min(progress.percent, 100)}%` }}
                      transition={{ duration: 0.6 }}
                    />
                  </div>
                  <div className="flex justify-between mt-1.5">
                    <span className="text-xs text-zinc-500">{progress.monthsElapsed} months elapsed</span>
                    <span className="text-xs text-zinc-500">{Math.max(0, loan.durationMonths - progress.monthsElapsed)} months remaining</span>
                  </div>
                </div>

                {/* Expand toggle */}
                <button
                  onClick={() => setExpandedId(isExpanded ? null : loan.id)}
                  className="mt-4 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-lg h-9 px-3 text-sm inline-flex items-center gap-1.5 transition-colors"
                >
                  <ChevronDown size={14} className={cn('transition-transform', isExpanded && 'rotate-180')} />
                  {isExpanded ? 'Hide Details' : 'Show Details'}
                </button>
              </div>

              {/* Expanded content */}
              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="overflow-hidden"
                  >
                    <div className="border-t border-zinc-800 p-6 space-y-6">
                      {/* Chart */}
                      <div>
                        <h4 className="text-sm font-medium text-zinc-50 mb-4">Repayment Schedule</h4>
                        <div className="h-64">
                          <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={schedule}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                              <XAxis
                                dataKey="nr"
                                tick={{ fontSize: 11, fill: '#71717a' }}
                                axisLine={{ stroke: '#3f3f46' }}
                                tickLine={false}
                              />
                              <YAxis
                                tick={{ fontSize: 11, fill: '#71717a' }}
                                axisLine={{ stroke: '#3f3f46' }}
                                tickLine={false}
                                tickFormatter={v => `${(v / 1000).toFixed(0)}k`}
                              />
                              <Tooltip
                                contentStyle={{ backgroundColor: '#18181b', border: '1px solid #3f3f46', borderRadius: '0.5rem', fontSize: '0.8rem' }}
                                labelStyle={{ color: '#a1a1aa' }}
                                formatter={(val: number) => formatCurrency(val)}
                              />
                              <Area type="monotone" dataKey="remainingDebt" name="Remaining Debt" stroke="#f87171" fill="#f87171" fillOpacity={0.1} />
                              <Area type="monotone" dataKey="totalSaved" name="Savings" stroke="#34d399" fill="#34d399" fillOpacity={0.1} />
                            </AreaChart>
                          </ResponsiveContainer>
                        </div>
                      </div>

                      {/* Schedule table */}
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead className="bg-zinc-950/50">
                            <tr>
                              <th className="px-4 py-3 text-xs text-zinc-500 uppercase tracking-wider text-left">#</th>
                              <th className="px-4 py-3 text-xs text-zinc-500 uppercase tracking-wider text-left">Date</th>
                              <th className="px-4 py-3 text-xs text-zinc-500 uppercase tracking-wider text-right">Payment</th>
                              <th className="px-4 py-3 text-xs text-zinc-500 uppercase tracking-wider text-right">Principal</th>
                              <th className="px-4 py-3 text-xs text-zinc-500 uppercase tracking-wider text-right">Savings</th>
                              <th className="px-4 py-3 text-xs text-zinc-500 uppercase tracking-wider text-right">Remaining</th>
                            </tr>
                          </thead>
                          <tbody>
                            {schedule.map(row => (
                              <tr key={row.nr} className="border-b border-zinc-800/50 hover:bg-zinc-800/30 transition-colors">
                                <td className="px-4 py-3.5 text-sm text-zinc-500">{row.nr}</td>
                                <td className="px-4 py-3.5 text-sm text-zinc-400">{formatMonthYear(row.date)}</td>
                                <td className="px-4 py-3.5 text-sm text-zinc-50 text-right">{formatCurrency(row.payment)}</td>
                                <td className="px-4 py-3.5 text-sm text-violet-400 text-right">{formatCurrency(row.principal)}</td>
                                <td className="px-4 py-3.5 text-sm text-emerald-400 text-right">{formatCurrency(row.savings)}</td>
                                <td className="px-4 py-3.5 text-sm text-red-400 text-right">{formatCurrency(row.remainingDebt)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>

      {/* Summary table */}
      {state.loans.length > 1 && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
          <div className="px-6 py-4">
            <h3 className="text-sm font-medium text-zinc-50">Loan Summary</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-zinc-950/50">
                <tr>
                  <th className="px-4 py-3 text-xs text-zinc-500 uppercase tracking-wider text-left">Name</th>
                  <th className="px-4 py-3 text-xs text-zinc-500 uppercase tracking-wider text-left">Vehicle</th>
                  <th className="px-4 py-3 text-xs text-zinc-500 uppercase tracking-wider text-right">Total</th>
                  <th className="px-4 py-3 text-xs text-zinc-500 uppercase tracking-wider text-right">Monthly</th>
                  <th className="px-4 py-3 text-xs text-zinc-500 uppercase tracking-wider text-right">Remaining</th>
                  <th className="px-4 py-3 text-xs text-zinc-500 uppercase tracking-wider text-right">Progress</th>
                </tr>
              </thead>
              <tbody>
                {state.loans.map(loan => {
                  const p = getLoanProgress(loan);
                  return (
                    <tr key={loan.id} className="border-b border-zinc-800/50 hover:bg-zinc-800/30 transition-colors">
                      <td className="px-4 py-3.5 text-sm text-zinc-50 font-medium">{loan.name}</td>
                      <td className="px-4 py-3.5 text-sm text-zinc-400">{getVehicleName(loan.vehicleId)}</td>
                      <td className="px-4 py-3.5 text-sm text-zinc-50 text-right">{formatCurrency(loan.totalAmount)}</td>
                      <td className="px-4 py-3.5 text-sm text-violet-400 text-right">{formatCurrency(loan.monthlyPayment + loan.additionalSavingsPerMonth)}</td>
                      <td className="px-4 py-3.5 text-sm text-red-400 text-right">{formatCurrency(p.remaining)}</td>
                      <td className="px-4 py-3.5 text-right">
                        <div className="inline-flex items-center gap-2">
                          <div className="w-24 h-2 bg-zinc-800 rounded-full overflow-hidden">
                            <div className="h-full rounded-full bg-violet-500" style={{ width: `${Math.min(p.percent, 100)}%` }} />
                          </div>
                          <span className="text-xs text-zinc-400 w-10 text-right">{Math.round(p.percent)}%</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                <tr className="bg-zinc-950/30">
                  <td className="px-4 py-3.5 text-sm text-zinc-50 font-semibold">Total</td>
                  <td className="px-4 py-3.5" />
                  <td className="px-4 py-3.5 text-sm text-zinc-50 font-semibold text-right">
                    {formatCurrency(state.loans.reduce((s, l) => s + l.totalAmount, 0))}
                  </td>
                  <td className="px-4 py-3.5 text-sm text-violet-400 font-semibold text-right">
                    {formatCurrency(totalMonthly)}
                  </td>
                  <td className="px-4 py-3.5 text-sm text-red-400 font-semibold text-right">
                    {formatCurrency(totalDebt)}
                  </td>
                  <td className="px-4 py-3.5" />
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add/Edit Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Edit Loan' : 'Add Loan'}
        size="lg"
        footer={
          <>
            <button onClick={() => setModalOpen(false)} className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg h-10 px-4 text-sm">
              Cancel
            </button>
            <button onClick={handleSave} className="bg-violet-500 hover:bg-violet-400 text-white rounded-lg h-10 px-5 text-sm font-medium">
              {editing ? 'Save Changes' : 'Add Loan'}
            </button>
          </>
        }
      >
        <div className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-2">Vehicle</label>
              <select
                value={form.vehicleId}
                onChange={e => setForm({ ...form, vehicleId: e.target.value })}
                className={selectClasses}
                style={{ background: chevronBg }}
              >
                <option value="">Select vehicle</option>
                {state.vehicles.map(v => (
                  <option key={v.id} value={v.id}>{v.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-2">Name</label>
              <input
                type="text"
                value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. Car Loan"
                className="w-full h-10 bg-zinc-950 border border-zinc-800 rounded-lg px-3 text-sm text-zinc-50 placeholder:text-zinc-600 outline-none focus:border-violet-500/50"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-2">Total Amount</label>
              <input
                type="number"
                value={form.totalAmount || ''}
                onChange={e => setForm({ ...form, totalAmount: parseFloat(e.target.value) || 0 })}
                placeholder="0.00"
                className="w-full h-10 bg-zinc-950 border border-zinc-800 rounded-lg px-3 text-sm text-zinc-50 placeholder:text-zinc-600 outline-none focus:border-violet-500/50"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-2">Monthly Payment</label>
              <input
                type="number"
                value={form.monthlyPayment || ''}
                onChange={e => setForm({ ...form, monthlyPayment: parseFloat(e.target.value) || 0 })}
                placeholder="0.00"
                className="w-full h-10 bg-zinc-950 border border-zinc-800 rounded-lg px-3 text-sm text-zinc-50 placeholder:text-zinc-600 outline-none focus:border-violet-500/50"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-2">Interest Rate (%)</label>
              <input
                type="number"
                step="0.1"
                value={form.interestRate || ''}
                onChange={e => setForm({ ...form, interestRate: parseFloat(e.target.value) || 0 })}
                placeholder="0.0"
                className="w-full h-10 bg-zinc-950 border border-zinc-800 rounded-lg px-3 text-sm text-zinc-50 placeholder:text-zinc-600 outline-none focus:border-violet-500/50"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-2">Duration (months)</label>
              <input
                type="number"
                value={form.durationMonths || ''}
                onChange={e => setForm({ ...form, durationMonths: parseInt(e.target.value) || 0 })}
                placeholder="12"
                className="w-full h-10 bg-zinc-950 border border-zinc-800 rounded-lg px-3 text-sm text-zinc-50 placeholder:text-zinc-600 outline-none focus:border-violet-500/50"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-2">Extra Savings/mo</label>
              <input
                type="number"
                value={form.additionalSavingsPerMonth || ''}
                onChange={e => setForm({ ...form, additionalSavingsPerMonth: parseFloat(e.target.value) || 0 })}
                placeholder="0.00"
                className="w-full h-10 bg-zinc-950 border border-zinc-800 rounded-lg px-3 text-sm text-zinc-50 placeholder:text-zinc-600 outline-none focus:border-violet-500/50"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-2">Start Date</label>
            <input
              type="date"
              value={form.startDate}
              onChange={e => setForm({ ...form, startDate: e.target.value })}
              className="w-full h-10 bg-zinc-950 border border-zinc-800 rounded-lg px-3 text-sm text-zinc-50 placeholder:text-zinc-600 outline-none focus:border-violet-500/50"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-2">Notes</label>
            <textarea
              value={form.notes}
              onChange={e => setForm({ ...form, notes: e.target.value })}
              placeholder="Optional notes..."
              className="w-full min-h-[100px] h-auto bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2.5 text-sm text-zinc-50 placeholder:text-zinc-600 outline-none focus:border-violet-500/50 resize-none"
            />
          </div>
        </div>
      </Modal>
    </div>
  );
}
