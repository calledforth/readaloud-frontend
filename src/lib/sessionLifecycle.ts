import { useAppStore } from '../state/store';
import { saveSession, getSession, getSessionByDocId, updateSession, deleteSession, getAllSessions } from './sessionDb';
import type { SessionRecord, Chunk } from './sessionTypes';

// Structured logging utility
function logSessionEvent(event: string, data: unknown, level: 'info' | 'warn' | 'error' = 'info') {
  const prefix = `[SessionLifecycle:${level.toUpperCase()}]`;
  
  switch (level) {
    case 'info':
      console.log(prefix, event, data);
      break;
    case 'warn':
      console.warn(prefix, event, data);
      break;
    case 'error':
      console.error(prefix, event, data);
      break;
  }
}

class SessionLifecycleService {
  private static instance: SessionLifecycleService;
  private activeSessionId: string | null = null;
  private isCreatingSession = false;
  
  private constructor() {}
  
  static getInstance(): SessionLifecycleService {
    if (!SessionLifecycleService.instance) {
      SessionLifecycleService.instance = new SessionLifecycleService();
    }
    return SessionLifecycleService.instance;
  }
  
  /**
   * Start a new session or resume an existing one by docId
   * This is the single entrypoint for session creation/resumption
   */
  async startSession(docId: string, chunks: Chunk[], voice?: string): Promise<string> {
    // Prevent concurrent session creation
    if (this.isCreatingSession) {
      logSessionEvent('session_creation_in_progress', { docId }, 'warn');
      throw new Error('Session creation already in progress');
    }
    
    this.isCreatingSession = true;
    
    try {
      logSessionEvent('start_session_initiated', { docId, chunkCount: chunks.length, voice });
      
      // Check if session with this docId already exists
      const existingSession = await getSessionByDocId(docId);
      
      if (existingSession) {
        logSessionEvent('resuming_existing_session', { 
          sessionId: existingSession.id, 
          docId, 
          status: existingSession.status 
        });
        
        // Update the existing session with new data
        await updateSession(existingSession.id, {
          chunks,
          voice,
          status: 'in_progress',
        });
        
        this.activeSessionId = existingSession.id;
        useAppStore.getState().setCurrentSessionId(existingSession.id);
        
        return existingSession.id;
      }
      
      // Create new session
      const now = Date.now();
      const sessionId = (typeof crypto !== 'undefined' && crypto.randomUUID) 
        ? crypto.randomUUID() 
        : `${now}-${Math.random().toString(36).slice(2)}`;
      
      const newSession: SessionRecord = {
        id: sessionId,
        title: this.generateSessionTitle(chunks),
        createdAt: now,
        status: 'in_progress',
        hasBeenCompleted: false,
        docId,
        chunks,
        currentIndex: 0,
        currentElapsedSec: 0,
        speed: 1.0,
        autoplayEnabled: true,
        paragraphCount: chunks.length,
        voice,
      };
      
      await saveSession(newSession);
      
      logSessionEvent('new_session_created', { sessionId, docId });
      
      this.activeSessionId = sessionId;
      useAppStore.getState().setCurrentSessionId(sessionId);
      
      return sessionId;
    } catch (error) {
      logSessionEvent('start_session_failed', { docId, error }, 'error');
      throw error;
    } finally {
      this.isCreatingSession = false;
    }
  }
  
  /**
   * Resume an existing session by ID
   */
  async resumeSession(sessionId: string): Promise<SessionRecord | null> {
    try {
      logSessionEvent('resume_session_initiated', { sessionId });
      
      const session = await getSession(sessionId);
      if (!session) {
        logSessionEvent('session_not_found', { sessionId }, 'warn');
        return null;
      }
      
      logSessionEvent('resuming_session', { sessionId, docId: session.docId });
      
      // Update session status to in_progress
      await updateSession(sessionId, { status: 'in_progress' });
      
      this.activeSessionId = sessionId;
      useAppStore.getState().setCurrentSessionId(sessionId);
      
      return session;
    } catch (error) {
      logSessionEvent('resume_session_failed', { sessionId, error }, 'error');
      throw error;
    }
  }
  
