"use client";
import React, { useRef, useState } from "react";
import { useAppStore } from "../state/store";
import { prepareDocument, synthesizeChunk } from "../lib/provider";
import { perfMark, perfMeasure, initPerfObserver } from "../lib/perf";
import { HeroLogo } from "../components/HeroLogo";
import { ConnectionStatus } from "../components/ConnectionStatus";
import { CollapsingIconButton } from "../components/CollapsingIconButton";
// import { TruncatedPreview } from "../components/TruncatedPreview";
import { SegmentedSelector, type Mode } from "../components/SegmentedSelector";
import { PdfDropzone } from "../components/PdfDropzone";
import { AutoTextarea } from "../components/AutoTextarea";
import { Play, Sparkles, AlertTriangle, CheckCircle2, Loader2, PlayCircle } from "lucide-react";
import { VoiceSelect } from "../components/VoiceSelect";
import { AudioController } from "../lib/AudioController";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function Home() {
  const { setDocId, setChunks, chunks, setCurrentIndex, addController } = useAppStore();
  const [busy, setBusy] = useState(false);
  const [textInput, setTextInput] = useState<string>("This is a demo paragraph.\n\nThis is the next paragraph to synthesize.");
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const teardownPerfRef = useRef<() => void>(() => {});
  const [isLocalDemo, setIsLocalDemo] = useState(false);
  const [mode, setMode] = useState<Mode>('text');
  const [voice, setVoice] = useState<string>('af_heart');
  const [error, setError] = useState<string | null>(null);
  type UiStatus = { kind: 'idle' | 'progress' | 'ok' | 'error'; message: string } | null;
  const [status, setStatus] = useState<UiStatus>(null);
  const [textErrorOnce, setTextErrorOnce] = useState(false);
  const [pdfErrorOnce, setPdfErrorOnce] = useState(false);
  const router = useRouter();

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
    setError(null);
    // Validate and block if invalid
    if (mode === 'text' && (!textInput || textInput.trim().length === 0)) {
      setError('Text is empty. Please enter some text.');
      setStatus({ kind: 'error', message: 'Text is empty.' });
      setTextErrorOnce(true);
      window.setTimeout(() => { setError(null); setStatus(null); setTextErrorOnce(false); }, 3000);
      return;
    }
    if (mode === 'pdf' && !pdfFile) {
      setError('No PDF selected. Please choose a PDF file.');
      setStatus({ kind: 'error', message: 'No PDF selected.' });
      setPdfErrorOnce(true);
      window.setTimeout(() => { setError(null); setStatus(null); setPdfErrorOnce(false); }, 3000);
      return;
    }
    setBusy(true);
    try {
      // Start a fresh controller session (single active session)
      try { AudioController.load(); } catch {}
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
      setStatus({ kind: 'progress', message: 'Preparing document…' });
      const { doc_id, paragraphs } = await prepareDocument(textInput, pdfBase64, { signal: ctrl.signal, timeoutMs: 30000 });
      perfMark(pend);
      perfMeasure(`prepare`, pstart, pend);
      setStatus({ kind: 'ok', message: `Prepared ${paragraphs.length} paragraph(s). Starting synthesis…` });
      setDocId(doc_id);
      setChunks(
        paragraphs.map((p) => ({ paragraph_id: p.paragraph_id, text: p.text, status: "queued" }))
      );
      setCurrentIndex(0);
      // Synthesize first chunk; then navigate to /session for playback
      await prefetchByIndex(0);
      // navigate to /session
      router.push('/session');
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Unknown error occurred while preparing the document.';
      setError(msg);
      setStatus({ kind: 'error', message: msg });
      window.setTimeout(() => { setError(null); setStatus(null); }, 3500);
    } finally {
      setBusy(false);
    }
  };

  const prefetchByIndex = async (idx: number) => {
    const s = useAppStore.getState();
    const c = s.chunks[idx];
    if (!c || c.status !== "queued") return;
    const docId = s.docId;
    if (!docId) {
      console.warn(`[prefetchByIndex] Missing docId for paragraph`, c.paragraph_id);
      return;
    }
    const ctrl = new AbortController();
    addController(ctrl);
    const start = `prefetch-start:${c.paragraph_id}`;
    const end = `prefetch-end:${c.paragraph_id}`;
    perfMark(start);
    try {
      setStatus({ kind: 'progress', message: `Synthesis ${c.paragraph_id}…` });
      const res = await synthesizeChunk(docId, c.paragraph_id, c.text, 24000, { signal: ctrl.signal, timeoutMs: 30000, voice });
      perfMark(end);
      perfMeasure(`prefetch:${c.paragraph_id}`, start, end);
      s.updateChunk(c.paragraph_id, {
        status: "ready",
        audioBase64: res.audio_base64,
        timings: res.timings,
      });
      setStatus({ kind: 'ok', message: `Ready ${c.paragraph_id}` });
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Synthesis failed.';
      setError(msg);
      setStatus({ kind: 'error', message: msg });
      window.setTimeout(() => { setError(null); setStatus(null); }, 3500);
      perfMark(end);
      perfMeasure(`prefetch:${c.paragraph_id}`, start, end);
    }
  };

  const onStartDemo = async () => {
    if (!isLocalDemo || busy) return;
    setBusy(true);
    try {
      useAppStore.getState().setCancelled(false);

      const raw = textInput && textInput.trim().length > 0 ? textInput : 'Demo paragraph one.\n\nDemo paragraph two.\n\nDemo paragraph three.';
      const demoParas = raw.split(/\n\s*\n/).filter(Boolean);

      setDocId('demo-doc');
      setChunks(demoParas.map((t, i) => ({ paragraph_id: `p${(i + 1).toString().padStart(4, '0')}`, text: t, status: 'queued' })));
      setCurrentIndex(0);

      // Kick off first synthesis only; playback happens in /session
      void prefetchByIndex(0);
      router.push('/session');
    } finally {
      setBusy(false);
    }
  };

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
    <div className="min-h-screen bg-neutral-900 text-neutral-200">
      <div className="mx-auto w-[min(820px,92vw)] pt-12 md:pt-16 pb-10 space-y-6 px-3 md:px-0">
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
            <AutoTextarea value={textInput} onChange={setTextInput} placeholder="Type or paste text here" error={textErrorOnce} />
          ) : (
            <PdfDropzone onFile={(f) => setPdfFile(f)} file={pdfFile} onClear={() => setPdfFile(null)} error={pdfErrorOnce} />
          )}
        </div>
         {/* Model and Voice picker */}
         <div className="mx-auto w-[min(820px,92vw)] flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-6 text-sm">
           <div className="flex items-center gap-3">
             <label className="text-neutral-400">Model</label>
             <div className="inline-flex items-center gap-2 px-3 py-2 rounded-md border border-white/10 bg-transparent text-sm text-white">
               <span className="tabular-nums">Kokoro</span>
             </div>
           </div>
           <div className="flex items-center gap-3">
             <label className="text-neutral-400">Voice</label>
             <VoiceSelect
               value={voice}
               onChange={setVoice}
               groups={[
                 { label: 'American English', options: ['af_heart','af_bella','am_michael'] },
                 { label: 'British English', options: ['bf_emma'] },
                 { label: 'Japanese', options: ['jf_alpha'] },
                 { label: 'Mandarin Chinese', options: ['zf_xiaoyi'] },
                 { label: 'Spanish', options: ['pf_dora'] },
                 { label: 'French', options: ['ff_siwis'] },
                 { label: 'Hindi', options: ['hf_alpha'] },
                 { label: 'Italian', options: ['if_sara'] },
               ]}
             />
           </div>
         </div>
        {/* removed legacy file input row to keep UI minimal */}
        <div className="flex items-center justify-center gap-3 sm:gap-4">
          <CollapsingIconButton
            onClick={onPrepare}
            disabled={busy}
            label="Start processing"
            className="text-emerald-400"
            icon={<Play className="w-5 h-5" />}
          />
          {isLocalDemo && (
            <CollapsingIconButton
              onClick={onStartDemo}
              disabled={busy}
              label="Demo"
              icon={<Sparkles className="w-5 h-5" />}
              className="text-sky-400"
            />
          )}
        </div>
        {/* Session card */}
        {chunks.length > 0 && chunks.some(c => c.status !== 'done') && (
          <div className="mx-auto w-[min(820px,92vw)] mt-4">
            <div className="flex items-center justify-between gap-3 rounded-md border border-white/10 bg-transparent px-3 py-2">
              <div className="flex items-center gap-3 text-sm text-neutral-300">
                <PlayCircle className="w-4 h-4 text-white" />
                <span>Active session</span>
                <span className="text-neutral-500">{`${chunks.filter(c=>c.status==='done').length}/${chunks.length}`}</span>
                {(useAppStore.getState().controllers.length > 0 || chunks.some(c => c.status === 'queued' || c.status === 'synth')) && (
                  <span className="relative inline-flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-300"></span>
                  </span>
                )}
              </div>
              <Link href="/session" className="px-3 py-1.5 rounded-md border border-white/10 text-white hover:bg-white/5 text-sm">Resume</Link>
            </div>
          </div>
        )}
        {/* Single inline banner below buttons */}
        {(error || status) && (
          <div className="mx-auto w-[min(820px,92vw)] rounded-md border border-white/10 bg-transparent mt-3 px-3 py-2 text-sm flex items-center gap-2">
            {status?.kind === 'error' || error ? (
              <AlertTriangle className="w-4 h-4 text-red-300 drop-shadow-[0_0_6px_rgba(239,68,68,0.6)] animate-pulse" />
            ) : status?.kind === 'ok' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-300 drop-shadow-[0_0_6px_rgba(16,185,129,0.6)] animate-pulse" />
            ) : (
              <Loader2 className="w-4 h-4 text-cyan-300 animate-spin drop-shadow-[0_0_8px_rgba(34,211,238,0.8)]" />
            )}
            <div className="text-neutral-300">
              {error || status?.message}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
