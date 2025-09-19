export type Chunk = {
  paragraph_id: string;
  text: string;
  status: 'queued' | 'synth' | 'ready' | 'playing' | 'paused' | 'done';
  audioBase64?: string;
  timings?: Array<{
    word: string;
    start_ms: number;
    end_ms: number;
    char_start: number;
    char_end: number;
  }>;
};

export type SessionRecord = {
  id: string;
  title: string;
  createdAt: number;
  completedAt?: number;
  status: 'completed' | 'cancelled' | 'in_progress';
  hasBeenCompleted: boolean; // Track if this session was ever completed

  // Playback state snapshot
  docId: string;
  chunks: Chunk[];
  currentIndex: number;
  currentElapsedSec: number;
  speed: number;
  autoplayEnabled: boolean;

  // Metadata
  totalDuration?: number;
  paragraphCount: number;
  voice?: string;
};

export function makeSessionTitleFromChunks(chunks: Chunk[]): string {
  const first = chunks[0]?.text || '';
  const trimmed = first.replace(/\s+/g, ' ').trim();
  return trimmed.length > 0 ? (trimmed.length > 60 ? trimmed.slice(0, 57) + '…' : trimmed) : 'Untitled session';
}