  /**
   * Cancel the current active session
   */
  async cancelActiveSession(): Promise<void> {
    if (!this.activeSessionId) {
      logSessionEvent('no_active_session_to_cancel', {}, 'warn');
      return;
    }
    
    try {
      logSessionEvent('cancelling_session', { sessionId: this.activeSessionId });
      
      await updateSession(this.activeSessionId, { 
        status: 'cancelled',
        currentElapsedSec: useAppStore.getState().currentElapsedSec,
        currentIndex: useAppStore.getState().currentIndex,
      });
      
      useAppStore.getState().setSessionStatus('cancelled');
      
      logSessionEvent('session_cancelled', { sessionId: this.activeSessionId });
    } catch (error) {
      logSessionEvent('cancel_session_failed', { sessionId: this.activeSessionId, error }, 'error');
      throw error;
    }
  }
  
  /**
   * Complete the current active session
   */
  async completeActiveSession(): Promise<void> {
    if (!this.activeSessionId) {
      logSessionEvent('no_active_session_to_complete', {}, 'warn');
      return;
    }
    
    try {
      logSessionEvent('completing_session', { sessionId: this.activeSessionId });
      
      await updateSession(this.activeSessionId, { 
        status: 'completed',
        hasBeenCompleted: true,
        completedAt: Date.now(),
      });
      
      useAppStore.getState().setSessionStatus('completed');
      
      logSessionEvent('session_completed', { sessionId: this.activeSessionId });
    } catch (error) {
      logSessionEvent('complete_session_failed', { sessionId: this.activeSessionId, error }, 'error');
      throw error;
    }
  }
  
  /**
   * Update the current active session with new data
   */
  async updateActiveSession(updates: Partial<SessionRecord>): Promise<void> {
    if (!this.activeSessionId) {
      logSessionEvent('no_active_session_to_update', {}, 'warn');
      return;
    }
    
    try {
      await updateSession(this.activeSessionId, updates);
      logSessionEvent('session_updated', { sessionId: this.activeSessionId, updateKeys: Object.keys(updates) });
    } catch (error) {
      logSessionEvent('update_session_failed', { sessionId: this.activeSessionId, error }, 'error');
      throw error;
    }
  }
  
  /**
   * Get all sessions
   */
  async getAllSessions(): Promise<SessionRecord[]> {
    try {
      const sessions = await getAllSessions();
      logSessionEvent('sessions_retrieved', { count: sessions.length });
      return sessions;
    } catch (error) {
      logSessionEvent('get_sessions_failed', { error }, 'error');
      throw error;
    }
  }
  
  /**
   * Delete a session
   */
  async deleteSession(sessionId: string): Promise<void> {
    try {
      await deleteSession(sessionId);
      logSessionEvent('session_deleted', { sessionId });
      
      if (this.activeSessionId === sessionId) {
        this.activeSessionId = null;
        useAppStore.getState().setCurrentSessionId(undefined);
      }
    } catch (error) {
      logSessionEvent('delete_session_failed', { sessionId, error }, 'error');
      throw error;
    }
  }
  
  /**
   * Get the current active session ID
   */
  getActiveSessionId(): string | null {
    return this.activeSessionId;
  }
  
  /**
   * Set the current active session ID
   */
  setActiveSessionId(sessionId: string | null): void {
    this.activeSessionId = sessionId;
    useAppStore.getState().setCurrentSessionId(sessionId || undefined);
    logSessionEvent('active_session_set', { sessionId });
  }
  
  /**
   * Generate a title from chunks
   */
  private generateSessionTitle(chunks: Chunk[]): string {
    if (chunks.length === 0) return 'Empty Session';
    
    const firstChunk = chunks[0];
    const text = firstChunk.text || '';
    
    // Take first 50 characters and add ellipsis if needed
    const title = text.length > 50 
      ? text.substring(0, 50) + '...' 
      : text;
    
    return title || 'Untitled Session';
  }
}

// Export singleton instance
export const sessionLifecycle = SessionLifecycleService.getInstance();

// Export types
export type { SessionRecord };