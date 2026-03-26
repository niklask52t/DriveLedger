import { ArrowRight, CreditCard } from 'lucide-react';
import { formatCurrency, getLoanProgress } from '../../utils';
import type { Loan, Page } from '../../types';

interface VehicleLoansTabProps {
  vehicleLoans: Loan[];
  onNavigate: (page: Page) => void;
}

export default function VehicleLoansTab({ vehicleLoans, onNavigate }: VehicleLoansTabProps) {
  if (vehicleLoans.length === 0) {
    return (
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 text-center">
        <CreditCard size={32} className="mx-auto text-zinc-600 mb-3" />
        <p className="text-zinc-500 text-sm mb-4">No loans linked to this vehicle.</p>
        <button
          onClick={() => onNavigate('loans')}
          className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg h-10 px-4 text-sm inline-flex items-center gap-2 transition-colors"
        >
          Go to Loans
          <ArrowRight size={14} />
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {vehicleLoans.map((loan) => {
        const progress = getLoanProgress(loan);
        return (
          <div key={loan.id} className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-sm font-semibold text-zinc-50">{loan.name}</h3>
                <p className="text-xs text-zinc-500 mt-1">
                  {formatCurrency(loan.monthlyPayment)}/mo &middot; {loan.interestRate}% interest
                </p>
              </div>
              <span className="text-xs font-medium text-violet-400">
                {progress.percent.toFixed(1)}% paid
              </span>
            </div>

            {/* Progress bar */}
            <div className="h-2 bg-zinc-800 rounded-full mb-3">
              <div
                className="h-full rounded-full bg-violet-500 transition-all duration-500"
                style={{ width: `${Math.min(100, progress.percent)}%` }}
              />
            </div>

            <div className="grid grid-cols-3 gap-4 mt-4">
              <div>
                <p className="text-xs text-zinc-500 mb-1">Total</p>
                <p className="text-sm font-medium text-zinc-50">{formatCurrency(loan.totalAmount)}</p>
              </div>
              <div>
                <p className="text-xs text-zinc-500 mb-1">Paid</p>
                <p className="text-sm font-medium text-emerald-400">{formatCurrency(progress.paid)}</p>
              </div>
              <div>
                <p className="text-xs text-zinc-500 mb-1">Remaining</p>
                <p className="text-sm font-medium text-zinc-50">{formatCurrency(progress.remaining)}</p>
              </div>
            </div>

            {loan.additionalSavingsPerMonth > 0 && (
              <div className="mt-3 pt-3 border-t border-zinc-800">
                <p className="text-xs text-zinc-500">
                  Additional savings: {formatCurrency(loan.additionalSavingsPerMonth)}/mo
                </p>
              </div>
            )}
          </div>
        );
      })}

      <div className="flex justify-end">
        <button
          onClick={() => onNavigate('loans')}
          className="text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-lg h-9 px-3 text-sm inline-flex items-center gap-2 transition-colors"
        >
          View All Loans
          <ArrowRight size={14} />
        </button>
      </div>
    </div>
  );
}
