"use client";
import React, { useRef, useState } from "react";
import { useAppStore } from "../state/store";
import { prepareDocument, synthesizeChunk, health } from "../lib/provider/mock";
import { ChunkFeed } from "../components/ChunkFeed";
import { ReaderView } from "../components/ReaderView";
import { perfMark, perfMeasure, initPerfObserver } from "../lib/perf";
import { HeroLogo } from "../components/HeroLogo";
import { ConnectionStatus } from "../components/ConnectionStatus";
import { CollapsingIconButton } from "../components/CollapsingIconButton";
import { TopBar } from "../components/TopBar";
import { TruncatedPreview } from "../components/TruncatedPreview";
import { SegmentedSelector, type Mode } from "../components/SegmentedSelector";
import { PdfDropzone } from "../components/PdfDropzone";
import { AutoTextarea } from "../components/AutoTextarea";

export default function Home() {
  const audioContextRef = useRef<AudioContext | null>(null);
  const { setDocId, setChunks, chunks, setCurrentIndex, currentIndex, setPlaying, addController, setClearTimers } = useAppStore();
  const [busy, setBusy] = useState(false);
  const [textInput, setTextInput] = useState<string>("This is a demo paragraph.\n\nThis is the next paragraph to synthesize.");
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const teardownPerfRef = useRef<() => void>(() => {});
  const [isLocalDemo, setIsLocalDemo] = useState(false);
  const [mode, setMode] = useState<Mode>('text');

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

  // removed inline component wrappers to avoid remounting on each render (which caused input blur)

  const isProcessing = audioContextRef.current && chunks.some((c) => c.status !== 'queued');
  return (
    <div className="min-h-screen bg-neutral-900 text-neutral-200">
      {!isProcessing ? (
        <div className="mx-auto w-[min(820px,92vw)] pt-16 pb-10 space-y-6">
          <div className="flex items-center justify-center">
            <HeroLogo />
          </div>
          <div className="flex items-center justify-center">
            <ConnectionStatus />
          </div>
          <div className="flex items-center justify-center">
            <SegmentedSelector value={mode} onChange={setMode} />
          </div>
          <div className="mx-auto w-[min(820px,92vw)]">
            {mode === 'text' ? (
              <AutoTextarea value={textInput} onChange={setTextInput} placeholder="Type or paste text here" />
            ) : (
              <PdfDropzone onFile={(f) => setPdfFile(f)} file={pdfFile} onClear={() => setPdfFile(null)} />
            )}
          </div>
          {/* removed legacy file input row to keep UI minimal */}
          <div className="flex items-center justify-center gap-3">
            <CollapsingIconButton
              onClick={onPrepare}
              disabled={busy}
              label="Start processing"
              icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>}
            />
            {isLocalDemo && (
              <CollapsingIconButton
                onClick={onStartDemo}
                disabled={busy}
                label="Demo"
                icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3 7h7l-5.5 4 2 7-6.5-4.5L5.5 20l2-7L2 9h7z"/></svg>}
                className="border border-emerald-400/30 text-emerald-300"
              />
            )}
          </div>
        </div>
      ) : (
        <>
          <TopBar
            onHome={() => {
              // Return to landing
              try { useAppStore.getState().setPlaying(false); } catch {}
              try { useAppStore.getState().cancelAllControllers(); } catch {}
              try { useAppStore.getState().setChunks([]); } catch {}
              try { setPdfFile(null); } catch {}
            }}
            right={
              <button className="p-2 rounded-full border border-white/10" aria-label="Settings" style={{ marginRight: 0 }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a1 1 0 0 1 1 1v1.06a7.003 7.003 0 0 1 3.94 2.3l.75-.75a1 1 0 0 1 1.41 1.42l-.75.75A7.003 7.003 0 0 1 20.94 12H22a1 1 0 1 1 0 2h-1.06a7.003 7.003 0 0 1-2.3 3.94l.75.75a1 1 0 0 1-1.42 1.41l-.75-.75A7.003 7.003 0 0 1 13 19.94V21a1 1 0 1 1-2 0v-1.06a7.003 7.003 0 0 1-3.94-2.3l-.75.75a1 1 0 0 1-1.41-1.42l.75-.75A7.003 7.003 0 0 1 4.06 14H3a1 1 0 1 1 0-2h1.06a7.003 7.003 0 0 1 2.3-3.94l-.75-.75a1 1 0 0 1 1.42-1.41l.75.75A7.003 7.003 0 0 1 11 4.06V3a1 1 0 0 1 1-1Zm0 5a5 5 0 1 0 .001 10.001A5 5 0 0 0 12 7Z"/></svg>
              </button>
            }
          />
          <div className="pt-16" />
          <div className="mx-auto w-[min(920px,95vw)] py-6 space-y-6">
            <TruncatedPreview text={textInput} />
            <ChunkFeed headless audioContext={audioContextRef.current as AudioContext} onNext={onNext} />
            <ReaderView onTogglePlay={() => useAppStore.getState().setPlaying(!useAppStore.getState().isPlaying)} />
          </div>
        </>
      )}
    </div>
  );
}
