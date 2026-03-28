import { useMemo } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts';
import { DollarSign, Fuel, Bell, FileText, Car, Trash2 } from 'lucide-react';
import type { DashboardWidget as WidgetType, AppState, WidgetType as WType } from '../types';
import { formatCurrency, toMonthly, getTotalMonthlyCosts, getTotalYearlyCosts } from '../utils';
import { useUnits } from '../hooks/useUnits';

interface DashboardWidgetProps {
  widget: WidgetType;
  state: AppState;
  onDelete?: (id: string) => void;
  isEditing?: boolean;
}

const WIDGET_ICONS: Record<WType, typeof DollarSign> = {
  cost_summary: DollarSign,
  fuel_economy: Fuel,
  upcoming_reminders: Bell,
  recent_records: FileText,
  vehicle_status: Car,
  custom_chart: FileText,
};

const WIDGET_COLORS: Record<WType, string> = {
  cost_summary: 'text-emerald-400',
  fuel_economy: 'text-blue-400',
  upcoming_reminders: 'text-amber-400',
  recent_records: 'text-violet-400',
  vehicle_status: 'text-cyan-400',
  custom_chart: 'text-pink-400',
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-xs">
      {label && <p className="text-zinc-400 mb-1">{label}</p>}
      {payload.map((p: any, i: number) => (
        <p key={i} style={{ color: p.color }} className="font-medium">
          {p.name}: {formatCurrency(p.value)}
        </p>
      ))}
    </div>
  );
};

