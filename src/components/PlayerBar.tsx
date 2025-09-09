import React from 'react';
import { useAppStore } from '../state/store';

export function PlayerBar({ onPrev, onNext }: { onPrev: () => void; onNext: () => void }) {
  const { isPlaying, setPlaying, speed, setSpeed, setCancelled, stopPlayback, cancelAllControllers, clearTimers } = useAppStore();

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 w-[min(720px,92vw)] rounded-xl border border-white/10 bg-white/5 backdrop-blur-md p-3 flex items-center gap-3">
      <button
        onClick={() => setPlaying(!isPlaying)}
        className="px-3 py-1 rounded-md border border-white/10 bg-white/10 text-xs"
        aria-label={isPlaying ? 'Pause' : 'Play'}
      >
        {/* Play/Pause icon */}
        {isPlaying ? (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="5" width="4" height="14"/><rect x="14" y="5" width="4" height="14"/></svg>
        ) : (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
        )}
      </button>
      <button onClick={onPrev} className="px-2 py-1 rounded-md border border-white/10 text-xs" aria-label="Previous">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M6 6h2v12H6z"/><path d="M20 18L10 12l10-6z"/></svg>
      </button>
      <button onClick={onNext} className="px-2 py-1 rounded-md border border-white/10 text-xs" aria-label="Next">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M16 6h2v12h-2z"/><path d="M4 18l10-6L4 6z"/></svg>
      </button>
      <button
        onClick={() => {
          setCancelled(true);
          setPlaying(false);
          stopPlayback?.();
          cancelAllControllers();
          clearTimers?.();
        }}
        className="px-2 py-1 rounded-md border border-white/10 text-xs"
        aria-label="Stop"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="6" width="12" height="12"/></svg>
      </button>
      <div className="ml-auto flex items-center gap-2">
        <span className="text-xs text-neutral-400">Speed</span>
        <select
          className="bg-transparent border border-white/10 rounded-md text-xs px-2 py-1"
          value={speed}
          onChange={(e) => setSpeed(parseFloat(e.target.value))}
        >
          {[0.5, 0.75, 1.0, 1.25, 1.5, 2.0, 2.5, 3.0].map((s) => (
            <option key={s} value={s} className="bg-black">
              {s}x
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}


