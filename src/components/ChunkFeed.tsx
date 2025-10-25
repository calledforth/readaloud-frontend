import React, { useEffect, useRef, useState } from 'react';
import { useAppStore } from '../state/store';
import { ProgressText } from './ProgressText';
import { Loader2 } from 'lucide-react';

export function ChunkFeed({ headless = false }: { headless?: boolean; }) {
  const { chunks, currentIndex, isPlaying, currentElapsedSec, currentDurationSec, isFetchingChunks, sessionStatus } = useAppStore();
  const [progress, setProgress] = useState(0);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const currentChunkRef = useRef<string | null>(null);

  // Auto-scroll to bottom when new chunks append
  useEffect(() => {
    containerRef.current?.lastElementChild?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [chunks.length]);

  // derive progress from store metrics
  useEffect(() => {
    const dur = currentDurationSec || 1;
    const p = Math.min(1, Math.max(0, (currentElapsedSec || 0) / dur));
    setProgress(p);
  }, [currentElapsedSec, currentDurationSec]);

  // Auto-scroll only when rendering list (disabled in headless mode)
  useEffect(() => {
    if (headless) return;
    const id = currentChunkRef.current;
    if (!id) return;
    const el = containerRef.current?.querySelector(`[data-pid="${id}"]`);
    if (el && 'scrollIntoView' in el) {
      (el as HTMLElement).scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [currentIndex, headless]);

  if (headless) {
    return null;
  }
  const visibleChunks = chunks.filter((x) => x.status !== 'queued');
  const queuedChunks = chunks.filter((x) => x.status === 'queued');
  const hasQueuedChunks = queuedChunks.length > 0;

  return (
    <div ref={containerRef} className="mx-auto w-[min(720px,92vw)] py-8 space-y-6">
      {visibleChunks.map((c, idx) => (
        <div key={c.paragraph_id} data-pid={c.paragraph_id} className="border-b border-white/5 pb-4">
          {idx === currentIndex ? (
            <ProgressText text={c.text} progress={isPlaying ? progress : 0} timings={c.timings} />
          ) : (
            <ProgressText text={c.text} progress={c.status === 'done' ? 1 : 0} timings={c.timings} />
          )}
        </div>
      ))}

      {/* Divider and remaining queued chunks when a session was cancelled */}
      {sessionStatus === 'cancelled' && hasQueuedChunks && (
        <div className="space-y-3">
          <div className="flex items-center gap-3 text-xs text-amber-300/80">
            <div className="h-px flex-1 bg-amber-400/30" />
            <span className="uppercase tracking-wide">Not synthesized yet</span>
            <div className="h-px flex-1 bg-amber-400/30" />
          </div>
          {queuedChunks.map((c) => (
            <div key={c.paragraph_id} data-pid={c.paragraph_id} className="border-b border-white/5 pb-4 opacity-70">
              <ProgressText text={c.text} progress={0} timings={c.timings} />
            </div>
          ))}
        </div>
      )}
      
      {/* Loading indicator when chunks are being fetched */}
      {isFetchingChunks && hasQueuedChunks && (
        <div className="flex items-center justify-center py-4">
          <div className="flex items-center gap-2 text-neutral-400">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-sm">Synthesizing {queuedChunks.length} remaining chunk{queuedChunks.length !== 1 ? 's' : ''}...</span>
          </div>
        </div>
      )}
    </div>
  );
}


