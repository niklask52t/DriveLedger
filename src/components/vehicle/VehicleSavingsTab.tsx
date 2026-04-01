import { ArrowRight, PiggyBank } from 'lucide-react';
import { formatCurrency, getSavingsBalance, getSavingsProgress } from '../../utils';
import { useI18n } from '../../contexts/I18nContext';
import type { SavingsGoal, SavingsTransaction, Page } from '../../types';

interface VehicleSavingsTabProps {
  vehicleSavings: SavingsGoal[];
  savingsTransactions: SavingsTransaction[];
  onNavigate: (page: Page) => void;
}

export default function VehicleSavingsTab({ vehicleSavings, savingsTransactions, onNavigate }: VehicleSavingsTabProps) {
  const { t } = useI18n();

  if (vehicleSavings.length === 0) {
    return (
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 text-center">
        <PiggyBank size={32} className="mx-auto text-zinc-600 mb-3" />
        <p className="text-zinc-500 text-sm mb-4">{t('vehicle_tab.savings.no_savings')}</p>
        <button
          onClick={() => onNavigate('savings')}
          className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg h-10 px-4 text-sm inline-flex items-center gap-2 transition-colors"
        >
          {t('vehicle_tab.savings.go_to_savings')}
          <ArrowRight size={14} />
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {vehicleSavings.map((goal) => {
        const balance = getSavingsBalance(goal, savingsTransactions);
        const progress = getSavingsProgress(goal, savingsTransactions);
        const isComplete = progress >= 100;

        return (
          <div key={goal.id} className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-sm font-semibold text-zinc-50">{goal.name}</h3>
                <p className="text-xs text-zinc-500 mt-1">
                  {formatCurrency(goal.monthlyContribution)}{t('unit.per_month')} {t('vehicle_tab.savings.contribution')}
                </p>
              </div>
              <span
                className={`text-xs font-medium ${isComplete ? 'text-emerald-400' : 'text-violet-400'}`}
              >
                {progress.toFixed(1)}%
              </span>
            </div>

            {/* Progress bar */}
            <div className="h-2 bg-zinc-800 rounded-full mb-3">
              <div
                className={`h-full rounded-full transition-all duration-500 ${isComplete ? 'bg-emerald-400' : 'bg-violet-500'}`}
                style={{ width: `${Math.min(100, progress)}%` }}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
              <div>
                <p className="text-xs text-zinc-500 mb-1">{t('vehicle_tab.savings.target')}</p>
                <p className="text-sm font-medium text-zinc-50">{formatCurrency(goal.targetAmount)}</p>
              </div>
              <div>
                <p className="text-xs text-zinc-500 mb-1">{t('vehicle_tab.savings.saved')}</p>
                <p className="text-sm font-medium text-emerald-400">{formatCurrency(balance)}</p>
              </div>
              <div>
                <p className="text-xs text-zinc-500 mb-1">{t('vehicle_tab.savings.remaining')}</p>
                <p className="text-sm font-medium text-zinc-50">
                  {formatCurrency(Math.max(0, goal.targetAmount - balance))}
                </p>
              </div>
            </div>

            {goal.notes && (
              <div className="mt-3 pt-3 border-t border-zinc-800">
                <p className="text-xs text-zinc-500">{goal.notes}</p>
              </div>
            )}
          </div>
        );
      })}

      <div className="flex justify-end">
        <button
          onClick={() => onNavigate('savings')}
          className="text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-lg h-9 px-3 text-sm inline-flex items-center gap-2 transition-colors"
        >
          {t('vehicle_tab.savings.view_all')}
          <ArrowRight size={14} />
        </button>
      </div>
    </div>
  );
}
