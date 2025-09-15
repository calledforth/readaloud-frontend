"use client";
import React from 'react';
import { useAppStore } from '../state/store';

export function AutoHideChrome({ inactivityMs = 1500 }: { inactivityMs?: number }) {
  const { isPlaying } = useAppStore();
  const timerRef = React.useRef<number | null>(null);
  const hiddenRef = React.useRef(false);
  const hoveringRef = React.useRef(false);

  const setHidden = (hidden: boolean) => {
    hiddenRef.current = hidden;
    try {
      document.documentElement.setAttribute('data-chrome-hidden', hidden ? 'true' : 'false');
    } catch {}
  };

  const scheduleHide = () => {
    if (timerRef.current) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => {
      if (isPlaying && !hoveringRef.current) setHidden(true);
    }, inactivityMs);
  };

  React.useEffect(() => {
    if (!isPlaying) {
      setHidden(false);
      if (timerRef.current) window.clearTimeout(timerRef.current);
      timerRef.current = null;
      return;
    }
    // when playing, start visible then auto-hide
    setHidden(false);
    scheduleHide();
    const onActivity = () => {
      setHidden(false);
      scheduleHide();
    };
    const opts = { passive: true } as AddEventListenerOptions;
    window.addEventListener('mousemove', onActivity, opts);
    window.addEventListener('pointermove', onActivity, opts);
    window.addEventListener('wheel', onActivity, opts as any);
    window.addEventListener('touchstart', onActivity, opts);
    window.addEventListener('touchmove', onActivity, opts);
    window.addEventListener('keydown', onActivity);
    // Pause auto-hide when hovering chrome components
    const attachHoverListeners = () => {
      const els = document.querySelectorAll('.auto-hide-chrome');
      els.forEach((el) => {
        el.addEventListener('pointerenter', onEnter, { passive: true } as any);
        el.addEventListener('pointerleave', onLeave, { passive: true } as any);
      });
      return () => {
        els.forEach((el) => {
          el.removeEventListener('pointerenter', onEnter as any);
          el.removeEventListener('pointerleave', onLeave as any);
        });
      };
    };
    const onEnter = () => { hoveringRef.current = true; setHidden(false); if (timerRef.current) window.clearTimeout(timerRef.current); };
    const onLeave = () => { hoveringRef.current = false; scheduleHide(); };
    const detach = attachHoverListeners();

    return () => {
      window.removeEventListener('mousemove', onActivity);
      window.removeEventListener('pointermove', onActivity);
      window.removeEventListener('wheel', onActivity as any);
      window.removeEventListener('touchstart', onActivity);
      window.removeEventListener('touchmove', onActivity);
      window.removeEventListener('keydown', onActivity);
      detach?.();
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, [isPlaying, inactivityMs]);

  return null;
}


