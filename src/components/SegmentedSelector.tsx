"use client";
import React from 'react';

export type Mode = 'text' | 'pdf';

export function SegmentedSelector({ value, onChange }: { value: Mode; onChange: (m: Mode) => void }) {
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const textRef = React.useRef<HTMLButtonElement | null>(null);
  const pdfRef = React.useRef<HTMLButtonElement | null>(null);
  const [indicator, setIndicator] = React.useState<{ left: number; width: number }>({ left: 0, width: 0 });

  const updateIndicator = React.useCallback(() => {
    const map: Record<Mode, HTMLButtonElement | null> = { text: textRef.current, pdf: pdfRef.current };
    const btn = map[value];
    const root = containerRef.current;
    if (!btn || !root) return;
    const left = btn.offsetLeft;
    const width = btn.offsetWidth;
    setIndicator({ left, width });
  }, [value]);

  React.useEffect(() => { updateIndicator(); }, [updateIndicator]);
  React.useEffect(() => {
    const onResize = () => updateIndicator();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [updateIndicator]);

  return (
    <div ref={containerRef} className="relative inline-flex items-center text-sm pb-2">
      <button
        ref={textRef}
        onClick={() => onChange('text')}
        className={`px-4 pt-1 pb-1 text-sm transition-colors ${value === 'text' ? 'text-white' : 'text-neutral-300 hover:text-white'}`}
        aria-current={value === 'text' ? 'true' : undefined}
      >
        <span className="opacity-90"><strong>ReadAloud</strong> from text</span>
      </button>
      <div className="mx-2 h-4 w-px bg-white/15" aria-hidden />
      <button
        ref={pdfRef}
        onClick={() => onChange('pdf')}
        className={`px-4 pt-1 pb-1 text-sm transition-colors ${value === 'pdf' ? 'text-white' : 'text-neutral-300 hover:text-white'}`}
        aria-current={value === 'pdf' ? 'true' : undefined}
      >
        <span className="opacity-90"><strong>ReadAloud</strong> from PDF</span>
      </button>
      <div
        className="absolute -bottom-0.5 h-[2px] bg-white rounded"
        style={{ left: 0, width: `${indicator.width}px`, transform: `translateX(${indicator.left}px)`, transition: 'transform 300ms ease, width 300ms ease' }}
        aria-hidden
      />
    </div>
  );
}


