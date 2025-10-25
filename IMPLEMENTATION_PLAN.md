## **ReadAloud - Logging & Welcome Modal Implementation Plan**

## **Logging Choice: Logtail by Better Stack (Vercel Integration)**

**Why Logtail:**
- ✅ **Zero-code integration** - Add from Vercel Marketplace, streams all console logs automatically
- ✅ **Dashboard UI** - Table view with filtering, no SQL required
- ✅ **Free tier** - 1 GB/month ingestion, 3-day retention (EU hosting)
- ✅ **Structured JSON parsing** - Fields become columns instantly

**This plan uses Logtail for console-based logging.**

---

## **Structured Log Payload Schema**

**Common fields (both endpoints):**
```json
{
  "source": "api.prepare" | "api.synthesize",
  "status": "success" | "error",
  "ip": "string",
  "docId": "string",
  "timestamp": "ISO string (auto-added by Logtail)",
  "errorMessage": "string (only on error)"
}
```

**Endpoint-specific fields:**
- prepare: `{ "inputType": "raw" | "pdf", "charCount": number, "textPreview": string, "truncated": boolean }`
- synthesize: `{ "voice": string, "charCount": number, "textPreview": string, "truncated": boolean }`

**Optional enrichment (Phase 2):**
- `{ "country": "2-letter code", "city": "string" }`

**Truncation rules:**
- If charCount > 500: textPreview = first 400–500 chars, truncated: true
- If charCount ≤ 500: textPreview = full text, truncated: false
- For PDFs: apply same rule to extracted text

**What we're logging:**
- ✅ IP address (who)
- ✅ Input text preview (what they sent)
- ✅ Character count and truncation flag
- ✅ Voice selection (synthesize only)
- ✅ Location from IP (optional)
- ✅ Success/error status
- ✅ Endpoint called

**IMPORTANT: Logging Scope Clarification**
- **ONLY** API endpoints (`prepare-document` and `synthesize-chunk`) are logged
- **NO** integration with session lifecycle or other app events
- **PURPOSE**: Understand what inputs people are sending to backend for personal project insights

**Expected ingestion**: ~500 bytes to 2KB per log
- 10-100 requests/day = ~15MB/month (well under 1 GB free tier)

---

## **EXTREMELY DETAILED IMPLEMENTATION PLAN**

### **Phase 1: Logtail Integration & Verification**

#### **Step 1.1: Add Logtail Integration**
1. Go to Vercel Dashboard → Integrations → Marketplace
2. Search for **"Logtail by Better Stack"**
3. Click **Add Integration** → select your team/project
4. Authorize and complete the flow
5. Vercel will open Logtail workspace URL; bookmark it

#### **Step 1.2: Verify Log Streaming**
1. Deploy a preview or visit your app
2. Trigger any API call (prepare or synthesize)
3. In Logtail dashboard: open **Live Tail** or **Explorer**
4. Confirm structured JSON rows appear within seconds
5. Note free tier limits: 1 GB/month ingestion, 3-day retention

#### **Step 1.3: Configure Log Views (Optional)**
- Create saved filters: `source:api.prepare`, `source:api.synthesize`, `status:error`
- Pin a dashboard showing recent requests by country (if geolocation enabled)

---

### **Phase 2: Location Lookup Service**

#### **Step 2.1: IP Geolocation API Setup**
**Using: ipapi.co** (Free tier: 1000 requests/day, no API key required)

**API Details:**
- Endpoint: `https://ipapi.co/{ip}/json/`
- Returns: `{country_code, city, region, latitude, longitude, ...}`
- Rate limit: 1000/day (sufficient for personal project)
- Timeout handling: 3 seconds

#### **Step 2.2: Create Geolocation Utility**
**File**: `frontend/src/lib/geolocation.ts`

**Purpose**: Fetch country/city from IP address

**Key features:**
- 3-second timeout to avoid blocking
- Silent failure (returns empty object if error)
- No API key needed

