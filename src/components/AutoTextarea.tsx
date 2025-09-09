"use client";
import React from 'react';

export function AutoTextarea({
  value,
  onChange,
  placeholder,
  minRows = 4,
  maxHeightPx = 240,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  minRows?: number;
  maxHeightPx?: number;
}) {
  const ref = React.useRef<HTMLTextAreaElement | null>(null);

  React.useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    const next = Math.min(maxHeightPx, el.scrollHeight);
    el.style.height = `${next}px`;
  }, [value, maxHeightPx]);

  return (
    <textarea
      ref={ref}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={minRows}
      className="w-full bg-transparent border border-white/10 rounded-md text-sm p-3 overflow-auto scrollbar-thin resize-none"
    />
  );
}


