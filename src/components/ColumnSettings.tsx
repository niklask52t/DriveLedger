import { useState, useRef, useEffect } from 'react';
import { Settings2, GripVertical } from 'lucide-react';
import { useUserConfig } from '../contexts/UserConfigContext';
import type { ColumnPreference } from '../types';

interface ColumnSettingsProps {
  tableKey: string;
  allColumns: { key: string; label: string }[];
}

export default function ColumnSettings({ tableKey, allColumns }: ColumnSettingsProps) {
  const { config, updateConfig } = useUserConfig();
  const [open, setOpen] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dropIndex, setDropIndex] = useState<number | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const prefs: ColumnPreference = config.columnPreferences?.[tableKey] || {
    visibleColumns: allColumns.map(c => c.key),
    columnOrder: allColumns.map(c => c.key),
  };

  const orderedColumns = [...allColumns].sort((a, b) => {
    const aIdx = prefs.columnOrder.indexOf(a.key);
    const bIdx = prefs.columnOrder.indexOf(b.key);
    if (aIdx === -1 && bIdx === -1) return 0;
    if (aIdx === -1) return 1;
    if (bIdx === -1) return -1;
    return aIdx - bIdx;
  });

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const savePrefs = (newPrefs: ColumnPreference) => {
    const columnPreferences = { ...(config.columnPreferences || {}), [tableKey]: newPrefs };
    updateConfig({ columnPreferences });
  };

  const toggleColumn = (key: string) => {
    const visible = prefs.visibleColumns.includes(key)
      ? prefs.visibleColumns.filter(k => k !== key)
      : [...prefs.visibleColumns, key];
    // Require at least one visible column
    if (visible.length === 0) return;
    savePrefs({ ...prefs, visibleColumns: visible });
  };

  const reorderColumns = (fromIndex: number, toIndex: number) => {
    const newOrder = orderedColumns.map(c => c.key);
    const [moved] = newOrder.splice(fromIndex, 1);
    newOrder.splice(toIndex, 0, moved);
    savePrefs({ ...prefs, columnOrder: newOrder });
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setOpen(!open)}
        className="text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-lg h-9 w-9 flex items-center justify-center transition-colors"
        title="Column settings"
      >
        <Settings2 size={16} />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 z-50 w-72 bg-zinc-900 border border-zinc-800 rounded-xl shadow-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-zinc-800">
            <p className="text-sm font-medium text-zinc-300">Column Visibility</p>
            <p className="text-xs text-zinc-500 mt-0.5">Drag to reorder, toggle visibility</p>
          </div>
          <div className="max-h-80 overflow-y-auto p-2 space-y-1">
            {orderedColumns.map((col, idx) => {
              const isVisible = prefs.visibleColumns.includes(col.key);
              return (
                <div
                  key={col.key}
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.effectAllowed = 'move';
                    setDragIndex(idx);
                  }}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDropIndex(idx);
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    if (dragIndex !== null && dragIndex !== idx) {
                      reorderColumns(dragIndex, idx);
                    }
                    setDragIndex(null);
                    setDropIndex(null);
                  }}
                  onDragEnd={() => {
                    setDragIndex(null);
                    setDropIndex(null);
                  }}
                  className={[
                    'flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-zinc-800/50 cursor-grab active:cursor-grabbing transition-all',
                    dragIndex === idx ? 'opacity-50' : '',
                    dropIndex === idx && dragIndex !== idx ? 'border-t-2 border-violet-500' : 'border-t-2 border-transparent',
                  ].join(' ')}
                >
                  <GripVertical size={14} className="text-zinc-600 shrink-0" />
                  <label className="flex items-center gap-2 flex-1 cursor-pointer min-w-0">
                    <input
                      type="checkbox"
                      checked={isVisible}
                      onChange={() => toggleColumn(col.key)}
                      className="w-3.5 h-3.5 rounded border-zinc-700 bg-zinc-800 text-violet-500 focus:ring-violet-500/30 shrink-0"
                    />
                    <span className={`text-sm truncate ${isVisible ? 'text-zinc-300' : 'text-zinc-600'}`}>
                      {col.label}
                    </span>
                  </label>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Hook to get ordered and filtered columns based on user preferences.
 */
export function useColumnPreferences(tableKey: string, allColumns: { key: string; label: string }[]) {
  const { config } = useUserConfig();
  const prefs: ColumnPreference = config.columnPreferences?.[tableKey] || {
    visibleColumns: allColumns.map(c => c.key),
    columnOrder: allColumns.map(c => c.key),
  };

  const visibleColumns = allColumns
    .filter(c => prefs.visibleColumns.includes(c.key))
    .sort((a, b) => {
      const aIdx = prefs.columnOrder.indexOf(a.key);
      const bIdx = prefs.columnOrder.indexOf(b.key);
      if (aIdx === -1 && bIdx === -1) return 0;
      if (aIdx === -1) return 1;
      if (bIdx === -1) return -1;
      return aIdx - bIdx;
    });

  return { visibleColumns, allColumns };
}
