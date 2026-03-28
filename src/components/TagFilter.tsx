import { useState } from 'react';
import { Filter, X } from 'lucide-react';
import { cn } from '../lib/utils';

interface Props {
  allTags: string[];
  selectedTags: string[];
  onTagsChange: (tags: string[]) => void;
  filterMode: 'include' | 'exclude';
  onFilterModeChange: (mode: 'include' | 'exclude') => void;
}

export default function TagFilter({ allTags, selectedTags, onTagsChange, filterMode, onFilterModeChange }: Props) {
  const [open, setOpen] = useState(false);

  if (allTags.length === 0) return null;

  return (
    <div className="relative">
      <button onClick={() => setOpen(!open)}
        className={cn(
          'flex items-center gap-2 text-xs px-3 py-1.5 rounded-lg border transition-colors cursor-pointer',
          selectedTags.length > 0
            ? 'border-violet-500/50 text-violet-300 bg-violet-500/10'
            : 'border-zinc-800 text-zinc-500 hover:text-zinc-300'
        )}>
        <Filter size={12} />
        Tags {selectedTags.length > 0 && `(${selectedTags.length})`}
      </button>

      {open && (
        <div className="absolute z-20 top-full mt-1 right-0 bg-zinc-900 border border-zinc-800 rounded-lg shadow-lg p-3 min-w-[200px]">
          <div className="flex gap-1 mb-2">
            <button onClick={() => onFilterModeChange('include')}
              className={cn('text-xs px-2 py-1 rounded cursor-pointer', filterMode === 'include' ? 'bg-violet-500/20 text-violet-300' : 'text-zinc-500 hover:text-zinc-300')}>
              Include
            </button>
            <button onClick={() => onFilterModeChange('exclude')}
              className={cn('text-xs px-2 py-1 rounded cursor-pointer', filterMode === 'exclude' ? 'bg-red-500/20 text-red-300' : 'text-zinc-500 hover:text-zinc-300')}>
              Exclude
            </button>
          </div>
          <div className="space-y-1 max-h-48 overflow-y-auto">
            {allTags.map(tag => (
              <label key={tag} className="flex items-center gap-2 text-xs text-zinc-400 hover:text-zinc-200 cursor-pointer py-0.5">
                <input type="checkbox" checked={selectedTags.includes(tag)}
                  onChange={e => {
                    if (e.target.checked) onTagsChange([...selectedTags, tag]);
                    else onTagsChange(selectedTags.filter(t => t !== tag));
                  }}
                  className="rounded border-zinc-700 bg-zinc-800"
                />
                {tag}
              </label>
            ))}
          </div>
          {selectedTags.length > 0 && (
            <button onClick={() => onTagsChange([])} className="text-xs text-zinc-600 hover:text-zinc-400 mt-2 cursor-pointer">
              Clear all
            </button>
          )}
        </div>
      )}
    </div>
  );
}
