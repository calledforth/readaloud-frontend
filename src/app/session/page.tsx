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
import { History } from "lucide-react";
import { synthesizeChunk } from "../../lib/provider";
import { useSessionHistory } from "../../lib/useSessionHistory";
import { HistoryModal } from "../../components/HistoryModal";

export default function SessionPage() {
  const router = useRouter();
  const { chunks, currentIndex, addController, isPlaying, autoplayEnabled, sessionStatus, setFetchingChunks } = useAppStore();
  const { updateCurrentSession, cancelCurrentSession, completeCurrentSession, resumeSession, sessions, refresh } = useSessionHistory();

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

  // Autoplay when current is ready/paused and nothing is playing, only if autoplayEnabled
  React.useEffect(() => {
    const s = useAppStore.getState();
    const c = s.chunks[s.currentIndex];
    if (autoplayEnabled && c && (c.status === 'ready' || c.status === 'paused') && c.audioBase64 && s.isPlaying === false) {
      void (async () => {
        try { AudioController.init(); } catch {}
        await AudioController.play(s.currentIndex);
      })();
    }
  }, [currentIndex, isPlaying, autoplayEnabled, addController]);

  // Live update session record when chunks change
  React.useEffect(() => {
    if (chunks.length > 0) {
      void (async () => {
        try {
          await updateCurrentSession({
            chunks,
            currentIndex,
            currentElapsedSec: useAppStore.getState().currentElapsedSec,
            paragraphCount: chunks.length,
          });
        } catch (e) {
          console.error('Failed to update session:', e);
        }
      })();
    }
  }, [chunks, currentIndex, updateCurrentSession]);

  // Watch for session completion - when all chunks have audio (only once, and only for in_progress sessions)
  const [hasSavedCompletion, setHasSavedCompletion] = React.useState(false);
  React.useEffect(() => {
    const s = useAppStore.getState();
    const allHaveAudio = s.chunks.length > 0 && s.chunks.every(c => c.audioBase64);
    if (allHaveAudio && !hasSavedCompletion && s.sessionStatus === 'in_progress') {
      setHasSavedCompletion(true);
      void (async () => {
        try {
          await completeCurrentSession();
        } catch (e) {
          console.error('Failed to mark session as completed:', e);
        }
      })();
    }
  }, [chunks, updateCurrentSession, hasSavedCompletion, sessionStatus, completeCurrentSession]);

  // Continuous chunk fetching - fetch all queued chunks in sequence (only when in_progress)
  React.useEffect(() => {
    const s = useAppStore.getState();
    const docId = s.docId;
    if (!docId || s.chunks.length === 0 || s.sessionStatus !== 'in_progress') {
      setFetchingChunks(false);
      return;
    }

    const queuedChunks = s.chunks.filter(c => c.status === 'queued');
    if (queuedChunks.length === 0) {
      setFetchingChunks(false);
      return;
    }

    setFetchingChunks(true);
    
    // Fetch chunks sequentially to avoid overwhelming the server
    const fetchNextChunk = async (chunkIndex: number) => {
      // Check if session has been cancelled before continuing
      if (useAppStore.getState().sessionStatus === 'cancelled') {
        setFetchingChunks(false);
        return;
      }
      
      if (chunkIndex >= queuedChunks.length) {
        setFetchingChunks(false);
        return;
      }

      const chunk = queuedChunks[chunkIndex];
      const ctrl = new AbortController();
      addController(ctrl);
      
      try {
        const res = await synthesizeChunk(docId, chunk.paragraph_id, chunk.text, 24000, { signal: ctrl.signal, timeoutMs: 30000 });
        useAppStore.getState().updateChunk(chunk.paragraph_id, { status: 'ready', audioBase64: res.audio_base64, timings: res.timings });
        
        // Check again before continuing to next chunk
        if (useAppStore.getState().sessionStatus !== 'cancelled') {
          setTimeout(() => fetchNextChunk(chunkIndex + 1), 100);
        } else {
          setFetchingChunks(false);
        }
      } catch {
        // Check again before continuing to next chunk
        if (useAppStore.getState().sessionStatus !== 'cancelled') {
          setTimeout(() => fetchNextChunk(chunkIndex + 1), 100);
        } else {
          setFetchingChunks(false);
        }
      }
    };

    // Start fetching from the first queued chunk
    fetchNextChunk(0);
  }, [chunks, addController, setFetchingChunks, sessionStatus]);

  return (
    <div className="min-h-screen bg-neutral-900 text-neutral-200">
      <AutoHideChrome inactivityMs={1500} />
      <TopBar
        onHome={() => {
          try { AudioController.stop(); } catch {}
          try { useAppStore.getState().setPlaying(false); } catch {}
          try { useAppStore.getState().setFetchingChunks(false); } catch {}
          try { useAppStore.getState().cancelAllControllers(); } catch {}
          // Session exit: do NOT change status. Optionally snapshot progress.
          try {
            const s = useAppStore.getState();
            void (async () => {
              try {
                await updateCurrentSession({
                  chunks: s.chunks,
                  currentIndex: s.currentIndex,
                  currentElapsedSec: s.currentElapsedSec,
                  paragraphCount: s.chunks.length,
                });
              } catch {}
            })();
          } catch {}
          // Keep session/state to allow resume
          router.push("/");
        }}
        right={
          <div className="flex items-center gap-2">
            <HistoryModal sessions={sessions} onResume={async (id) => {
              // Stop current playback
              try { AudioController.stop(); } catch {}
              try { useAppStore.getState().setPlaying(false); } catch {}
              try { useAppStore.getState().setFetchingChunks(false); } catch {}
              try { useAppStore.getState().cancelAllControllers(); } catch {}

              const rec = await resumeSession(id);
              if (!rec) return;

              // Hydrate store with saved session
              useAppStore.getState().setDocId(rec.docId);
              // Normalize chunk statuses to ensure the current chunk is playable and autoplay can trigger
              const normalized = rec.chunks.map((c) => {
                if (rec.hasBeenCompleted) {
                  // Completed sessions: start fresh; everything becomes ready if audio exists, otherwise queued
                  return {
                    ...c,
                    status: (c.audioBase64 ? 'ready' : 'queued') as 'ready' | 'queued',
                  };
                } else {
                  // Incomplete sessions: keep original statuses but ensure consistency
                  return c;
                }
              });
              useAppStore.getState().setChunks(normalized);
              useAppStore.getState().setCurrentIndex(rec.currentIndex);
              // Hard reset playback metrics/state for a brand new session to avoid stale highlights
              useAppStore.getState().setPlaybackMetrics(0, 0);
              useAppStore.getState().setPlaying(false);
              useAppStore.getState().setSessionStatus('in_progress');
              // Session ID is already set by the resumeSession function

              // Stay on session page (don't navigate)
            }} onRefresh={refresh}>
              <button
                className="p-2 rounded-md hover:bg-white/10 transition-colors"
                aria-label="Session history"
              >
                <History className="w-5 h-5 text-neutral-400" />
              </button>
            </HistoryModal>
          </div>
        }
      />
      <div className="pt-16" />
      <div className="mx-auto w-[min(920px,95vw)] py-6 space-y-6">
        <TruncatedPreview text={chunks.map(c => c.text).join('\n\n')} />
        <ChunkFeed headless />
        <ReaderView onTogglePlay={() => {
          const s = useAppStore.getState();
          if (s.isPlaying) {
            AudioController.pause();
          } else {
            try { AudioController.init(); } catch {}
            void AudioController.play();
          }
        }} />
        <MiniPlayer />
      </div>
    </div>
  );
}


