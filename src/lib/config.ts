// Runpod Configuration (Server-side only)
// Set these environment variables in your .env.local file:
// RUNPOD_ENDPOINT=https://api.runpod.ai/v2/YOUR_ENDPOINT_ID/runsync
// RUNPOD_API_KEY=your_runpod_api_key_here

export const RUNPOD_CONFIG = {
  endpoint: process.env.RUNPOD_ENDPOINT || '',
  apiKey: process.env.RUNPOD_API_KEY || '',
};

export const isRunpodConfigured = () => {
  return !!(RUNPOD_CONFIG.endpoint && RUNPOD_CONFIG.apiKey);
};
