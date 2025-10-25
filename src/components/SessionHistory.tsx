"use client";
import React from 'react';
import { useSessionHistory } from '../lib/useSessionHistory';
import { Trash2, Loader2 } from 'lucide-react';
import type { SessionRecord } from '../lib/sessionTypes';

export function SessionHistory({ sessions, onResume, onRefresh }: { sessions: SessionRecord[], onResume: (id: string) => void, onRefresh?: () => void }) {
  const { remove } = useSessionHistory();
  const [deleteModal, setDeleteModal] = React.useState<{ isOpen: boolean; sessionId: string; sessionTitle: string }>({
    isOpen: false,
    sessionId: '',
    sessionTitle: ''
  });

  return (
    <div className="space-y-4">
      <div className="max-h-[450px] overflow-y-auto">
          {(!sessions || sessions.length === 0) ? (
            <div className="text-center py-8 text-neutral-500 text-sm">
              No saved sessions yet. Complete or cancel a session to see it here.
            </div>
          ) : (
            sessions.map((s, index) => {
              const isInProgress = s.status === 'in_progress';
              const hasAllAudio = s.chunks.every(c => c.audioBase64);
              const readyCount = s.chunks.filter(c => !!c.audioBase64).length;
              const showReadyProgress = (isInProgress || s.status === 'cancelled') && !hasAllAudio;

              return (
                <div
                  key={s.id}
                  className={`group ${index > 0 ? 'border-t border-neutral-700/30' : ''} cursor-pointer hover:border-neutral-600/50 hover:bg-neutral-800/20 transition-all rounded-md`}
                  onClick={() => onResume(s.id)}
                >
                  <div className="flex items-center justify-between gap-4 p-3">
                    <div className="flex flex-col flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-1">
                        <span className="text-neutral-100 text-base font-medium truncate">{s.title}</span>
                        {isInProgress && !hasAllAudio && (
                          <Loader2 className="w-4 h-4 text-cyan-400 animate-spin flex-shrink-0" />
                        )}
                      </div>

                      <div className="space-y-0.5">
                        <div className="text-neutral-400 text-sm">
                          {new Date(s.createdAt).toLocaleDateString()} at {new Date(s.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                        </div>
                        <div className="flex items-center gap-4 text-neutral-500 text-sm">
                          <span>{s.paragraphCount} paragraphs</span>
                          <span className={`px-2 py-0.5 rounded text-xs font-medium border ${
                            s.status === 'completed' ? 'border-green-500/50 text-green-400 bg-green-500/10' :
                            s.status === 'cancelled' ? 'border-red-500/50 text-red-400 bg-red-500/10' :
                            'border-blue-500/50 text-blue-400 bg-blue-500/10'
                          }`}>
                            {s.status}
                          </span>
                          {showReadyProgress && (
                            <span className={`${s.status === 'cancelled' ? 'text-amber-400' : 'text-cyan-400'}`}>
                              {readyCount}/{s.chunks.length} ready
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteModal({ isOpen: true, sessionId: s.id, sessionTitle: s.title });
                        }}
                        className="p-2.5 rounded-md text-red-300 hover:bg-neutral-700/50 transition-all"
                        aria-label="Delete session"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
      </div>

      {/* Custom Delete Confirmation Modal */}
      {deleteModal.isOpen && (
        <div className="fixed inset-0 flex items-center justify-center z-50">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/50" onClick={() => setDeleteModal({ isOpen: false, sessionId: '', sessionTitle: '' })} />

          {/* Modal */}
          <div className="relative bg-neutral-900 rounded-lg p-6 max-w-md mx-4 border border-neutral-700">
            <h3 className="text-xl font-semibold text-neutral-200 mb-3">Delete Session</h3>
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
                  onRefresh?.();
                  setDeleteModal({ isOpen: false, sessionId: '', sessionTitle: '' });
                }}
                className="px-4 py-2 text-sm rounded-md bg-red-600 text-neutral-200 hover:brightness-125 transition-all"
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