```typescript
interface GeoData {
  country?: string;
  city?: string;
}

// Polyfill for AbortSignal.timeout() for broader browser compatibility
function createTimeoutSignal(timeoutMs: number): AbortSignal {
  // Check if native AbortSignal.timeout is available
  if (typeof AbortSignal !== 'undefined' && 'timeout' in AbortSignal) {
    try {
      return AbortSignal.timeout(timeoutMs);
    } catch (e) {
      // Fallback if native method fails
    }
  }
  
  // Manual polyfill for older browsers
  const controller = new AbortController();
  setTimeout(() => controller.abort(), timeoutMs);
  return controller.signal;
}

export async function getLocation(ip: string): Promise<GeoData> {
  try {
    // Skip localhost IPs
    if (ip === 'unknown' || ip.includes('127.0.0.1') || ip.includes('::1')) {
      return {};
    }
    
    const res = await fetch(`https://ipapi.co/${ip}/json/`, {
      signal: createTimeoutSignal(3000) // Use polyfill for 3s timeout
    });
    
    if (!res.ok) return {};
    
    const data = await res.json();
    return {
      country: data.country_code || null,
      city: data.city || null
    };
  } catch {
    // Fail silently - don't block logging if geolocation fails
    return {};
  }
}
```

---

### **Phase 3: Logging Helper & Conventions**

#### **Step 3.1: Create Structured Logger**
**File**: `frontend/src/lib/logger.ts`

**Purpose**: Emit structured JSON logs for Logtail parsing

**Key features:**
- Non-blocking console.log only (no database)
- Truncates long text previews
- Optional geolocation enrichment
- Silent failure (won't break requests)

```typescript
import { getLocation } from './geolocation';

export interface PrepareLog {
  source: 'api.prepare';
  status: 'success' | 'error';
  ip: string;
  docId: string;
  inputType: 'raw' | 'pdf';
  charCount: number;
  textPreview: string;
  truncated: boolean;
  country?: string;
  city?: string;
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
  country?: string;
  city?: string;
  errorMessage?: string;
}

function truncatePreview(text: string, limit = 500): { preview: string; truncated: boolean } {
  if (text.length <= limit) return { preview: text, truncated: false };
  return { preview: text.slice(0, limit), truncated: true };
}

export async function logPrepare(entry: Omit<PrepareLog, 'country' | 'city'>) {
  try {
    const location = await getLocation(entry.ip);
    const { preview, truncated } = truncatePreview(entry.textPreview || '');
    
    console.log(JSON.stringify({
      ...entry,
      textPreview: preview,
      truncated,
      ...location
    }));
  } catch {
    // Fail silently
  }
}

export async function logSynthesize(entry: Omit<SynthesizeLog, 'country' | 'city'>) {
  try {
    const location = await getLocation(entry.ip);
    const { preview, truncated } = truncatePreview(entry.textPreview || '');
    
    console.log(JSON.stringify({
      ...entry,
      textPreview: preview,
      truncated,
      ...location
    }));
  } catch {
    // Fail silently
  }
}
```

---

### **Phase 4: Extract IP Address**

#### **Step 4.1: Create IP Extraction Utility**
**File**: `frontend/src/lib/getClientIp.ts`

**Purpose**: Extract real client IP from Vercel headers

**How Vercel provides IPs:**
- `x-forwarded-for`: Primary header with client IP
- `x-real-ip`: Backup header
- Format: `"client-ip, proxy1, proxy2"` (we take first one)

```typescript
import { NextRequest } from 'next/server';

