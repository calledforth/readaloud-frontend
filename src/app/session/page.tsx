"use client";
import React from "react";
import { useRouter } from "next/navigation";
import { useAppStore } from "../../state/store";
import { AudioController } from "../../lib/AudioController";
import { AutoHideChrome } from "../../components/AutoHideChrome";
import { TopBar } from "../../components/TopBar";
import { TruncatedPreview } from "../../components/TruncatedPreview";
import { ChunkFeed } from "../../components/ChunkFeed";
import { ReaderView } from "../../components/ReaderView";
import { MiniPlayer } from "../../components/MiniPlayer";
import { Settings } from "lucide-react";
import { synthesizeChunk } from "../../lib/provider";

export default function SessionPage() {
  const router = useRouter();
  const { chunks, currentIndex, addController, isPlaying } = useAppStore();

  React.useEffect(() => {
    // If no session exists, go home
    if (!chunks || chunks.length === 0) {
      router.replace("/");
    }
  }, [chunks, router]);

  // Allow playback only while on /session
  React.useEffect(() => {
    AudioController.setPlaybackAllowed(true);
    return () => { AudioController.setPlaybackAllowed(false); };
  }, []);

  // Autoplay when current is ready/paused and nothing is playing
  React.useEffect(() => {
    const s = useAppStore.getState();
    const c = s.chunks[s.currentIndex];
    if (c && (c.status === 'ready' || c.status === 'paused') && c.audioBase64 && s.isPlaying === false) {
      void (async () => {
        try { AudioController.init(); } catch {}
        await AudioController.play(s.currentIndex);
      })();
    }
  }, [currentIndex, chunks, isPlaying]);

  // Prefetch next queued chunk when advancing
  React.useEffect(() => {
    const s = useAppStore.getState();
    const idx = s.currentIndex + 1;
    const next = s.chunks[idx];
    if (!next || next.status !== 'queued') return;
    const docId = s.docId;
    if (!docId) return;
    const ctrl = new AbortController();
    addController(ctrl);
    void (async () => {
      try {
        const res = await synthesizeChunk(docId, next.paragraph_id, next.text, 24000, { signal: ctrl.signal, timeoutMs: 30000 });
        useAppStore.getState().updateChunk(next.paragraph_id, { status: 'ready', audioBase64: res.audio_base64, timings: res.timings });
      } catch {}
    })();
    // no cleanup beyond AbortController central cancel
  }, [currentIndex]);

  return (
    <div className="min-h-screen bg-neutral-900 text-neutral-200">
      <AutoHideChrome inactivityMs={1500} />
      <TopBar
        onHome={() => {
          try { AudioController.stop(); } catch {}
          try { useAppStore.getState().setPlaying(false); } catch {}
          // Keep session/state to allow resume
          router.push("/");
        }}
        right={
          <button className="p-2 rounded-full" aria-label="Settings" style={{ marginRight: 0 }}>
            <Settings className="w-4 h-4 text-white" />
          </button>
        }
      />
      <div className="pt-16" />
      <div className="mx-auto w-[min(920px,95vw)] py-6 space-y-6">
        <TruncatedPreview text={chunks.map(c => c.text).join('\n\n')} />
        <ChunkFeed headless />
        <ReaderView onTogglePlay={() => useAppStore.getState().setPlaying(!useAppStore.getState().isPlaying)} />
        <MiniPlayer />
      </div>
    </div>
  );
}


