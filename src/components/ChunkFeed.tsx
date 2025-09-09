import React, { useEffect, useRef, useState } from 'react';
import { useAppStore } from '../state/store';
import { decodeWavBase64 } from '../lib/audio';
import { ProgressText } from './ProgressText';
import { perfMark, perfMeasure } from '../lib/perf';

export function ChunkFeed({
  audioContext,
  onNext,
  headless = false,
}: {
  audioContext: AudioContext;
  onNext: () => void;
  headless?: boolean;
}) {
  const { chunks, currentIndex, updateChunk, isPlaying, speed, setStopPlayback, cancelled, setPlaybackMetrics, setSeekCurrent } = useAppStore();
  const sourceRef = useRef<AudioBufferSourceNode | null>(null);
  const gainRef = useRef<GainNode | null>(null);
  const startTimeRef = useRef<number>(0);
  const durationRef = useRef<number>(1);
  const [progress, setProgress] = useState(0);
  const [isDecoding, setDecoding] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const bufferCacheRef = useRef<Map<string, AudioBuffer>>(new Map());
  const nextPrebuiltRef = useRef<{ id: string; src: AudioBufferSourceNode; gain: GainNode } | null>(null);
  const currentChunkRef = useRef<string | null>(null);
  const pausedOffsetRef = useRef<number>(0);

  // Pause helper that snaps to current word boundary and cancels any scheduled nodes
  const pauseCurrent = (snapToWord: boolean) => {
    const cur = sourceRef.current;
    const c = chunks[currentIndex];
    if (!cur || !c) return;
    try {
      const rateNow = Math.max(0.25, Math.min(3.0, speed));
      const elapsed = Math.max(0, audioContext.currentTime - startTimeRef.current);
      let offsetSec = elapsed * rateNow;
      const maxSec = (cur.buffer ? cur.buffer.duration : durationRef.current * rateNow);
      offsetSec = Math.max(0, Math.min(maxSec, offsetSec));
      if (snapToWord && c.timings && c.timings.length > 0) {
        const curMs = offsetSec * 1000;
        const idx = c.timings.findIndex((t) => curMs < t.end_ms);
        const snapMs = idx >= 0 ? c.timings[idx].start_ms : c.timings[c.timings.length - 1].start_ms;
        offsetSec = Math.max(0, Math.min(maxSec, snapMs / 1000));
      }
      pausedOffsetRef.current = offsetSec;
      const durScaled = cur.buffer ? cur.buffer.duration / Math.max(0.01, rateNow) : durationRef.current;
      setPlaybackMetrics(offsetSec / Math.max(0.01, rateNow), durScaled);
    } catch {}
    try { (cur as unknown as { onended: null }).onended = null; } catch {}
    try { cur.stop(); } catch {}
    sourceRef.current = null;
    try { gainRef.current?.disconnect(); } catch {}
    gainRef.current = null;
    try { nextPrebuiltRef.current?.src.stop(); } catch {}
    nextPrebuiltRef.current = null;
    try { updateChunk(c.paragraph_id, { status: 'paused' }); } catch {}
  };
  

  // Auto-scroll to bottom when new chunks append
  useEffect(() => {
    containerRef.current?.lastElementChild?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [chunks.length]);

  // Pre-decode next buffer when currentIndex or chunks change
  useEffect(() => {
    const nextIdx = currentIndex + 1;
    const next = chunks[nextIdx];
    if (!next || !next.audioBase64) return;
    if (bufferCacheRef.current.has(next.paragraph_id)) return;
    void (async () => {
      try {
        const m1 = `decode-start:${next.paragraph_id}`;
        const m2 = `decode-end:${next.paragraph_id}`;
        perfMark(m1);
        const buf = await decodeWavBase64(audioContext, next.audioBase64!);
        perfMark(m2);
        perfMeasure(`decode:${next.paragraph_id}`, m1, m2);
        bufferCacheRef.current.set(next.paragraph_id, buf);
      } catch {}
    })();
  }, [chunks, currentIndex, audioContext]);

  // Play current chunk when state changes
  useEffect(() => {
    if (!isPlaying) {
      pauseCurrent(true);
      return;
    }
    void (async () => {
      if (cancelled) return;
      const c = chunks[currentIndex];
      if (!c || !c.audioBase64) return;
      currentChunkRef.current = c.paragraph_id;
      setDecoding(true);
      try {
        if (audioContext.state === 'suspended') {
          try { await audioContext.resume(); } catch {}
        }
        const buffer = bufferCacheRef.current.get(c.paragraph_id) || await decodeWavBase64(audioContext, c.audioBase64);
        bufferCacheRef.current.set(c.paragraph_id, buffer);
        const src = audioContext.createBufferSource();
        src.buffer = buffer;
        // Keep absolute time position when speed changes: compute remaining and reschedule
        const rate = Math.max(0.25, Math.min(3.0, speed));
        src.playbackRate.value = rate;
        const gain = audioContext.createGain();
        gain.gain.value = 1;
        src.connect(gain).connect(audioContext.destination);
        src.onended = () => {
          updateChunk(c.paragraph_id, { status: 'done' });
          onNext();
        };
        sourceRef.current = src;
        gainRef.current = gain;
        setStopPlayback(() => () => pauseCurrent(true));
        updateChunk(c.paragraph_id, { status: 'playing' });
        const startRate = Math.max(0.25, Math.min(3.0, src.playbackRate.value));
        const resumeAt = Math.max(0, Math.min(buffer.duration, pausedOffsetRef.current || 0));
        pausedOffsetRef.current = 0;
        startTimeRef.current = audioContext.currentTime - (resumeAt / Math.max(0.01, startRate));
        durationRef.current = buffer.duration / Math.max(0.01, startRate);
        setPlaybackMetrics(resumeAt / Math.max(0.01, startRate), durationRef.current);
        setSeekCurrent(() => (offsetSec: number) => {
          try { sourceRef.current?.stop(); } catch {}
          pausedOffsetRef.current = Math.max(0, Math.min(buffer.duration, offsetSec));
          const newsrc = audioContext.createBufferSource();
          newsrc.buffer = buffer;
          const rate = Math.max(0.25, Math.min(3.0, speed));
          newsrc.playbackRate.value = rate;
          const gain2 = audioContext.createGain();
          gain2.gain.value = 1;
          newsrc.connect(gain2).connect(audioContext.destination);
          sourceRef.current = newsrc;
          gainRef.current = gain2;
          startTimeRef.current = audioContext.currentTime - Math.max(0, Math.min(buffer.duration, pausedOffsetRef.current)) / Math.max(0.01, rate);
          durationRef.current = buffer.duration / Math.max(0.01, rate);
          const ramp = 0.012;
          const now2 = audioContext.currentTime;
          gain2.gain.setValueAtTime(0.0, now2);
          gain2.gain.linearRampToValueAtTime(1.0, now2 + ramp);
          newsrc.start(0, pausedOffsetRef.current);
        });
        // Short ramp to avoid clicks
        const ramp = 0.015;
        const now = audioContext.currentTime;
        gain.gain.setValueAtTime(0.0, now);
        gain.gain.linearRampToValueAtTime(1.0, now + ramp);
        perfMark(`chunk-start:${c.paragraph_id}`);
        try { src.start(0, resumeAt); } catch { src.start(0); }

        // Prebuild next source for gapless start
        const nextIdx = currentIndex + 1;
        const n = chunks[nextIdx];
        if (n && n.audioBase64) {
          const nbuf = bufferCacheRef.current.get(n.paragraph_id) || await decodeWavBase64(audioContext, n.audioBase64);
          bufferCacheRef.current.set(n.paragraph_id, nbuf);
          const nsrc = audioContext.createBufferSource();
          nsrc.buffer = nbuf;
          nsrc.playbackRate.value = rate;
          const ngain = audioContext.createGain();
          ngain.gain.value = 0;
          nsrc.connect(ngain).connect(audioContext.destination);
          nextPrebuiltRef.current = { id: n.paragraph_id, src: nsrc, gain: ngain };
          // Schedule to start at end of current
          const startAt = startTimeRef.current + durationRef.current;
          perfMark(`schedule-next-start:${n.paragraph_id}`);
          ngain.gain.setValueAtTime(0.0, startAt);
          ngain.gain.linearRampToValueAtTime(1.0, startAt + ramp);
          nsrc.start(startAt);
          perfMark(`schedule-next-end:${n.paragraph_id}`);
          perfMeasure(`schedule-next:${n.paragraph_id}`, `schedule-next-start:${n.paragraph_id}`, `schedule-next-end:${n.paragraph_id}`);
        } else {
          nextPrebuiltRef.current = null;
        }
        // drive progress smoothly
        const tick = () => {
          if (!sourceRef.current) return;
          const elapsed = audioContext.currentTime - startTimeRef.current;
          const p = Math.min(1, Math.max(0, elapsed / durationRef.current));
          setProgress(p);
          setPlaybackMetrics(Math.max(0, elapsed), durationRef.current);
          if (p < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      } finally {
        setDecoding(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPlaying, currentIndex]);

  // React to speed changes without restarting playback
  useEffect(() => {
    const rate = Math.max(0.25, Math.min(3.0, speed));
    const src = sourceRef.current;
    if (src) {
      try { src.playbackRate.value = rate; } catch {}
      const dur = src.buffer ? src.buffer.duration : durationRef.current;
      durationRef.current = dur / Math.max(0.01, rate);
    }
    // Rebuild next prebuilt source with updated rate and schedule time
    const rebuildNext = async () => {
      const n = chunks[currentIndex + 1];
      if (!n || !n.audioBase64) return;
      try { nextPrebuiltRef.current?.src.stop(); } catch {}
      const nbuf = bufferCacheRef.current.get(n.paragraph_id) || await decodeWavBase64(audioContext, n.audioBase64);
      bufferCacheRef.current.set(n.paragraph_id, nbuf);
      const nsrc = audioContext.createBufferSource();
      nsrc.buffer = nbuf;
      nsrc.playbackRate.value = rate;
      const ngain = audioContext.createGain();
      ngain.gain.value = 0;
      nsrc.connect(ngain).connect(audioContext.destination);
      nextPrebuiltRef.current = { id: n.paragraph_id, src: nsrc, gain: ngain };
      const ramp = 0.015;
      const startAt = startTimeRef.current + durationRef.current;
      ngain.gain.setValueAtTime(0.0, startAt);
      ngain.gain.linearRampToValueAtTime(1.0, startAt + ramp);
      try { nsrc.start(startAt); } catch {}
    };
    void rebuildNext();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [speed]);

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

  if (!audioContext) {
    return null;
  }
  if (headless) {
    return null;
  }
  return (
    <div ref={containerRef} className="mx-auto w-[min(720px,92vw)] py-8 space-y-6">
      {chunks.filter((x) => x.status !== 'queued').map((c, idx) => (
        <div key={c.paragraph_id} data-pid={c.paragraph_id} className="border-b border-white/5 pb-4">
          {idx === currentIndex ? (
            <ProgressText text={c.text} progress={isPlaying ? progress : 0} timings={c.timings} />
          ) : (
            <ProgressText text={c.text} progress={c.status === 'done' ? 1 : 0} timings={c.timings} />
          )}
        </div>
      ))}
      {isDecoding && (
        <div className="flex items-center gap-2 text-xs text-neutral-500">
          <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 3a9 9 0 1 0 9 9"/></svg>
          <span>Loading more…</span>
        </div>
      )}
    </div>
  );
}


