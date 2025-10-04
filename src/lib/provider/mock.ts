import { generateSineWavBase64 } from '../audio';
import { z } from 'zod';

// Zod schemas mirroring shared contracts (subset used by mock)
export const WordTimingZ = z.object({
  word: z.string(),
  start_ms: z.number().int().nonnegative(),
  end_ms: z.number().int().nonnegative(),
  char_start: z.number().int().nonnegative(),
  char_end: z.number().int().nonnegative(),
});

export const PrepareDocumentResponseOkZ = z.object({
  ok: z.literal(true),
  doc_id: z.string(),
  paragraphs: z.array(z.object({ paragraph_id: z.string(), text: z.string() })),
  cleaning_notes: z.array(z.string()).optional(),
  version: z.string(),
});

export const SynthesizeChunkResponseOkZ = z.object({
  ok: z.literal(true),
  doc_id: z.string(),
  paragraph_id: z.string(),
  cleaned_text: z.string(),
  audio_base64: z.string(),
  sample_rate: z.number().int().positive(),
  timings: z.array(WordTimingZ),
  inference_ms: z.object({ tts: z.number(), align: z.number(), total: z.number() }),
  version: z.string(),
});

export async function health(): Promise<{ ok: true; status: 'ok'; version: string }> {
  // Mock health returns OK consistently
  return { ok: true, status: 'ok', version: '0.1.0' };
}

type Paragraph = { paragraph_id: string; text: string };

export async function prepareDocument(raw: string, pdfBase64?: string, options?: { signal?: AbortSignal; timeoutMs?: number; retries?: number }): Promise<{
  doc_id: string;
  paragraphs: Paragraph[];
}> {
  console.log('MOCK prepareDocument called - no real API call made');
  const opts = options || {};
  await maybeDelay(80, opts);
  const doc_id = 'mock-doc';
  let text = raw;
  if (pdfBase64) {
    // In mock, just synthesize a placeholder text from PDF bytes length.
    const approx = Math.max(1, Math.floor((pdfBase64.length / 4) * 3 / 1000));
    text = `PDF extracted text (mock) with ~${approx}KB content.\n\n` + (raw || '');
  }
  const parts = text.split(/\n\s*\n/).filter(Boolean);
  const paragraphs = parts.map((p, idx) => ({ paragraph_id: `p${(idx + 1).toString().padStart(4, '0')}`, text: p }));
  const resp = { ok: true as const, doc_id, paragraphs, version: '0.1.0' };
  const parsed = PrepareDocumentResponseOkZ.safeParse(resp);
  if (!parsed.success) {
    throw new Error('PrepareDocumentResponse validation failed');
  }
  return { doc_id, paragraphs };
}

export async function synthesizeChunk(
  doc_id: string,
  paragraph_id: string,
  text: string,
  sample_rate = 24000,
  options?: { signal?: AbortSignal; timeoutMs?: number; retries?: number },
): Promise<{ audio_base64: string; sample_rate: number; cleaned_text: string; timings: Array<{ word: string; start_ms: number; end_ms: number; char_start: number; char_end: number }> }> {
  console.log('MOCK synthesizeChunk called - no real API call made');
  const opts = options || {};
  // Retry with jittered backoff
  const maxRetries = Math.min(2, opts.retries ?? 2);
  let attempt = 0;
  for (;;) {
    try {
      await maybeDelay(120 + Math.floor(Math.random() * 60), opts);
      break;
    } catch (e) {
      if (opts.signal?.aborted) throw e;
      if (attempt++ >= maxRetries) throw e;
      const backoff = 200 * Math.pow(2, attempt) + Math.floor(Math.random() * 200);
      await maybeDelay(backoff, { signal: opts.signal, timeoutMs: (opts.timeoutMs ?? 25000) });
    }
  }
  const duration = Math.min(6, Math.max(1.2, Math.ceil(text.length / 18)));
  const audio_base64 = generateSineWavBase64(duration, sample_rate, 220);
  // Heuristic timings: evenly distribute words across duration
  const parts = Array.from(text.matchAll(/\b\w+\b/g));
  const totalMs = Math.floor(duration * 1000);
  const n = Math.max(1, parts.length);
  const timings = parts.map((m, i) => {
    const start_ms = Math.floor((i * totalMs) / n);
    const end_ms = Math.floor(((i + 1) * totalMs) / n);
    return {
      word: m[0],
      start_ms,
      end_ms,
      char_start: m.index ?? 0,
      char_end: (m.index ?? 0) + m[0].length,
    };
  });
  const resp = {
    ok: true as const,
    doc_id,
    paragraph_id,
    cleaned_text: text,
    audio_base64,
    sample_rate,
    timings,
    inference_ms: { tts: 0, align: 0, total: 0 },
    version: '0.1.0',
  };
  const parsed = SynthesizeChunkResponseOkZ.safeParse(resp);
  if (!parsed.success) {
    throw new Error('SynthesizeChunkResponse validation failed');
  }
  return { audio_base64, sample_rate, cleaned_text: text, timings };
}

async function maybeDelay(ms: number, opts: { signal?: AbortSignal; timeoutMs?: number; retries?: number }) {
  const timeout = opts.timeoutMs ?? 25000;
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeout);
  try {
    await new Promise<void>((resolve, reject) => {
      const onAbort = () => reject(new Error('aborted'));
      opts.signal?.addEventListener('abort', onAbort, { once: true });
      setTimeout(() => {
        opts.signal?.removeEventListener('abort', onAbort);
        resolve();
      }, ms);
    });
  } finally {
    clearTimeout(t);
  }
}


