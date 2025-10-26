"use client";
import React from 'react';
import { useSessionHistory } from '../lib/useSessionHistory';
import { Trash2, Loader2 } from 'lucide-react';
import type { SessionRecord } from '../lib/sessionTypes';

export function SessionHistory({
  sessions,
  onResume,
  onRefresh,
}: {
  sessions: SessionRecord[];
  onResume: (id: string) => void;
  onRefresh?: () => void;
}) {
  const { remove } = useSessionHistory();
  const [deleteModal, setDeleteModal] = React.useState<{
    isOpen: boolean;
    sessionId: string;
    sessionTitle: string;
  }>({
    isOpen: false,
    sessionId: '',
    sessionTitle: '',
  });

  return (
    <div className="space-y-4">
      <div className="max-h-[500px] overflow-y-auto">
        {!sessions || sessions.length === 0 ? (
          <div className="text-center py-8 text-neutral-500 text-sm">
            No saved sessions yet. Complete or cancel a session to see it
            here.
          </div>
        ) : (
          <div className="space-y-3">
            {sessions.map((s) => {
              const isInProgress = s.status === 'in_progress';
              const hasAllAudio = s.chunks.every((c) => c.audioBase64);
              const readyCount = s.chunks.filter(
                (c) => !!c.audioBase64
              ).length;
              const showReadyProgress =
                (isInProgress || s.status === 'cancelled') && !hasAllAudio;

              return (
                <div
                  key={s.id}
                  className="group relative cursor-pointer transition-colors rounded-lg border border-white/5 hover:border-white/20"
                  onClick={() => onResume(s.id)}
                >
                  <div className="flex items-start justify-between gap-4 p-5">
                    <div className="flex-1 min-w-0 space-y-3">
                      {/* Title with bottom fade effect that adapts to hover */}
                      <div className="relative max-h-[60px] overflow-hidden">
                        <p className="text-neutral-100 text-[15px] leading-snug pr-2">
                          {s.chunks[0].text}
                        </p>
                        <div className="absolute bottom-0 left-0 right-0 h-6 bg-gradient-to-t from-neutral-900 via-neutral-900/90 to-transparent pointer-events-none transition-colors" />
                      </div>

                      {/* Metadata row */}
                      <div className="flex items-center gap-3 text-xs">
                        <span className="text-neutral-400">
                          {s.paragraphCount} paragraphs
                        </span>
                        <span className="text-neutral-600">•</span>
                        <span className="text-neutral-500">
                          {new Date(s.createdAt).toLocaleDateString([], {
                            month: 'short',
                            day: 'numeric',
                          })}{' '}
                          at{' '}
                          {new Date(s.createdAt).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                        <span className="text-neutral-600">•</span>
                        <span
                          className={`capitalize ${
                            s.status === 'completed'
                              ? 'text-emerald-400/80'
                              : s.status === 'cancelled'
                                ? 'text-amber-400/70'
                                : 'text-cyan-400/80'
                          }`}
                        >
                          {s.status === 'in_progress'
                            ? 'In progress'
                            : s.status}
                        </span>
                        {showReadyProgress && (
                          <>
                            <span className="text-neutral-600">•</span>
                            <span className="text-neutral-400">
                              {readyCount}/{s.chunks.length} ready
                            </span>
                          </>
                        )}
                        {isInProgress && !hasAllAudio && (
                          <Loader2 className="w-3 h-3 text-cyan-400/80 animate-spin" />
                        )}
                      </div>
                    </div>

                    {/* Delete button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteModal({
                          isOpen: true,
                          sessionId: s.id,
                          sessionTitle: s.title,
                        });
                      }}
                      className="flex-shrink-0 p-2 rounded-md text-neutral-500 hover:text-red-400/80 transition-colors"
                      aria-label="Delete session"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {deleteModal.isOpen && (
        <div className="fixed inset-0 flex items-center justify-center z-50">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() =>
              setDeleteModal({
                isOpen: false,
                sessionId: '',
                sessionTitle: '',
              })
            }
          />

          {/* Modal */}
          <div className="relative bg-neutral-900 rounded-lg p-6 max-w-md mx-4 border border-white/10 shadow-2xl">
            <h3 className="text-lg font-medium text-neutral-200 mb-2">
              Delete Session
            </h3>
            <p className="text-neutral-400 text-sm mb-4 leading-relaxed">
              Are you sure you want to delete this session?
            </p>
            <div className="bg-white/[0.02] border border-white/5 rounded-md p-3 mb-4 max-h-[120px] overflow-hidden relative">
              <p className="text-sm text-neutral-300 leading-relaxed">
                {deleteModal.sessionTitle}
              </p>
              <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-neutral-900 via-neutral-900/90 to-transparent pointer-events-none" />
            </div>
            <p className="text-neutral-500 text-xs mb-6">
              This action cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() =>
                  setDeleteModal({
                    isOpen: false,
                    sessionId: '',
                    sessionTitle: '',
                  })
                }
                className="px-4 py-2 text-sm rounded-md border border-white/10 text-neutral-300 hover:bg-white/5 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  await remove(deleteModal.sessionId);
                  onRefresh?.();
                  setDeleteModal({
                    isOpen: false,
                    sessionId: '',
                    sessionTitle: '',
                  });
                }}
                className="px-4 py-2 text-sm rounded-md bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 transition-colors"
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