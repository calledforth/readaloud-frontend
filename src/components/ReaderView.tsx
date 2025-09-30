import React from 'react';
import { useAppStore } from '../state/store';
import { Loader2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import type { Components } from 'react-markdown';

// Custom components for ReactMarkdown styling
const markdownComponents: Components = {
  // Headers
  h1: ({ children, ...props }) => (
    <h1 {...props} className="text-3xl font-bold text-white mb-4 mt-6">{children}</h1>
  ),
  h2: ({ children, ...props }) => (
    <h2 {...props} className="text-2xl font-bold text-white mb-3 mt-5">{children}</h2>
  ),
  h3: ({ children, ...props }) => (
    <h3 {...props} className="text-xl font-semibold text-white mb-2 mt-4">{children}</h3>
  ),
  h4: ({ children, ...props }) => (
    <h4 {...props} className="text-lg font-semibold text-neutral-100 mb-2 mt-3">{children}</h4>
  ),
  h5: ({ children, ...props }) => (
    <h5 {...props} className="text-base font-semibold text-neutral-100 mb-2 mt-3">{children}</h5>
  ),
  h6: ({ children, ...props }) => (
    <h6 {...props} className="text-sm font-semibold text-neutral-200 mb-2 mt-2">{children}</h6>
  ),
  // Paragraphs
  p: ({ children, ...props }) => (
    <p {...props} className="mb-3 leading-relaxed">{children}</p>
  ),
  // Lists
  ul: ({ children, ...props }) => (
    <ul {...props} className="list-disc list-outside ml-6 mb-3 space-y-1">{children}</ul>
  ),
  ol: ({ children, ...props }) => (
    <ol {...props} className="list-decimal list-outside ml-6 mb-3 space-y-1">{children}</ol>
  ),
  li: ({ children, ...props }) => (
    <li {...props} className="text-neutral-200">{children}</li>
  ),
  // Inline formatting
  strong: ({ children, ...props }) => (
    <strong {...props} className="font-semibold text-white">{children}</strong>
  ),
  em: ({ children, ...props }) => (
    <em {...props} className="italic text-neutral-200">{children}</em>
  ),
  code: ({ children, ...props }) => (
    <code {...props} className="bg-neutral-800 px-1.5 py-0.5 rounded text-sm font-mono text-cyan-300">{children}</code>
  ),
  // Code blocks
  pre: ({ children, ...props }) => (
    <pre {...props} className="bg-neutral-800 rounded-lg p-4 mb-3 overflow-x-auto">{children}</pre>
  ),
  // Blockquotes
  blockquote: ({ children, ...props }) => (
    <blockquote {...props} className="border-l-4 border-neutral-600 pl-4 italic text-neutral-300 mb-3">{children}</blockquote>
  ),
  // Horizontal rules
  hr: () => (
    <hr className="border-neutral-700 my-6" />
  ),
  // Links
  a: ({ children, href, ...props }) => (
    <a {...props} href={href as string | undefined} className="text-cyan-400 hover:text-cyan-300 underline" target="_blank" rel="noopener noreferrer">{children}</a>
  ),
};

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
            <div key={c.paragraph_id} data-current={isCurrent ? 'true' : undefined} className={`text-left transition-all ${isCurrent ? 'opacity-100' : isPast ? 'opacity-100' : 'opacity-60'}`}>
              <div className={`mx-auto max-w-3xl leading-9 tracking-[0.02em] ${isCurrent || isPast ? 'text-neutral-100 text-xl md:text-2xl shimmer-text' : 'text-neutral-400 text-lg md:text-xl'}`}>
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
                  : <ReactMarkdown components={markdownComponents}>{c.text}</ReactMarkdown>}
              </div>
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


