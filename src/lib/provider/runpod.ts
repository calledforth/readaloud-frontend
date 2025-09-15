// Runpod provider that calls Next.js API routes
// The API routes handle the actual Runpod communication securely

async function callApi<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const response = await fetch(endpoint, {
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    ...options,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.details || `API error: ${response.status} ${response.statusText}`);
  }

  const result = await response.json();
  return result;
}

export async function health(): Promise<{ ok: true; status: 'ok'; version: string }> {
  return callApi('/api/health', {
    method: 'POST',
    body: JSON.stringify({ input: { op: 'health' } }),
  });
}

type Paragraph = { paragraph_id: string; text: string };

export async function prepareDocument(raw: string, pdfBase64?: string, options?: { signal?: AbortSignal; timeoutMs?: number; retries?: number }): Promise<{
  doc_id: string;
  paragraphs: Paragraph[];
}> {
  const result = await callApi<{
    doc_id: string;
    paragraphs: Array<{ paragraph_id: string; text: string }>;
  }>('/api/prepare-document', {
    method: 'POST',
    body: JSON.stringify({ raw, pdfBase64 }),
    signal: options?.signal,
  });

  return result;
}

export async function synthesizeChunk(
  doc_id: string,
  paragraph_id: string,
  text: string,
  sample_rate = 24000,
  options?: { signal?: AbortSignal; timeoutMs?: number; retries?: number; voice?: string },
): Promise<{ audio_base64: string; sample_rate: number; cleaned_text: string; timings: Array<{ word: string; start_ms: number; end_ms: number; char_start: number; char_end: number }> }> {
  const result = await callApi<{
    audio_base64: string;
    sample_rate: number;
    cleaned_text: string;
    timings: Array<{ word: string; start_ms: number; end_ms: number; char_start: number; char_end: number }>;
  }>('/api/synthesize-chunk', {
    method: 'POST',
    body: JSON.stringify({ doc_id, paragraph_id, text, sample_rate, voice: options?.voice }),
    signal: options?.signal,
  });

  return result;
}
