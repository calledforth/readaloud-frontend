"use client";
import React from 'react';
import { ChevronDown, Check } from 'lucide-react';

type VoiceGroup = { label: string; options: string[] };
type Props = {
  value: string;
  onChange: (v: string) => void;
  groups: VoiceGroup[];
};

export function VoiceSelect({ value, onChange, groups }: Props) {
  const [open, setOpen] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [open]);

  return (
    <div ref={containerRef} className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="inline-flex items-center gap-2 px-3 py-2 rounded-md border border-white/10 hover:border-white/30 bg-transparent text-sm text-white focus:outline-none focus:ring-2 focus:ring-white/20"
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className="tabular-nums">{value}</span>
        <ChevronDown className={`w-4 h-4 text-neutral-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="absolute z-50 mt-2 w-60 rounded-lg border border-white/10 bg-black/95 backdrop-blur shadow-xl p-2">
          <div className="max-h-72 overflow-auto scrollbar-thin space-y-2">
            {groups.map((group) => (
              <div key={group.label}>
                <div className="px-2 py-1 text-[11px] uppercase tracking-wide text-neutral-500">{group.label}</div>
                <div className="space-y-1">
                  {group.options.map((opt) => {
                    const active = opt === value;
                    return (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => { 
                          onChange(opt); 
                          setOpen(false); 
                        }}
                        className={`w-full text-left px-2 py-1.5 rounded-md text-sm transition-colors ${active ? 'bg-neutral-800 text-white' : 'text-neutral-200 hover:bg-white/10'}`}
                        role="option"
                        aria-selected={active}
                      >
                        <span className="inline-flex items-center gap-2">
                          {active ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <span className="w-3.5 h-3.5" />}
                          <span>{opt}</span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}


