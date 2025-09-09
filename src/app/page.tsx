"use client";
import React, { useRef, useState } from "react";
import { useAppStore } from "../state/store";
import { prepareDocument, synthesizeChunk, health } from "../lib/provider/mock";
import { ChunkFeed } from "../components/ChunkFeed";
import { ReaderView } from "../components/ReaderView";
import { perfMark, perfMeasure, initPerfObserver } from "../lib/perf";

export default function Home() {
  const audioContextRef = useRef<AudioContext | null>(null);
  const { setDocId, setChunks, chunks, setCurrentIndex, currentIndex, setPlaying, addController, setClearTimers } = useAppStore();
  const [busy, setBusy] = useState(false);
  const [healthStatus, setHealthStatus] = useState<string>("unknown");
  const [textInput, setTextInput] = useState<string>("This is a demo paragraph.\n\nThis is the next paragraph to synthesize.");
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const teardownPerfRef = useRef<() => void>(() => {});
  const [isLocalDemo, setIsLocalDemo] = useState(false);

  // Initialize perf observer once
  React.useEffect(() => {
    teardownPerfRef.current = initPerfObserver();
    return () => {
      teardownPerfRef.current?.();
    };
  }, []);

  // Detect local host on client after hydration to avoid SSR mismatch
  React.useEffect(() => {
    try {
      setIsLocalDemo(/^localhost$|^127\.0\.0\.1$/.test(window.location.hostname));
    } catch {}
  }, []);

  const onHealth = async () => {
    try {
      const resp = await health();
      setHealthStatus(resp.status + " " + resp.version);
    } catch {
      setHealthStatus("error");
    }
  };

  const onPrepare = async () => {
    if (busy) return;
    setBusy(true);
    try {
      // Create AudioContext on user gesture to satisfy autoplay policies
      if (!audioContextRef.current) {
        type Ctor = typeof AudioContext;
        const g = globalThis as unknown as { AudioContext?: Ctor; webkitAudioContext?: Ctor };
        const AC = (g.AudioContext ?? g.webkitAudioContext)!;
        audioContextRef.current = new AC();
      }
      const ctx = audioContextRef.current!;
      try {
        await ctx.resume();
      } catch {}
      // Starting a new session: clear cancel flag
      useAppStore.getState().setCancelled(false);
      let pdfBase64: string | undefined;
      if (pdfFile) {
        pdfBase64 = await fileToBase64(pdfFile);
      }
      const ctrl = new AbortController();
      addController(ctrl);
      const pstart = `prepare-start`;
      const pend = `prepare-end`;
      perfMark(pstart);
      const { doc_id, paragraphs } = await prepareDocument(textInput, pdfBase64, { signal: ctrl.signal, timeoutMs: 30000 });
      perfMark(pend);
      perfMeasure(`prepare`, pstart, pend);
      setDocId(doc_id);
      setChunks(
        paragraphs.map((p) => ({ paragraph_id: p.paragraph_id, text: p.text, status: "queued" }))
      );
      setCurrentIndex(0);
      // Prefetch using direct store access to avoid stale state closure
      await prefetchByIndex(0);
      await prefetchByIndex(1);
      setPlaying(true);
    } finally {
      setBusy(false);
    }
  };

  const prefetchByIndex = async (idx: number) => {
    const s = useAppStore.getState();
    const c = s.chunks[idx];
    if (!c || c.status !== "queued") return;
    const ctrl = new AbortController();
    addController(ctrl);
    const start = `prefetch-start:${c.paragraph_id}`;
    const end = `prefetch-end:${c.paragraph_id}`;
    perfMark(start);
    const res = await synthesizeChunk("doc", c.paragraph_id, c.text, 24000, { signal: ctrl.signal, timeoutMs: 30000 });
    perfMark(end);
    perfMeasure(`prefetch:${c.paragraph_id}`, start, end);
    s.updateChunk(c.paragraph_id, {
      status: "ready",
      audioBase64: res.audio_base64,
      timings: res.timings,
    });
  };

  const onNext = async () => {
    const next = currentIndex + 1;
    setCurrentIndex(next);
    await prefetchByIndex(next);
    await prefetchByIndex(next + 1);
  };

  // Local-only functional demo (no backend). Simulates staggered chunk arrivals.
  const onStartDemo = async () => {
    if (!isLocalDemo || busy) return;
    setBusy(true);
    try {
      if (!audioContextRef.current) {
        type Ctor = typeof AudioContext;
        const g = globalThis as unknown as { AudioContext?: Ctor; webkitAudioContext?: Ctor };
        const AC = (g.AudioContext ?? g.webkitAudioContext)!;
        audioContextRef.current = new AC();
      }
      const ctx = audioContextRef.current!;
      try { await ctx.resume(); } catch {}
      useAppStore.getState().setCancelled(false);

      const raw = textInput && textInput.trim().length > 0 ? textInput : 'Demo paragraph one.\n\nDemo paragraph two.\n\nDemo paragraph three.';
      const demoParas = raw.split(/\n\s*\n/).filter(Boolean);

      setDocId('demo-doc');
      setChunks(demoParas.map((t, i) => ({ paragraph_id: `p${(i + 1).toString().padStart(4, '0')}`, text: t, status: 'queued' })));
      setCurrentIndex(0);

      // Streaming timers we can cancel on Stop
      const timers: number[] = [];
      const t1 = window.setTimeout(() => { void prefetchByIndex(0); }, 200);
      const t2 = window.setTimeout(() => { void prefetchByIndex(1); }, 1200);
      timers.push(t1, t2);
      let offset = 2;
      const interval = window.setInterval(() => {
        const idx = offset++;
        if (idx >= demoParas.length) {
          window.clearInterval(interval);
          return;
        }
        void prefetchByIndex(idx);
      }, 5000);
      // register cleanup for Stop
      setClearTimers(() => () => {
        for (const id of timers) window.clearTimeout(id);
        window.clearInterval(interval);
      });
      setPlaying(true);
    } finally {
      setBusy(false);
    }
  };

  function onPdfChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null;
    setPdfFile(f);
  }

  function fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const result = reader.result as string;
          const base64 = result.replace(/^data:.*;base64,/, "");
          resolve(base64);
        } catch (e) {
          reject(e);
        }
      };
      reader.onerror = (err) => reject(err);
      reader.readAsDataURL(file);
    });
  }

  return (
    <div className="min-h-screen bg-black text-neutral-200">
      <div className="mx-auto w-[min(720px,92vw)] py-6 space-y-3">
        <div className="flex items-center justify-center gap-2">
          <button onClick={onHealth} className="rounded-md border border-white/10 bg-white/10 p-2" aria-label="Health">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 21a9 9 0 1 1 0-18 9 9 0 0 1 0 18zm-1-5h2v2h-2v-2zm0-8h2v6h-2V8z"/></svg>
          </button>
          <span className="text-xs text-neutral-400">{healthStatus}</span>
        </div>
        <div className="mx-auto w-[min(720px,92vw)]">
          <textarea
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            placeholder="Paste text here"
            className="w-full max-h-64 h-40 bg-transparent border border-white/10 rounded-md text-sm p-3 overflow-auto"
          />
        </div>
        <div className="flex items-center justify-center gap-3">
          <input type="file" accept="application/pdf" onChange={onPdfChange} className="text-xs" />
          {pdfFile && <span className="text-xs text-neutral-400">{pdfFile.name}</span>}
        </div>
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={onPrepare}
            disabled={busy}
            className="rounded-full border border-white/10 bg-white text-black hover:bg-neutral-200 p-2"
            aria-label="Start"
            title="Start"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
          </button>
          {isLocalDemo && (
            <button
              onClick={onStartDemo}
              disabled={busy}
              className="rounded-full border border-emerald-400/30 bg-emerald-500/10 text-emerald-300 p-2"
              aria-label="Demo"
              title="Local-only demo"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3 7h7l-5.5 4 2 7-6.5-4.5L5.5 20l2-7L2 9h7z"/></svg>
            </button>
          )}
        </div>
      </div>
      {audioContextRef.current && chunks.some((c) => c.status !== 'queued') && (
        <>
          <ChunkFeed headless audioContext={audioContextRef.current} onNext={onNext} />
          <ReaderView onTogglePlay={() => useAppStore.getState().setPlaying(!useAppStore.getState().isPlaying)} />
        </>
      )}
    </div>
  );
}
