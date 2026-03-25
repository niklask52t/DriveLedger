import { Car, ExternalLink, Star, Trash2, Edit, ArrowRight } from 'lucide-react';
import type { PlannedPurchase } from '../../types';
import { formatCurrency, formatNumber, calculateFinancing, getFuelTypeLabel } from '../../utils';

function StarRating({ rating, size = 16 }: { rating: number; size?: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <span key={i} className="cursor-default">
          <Star
            size={size}
            className={i <= rating ? 'text-amber-400 fill-amber-400' : 'text-dark-600'}
          />
        </span>
      ))}
    </div>
  );
}

interface PurchaseCardProps {
  purchase: PlannedPurchase;
  onEdit: (p: PlannedPurchase) => void;
  onDelete: (id: string) => void;
  onConvert: (p: PlannedPurchase) => void;
}

export default function PurchaseCard({ purchase: p, onEdit, onDelete, onConvert }: PurchaseCardProps) {
  const fin = calculateFinancing(p.price, p.downPayment, p.financingMonths, p.interestRate);
  const totalMonthly = fin.monthlyPayment + p.estimatedInsurance + p.estimatedFuelMonthly + p.estimatedMaintenance;

  return (
    <div className="bg-dark-800 border border-dark-700 rounded-2xl overflow-hidden hover:border-dark-600 transition-colors group">
      {/* Image */}
      <div className="relative h-48 bg-dark-850 overflow-hidden">
        {p.imageUrl ? (
          <img
            src={p.imageUrl}
            alt={`${p.brand} ${p.model}`}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Car size={64} className="text-dark-700" />
          </div>
        )}
        {/* Rating overlay */}
        <div className="absolute top-3 right-3 bg-dark-900/80 backdrop-blur-sm rounded-lg px-2.5 py-1.5">
          <StarRating rating={p.rating} size={16} />
        </div>
        {/* Price overlay */}
        <div className="absolute bottom-3 left-3 bg-dark-900/80 backdrop-blur-sm rounded-lg px-3 py-1.5">
          <span className="text-lg font-bold text-primary-400">{formatCurrency(p.price)}</span>
        </div>
      </div>

      {/* Content */}
      <div className="p-5 space-y-4">
        {/* Title */}
        <div>
          <h3 className="text-lg font-bold text-dark-50">
            {p.brand} {p.model}
          </h3>
          <div className="flex items-center gap-3 text-sm text-dark-400 mt-1">
            {p.variant && <span>{p.variant}</span>}
            <span>{p.year}</span>
            <span>{formatNumber(p.mileage)} km</span>
            <span>{p.horsePower} HP</span>
          </div>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs px-2 py-0.5 rounded-full bg-dark-700 text-dark-300">
              {getFuelTypeLabel(p.fuelType)}
            </span>
          </div>
        </div>

        {/* Financing Summary */}
        <div className="bg-dark-850 rounded-xl p-3 space-y-2 border border-dark-700/50">
          <div className="flex justify-between text-sm">
            <span className="text-dark-400">Monthly Rate</span>
            <span className="text-dark-100 font-medium">{formatCurrency(fin.monthlyPayment)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-dark-400">Total Interest</span>
            <span className="text-amber-400 font-medium">{formatCurrency(fin.totalInterest)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-dark-400">Total Finance Cost</span>
            <span className="text-dark-100 font-medium">{formatCurrency(fin.totalCost)}</span>
          </div>
          <div className="border-t border-dark-700 pt-2 flex justify-between text-sm">
            <span className="text-dark-300 font-medium">Total Monthly Cost</span>
            <span className="text-primary-400 font-bold text-base">{formatCurrency(totalMonthly)}</span>
          </div>
        </div>

        {/* Running costs breakdown */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="bg-dark-850 rounded-lg px-2.5 py-2 border border-dark-700/50">
            <span className="text-dark-500">Insurance</span>
            <p className="text-dark-200 font-medium">{formatCurrency(p.estimatedInsurance)}/mo</p>
          </div>
          <div className="bg-dark-850 rounded-lg px-2.5 py-2 border border-dark-700/50">
            <span className="text-dark-500">Tax</span>
            <p className="text-dark-200 font-medium">{formatCurrency(p.estimatedTax)}/yr</p>
          </div>
          <div className="bg-dark-850 rounded-lg px-2.5 py-2 border border-dark-700/50">
            <span className="text-dark-500">Fuel</span>
            <p className="text-dark-200 font-medium">{formatCurrency(p.estimatedFuelMonthly)}/mo</p>
          </div>
          <div className="bg-dark-850 rounded-lg px-2.5 py-2 border border-dark-700/50">
            <span className="text-dark-500">Maintenance</span>
            <p className="text-dark-200 font-medium">{formatCurrency(p.estimatedMaintenance)}/mo</p>
          </div>
        </div>

        {/* Pros & Cons */}
        {(p.pros || p.cons) && (
          <div className="space-y-2">
            {p.pros && (
              <div>
                <p className="text-xs font-medium text-emerald-400 mb-1">Pros</p>
                <ul className="text-xs text-dark-300 space-y-0.5">
                  {p.pros.split('\n').filter(Boolean).map((line, i) => (
                    <li key={i} className="flex items-start gap-1.5">
                      <span className="text-emerald-500 mt-0.5 shrink-0">+</span>
                      {line}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {p.cons && (
              <div>
                <p className="text-xs font-medium text-red-400 mb-1">Cons</p>
                <ul className="text-xs text-dark-300 space-y-0.5">
                  {p.cons.split('\n').filter(Boolean).map((line, i) => (
                    <li key={i} className="flex items-start gap-1.5">
                      <span className="text-red-500 mt-0.5 shrink-0">-</span>
                      {line}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Action buttons */}
        <div className="flex gap-2 pt-2 border-t border-dark-700">
          {p.mobileDeLink && (
            <a
              href={p.mobileDeLink}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-dark-700 text-dark-300 hover:text-dark-100 hover:bg-dark-600 transition-colors text-xs font-medium"
            >
              <ExternalLink size={14} />
              mobile.de
            </a>
          )}
          <button
            onClick={() => onEdit(p)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-dark-700 text-dark-300 hover:text-dark-100 hover:bg-dark-600 transition-colors text-xs font-medium"
          >
            <Edit size={14} />
            Edit
          </button>
          <button
            onClick={() => onConvert(p)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-primary-600/20 text-primary-400 hover:bg-primary-600/30 transition-colors text-xs font-medium"
          >
            <ArrowRight size={14} />
            Convert to Vehicle
          </button>
          <button
            onClick={() => onDelete(p.id)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-red-400 hover:bg-red-500/15 transition-colors text-xs font-medium ml-auto"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
