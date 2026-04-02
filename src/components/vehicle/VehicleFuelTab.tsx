import { useState, useMemo } from 'react';
import { Plus, Pencil, Trash2, Fuel, Droplets, Gauge, TrendingUp, TrendingDown, DollarSign } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import Modal from '../Modal';
import { api } from '../../api';
import { formatCurrency, formatDate, formatNumber } from '../../utils';
import { useI18n } from '../../contexts/I18nContext';
import { useUnits } from '../../hooks/useUnits';
import { useUserConfig } from '../../contexts/UserConfigContext';
import type { AppState, FuelRecord } from '../../types';

type VolumeDisplayUnit = 'liters' | 'gallons';
type EconomyDisplayUnit = 'l100km' | 'mpgUS' | 'mpgUK' | 'kmL';

function convertVolume(liters: number, unit: VolumeDisplayUnit): number {
  if (unit === 'gallons') return liters * 0.264172;
  return liters;
}

function volumeLabel(unit: VolumeDisplayUnit): string {
  return unit === 'gallons' ? 'Gallons' : 'Liters';
}

function convertEconomy(lPer100km: number, unit: EconomyDisplayUnit): number {
  if (lPer100km <= 0) return 0;
  switch (unit) {
    case 'mpgUS': return 235.215 / lPer100km;
    case 'mpgUK': return 282.481 / lPer100km;
    case 'kmL': return 100 / lPer100km;
    default: return lPer100km;
  }
}

function economyLabel(unit: EconomyDisplayUnit): string {
  switch (unit) {
    case 'mpgUS': return 'MPG (US)';
    case 'mpgUK': return 'MPG (UK)';
    case 'kmL': return 'km/L';
    default: return 'L/100km';
  }
}

// For "best" we want the lowest L/100km, but highest MPG/km-per-L
function isBetter(a: number, b: number, unit: EconomyDisplayUnit): boolean {
  if (unit === 'l100km') return a < b;
  return a > b; // for mpg, km/l higher is better
}

function isWorse(a: number, b: number, unit: EconomyDisplayUnit): boolean {
  if (unit === 'l100km') return a > b;
  return a < b;
}

const inputClass =
  'w-full h-10 bg-zinc-950 border border-zinc-800 rounded-lg px-3 text-sm text-zinc-50 placeholder:text-zinc-600 outline-none focus:border-violet-500/50';

const selectClass =
  'w-full h-10 bg-zinc-950 border border-zinc-800 rounded-lg px-3 text-sm text-zinc-50 outline-none focus:border-violet-500/50 appearance-none';

const labelClass = 'block text-sm font-medium text-zinc-400 mb-2';

const selectChevron = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%2371717a' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`;

interface Props {
  vehicleId: string;
  state: AppState;
  setState: (s: AppState) => void;
}

const emptyForm = {
  date: '',
  mileage: 0,
  fuelAmount: 0,
  fuelCost: 0,
  isPartialFill: false,
  isMissedEntry: false,
  fuelType: '',
  station: '',
  notes: '',
  costInputMode: 'total' as 'total' | 'perUnit',
  pricePerUnit: 0,
};

