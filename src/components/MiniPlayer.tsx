"use client";
import React from 'react';
import { Play, Pause, RotateCcw, XOctagon } from 'lucide-react';
import { useAppStore } from '../state/store';
import { AudioController } from '../lib/AudioController';

export function MiniPlayer() {
  const { 
    isPlaying,
    setPlaying,
    setCurrentIndex,
    setChunks,
    setPlaybackMetrics,
    speed,
    // setSpeed, // not used directly here; speed setter is called via AudioController.setSpeed
    chunks,
    cancelAllControllers,
    currentIndex,
  } = useAppStore();

  // Move hooks to the top before any early returns
  const [openSpeed, setOpenSpeed] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement | null>(null);

  const hasAudio = chunks.some((c) => c.status !== 'queued');
  const current = chunks[currentIndex];
  const canPlay = !!current && (current.status === 'ready' || current.status === 'paused') && !!current.audioBase64;

  const onToggle = async () => {
    try { AudioController.init(); } catch {}
    if (!isPlaying) {
      await AudioController.play();
    } else {
      AudioController.pause();
    }
  };
  const onReset = () => {
    // Hard pause/stop controller
    try { AudioController.stop(); } catch {}
    // Cancel inflight network and timers
    try { cancelAllControllers(); } catch {}
    // Reset store progression
    try { setPlaying(false); } catch {}
    try { setCurrentIndex(0); } catch {}
    try {
      const normalized = chunks.map((c, idx) => {
        if (idx < currentIndex) return { ...c, status: 'done' as const };
        if (idx === currentIndex) return { ...c, status: 'ready' as const };
        return { ...c, status: (c.status === 'queued' ? 'queued' : 'ready') as 'queued' | 'ready' };
      });
      setChunks(normalized);
    } catch {}
    // Reset metrics and offset
    try { setPlaybackMetrics(0, 0); } catch {}
  };

  const speeds = [0.5, 0.75, 1.0, 1.25, 1.5, 2.0, 2.5, 3.0];

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

  // Early return after all hooks
  if (!hasAudio) return null;

  return (
    <div ref={containerRef} className="auto-hide-chrome fixed bottom-20 md:bottom-16 right-4 md:right-8 z-40 select-none">
      <div className="rounded-2xl bg-transparent p-2 flex flex-col items-center gap-3 relative">
        <button
          onClick={onToggle}
          disabled={!canPlay && !isPlaying}
          className={`w-10 h-10 rounded-full grid place-items-center ${(!canPlay && !isPlaying) ? 'text-white/40' : 'text-white'} hover:opacity-90 transition-opacity leading-none`}
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
          className="w-10 h-10 rounded-full grid place-items-center text-yellow-300 hover:text-yellow-200 leading-none"
          aria-label="Reset to start"
          title="Reset to start of paragraph"
        >
          <RotateCcw className="w-4 h-4" />
        </button>

        <div className="h-px w-8 bg-white/15" />

        <button
          onClick={() => {
            const hasPending = useAppStore.getState().controllers.length > 0 || useAppStore.getState().chunks.some(c => c.status === 'queued' || c.status === 'synth');
            if (!hasPending) return;
            const ok = window.confirm('Stop all pending synthesis requests?');
            if (ok) {
              try { cancelAllControllers(); } catch {}
            }
          }}
          className="w-10 h-10 rounded-full grid place-items-center text-red-400 hover:text-red-300 leading-none"
          aria-label="Stop pending synthesis"
          title="Stop pending synthesis"
        >
          <XOctagon className="w-4 h-4" />
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
                    onClick={async () => { await AudioController.setSpeed(s); setOpenSpeed(false); }}
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


