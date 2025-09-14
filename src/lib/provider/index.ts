import * as runpodProvider from './runpod';

// Always use runpod provider now (it calls our API routes)
// If API routes are not configured, they'll return appropriate errors
const provider = runpodProvider;

export const health = provider.health;
export const prepareDocument = provider.prepareDocument;
export const synthesizeChunk = provider.synthesizeChunk;

// Export provider info for debugging
export const getProviderInfo = () => ({
  type: 'runpod-api-routes',
  configured: true, // API routes handle configuration
});
