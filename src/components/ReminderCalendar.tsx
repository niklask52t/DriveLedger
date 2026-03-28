import { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '../lib/utils';
import type { Reminder } from '../types';

interface Props {
  reminders: Reminder[];
  onSelectDate?: (date: string) => void;
  selectedDate?: string | null;
}

export default function ReminderCalendar({ reminders, onSelectDate, selectedDate }: Props) {
  const [current, setCurrent] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });

  const days = useMemo(() => {
    const { year, month } = current;
    const first = new Date(year, month, 1);
    const startOffset = (first.getDay() + 6) % 7; // Monday=0
    const grid: { date: Date; inMonth: boolean; reminders: Reminder[] }[] = [];

    for (let i = -startOffset; i < 42 - startOffset; i++) {
      const d = new Date(year, month, 1 + i);
      const ds = d.toISOString().split('T')[0];
      grid.push({
        date: d,
        inMonth: d.getMonth() === month,
        reminders: reminders.filter(r => r.remindAt?.startsWith(ds)),
      });
    }
    return grid;
  }, [current, reminders]);

  const monthLabel = new Date(current.year, current.month).toLocaleDateString('default', { month: 'long', year: 'numeric' });
  const today = new Date().toISOString().split('T')[0];
  const weekDays = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <button onClick={() => setCurrent(c => { const d = new Date(c.year, c.month - 1); return { year: d.getFullYear(), month: d.getMonth() }; })}
          className="p-1.5 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-lg transition-colors">
          <ChevronLeft size={16} />
        </button>
        <span className="text-sm font-medium text-zinc-200">{monthLabel}</span>
        <button onClick={() => setCurrent(c => { const d = new Date(c.year, c.month + 1); return { year: d.getFullYear(), month: d.getMonth() }; })}
          className="p-1.5 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-lg transition-colors">
          <ChevronRight size={16} />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-0.5">
        {weekDays.map(d => (
          <div key={d} className="text-center text-[10px] text-zinc-600 font-medium py-1">{d}</div>
        ))}
        {days.map((day, i) => {
          const ds = day.date.toISOString().split('T')[0];
          const isToday = ds === today;
          const isSelected = ds === selectedDate;
          const has = day.reminders.length > 0;

          return (
            <button key={i} onClick={() => onSelectDate?.(ds)}
              className={cn(
                'aspect-square flex flex-col items-center justify-center rounded-md text-xs transition-colors',
                !day.inMonth && 'text-zinc-700',
                day.inMonth && !has && 'text-zinc-400 hover:bg-zinc-800/50',
                has && 'text-zinc-200 bg-zinc-800/60 hover:bg-zinc-800',
                isToday && 'ring-1 ring-violet-500/60',
                isSelected && 'bg-violet-500/20 ring-1 ring-violet-500',
              )}>
              <span>{day.date.getDate()}</span>
              {has && (
                <div className="flex gap-0.5 mt-0.5">
                  {day.reminders.slice(0, 3).map((_, j) => (
                    <span key={j} className="w-1 h-1 rounded-full bg-violet-400" />
                  ))}
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
