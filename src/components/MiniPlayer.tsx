"use client";
import React from 'react';
import { Play, Pause, RotateCcw } from 'lucide-react';
import { useAppStore } from '../state/store';

export function MiniPlayer() {
  const {
    isPlaying,
    setPlaying,
    setCurrentIndex,
    setChunks,
    setPlaybackMetrics,
    speed,
    setSpeed,
    stopPlayback,
    seekCurrent,
    chunks,
  } = useAppStore();

  const hasAudio = chunks.some((c) => c.status !== 'queued');
  if (!hasAudio) return null;

  const onToggle = () => setPlaying(!isPlaying);
  const onReset = () => {
    // Hard pause and clear scheduled nodes
    try { stopPlayback?.(); } catch {}
    // Reset store progression
    try { setPlaying(false); } catch {}
    try { setCurrentIndex(0); } catch {}
    try {
      const normalized = chunks.map((c) => ({
        ...c,
        status: (c.status === 'queued' ? 'queued' : 'ready') as 'queued' | 'ready',
      }));
      setChunks(normalized);
    } catch {}
    // Reset metrics and offset
    try { setPlaybackMetrics(0, 0); } catch {}
    // Move paused offset to 0 without starting audio
    try { seekCurrent?.(0); } catch {}
  };

  const speeds = [0.5, 0.75, 1.0, 1.25, 1.5, 2.0, 2.5, 3.0];
  const [openSpeed, setOpenSpeed] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    if (!openSpeed) return;
    const onDocClick = (e: MouseEvent | TouchEvent) => {
      const el = containerRef.current;
      if (!el) return;
      if (e.target && el.contains(e.target as Node)) return;
      setOpenSpeed(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpenSpeed(false);
    };
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('touchstart', onDocClick, { passive: true });
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('touchstart', onDocClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [openSpeed]);

  return (
    <div ref={containerRef} className="auto-hide-chrome fixed bottom-16 right-8 z-40 select-none">
      <div className="rounded-2xl bg-transparent p-2 flex flex-col items-center gap-3 relative">
        <button
          onClick={onToggle}
          className={`w-10 h-10 rounded-full grid place-items-center text-white hover:opacity-90 transition-opacity leading-none`}
          aria-label={isPlaying ? 'Pause' : 'Play'}
          title={isPlaying ? 'Pause' : 'Play'}
        >
          {isPlaying ? (
            <Pause className="w-4 h-4" />
          ) : (
            <Play className="w-4 h-4" />
          )}
        </button>

        <div className="h-px w-8 bg-white/15" />

        <button
          onClick={onReset}
          className="w-10 h-10 rounded-full grid place-items-center text-red-400 hover:text-red-300 leading-none"
          aria-label="Reset to start"
          title="Reset to start of paragraph"
        >
          <RotateCcw className="w-4 h-4" />
        </button>

        <div className="h-px w-8 bg-white/15" />

        <div className="relative">
          <button
            onClick={() => setOpenSpeed((v) => !v)}
            className="px-3 py-1.5 rounded-md text-[12px] text-white hover:opacity-90"
            aria-haspopup="menu"
            aria-expanded={openSpeed}
          >
            {speed}x
          </button>
          {openSpeed && (
            <div className="absolute right-full mr-3 top-1/2 -translate-y-1/2 w-28 rounded-lg bg-neutral-900/95 backdrop-blur p-2 shadow-lg border border-white/10">
              <div className="grid grid-cols-2 gap-1">
                {speeds.map((s) => (
                  <button
                    key={s}
                    onClick={() => { setSpeed(s); setOpenSpeed(false); }}
                    className={`px-2 py-1 text-[11px] rounded-md ${speed === s ? 'bg-white text-black' : 'text-neutral-300 hover:bg-white/10'}`}
                  >
                    {s}x
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


