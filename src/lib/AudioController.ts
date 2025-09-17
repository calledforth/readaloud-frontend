"use client";
import { decodeWavBase64 } from "./audio";
import { useAppStore } from "../state/store";

type ControllerEvents = {
  state?: (isPlaying: boolean) => void;
  index?: (index: number) => void;
  metrics?: (elapsed: number, duration: number) => void;
  error?: (err: unknown) => void;
};

class AudioControllerImpl {
  private audioContext: AudioContext | null = null;
  private gainNode: GainNode | null = null;
  private currentSource: AudioBufferSourceNode | null = null;
  private bufferCache: Map<string, AudioBuffer> = new Map();
  private sessionId = 0;
  private pausedOffsetSec = 0;
  private startAtContextTime = 0;
  private currentDurationScaled = 0;
  private playbackAllowed = true;
  private listeners: Required<Record<keyof ControllerEvents, Set<Function>>> = {
    state: new Set(),
    index: new Set(),
    metrics: new Set(),
    error: new Set(),
  } as const;

  init(): void {
    if (this.audioContext) return;
    const g = globalThis as unknown as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext };
    const AC = (g.AudioContext ?? g.webkitAudioContext);
    if (!AC) throw new Error("Web Audio not supported");
    this.audioContext = new AC();
    this.gainNode = this.audioContext.createGain();
    this.gainNode.gain.value = 1;
    this.gainNode.connect(this.audioContext.destination);
  }

  on<E extends keyof ControllerEvents>(event: E, handler: NonNullable<ControllerEvents[E]>): () => void {
    const set = this.listeners[event] as Set<Function>;
    set.add(handler as Function);
    return () => { set.delete(handler as Function); };
  }

  private emit<E extends keyof ControllerEvents>(event: E, ...args: Parameters<NonNullable<ControllerEvents[E]>>): void {
    const set = this.listeners[event] as Set<Function> | undefined;
    if (!set) return;
    for (const fn of set) {
      try { (fn as any)(...args); } catch {}
    }
  }

  async ensureResumed(): Promise<void> {
    if (!this.audioContext) this.init();
    const ctx = this.audioContext!;
    try { if (ctx.state === "suspended") await ctx.resume(); } catch {}
  }

  load(): void {
    // Reset controller-level offsets; chunks live in store
    this.stopInternal(false);
    this.bufferCache.clear();
    this.pausedOffsetSec = 0;
    this.sessionId++;
  }

  setPlaybackAllowed(allowed: boolean): void {
    this.playbackAllowed = allowed;
    if (!allowed) {
      this.stopInternal(false);
    }
  }

  async play(index?: number): Promise<void> {
    if (!this.playbackAllowed) return;
    const s = useAppStore.getState();
    if (typeof index === 'number' && index !== s.currentIndex) {
      s.setCurrentIndex(index);
    }
    const cur = s.chunks[s.currentIndex];
    if (!cur || !cur.audioBase64) return;
    await this.ensureResumed();
    const ctx = this.audioContext!;
    const gain = this.gainNode!;
    const mySession = ++this.sessionId;

    // decode or fetch from cache
    let buffer = this.bufferCache.get(cur.paragraph_id);
    if (!buffer) {
      try {
        buffer = await decodeWavBase64(ctx, cur.audioBase64);
        this.bufferCache.set(cur.paragraph_id, buffer);
      } catch (e) {
        this.emit('error', e);
        return;
      }
    }

    // stop any previous source
    this.stopInternal(false);

    // compute rate and resume offset
    const rate = Math.max(0.25, Math.min(3.0, s.speed));
    const startOffset = Math.max(0, Math.min(buffer.duration, this.pausedOffsetSec));
    this.pausedOffsetSec = 0;

    // build source
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    src.playbackRate.value = rate;
    src.connect(gain);
    this.currentSource = src;
    s.updateChunk(cur.paragraph_id, { status: 'playing' });
    s.setPlaying(true);

    const now = ctx.currentTime;
    const ramp = 0.015;
    try {
      gain.gain.setValueAtTime(0.0, now);
      gain.gain.linearRampToValueAtTime(1.0, now + ramp);
    } catch {}

    this.startAtContextTime = now - (startOffset / Math.max(0.01, rate));
    this.currentDurationScaled = buffer.duration / Math.max(0.01, rate);
    s.setPlaybackMetrics(startOffset / Math.max(0.01, rate), this.currentDurationScaled);
    this.emit('state', true);

    src.onended = () => {
      // stale guard
      const currentS = useAppStore.getState();
      if (mySession !== this.sessionId) return;
      if (!this.playbackAllowed) return;
      const atEnd = (currentS.currentIndex + 1) >= currentS.chunks.length;
      currentS.updateChunk(cur.paragraph_id, { status: 'done' });
      if (atEnd) {
        currentS.setPlaying(false);
        this.emit('state', false);
        return;
      }
      currentS.setCurrentIndex(currentS.currentIndex + 1);
      this.emit('index', currentS.currentIndex);
      void this.play();
    };

    try { src.start(0, startOffset); } catch { src.start(0); }

    const tick = () => {
      if (!this.currentSource) return; // stopped
      const elapsed = ctx.currentTime - this.startAtContextTime;
      const e = Math.max(0, Math.min(this.currentDurationScaled, elapsed));
      s.setPlaybackMetrics(e, this.currentDurationScaled);
      this.emit('metrics', e, this.currentDurationScaled);
      if (this.currentSource) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  pause(): void {
    const s = useAppStore.getState();
    s.setAutoplayEnabled(false);
    const cur = s.chunks[s.currentIndex];
    const ctx = this.audioContext;
    if (!ctx || !this.currentSource || !cur) {
      s.setPlaying(false);
      this.emit('state', false);
      return;
    }
    const rate = Math.max(0.25, Math.min(3.0, s.speed));
    const elapsed = Math.max(0, ctx.currentTime - this.startAtContextTime);
    const offset = Math.max(0, Math.min(this.currentSource.buffer ? this.currentSource.buffer.duration : this.currentDurationScaled * rate, elapsed * rate));
    this.pausedOffsetSec = offset;
    try { this.currentSource.onended = null as any; } catch {}
    try { this.currentSource.stop(); } catch {}
    this.currentSource = null;
    s.updateChunk(cur.paragraph_id, { status: 'paused' });
    s.setPlaybackMetrics(offset / Math.max(0.01, rate), this.currentDurationScaled);
    s.setPlaying(false);
    this.emit('state', false);
  }

  stop(): void {
    this.stopInternal(true);
  }

  private stopInternal(resetOffset: boolean): void {
    if (this.currentSource) {
      try { this.currentSource.onended = null as any; } catch {}
      try { this.currentSource.stop(); } catch {}
      this.currentSource.disconnect();
      this.currentSource = null;
    }
    if (resetOffset) this.pausedOffsetSec = 0;
  }

  async seek(offsetSec: number): Promise<void> {
    const s = useAppStore.getState();
    const cur = s.chunks[s.currentIndex];
    if (!cur || !cur.audioBase64) return;
    await this.ensureResumed();
    const ctx = this.audioContext!;
    const gain = this.gainNode!;
    let buffer = this.bufferCache.get(cur.paragraph_id);
    if (!buffer) {
      buffer = await decodeWavBase64(ctx, cur.audioBase64);
      this.bufferCache.set(cur.paragraph_id, buffer);
    }
    const clamped = Math.max(0, Math.min(buffer.duration, offsetSec));
    this.pausedOffsetSec = clamped;
    if (!s.isPlaying) {
      const rate = Math.max(0.25, Math.min(3.0, s.speed));
      const durScaled = buffer.duration / Math.max(0.01, rate);
      s.setPlaybackMetrics(clamped / Math.max(0.01, rate), durScaled);
      return;
    }
    // playing -> rebuild
    this.stopInternal(false);
    const rate = Math.max(0.25, Math.min(3.0, s.speed));
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    src.playbackRate.value = rate;
    src.connect(gain);
    this.currentSource = src;
    const now = ctx.currentTime;
    const ramp = 0.012;
    try {
      gain.gain.setValueAtTime(0.0, now);
      gain.gain.linearRampToValueAtTime(1.0, now + ramp);
    } catch {}
    this.startAtContextTime = now - clamped / Math.max(0.01, rate);
    this.currentDurationScaled = buffer.duration / Math.max(0.01, rate);
    s.setPlaybackMetrics(clamped / Math.max(0.01, rate), this.currentDurationScaled);
    try { src.start(0, clamped); } catch { src.start(0); }
  }

  async setSpeed(rate: number): Promise<void> {
    const s = useAppStore.getState();
    s.setSpeed(rate);
    if (!this.currentSource) return;
    try { this.currentSource.playbackRate.value = Math.max(0.25, Math.min(3.0, rate)); } catch {}
    // update duration scaling and metrics baseline
    const buffer = this.currentSource.buffer;
    const ctx = this.audioContext!;
    const elapsed = Math.max(0, ctx.currentTime - this.startAtContextTime);
    const newDur = (buffer ? buffer.duration : this.currentDurationScaled) / Math.max(0.01, Math.max(0.25, Math.min(3.0, rate)));
    this.currentDurationScaled = newDur;
    s.setPlaybackMetrics(Math.max(0, Math.min(newDur, elapsed)), newDur);
  }

  async next(): Promise<void> {
    if (!this.playbackAllowed) return;
    const s = useAppStore.getState();
    const nextIndex = s.currentIndex + 1;
    if (nextIndex >= s.chunks.length) {
      this.pause();
      return;
    }
    s.setCurrentIndex(nextIndex);
    await this.play();
  }

  async prev(): Promise<void> {
    if (!this.playbackAllowed) return;
    const s = useAppStore.getState();
    const prevIndex = Math.max(0, s.currentIndex - 1);
    if (prevIndex === s.currentIndex) {
      await this.seek(0);
      return;
    }
    s.setCurrentIndex(prevIndex);
    await this.play();
  }
}

export const AudioController = new AudioControllerImpl();