function CostSummaryWidget({ state }: { state: AppState }) {
  const totalMonthly = useMemo(() => getTotalMonthlyCosts(state.costs), [state.costs]);
  const totalYearly = useMemo(() => getTotalYearlyCosts(state.costs), [state.costs]);

  const lastMonthCosts = useMemo(() => {
    const now = new Date();
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthStr = `${lastMonth.getFullYear()}-${String(lastMonth.getMonth() + 1).padStart(2, '0')}`;
    return state.costs
      .filter(c => c.startDate?.startsWith(lastMonthStr))
      .reduce((sum, c) => sum + toMonthly(c.amount, c.frequency), 0);
  }, [state.costs]);

  const trend = totalMonthly > lastMonthCosts ? 'up' : totalMonthly < lastMonthCosts ? 'down' : 'flat';

  return (
    <div className="space-y-3">
      <div className="flex items-baseline gap-2">
        <span className="text-2xl font-bold text-emerald-400">{formatCurrency(totalMonthly)}</span>
        <span className="text-xs text-zinc-500">/month</span>
        {trend === 'up' && <span className="text-red-400 text-xs">&#9650;</span>}
        {trend === 'down' && <span className="text-emerald-400 text-xs">&#9660;</span>}
      </div>
      <div className="flex items-baseline gap-2">
        <span className="text-lg font-semibold text-amber-400">{formatCurrency(totalYearly)}</span>
        <span className="text-xs text-zinc-500">/year</span>
      </div>
    </div>
  );
}

function FuelEconomyWidget({ state }: { state: AppState }) {
  const { fuelEconomyUnitLabel } = useUnits();
  const chartData = useMemo(() => {
    const sorted = [...state.fuelRecords]
      .filter(f => !f.isPartialFill && !f.isMissedEntry && f.fuelAmount > 0 && f.mileage > 0)
      .sort((a, b) => a.mileage - b.mileage);

    const points: { date: string; consumption: number }[] = [];
    for (let i = 1; i < sorted.length; i++) {
      const dist = sorted[i].mileage - sorted[i - 1].mileage;
      if (dist > 0) {
        const consumption = Math.round((sorted[i].fuelAmount / dist) * 100 * 100) / 100;
        points.push({ date: sorted[i].date.substring(0, 10), consumption });
      }
    }
    return points.slice(-12);
  }, [state.fuelRecords]);

  if (chartData.length < 2) {
    return <p className="text-sm text-zinc-600 text-center py-4">Not enough fuel data</p>;
  }

  return (
    <ResponsiveContainer width="100%" height={140}>
      <AreaChart data={chartData}>
        <defs>
          <linearGradient id="colorFuel" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
        <XAxis dataKey="date" tick={{ fill: '#71717a', fontSize: 10 }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fill: '#71717a', fontSize: 10 }} axisLine={false} tickLine={false} />
        <Tooltip content={<CustomTooltip />} />
        <Area
          type="monotone"
          dataKey="consumption"
          name={fuelEconomyUnitLabel}
          stroke="#3b82f6"
          fill="url(#colorFuel)"
          strokeWidth={2}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

function UpcomingRemindersWidget({ state }: { state: AppState }) {
  const items = useMemo(() => {
    const now = new Date();
    const upcoming: { label: string; detail: string; severity: 'warning' | 'info' }[] = [];

    state.taxRecords.forEach(t => {
      if (t.dueDate) {
        const due = new Date(t.dueDate);
        if (due >= now) {
          const vehicle = state.vehicles.find(v => v.id === t.vehicleId);
          upcoming.push({
            label: t.description || 'Tax payment',
            detail: `${vehicle?.name || 'Unknown'} - due ${t.dueDate}`,
            severity: 'info',
          });
        }
      }
    });

    const thirtyDays = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    state.inspections.forEach(insp => {
      const d = new Date(insp.date);
      if (d >= now && d <= thirtyDays) {
        const vehicle = state.vehicles.find(v => v.id === insp.vehicleId);
        upcoming.push({
          label: insp.title || 'Inspection',
          detail: `${vehicle?.name || 'Unknown'} - ${insp.date}`,
          severity: 'info',
        });
      }
    });

    return upcoming.slice(0, 5);
  }, [state]);

  if (upcoming.length === 0) {
    return <p className="text-sm text-zinc-600 text-center py-4">Nothing upcoming</p>;
  }

  return (
    <div className="space-y-2">
      {items.map((item, i) => (
        <div key={i} className="flex items-start gap-2">
          <span className={`shrink-0 mt-1 w-1.5 h-1.5 rounded-full ${item.severity === 'warning' ? 'bg-red-400' : 'bg-amber-400'}`} />
          <div className="min-w-0">
            <p className="text-sm text-zinc-300 truncate">{item.label}</p>
            <p className="text-xs text-zinc-500">{item.detail}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

function RecentRecordsWidget({ state }: { state: AppState }) {
  const records = useMemo(() => {
    const all: { label: string; detail: string; date: string }[] = [];
    state.repairs.forEach(r => {
      const v = state.vehicles.find(v => v.id === r.vehicleId);
      all.push({ label: r.description, detail: `${v?.name || ''} - ${formatCurrency(r.cost)}`, date: r.date });
    });
    state.serviceRecords.forEach(s => {
      const v = state.vehicles.find(v => v.id === s.vehicleId);
      all.push({ label: s.description, detail: `${v?.name || ''} - ${formatCurrency(s.cost)}`, date: s.date });
    });
    return all.sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5);
  }, [state]);

  if (records.length === 0) {
    return <p className="text-sm text-zinc-600 text-center py-4">No recent records</p>;
  }

  return (
    <div className="space-y-2">
      {records.map((r, i) => (
        <div key={i} className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-sm text-zinc-300 truncate">{r.label}</p>
            <p className="text-xs text-zinc-500">{r.detail}</p>
          </div>
          <span className="text-xs text-zinc-500 shrink-0">{r.date}</span>
        </div>
      ))}
    </div>
  );
}

function VehicleStatusWidget({ state }: { state: AppState }) {
  if (state.vehicles.length === 0) {
    return <p className="text-sm text-zinc-600 text-center py-4">No vehicles</p>;
  }

  return (
    <div className="grid grid-cols-2 gap-2">
      {state.vehicles.map(v => {
        const vCosts = state.costs.filter(c => c.vehicleId === v.id);
        const monthly = getTotalMonthlyCosts(vCosts);
        return (
          <div key={v.id} className="bg-zinc-800/50 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-1">
              <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: v.color || '#8b5cf6' }} />
              <span className="text-sm text-zinc-300 truncate font-medium">{v.name}</span>
            </div>
            <p className="text-xs text-zinc-500">{v.brand} {v.model}</p>
            <p className="text-xs text-emerald-400 mt-1">{formatCurrency(monthly)}/mo</p>
          </div>
        );
      })}
    </div>
  );
}

export default function DashboardWidgetCard({ widget, state, onDelete, isEditing }: DashboardWidgetProps) {
  const Icon = WIDGET_ICONS[widget.widgetType] || FileText;
  const colorClass = WIDGET_COLORS[widget.widgetType] || 'text-zinc-400';

  function renderContent() {
    switch (widget.widgetType) {
      case 'cost_summary':
        return <CostSummaryWidget state={state} />;
      case 'fuel_economy':
        return <FuelEconomyWidget state={state} />;
      case 'upcoming_reminders':
        return <UpcomingRemindersWidget state={state} />;
      case 'recent_records':
        return <RecentRecordsWidget state={state} />;
      case 'vehicle_status':
        return <VehicleStatusWidget state={state} />;
      case 'custom_chart':
        return <p className="text-sm text-zinc-600 text-center py-4">Custom chart widget</p>;
      default:
        return <p className="text-sm text-zinc-600 text-center py-4">Unknown widget type</p>;
    }
  }

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Icon size={16} className={colorClass} />
          <h3 className="text-sm font-medium text-zinc-50">{widget.name}</h3>
        </div>
        {isEditing && onDelete && (
          <button
            onClick={() => onDelete(widget.id)}
            className="text-zinc-500 hover:text-red-400 transition-colors p-1 rounded-lg hover:bg-zinc-800"
          >
            <Trash2 size={14} />
          </button>
        )}
      </div>
      {renderContent()}
    </div>
  );
}