export function getClientIp(request: NextRequest): string {
  // Vercel provides these headers
  const forwarded = request.headers.get('x-forwarded-for');
  const real = request.headers.get('x-real-ip');
  
  if (forwarded) {
    // x-forwarded-for can be: "client, proxy1, proxy2"
    // We want the first IP (actual client)
    return forwarded.split(',')[0].trim();
  }
  
  if (real) {
    return real;
  }
  
  // Fallback (shouldn't happen on Vercel)
  return 'unknown';
}
```

**Testing locally:**
- Local dev will show `::1` or `127.0.0.1`
- Deploy to Vercel to see real IPs

---

### **Phase 5: Update API Routes**

#### **Step 5.1: Update prepare-document Route**
**File**: `frontend/src/app/api/prepare-document/route.ts`

**Changes Required:**
1. Import logging helper at top
2. Extract IP and capture request data
3. Log success after API call succeeds
4. Log error in catch block

**Implementation:**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { logPrepare } from '@/lib/logger';
import { getClientIp } from '@/lib/getClientIp';

const RUNPOD_ENDPOINT = process.env.RUNPOD_ENDPOINT;
const RUNPOD_API_KEY = process.env.RUNPOD_API_KEY;

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  let inputText: string | undefined;
  let docId: string | undefined;
  
  try {
    if (!RUNPOD_ENDPOINT || !RUNPOD_API_KEY) {
      return NextResponse.json(
        { error: 'Runpod not configured' },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { raw, pdfBase64 } = body;
    inputText = raw;

    if (!raw && !pdfBase64) {
      return NextResponse.json(
        { error: 'Either raw text or PDF is required' },
        { status: 400 }
      );
    }

    docId = `doc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const input = {
      op: 'prepare_document',
      doc_id: docId,
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
    const payload = (result && typeof result === 'object' && 'output' in result)
      ? (result as { output: unknown }).output as Record<string, unknown>
      : (result as Record<string, unknown>);

    if (!payload || (payload as { ok?: unknown }).ok !== true) {
      throw new Error(`Runpod error: ${(payload as { message?: string })?.message || 'Unknown error'}`);
    }

    // SUCCESS: Log to Logtail (non-blocking)
    void logPrepare({
      source: 'api.prepare',
      status: 'success',
      ip,
      docId,
      inputType: pdfBase64 ? 'pdf' : 'raw',
      charCount: inputText?.length || 0,
      textPreview: inputText || ''
    });

    return NextResponse.json({
      doc_id: (payload as { doc_id: string }).doc_id,
      paragraphs: (payload as { paragraphs: Array<{ paragraph_id: string; text: string }> }).paragraphs,
    });
    
  } catch (error) {
    // ERROR: Log to Logtail
    void logPrepare({
      source: 'api.prepare',
      status: 'error',
      ip,
      docId: docId || '',
      inputType: 'raw', // fallback
      charCount: inputText?.length || 0,
      textPreview: inputText || '',
      errorMessage: error instanceof Error ? error.message : 'Unknown error'
    });
    
    console.error('Prepare document failed:', error);
    return NextResponse.json(
      { error: 'Prepare document failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
```

**Key points:**
- Uses console.log via helper; no database calls
- Structured JSON appears as columns in Logtail
- Text preview truncated automatically by helper

---

#### **Step 5.2: Update synthesize-chunk Route**
**File**: `frontend/src/app/api/synthesize-chunk/route.ts`

**Same pattern as prepare-document, but with voice field:**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { logSynthesize } from '@/lib/logger';
import { getClientIp } from '@/lib/getClientIp';

const RUNPOD_ENDPOINT = process.env.RUNPOD_ENDPOINT;
const RUNPOD_API_KEY = process.env.RUNPOD_API_KEY;

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  let inputText: string | undefined;
  let docId: string | undefined;
  let voice: string | undefined;
  
  try {
    if (!RUNPOD_ENDPOINT || !RUNPOD_API_KEY) {
      return NextResponse.json(
        { error: 'Runpod not configured' },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { doc_id, paragraph_id, text, sample_rate = 24000, voice: voiceParam } = body;
    
    docId = doc_id;
    inputText = text;
    voice = voiceParam || 'af_heart';

    if (!doc_id || !paragraph_id || !text) {
      return NextResponse.json(
        { error: 'doc_id, paragraph_id, and text are required' },
        { status: 400 }
      );
    }

    const input = {
      op: 'synthesize_chunk',
      doc_id,
      paragraph_id,
      text,
      voice,
      sample_rate,
      rate: 1.0,
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
    const payload = (result && typeof result === 'object' && 'output' in result)
      ? (result as { output: unknown }).output as Record<string, unknown>
      : (result as Record<string, unknown>);

    if (!payload || (payload as { ok?: unknown }).ok !== true) {
      throw new Error(`Runpod error: ${(payload as { message?: string })?.message || 'Unknown error'}`);
    }

    // SUCCESS: Log to Logtail (non-blocking)
    void logSynthesize({
      source: 'api.synthesize',
      status: 'success',
      ip,
      docId,
      voice: voice || 'af_heart',
      charCount: inputText?.length || 0,
      textPreview: inputText || ''
    });

    return NextResponse.json({
      audio_base64: (payload as { audio_base64: string }).audio_base64,
      sample_rate: (payload as { sample_rate: number }).sample_rate,
      cleaned_text: (payload as { cleaned_text: string }).cleaned_text,
      timings: (payload as { timings: Array<{ word: string; start_ms: number; end_ms: number; char_start: number; char_end: number }> }).timings,
    });
    
  } catch (error) {
    // ERROR: Log to Logtail
    void logSynthesize({
      source: 'api.synthesize',
      status: 'error',
      ip,
      docId: docId || '',
      voice: voice || 'af_heart',
      charCount: inputText?.length || 0,
      textPreview: inputText || '',
      errorMessage: error instanceof Error ? error.message : 'Unknown error'
    });
    
    console.error('Synthesize chunk failed:', error);
    return NextResponse.json(
      { error: 'Synthesize chunk failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
```

---

### **Phase 6: Welcome Modal**

#### **Design Requirements - CRITICAL**
**The modal MUST match the existing website theme:**
- Background: `bg-neutral-900` (dark theme)
- Text: `text-neutral-200` (light gray)
- Borders: `border-white/10` (subtle)
- Buttons: Match existing button styles (emerald/sky accent colors)
- Typography: Use existing font families (Geist Sans)
- **NO fancy animations** - keep it simple and clean
- **NO bright colors** - stay monochrome with subtle accents
- **Minimalist design** - similar to existing modals/dialogs

#### **Step 6.1: Create WelcomeModal Component**
**File**: `frontend/src/components/WelcomeModal.tsx`

**Component Structure:**

```typescript
'use client';
import { useState, useEffect } from 'react';
import { Dialog, DialogContent } from './ui/dialog';
import { X, FileText, Upload, Play, Clock } from 'lucide-react';
import Image from 'next/image';

export function WelcomeModal() {
  const [open, setOpen] = useState(false);
  
  useEffect(() => {
    // Check localStorage AFTER hydration (client-side only)
    const hasSeenWelcome = localStorage.getItem('hasSeenWelcome');
    if (!hasSeenWelcome) {
      // Small delay to avoid flash
      setTimeout(() => setOpen(true), 500);
    }
  }, []);
  
  const handleClose = () => {
    localStorage.setItem('hasSeenWelcome', 'true');
    setOpen(false);
  };
  
  return (
    <Dialog open={open} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="max-w-2xl bg-neutral-900 border-white/10 text-neutral-200">
        {/* Close button */}
        <button
          onClick={handleClose}
          className="absolute right-4 top-4 rounded-sm opacity-70 hover:opacity-100"
        >
          <X className="h-4 w-4" />
        </button>
        
        {/* Content sections */}
        <div className="space-y-6 py-4">
          {/* Header */}
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-semibold">Welcome to ReadAloud</h2>
            <p className="text-neutral-400 text-sm">
              Transform text into natural speech with word-level highlighting
            </p>
          </div>
          
          {/* Features grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Feature 1: Text Input */}
            <FeatureCard
              icon={<FileText className="w-5 h-5" />}
              title="Paste Text"
              description="Type or paste any text directly into the editor"
              imagePath="/features/text-input.svg"
            />
            
            {/* Feature 2: PDF Upload */}
            <FeatureCard
              icon={<Upload className="w-5 h-5" />}
              title="Upload PDFs"
              description="Drop PDF documents for automatic text extraction"
              imagePath="/features/pdf-upload.svg"
            />
            
            {/* Feature 3: Playback */}
            <FeatureCard
              icon={<Play className="w-5 h-5" />}
              title="Real-time Highlighting"
              description="Follow along with synchronized word highlighting"
              imagePath="/features/playback.svg"
            />
            
            {/* Feature 4: History */}
            <FeatureCard
              icon={<Clock className="w-5 h-5" />}
              title="Session History"
              description="Resume from where you left off anytime"
              imagePath="/features/history.svg"
            />
          </div>
          
          {/* Privacy notice */}
          <div className="text-xs text-neutral-500 text-center border-t border-white/5 pt-4">
            Usage analytics are collected (IP address, input text) for service improvement.
          </div>
          
          {/* Get Started button */}
          <div className="flex justify-center">
            <button
              onClick={handleClose}
              className="px-6 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 rounded-md transition-colors"
            >
              Get Started
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Helper component for feature cards
function FeatureCard({ 
  icon, 
  title, 
  description, 
  imagePath 
}: { 
  icon: React.ReactNode; 
  title: string; 
  description: string; 
  imagePath: string;
}) {
  return (
    <div className="flex items-start gap-3 p-3 rounded-lg border border-white/5 bg-white/[0.02]">
      <div className="mt-1 text-neutral-400">{icon}</div>
      <div className="flex-1 space-y-1">
        <h3 className="font-medium text-sm">{title}</h3>
        <p className="text-xs text-neutral-500">{description}</p>
        {/* Placeholder for images - will be simple SVG icons */}
        <div className="mt-2 h-16 flex items-center justify-center opacity-40">
          <Image 
            src={imagePath} 
            alt={title} 
            width={80} 
            height={64}
            className="object-contain"
          />
        </div>
      </div>
    </div>
  );
}
```

**Key design choices:**
- Uses existing Dialog component from `@/components/ui/dialog`
- Matches neutral-900 background
- Simple card grid layout
- Lucide icons (already in project)
- Small privacy notice at bottom
- Single "Get Started" button (emerald theme)

---

#### **Step 6.2: Create Placeholder Feature Images**
**Directory**: `frontend/public/features/`

**Files to create:**
1. `text-input.svg` - Simple textarea icon
2. `pdf-upload.svg` - Document with up arrow
3. `playback.svg` - Waveform with play button
4. `history.svg` - Clock/history icon

**SVG Placeholder Style:**
- Monochrome (using `#525252` neutral-600)
- Simple geometric shapes
- 80x64px viewBox
- Transparent background

**Example placeholder (text-input.svg):**
```svg
<svg width="80" height="64" viewBox="0 0 80 64" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect x="10" y="12" width="60" height="40" rx="4" stroke="#525252" stroke-width="2" fill="none"/>
  <line x1="18" y1="22" x2="52" y2="22" stroke="#525252" stroke-width="2" stroke-linecap="round"/>
  <line x1="18" y1="32" x2="62" y2="32" stroke="#525252" stroke-width="2" stroke-linecap="round"/>
  <line x1="18" y1="42" x2="45" y2="42" stroke="#525252" stroke-width="2" stroke-linecap="round"/>
</svg>
```

**Note:** These are basic placeholders. User will provide actual images later if desired.

---

#### **Step 6.3: Integrate into Home Page**
**File**: `frontend/src/app/page.tsx`

**Changes:**
1. Import WelcomeModal at top
2. Add component to render tree

```typescript
// Add import at top
import { WelcomeModal } from '@/components/WelcomeModal';

// In the return statement, add before main content:
export default function Home() {
  // ... existing code ...
  
  return (
    <div className="min-h-screen bg-neutral-900 text-neutral-200">
      {/* ADD THIS */}
      <WelcomeModal />
      
      {/* Existing TopBar and content */}
      <TopBar ... />
      {/* rest of content */}
    </div>
  );
}
```

---

### **Phase 7: Privacy Notice (Optional Enhancement)**

Since the welcome modal already includes a privacy notice, this is **optional**.

**If you want a persistent footer banner:**

#### **Step 7.1: Create PrivacyBanner Component**
**File**: `frontend/src/components/PrivacyBanner.tsx`

```typescript
'use client';
import { useState, useEffect } from 'react';
import { X } from 'lucide-react';

export function PrivacyBanner() {
  const [visible, setVisible] = useState(false);
  
  useEffect(() => {
    const dismissed = localStorage.getItem('privacyBannerDismissed');
    if (!dismissed) {
      setVisible(true);
    }
  }, []);
  
  const handleDismiss = () => {
    localStorage.setItem('privacyBannerDismissed', 'true');
    setVisible(false);
  };
  
  if (!visible) return null;
  
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-neutral-800/95 backdrop-blur border-t border-white/10 p-3 z-50">
      <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
        <p className="text-xs text-neutral-400 flex-1">
          Usage analytics are collected (IP address, input text) to improve service quality.
        </p>
        <button
          onClick={handleDismiss}
          className="px-3 py-1 text-xs bg-white/10 hover:bg-white/20 rounded transition-colors"
        >
          Got it
        </button>
      </div>
    </div>
  );
}
```

**Note:** Since privacy notice is in welcome modal, this might be redundant. Decide if needed.

---

### **Phase 8: Testing Plan**

#### **Test 8.1: Logtail Integration**
1. Deploy preview or use existing deployment
2. Trigger a prepare-document request with sample text
3. Open Logtail dashboard → Live Tail
4. Verify structured JSON row appears with fields: source, status, ip, docId, inputType, charCount, textPreview, truncated
5. Trigger a synthesize-chunk request and verify similar row with voice field
6. Test error case (empty text) and confirm status:error row appears

#### **Test 8.2: Truncation Behavior**
1. Send a long text (>500 chars) to prepare endpoint
2. In Logtail, confirm textPreview is truncated and truncated: true
3. Send short text (≤500 chars) and confirm truncated: false

---

### **Phase 9: Environment Variables**

#### **Required Environment Variables**

**Existing (already configured):**
- `RUNPOD_ENDPOINT` - Your RunPod serverless endpoint
- `RUNPOD_API_KEY` - RunPod API key

**No new manual env vars needed** - Logtail integration handles credentials automatically.

#### **Verify Integration**

**In Vercel Dashboard:**
1. Go to project Settings → Integrations
2. Confirm Logtail by Better Stack is listed and connected
3. Click through to Logtail workspace to ensure access

**Local development:**
- No additional setup; console logs will stream to Logtail only on Vercel deployments

---

### **Phase 10: Documentation**

#### **Update README.md**

Add new section after existing content:

````markdown
### Logging & Analytics

API requests are logged to Better Stack Logtail via console streaming:

**What's logged:**
- IP address and optional location (country/city)
- Input text preview (truncated if >500 chars)
- Character count and truncation flag
- Endpoint called (prepare/synthesize)
- Voice selection (synthesize only)
- Success/failure status

**Viewing logs:**
- Open your Logtail workspace (linked from Vercel integrations)
- Use Live Tail for real-time viewing
- Create saved filters: `source:api.prepare`, `source:api.synthesize`, `status:error`
- Export logs if needed (Logtail supports CSV/JSON export)

**To disable logging:**
Comment out `logPrepare()` and `logSynthesize()` calls in:
- `frontend/src/app/api/prepare-document/route.ts`
- `frontend/src/app/api/synthesize-chunk/route.ts`
````

---

## **Implementation Order (Priority)**

Execute in this sequence:

1. ✅ **Phase 1** - Logtail integration (5 min)
2. ✅ **Phase 4** - IP extraction utility (5 min)
3. ✅ **Phase 3** - Logging helper (10 min)
4. ✅ **Phase 5** - Update API routes (20 min) **← MOST CRITICAL**
5. ✅ **Phase 2** - Location lookup (10 min, optional)
6. ✅ **Phase 6** - Welcome modal (30 min)
7. ✅ **Phase 8** - Testing (15 min)
8. ✅ **Phase 10** - Documentation (10 min)

**Total time estimate:** 1.5-2 hours for full implementation

## **Key Implementation Notes**

### **AbortSignal Timeout Polyfill Explanation**
A "polyfill" provides modern functionality to older browsers that don't natively support it. The `createTimeoutSignal()` function:
1. Checks if native `AbortSignal.timeout()` exists
2. Uses it if available
3. Falls back to manual `setTimeout` + `AbortController` for older browsers
This ensures timeout functionality works across all browsers without complexity.

### **Logging Scope - API Endpoints Only**
**CRITICAL**: Logging is intentionally limited to API endpoints only:
- **DO NOT** integrate with session lifecycle
- **DO NOT** log session creation, updates, or completion
- **ONLY** log API requests to understand usage patterns
- Keep logging completely separate from existing session management

### **Welcome Modal Placement**
Welcome modal should only be added to `src/app/page.tsx` (home page), not layout component:
- One-time onboarding experience
- Sets localStorage flag for "hasSeenWelcome"
- No need to appear on all pages

---

## **Risk Mitigation**

### **Potential Issues & Solutions**

1. **Logging failures crash app**
   - ✅ Solution: All logging calls wrapped in try-catch
   - ✅ Uses `void` to avoid awaiting (non-blocking)

2. **Location lookup timeout blocks requests**
   - ✅ Solution: 3-second timeout with polyfill for browser compatibility
   - ✅ Silent failure returns empty object

3. **Logtail integration issues**
   - ✅ Solution: Errors logged to console, app continues
   - ✅ User requests not affected

4. **Privacy concerns**
   - ✅ Solution: Clear notice in welcome modal
   - ✅ Transparent about what's logged
   - ✅ Text previews truncated to reduce PII exposure

5. **Ingestion limits exceeded**
   - ✅ Solution: Free tier 1 GB/month sufficient for personal project
   - ✅ 1000 requests/day geolocation limit sufficient for personal use

6. **Welcome modal SSR hydration mismatch**
   - ✅ Solution: Modal uses `useEffect` (client-only)
   - ✅ Small delay before showing to avoid flash

7. **Browser compatibility for AbortSignal.timeout**
   - ✅ Solution: Polyfill provided for broader browser support
   - ✅ Graceful fallback to manual timeout implementation

---

## **Success Criteria**

**The implementation is successful when:**

✅ Logtail integration added and streaming logs
✅ API routes emit structured JSON without errors
✅ IP addresses captured correctly (not localhost on Vercel)
✅ Location data populated (country/city) when available
✅ Text previews truncated correctly
✅ Welcome modal shows on first visit only
✅ Modal dismisses and sets localStorage
✅ No console errors
✅ App functionality unchanged (logging is transparent)

---

## **Post-Implementation: Monitoring**

**Weekly checks:**
1. Open Logtail dashboard → check recent logs
2. Filter for `status:error` to review failures
3. Monitor top countries via location fields

**Monthly cleanup (optional):**
- Logtail automatically enforces retention based on plan tier

---

## **Notes for Implementation**

- **Work incrementally**: Test each phase before moving to next
- **Use Vercel preview deployments**: Test on real URLs, not localhost
- **Check Logtail dashboard**: Look for structured rows appearing
- **Test modal**: Clear localStorage between tests

---

## **File Checklist**

**New files to create:**
- [ ] `frontend/src/lib/logger.ts`
- [ ] `frontend/src/lib/getClientIp.ts`
- [ ] `frontend/src/lib/geolocation.ts`
- [ ] `frontend/src/components/WelcomeModal.tsx`
- [ ] `frontend/public/features/text-input.svg`
- [ ] `frontend/public/features/pdf-upload.svg`
- [ ] `frontend/public/features/playback.svg`
- [ ] `frontend/public/features/history.svg`

**Files to modify:**
- [ ] `frontend/src/app/api/prepare-document/route.ts`
- [ ] `frontend/src/app/api/synthesize-chunk/route.ts`
- [ ] `frontend/src/app/page.tsx`
- [ ] `README.md`

**Dependencies to install:**
- None (Logtail requires no additional packages)

---

**END OF IMPLEMENTATION PLAN**