import React from 'react';
import { useAppStore } from '../state/store';

export function PlayerBar({ onPrev, onNext }: { onPrev: () => void; onNext: () => void }) {
  const { isPlaying, setPlaying, speed, setSpeed, setCancelled, stopPlayback, cancelAllControllers } = useAppStore();

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 w-[min(720px,92vw)] rounded-xl border border-white/10 bg-white/5 backdrop-blur-md p-3 flex items-center gap-3">
      <button
        onClick={() => setPlaying(!isPlaying)}
        className="px-3 py-1 rounded-md border border-white/10 bg-white/10 text-xs"
      >
        {isPlaying ? 'Pause' : 'Play'}
      </button>
      <button onClick={onPrev} className="px-2 py-1 rounded-md border border-white/10 text-xs">
        Prev
      </button>
      <button onClick={onNext} className="px-2 py-1 rounded-md border border-white/10 text-xs">
        Next
      </button>
      <button
        onClick={() => {
          setCancelled(true);
          setPlaying(false);
          stopPlayback?.();
          cancelAllControllers();
        }}
        className="px-2 py-1 rounded-md border border-white/10 text-xs"
      >
        Stop
      </button>
      <div className="ml-auto flex items-center gap-2">
        <span className="text-xs text-neutral-400">Speed</span>
        <select
          className="bg-transparent border border-white/10 rounded-md text-xs px-2 py-1"
          value={speed}
          onChange={(e) => setSpeed(parseFloat(e.target.value))}
        >
          {[0.75, 1.0, 1.25, 1.5].map((s) => (
            <option key={s} value={s} className="bg-black">
              {s}x
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}


