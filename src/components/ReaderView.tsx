import React from 'react';
import { useAppStore } from '../state/store';

export function ReaderView({
  onTogglePlay,
}: {
  onTogglePlay: () => void;
}) {
  const { chunks, currentIndex, isPlaying, speed, setSpeed, currentElapsedSec } = useAppStore();

  // Keeping formatter around for future; no lint error since it's used in UI removal of slider

  return (
    <div className="flex-1 overflow-y-auto px-6 py-12 space-y-10">
      {chunks
        .filter((c) => c.status !== 'queued')
        .map((c, idx) => {
          const isCurrent = idx === currentIndex;
          const isPast = idx < currentIndex;
          return (
            <div key={c.paragraph_id} className={`text-center transition-all ${isCurrent ? 'opacity-100' : isPast ? 'opacity-75' : 'opacity-60'}`}>
              <p className={`mx-auto max-w-2xl leading-8 ${isCurrent ? 'text-neutral-100 text-lg' : 'text-neutral-400 text-base'}`}>
                {c.timings && isCurrent
                  ? c.timings.map((w, i) => {
                      const cur = currentElapsedSec * 1000;
                      const isCurrentWord = cur >= w.start_ms && cur < w.end_ms;
                      const isPassed = cur >= w.end_ms;
                      return (
                        <span
                          key={i}
                          className={`inline-block mr-1 ${isCurrentWord ? 'animate-[shimmer_0.8s_ease-in-out] text-white' : isPassed ? 'text-neutral-200' : 'text-neutral-400'}`}
                        >
                          {w.word}
                        </span>
                      );
                    })
                  : c.text}
              </p>
            </div>
          );
        })}

      <div className="fixed bottom-3 left-1/2 -translate-x-1/2 w-[min(720px,92vw)] rounded-full border border-white/10 bg-white/5 backdrop-blur-md px-3 py-2 flex items-center gap-3">
        <button
          onClick={onTogglePlay}
          className="rounded-full w-9 h-9 bg-white text-black hover:bg-neutral-200 transition flex items-center justify-center"
          aria-label={isPlaying ? 'Pause' : 'Play'}
        >
          {isPlaying ? (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="5" width="4" height="14"/><rect x="14" y="5" width="4" height="14"/></svg>
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
          )}
        </button>
        <div className="ml-auto flex items-center gap-2">
          <span className="text-xs text-neutral-400">Speed</span>
          <div className="flex items-center gap-1">
            {[0.5, 0.75, 1.0, 1.25, 1.5, 2.0, 2.5, 3.0].map((s) => (
              <button
                key={s}
                onClick={() => setSpeed(s)}
                className={`px-2 py-1 text-[11px] rounded-md border ${speed === s ? 'border-white/50 bg-white/20' : 'border-white/10 bg-white/5 hover:bg-white/10'}`}
                aria-label={`${s}x`}
              >
                {s}x
              </button>
            ))}
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes shimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
        .animate-[shimmer_0.8s_ease-in-out] { background: linear-gradient(90deg,transparent 0%,rgba(255,255,255,.8) 50%,transparent 100%); background-size:200% 100%; -webkit-background-clip:text; background-clip:text; }
      `}</style>
    </div>
  );
}


