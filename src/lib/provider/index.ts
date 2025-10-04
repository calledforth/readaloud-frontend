import * as runpodProvider from './runpod';
import * as mockProvider from './mock';

// Provider switching for demo mode
let currentProvider = runpodProvider;

export const switchToMockProvider = () => {
  currentProvider = mockProvider;
  console.log('Switched to MOCK provider - no real API calls will be made');
};

export const switchToRunpodProvider = () => {
  currentProvider = runpodProvider;
  console.log('Switched to RUNPOD provider - real API calls will be made');
};

export const health = () => currentProvider.health();
export const prepareDocument = (...args: Parameters<typeof currentProvider.prepareDocument>) => currentProvider.prepareDocument(...args);
export const synthesizeChunk = (...args: Parameters<typeof currentProvider.synthesizeChunk>) => currentProvider.synthesizeChunk(...args);

// Export provider info for debugging
export const getProviderInfo = () => ({
  type: currentProvider === mockProvider ? 'mock' : 'runpod-api-routes',
  configured: true,
});
