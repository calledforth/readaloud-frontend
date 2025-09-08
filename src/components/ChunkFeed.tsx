import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useAppStore } from '../state/store';
import { decodeWavBase64 } from '../lib/audio';
import { ProgressText } from './ProgressText';
import { perfMark, perfMeasure } from '../lib/perf';

export function ChunkFeed({
  audioContext,
  onNext,
}: {
  audioContext: AudioContext;
  onNext: () => void;
}) {
  const { chunks, currentIndex, setCurrentIndex, updateChunk, isPlaying, speed, setStopPlayback, cancelled } = useAppStore();
  const sourceRef = useRef<AudioBufferSourceNode | null>(null);
  const gainRef = useRef<GainNode | null>(null);
  const startTimeRef = useRef<number>(0);
  const durationRef = useRef<number>(1);
  const [progress, setProgress] = useState(0);
  const [isDecoding, setDecoding] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const bufferCacheRef = useRef<Map<string, AudioBuffer>>(new Map());
  const nextPrebuiltRef = useRef<{ id: string; src: AudioBufferSourceNode; gain: GainNode } | null>(null);

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
      sourceRef.current?.stop();
      return;
    }
    void (async () => {
      if (cancelled) return;
      const c = chunks[currentIndex];
      if (!c || !c.audioBase64) return;
      setDecoding(true);
      try {
        if (audioContext.state === 'suspended') {
          try { await audioContext.resume(); } catch {}
        }
        const buffer = bufferCacheRef.current.get(c.paragraph_id) || await decodeWavBase64(audioContext, c.audioBase64);
        bufferCacheRef.current.set(c.paragraph_id, buffer);
        const src = audioContext.createBufferSource();
        src.buffer = buffer;
        src.playbackRate.value = speed;
        const gain = audioContext.createGain();
        gain.gain.value = 1;
        src.connect(gain).connect(audioContext.destination);
        src.onended = () => {
          updateChunk(c.paragraph_id, { status: 'done' });
          onNext();
        };
        sourceRef.current = src;
        gainRef.current = gain;
        setStopPlayback(() => () => {
          try { sourceRef.current?.stop(); } catch {}
          sourceRef.current = null;
          try { gainRef.current?.disconnect(); } catch {}
          gainRef.current = null;
        });
        updateChunk(c.paragraph_id, { status: 'playing' });
        startTimeRef.current = audioContext.currentTime;
        durationRef.current = buffer.duration / Math.max(0.01, src.playbackRate.value);
        // Short ramp to avoid clicks
        const ramp = 0.015;
        const now = audioContext.currentTime;
        gain.gain.setValueAtTime(0.0, now);
        gain.gain.linearRampToValueAtTime(1.0, now + ramp);
        perfMark(`chunk-start:${c.paragraph_id}`);
        src.start(0);

        // Prebuild next source for gapless start
        const nextIdx = currentIndex + 1;
        const n = chunks[nextIdx];
        if (n && n.audioBase64) {
          const nbuf = bufferCacheRef.current.get(n.paragraph_id) || await decodeWavBase64(audioContext, n.audioBase64);
          bufferCacheRef.current.set(n.paragraph_id, nbuf);
          const nsrc = audioContext.createBufferSource();
          nsrc.buffer = nbuf;
          nsrc.playbackRate.value = speed;
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
          if (p < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      } finally {
        setDecoding(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPlaying, currentIndex, speed]);

  if (!audioContext) {
    return null;
  }
  return (
    <div ref={containerRef} className="mx-auto w-[min(720px,92vw)] py-8 space-y-6">
      {chunks.map((c, idx) => (
        <div key={c.paragraph_id} className="border-b border-white/5 pb-4">
          {idx === currentIndex ? (
            <ProgressText text={c.text} progress={isPlaying ? progress : 0} timings={c.timings} />
          ) : (
            <ProgressText text={c.text} progress={c.status === 'done' ? 1 : 0} timings={c.timings} />
          )}
        </div>
      ))}
      {isDecoding && <p className="text-xs text-neutral-500">Decoding...</p>}
    </div>
  );
}


