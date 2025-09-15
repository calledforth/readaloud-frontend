"use client";
import React from 'react';

export function HeroLogo() {
  const [tick, setTick] = React.useState(0);
  return (
    <div
      className="select-none cursor-pointer"
      onMouseEnter={() => setTick((t) => t + 1)}
      aria-label="ReadAloud logo"
      role="img"
    >
      <div className="text-center leading-[0.9]">
        <div className="text-[56px] font-[900] tracking-tight">Read</div>
        <div className="text-[56px] font-[900] tracking-tight">Aloud</div>
      </div>
      <div className="mt-3 flex justify-center">
        <svg
          className="w-[220px] h-[32px] text-neutral-300"
          viewBox="0 0 220 32"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            key={tick}
            d="M2 16 C14 8, 22 24, 34 16 S58 8, 70 16 82 24, 94 16 106 8, 118 16 130 24, 142 16 154 8, 166 16 178 24, 190 16 202 8, 214 16"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            className="[stroke-dasharray:400] [stroke-dashoffset:400] motion-reduce:[stroke-dashoffset:0] animate-[dash_1.8s_ease-out_forwards]"
          />
          <style jsx>{`
            @keyframes dash { to { stroke-dashoffset: 0; } }
          `}</style>
        </svg>
      </div>
    </div>
  );
}



