import { create } from 'zustand';

export type Chunk = {
  paragraph_id: string;
  text: string;
  status: 'queued' | 'synth' | 'ready' | 'playing' | 'paused' | 'done';
  audioBase64?: string;
  timings?: Array<{ word: string; start_ms: number; end_ms: number; char_start: number; char_end: number }>;
};

type State = {
  docId?: string;
  chunks: Chunk[];
  speed: number;
  isPlaying: boolean;
  currentIndex: number; // index into chunks
  cancelled: boolean;
  controllers: AbortController[];
  currentElapsedSec: number;
  currentDurationSec: number;
  autoplayEnabled: boolean;
  setDocId: (id: string) => void;
  setChunks: (c: Chunk[]) => void;
  updateChunk: (pid: string, data: Partial<Chunk>) => void;
  setSpeed: (s: number) => void;
  setPlaying: (p: boolean) => void;
  setCurrentIndex: (i: number) => void;
  setCancelled: (b: boolean) => void;
  addController: (c: AbortController) => void;
  cancelAllControllers: () => void;
  setPlaybackMetrics: (elapsed: number, duration: number) => void;
  setAutoplayEnabled: (b: boolean) => void;
};

export const useAppStore = create<State>((set) => ({
  chunks: [],
  speed: 1.0,
  isPlaying: false,
  currentIndex: 0,
  cancelled: false,
  controllers: [],
  currentElapsedSec: 0,
  currentDurationSec: 0,
  autoplayEnabled: true,
  setDocId: (docId) => set({ docId }),
  setChunks: (chunks) => set({ chunks }),
  updateChunk: (paragraph_id, data) =>
    set((s) => ({
      chunks: s.chunks.map((c) => (c.paragraph_id === paragraph_id ? { ...c, ...data } : c)),
    })),
  setSpeed: (speed) => set({ speed }),
  setPlaying: (isPlaying) => set({ isPlaying }),
  setCurrentIndex: (currentIndex) => set({ currentIndex }),
  setCancelled: (cancelled) => set({ cancelled }),
  addController: (c) => set((s) => ({ controllers: [...s.controllers, c] })),
  cancelAllControllers: () => set((s) => {
    for (const c of s.controllers) {
      try { c.abort(); } catch {}
    }
    return { controllers: [] };
  }),
  setPlaybackMetrics: (elapsed, duration) => set({ currentElapsedSec: elapsed, currentDurationSec: duration }),
  setAutoplayEnabled: (autoplayEnabled) => set({ autoplayEnabled }),
}));


