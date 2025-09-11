"use client";
import React from 'react';
import { ChevronDown } from 'lucide-react';

export function TruncatedPreview({ text }: { text: string }) {
  const [expanded, setExpanded] = React.useState(false);
  const short = text.replace(/\s+/g, ' ').trim();
  return (
    <div className="relative rounded-md border border-white/10 bg-transparent p-4 overflow-hidden">
      <div className="relative">
        <div
          className={`text-sm md:text-base text-neutral-200 whitespace-pre-wrap pr-7 ${expanded ? 'max-h-56 overflow-auto no-scrollbar' : ''}`}
          style={expanded ? undefined : { display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}
        >
          {short || 'No text'}
        </div>
        {!expanded && (
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-14 bg-gradient-to-t from-neutral-900/95 to-transparent" />
        )}
        <button
          className="absolute right-1.5 bottom-1.5 p-1.5 rounded-full bg-transparent border border-transparent inline-flex items-center hover:opacity-90"
          onClick={() => setExpanded((v) => !v)}
          aria-label={expanded ? 'Collapse' : 'Expand'}
        >
          <ChevronDown className={`${expanded ? 'rotate-180' : ''} w-5 h-5`} />
        </button>
      </div>
    </div>
  );
}


