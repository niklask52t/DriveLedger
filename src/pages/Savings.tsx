import { useState, useMemo } from 'react';
import {
  PiggyBank, Plus, Trash2, Edit3, ChevronDown, ChevronUp,
  ArrowUpCircle, ArrowDownCircle, Target, Calendar, TrendingUp, Wallet
} from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { addMonths, format, parseISO, differenceInMonths } from 'date-fns';
import Modal from '../components/Modal';
import { formatCurrency, formatDate, getSavingsBalance, getSavingsProgress } from '../utils';
import type { AppState, SavingsGoal, SavingsTransaction } from '../types';

interface SavingsProps {
  state: AppState;
  setState: (state: AppState) => void;
}

const inputClass = 'w-full bg-dark-900 border border-dark-600 rounded-lg px-3 py-2 text-dark-100 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none';

const emptyGoal: Omit<SavingsGoal, 'id' | 'createdAt'> = {
  vehicleId: '',
  name: '',
  targetAmount: 0,
  monthlyContribution: 0,
  startDate: new Date().toISOString().split('T')[0],
  notes: '',
};

const emptyTransaction: Omit<SavingsTransaction, 'id' | 'savingsGoalId'> = {
  date: new Date().toISOString().split('T')[0],
  amount: 0,
  type: 'deposit',
  description: '',
};

