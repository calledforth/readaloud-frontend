"use client";
import React from 'react';

export function TruncatedPreview({ text }: { text: string }) {
  const [expanded, setExpanded] = React.useState(false);
  const short = text.replace(/\s+/g, ' ').trim();
  return (
    <div className="relative rounded-md border border-white/10 bg-white/5 p-3 overflow-hidden">
      <div
        className={`text-sm text-neutral-200 whitespace-pre-wrap pr-2`}
        style={expanded ? undefined : { display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}
      >
        {short || 'No text'}
      </div>
      {!expanded && (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-neutral-900/95 to-transparent" />
      )}
      <div className="mt-2 text-[11px] text-neutral-300 flex justify-center">
        <button className="px-3 py-1 rounded-full bg-black/80 border border-white/15 shadow-sm" onClick={() => setExpanded((v) => !v)}>
          {expanded ? 'Collapse' : 'Show more'}
        </button>
      </div>
    </div>
  );
}


