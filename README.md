This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## ReadAloud Features

ReadAloud is a text-to-speech application with word-level highlighting that supports:
- Direct text input or PDF document upload
- Multiple voice options in different languages
- Real-time word highlighting during playback
- Session history and resume functionality
- Usage analytics for service improvement

## Logging & Analytics

### Vercel Analytics
This application uses Vercel Analytics for frontend analytics and basic API metrics:
- Page views and visitor counts
- Geographic distribution of users
- API route performance metrics
- Web vitals and user experience data

### Server-side Logging
API requests are logged via console.log() and captured by Vercel Logs:

### What's logged:
- IP address
- Input text preview (truncated if >500 chars)
- Character count and truncation flag
- Endpoint called (prepare/synthesize)
- Voice selection (synthesize only)
- Success/failure status

### Viewing logs:
- Go to your Vercel project dashboard
- Click on the "Logs" tab to view server logs
- Use search filters: `source:api.prepare`, `source:api.synthesize`, `status:error`
- Logs appear as structured JSON for easy parsing

### To disable logging:
Comment out `logPrepare()` and `logSynthesize()` calls in:
- `src/app/api/prepare-document/route.ts`
- `src/app/api/synthesize-chunk/route.ts`

### Benefits of this approach:
- ✅ Completely free - no paid tiers required
- ✅ Built into Vercel - no external dependencies
- ✅ Server-side only - logs appear in Vercel dashboard, not browser
- ✅ Structured data - JSON logs are captured as-is
- ✅ Easy access - view logs in Vercel dashboard under "Logs" tab

## Environment Variables

Required environment variables:
- `RUNPOD_ENDPOINT` - Your RunPod serverless endpoint
- `RUNPOD_API_KEY` - RunPod API key

No additional environment variables needed for logging (Logtail integration handles credentials automatically).