export default function Savings({ state, setState }: SavingsProps) {
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [showTxnModal, setShowTxnModal] = useState(false);
  const [editingGoal, setEditingGoal] = useState<SavingsGoal | null>(null);
  const [goalForm, setGoalForm] = useState(emptyGoal);
  const [txnForm, setTxnForm] = useState(emptyTransaction);
  const [txnGoalId, setTxnGoalId] = useState('');
  const [expandedGoals, setExpandedGoals] = useState<Set<string>>(new Set());
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const vehicles = state.vehicles;
  const goals = state.savingsGoals;
  const transactions = state.savingsTransactions;

  // Overview stats
  const totalSaved = useMemo(
    () => goals.reduce((sum, g) => sum + getSavingsBalance(g, transactions), 0),
    [goals, transactions]
  );
  const totalTarget = useMemo(
    () => goals.reduce((sum, g) => sum + g.targetAmount, 0),
    [goals]
  );

  // Savings projection chart data
  const projectionData = useMemo(() => {
    if (goals.length === 0) return [];
    const data: { month: string; balance: number }[] = [];
    const now = new Date();
    for (let i = 0; i <= 24; i++) {
      const date = addMonths(now, i);
      let total = 0;
      for (const g of goals) {
        const start = parseISO(g.startDate);
        const monthsFromStart = Math.max(0, differenceInMonths(date, start));
        const autoContrib = monthsFromStart * g.monthlyContribution;
        const goalTxns = transactions.filter(t => t.savingsGoalId === g.id);
        const txnTotal = goalTxns.reduce((s, t) => s + (t.type === 'deposit' ? t.amount : -t.amount), 0);
        total += Math.min(g.targetAmount, autoContrib + txnTotal);
      }
      data.push({ month: format(date, 'MMM yy'), balance: Math.round(total * 100) / 100 });
    }
    return data;
  }, [goals, transactions]);

  // Helpers
  const getVehicleName = (id: string) => vehicles.find(v => v.id === id)?.name || 'General';

  const getEstimatedCompletion = (goal: SavingsGoal): string => {
    const balance = getSavingsBalance(goal, transactions);
    const remaining = goal.targetAmount - balance;
    if (remaining <= 0) return 'Reached!';
    if (goal.monthlyContribution <= 0) return 'N/A';
    const monthsLeft = Math.ceil(remaining / goal.monthlyContribution);
    const completionDate = addMonths(new Date(), monthsLeft);
    return format(completionDate, 'MMM yyyy');
  };

  const toggleExpanded = (id: string) => {
    setExpandedGoals(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Goal CRUD
  const openAddGoal = () => {
    setEditingGoal(null);
    setGoalForm(emptyGoal);
    setShowGoalModal(true);
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
    });
    setShowGoalModal(true);
  };

  const saveGoal = () => {
    if (!goalForm.name.trim()) return;
    if (editingGoal) {
      setState({
        ...state,
        savingsGoals: goals.map(g =>
          g.id === editingGoal.id ? { ...g, ...goalForm } : g
        ),
      });
    } else {
      const newGoal: SavingsGoal = {
        ...goalForm,
        id: uuidv4(),
        createdAt: new Date().toISOString(),
      };
      setState({ ...state, savingsGoals: [...goals, newGoal] });
    }
    setShowGoalModal(false);
  };

  const deleteGoal = (id: string) => {
    setState({
      ...state,
      savingsGoals: goals.filter(g => g.id !== id),
      savingsTransactions: transactions.filter(t => t.savingsGoalId !== id),
    });
    setDeleteConfirm(null);
  };

  // Transaction CRUD
  const openAddTxn = (goalId: string, type: 'deposit' | 'withdrawal') => {
    setTxnGoalId(goalId);
    setTxnForm({ ...emptyTransaction, type });
    setShowTxnModal(true);
  };

  const saveTxn = () => {
    if (txnForm.amount <= 0) return;
    const newTxn: SavingsTransaction = {
      ...txnForm,
      id: uuidv4(),
      savingsGoalId: txnGoalId,
    };
    setState({ ...state, savingsTransactions: [...transactions, newTxn] });
    setShowTxnModal(false);
  };

  const deleteTxn = (id: string) => {
    setState({ ...state, savingsTransactions: transactions.filter(t => t.id !== id) });
  };

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-dark-800 border border-dark-700 rounded-xl p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2.5 rounded-lg bg-emerald-500/15">
              <Wallet size={20} className="text-emerald-400" />
            </div>
            <span className="text-sm text-dark-400">Total Saved</span>
          </div>
          <p className="text-2xl font-bold text-dark-50">{formatCurrency(totalSaved)}</p>
          {totalTarget > 0 && (
            <div className="mt-2">
              <div className="w-full h-1.5 bg-dark-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-500 rounded-full transition-all"
                  style={{ width: `${Math.min(100, (totalSaved / totalTarget) * 100)}%` }}
                />
              </div>
              <p className="text-xs text-dark-500 mt-1">{((totalSaved / totalTarget) * 100).toFixed(1)}% of target</p>
            </div>
          )}
        </div>

        <div className="bg-dark-800 border border-dark-700 rounded-xl p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2.5 rounded-lg bg-blue-500/15">
              <Target size={20} className="text-blue-400" />
            </div>
            <span className="text-sm text-dark-400">Total Target</span>
          </div>
          <p className="text-2xl font-bold text-dark-50">{formatCurrency(totalTarget)}</p>
          <p className="text-xs text-dark-500 mt-1">{formatCurrency(totalTarget - totalSaved)} remaining</p>
        </div>

        <div className="bg-dark-800 border border-dark-700 rounded-xl p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2.5 rounded-lg bg-purple-500/15">
              <PiggyBank size={20} className="text-purple-400" />
            </div>
            <span className="text-sm text-dark-400">Savings Goals</span>
          </div>
          <p className="text-2xl font-bold text-dark-50">{goals.length}</p>
          <p className="text-xs text-dark-500 mt-1">
            {goals.filter(g => getSavingsProgress(g, transactions) >= 100).length} completed
          </p>
        </div>
      </div>

      {/* Add Goal Button */}
      <div className="flex justify-end">
        <button
          onClick={openAddGoal}
          className="flex items-center gap-2 px-4 py-2.5 bg-primary-600 hover:bg-primary-500 text-white rounded-lg font-medium text-sm transition-colors cursor-pointer"
        >
          <Plus size={18} />
          Add Savings Goal
        </button>
      </div>

      {/* Goals Grid */}
      {goals.length === 0 ? (
        <div className="text-center py-16 text-dark-500">
          <PiggyBank size={48} className="mx-auto mb-4 opacity-40" />
          <p className="text-lg">No savings goals yet</p>
          <p className="text-sm mt-1">Create your first savings goal to start tracking</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {goals.map(goal => {
            const balance = getSavingsBalance(goal, transactions);
            const progress = getSavingsProgress(goal, transactions);
            const goalTxns = transactions
              .filter(t => t.savingsGoalId === goal.id)
              .sort((a, b) => b.date.localeCompare(a.date));
            const isExpanded = expandedGoals.has(goal.id);

            return (
              <div
                key={goal.id}
                className="bg-dark-800 border border-dark-700 rounded-xl overflow-hidden"
              >
                <div className="p-5">
                  {/* Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="font-semibold text-dark-50 text-lg">{goal.name}</h3>
                      <p className="text-sm text-dark-400 mt-0.5">{getVehicleName(goal.vehicleId)}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => openEditGoal(goal)}
                        className="p-1.5 rounded-lg text-dark-400 hover:text-dark-200 hover:bg-dark-700 transition-colors cursor-pointer"
                        title="Edit"
                      >
                        <Edit3 size={16} />
                      </button>
                      {deleteConfirm === goal.id ? (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => deleteGoal(goal.id)}
                            className="px-2 py-1 text-xs bg-red-600 text-white rounded cursor-pointer"
                          >
                            Confirm
                          </button>
                          <button
                            onClick={() => setDeleteConfirm(null)}
                            className="px-2 py-1 text-xs bg-dark-700 text-dark-300 rounded cursor-pointer"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setDeleteConfirm(goal.id)}
                          className="p-1.5 rounded-lg text-dark-400 hover:text-red-400 hover:bg-dark-700 transition-colors cursor-pointer"
                          title="Delete"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="mb-4">
                    <div className="flex justify-between text-sm mb-1.5">
                      <span className="text-dark-300">{formatCurrency(balance)}</span>
                      <span className="text-dark-400">{formatCurrency(goal.targetAmount)}</span>
                    </div>
                    <div className="w-full h-3 bg-dark-700 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          progress >= 100
                            ? 'bg-emerald-500'
                            : progress >= 50
                              ? 'bg-blue-500'
                              : 'bg-primary-500'
                        }`}
                        style={{ width: `${Math.min(100, progress)}%` }}
                      />
                    </div>
                    <p className="text-xs text-dark-500 mt-1 text-right">{progress.toFixed(1)}%</p>
                  </div>

                  {/* Info Grid */}
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="flex items-center gap-2 text-dark-400">
                      <TrendingUp size={14} className="text-emerald-400" />
                      <span>{formatCurrency(goal.monthlyContribution)}/mo</span>
                    </div>
                    <div className="flex items-center gap-2 text-dark-400">
                      <Calendar size={14} className="text-blue-400" />
                      <span>{getEstimatedCompletion(goal)}</span>
                    </div>
                  </div>

                  {/* Quick Actions */}
                  <div className="flex gap-2 mt-4">
                    <button
                      onClick={() => openAddTxn(goal.id, 'deposit')}
                      className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-emerald-600/15 text-emerald-400 rounded-lg text-sm font-medium hover:bg-emerald-600/25 transition-colors cursor-pointer"
                    >
                      <ArrowUpCircle size={16} />
                      Deposit
                    </button>
                    <button
                      onClick={() => openAddTxn(goal.id, 'withdrawal')}
                      className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-red-600/15 text-red-400 rounded-lg text-sm font-medium hover:bg-red-600/25 transition-colors cursor-pointer"
                    >
                      <ArrowDownCircle size={16} />
                      Withdraw
                    </button>
                  </div>
                </div>

                {/* Transaction History (Expandable) */}
                <div className="border-t border-dark-700">
                  <button
                    onClick={() => toggleExpanded(goal.id)}
                    className="w-full flex items-center justify-between px-5 py-3 text-sm text-dark-400 hover:text-dark-200 hover:bg-dark-850 transition-colors cursor-pointer"
                  >
                    <span>Transaction History ({goalTxns.length})</span>
                    {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </button>
                  {isExpanded && (
                    <div className="px-5 pb-4">
                      {goalTxns.length === 0 ? (
                        <p className="text-sm text-dark-500 py-2">No transactions yet</p>
                      ) : (
                        <div className="space-y-2 max-h-48 overflow-y-auto">
                          {goalTxns.map(txn => (
                            <div
                              key={txn.id}
                              className="flex items-center justify-between py-2 px-3 bg-dark-850 rounded-lg"
                            >
                              <div className="flex items-center gap-3">
                                <div className={`p-1 rounded-full ${
                                  txn.type === 'deposit' ? 'bg-emerald-500/15' : 'bg-red-500/15'
                                }`}>
                                  {txn.type === 'deposit'
                                    ? <ArrowUpCircle size={14} className="text-emerald-400" />
                                    : <ArrowDownCircle size={14} className="text-red-400" />
                                  }
                                </div>
                                <div>
                                  <p className="text-sm text-dark-200">{txn.description || txn.type}</p>
                                  <p className="text-xs text-dark-500">{formatDate(txn.date)}</p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className={`text-sm font-medium ${
                                  txn.type === 'deposit' ? 'text-emerald-400' : 'text-red-400'
                                }`}>
                                  {txn.type === 'deposit' ? '+' : '-'}{formatCurrency(txn.amount)}
                                </span>
                                <button
                                  onClick={() => deleteTxn(txn.id)}
                                  className="p-1 rounded text-dark-500 hover:text-red-400 transition-colors cursor-pointer"
                                >
                                  <Trash2 size={13} />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Savings Growth Projection Chart */}
      {projectionData.length > 0 && (
        <div className="bg-dark-800 border border-dark-700 rounded-xl p-5">
          <h3 className="text-lg font-semibold text-dark-50 mb-4">Savings Growth Projection (24 Months)</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={projectionData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                <defs>
                  <linearGradient id="savingsGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis
                  dataKey="month"
                  tick={{ fill: '#9ca3af', fontSize: 12 }}
                  axisLine={{ stroke: '#374151' }}
                  tickLine={{ stroke: '#374151' }}
                />
                <YAxis
                  tick={{ fill: '#9ca3af', fontSize: 12 }}
                  axisLine={{ stroke: '#374151' }}
                  tickLine={{ stroke: '#374151' }}
                  tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1f2937',
                    border: '1px solid #374151',
                    borderRadius: '8px',
                    color: '#f3f4f6',
                  }}
                  formatter={(value) => [formatCurrency(Number(value)), 'Balance']}
                />
                <Area
                  type="monotone"
                  dataKey="balance"
                  stroke="#10b981"
                  strokeWidth={2}
                  fill="url(#savingsGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Add/Edit Goal Modal */}
      <Modal
        isOpen={showGoalModal}
        onClose={() => setShowGoalModal(false)}
        title={editingGoal ? 'Edit Savings Goal' : 'New Savings Goal'}
        size="lg"
        footer={
          <div className="flex gap-2">
            <button
              onClick={() => setShowGoalModal(false)}
              className="px-4 py-2 text-sm rounded-lg bg-dark-700 text-dark-300 hover:bg-dark-600 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={saveGoal}
              className="px-4 py-2 text-sm rounded-lg bg-primary-600 text-white hover:bg-primary-500 transition-colors cursor-pointer font-medium"
            >
              {editingGoal ? 'Save Changes' : 'Create Goal'}
            </button>
          </div>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-dark-300 mb-1">Vehicle</label>
            <select
              value={goalForm.vehicleId}
              onChange={e => setGoalForm({ ...goalForm, vehicleId: e.target.value })}
              className={inputClass}
            >
              <option value="">General (no vehicle)</option>
              {vehicles.map(v => (
                <option key={v.id} value={v.id}>{v.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-dark-300 mb-1">Goal Name *</label>
            <input
              type="text"
              value={goalForm.name}
              onChange={e => setGoalForm({ ...goalForm, name: e.target.value })}
              placeholder="e.g. Down payment, New tires fund"
              className={inputClass}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-dark-300 mb-1">Target Amount</label>
              <input
                type="number"
                value={goalForm.targetAmount || ''}
                onChange={e => setGoalForm({ ...goalForm, targetAmount: parseFloat(e.target.value) || 0 })}
                placeholder="0.00"
                min="0"
                step="0.01"
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-dark-300 mb-1">Monthly Contribution</label>
              <input
                type="number"
                value={goalForm.monthlyContribution || ''}
                onChange={e => setGoalForm({ ...goalForm, monthlyContribution: parseFloat(e.target.value) || 0 })}
                placeholder="0.00"
                min="0"
                step="0.01"
                className={inputClass}
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-dark-300 mb-1">Start Date</label>
            <input
              type="date"
              value={goalForm.startDate}
              onChange={e => setGoalForm({ ...goalForm, startDate: e.target.value })}
              className={inputClass}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-dark-300 mb-1">Notes</label>
            <textarea
              value={goalForm.notes}
              onChange={e => setGoalForm({ ...goalForm, notes: e.target.value })}
              rows={3}
              placeholder="Optional notes..."
              className={inputClass + ' resize-none'}
            />
          </div>
        </div>
      </Modal>

      {/* Add Transaction Modal */}
      <Modal
        isOpen={showTxnModal}
        onClose={() => setShowTxnModal(false)}
        title={txnForm.type === 'deposit' ? 'Add Deposit' : 'Add Withdrawal'}
        size="sm"
        footer={
          <div className="flex gap-2">
            <button
              onClick={() => setShowTxnModal(false)}
              className="px-4 py-2 text-sm rounded-lg bg-dark-700 text-dark-300 hover:bg-dark-600 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={saveTxn}
              className={`px-4 py-2 text-sm rounded-lg text-white font-medium transition-colors cursor-pointer ${
                txnForm.type === 'deposit'
                  ? 'bg-emerald-600 hover:bg-emerald-500'
                  : 'bg-red-600 hover:bg-red-500'
              }`}
            >
              {txnForm.type === 'deposit' ? 'Add Deposit' : 'Add Withdrawal'}
            </button>
          </div>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-dark-300 mb-1">Type</label>
            <select
              value={txnForm.type}
              onChange={e => setTxnForm({ ...txnForm, type: e.target.value as 'deposit' | 'withdrawal' })}
              className={inputClass}
            >
              <option value="deposit">Deposit</option>
              <option value="withdrawal">Withdrawal</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-dark-300 mb-1">Amount *</label>
            <input
              type="number"
              value={txnForm.amount || ''}
              onChange={e => setTxnForm({ ...txnForm, amount: parseFloat(e.target.value) || 0 })}
              placeholder="0.00"
              min="0"
              step="0.01"
              className={inputClass}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-dark-300 mb-1">Date</label>
            <input
              type="date"
              value={txnForm.date}
              onChange={e => setTxnForm({ ...txnForm, date: e.target.value })}
              className={inputClass}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-dark-300 mb-1">Description</label>
            <input
              type="text"
              value={txnForm.description}
              onChange={e => setTxnForm({ ...txnForm, description: e.target.value })}
              placeholder="Optional description"
              className={inputClass}
            />
          </div>
        </div>
      </Modal>
    </div>
  );
}
