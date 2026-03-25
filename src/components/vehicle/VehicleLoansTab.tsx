import { FileText } from 'lucide-react';
import type { Loan, Page } from '../../types';
import { formatCurrency, getLoanProgress } from '../../utils';

interface VehicleLoansTabProps {
  vehicleLoans: Loan[];
  onNavigate: (page: Page) => void;
}

export default function VehicleLoansTab({ vehicleLoans, onNavigate }: VehicleLoansTabProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-dark-100">Loans & Financing</h2>
      </div>

      {vehicleLoans.length === 0 ? (
        <div className="text-center py-12 text-dark-400">
          <FileText size={40} className="mx-auto mb-3 opacity-40" />
          <p>No loans linked to this vehicle</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {vehicleLoans.map((loan) => {
            const progress = getLoanProgress(loan);
            return (
              <div
                key={loan.id}
                className="bg-dark-800 border border-dark-700 rounded-xl p-5 hover:border-dark-500 transition-colors cursor-pointer"
                onClick={() => onNavigate('loans')}
              >
                <h3 className="font-semibold text-dark-100 mb-3">{loan.name}</h3>
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-dark-400">Total Amount</span>
                    <span className="text-dark-100 font-medium">{formatCurrency(loan.totalAmount)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-dark-400">Monthly Payment</span>
                    <span className="text-dark-100 font-medium">{formatCurrency(loan.monthlyPayment)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-dark-400">Interest Rate</span>
                    <span className="text-dark-100 font-medium">{loan.interestRate}%</span>
                  </div>
                  {/* Progress bar */}
                  <div>
                    <div className="flex justify-between text-xs text-dark-400 mb-1">
                      <span>{formatCurrency(progress.paid)} paid</span>
                      <span>{Math.round(progress.percent)}%</span>
                    </div>
                    <div className="w-full h-2 bg-dark-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary-500 rounded-full transition-all"
                        style={{ width: `${Math.min(100, progress.percent)}%` }}
                      />
                    </div>
                    <p className="text-xs text-dark-500 mt-1">
                      {formatCurrency(progress.remaining)} remaining
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
