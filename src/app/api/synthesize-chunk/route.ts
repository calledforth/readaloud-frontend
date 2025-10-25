import { NextRequest, NextResponse } from 'next/server';
import { logSynthesize } from '@/lib/simpleLogger';
import { getClientIp } from '@/lib/getClientIp';

const RUNPOD_ENDPOINT = process.env.RUNPOD_ENDPOINT;
const RUNPOD_API_KEY = process.env.RUNPOD_API_KEY;

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  let inputText: string | undefined;
  let docId: string | undefined;
  let voice: string | undefined;
  
  try {
    if (!RUNPOD_ENDPOINT || !RUNPOD_API_KEY) {
      return NextResponse.json(
        { error: 'Runpod not configured' },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { doc_id, paragraph_id, text, sample_rate = 24000, voice: voiceParam } = body;
    
    docId = doc_id;
    inputText = text;
    voice = voiceParam || 'af_heart';

    if (!doc_id || !paragraph_id || !text) {
      return NextResponse.json(
        { error: 'doc_id, paragraph_id, and text are required' },
        { status: 400 }
      );
    }

    const input = {
      op: 'synthesize_chunk',
      doc_id,
      paragraph_id,
      text,
      voice,
      sample_rate,
      rate: 1.0,
    };

    const response = await fetch(RUNPOD_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RUNPOD_API_KEY}`,
      },
      body: JSON.stringify({ input }),
    });

    if (!response.ok) {
      throw new Error(`Runpod API error: ${response.status} ${response.statusText}`);
    }

    const result = await response.json();
    // Unwrap possible runsync envelope
    const payload = (result && typeof result === 'object' && 'output' in result)
      ? (result as { output: unknown }).output as Record<string, unknown>
      : (result as Record<string, unknown>);

    if (!payload || (payload as { ok?: unknown }).ok !== true) {
      throw new Error(`Runpod error: ${(payload as { message?: string })?.message || 'Unknown error'}`);
    }

    // SUCCESS: Log to Logtail (non-blocking)
    void logSynthesize({
      source: 'api.synthesize',
      status: 'success',
      ip,
      docId: docId || '',
      voice: voice || 'af_heart',
      charCount: inputText?.length || 0,
      textPreview: inputText || ''
    });

    // Return in the format expected by the frontend
    return NextResponse.json({
      audio_base64: (payload as { audio_base64: string }).audio_base64,
      sample_rate: (payload as { sample_rate: number }).sample_rate,
      cleaned_text: (payload as { cleaned_text: string }).cleaned_text,
      timings: (payload as { timings: Array<{ word: string; start_ms: number; end_ms: number; char_start: number; char_end: number }> }).timings,
    });
  } catch (error) {
    // ERROR: Log to Logtail
    void logSynthesize({
      source: 'api.synthesize',
      status: 'error',
      ip,
      docId: docId || '',
      voice: voice || 'af_heart',
      charCount: inputText?.length || 0,
      textPreview: inputText || '',
      errorMessage: error instanceof Error ? error.message : 'Unknown error'
    });
    console.error('Synthesize chunk failed:', error);
    return NextResponse.json(
      { error: 'Synthesize chunk failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
