"use client";
import React from 'react';
import { useAppStore } from '../state/store';
import { saveSession, getAllSessions, deleteSession, getSession, updateSession } from './sessionDb';
import type { SessionRecord } from './sessionTypes';
import { makeSessionTitleFromChunks } from './sessionTypes';

export function useSessionHistory() {
  const store = useAppStore();
  const [sessions, setSessions] = React.useState<SessionRecord[]>([]);

  const refresh = React.useCallback(async () => {
    try {
      const all = await getAllSessions();
      all.sort((a, b) => b.createdAt - a.createdAt);
      setSessions(all);
    } catch (e) {
      console.error('Failed to refresh sessions:', e);
    }
  }, []);

  React.useEffect(() => { void refresh(); }, [refresh]);

  const saveCurrent = React.useCallback(async (status: SessionRecord['status'], voice?: string) => {
    const now = Date.now();
    const id = (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : `${now}-${Math.random().toString(36).slice(2)}`;
    const chunks = store.chunks;
    const rec: SessionRecord = {
      id,
      title: makeSessionTitleFromChunks(chunks),
      createdAt: now,
      completedAt: status !== 'in_progress' ? now : undefined,
      status,
      hasBeenCompleted: status === 'completed',
      docId: store.docId || id,
      chunks,
      currentIndex: store.currentIndex,
      currentElapsedSec: store.currentElapsedSec,
      speed: store.speed,
      autoplayEnabled: store.autoplayEnabled,
      paragraphCount: chunks.length,
      voice,
    };
    await saveSession(rec);
    await refresh();
    return rec.id;
  }, [store, refresh]);

  const loadSession = React.useCallback(async (id: string) => {
    const rec = await getSession(id);
    return rec;
  }, []);

  const updateCurrentSession = React.useCallback(async (updates: Partial<SessionRecord>) => {
    if (!store.currentSessionId) return;
    await updateSession(store.currentSessionId, updates);
    await refresh();
  }, [store.currentSessionId, refresh]);

  const remove = React.useCallback(async (id: string) => {
    await deleteSession(id);
    await refresh();
  }, [refresh]);

  return { sessions, refresh, saveCurrent, loadSession, remove, updateCurrentSession };
}


