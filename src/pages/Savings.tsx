import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Pencil, Trash2, ChevronDown, ArrowUpRight, ArrowDownLeft } from 'lucide-react';
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
import { formatCurrency, formatDate, getSavingsBalance, getSavingsProgress } from '../utils';
import { addMonths, format, parseISO } from 'date-fns';
import type { AppState, SavingsGoal, SavingsTransaction } from '../types';

interface Props {
  state: AppState;
  setState: (s: AppState) => void;
}

const emptyGoal: Omit<SavingsGoal, 'id' | 'createdAt'> = {
  vehicleId: '',
  name: '',
  targetAmount: 0,
  monthlyContribution: 0,
  startDate: '',
  notes: '',
  tags: [],
};

const emptyTransaction: Omit<SavingsTransaction, 'id'> = {
  savingsGoalId: '',
  date: '',
  amount: 0,
  type: 'deposit',
  description: '',
};

export default function Savings({ state, setState }: Props) {
  const { t } = useI18n();
  const extraFieldDefs = useExtraFields();
  const { fmtDistance } = useUnits();
  const [goalModalOpen, setGoalModalOpen] = useState(false);
  const [txnModalOpen, setTxnModalOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<SavingsGoal | null>(null);
  const [goalForm, setGoalForm] = useState(emptyGoal);
  const [extraFieldValues, setExtraFieldValues] = useState<Record<string, string>>({});
  const [txnForm, setTxnForm] = useState(emptyTransaction);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const allTags = useMemo(() => [...new Set(state.savingsGoals.flatMap(g => g.tags || []))], [state.savingsGoals]);

  const totalSaved = useMemo(
    () => state.savingsGoals.reduce((sum, g) => sum + Math.max(0, getSavingsBalance(g, state.savingsTransactions)), 0),
    [state.savingsGoals, state.savingsTransactions]
  );
  const totalTarget = useMemo(
    () => state.savingsGoals.reduce((sum, g) => sum + g.targetAmount, 0),
    [state.savingsGoals]
  );

  const getVehicleName = (id: string) => state.vehicles.find(v => v.id === id)?.name || '-';

  const openAddGoal = () => {
    setEditingGoal(null);
    setGoalForm({ ...emptyGoal, vehicleId: state.vehicles[0]?.id || '' });
    setExtraFieldValues({});
    setGoalModalOpen(true);
  };

  const openEditGoal = (goal: SavingsGoal) => {
    setEditingGoal(goal);
    setGoalForm({
      vehicleId: goal.vehicleId,
      name: goal.name,
      targetAmount: goal.targetAmount,
      monthlyContribution: goal.monthlyContribution,
      startDate: goal.startDate,
      notes: goal.notes,
      tags: goal.tags || [],
    });
    setExtraFieldValues((goal as any).extraFields || {});
    setGoalModalOpen(true);
  };

  const handleSaveGoal = async () => {
    if (!goalForm.name.trim()) return;
    const payload = { ...goalForm, extraFields: extraFieldValues };
    try {
      if (editingGoal) {
        const updated = await api.updateSavingsGoal(editingGoal.id, payload);
        setState({
          ...state,
          savingsGoals: state.savingsGoals.map(g =>
            g.id === editingGoal.id ? updated : g
          ),
        });
      } else {
        const newGoal = await api.createSavingsGoal(payload);
        setState({ ...state, savingsGoals: [...state.savingsGoals, newGoal] });
      }
      setGoalModalOpen(false);
    } catch {
      // ignore
    }
  };

  const handleDeleteGoal = async (id: string) => {
    try {
      await api.deleteSavingsGoal(id);
      setState({
        ...state,
        savingsGoals: state.savingsGoals.filter(g => g.id !== id),
        savingsTransactions: state.savingsTransactions.filter(t => t.savingsGoalId !== id),
      });
    } catch {
      // ignore
    }
  };

  const handleBulkDelete = async () => {
    try {
      for (const id of selectedIds) {
        await api.deleteSavingsGoal(id);
      }
      setState({
        ...state,
        savingsGoals: state.savingsGoals.filter(g => !selectedIds.has(g.id)),
        savingsTransactions: state.savingsTransactions.filter(t => !selectedIds.has(t.savingsGoalId)),
      });
      setSelectedIds(new Set());
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

  const openTxnModal = (goalId: string, type: 'deposit' | 'withdrawal') => {
    setTxnForm({
      savingsGoalId: goalId,
      date: new Date().toISOString().split('T')[0],
      amount: 0,
      type,
      description: '',
    });
    setTxnModalOpen(true);
  };

  const handleSaveTxn = async () => {
    if (txnForm.amount <= 0) return;
    try {
      const newTxn = await api.createSavingsTransaction(txnForm.savingsGoalId, txnForm);
      setState({ ...state, savingsTransactions: [...state.savingsTransactions, newTxn] });
      setTxnModalOpen(false);
    } catch {
      // ignore
    }
  };

  const handleDeleteTxn = async (id: string) => {
    try {
      await api.deleteSavingsTransaction(id);
      setState({ ...state, savingsTransactions: state.savingsTransactions.filter(t => t.id !== id) });
    } catch {
      // ignore
    }
  };

  // Projection chart data
  const projectionData = useMemo(() => {
    if (state.savingsGoals.length === 0) return [];
    const months = 24;
    const data: { month: string; total: number }[] = [];
    const now = new Date();
    for (let i = 0; i <= months; i++) {
      const date = addMonths(now, i);
      let total = 0;
      for (const goal of state.savingsGoals) {
        const balance = getSavingsBalance(goal, state.savingsTransactions);
        total += Math.max(0, balance + goal.monthlyContribution * i);
      }
      data.push({ month: format(date, 'MMM yy'), total });
    }
    return data;
  }, [state.savingsGoals, state.savingsTransactions]);

  const selectClasses = "w-full h-10 bg-zinc-950 border border-zinc-800 rounded-lg px-3 text-sm text-zinc-50 outline-none focus:border-violet-500/50 appearance-none";
  const chevronBg = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%2371717a' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E") no-repeat right 10px center`;

  return (
    <div className="space-y-8">
      {/* Stats + Add */}
      <div className="flex items-start justify-between">
        <div className="grid grid-cols-3 gap-6">
          {[
            { label: t('savings.total_saved'), value: formatCurrency(totalSaved), color: 'text-emerald-400' },
            { label: t('savings.total_target'), value: formatCurrency(totalTarget), color: 'text-violet-400' },
            { label: t('savings.goals'), value: String(state.savingsGoals.length), color: 'text-sky-400' },
          ].map(s => (
            <div key={s.label}>
              <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">{s.label}</p>
              <p className={cn('text-2xl font-semibold', s.color)}>{s.value}</p>
            </div>
          ))}
        </div>
        <button onClick={openAddGoal} className="bg-violet-500 hover:bg-violet-400 text-white rounded-lg h-10 px-5 text-sm font-medium inline-flex items-center gap-2">
          <Plus size={16} />
          {t('savings.add_goal')}
        </button>
      </div>

      {/* Bulk Actions */}
      <BulkActions
        selectedCount={selectedIds.size}
        selectedIds={Array.from(selectedIds)}
        onDelete={handleBulkDelete}
        onDeselect={() => setSelectedIds(new Set())}
        vehicles={state.vehicles}
        onComplete={async () => {
          const savingsGoals = await api.getSavingsGoals();
          setState({ ...state, savingsGoals });
          setSelectedIds(new Set());
        }}
      />

      {/* Goals grid */}
      {state.savingsGoals.length === 0 ? (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 text-center">
          <p className="text-sm text-zinc-500">{t('savings.no_goals')}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {state.savingsGoals.map(goal => {
            const balance = Math.max(0, getSavingsBalance(goal, state.savingsTransactions));
            const progress = getSavingsProgress(goal, state.savingsTransactions);
            const goalTxns = state.savingsTransactions
              .filter(t => t.savingsGoalId === goal.id)
              .sort((a, b) => b.date.localeCompare(a.date));
            const isExpanded = expandedId === goal.id;
            const vehicleName = getVehicleName(goal.vehicleId);

            return (
              <motion.div
                key={goal.id}
                layout
                className={cn(
                  "bg-zinc-900 border rounded-xl overflow-hidden",
                  selectedIds.has(goal.id) ? 'border-violet-500' : 'border-zinc-800'
                )}
              >
                <div className="p-6">
                  {/* Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(goal.id)}
                        onChange={() => toggleSelect(goal.id)}
                        className="mt-1.5 h-4 w-4 rounded border-zinc-700 bg-zinc-950 text-violet-500 focus:ring-violet-500/50 cursor-pointer"
                      />
                      <div>
                        <div className="flex items-center gap-3 mb-1">
                          <h3 className="text-base font-semibold text-zinc-50">{goal.name}</h3>
                          {goal.vehicleId && (
                            <span className="px-2.5 py-0.5 rounded-full text-xs bg-zinc-800 text-zinc-400 border border-zinc-700">
                              {vehicleName}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-zinc-500">
                          {formatCurrency(goal.monthlyContribution)}{t('unit.per_month')} &middot; {t('loans.started')} {formatDate(goal.startDate)}
                        </p>
                        {(goal.tags || []).length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1.5">
                            {(goal.tags || []).map(tag => (
                              <span key={tag} className="inline-flex items-center bg-violet-500/15 text-violet-300 text-xs px-2 py-0.5 rounded-md">
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button onClick={() => openEditGoal(goal)} className="text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-lg h-9 px-3 text-sm inline-flex items-center">
                        <Pencil size={14} />
                      </button>
                      <button onClick={() => handleDeleteGoal(goal.id)} className="text-zinc-400 hover:text-red-400 hover:bg-zinc-800 rounded-lg h-9 px-3 text-sm inline-flex items-center">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>

                  {/* Progress */}
                  <div className="mb-4">
                    <div className="flex items-end justify-between mb-2">
                      <span className="text-lg font-semibold text-emerald-400">{formatCurrency(balance)}</span>
                      <span className="text-sm text-zinc-500">{t('common.of')} {formatCurrency(goal.targetAmount)}</span>
                    </div>
                    <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                      <motion.div
                        className={cn(
                          'h-full rounded-full',
                          progress >= 100 ? 'bg-emerald-400' : 'bg-violet-500'
                        )}
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min(progress, 100)}%` }}
                        transition={{ duration: 0.6 }}
                      />
                    </div>
                    <p className="text-xs text-zinc-500 mt-1.5 text-right">{progress.toFixed(1)}%</p>
                  </div>

                  {/* Action buttons */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => openTxnModal(goal.id, 'deposit')}
                      className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg h-10 px-4 text-sm inline-flex items-center gap-1.5 flex-1 justify-center"
                    >
                      <ArrowDownLeft size={14} className="text-emerald-400" />
                      {t('savings.deposit')}
                    </button>
                    <button
                      onClick={() => openTxnModal(goal.id, 'withdrawal')}
                      className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg h-10 px-4 text-sm inline-flex items-center gap-1.5 flex-1 justify-center"
                    >
                      <ArrowUpRight size={14} className="text-red-400" />
                      {t('savings.withdraw')}
                    </button>
                  </div>

                  {/* Expand */}
                  {goalTxns.length > 0 && (
                    <button
                      onClick={() => setExpandedId(isExpanded ? null : goal.id)}
                      className="mt-3 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-lg h-9 px-3 text-sm inline-flex items-center gap-1.5 transition-colors"
                    >
                      <ChevronDown size={14} className={cn('transition-transform', isExpanded && 'rotate-180')} />
                      {goalTxns.length} {goalTxns.length !== 1 ? t('savings.transactions') : t('savings.transaction')}
                    </button>
                  )}
                </div>

                {/* Expanded transactions */}
                <AnimatePresence>
                  {isExpanded && goalTxns.length > 0 && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3 }}
                      className="overflow-hidden"
                    >
                      <div className="border-t border-zinc-800">
                        {goalTxns.map(txn => (
                          <div
                            key={txn.id}
                            className="flex items-center justify-between px-6 py-3 border-b border-zinc-800/50 last:border-b-0 hover:bg-zinc-800/30 transition-colors"
                          >
                            <div className="flex items-center gap-3">
                              <div className={cn(
                                'w-8 h-8 rounded-full flex items-center justify-center',
                                txn.type === 'deposit' ? 'bg-emerald-400/10' : 'bg-red-400/10'
                              )}>
                                {txn.type === 'deposit' ? (
                                  <ArrowDownLeft size={14} className="text-emerald-400" />
                                ) : (
                                  <ArrowUpRight size={14} className="text-red-400" />
                                )}
                              </div>
                              <div>
                                <p className="text-sm text-zinc-50">{txn.description || (txn.type === 'deposit' ? t('savings.deposit') : t('savings.withdrawal'))}</p>
                                <p className="text-xs text-zinc-500">{formatDate(txn.date)}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className={cn(
                                'text-sm font-medium',
                                txn.type === 'deposit' ? 'text-emerald-400' : 'text-red-400'
                              )}>
                                {txn.type === 'deposit' ? '+' : '-'}{formatCurrency(txn.amount)}
                              </span>
                              <button
                                onClick={() => handleDeleteTxn(txn.id)}
                                className="text-zinc-400 hover:text-red-400 hover:bg-zinc-800 rounded-lg h-9 px-3 text-sm inline-flex items-center"
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Projection chart */}
      {projectionData.length > 0 && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
          <h3 className="text-sm font-medium text-zinc-50 mb-5">{t('savings.projection')}</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={projectionData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                <XAxis
                  dataKey="month"
                  tick={{ fontSize: 11, fill: '#71717a' }}
                  axisLine={{ stroke: '#3f3f46' }}
                  tickLine={false}
                  interval="preserveStartEnd"
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
                <defs>
                  <linearGradient id="savingsGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <Area type="monotone" dataKey="total" name={t('savings.total_savings')} stroke="#8b5cf6" fill="url(#savingsGrad)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Goal Modal */}
      <Modal
        isOpen={goalModalOpen}
        onClose={() => setGoalModalOpen(false)}
        title={editingGoal ? t('savings.edit_goal') : t('savings.new_goal')}
        size="lg"
        footer={
          <>
            <button onClick={() => setGoalModalOpen(false)} className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg h-10 px-4 text-sm">
              {t('common.cancel')}
            </button>
            <button onClick={handleSaveGoal} className="bg-violet-500 hover:bg-violet-400 text-white rounded-lg h-10 px-5 text-sm font-medium">
              {editingGoal ? t('common.save_changes') : t('savings.create_goal')}
            </button>
          </>
        }
      >
        <div className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-2">{t('common.name')}</label>
              <input
                type="text"
                value={goalForm.name}
                onChange={e => setGoalForm({ ...goalForm, name: e.target.value })}
                placeholder="e.g. New Tires"
                className="w-full h-10 bg-zinc-950 border border-zinc-800 rounded-lg px-3 text-sm text-zinc-50 placeholder:text-zinc-600 outline-none focus:border-violet-500/50"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-2">{t('common.vehicle')}</label>
              <select
                value={goalForm.vehicleId}
                onChange={e => setGoalForm({ ...goalForm, vehicleId: e.target.value })}
                className={selectClasses}
                style={{ background: chevronBg }}
              >
                <option value="">{t('common.no_vehicle')}</option>
                {state.vehicles.map(v => (
                  <option key={v.id} value={v.id}>{v.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-2">{t('savings.target_amount')}</label>
              <input
                type="number"
                value={goalForm.targetAmount || ''}
                onChange={e => setGoalForm({ ...goalForm, targetAmount: parseFloat(e.target.value) || 0 })}
                placeholder="0.00"
                className="w-full h-10 bg-zinc-950 border border-zinc-800 rounded-lg px-3 text-sm text-zinc-50 placeholder:text-zinc-600 outline-none focus:border-violet-500/50"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-2">{t('savings.monthly_contribution')}</label>
              <input
                type="number"
                value={goalForm.monthlyContribution || ''}
                onChange={e => setGoalForm({ ...goalForm, monthlyContribution: parseFloat(e.target.value) || 0 })}
                placeholder="0.00"
                className="w-full h-10 bg-zinc-950 border border-zinc-800 rounded-lg px-3 text-sm text-zinc-50 placeholder:text-zinc-600 outline-none focus:border-violet-500/50"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-2">{t('common.start_date')}</label>
            <input
              type="date"
              value={goalForm.startDate}
              onChange={e => setGoalForm({ ...goalForm, startDate: e.target.value })}
              className="w-full h-10 bg-zinc-950 border border-zinc-800 rounded-lg px-3 text-sm text-zinc-50 placeholder:text-zinc-600 outline-none focus:border-violet-500/50"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-2">{t('common.tags')}</label>
            <TagInput
              tags={goalForm.tags || []}
              onChange={tags => setGoalForm({ ...goalForm, tags })}
              suggestions={allTags}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-2">{t('common.notes')}</label>
            <textarea
              value={goalForm.notes}
              onChange={e => setGoalForm({ ...goalForm, notes: e.target.value })}
              placeholder={t('common.optional_notes')}
              className="w-full min-h-[100px] h-auto bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2.5 text-sm text-zinc-50 placeholder:text-zinc-600 outline-none focus:border-violet-500/50 resize-none"
            />
          </div>

          <ExtraFields
            recordType="savings"
            values={extraFieldValues}
            onChange={setExtraFieldValues}
            definitions={extraFieldDefs}
          />
        </div>
      </Modal>

      {/* Transaction Modal */}
      <Modal
        isOpen={txnModalOpen}
        onClose={() => setTxnModalOpen(false)}
        title={txnForm.type === 'deposit' ? t('savings.add_deposit') : t('savings.add_withdrawal')}
        size="sm"
        footer={
          <>
            <button onClick={() => setTxnModalOpen(false)} className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg h-10 px-4 text-sm">
              {t('common.cancel')}
            </button>
            <button onClick={handleSaveTxn} className="bg-violet-500 hover:bg-violet-400 text-white rounded-lg h-10 px-5 text-sm font-medium">
              {txnForm.type === 'deposit' ? t('savings.deposit') : t('savings.withdraw')}
            </button>
          </>
        }
      >
        <div className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-2">{t('common.amount')}</label>
            <input
              type="number"
              value={txnForm.amount || ''}
              onChange={e => setTxnForm({ ...txnForm, amount: parseFloat(e.target.value) || 0 })}
              placeholder="0.00"
              className="w-full h-10 bg-zinc-950 border border-zinc-800 rounded-lg px-3 text-sm text-zinc-50 placeholder:text-zinc-600 outline-none focus:border-violet-500/50"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-2">{t('common.date')}</label>
            <input
              type="date"
              value={txnForm.date}
              onChange={e => setTxnForm({ ...txnForm, date: e.target.value })}
              className="w-full h-10 bg-zinc-950 border border-zinc-800 rounded-lg px-3 text-sm text-zinc-50 placeholder:text-zinc-600 outline-none focus:border-violet-500/50"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-2">{t('common.description')}</label>
            <input
              type="text"
              value={txnForm.description}
              onChange={e => setTxnForm({ ...txnForm, description: e.target.value })}
              placeholder={t('common.optional_description')}
              className="w-full h-10 bg-zinc-950 border border-zinc-800 rounded-lg px-3 text-sm text-zinc-50 placeholder:text-zinc-600 outline-none focus:border-violet-500/50"
            />
          </div>
        </div>
      </Modal>
    </div>
  );
}
