import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Car, Bell, Monitor, Wrench, Calendar, DollarSign, Fuel } from 'lucide-react';
import { formatCurrency } from '../utils';
import type { Vehicle, Reminder, ServiceRecord, FuelRecord } from '../types';

type KioskMode = 'vehicles' | 'plans' | 'reminders' | 'cycle';
type DisplayMode = 'vehicles' | 'reminders';

const CYCLE_INTERVAL = 30000; // 30 seconds

export default function Kiosk() {
  const [mode, setMode] = useState<KioskMode>('cycle');
  const [activeDisplay, setActiveDisplay] = useState<DisplayMode>('vehicles');
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [serviceRecords, setServiceRecords] = useState<ServiceRecord[]>([]);
  const [fuelRecords, setFuelRecords] = useState<FuelRecord[]>([]);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const cycleTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Parse kiosk params from URL hash: #kiosk?token=xxx&userId=yyy
  const getKioskParams = useCallback(() => {
    const hash = window.location.hash;
    const qIdx = hash.indexOf('?');
    if (qIdx === -1) return { token: '', userId: '' };
    const params = new URLSearchParams(hash.substring(qIdx + 1));
    return {
      token: params.get('token') || '',
      userId: params.get('userId') || '',
    };
  }, []);

  // Connect to SSE stream
  useEffect(() => {
    const { token, userId } = getKioskParams();
    if (!token) {
      setError('Missing kiosk token. Use /#kiosk?token=YOUR_TOKEN&userId=USER_ID');
      return;
    }

    const url = `/api/kiosk/stream?token=${encodeURIComponent(token)}&userId=${encodeURIComponent(userId)}`;
    const es = new EventSource(url);
    eventSourceRef.current = es;

    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'connected') {
          setConnected(true);
          setError(null);
        } else if (data.type === 'update') {
          if (data.vehicles) setVehicles(data.vehicles);
          if (data.reminders) setReminders(data.reminders);
          if (data.serviceRecords) setServiceRecords(data.serviceRecords);
          if (data.fuelRecords) setFuelRecords(data.fuelRecords);
          setConnected(true);
        }
      } catch {
        // ignore parse errors
      }
    };

    es.onerror = () => {
      setConnected(false);
      setError('Connection lost. Reconnecting...');
    };

    return () => {
      es.close();
      eventSourceRef.current = null;
    };
  }, [getKioskParams]);

  // Cycle mode auto-rotation
  useEffect(() => {
    if (mode !== 'cycle') {
      if (cycleTimerRef.current) {
        clearInterval(cycleTimerRef.current);
        cycleTimerRef.current = null;
      }
      return;
    }

    const displays: DisplayMode[] = ['vehicles', 'reminders'];
    let idx = 0;
    setActiveDisplay(displays[0]);

    cycleTimerRef.current = setInterval(() => {
      idx = (idx + 1) % displays.length;
      setActiveDisplay(displays[idx]);
    }, CYCLE_INTERVAL);

    return () => {
      if (cycleTimerRef.current) {
        clearInterval(cycleTimerRef.current);
        cycleTimerRef.current = null;
      }
    };
  }, [mode]);

  // When mode is not cycle, set display directly
  useEffect(() => {
    if (mode === 'vehicles') setActiveDisplay('vehicles');
    if (mode === 'reminders') setActiveDisplay('reminders');
    if (mode === 'plans') setActiveDisplay('vehicles'); // plans shows vehicles with plan info
  }, [mode]);

  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);
  const currentTime = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const currentDate = now.toLocaleDateString([], { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  // Helper: get vehicle stats for kiosk display
  const getVehicleStats = useCallback((vehicleId: string) => {
    const now = new Date();
    const yearStart = new Date(now.getFullYear(), 0, 1).toISOString();

    // Most recent service
    const vServices = serviceRecords
      .filter((s) => s.vehicleId === vehicleId)
      .sort((a, b) => (b.date || '').localeCompare(a.date || ''));
    const lastService = vServices[0] || null;

    // Next upcoming reminder
    const vReminders = reminders
      .filter((r) => (r.vehicleId === vehicleId || r.entityId === vehicleId) && r.active && !r.sent && r.remindAt)
      .sort((a, b) => (a.remindAt || '').localeCompare(b.remindAt || ''));
    const nextReminder = vReminders[0] || null;

    // Total cost this year (fuel records + service records)
    const fuelCostThisYear = fuelRecords
      .filter((f) => f.vehicleId === vehicleId && f.date >= yearStart)
      .reduce((s, f) => s + (f.fuelCost || 0), 0);
    const serviceCostThisYear = serviceRecords
      .filter((s) => s.vehicleId === vehicleId && s.date >= yearStart)
      .reduce((s, r) => s + (r.cost || 0), 0);
    const totalCostThisYear = fuelCostThisYear + serviceCostThisYear;

    // Fuel economy average from fuel records
    const vFuel = fuelRecords.filter((f) => f.vehicleId === vehicleId).sort((a, b) => a.mileage - b.mileage);
    let avgEconomy: number | null = null;
    if (vFuel.length >= 2) {
      const totalLiters = vFuel.reduce((s, f) => s + (f.fuelAmount || 0), 0);
      const dist = vFuel[vFuel.length - 1].mileage - vFuel[0].mileage;
      if (dist > 0) avgEconomy = (totalLiters / dist) * 100;
    }

    return { lastService, nextReminder, totalCostThisYear, avgEconomy };
  }, [serviceRecords, fuelRecords, reminders]);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-50 p-8 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-4xl font-bold tracking-tight">DriveLedger</h1>
          <p className="text-lg text-zinc-500 mt-1">{currentDate}</p>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-5xl font-light text-zinc-300 tabular-nums">{currentTime}</span>
          {/* Connection indicator */}
          <span className={`w-3 h-3 rounded-full ${connected ? 'bg-emerald-400' : 'bg-red-400'}`} />
        </div>
      </div>

      {/* Mode selector */}
      <div className="flex items-center gap-2 mb-8">
        {([
          { id: 'vehicles' as KioskMode, label: 'Vehicles', icon: Car },
          { id: 'reminders' as KioskMode, label: 'Reminders', icon: Bell },
          { id: 'cycle' as KioskMode, label: 'Auto Cycle', icon: Monitor },
        ]).map((m) => (
          <button
            key={m.id}
            onClick={() => setMode(m.id)}
            className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              mode === m.id
                ? 'bg-violet-500 text-white'
                : 'bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700'
            }`}
          >
            <m.icon size={16} />
            {m.label}
          </button>
        ))}
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-400/10 border border-red-400/20 rounded-lg px-5 py-3 mb-6 text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Content */}
      <div className="flex-1">
        {activeDisplay === 'vehicles' && (
          <div>
            <h2 className="text-2xl font-semibold mb-6">
              {mode === 'plans' ? 'Vehicle Plans' : 'Vehicles'}
              <span className="text-lg text-zinc-500 ml-3">({vehicles.length})</span>
            </h2>
            {vehicles.length === 0 ? (
              <div className="text-center py-20">
                <Car className="mx-auto text-zinc-700 mb-4" size={48} />
                <p className="text-xl text-zinc-600">No vehicles found</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6">
                {vehicles.map((v) => {
                  const stats = getVehicleStats(v.id);
                  return (
                    <div
                      key={v.id}
                      className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6"
                    >
                      <div className="flex items-center gap-3 mb-4">
                        <span
                          className="w-4 h-4 rounded-full shrink-0"
                          style={{ backgroundColor: v.color || '#8b5cf6' }}
                        />
                        <span className="text-xl font-semibold truncate">{v.name}</span>
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-zinc-500">Brand/Model</span>
                          <span className="text-sm text-zinc-300">{v.brand} {v.model}</span>
                        </div>
                        {v.licensePlate && (
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-zinc-500">License Plate</span>
                            <span className="text-sm text-zinc-300 font-mono">{v.licensePlate}</span>
                          </div>
                        )}
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-zinc-500">{v.useHours ? 'Hours' : 'Mileage'}</span>
                          <span className="text-sm text-zinc-300">
                            {v.currentMileage?.toLocaleString() || 0} {v.useHours ? 'h' : 'km'}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-zinc-500">Status</span>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                            v.status === 'owned'
                              ? 'bg-emerald-500/20 text-emerald-400'
                              : 'bg-amber-500/20 text-amber-400'
                          }`}>
                            {v.status}
                          </span>
                        </div>
                      </div>

                      {/* Vehicle Statistics */}
                      <div className="mt-4 pt-4 border-t border-zinc-800 space-y-2">
                        {stats.lastService && (
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-zinc-500 flex items-center gap-1.5">
                              <Wrench size={12} className="text-violet-400" /> Last Service
                            </span>
                            <span className="text-sm text-zinc-300">
                              {new Date(stats.lastService.date).toLocaleDateString()}
                            </span>
                          </div>
                        )}
                        {stats.nextReminder && (
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-zinc-500 flex items-center gap-1.5">
                              <Calendar size={12} className="text-amber-400" /> Next Reminder
                            </span>
                            <span className={`text-sm ${
                              stats.nextReminder.remindAt && new Date(stats.nextReminder.remindAt) < new Date()
                                ? 'text-red-400' : 'text-zinc-300'
                            }`}>
                              {stats.nextReminder.remindAt
                                ? new Date(stats.nextReminder.remindAt).toLocaleDateString()
                                : '-'}
                            </span>
                          </div>
                        )}
                        {stats.totalCostThisYear > 0 && (
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-zinc-500 flex items-center gap-1.5">
                              <DollarSign size={12} className="text-emerald-400" /> Cost This Year
                            </span>
                            <span className="text-sm text-zinc-300">
                              {formatCurrency(stats.totalCostThisYear)}
                            </span>
                          </div>
                        )}
                        {stats.avgEconomy !== null && (
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-zinc-500 flex items-center gap-1.5">
                              <Fuel size={12} className="text-blue-400" /> Avg Economy
                            </span>
                            <span className="text-sm text-zinc-300">
                              {stats.avgEconomy.toFixed(1)} L/100km
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {activeDisplay === 'reminders' && (
          <div>
            <h2 className="text-2xl font-semibold mb-6">
              Reminders
              <span className="text-lg text-zinc-500 ml-3">({reminders.length})</span>
            </h2>
            {reminders.length === 0 ? (
              <div className="text-center py-20">
                <Bell className="mx-auto text-zinc-700 mb-4" size={48} />
                <p className="text-xl text-zinc-600">No active reminders</p>
              </div>
            ) : (
              <div className="space-y-4">
                {reminders.map((r) => {
                  const vehicle = vehicles.find((v) => v.id === r.vehicleId);
                  const isOverdue = r.remindAt && new Date(r.remindAt) < new Date();
                  return (
                    <div
                      key={r.id}
                      className={`bg-zinc-900 border rounded-2xl p-6 ${
                        isOverdue ? 'border-red-500/50' : 'border-zinc-800'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="text-xl font-semibold">{r.title}</h3>
                          {r.description && (
                            <p className="text-sm text-zinc-400 mt-1">{r.description}</p>
                          )}
                          {vehicle && (
                            <p className="text-sm text-zinc-500 mt-1">
                              Vehicle: {vehicle.name}
                            </p>
                          )}
                        </div>
                        <div className="text-right shrink-0 ml-4">
                          <p className={`text-lg font-medium ${isOverdue ? 'text-red-400' : 'text-zinc-300'}`}>
                            {r.remindAt ? new Date(r.remindAt).toLocaleDateString() : '-'}
                          </p>
                          {isOverdue && (
                            <span className="text-xs bg-red-400/20 text-red-400 px-2 py-0.5 rounded-full">
                              Overdue
                            </span>
                          )}
                          {r.recurring && (
                            <p className="text-xs text-zinc-500 mt-1">
                              Recurring: {r.recurring}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="mt-8 pt-4 border-t border-zinc-800/50 flex items-center justify-between">
        <p className="text-xs text-zinc-600">DriveLedger Kiosk Mode</p>
        {mode === 'cycle' && (
          <p className="text-xs text-zinc-600">
            Auto-cycling every 30s | Showing: {activeDisplay}
          </p>
        )}
      </div>
    </div>
  );
}
