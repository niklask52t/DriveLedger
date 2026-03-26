import { useState, type KeyboardEvent } from 'react';
import { X } from 'lucide-react';

interface TagInputProps {
  tags: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
}

export default function TagInput({ tags, onChange, placeholder = 'Add tag...' }: TagInputProps) {
  const [input, setInput] = useState('');

  const addTag = (value: string) => {
    const trimmed = value.trim();
    if (trimmed && !tags.includes(trimmed)) {
      onChange([...tags, trimmed]);
    }
    setInput('');
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTag(input);
    } else if (e.key === 'Backspace' && !input && tags.length > 0) {
      onChange(tags.slice(0, -1));
    }
  };

  const removeTag = (index: number) => {
    onChange(tags.filter((_, i) => i !== index));
  };

  return (
    <div className="flex flex-wrap items-center gap-1.5 w-full bg-zinc-950 border border-zinc-800 rounded-lg px-2 py-1.5 min-h-[40px] focus-within:border-violet-500/50">
      {tags.map((tag, i) => (
        <span
          key={`${tag}-${i}`}
          className="bg-zinc-800 rounded-md px-2 py-0.5 text-xs text-zinc-300 inline-flex items-center gap-1 shrink-0"
        >
          {tag}
          <button
            type="button"
            onClick={() => removeTag(i)}
            className="text-zinc-500 hover:text-zinc-200 transition-colors"
          >
            <X size={12} />
          </button>
        </span>
      ))}
      <input
        type="text"
        className="flex-1 min-w-[80px] bg-transparent text-sm text-zinc-50 placeholder:text-zinc-600 outline-none h-7"
        placeholder={tags.length === 0 ? placeholder : ''}
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={() => { if (input.trim()) addTag(input); }}
      />
    </div>
  );
}
