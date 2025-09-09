"use client";
import React from 'react';

export function CollapsingIconButton({
  icon,
  label,
  onClick,
  className = '',
  disabled,
}: {
  icon: React.ReactNode;
  label: string;
  onClick?: () => void;
  className?: string;
  disabled?: boolean;
}) {
  const [collapsed, setCollapsed] = React.useState(true);
  // Collapse after initial paint more slowly
  React.useEffect(() => {
    const t = setTimeout(() => setCollapsed(true), 2000);
    setCollapsed(false); // start expanded briefly
    return () => clearTimeout(t);
  }, []);
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      onMouseEnter={() => setCollapsed(false)}
      onMouseLeave={() => setCollapsed(true)}
      className={`group inline-flex items-center gap-2 rounded-full bg-black/90 text-neutral-100 border border-white/15 transition-all duration-400 ease-out will-change-[width,opacity] shadow-sm ${
        collapsed ? 'px-3' : 'pl-3 pr-4'
      } h-10 ${className}`}
      aria-label={label}
      title={label}
    >
      <span className="grid place-items-center text-neutral-200 w-5 h-5">{icon}</span>
      <span className={`text-sm transition-[max-width,opacity] duration-400 ease-out overflow-hidden ${collapsed ? 'max-w-0 opacity-0' : 'max-w-[200px] opacity-100'}`}>
        {label}
      </span>
    </button>
  );
}



