"use client";
import React, { useRef, useState } from "react";
import { useAppStore } from "../state/store";
import { prepareDocument, synthesizeChunk, health } from "../lib/provider/mock";
import { ChunkFeed } from "../components/ChunkFeed";
import { PlayerBar } from "../components/PlayerBar";
import { perfMark, perfMeasure, initPerfObserver } from "../lib/perf";

export default function Home() {
  const audioContextRef = useRef<AudioContext | null>(null);
  const { setDocId, setChunks, chunks, setCurrentIndex, currentIndex, setPlaying, addController } = useAppStore();
  const [busy, setBusy] = useState(false);
  const [healthStatus, setHealthStatus] = useState<string>("unknown");
  const [textInput, setTextInput] = useState<string>("This is a demo paragraph.\n\nThis is the next paragraph to synthesize.");
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const teardownPerfRef = useRef<() => void>(() => {});

  // Initialize perf observer once
  React.useEffect(() => {
    teardownPerfRef.current = initPerfObserver();
    return () => {
      teardownPerfRef.current?.();
    };
  }, []);

  const onHealth = async () => {
    try {
      const resp = await health();
      setHealthStatus(resp.status + " " + resp.version);
    } catch (e) {
      setHealthStatus("error");
    }
  };

  const onPrepare = async () => {
    if (busy) return;
    setBusy(true);
    try {
      // Create AudioContext on user gesture to satisfy autoplay policies
      if (!audioContextRef.current) {
        const AC: any = (globalThis as any).AudioContext || (globalThis as any).webkitAudioContext;
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
        <div className="flex items-center gap-2">
          <button onClick={onHealth} className="text-xs rounded-md border border-white/10 bg-white/10 px-3 py-2">Health</button>
          <span className="text-xs text-neutral-400">{healthStatus}</span>
        </div>
        <textarea
          value={textInput}
          onChange={(e) => setTextInput(e.target.value)}
          placeholder="Paste text here"
          className="w-full h-28 bg-transparent border border-white/10 rounded-md text-sm p-3"
        />
        <div className="flex items-center gap-3">
          <input type="file" accept="application/pdf" onChange={onPdfChange} className="text-xs" />
          {pdfFile && <span className="text-xs text-neutral-400">{pdfFile.name}</span>}
        </div>
        <button
          onClick={onPrepare}
          disabled={busy}
          className="text-xs rounded-md border border-white/10 bg-white/10 px-3 py-2"
        >
          {busy ? "Preparing..." : "Start"}
        </button>
      </div>
      {audioContextRef.current && (
        <ChunkFeed audioContext={audioContextRef.current} onNext={onNext} />
      )}
      <PlayerBar onPrev={() => {}} onNext={onNext} />
    </div>
  );
}
