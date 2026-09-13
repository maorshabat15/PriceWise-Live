import React from 'react';

interface MarkdownContentProps {
  content: string;
  className?: string;
  isUser?: boolean;
}

/**
 * Basic, robust Markdown renderer for chat messages.
 * Supports paragraphs, line breaks, bold (**text**), italics (*text*),
 * inline code (`code`), lists (- item, * item, 1. item), headings, and links.
 */
export const MarkdownContent: React.FC<MarkdownContentProps> = ({
  content,
  className = '',
  isUser = false,
}) => {
  if (!content) return null;

  // Helper to parse inline markdown (bold, italic, code, links)
  const parseInline = (text: string): React.ReactNode[] => {
    // Regex for inline tokens: bold (** or __), italic (* or _), code (`), link ([text](url))
    const tokenRegex = /(\*\*[^*]+\*\*|__[^_]+__|`[^`]+`|\*[^*]+\*|_[^_]+_|\[[^\]]+\]\([^)]+\))/g;
    const parts = text.split(tokenRegex);

    return parts.map((part, index) => {
      if (!part) return null;

      // Bold: **text** or __text__
      if ((part.startsWith('**') && part.endsWith('**')) || (part.startsWith('__') && part.endsWith('__'))) {
        const inner = part.slice(2, -2);
        return (
          <strong key={index} className={`font-black ${isUser ? 'text-amber-200' : 'text-amber-300'}`}>
            {inner}
          </strong>
        );
      }

      // Inline code: `code`
      if (part.startsWith('`') && part.endsWith('`')) {
        const inner = part.slice(1, -1);
        return (
          <code
            key={index}
            className="px-1.5 py-0.5 rounded bg-slate-900/90 text-amber-300 border border-slate-700/60 font-mono text-xs"
          >
            {inner}
          </code>
        );
      }

      // Italic: *text* or _text_
      if ((part.startsWith('*') && part.endsWith('*')) || (part.startsWith('_') && part.endsWith('_'))) {
        const inner = part.slice(1, -1);
        return (
          <em key={index} className="italic text-slate-200">
            {inner}
          </em>
        );
      }

      // Links: [text](url)
      const linkMatch = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
      if (linkMatch) {
        return (
          <a
            key={index}
            href={linkMatch[2]}
            target="_blank"
            rel="noopener noreferrer"
            className="text-amber-400 hover:text-amber-300 underline underline-offset-2 transition-colors"
          >
            {linkMatch[1]}
          </a>
        );
      }

      return <React.Fragment key={index}>{part}</React.Fragment>;
    });
  };

  // Split content into paragraph/block chunks separated by two or more newlines
  const blocks = content.split(/\n{2,}/);

  return (
    <div className={`space-y-2.5 leading-relaxed text-sm ${className}`}>
      {blocks.map((block, bIdx) => {
        const lines = block.split('\n');

        // Check if block is a heading (#, ##, ###)
        const firstLine = lines[0].trim();
        if (firstLine.startsWith('### ')) {
          return (
            <h4 key={bIdx} className="text-sm sm:text-base font-black text-amber-300 pt-1">
              {parseInline(firstLine.slice(4))}
            </h4>
          );
        }
        if (firstLine.startsWith('## ')) {
          return (
            <h3 key={bIdx} className="text-base sm:text-lg font-black text-amber-300 pt-1">
              {parseInline(firstLine.slice(3))}
            </h3>
          );
        }
        if (firstLine.startsWith('# ')) {
          return (
            <h2 key={bIdx} className="text-lg sm:text-xl font-black text-amber-300 pt-1">
              {parseInline(firstLine.slice(2))}
            </h2>
          );
        }

        // Check if block is a list
        const isUnorderedList = lines.every((l) => /^[-*•]\s+/.test(l.trim()) || l.trim() === '');
        if (isUnorderedList && lines.some((l) => l.trim() !== '')) {
          return (
            <ul key={bIdx} className="space-y-1.5 my-1.5 pr-1">
              {lines
                .filter((l) => l.trim() !== '')
                .map((line, lIdx) => {
                  const cleaned = line.trim().replace(/^[-*•]\s+/, '');
                  return (
                    <li key={lIdx} className="flex items-start gap-2 text-slate-200">
                      <span className="text-amber-400 mt-1 shrink-0 text-xs">•</span>
                      <span className="flex-1">{parseInline(cleaned)}</span>
                    </li>
                  );
                })}
            </ul>
          );
        }

        // Check if block is a numbered list
        const isOrderedList = lines.every((l) => /^\d+\.\s+/.test(l.trim()) || l.trim() === '');
        if (isOrderedList && lines.some((l) => l.trim() !== '')) {
          return (
            <ol key={bIdx} className="space-y-1.5 my-1.5 pr-1">
              {lines
                .filter((l) => l.trim() !== '')
                .map((line, lIdx) => {
                  const numMatch = line.trim().match(/^(\d+)\.\s+(.*)$/);
                  const num = numMatch ? numMatch[1] : `${lIdx + 1}`;
                  const rest = numMatch ? numMatch[2] : line;
                  return (
                    <li key={lIdx} className="flex items-start gap-2 text-slate-200">
                      <span className="font-bold text-amber-400 shrink-0 text-xs mt-0.5">{num}.</span>
                      <span className="flex-1">{parseInline(rest)}</span>
                    </li>
                  );
                })}
            </ol>
          );
        }

        // Standard paragraph with soft line breaks
        return (
          <p key={bIdx} className="text-slate-100">
            {lines.map((line, lIdx) => (
              <React.Fragment key={lIdx}>
                {lIdx > 0 && <br />}
                {parseInline(line)}
              </React.Fragment>
            ))}
          </p>
        );
      })}
    </div>
  );
};
