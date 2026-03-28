import { useState } from 'react';
import { Plus, Minus, Package, X } from 'lucide-react';
import type { Supply } from '../types';

interface SupplySelection {
  supplyId: string;
  quantity: number;
}

interface Props {
  vehicleId: string;
  supplies: Supply[];
  selected: SupplySelection[];
  onChange: (selected: SupplySelection[]) => void;
}

export default function SupplyPicker({ vehicleId, supplies, selected, onChange }: Props) {
  const [showPicker, setShowPicker] = useState(false);

  // Filter supplies: show vehicle-specific + shop supplies (vehicleId === null)
  const availableSupplies = supplies.filter(
    (s) => s.vehicleId === vehicleId || s.vehicleId === null || s.vehicleId === ''
  );

  const addSupply = (supplyId: string) => {
    if (selected.find((s) => s.supplyId === supplyId)) return;
    onChange([...selected, { supplyId, quantity: 1 }]);
  };

  const removeSupply = (supplyId: string) => {
    onChange(selected.filter((s) => s.supplyId !== supplyId));
  };

  const updateQuantity = (supplyId: string, quantity: number) => {
    if (quantity < 1) return;
    onChange(selected.map((s) => (s.supplyId === supplyId ? { ...s, quantity } : s)));
  };

  const getSupply = (id: string) => supplies.find((s) => s.id === id);
  const unselectedSupplies = availableSupplies.filter(
    (s) => !selected.find((sel) => sel.supplyId === s.id)
  );

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="block text-sm font-medium text-zinc-400">
          <Package size={14} className="inline mr-1.5 -mt-0.5" />
          Supplies Used
        </label>
        {!showPicker && (
          <button
            type="button"
            onClick={() => setShowPicker(true)}
            className="text-xs text-violet-400 hover:text-violet-300 transition-colors inline-flex items-center gap-1"
          >
            <Plus size={12} />
            Choose Supplies
          </button>
        )}
      </div>

      {/* Selected supplies */}
      {selected.length > 0 && (
        <div className="space-y-2">
          {selected.map((sel) => {
            const supply = getSupply(sel.supplyId);
            if (!supply) return null;
            return (
              <div
                key={sel.supplyId}
                className="flex items-center gap-3 bg-zinc-800/50 rounded-lg px-3 py-2"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-zinc-200 truncate">{supply.name}</p>
                  <p className="text-xs text-zinc-500">
                    Available: {supply.quantity} | Unit cost: {supply.unitCost.toFixed(2)}
                  </p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => updateQuantity(sel.supplyId, sel.quantity - 1)}
                    className="w-7 h-7 rounded bg-zinc-700 hover:bg-zinc-600 flex items-center justify-center text-zinc-300 transition-colors"
                  >
                    <Minus size={12} />
                  </button>
                  <input
                    type="number"
                    min="1"
                    value={sel.quantity}
                    onChange={(e) =>
                      updateQuantity(sel.supplyId, parseInt(e.target.value) || 1)
                    }
                    className="w-14 h-7 bg-zinc-900 border border-zinc-700 rounded text-center text-sm text-zinc-50 outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => updateQuantity(sel.supplyId, sel.quantity + 1)}
                    className="w-7 h-7 rounded bg-zinc-700 hover:bg-zinc-600 flex items-center justify-center text-zinc-300 transition-colors"
                  >
                    <Plus size={12} />
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => removeSupply(sel.supplyId)}
                  className="text-zinc-500 hover:text-red-400 transition-colors"
                >
                  <X size={14} />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Supply picker dropdown */}
      {showPicker && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-3 space-y-2">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-zinc-500 uppercase tracking-wider">
              Available Supplies ({unselectedSupplies.length})
            </span>
            <button
              type="button"
              onClick={() => setShowPicker(false)}
              className="text-zinc-500 hover:text-zinc-300"
            >
              <X size={14} />
            </button>
          </div>
          {unselectedSupplies.length === 0 ? (
            <p className="text-xs text-zinc-600 text-center py-3">No supplies available</p>
          ) : (
            <div className="max-h-48 overflow-y-auto space-y-1">
              {unselectedSupplies.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => {
                    addSupply(s.id);
                    if (unselectedSupplies.length <= 1) setShowPicker(false);
                  }}
                  className="w-full text-left px-3 py-2 rounded-lg hover:bg-zinc-800 transition-colors flex items-center justify-between"
                >
                  <div className="min-w-0">
                    <span className="text-sm text-zinc-200 truncate block">{s.name}</span>
                    {s.partNumber && (
                      <span className="text-xs text-zinc-500">#{s.partNumber}</span>
                    )}
                  </div>
                  <div className="text-right shrink-0 ml-3">
                    <span className="text-xs text-zinc-400">Qty: {s.quantity}</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
