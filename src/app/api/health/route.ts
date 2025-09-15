import { NextResponse } from 'next/server';

const RUNPOD_ENDPOINT = process.env.RUNPOD_ENDPOINT;
const RUNPOD_API_KEY = process.env.RUNPOD_API_KEY;

export async function POST() {
  try {
    if (!RUNPOD_ENDPOINT || !RUNPOD_API_KEY) {
      return NextResponse.json(
        { error: 'Runpod not configured' },
        { status: 500 }
      );
    }

    const response = await fetch(RUNPOD_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RUNPOD_API_KEY}`,
      },
      body: JSON.stringify({ 
        "input": { "op": "health" } 
      }),
    });

    if (!response.ok) {
      throw new Error(`Runpod API error: ${response.status} ${response.statusText}`);
    }

    const result = await response.json();
    console.log('Runpod health raw result:', result);
    // Unwrap runsync envelope if present
    const payload = (result && typeof result === 'object' && 'output' in result)
      ? (result as { output: unknown; status?: string }).output as Record<string, unknown>
      : (result as Record<string, unknown>);

    // If the upstream signals a transient async status (for /run), surface it to the client
    const status = (result as { status?: string }).status;
    if (status && status !== 'COMPLETED' && !('ok' in payload)) {
      return NextResponse.json({ ok: false, status }, { status: 200 });
    }

    if (!payload || (payload as { ok?: unknown }).ok !== true) {
      throw new Error(`Runpod error: ${(payload as { message?: string })?.message || 'Unknown error'}`);
    }

    // Return the flat payload expected by the client
    return NextResponse.json(payload);
  } catch (error) {
    console.error('Health check failed:', error);
    return NextResponse.json(
      { error: 'Health check failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
