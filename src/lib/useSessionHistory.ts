"use client";
import React from 'react';
import { useAppStore } from '../state/store';
import { sessionLifecycle } from './sessionLifecycle';
import type { SessionRecord, Chunk } from './sessionTypes';

export function useSessionHistory() {
  const store = useAppStore();
  const [sessions, setSessions] = React.useState<SessionRecord[]>([]);

  const refresh = React.useCallback(async () => {
    try {
      const all = await sessionLifecycle.getAllSessions();
      all.sort((a, b) => b.createdAt - a.createdAt);
      setSessions(all);
    } catch (e) {
      console.error('Failed to refresh sessions:', e);
    }
  }, []);

  React.useEffect(() => { void refresh(); }, [refresh]);

  // Start a new session or resume an existing one
  const startSession = React.useCallback(async (docId: string, chunks: Chunk[], voice?: string) => {
    try {
      const sessionId = await sessionLifecycle.startSession(docId, chunks, voice);
      await refresh();
      return sessionId;
    } catch (e) {
      console.error('Failed to start session:', e);
      throw e;
    }
  }, [refresh]);

  // Resume an existing session by ID
  const resumeSession = React.useCallback(async (id: string) => {
    try {
      const session = await sessionLifecycle.resumeSession(id);
      await refresh();
      return session;
    } catch (e) {
      console.error('Failed to resume session:', e);
      throw e;
    }
  }, [refresh]);

  // Load session data without changing its status
  const loadSession = React.useCallback(async (id: string) => {
    try {
      const sessions = await sessionLifecycle.getAllSessions();
      return sessions.find(s => s.id === id) || null;
    } catch (e) {
      console.error('Failed to load session:', e);
      return null;
    }
  }, []);

  // Update the current active session
  const updateCurrentSession = React.useCallback(async (updates: Partial<SessionRecord>) => {
    try {
      await sessionLifecycle.updateActiveSession(updates);
      await refresh();
    } catch (e) {
      console.error('Failed to update current session:', e);
      throw e;
    }
  }, [refresh]);

  // Cancel the current active session
  const cancelCurrentSession = React.useCallback(async () => {
    try {
      await sessionLifecycle.cancelActiveSession();
      await refresh();
    } catch (e) {
      console.error('Failed to cancel current session:', e);
      throw e;
    }
  }, [refresh]);

  // Complete the current active session
  const completeCurrentSession = React.useCallback(async () => {
    try {
      await sessionLifecycle.completeActiveSession();
      await refresh();
    } catch (e) {
      console.error('Failed to complete current session:', e);
      throw e;
    }
  }, [refresh]);

  // Delete a session
  const remove = React.useCallback(async (id: string) => {
    try {
      await sessionLifecycle.deleteSession(id);
      await refresh();
    } catch (e) {
      console.error('Failed to delete session:', e);
      throw e;
    }
  }, [refresh]);

  // Get the current active session ID
  const getActiveSessionId = React.useCallback(() => {
    return sessionLifecycle.getActiveSessionId();
  }, []);

  // Set the current active session ID
  const setActiveSessionId = React.useCallback((sessionId: string | null) => {
    sessionLifecycle.setActiveSessionId(sessionId);
  }, []);

  // Legacy method for backward compatibility
  const saveCurrent = React.useCallback(async (status: SessionRecord['status'], voice?: string) => {
    const docId = store.docId;
    if (!docId) {
      throw new Error('No docId available for session creation');
    }
    
    try {
      const sessionId = await sessionLifecycle.startSession(docId, store.chunks, voice);
      
      // Update status if needed
      if (status !== 'in_progress') {
        if (status === 'completed') {
          await sessionLifecycle.completeActiveSession();
        } else if (status === 'cancelled') {
          await sessionLifecycle.cancelActiveSession();
        }
      }
      
      await refresh();
      return sessionId;
    } catch (e) {
      console.error('Failed to save current session:', e);
      throw e;
    }
  }, [store, refresh]);

  return {
    sessions,
    refresh,
    startSession,
    resumeSession,
    loadSession,
    remove,
    updateCurrentSession,
    cancelCurrentSession,
    completeCurrentSession,
    getActiveSessionId,
    setActiveSessionId,
    saveCurrent // Legacy method
  };
}


