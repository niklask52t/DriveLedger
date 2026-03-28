import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Pencil, Trash2, ChevronDown } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { api } from '../api';
import Modal from '../components/Modal';
import TagInput from '../components/TagInput';
import BulkActions from '../components/BulkActions';
import ExtraFields from '../components/ExtraFields';
import { useExtraFields } from '../hooks/useExtraFields';
import { useUnits } from '../hooks/useUnits';
import { cn } from '../lib/utils';
import { useI18n } from '../contexts/I18nContext';
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
  tags: [],
};

export default function Loans({ state, setState }: Props) {
  const { t } = useI18n();
  const extraFieldDefs = useExtraFields();
  const { fmtDistance } = useUnits();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Loan | null>(null);
  const [form, setForm] = useState(emptyLoan);
  const [extraFieldValues, setExtraFieldValues] = useState<Record<string, string>>({});
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const allTags = useMemo(() => [...new Set(state.loans.flatMap(l => l.tags || []))], [state.loans]);

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
    setExtraFieldValues({});
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
      tags: loan.tags || [],
    });
    setExtraFieldValues((loan as any).extraFields || {});
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.vehicleId) return;
    const payload = { ...form, extraFields: extraFieldValues };
    try {
      if (editing) {
        const updated = await api.updateLoan(editing.id, payload);
        setState({
          ...state,
          loans: state.loans.map(l =>
            l.id === editing.id ? updated : l
          ),
        });
      } else {
        const newLoan = await api.createLoan(payload);
        setState({ ...state, loans: [...state.loans, newLoan] });
      }
      setModalOpen(false);
    } catch {
      // ignore
    }
  };

  const handleBulkDelete = async () => {
    try {
      for (const id of selectedIds) {
        await api.deleteLoan(id);
      }
      setState({ ...state, loans: state.loans.filter(l => !selectedIds.has(l.id)) });
      setSelectedIds(new Set());
    } catch {
      // ignore
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.deleteLoan(id);
      setState({ ...state, loans: state.loans.filter(l => l.id !== id) });
    } catch {
      // ignore
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
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
            { label: t('loans.total_debt'), value: formatCurrency(totalDebt), color: 'text-red-400' },
            { label: t('loans.monthly_payments'), value: formatCurrency(totalMonthly), color: 'text-violet-400' },
            { label: t('loans.active_loans'), value: String(activeCount), color: 'text-emerald-400' },
          ].map(s => (
            <div key={s.label}>
              <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">{s.label}</p>
              <p className={cn('text-2xl font-semibold', s.color)}>{s.value}</p>
            </div>
          ))}
        </div>
        <button onClick={openAdd} className="bg-violet-500 hover:bg-violet-400 text-white rounded-lg h-10 px-5 text-sm font-medium inline-flex items-center gap-2">
          <Plus size={16} />
          {t('loans.add')}
        </button>
      </div>

      {/* Bulk Actions */}
      <BulkActions
        selectedCount={selectedIds.size}
        selectedIds={Array.from(selectedIds)}
        onDelete={handleBulkDelete}
        onDeselect={() => setSelectedIds(new Set())}
        recordType="loans"
        vehicles={state.vehicles}
        onComplete={async () => {
          const loans = await api.getLoans();
          setState({ ...state, loans });
          setSelectedIds(new Set());
        }}
      />

      {/* Loan cards */}
      <div className="space-y-5">
        {state.loans.length === 0 && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 text-center">
            <p className="text-sm text-zinc-500">{t('loans.no_loans')}</p>
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
              className={cn(
                "bg-zinc-900 border rounded-xl overflow-hidden",
                selectedIds.has(loan.id) ? 'border-violet-500' : 'border-zinc-800'
              )}
            >
              <div className="p-6">
                {/* Header */}
                <div className="flex items-start justify-between mb-5">
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(loan.id)}
                      onChange={() => toggleSelect(loan.id)}
                      className="mt-1.5 h-4 w-4 rounded border-zinc-700 bg-zinc-950 text-violet-500 focus:ring-violet-500/50 cursor-pointer"
                    />
                    <div>
                      <div className="flex items-center gap-3 mb-1">
                        <h3 className="text-base font-semibold text-zinc-50">{loan.name}</h3>
                        <span className="px-2.5 py-0.5 rounded-full text-xs bg-zinc-800 text-zinc-400 border border-zinc-700">
                          {vehicleName}
                        </span>
                      </div>
                      <p className="text-sm text-zinc-500">
                        {t('loans.started')} {formatDate(loan.startDate)} &middot; {loan.durationMonths} {t('loans.months')} &middot; {loan.interestRate}% {t('loans.interest')}
                      </p>
                      {(loan.tags || []).length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {(loan.tags || []).map(tag => (
                            <span key={tag} className="inline-flex items-center bg-violet-500/15 text-violet-300 text-xs px-2 py-0.5 rounded-md">
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
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
                      <p className="text-xs text-zinc-500 mb-0.5">{t('common.total')}</p>
                      <p className="text-sm font-medium text-zinc-50">{formatCurrency(loan.totalAmount)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-zinc-500 mb-0.5">{t('loans.paid')}</p>
                      <p className="text-sm font-medium text-emerald-400">{formatCurrency(progress.paid)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-zinc-500 mb-0.5">{t('loans.remaining')}</p>
                      <p className="text-sm font-medium text-red-400">{formatCurrency(progress.remaining)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-zinc-500 mb-0.5">{t('common.monthly')}</p>
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
                    <span className="text-xs text-zinc-500">{progress.monthsElapsed} {t('loans.months_elapsed')}</span>
                    <span className="text-xs text-zinc-500">{Math.max(0, loan.durationMonths - progress.monthsElapsed)} {t('loans.months_remaining')}</span>
                  </div>
                </div>

                {/* Expand toggle */}
                <button
                  onClick={() => setExpandedId(isExpanded ? null : loan.id)}
                  className="mt-4 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-lg h-9 px-3 text-sm inline-flex items-center gap-1.5 transition-colors"
                >
                  <ChevronDown size={14} className={cn('transition-transform', isExpanded && 'rotate-180')} />
                  {isExpanded ? t('loans.hide_details') : t('loans.show_details')}
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
                        <h4 className="text-sm font-medium text-zinc-50 mb-4">{t('loans.repayment_schedule')}</h4>
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
                              <Area type="monotone" dataKey="remainingDebt" name={t('loans.remaining_debt')} stroke="#f87171" fill="#f87171" fillOpacity={0.1} />
                              <Area type="monotone" dataKey="totalSaved" name={t('savings.title')} stroke="#34d399" fill="#34d399" fillOpacity={0.1} />
                            </AreaChart>
                          </ResponsiveContainer>
                        </div>
                      </div>

                      {/* Schedule table */}
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead className="bg-zinc-950/50">
                            <tr>
                              <th className="px-4 py-3 text-xs text-zinc-500 uppercase tracking-wider text-left">{t('schedule.nr')}</th>
                              <th className="px-4 py-3 text-xs text-zinc-500 uppercase tracking-wider text-left">{t('schedule.date')}</th>
                              <th className="px-4 py-3 text-xs text-zinc-500 uppercase tracking-wider text-right">{t('schedule.payment')}</th>
                              <th className="px-4 py-3 text-xs text-zinc-500 uppercase tracking-wider text-right">{t('schedule.principal')}</th>
                              <th className="px-4 py-3 text-xs text-zinc-500 uppercase tracking-wider text-right">{t('schedule.savings')}</th>
                              <th className="px-4 py-3 text-xs text-zinc-500 uppercase tracking-wider text-right">{t('schedule.remaining')}</th>
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
            <h3 className="text-sm font-medium text-zinc-50">{t('loans.loan_summary')}</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-zinc-950/50">
                <tr>
                  <th className="px-4 py-3 text-xs text-zinc-500 uppercase tracking-wider text-left">{t('common.name')}</th>
                  <th className="px-4 py-3 text-xs text-zinc-500 uppercase tracking-wider text-left">{t('common.vehicle')}</th>
                  <th className="px-4 py-3 text-xs text-zinc-500 uppercase tracking-wider text-right">{t('common.total')}</th>
                  <th className="px-4 py-3 text-xs text-zinc-500 uppercase tracking-wider text-right">{t('common.monthly')}</th>
                  <th className="px-4 py-3 text-xs text-zinc-500 uppercase tracking-wider text-right">{t('loans.remaining')}</th>
                  <th className="px-4 py-3 text-xs text-zinc-500 uppercase tracking-wider text-right">{t('loans.progress')}</th>
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
                  <td className="px-4 py-3.5 text-sm text-zinc-50 font-semibold">{t('common.total')}</td>
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
        title={editing ? t('loans.edit') : t('loans.add')}
        size="lg"
        footer={
          <>
            <button onClick={() => setModalOpen(false)} className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg h-10 px-4 text-sm">
              {t('common.cancel')}
            </button>
            <button onClick={handleSave} className="bg-violet-500 hover:bg-violet-400 text-white rounded-lg h-10 px-5 text-sm font-medium">
              {editing ? t('common.save_changes') : t('loans.add')}
            </button>
          </>
        }
      >
        <div className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-2">{t('common.vehicle')}</label>
              <select
                value={form.vehicleId}
                onChange={e => setForm({ ...form, vehicleId: e.target.value })}
                className={selectClasses}
                style={{ background: chevronBg }}
              >
                <option value="">{t('common.select_vehicle')}</option>
                {state.vehicles.map(v => (
                  <option key={v.id} value={v.id}>{v.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-2">{t('common.name')}</label>
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
              <label className="block text-sm font-medium text-zinc-400 mb-2">{t('loans.total_amount')}</label>
              <input
                type="number"
                value={form.totalAmount || ''}
                onChange={e => setForm({ ...form, totalAmount: parseFloat(e.target.value) || 0 })}
                placeholder="0.00"
                className="w-full h-10 bg-zinc-950 border border-zinc-800 rounded-lg px-3 text-sm text-zinc-50 placeholder:text-zinc-600 outline-none focus:border-violet-500/50"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-2">{t('loans.monthly_payment')}</label>
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
              <label className="block text-sm font-medium text-zinc-400 mb-2">{t('loans.interest_rate')}</label>
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
              <label className="block text-sm font-medium text-zinc-400 mb-2">{t('loans.duration')}</label>
              <input
                type="number"
                value={form.durationMonths || ''}
                onChange={e => setForm({ ...form, durationMonths: parseInt(e.target.value) || 0 })}
                placeholder="12"
                className="w-full h-10 bg-zinc-950 border border-zinc-800 rounded-lg px-3 text-sm text-zinc-50 placeholder:text-zinc-600 outline-none focus:border-violet-500/50"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-2">{t('loans.extra_savings')}</label>
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
            <label className="block text-sm font-medium text-zinc-400 mb-2">{t('common.start_date')}</label>
            <input
              type="date"
              value={form.startDate}
              onChange={e => setForm({ ...form, startDate: e.target.value })}
              className="w-full h-10 bg-zinc-950 border border-zinc-800 rounded-lg px-3 text-sm text-zinc-50 placeholder:text-zinc-600 outline-none focus:border-violet-500/50"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-2">{t('common.tags')}</label>
            <TagInput
              tags={form.tags || []}
              onChange={tags => setForm({ ...form, tags })}
              suggestions={allTags}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-2">{t('common.notes')}</label>
            <textarea
              value={form.notes}
              onChange={e => setForm({ ...form, notes: e.target.value })}
              placeholder={t('common.optional_notes')}
              className="w-full min-h-[100px] h-auto bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2.5 text-sm text-zinc-50 placeholder:text-zinc-600 outline-none focus:border-violet-500/50 resize-none"
            />
          </div>

          <ExtraFields
            recordType="loan"
            values={extraFieldValues}
            onChange={setExtraFieldValues}
            definitions={extraFieldDefs}
          />
        </div>
      </Modal>
    </div>
  );
}
