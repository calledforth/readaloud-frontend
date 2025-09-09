import React from 'react';

// Progressive highlighter: renders base grey text, and a white overlay
// clipped by width percentage for a smooth left-to-right highlight.
export function ProgressText({ text, progress, timings }: { text: string; progress: number; timings?: Array<{ word: string; start_ms: number; end_ms: number; char_start: number; char_end: number }> }) {
  const pct = Math.max(0, Math.min(1, progress)) * 100;
  if (!timings || timings.length === 0) {
    return (
      <div className="relative">
        <p className="text-base text-neutral-400 leading-8 whitespace-pre-wrap">{text}</p>
        <p
          className="pointer-events-none absolute inset-0 text-base text-neutral-100 leading-8 whitespace-pre-wrap overflow-hidden"
          style={{ width: `${pct}%` }}
          aria-hidden
        >
          {text}
        </p>
      </div>
    );
  }

  const totalMs = timings[timings.length - 1].end_ms;
  const currentMs = totalMs * Math.max(0, Math.min(1, progress));
  // If progress is 0, avoid highlighting the first word
  const cutoff = currentMs <= 0 ? -1 : timings.findIndex((t) => t.end_ms >= currentMs);
  const charCut = cutoff >= 0 ? timings[cutoff].char_end : 0;

  return (
    <div className="relative">
      <p className="text-base text-neutral-400 leading-8 whitespace-pre-wrap">{text}</p>
      <p className="pointer-events-none absolute inset-0 text-base text-neutral-100 leading-8 whitespace-pre-wrap overflow-hidden" aria-hidden>
        {text.slice(0, charCut)}
      </p>
    </div>
  );
}