export default function VehicleFuelTab({ vehicleId, state, setState }: Props) {
  const { t } = useI18n();
  const { config } = useUserConfig();
  const vehicle = state.vehicles.find((v) => v.id === vehicleId);
  const { fmtDistance, fmtVolume, fmtFuelEconomy, fuelEconomyUnitLabel, distanceUnit } = useUnits({ useHours: !!vehicle?.useHours });
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  // Inline unit toggles (not persisted)
  const [volumeUnit, setVolumeUnit] = useState<VolumeDisplayUnit>('liters');
  const [economyUnit, setEconomyUnit] = useState<EconomyDisplayUnit>('l100km');

  const toggleVolumeUnit = () => setVolumeUnit(prev => prev === 'liters' ? 'gallons' : 'liters');
  const cycleEconomyUnit = () => setEconomyUnit(prev => {
    const order: EconomyDisplayUnit[] = ['l100km', 'mpgUS', 'mpgUK', 'kmL'];
    const idx = order.indexOf(prev);
    return order[(idx + 1) % order.length];
  });

  const records = useMemo(
    () =>
      state.fuelRecords
        .filter((r) => r.vehicleId === vehicleId)
        .sort((a, b) => (a.date || '').localeCompare(b.date || '') || a.mileage - b.mileage),
    [state.fuelRecords, vehicleId]
  );

  const consumptionMap = useMemo(() => {
    const map: Record<string, number | null> = {};

    // Try server-provided fuelEconomy first
    let hasServerValues = false;
    for (const r of records) {
      if (r.fuelEconomy != null) {
        map[r.id] = r.fuelEconomy;
        hasServerValues = true;
      } else {
        map[r.id] = null;
      }
    }
    if (hasServerValues) return map;

    // Fallback: client-side computation
    let prevFull: FuelRecord | null = null;
    let accLiters = 0;

    for (const r of records) {
      if (r.isMissedEntry) {
        prevFull = null;
        accLiters = 0;
        map[r.id] = null;
        continue;
      }

      accLiters += r.fuelAmount;

      if (!r.isPartialFill && prevFull) {
        const dist = r.mileage - prevFull.mileage;
        if (dist > 0) {
          map[r.id] = (accLiters / dist) * 100;
        } else {
          map[r.id] = null;
        }
        prevFull = r;
        accLiters = 0;
      } else if (!r.isPartialFill) {
        prevFull = r;
        accLiters = 0;
        map[r.id] = null;
      } else {
        map[r.id] = null;
      }
    }
    return map;
  }, [records]);

  const chartData = useMemo(
    () =>
      records
        .filter((r) => consumptionMap[r.id] != null)
        .map((r) => ({
          date: formatDate(r.date),
          consumption: Math.round((consumptionMap[r.id]!) * 100) / 100,
        })),
    [records, consumptionMap]
  );

  const totalCost = records.reduce((s, r) => s + r.fuelCost, 0);
  const totalVolume = records.reduce((s, r) => s + r.fuelAmount, 0);
  const sorted = [...records].reverse();

  // Aggregate fuel economy stats
  const fuelStats = useMemo(() => {
    const validValues = Object.values(consumptionMap).filter((v): v is number => v != null && v > 0);
    if (validValues.length === 0) return null;
    const sum = validValues.reduce((a, b) => a + b, 0);
    const avg = sum / validValues.length;
    const best = Math.min(...validValues); // lowest L/100km = best
    const worst = Math.max(...validValues); // highest L/100km = worst
    return { avg, best, worst };
  }, [consumptionMap]);

  const openAdd = () => {
    const autoMileage = (config.enableAutoFillOdometer !== false && vehicle)
      ? vehicle.currentMileage || 0
      : 0;
    setForm({ ...emptyForm, mileage: autoMileage });
    setEditingId(null);
    setShowModal(true);
  };

  const openEdit = (r: FuelRecord) => {
    setForm({
      date: r.date,
      mileage: r.mileage,
      fuelAmount: r.fuelAmount,
      fuelCost: r.fuelCost,
      isPartialFill: r.isPartialFill,
      isMissedEntry: r.isMissedEntry,
      fuelType: r.fuelType,
      station: r.station,
      notes: r.notes,
      costInputMode: 'total',
      pricePerUnit: r.fuelAmount > 0 ? Math.round((r.fuelCost / r.fuelAmount) * 1000) / 1000 : 0,
    });
    setEditingId(r.id);
    setShowModal(true);
  };

  const handleSave = async () => {
    try {
      const finalCost = form.costInputMode === 'perUnit'
        ? Math.round(form.pricePerUnit * form.fuelAmount * 100) / 100
        : form.fuelCost;
      const payload = { ...form, vehicleId, fuelCost: finalCost };
      if (editingId) {
        const updated = await api.updateFuelRecord(editingId, payload);
        setState({ ...state, fuelRecords: state.fuelRecords.map((r) => (r.id === editingId ? updated : r)) });
      } else {
        const created = await api.createFuelRecord(payload);
        setState({ ...state, fuelRecords: [...state.fuelRecords, created] });
      }
      setShowModal(false);
      setEditingId(null);
    } catch (e) {
      console.error('Failed to save fuel record', e);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.deleteFuelRecord(id);
      setState({ ...state, fuelRecords: state.fuelRecords.filter((r) => r.id !== id) });
    } catch (e) {
      console.error('Failed to delete fuel record', e);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <p className="text-sm text-zinc-400">
          {records.length} {t('fuel.entries').toLowerCase()} &middot; {t('common.total')}: {formatCurrency(totalCost)}
        </p>
        <button
          onClick={openAdd}
          className="bg-violet-500 hover:bg-violet-400 text-white rounded-lg h-10 px-5 text-sm font-medium inline-flex items-center gap-2 transition-colors"
        >
          <Plus size={16} />
          {t('vehicle_tab.fuel.add')}
        </button>
      </div>

      {chartData.length >= 2 && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 mb-6">
          <h3 className="text-sm font-medium text-zinc-300 mb-4">{t('vehicle_tab.fuel.consumption')} ({fuelEconomyUnitLabel})</h3>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                <XAxis dataKey="date" tick={{ fill: '#71717a', fontSize: 11 }} tickLine={false} axisLine={{ stroke: '#3f3f46' }} />
                <YAxis tick={{ fill: '#71717a', fontSize: 11 }} tickLine={false} axisLine={{ stroke: '#3f3f46' }} domain={['auto', 'auto']} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#18181b', border: '1px solid #3f3f46', borderRadius: '8px', fontSize: '12px' }}
                  labelStyle={{ color: '#a1a1aa' }}
                  itemStyle={{ color: '#8b5cf6' }}
                  formatter={(value: number) => [fmtFuelEconomy(value), t('vehicle_tab.fuel.consumption')]}
                />
                <Line type="monotone" dataKey="consumption" stroke="#8b5cf6" strokeWidth={2} dot={{ r: 3, fill: '#8b5cf6' }} activeDot={{ r: 5 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Aggregate Stat Cards */}
      {records.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
          {fuelStats && (
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
              <div className="flex items-center gap-1.5 mb-2">
                <Gauge size={13} className="text-violet-400" />
                <p className="text-xs text-zinc-500 uppercase tracking-wider">Avg Economy</p>
              </div>
              <p className="text-lg font-semibold text-zinc-50">{convertEconomy(fuelStats.avg, economyUnit).toFixed(2)}</p>
              <p className="text-xs text-zinc-500">{economyLabel(economyUnit)}</p>
            </div>
          )}
          {fuelStats && (
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
              <div className="flex items-center gap-1.5 mb-2">
                <TrendingUp size={13} className="text-emerald-400" />
                <p className="text-xs text-zinc-500 uppercase tracking-wider">Best</p>
              </div>
              <p className="text-lg font-semibold text-emerald-400">{convertEconomy(fuelStats.best, economyUnit).toFixed(2)}</p>
              <p className="text-xs text-zinc-500">{economyLabel(economyUnit)}</p>
            </div>
          )}
          {fuelStats && (
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
              <div className="flex items-center gap-1.5 mb-2">
                <TrendingDown size={13} className="text-red-400" />
                <p className="text-xs text-zinc-500 uppercase tracking-wider">Worst</p>
              </div>
              <p className="text-lg font-semibold text-red-400">{convertEconomy(fuelStats.worst, economyUnit).toFixed(2)}</p>
              <p className="text-xs text-zinc-500">{economyLabel(economyUnit)}</p>
            </div>
          )}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
            <div className="flex items-center gap-1.5 mb-2">
              <DollarSign size={13} className="text-amber-400" />
              <p className="text-xs text-zinc-500 uppercase tracking-wider">Total Cost</p>
            </div>
            <p className="text-lg font-semibold text-zinc-50">{formatCurrency(totalCost)}</p>
          </div>
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
            <div className="flex items-center gap-1.5 mb-2">
              <Droplets size={13} className="text-blue-400" />
              <p className="text-xs text-zinc-500 uppercase tracking-wider">Total Volume</p>
            </div>
            <p className="text-lg font-semibold text-zinc-50">{convertVolume(totalVolume, volumeUnit).toFixed(1)}</p>
            <p className="text-xs text-zinc-500">{volumeLabel(volumeUnit)}</p>
          </div>
        </div>
      )}

      {sorted.length === 0 ? (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 text-center">
          <p className="text-zinc-500 text-sm">{t('vehicle_tab.fuel.no_entries')}</p>
        </div>
      ) : (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-zinc-800">
                  <th className="px-4 py-3.5 text-left text-xs text-zinc-500 uppercase tracking-wider font-medium">{t('common.date')}</th>
                  <th className="px-4 py-3.5 text-right text-xs text-zinc-500 uppercase tracking-wider font-medium">{t('common.mileage')}</th>
                  <th
                    className="px-4 py-3.5 text-right text-xs text-zinc-500 uppercase tracking-wider font-medium cursor-pointer hover:text-violet-400 transition-colors select-none"
                    onClick={toggleVolumeUnit}
                    title="Click to toggle unit"
                  >
                    {volumeLabel(volumeUnit)} &#x21C5;
                  </th>
                  <th className="px-4 py-3.5 text-right text-xs text-zinc-500 uppercase tracking-wider font-medium">{t('common.cost')}</th>
                  <th
                    className="px-4 py-3.5 text-right text-xs text-zinc-500 uppercase tracking-wider font-medium cursor-pointer hover:text-violet-400 transition-colors select-none"
                    onClick={cycleEconomyUnit}
                    title="Click to cycle unit"
                  >
                    {economyLabel(economyUnit)} &#x21C5;
                  </th>
                  <th className="px-4 py-3.5 text-left text-xs text-zinc-500 uppercase tracking-wider font-medium">{t('fuel.station')}</th>
                  <th className="px-4 py-3.5 text-center text-xs text-zinc-500 uppercase tracking-wider font-medium">{t('fuel.partial_fill')}?</th>
                  <th className="px-4 py-3.5 text-right text-xs text-zinc-500 uppercase tracking-wider font-medium">{t('common.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((r) => {
                  const consumption = consumptionMap[r.id];
                  return (
                    <tr key={r.id} className="border-b border-zinc-800/50 hover:bg-zinc-800/30 transition-colors">
                      <td className="px-4 py-3.5 text-sm text-zinc-50">{formatDate(r.date)}</td>
                      <td className="px-4 py-3.5 text-sm text-zinc-400 text-right">{fmtDistance(r.mileage)}</td>
                      <td className="px-4 py-3.5 text-sm text-zinc-50 text-right">{convertVolume(r.fuelAmount, volumeUnit).toFixed(2)}</td>
                      <td className="px-4 py-3.5 text-sm text-zinc-50 text-right">{formatCurrency(r.fuelCost)}</td>
                      <td className="px-4 py-3.5 text-sm text-right">
                        {consumption != null ? (
                          <span className={`font-medium ${
                            fuelStats && consumption <= fuelStats.avg * 0.9 ? 'text-emerald-400' :
                            fuelStats && consumption >= fuelStats.avg * 1.1 ? 'text-red-400' :
                            'text-violet-400'
                          }`}>{convertEconomy(consumption, economyUnit).toFixed(2)}</span>
                        ) : (
                          <span className="text-zinc-600">{'\u2014'}</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-sm text-zinc-400">{r.station || '-'}</td>
                      <td className="px-4 py-3.5 text-center">
                        {r.isPartialFill ? (
                          <span className="text-xs bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded-md">{t('vehicle_tab.fuel.partial')}</span>
                        ) : (
                          <span className="text-xs text-zinc-600">{t('vehicle_tab.fuel.full')}</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => openEdit(r)} className="text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-lg h-9 px-3 text-sm inline-flex items-center transition-colors"><Pencil size={14} /></button>
                          {deleteConfirm === r.id ? (
                            <div className="flex items-center gap-1">
                              <button onClick={() => { handleDelete(r.id); setDeleteConfirm(null); }} className="bg-red-400/10 text-red-400 hover:bg-red-400/20 rounded-lg h-9 px-3 text-xs transition-colors">{t('common.confirm')}</button>
                              <button onClick={() => setDeleteConfirm(null)} className="text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-lg h-9 px-3 text-xs transition-colors">{t('common.cancel')}</button>
                            </div>
                          ) : (
                            <button onClick={() => setDeleteConfirm(r.id)} className="text-zinc-400 hover:text-red-400 hover:bg-zinc-800 rounded-lg h-9 px-3 text-sm inline-flex items-center transition-colors"><Trash2 size={14} /></button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Modal
        isOpen={showModal}
        onClose={() => { setShowModal(false); setEditingId(null); }}
        title={editingId ? t('vehicle_tab.fuel.edit') : t('vehicle_tab.fuel.add')}
        footer={
          <>
            <button onClick={() => { setShowModal(false); setEditingId(null); }} className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg h-10 px-4 text-sm transition-colors">{t('common.cancel')}</button>
            <button onClick={handleSave} className="bg-violet-500 hover:bg-violet-400 text-white rounded-lg h-10 px-5 text-sm font-medium transition-colors">{editingId ? t('common.update') : t('common.add')}</button>
          </>
        }
      >
        <div className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>{t('common.date')}</label>
              <input type="date" className={inputClass} value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
            </div>
            <div>
              <label className={labelClass}>{t('common.mileage')} ({distanceUnit})</label>
              <input type="number" className={inputClass} placeholder="0" value={form.mileage || ''} onChange={(e) => setForm({ ...form, mileage: parseFloat(e.target.value) || 0 })} />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>{t('vehicle_tab.fuel.liters')}</label>
              <input type="number" step="0.01" className={inputClass} placeholder="0.00" value={form.fuelAmount || ''} onChange={(e) => setForm({ ...form, fuelAmount: parseFloat(e.target.value) || 0 })} />
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-zinc-400">
                  {form.costInputMode === 'perUnit' ? `Price per ${volumeLabel(volumeUnit)}` : t('vehicle_tab.fuel.cost_eur')}
                </label>
                <button
                  type="button"
                  onClick={() => {
                    if (form.costInputMode === 'total') {
                      const ppu = form.fuelAmount > 0 ? form.fuelCost / form.fuelAmount : 0;
                      setForm({ ...form, costInputMode: 'perUnit', pricePerUnit: Math.round(ppu * 1000) / 1000 });
                    } else {
                      setForm({ ...form, costInputMode: 'total', fuelCost: Math.round(form.pricePerUnit * form.fuelAmount * 100) / 100 });
                    }
                  }}
                  className="text-xs text-violet-400 hover:text-violet-300"
                >
                  {form.costInputMode === 'perUnit' ? 'Switch to Total' : 'Switch to Per Unit'}
                </button>
              </div>
              {form.costInputMode === 'perUnit' ? (
                <input
                  type="number"
                  step="0.001"
                  className={inputClass}
                  placeholder="0.000"
                  value={form.pricePerUnit || ''}
                  onChange={(e) => {
                    const ppu = parseFloat(e.target.value) || 0;
                    setForm({ ...form, pricePerUnit: ppu, fuelCost: Math.round(ppu * form.fuelAmount * 100) / 100 });
                  }}
                />
              ) : (
                <input type="number" step="0.01" className={inputClass} placeholder="0.00" value={form.fuelCost || ''} onChange={(e) => setForm({ ...form, fuelCost: parseFloat(e.target.value) || 0 })} />
              )}
              {form.costInputMode === 'perUnit' && form.fuelAmount > 0 && (
                <p className="text-xs text-zinc-500 mt-1">Total: {formatCurrency(form.pricePerUnit * form.fuelAmount)}</p>
              )}
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>{t('vehicle_tab.fuel.fuel_type')}</label>
              <select className={selectClass} style={{ backgroundImage: selectChevron, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 0.75rem center' }} value={form.fuelType} onChange={(e) => setForm({ ...form, fuelType: e.target.value })}>
                <option value="">{t('vehicle_tab.fuel.select')}</option>
                <option value="diesel">{t('vehicle_tab.fuel.diesel')}</option>
                <option value="benzin">{t('vehicle_tab.fuel.gasoline')}</option>
                <option value="elektro">{t('vehicle_tab.fuel.electric')}</option>
                <option value="lpg">{t('vehicle_tab.fuel.lpg')}</option>
              </select>
            </div>
            <div>
              <label className={labelClass}>{t('fuel.station')}</label>
              <input type="text" className={inputClass} placeholder={t('fuel.station_placeholder')} value={form.station} onChange={(e) => setForm({ ...form, station: e.target.value })} />
            </div>
          </div>
          <div className="flex items-center gap-6">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" className="w-4 h-4 rounded border-zinc-700 bg-zinc-950 text-violet-500 focus:ring-violet-500/30" checked={form.isPartialFill} onChange={(e) => setForm({ ...form, isPartialFill: e.target.checked })} />
              <span className="text-sm text-zinc-300">{t('vehicle_tab.fuel.partial_fill')}</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" className="w-4 h-4 rounded border-zinc-700 bg-zinc-950 text-violet-500 focus:ring-violet-500/30" checked={form.isMissedEntry} onChange={(e) => setForm({ ...form, isMissedEntry: e.target.checked })} />
              <span className="text-sm text-zinc-300">{t('vehicle_tab.fuel.missed_entry')}</span>
            </label>
          </div>
          <div>
            <label className={labelClass}>{t('common.notes')}</label>
            <textarea className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2.5 text-sm text-zinc-50 placeholder:text-zinc-600 outline-none focus:border-violet-500/50 min-h-[80px] resize-none" placeholder={t('common.optional_notes')} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </div>
        </div>
      </Modal>
    </div>
  );
}
