"use client";
import React from 'react';
import { useSessionHistory } from '../lib/useSessionHistory';
import { Play, Trash2, ChevronDown, ChevronUp, Loader2 } from 'lucide-react';
import { useAppStore } from '../state/store';
import type { SessionRecord } from '../lib/sessionTypes';

export function SessionHistory({ sessions, onResume }: { sessions: SessionRecord[], onResume: (id: string) => void }) {
  const { remove } = useSessionHistory();
  const { historyExpanded, setHistoryExpanded } = useAppStore();
  const [deleteModal, setDeleteModal] = React.useState<{ isOpen: boolean; sessionId: string; sessionTitle: string }>({
    isOpen: false,
    sessionId: '',
    sessionTitle: ''
  });

  return (
    <div className="mt-8">
      <div className="flex flex-col items-center gap-1 mb-2">
        <h3 className="text-sm text-neutral-400">Session history</h3>
        <button
          onClick={() => setHistoryExpanded(!historyExpanded)}
          className="hover:brightness-125 transition-all"
          aria-label={historyExpanded ? "Collapse history" : "Expand history"}
        >
          {historyExpanded ? (
            <ChevronUp className="w-6 h-6 text-neutral-400" />
          ) : (
            <ChevronDown className="w-6 h-6 text-neutral-400" />
          )}
        </button>
      </div>
      
      {historyExpanded && (
        <div className="max-h-64 overflow-y-auto pr-1">
          {(!sessions || sessions.length === 0) ? (
            <div className="text-center py-4 text-neutral-500 text-sm">
              No saved sessions yet. Complete or cancel a session to see it here.
            </div>
          ) : (
            sessions.map((s, index) => {
              const isInProgress = s.status === 'in_progress';
              const hasAllAudio = s.chunks.every(c => c.audioBase64);
              const isLoading = isInProgress && !hasAllAudio;
              
              return (
                <div key={s.id}>
                  <div className="flex items-center justify-between gap-3 px-3 py-3">
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2">
                        <span className="text-neutral-100 text-sm">{s.title}</span>
                        {isLoading && (
                          <Loader2 className="w-3 h-3 text-cyan-400 animate-spin" />
                        )}
                      </div>
                      <span className="text-neutral-500 text-xs">
                        {new Date(s.createdAt).toLocaleString()} • {s.paragraphCount} para • {s.status}
                        {isLoading && ` • ${s.chunks.filter(c => c.audioBase64).length}/${s.chunks.length} ready`}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => onResume(s.id)} 
                        className="p-2 rounded-md border border-white/10 text-white hover:brightness-125 transition-all"
                        aria-label="Resume session"
                      >
                        <Play className="w-3 h-3" />
                      </button>
                      <button 
                        onClick={() => setDeleteModal({ isOpen: true, sessionId: s.id, sessionTitle: s.title })} 
                        className="p-2 rounded-md border border-white/10 text-red-300 hover:brightness-125 transition-all"
                        aria-label="Delete session"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                  {index < sessions.length - 1 && <div className="border-b border-white/10 mx-3" />}
                </div>
              );
            })
          )}
        </div>
      )}
      
      {/* Custom Delete Confirmation Modal */}
      {deleteModal.isOpen && (
        <div className="fixed inset-0 flex items-center justify-center z-50">
          <div className="bg-neutral-850 rounded-lg p-6 max-w-md mx-4 border border-white/10">
            <h3 className="text-xl font-semibold text-white mb-3">Delete Session</h3>
            <p className="text-neutral-300 mb-6 leading-relaxed">
              Are you sure you want to delete this session?
            </p>
            <div className="bg-neutral-800 rounded-md p-3 mb-6">
              <p className="text-sm text-neutral-400 font-mono truncate">
                &ldquo;{deleteModal.sessionTitle}&rdquo;
              </p>
            </div>
            <p className="text-neutral-400 text-sm mb-6">
              This action cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setDeleteModal({ isOpen: false, sessionId: '', sessionTitle: '' })}
                className="px-4 py-2 text-sm rounded-md border border-white/10 text-neutral-300 hover:brightness-125 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  await remove(deleteModal.sessionId);
                  setDeleteModal({ isOpen: false, sessionId: '', sessionTitle: '' });
                }}
                className="px-4 py-2 text-sm rounded-md bg-red-600 text-white hover:brightness-125 transition-all"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


