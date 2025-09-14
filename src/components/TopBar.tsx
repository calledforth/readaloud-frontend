import React from 'react';
import { HeroLogo } from './HeroLogo';

export function TopBar({ right, onHome }: { right?: React.ReactNode; onHome?: () => void }) {
  return (
    <div className="auto-hide-chrome fixed top-0 left-0 right-0 z-40 bg-transparent">
      <div className="w-full px-2 min-h-12 h-12 flex items-center justify-between">
        <button onClick={onHome} className="scale-[0.36] origin-left ml-2 translate-y-[10px] cursor-pointer hover:opacity-90" aria-label="Home">
          <HeroLogo />
        </button>
        <div className="pr-2 flex items-center gap-3">{right}</div>
      </div>
    </div>
  );
}


