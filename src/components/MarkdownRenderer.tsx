import { useMemo } from 'react';

export default function MarkdownRenderer({ content, className = '' }: { content: string; className?: string }) {
  const html = useMemo(() => {
    if (!content) return '';

    let result = content
      // Code blocks (must be before inline code)
      .replace(/```(\w*)\n([\s\S]*?)```/g, '<pre><code class="language-$1">$2</code></pre>')
      // Headers
      .replace(/^#### (.+)$/gm, '<h4 class="text-sm font-semibold mt-3 mb-1">$1</h4>')
      .replace(/^### (.+)$/gm, '<h3 class="text-base font-semibold mt-4 mb-1">$1</h3>')
      .replace(/^## (.+)$/gm, '<h2 class="text-lg font-semibold mt-4 mb-2">$1</h2>')
      .replace(/^# (.+)$/gm, '<h1 class="text-xl font-bold mt-4 mb-2">$1</h1>')
      // Bold + italic
      .replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      // Strikethrough
      .replace(/~~(.+?)~~/g, '<del>$1</del>')
      // Inline code
      .replace(/`(.+?)`/g, '<code class="bg-zinc-800 px-1 py-0.5 rounded text-sm">$1</code>')
      // Links
      .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" target="_blank" rel="noopener" class="text-violet-400 hover:underline">$1</a>')
      // Horizontal rule
      .replace(/^---$/gm, '<hr class="border-zinc-700 my-4" />')
      // Unordered lists
      .replace(/^[*-] (.+)$/gm, '<li class="ml-4">$1</li>')
      // Ordered lists
      .replace(/^\d+\. (.+)$/gm, '<li class="ml-4 list-decimal">$1</li>')
      // Blockquote
      .replace(/^> (.+)$/gm, '<blockquote class="border-l-2 border-zinc-600 pl-3 text-zinc-400 italic">$1</blockquote>')
      // Line breaks (but not inside pre/code)
      .replace(/\n/g, '<br/>');

    // Wrap consecutive <li> elements in <ul>
    result = result.replace(/((?:<li[^>]*>.*?<\/li>\s*<br\/>?\s*)+)/g, (match) => {
      const items = match.replace(/<br\/>/g, '');
      return `<ul class="list-disc my-2">${items}</ul>`;
    });

    return result;
  }, [content]);

  return (
    <div
      className={`prose-sm max-w-none ${className}`}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
