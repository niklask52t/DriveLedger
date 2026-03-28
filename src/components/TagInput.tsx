import { useState } from 'react';
import { X, Plus } from 'lucide-react';
import { cn } from '../lib/utils';

interface Props {
  tags: string[];
  onChange: (tags: string[]) => void;
  suggestions?: string[];
  className?: string;
}

export default function TagInput({ tags, onChange, suggestions = [], className }: Props) {
  const [input, setInput] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);

  const addTag = (tag: string) => {
    const trimmed = tag.trim().toLowerCase();
    if (trimmed && !tags.includes(trimmed)) {
      onChange([...tags, trimmed]);
    }
    setInput('');
    setShowSuggestions(false);
  };

  const removeTag = (tag: string) => {
    onChange(tags.filter(t => t !== tag));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTag(input);
    } else if (e.key === 'Backspace' && !input && tags.length) {
      removeTag(tags[tags.length - 1]);
    }
  };

  const filtered = suggestions.filter(s =>
    s.toLowerCase().includes(input.toLowerCase()) && !tags.includes(s)
  );

  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex flex-wrap gap-1.5">
        {tags.map(tag => (
          <span key={tag} className="inline-flex items-center gap-1 bg-violet-500/15 text-violet-300 text-xs px-2 py-1 rounded-md">
            {tag}
            <button onClick={() => removeTag(tag)} className="hover:text-violet-100 cursor-pointer">
              <X size={12} />
            </button>
          </span>
        ))}
      </div>
      <div className="relative">
        <input
          value={input}
          onChange={e => { setInput(e.target.value); setShowSuggestions(true); }}
          onKeyDown={handleKeyDown}
          onFocus={() => setShowSuggestions(true)}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
          placeholder="Add tag..."
          className="w-full h-8 bg-zinc-950 border border-zinc-800 rounded-lg px-3 text-xs text-zinc-50 placeholder:text-zinc-600 outline-none focus:border-violet-500/50"
        />
        {showSuggestions && filtered.length > 0 && input && (
          <div className="absolute z-10 top-full mt-1 w-full bg-zinc-900 border border-zinc-800 rounded-lg shadow-lg max-h-32 overflow-y-auto">
            {filtered.map(s => (
              <button key={s} onClick={() => addTag(s)}
                className="w-full text-left px-3 py-1.5 text-xs text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 cursor-pointer">
                {s}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
