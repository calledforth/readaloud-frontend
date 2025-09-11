"use client";
import React from 'react';
import { FileText } from 'lucide-react';

export function PdfDropzone({ onFile, file, onClear }: { onFile: (f: File) => void; file?: File | null; onClear?: () => void }) {
  const [dragOver, setDragOver] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement | null>(null);
  const [pages, setPages] = React.useState<number | undefined>(undefined);

  const onDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
    const f = Array.from(e.dataTransfer.files).find((x) => x.type === 'application/pdf' || x.name.toLowerCase().endsWith('.pdf'));
    if (f) onFile(f);
  };

  React.useEffect(() => {
    let cancelled = false;
    async function estimate() {
      if (!file) { setPages(undefined); return; }
      try {
        // Light heuristic: scan first 5MB for "/Type /Page" tokens; if none, scan full file.
        const head = await file.slice(0, 5 * 1024 * 1024).arrayBuffer();
        const td = new TextDecoder('latin1');
        const scan = (buf: ArrayBuffer) => (td.decode(buf).match(/\/(Type)\s*\/(Page)\b/g) || []).length;
        let count = scan(head);
        if (count === 0 && file.size > head.byteLength) {
          const all = await file.arrayBuffer();
          count = scan(all);
        }
        if (!cancelled) setPages(count > 0 ? count : undefined);
      } catch {
        if (!cancelled) setPages(undefined);
      }
    }
    void estimate();
    return () => { cancelled = true; };
  }, [file]);

  // helpers for metadata
  const formatSize = (bytes: number) => {
    if (!bytes && bytes !== 0) return '';
    const units = ['B','KB','MB','GB'];
    let v = bytes; let u = 0;
    while (v >= 1024 && u < units.length - 1) { v /= 1024; u++; }
    return `${v.toFixed(v >= 100 ? 0 : v >= 10 ? 1 : 2)} ${units[u]}`;
  };
  const formatDate = (ms: number) => new Intl.DateTimeFormat(undefined, { year: 'numeric', month: 'short', day: '2-digit' }).format(ms);

  if (file) {
    const size = formatSize(file.size);
    const date = formatDate(file.lastModified);
    return (
      <div className="group flex items-center justify-between rounded-xl border border-white/15 bg-transparent px-4 py-3 hover:border-white/30 transition">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-8 h-8 rounded-md grid place-items-center border border-red-400/40 bg-red-500/10 text-red-300">
            <FileText className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="text-sm text-neutral-100 truncate">{file.name}</div>
            <div className="text-[11px] text-neutral-400">PDF · {size}{pages ? ` · ${pages} page${pages === 1 ? '' : 's'}` : ''} · {date}</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button className="px-2 py-1 text-xs text-neutral-300 hover:text-white rounded-md border border-white/10 hover:border-white/30" onClick={() => inputRef.current?.click()} aria-label="Change PDF">Change</button>
          <button className="text-neutral-400 hover:text-white" onClick={onClear} aria-label="Remove">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        </div>
        <input ref={inputRef} type="file" accept="application/pdf" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); }} />
      </div>
    );
  }

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={onDrop}
      className={`rounded-xl border border-dashed ${dragOver ? 'border-white/40 bg-white/[0.06]' : 'border-white/15 bg-transparent'} p-8 text-center transition cursor-pointer hover:border-white/30 hover:bg-white/[0.03]`}
      onClick={() => inputRef.current?.click()}
      role="button"
      tabIndex={0}
    >
      <div className="flex flex-col items-center gap-3 text-neutral-300">
        <div className="w-10 h-10 rounded-full bg-black/70 grid place-items-center border border-white/10">
          <FileText className="w-4 h-4" />
        </div>
        <div className="text-sm">Click to select</div>
        <div className="text-xs text-neutral-500">or drag and drop PDF here</div>
      </div>
      <input ref={inputRef} type="file" accept="application/pdf" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); }} />
    </div>
  );
}


