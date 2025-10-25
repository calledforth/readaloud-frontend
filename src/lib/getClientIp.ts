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