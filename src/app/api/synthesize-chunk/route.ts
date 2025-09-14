import { NextRequest, NextResponse } from 'next/server';

const RUNPOD_ENDPOINT = process.env.RUNPOD_ENDPOINT;
const RUNPOD_API_KEY = process.env.RUNPOD_API_KEY;

export async function POST(request: NextRequest) {
  try {
    if (!RUNPOD_ENDPOINT || !RUNPOD_API_KEY) {
      return NextResponse.json(
        { error: 'Runpod not configured' },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { doc_id, paragraph_id, text, sample_rate = 24000 } = body;

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
      voice: 'af_heart',
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
    
    if (!result.ok) {
      throw new Error(`Runpod error: ${result.message || 'Unknown error'}`);
    }

    // Return in the format expected by the frontend
    return NextResponse.json({
      audio_base64: result.audio_base64,
      sample_rate: result.sample_rate,
      cleaned_text: result.cleaned_text,
      timings: result.timings,
    });
  } catch (error) {
    console.error('Synthesize chunk failed:', error);
    return NextResponse.json(
      { error: 'Synthesize chunk failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
