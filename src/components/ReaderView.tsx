import React from 'react';
import { useAppStore } from '../state/store';
import { Loader2 } from 'lucide-react';

// Minimal markdown formatter for inline styles and lists
const formatMarkdown = (text: string): React.ReactNode => {
  const lines = text.split(/\r?\n/);

  const blocks: React.ReactNode[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (/^\s*([-*])\s+/.test(line)) {
      // Unordered list
      const items: string[] = [];
      while (i < lines.length && /^\s*([-*])\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*([-*])\s+/, ''));
        i++;
      }
      blocks.push(
        <ul key={`ul-${i}`} className="list-disc list-inside space-y-1 text-left">
          {items.map((it, idx) => (
            <li key={idx}>{formatInline(it)}</li>
          ))}
        </ul>
      );
      continue;
    }
    if (/^\s*\d+\.\s+/.test(line)) {
      // Ordered list
      const items: string[] = [];
      while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*\d+\.\s+/, ''));
        i++;
      }
      blocks.push(
        <ol key={`ol-${i}`} className="list-decimal list-inside space-y-1 text-left">
          {items.map((it, idx) => (
            <li key={idx}>{formatInline(it)}</li>
          ))}
        </ol>
      );
      continue;
    }
    // Regular line - return as inline content, not wrapped in <p>
    blocks.push(
      <React.Fragment key={`line-${i}`}>
        {formatInline(line)}
        {i < lines.length - 1 && <br />}
      </React.Fragment>
    );
    i++;
  }

  return <>{blocks}</>;
};

function formatInline(text: string): React.ReactNode[] {
  // Handle bold **text**, italic *text* or _text_, and code `code`
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`|_[^_]+_)/g);
  return parts.map((part, idx) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={idx} className="font-semibold text-white">{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith('*') && part.endsWith('*')) {
      return <em key={idx} className="italic text-neutral-200">{part.slice(1, -1)}</em>;
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return <code key={idx} className="bg-neutral-800 px-1 py-0.5 rounded text-sm font-mono text-cyan-300">{part.slice(1, -1)}</code>;
    }
    if (part.startsWith('_') && part.endsWith('_')) {
      return <em key={idx} className="italic text-neutral-200">{part.slice(1, -1)}</em>;
    }
    return <React.Fragment key={idx}>{part}</React.Fragment>;
  });
}

export function ReaderView({
  onTogglePlay, // eslint-disable-line @typescript-eslint/no-unused-vars
}: {
  onTogglePlay: () => void;
}) {
  const { chunks, currentIndex, currentElapsedSec, isFetchingChunks } = useAppStore();

  // Keeping formatter around for future; no lint error since it's used in UI removal of slider

  const containerRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    const root = containerRef.current;
    if (!root) return;
    const el = root.querySelector('[data-current="true"]') as HTMLElement | null;
    if (el && 'scrollIntoView' in el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [currentIndex]);

  return (
    <div ref={containerRef} className="flex-1 overflow-y-auto px-6 py-12 space-y-12">
      {chunks
        .filter((c) => c.status !== 'queued')
        .map((c, idx) => {
          const isCurrent = idx === currentIndex;
          const isPast = idx < currentIndex;
          return (
            <div key={c.paragraph_id} data-current={isCurrent ? 'true' : undefined} className={`text-center transition-all ${isCurrent ? 'opacity-100' : isPast ? 'opacity-100' : 'opacity-60'}`}>
              <p className={`mx-auto max-w-3xl leading-9 tracking-[0.02em] ${isCurrent || isPast ? 'text-neutral-100 text-xl md:text-2xl shimmer-text' : 'text-neutral-400 text-lg md:text-xl'}`}>
                {c.timings && isCurrent
                  ? c.timings.map((w, i) => {
                      const cur = currentElapsedSec * 1000;
                      const isCurrentWord = cur >= w.start_ms && cur < w.end_ms;
                      const isPassed = cur >= w.end_ms;
                      return (
                        <span
                          key={i}
                          className={`inline-block mr-1 ${isCurrentWord ? 'text-white' : isPassed ? 'text-neutral-100' : 'text-neutral-400'}`}
                        >
                          {isCurrentWord
                            ? Array.from(w.word).map((ch, j) => (
                                <span
                                  key={j}
                                  className="inline-block wave-letter"
                                  style={{ animationDelay: `${j * 0.03}s` }}
                                >
                                  {ch}
                                </span>
                              ))
                            : w.word}
                        </span>
                      );
                    })
                  : formatMarkdown(c.text)}
              </p>
            </div>
          );
        })}

      {/* Loading indicator when chunks are being fetched */}
      {isFetchingChunks && chunks.some(c => c.status === 'queued') && (
        <div className="flex items-center justify-center py-8">
          <div className="flex items-center gap-3 text-neutral-400">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-sm shimmer-text">Synthesizing remaining chunks...</span>
          </div>
        </div>
      )}

      {/* MiniPlayer renders separately */}

      <style jsx>{`
        /* Subtle wave: opacity shimmer only, no vertical movement to avoid layout jump */
        @keyframes charwave { 0% { opacity: 0.85; } 50% { opacity: 1.0; } 100% { opacity: 0.95; } }
        .wave-letter { animation: charwave 420ms ease-in-out both; will-change: opacity; }
        
        /* Text shimmer effect for the entire paragraph */
        @keyframes textshimmer { 0% { opacity: 0.9; } 50% { opacity: 1.0; } 100% { opacity: 0.9; } }
        .shimmer-text { animation: textshimmer 2s ease-in-out infinite; }
      `}</style>
    </div>
  );
}


