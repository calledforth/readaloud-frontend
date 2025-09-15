"use client";
import React from 'react';

export function AutoTextarea({
  value,
  onChange,
  placeholder,
  minRows = 6,
  maxHeightPx = 240,
  error,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  minRows?: number;
  maxHeightPx?: number;
  error?: boolean;
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
    <div>
      <textarea
        ref={ref}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={minRows}
        className={`w-full bg-transparent border ${error ? 'border-red-400/60' : 'border-white/10'} rounded-md text-sm p-3 overflow-auto scrollbar-thin resize-none transition-colors duration-300 focus:outline-none ${error ? 'focus:border-red-400/80' : 'focus:border-white/30'}`}
      />
      {value && (
        <div className="mt-2 text-xs text-neutral-400 flex items-center gap-4">
          <Meta label="Characters" value={value.replace(/\s/g, '').length.toString()} />
          <Meta label="Words" value={(value.trim().match(/\b\w+\b/g)?.length || 0).toString()} />
        </div>
      )}
    </div>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div className="inline-flex items-center gap-2">
      <span className="text-neutral-500">{label}</span>
      <span className="text-neutral-300 tabular-nums">{value}</span>
    </div>
  );
}


