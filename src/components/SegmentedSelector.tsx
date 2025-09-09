"use client";
import React from 'react';

export type Mode = 'text' | 'pdf';

export function SegmentedSelector({ value, onChange }: { value: Mode; onChange: (m: Mode) => void }) {
  const makeBtn = (key: Mode, label: string) => {
    const active = value === key;
    return (
      <button
        key={key}
        onClick={() => onChange(key)}
        className={`px-3 pt-1 pb-1 text-sm text-neutral-300 hover:text-white transition relative`}
        aria-current={active ? 'true' : undefined}
      >
        <span className="opacity-90">{label}</span>
        <span className={`absolute left-2 right-2 -bottom-0.5 h-[2px] ${active ? 'bg-white' : 'bg-transparent'}`} />
      </button>
    );
  };
  return (
    <div className="inline-flex items-center text-sm">
      {makeBtn('text', 'Readaloud from text')}
      <div className="mx-2 h-4 w-px bg-white/15" aria-hidden />
      {makeBtn('pdf', 'Readaloud from PDF')}
    </div>
  );
}


