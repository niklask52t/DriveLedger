import { Pencil, Trash2, ArrowRightLeft, Star, ExternalLink, Fuel, Gauge, Calendar } from 'lucide-react';
import { motion } from 'framer-motion';
import { formatCurrency, formatNumber, getFuelTypeLabel } from '../../utils';
import { useUnits } from '../../hooks/useUnits';
import type { PlannedPurchase } from '../../types';
import { useState } from 'react';

interface PurchaseCardProps {
  purchase: PlannedPurchase;
  onEdit: (purchase: PlannedPurchase) => void;
  onDelete: (id: string) => void;
  onConvert: (purchase: PlannedPurchase) => void;
}

export default function PurchaseCard({ purchase, onEdit, onDelete, onConvert }: PurchaseCardProps) {
  const { fmtDistance } = useUnits();
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  const totalMonthlyCost =
    purchase.monthlyRate +
    purchase.estimatedInsurance +
    purchase.estimatedTax / 12 +
    purchase.estimatedFuelMonthly +
    purchase.estimatedMaintenance;

  const pros = purchase.pros
    ? purchase.pros.split('\n').filter((l) => l.trim())
    : [];
  const cons = purchase.cons
    ? purchase.cons.split('\n').filter((l) => l.trim())
    : [];

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden"
    >
      {/* Image */}
      {purchase.imageUrl && (
        <div className="h-40 overflow-hidden">
          <img
            src={purchase.imageUrl}
            alt={`${purchase.brand} ${purchase.model}`}
            className="w-full h-full object-cover"
          />
        </div>
      )}

      <div className="p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-base font-semibold text-zinc-50">
              {purchase.brand} {purchase.model}
            </h3>
            {purchase.variant && (
              <p className="text-sm text-zinc-400 mt-0.5">{purchase.variant}</p>
            )}
          </div>
          <span className="text-lg font-semibold text-zinc-50">{formatCurrency(purchase.price)}</span>
        </div>

        {/* Key specs */}
        <div className="flex flex-wrap gap-3 mb-4">
          {purchase.year > 0 && (
            <div className="flex items-center gap-1.5 text-xs text-zinc-400">
              <Calendar size={12} />
              <span>{purchase.year}</span>
            </div>
          )}
          {purchase.mileage > 0 && (
            <div className="flex items-center gap-1.5 text-xs text-zinc-400">
              <Gauge size={12} />
              <span>{fmtDistance(purchase.mileage)}</span>
            </div>
          )}
          {purchase.fuelType && (
            <div className="flex items-center gap-1.5 text-xs text-zinc-400">
              <Fuel size={12} />
              <span>{getFuelTypeLabel(purchase.fuelType)}</span>
            </div>
          )}
          {purchase.horsePower > 0 && (
            <span className="text-xs text-zinc-400">{purchase.horsePower} PS</span>
          )}
        </div>

        {/* Rating */}
        {purchase.rating > 0 && (
          <div className="flex items-center gap-1 mb-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star
                key={i}
                size={14}
                className={i < purchase.rating ? 'text-amber-400 fill-amber-400' : 'text-zinc-700'}
              />
            ))}
          </div>
        )}

        {/* Cost breakdown */}
        <div className="bg-zinc-950 rounded-lg p-4 mb-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs text-zinc-500 uppercase tracking-wider">Est. Monthly Total</span>
            <span className="text-sm font-semibold text-zinc-50">{formatCurrency(totalMonthlyCost)}</span>
          </div>
          <div className="space-y-2">
            {purchase.monthlyRate > 0 && (
              <div className="flex items-center justify-between text-xs">
                <span className="text-zinc-500">Financing</span>
                <span className="text-zinc-300">{formatCurrency(purchase.monthlyRate)}</span>
              </div>
            )}
            {purchase.estimatedInsurance > 0 && (
              <div className="flex items-center justify-between text-xs">
                <span className="text-zinc-500">Insurance</span>
                <span className="text-zinc-300">{formatCurrency(purchase.estimatedInsurance)}</span>
              </div>
            )}
            {purchase.estimatedTax > 0 && (
              <div className="flex items-center justify-between text-xs">
                <span className="text-zinc-500">Tax</span>
                <span className="text-zinc-300">{formatCurrency(purchase.estimatedTax / 12)}/mo</span>
              </div>
            )}
            {purchase.estimatedFuelMonthly > 0 && (
              <div className="flex items-center justify-between text-xs">
                <span className="text-zinc-500">Fuel</span>
                <span className="text-zinc-300">{formatCurrency(purchase.estimatedFuelMonthly)}</span>
              </div>
            )}
            {purchase.estimatedMaintenance > 0 && (
              <div className="flex items-center justify-between text-xs">
                <span className="text-zinc-500">Maintenance</span>
                <span className="text-zinc-300">{formatCurrency(purchase.estimatedMaintenance)}</span>
              </div>
            )}
          </div>
        </div>

        {/* Financing details */}
        {purchase.downPayment > 0 && (
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-zinc-500 mb-4">
            <span>Down: {formatCurrency(purchase.downPayment)}</span>
            <span>{purchase.financingMonths} months</span>
            <span>{purchase.interestRate}% interest</span>
          </div>
        )}

        {/* Pros & Cons */}
        {(pros.length > 0 || cons.length > 0) && (
          <div className="grid grid-cols-2 gap-4 mb-4">
            {pros.length > 0 && (
              <div>
                <h4 className="text-xs font-medium text-emerald-400 mb-2">Pros</h4>
                <ul className="space-y-1">
                  {pros.map((p, i) => (
                    <li key={i} className="text-xs text-zinc-400 flex items-start gap-1.5">
                      <span className="text-emerald-400 mt-0.5 shrink-0">+</span>
                      {p}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {cons.length > 0 && (
              <div>
                <h4 className="text-xs font-medium text-red-400 mb-2">Cons</h4>
                <ul className="space-y-1">
                  {cons.map((c, i) => (
                    <li key={i} className="text-xs text-zinc-400 flex items-start gap-1.5">
                      <span className="text-red-400 mt-0.5 shrink-0">-</span>
                      {c}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Notes */}
        {purchase.notes && (
          <p className="text-xs text-zinc-500 mb-4 line-clamp-2">{purchase.notes}</p>
        )}

        {/* mobile.de link */}
        {purchase.mobileDeLink && (
          <a
            href={purchase.mobileDeLink}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-violet-400 hover:text-violet-300 inline-flex items-center gap-1 mb-4 transition-colors"
          >
            View on mobile.de
            <ExternalLink size={10} />
          </a>
        )}

        {/* Actions */}
        <div className="flex items-center gap-2 pt-4 border-t border-zinc-800">
          <button
            onClick={() => onEdit(purchase)}
            className="text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-lg h-9 px-3 text-sm inline-flex items-center gap-1.5 transition-colors"
          >
            <Pencil size={14} />
            Edit
          </button>
          <button
            onClick={() => onConvert(purchase)}
            className="text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-lg h-9 px-3 text-sm inline-flex items-center gap-1.5 transition-colors"
          >
            <ArrowRightLeft size={14} />
            Convert to Vehicle
          </button>
          <div className="flex-1" />
          {deleteConfirm ? (
            <div className="flex items-center gap-1">
              <button
                onClick={() => {
                  onDelete(purchase.id);
                  setDeleteConfirm(false);
                }}
                className="bg-red-400/10 text-red-400 hover:bg-red-400/20 rounded-lg h-9 px-3 text-xs transition-colors"
              >
                Confirm
              </button>
              <button
                onClick={() => setDeleteConfirm(false)}
                className="text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-lg h-9 px-3 text-xs transition-colors"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={() => setDeleteConfirm(true)}
              className="text-zinc-400 hover:text-red-400 hover:bg-zinc-800 rounded-lg h-9 px-3 text-sm inline-flex items-center transition-colors"
            >
              <Trash2 size={14} />
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}
