export function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) bytes[i] = binaryString.charCodeAt(i);
  return bytes.buffer;
}

export async function decodeWavBase64(
  audioContext: AudioContext,
  wavBase64: string,
): Promise<AudioBuffer> {
  const arrayBuf = base64ToArrayBuffer(wavBase64);
  return await audioContext.decodeAudioData(arrayBuf.slice(0));
}

// Minimal WAV generator for mock audio (mono, float32)
export function generateSineWavBase64(
  durationSec: number,
  sampleRate = 24000,
  freq = 220,
): string {
  const numSamples = Math.max(1, Math.floor(durationSec * sampleRate));
  const numChannels = 1;
  const bytesPerSample = 2; // 16-bit PCM
  const blockAlign = numChannels * bytesPerSample;
  const byteRate = sampleRate * blockAlign;
  const dataSize = numSamples * blockAlign;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  // RIFF header
  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeString(view, 8, 'WAVE');

  // fmt chunk
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true); // PCM chunk size
  view.setUint16(20, 1, true); // format PCM
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, 16, true); // bits per sample

  // data chunk
  writeString(view, 36, 'data');
  view.setUint32(40, dataSize, true);

  // Write samples (sine with short fade in/out)
  let offset = 44;
  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    let amp = Math.sin(2 * Math.PI * freq * t);
    const fadeDur = Math.min(0.02, durationSec / 10);
    const fadeIn = Math.min(1, t / fadeDur);
    const fadeOut = Math.min(1, (durationSec - t) / fadeDur);
    amp *= Math.min(fadeIn, fadeOut);
    const val = Math.max(-1, Math.min(1, amp));
    view.setInt16(offset, val * 0x7fff, true);
    offset += 2;
  }

  // to base64
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

function writeString(view: DataView, offset: number, str: string) {
  for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
}


