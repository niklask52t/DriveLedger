import { ArrowRight, CreditCard } from 'lucide-react';
import { formatCurrency, getLoanProgress } from '../../utils';
import { useI18n } from '../../contexts/I18nContext';
import type { AppState } from '../../types';

interface Props {
  vehicleId: string;
  state: AppState;
  setState: (s: AppState) => void;
}

export default function VehicleLoansTab({ vehicleId, state }: Props) {
  const { t } = useI18n();

  const vehicleLoans = state.loans.filter((l) => l.vehicleId === vehicleId);

  if (vehicleLoans.length === 0) {
    return (
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 text-center">
        <CreditCard size={32} className="mx-auto text-zinc-600 mb-3" />
        <p className="text-zinc-500 text-sm">{t('vehicle_tab.loans.no_loans')}</p>
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
                  {formatCurrency(loan.monthlyPayment)}{t('unit.per_month')} &middot; {loan.interestRate}% {t('vehicle_tab.loans.interest')}
                </p>
              </div>
              <span className="text-xs font-medium text-violet-400">
                {progress.percent.toFixed(1)}% {t('vehicle_tab.loans.paid')}
              </span>
            </div>

            {/* Progress bar */}
            <div className="h-2 bg-zinc-800 rounded-full mb-3">
              <div
                className="h-full rounded-full bg-violet-500 transition-all duration-500"
                style={{ width: `${Math.min(100, progress.percent)}%` }}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
              <div>
                <p className="text-xs text-zinc-500 mb-1">{t('vehicle_tab.loans.total')}</p>
                <p className="text-sm font-medium text-zinc-50">{formatCurrency(loan.totalAmount)}</p>
              </div>
              <div>
                <p className="text-xs text-zinc-500 mb-1">{t('vehicle_tab.loans.paid_amount')}</p>
                <p className="text-sm font-medium text-emerald-400">{formatCurrency(progress.paid)}</p>
              </div>
              <div>
                <p className="text-xs text-zinc-500 mb-1">{t('vehicle_tab.loans.remaining')}</p>
                <p className="text-sm font-medium text-zinc-50">{formatCurrency(progress.remaining)}</p>
              </div>
            </div>

            {loan.additionalSavingsPerMonth > 0 && (
              <div className="mt-3 pt-3 border-t border-zinc-800">
                <p className="text-xs text-zinc-500">
                  {t('vehicle_tab.loans.additional_savings')}: {formatCurrency(loan.additionalSavingsPerMonth)}{t('unit.per_month')}
                </p>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
