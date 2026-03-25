import { PiggyBank } from 'lucide-react';
import type { SavingsGoal, SavingsTransaction, Page } from '../../types';
import { formatCurrency, getSavingsBalance, getSavingsProgress } from '../../utils';

interface VehicleSavingsTabProps {
  vehicleSavings: SavingsGoal[];
  savingsTransactions: SavingsTransaction[];
  onNavigate: (page: Page) => void;
}

export default function VehicleSavingsTab({ vehicleSavings, savingsTransactions, onNavigate }: VehicleSavingsTabProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-dark-100">Savings Goals</h2>
      </div>

      {vehicleSavings.length === 0 ? (
        <div className="text-center py-12 text-dark-400">
          <PiggyBank size={40} className="mx-auto mb-3 opacity-40" />
          <p>No savings goals for this vehicle</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {vehicleSavings.map((goal) => {
            const txns = savingsTransactions.filter((t) => t.savingsGoalId === goal.id);
            const balance = getSavingsBalance(goal, txns);
            const progress = getSavingsProgress(goal, txns);
            return (
              <div
                key={goal.id}
                className="bg-dark-800 border border-dark-700 rounded-xl p-5 hover:border-dark-500 transition-colors cursor-pointer"
                onClick={() => onNavigate('savings')}
              >
                <h3 className="font-semibold text-dark-100 mb-3">{goal.name}</h3>
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-dark-400">Target</span>
                    <span className="text-dark-100 font-medium">{formatCurrency(goal.targetAmount)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-dark-400">Monthly Contribution</span>
                    <span className="text-dark-100 font-medium">{formatCurrency(goal.monthlyContribution)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-dark-400">Current Balance</span>
                    <span className="text-success font-medium">{formatCurrency(balance)}</span>
                  </div>
                  {/* Progress bar */}
                  <div>
                    <div className="flex justify-between text-xs text-dark-400 mb-1">
                      <span>{formatCurrency(balance)}</span>
                      <span>{Math.round(progress)}%</span>
                    </div>
                    <div className="w-full h-2 bg-dark-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-success rounded-full transition-all"
                        style={{ width: `${Math.min(100, progress)}%` }}
                      />
                    </div>
                    <p className="text-xs text-dark-500 mt-1">
                      {formatCurrency(Math.max(0, goal.targetAmount - balance))} remaining
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
