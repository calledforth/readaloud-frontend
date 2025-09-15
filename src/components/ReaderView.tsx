import React from 'react';
import { useAppStore } from '../state/store';

export function ReaderView({
  onTogglePlay, // eslint-disable-line @typescript-eslint/no-unused-vars
}: {
  onTogglePlay: () => void;
}) {
  const { chunks, currentIndex, currentElapsedSec } = useAppStore();

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
              <p className={`mx-auto max-w-3xl leading-9 tracking-[0.02em] ${isCurrent || isPast ? 'text-neutral-100 text-xl md:text-2xl' : 'text-neutral-400 text-lg md:text-xl'}`}>
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
                  : c.text}
              </p>
            </div>
          );
        })}

      {/* MiniPlayer renders separately */}

      <style jsx>{`
        /* Subtle wave: opacity shimmer only, no vertical movement to avoid layout jump */
        @keyframes charwave { 0% { opacity: 0.85; } 50% { opacity: 1.0; } 100% { opacity: 0.95; } }
        .wave-letter { animation: charwave 420ms ease-in-out both; will-change: opacity; }
      `}</style>
    </div>
  );
}


