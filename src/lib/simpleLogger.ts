import { getClientIp } from './getClientIp';

export interface PrepareLog {
  source: 'api.prepare';
  status: 'success' | 'error';
  ip: string;
  docId: string;
  inputType: 'raw' | 'pdf';
  charCount: number;
  textPreview: string;
  truncated: boolean;
  errorMessage?: string;
}

export interface SynthesizeLog {
  source: 'api.synthesize';
  status: 'success' | 'error';
  ip: string;
  docId: string;
  voice: string;
  charCount: number;
  textPreview: string;
  truncated: boolean;
  errorMessage?: string;
}

function truncatePreview(text: string, limit = 500): { preview: string; truncated: boolean } {
  if (text.length <= limit) return { preview: text, truncated: false };
  return { preview: text.slice(0, limit), truncated: true };
}

export function logPrepare(entry: Omit<PrepareLog, 'truncated'>) {
  const { preview, truncated } = truncatePreview(entry.textPreview || '');
  
  console.log(JSON.stringify({
    ...entry,
    textPreview: preview,
    truncated
  }));
}

export function logSynthesize(entry: Omit<SynthesizeLog, 'truncated'>) {
  const { preview, truncated } = truncatePreview(entry.textPreview || '');
  
  console.log(JSON.stringify({
    ...entry,
    textPreview: preview,
    truncated
  }));
}