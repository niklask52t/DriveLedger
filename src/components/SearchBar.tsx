import { useState, useEffect, useRef, useCallback } from 'react';
import { Search, X } from 'lucide-react';
import { api } from '../api';
import type { SearchResult, Page } from '../types';

interface SearchBarProps {
  onNavigate: (page: Page, vehicleId?: string) => void;
}

export default function SearchBar({ onNavigate }: SearchBarProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const doSearch = useCallback(async (q: string) => {
    if (q.trim().length < 2) {
      setResults([]);
      setIsOpen(false);
      return;
    }
    setLoading(true);
    try {
      const data = await api.globalSearch(q);
      setResults(data);
      setIsOpen(true);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(query), 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query, doSearch]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setIsOpen(false);
      setQuery('');
    }
  };

  const typeBadgeColor = (type: string): string => {
    const map: Record<string, string> = {
      vehicle: 'bg-blue-500/20 text-blue-400',
      cost: 'bg-amber-500/20 text-amber-400',
      repair: 'bg-orange-500/20 text-orange-400',
      service: 'bg-emerald-500/20 text-emerald-400',
      fuel: 'bg-red-500/20 text-red-400',
      inspection: 'bg-purple-500/20 text-purple-400',
      note: 'bg-cyan-500/20 text-cyan-400',
      tax: 'bg-yellow-500/20 text-yellow-400',
      upgrade: 'bg-pink-500/20 text-pink-400',
      loan: 'bg-indigo-500/20 text-indigo-400',
    };
    return map[type] || 'bg-zinc-500/20 text-zinc-400';
  };

  const getTargetPage = (result: SearchResult): Page => {
    const map: Record<string, Page> = {
      vehicle: 'vehicle-detail',
      cost: 'vehicle-detail',
      repair: 'vehicle-detail',
      service: 'vehicle-detail',
      fuel: 'vehicle-detail',
      inspection: 'vehicle-detail',
      note: 'vehicle-detail',
      tax: 'vehicle-detail',
      upgrade: 'vehicle-detail',
      loan: 'loans',
    };
    return map[result.type] || 'dashboard';
  };

  const handleSelect = (result: SearchResult) => {
    const page = getTargetPage(result);
    onNavigate(page, result.vehicleId || result.id);
    setIsOpen(false);
    setQuery('');
  };

  return (
    <div ref={containerRef} className="relative w-full max-w-md">
      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
        <input
          type="text"
          className="w-full h-10 bg-zinc-950 border border-zinc-800 rounded-lg pl-9 pr-8 text-sm text-zinc-50 placeholder:text-zinc-600 outline-none focus:border-violet-500/50"
          placeholder="Search vehicles, costs, repairs..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => { if (results.length > 0) setIsOpen(true); }}
        />
        {query && (
          <button
            onClick={() => { setQuery(''); setIsOpen(false); }}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-zinc-900 border border-zinc-800 rounded-xl shadow-xl z-50 max-h-80 overflow-y-auto">
          {loading ? (
            <div className="px-4 py-3 text-sm text-zinc-500">Searching...</div>
          ) : results.length === 0 ? (
            <div className="px-4 py-3 text-sm text-zinc-500">No results found.</div>
          ) : (
            results.map((r) => (
              <button
                key={`${r.type}-${r.id}`}
                onClick={() => handleSelect(r)}
                className="w-full text-left px-4 py-3 hover:bg-zinc-800/50 transition-colors flex items-start gap-3 border-b border-zinc-800/50 last:border-0"
              >
                <span className={`shrink-0 mt-0.5 text-[10px] font-medium uppercase px-1.5 py-0.5 rounded ${typeBadgeColor(r.type)}`}>
                  {r.type}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-zinc-50 truncate">{r.title}</p>
                  {r.snippet && (
                    <p className="text-xs text-zinc-500 truncate mt-0.5">{r.snippet}</p>
                  )}
                </div>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
