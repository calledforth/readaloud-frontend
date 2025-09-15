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
    const { raw, pdfBase64 } = body;

    if (!raw && !pdfBase64) {
      return NextResponse.json(
        { error: 'Either raw text or PDF is required' },
        { status: 400 }
      );
    }

    const doc_id = `doc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const input = {
      op: 'prepare_document',
      doc_id,
      input: {
        kind: pdfBase64 ? 'pdf_base64' : 'raw_text',
        raw_text: raw,
        pdf_base64: pdfBase64,
        language: 'en',
        max_paragraph_chars: 2000,
      },
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

    // Return in the format expected by the frontend
    return NextResponse.json({
      doc_id: (payload as { doc_id: string }).doc_id,
      paragraphs: (payload as { paragraphs: Array<{ paragraph_id: string; text: string }> }).paragraphs,
    });
  } catch (error) {
    console.error('Prepare document failed:', error);
    return NextResponse.json(
      { error: 'Prepare document failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
