# Runpod Setup Guide

## 1. Deploy to Runpod

1. Build and push your Docker image to Runpod
2. Create a Serverless endpoint
3. Get your endpoint ID and API key from the Runpod dashboard

## 2. Configure Environment Variables

Create a `.env.local` file in the `frontend/` directory (this file is automatically ignored by git):

```bash
# Runpod Configuration (Server-side only - API key is secure!)
RUNPOD_ENDPOINT=https://api.runpod.ai/v2/YOUR_ENDPOINT_ID/runsync
RUNPOD_API_KEY=your_runpod_api_key_here
```

Replace:
- `YOUR_ENDPOINT_ID` with your actual Runpod endpoint ID
- `your_runpod_api_key_here` with your actual Runpod API key

## 3. Test the Connection

1. Start your frontend: `npm run dev`
2. Check the health status in the UI
3. You should see:
   - "Checking…" (green)
   - "Checking runpod…" (purple) 
   - "Connected · v0.1.0" (green)

## 4. How It Works

The app now uses Next.js API routes as a secure proxy:
- **Frontend** → **Next.js API Routes** → **Runpod API**
- API key stays on the server (never exposed to browser)
- CORS is handled automatically
- No direct browser-to-Runpod calls

## 5. Fallback Behavior

If Runpod is not configured, the API routes will return appropriate error messages, and the app will handle gracefully.

## Security Benefits

✅ **API key is secure** - never sent to browser  
✅ **CORS handled automatically** - no cross-origin issues  
✅ **Simple deployment** - everything in one Next.js app  
✅ **Production ready** - standard security pattern
