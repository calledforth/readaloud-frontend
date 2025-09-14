"use client";
import React from 'react';
import { health } from '../lib/provider';

type Status = 'checking' | 'checking_runpod' | 'connected' | 'error';

export function ConnectionStatus() {
  const [status, setStatus] = React.useState<Status>('checking');
  const [version, setVersion] = React.useState<string>('');

  React.useEffect(() => {
    let alive = true;
    const run = async () => {
      setStatus('checking');
      try {
        await new Promise((r) => setTimeout(r, 400));
        setStatus('checking_runpod');
        await new Promise((r) => setTimeout(r, 600));
        const resp = await health();
        if (!alive) return;
        setVersion(resp.version);
        setStatus('connected');
      } catch {
        if (!alive) return;
        setStatus('error');
      }
    };
    void run();
    const t = setInterval(run, 30000);
    return () => { alive = false; clearInterval(t); };
  }, []);

  return (
    <div className="inline-flex items-center gap-2 text-xs text-neutral-400">
      <Flower state={status} />
      <span className="tabular-nums">
        {status === 'checking' && 'Checking…'}
        {status === 'checking_runpod' && 'Checking runpod…'}
        {status === 'connected' && `Connected · v${version}`}
        {status === 'error' && 'Error'}
      </span>
    </div>
  );
}

function Flower({ state }: { state: Status }) {
  const color = state === 'connected' ? '#22C55E' /* parrot/emerald */ : 
                state === 'checking_runpod' ? '#A855F7' /* purple */ : 
                state === 'checking' ? '#A3E635' : '#F87171';
  const animate = state === 'connected' ? 'animate-[spin_5s_linear_infinite]' : 
                  state === 'checking_runpod' ? 'animate-[spin_2.5s_linear_infinite]' :
                  state === 'checking' ? 'animate-[spin_2.5s_linear_infinite]' : '';
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" className={animate} aria-hidden>
      <g fill={color} fillOpacity="0.9">
        <circle cx="12" cy="6" r="2" />
        <circle cx="12" cy="18" r="2" />
        <circle cx="6" cy="12" r="2" />
        <circle cx="18" cy="12" r="2" />
        <circle cx="16.5" cy="7.5" r="1.6" />
        <circle cx="7.5" cy="16.5" r="1.6" />
        <circle cx="7.5" cy="7.5" r="1.6" />
        <circle cx="16.5" cy="16.5" r="1.6" />
        <circle cx="12" cy="12" r="1.4" fill="#065F46" />
      </g>
    </svg>
  );
}



