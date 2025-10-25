import { SessionRecord } from './sessionTypes';

const DB_NAME = 'readaloud_sessions';
const DB_VERSION = 2;
const STORE = 'sessions';

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      const oldVersion = event.oldVersion;
      
      console.log(`[SessionDB] Upgrading from version ${oldVersion} to ${DB_VERSION}`);
      
      // Create store if it doesn't exist (version 1)
      if (!db.objectStoreNames.contains(STORE)) {
        console.log('[SessionDB] Creating sessions store');
        const store = db.createObjectStore(STORE, { keyPath: 'id' });
        store.createIndex('createdAt', 'createdAt');
        store.createIndex('status', 'status');
      }
      
      // Version 2: Add unique docId index
      if (oldVersion < 2) {
        console.log('[SessionDB] Adding unique docId index (v2 migration)');
        const store = req.transaction!.objectStore(STORE);
        
        // Check if docId index already exists
        if (!store.indexNames.contains('docId')) {
          store.createIndex('docId', 'docId', { unique: true });
          console.log('[SessionDB] Created unique docId index');
        }
      }
    };
    req.onsuccess = () => {
      console.log(`[SessionDB] Opened successfully at version ${DB_VERSION}`);
      resolve(req.result);
    };
    req.onerror = () => {
      console.error('[SessionDB] Failed to open:', req.error);
      reject(req.error);
    };
  });
}

export async function saveSession(session: SessionRecord): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.oncomplete = () => {
      console.log(`[SessionDB] Saved session ${session.id} with docId ${session.docId}`);
      resolve();
    };
    tx.onerror = () => {
      console.error(`[SessionDB] Failed to save session ${session.id}:`, tx.error);
      reject(tx.error);
    };
    const store = tx.objectStore(STORE);
    
    // Check if session with same docId already exists
    if (session.docId) {
      const getIndex = store.index('docId');
      const getRequest = getIndex.get(session.docId);
      
      getRequest.onsuccess = () => {
        const existingSession = getRequest.result;
        if (existingSession) {
          // Update existing session with same docId
          console.log(`[SessionDB] Updating existing session ${existingSession.id} with new data`);
          const updatedSession = { ...session, id: existingSession.id };
          store.put(updatedSession);
        } else {
          // Create new session
          console.log(`[SessionDB] Creating new session ${session.id}`);
          store.put(session);
        }
      };
      
      getRequest.onerror = () => {
        console.error(`[SessionDB] Failed to check for existing session with docId ${session.docId}:`, getRequest.error);
        reject(getRequest.error);
      };
    } else {
      // No docId, just save as new
      store.put(session);
    }
  });
}

export async function getAllSessions(): Promise<SessionRecord[]> {
  const db = await openDb();
  return await new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly');
    const req = tx.objectStore(STORE).getAll();
    req.onsuccess = () => resolve(req.result as SessionRecord[]);
    req.onerror = () => reject(req.error);
  });
}

export async function getSession(id: string): Promise<SessionRecord | null> {
  const db = await openDb();
  return await new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly');
    const req = tx.objectStore(STORE).get(id);
    req.onsuccess = () => resolve((req.result as SessionRecord) || null);
    req.onerror = () => reject(req.error);
  });
}

export async function updateSession(id: string, updates: Partial<SessionRecord>): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    const store = tx.objectStore(STORE);
    const req = store.get(id);
    req.onsuccess = () => {
      const existing = req.result as SessionRecord;
      if (existing) {
        const updated = { ...existing, ...updates };
        store.put(updated);
        console.log(`[SessionDB] Updated session ${id}`);
      } else {
        console.warn(`[SessionDB] Session ${id} not found for update`);
      }
    };
    req.onerror = () => {
      console.error(`[SessionDB] Failed to get session ${id} for update:`, req.error);
      reject(req.error);
    };
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getSessionByDocId(docId: string): Promise<SessionRecord | null> {
  const db = await openDb();
  return await new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly');
    const store = tx.objectStore(STORE);
    const index = store.index('docId');
    const req = index.get(docId);
    req.onsuccess = () => {
      const result = req.result as SessionRecord;
      if (result) {
        console.log(`[SessionDB] Found session ${result.id} by docId ${docId}`);
      } else {
        console.log(`[SessionDB] No session found with docId ${docId}`);
      }
      resolve(result || null);
    };
    req.onerror = () => {
      console.error(`[SessionDB] Failed to get session by docId ${docId}:`, req.error);
      reject(req.error);
    };
  });
}

export async function deleteSession(id: string): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.objectStore(STORE).delete(id);
  });
}


