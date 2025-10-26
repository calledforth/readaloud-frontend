'use client';
import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogTitle } from './ui/dialog';
import { X, FileText, Upload, Play, Clock } from 'lucide-react';

type WelcomeModalProps = {
  forceOpen?: boolean;
  onClose?: () => void;
};

export function WelcomeModal({ forceOpen, onClose }: WelcomeModalProps) {
  const isControlled = typeof forceOpen === 'boolean';
  const [internalOpen, setInternalOpen] = useState(false);

  useEffect(() => {
    if (!isControlled) {
      const hasSeenWelcome = localStorage.getItem('hasSeenWelcome');
      if (!hasSeenWelcome) {
        setTimeout(() => setInternalOpen(true), 500);
      }
    }
  }, [isControlled]);

  const handleClose = () => {
    try {
      localStorage.setItem('hasSeenWelcome', 'true');
    } catch {}
    if (!isControlled) setInternalOpen(false);
    onClose?.();
  };

  const open = isControlled ? (forceOpen as boolean) : internalOpen;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          handleClose();
        } else if (!isControlled) {
          setInternalOpen(true);
        }
      }}
    >
      <DialogContent className="!w-[800px] !max-w-[calc(100%-2rem)] sm:!max-w-[calc(100%-2rem)] bg-neutral-900 border-white/10 text-neutral-200 p-5 md:p-6">
        <DialogTitle className="sr-only">Welcome to ReadAloud</DialogTitle>

        <button
          onClick={handleClose}
          className="absolute right-4 top-4 rounded-sm opacity-70 hover:opacity-100"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="space-y-5">
          <div className="text-center space-y-2">
            <h2 className="text-3xl md:text-4xl font-semibold">
              Welcome to ReadAloud
            </h2>
            <p className="text-neutral-400 text-sm">
              Transform text into natural speech with word-level highlighting
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
            <FeatureCard
              icon={<FileText className="w-5 h-5" />}
              title="Paste Text"
              description="Type or paste any text directly into the editor"
              artwork={<AnimatedTextSVG />}
            />

            <FeatureCard
              icon={<Upload className="w-5 h-5" />}
              title="Upload PDFs"
              description="Drop PDF documents for automatic text extraction"
              artwork={<AnimatedUploadSVG />}
            />

            <FeatureCard
              icon={<Play className="w-5 h-5" />}
              title="Real-time Highlighting"
              description="Follow along with synchronized word highlighting"
              artwork={<AnimatedPlaybackSVG />}
            />

            <FeatureCard
              icon={<Clock className="w-5 h-5" />}
              title="Session History"
              description="Resume from where you left off anytime"
              artwork={<AnimatedClockSVG />}
            />
          </div>

          <div className="flex justify-center">
            <button
              onClick={handleClose}
              className="px-6 py-2 bg-transparent hover:bg-white/5 text-white rounded-md transition-colors border border-white/20 hover:border-white/30"
            >
              Get Started
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Helper component for feature cards
function FeatureCard({
  icon,
  title,
  description,
  artwork,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  artwork: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-4 p-4 md:p-5 rounded-lg border border-white/10 hover:border-white/20 transition-colors bg-white/[0.02]">
      <div className="mt-1 text-neutral-400">{icon}</div>
      <div className="flex-1 space-y-1">
        <h3 className="font-medium text-sm">{title}</h3>
        <p className="text-xs text-neutral-500">{description}</p>
        <div className="mt-3 h-32 md:h-36 flex items-center justify-center opacity-100 text-neutral-300">
          {artwork}
        </div>
      </div>
    </div>
  );
}

function AnimatedTextSVG() {
  const accent = '#10b981'; // emerald
  return (
    <svg
      width="200"
      height="140"
      viewBox="0 0 200 140"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Text editor window - larger and centered */}
      <g transform="translate(30, 20)">
        <rect
          x="0"
          y="0"
          width="140"
          height="100"
          rx="8"
          fill="currentColor"
          fillOpacity="0.05"
          stroke="currentColor"
          strokeOpacity="0.2"
          strokeWidth="1.5"
        />

        {/* Title bar */}
        <rect
          x="0"
          y="0"
          width="140"
          height="20"
          rx="8"
          fill="currentColor"
          fillOpacity="0.08"
        />
        <circle cx="12" cy="10" r="3" fill="currentColor" opacity="0.3" />
        <circle cx="22" cy="10" r="3" fill="currentColor" opacity="0.3" />
        <circle cx="32" cy="10" r="3" fill="currentColor" opacity="0.3" />

        {/* Text lines with shimmer effect */}
        <g>
          <rect
            x="15"
            y="35"
            width="90"
            height="8"
            rx="4"
            fill={accent}
            fillOpacity="0.15"
          >
            <animate
              attributeName="fill-opacity"
              values="0.15;0.4;0.15"
              dur="2s"
              repeatCount="indefinite"
            />
          </rect>
          <rect
            x="15"
            y="50"
            width="105"
            height="8"
            rx="4"
            fill={accent}
            fillOpacity="0.15"
          >
            <animate
              attributeName="fill-opacity"
              values="0.15;0.4;0.15"
              dur="2s"
              begin="0.3s"
              repeatCount="indefinite"
            />
          </rect>
          <rect
            x="15"
            y="65"
            width="80"
            height="8"
            rx="4"
            fill={accent}
            fillOpacity="0.15"
          >
            <animate
              attributeName="fill-opacity"
              values="0.15;0.4;0.15"
              dur="2s"
              begin="0.6s"
              repeatCount="indefinite"
            />
          </rect>
          <rect
            x="15"
            y="80"
            width="95"
            height="8"
            rx="4"
            fill={accent}
            fillOpacity="0.15"
          >
            <animate
              attributeName="fill-opacity"
              values="0.15;0.4;0.15"
              dur="2s"
              begin="0.9s"
              repeatCount="indefinite"
            />
          </rect>
        </g>
      </g>
    </svg>
  );
}

function AnimatedUploadSVG() {
  const accent = '#8b5cf6'; // violet
  return (
    <svg
      width="200"
      height="140"
      viewBox="0 0 200 140"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* PDF document with detailed content */}
      <g transform="translate(15, 20)">
        <rect
          x="0"
          y="0"
          width="80"
          height="100"
          rx="6"
          fill="currentColor"
          fillOpacity="0.06"
          stroke="currentColor"
          strokeOpacity="0.25"
          strokeWidth="1.5"
        />

        {/* Folded corner */}
        <path
          d="M60 0 L80 20 L60 20 Z"
          fill="currentColor"
          fillOpacity="0.12"
          stroke="currentColor"
          strokeOpacity="0.25"
          strokeWidth="1.5"
        />
        <line
          x1="60"
          y1="0"
          x2="80"
          y2="20"
          stroke="currentColor"
          strokeOpacity="0.15"
          strokeWidth="1"
        />

        {/* PDF badge */}
        <rect
          x="10"
          y="12"
          width="32"
          height="18"
          rx="4"
          fill={accent}
          fillOpacity="0.2"
        />
        <text
          x="26"
          y="24.5"
          fontSize="11"
          fontWeight="bold"
          fill={accent}
          textAnchor="middle"
          fontFamily="monospace"
        >
          PDF
        </text>

        {/* Text content lines */}
        <g stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.2">
          <line x1="10" y1="45" x2="70" y2="45" />
          <line x1="10" y1="53" x2="65" y2="53" />
          <line x1="10" y1="61" x2="68" y2="61" />
          <line x1="10" y1="69" x2="62" y2="69" />
          <line x1="10" y1="77" x2="70" y2="77" />
          <line x1="10" y1="85" x2="58" y2="85" />
        </g>

        {/* Extraction glow effect */}
        <rect
          x="0"
          y="0"
          width="80"
          height="100"
          rx="6"
          fill="none"
          stroke={accent}
          strokeOpacity="0"
          strokeWidth="2"
        >
          <animate
            attributeName="stroke-opacity"
            values="0;0.4;0"
            dur="3s"
            repeatCount="indefinite"
          />
        </rect>
      </g>

      {/* Processing/extraction visualization */}
      <g transform="translate(105, 20)">
        {/* Extraction arrow with integrated flow */}
        <path
          d="M0 10 L0 50"
          stroke={accent}
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray="4 4"
          strokeOpacity="0.4"
        >
          <animate
            attributeName="stroke-dashoffset"
            from="0"
            to="8"
            dur="0.8s"
            repeatCount="indefinite"
          />
        </path>

        <path
          d="M-8 42 L0 50 L8 42"
          stroke={accent}
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        >
          <animate
            attributeName="opacity"
            values="0.3;1;0.3"
            dur="2s"
            repeatCount="indefinite"
          />
        </path>

        {/* Extracted text representation */}
        <g transform="translate(-30, 65)">
          <rect
            x="0"
            y="0"
            width="60"
            height="50"
            rx="4"
            fill="currentColor"
            fillOpacity="0.05"
            stroke={accent}
            strokeOpacity="0.3"
            strokeWidth="1.5"
          />

          {/* Text lines appearing */}
          <g stroke={accent} strokeWidth="2" strokeLinecap="round">
            <line x1="8" y1="12" x2="52" y2="12">
              <animate
                attributeName="x2"
                from="8"
                to="52"
                dur="1.5s"
                repeatCount="indefinite"
              />
            </line>
            <line x1="8" y1="22" x2="45" y2="22">
              <animate
                attributeName="x2"
                from="8"
                to="45"
                dur="1.5s"
                begin="0.3s"
                repeatCount="indefinite"
              />
            </line>
            <line x1="8" y1="32" x2="50" y2="32">
              <animate
                attributeName="x2"
                from="8"
                to="50"
                dur="1.5s"
                begin="0.6s"
                repeatCount="indefinite"
              />
            </line>
            <line x1="8" y1="42" x2="48" y2="42">
              <animate
                attributeName="x2"
                from="8"
                to="48"
                dur="1.5s"
                begin="0.9s"
                repeatCount="indefinite"
              />
            </line>
          </g>
        </g>
      </g>
    </svg>
  );
}

function AnimatedPlaybackSVG() {
  const accent = '#14b8a6'; // teal
  return (
    <svg
      width="200"
      height="200"
      viewBox="0 0 200 140"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Simple reading interface */}
      <g transform="translate(15, 15)">
        <rect
          x="0"
          y="0"
          width="170"
          height="90"
          rx="8"
          fill="currentColor"
          fillOpacity="0.04"
          stroke="currentColor"
          strokeOpacity="0.2"
          strokeWidth="1.5"
        />

        {/* Simple text content */}
        <g transform="translate(15, 20)">
          <text
            x="0"
            y="0"
            fontSize="10"
            fill="currentColor"
            opacity="0.5"
            fontFamily="system-ui"
          >
            The quick brown fox
          </text>
          <text
            x="0"
            y="20"
            fontSize="10"
            fill="currentColor"
            opacity="0.5"
            fontFamily="system-ui"
          >
            jumps over the lazy
          </text>
          <text
            x="0"
            y="40"
            fontSize="10"
            fill="currentColor"
            opacity="0.5"
            fontFamily="system-ui"
          >
            dog in the garden
          </text>
        </g>

        {/* Simple audio visualization */}
        <g transform="translate(20, 70)">
          {[...Array(12)].map((_, i) => (
            <rect
              key={i}
              x={i * 12}
              y="0"
              width="8"
              height="4"
              rx="2"
              fill={accent}
              fillOpacity="0.3"
            >
              <animate
                attributeName="height"
                values="4;10;4"
                dur="1.2s"
                begin={`${i * 0.1}s`}
                repeatCount="indefinite"
              />
              <animate
                attributeName="y"
                values="0;-3;0"
                dur="1.2s"
                begin={`${i * 0.1}s`}
                repeatCount="indefinite"
              />
              <animate
                attributeName="fill-opacity"
                values="0.3;0.7;0.3"
                dur="1.2s"
                begin={`${i * 0.1}s`}
                repeatCount="indefinite"
              />
            </rect>
          ))}
        </g>
      </g>

      {/* Simple play button */}
      <g transform="translate(175, 25)">
        <circle
          cx="0"
          cy="0"
          r="8"
          fill={accent}
          fillOpacity="0.2"
          stroke={accent}
          strokeOpacity="0.5"
          strokeWidth="1.5"
        />
        <path d="M-2 -4 L-2 4 L4 0 Z" fill={accent} fillOpacity="0.8" />
      </g>
    </svg>
  );
}

function AnimatedClockSVG() {
  const accent = '#f97316'; // orange
  return (
    <svg
      width="200"
      height="140"
      viewBox="0 0 200 140"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Document stack with session cards */}
      <g transform="translate(20, 25)">
        {/* Back documents */}
        <rect
          x="10"
          y="-10"
          width="70"
          height="90"
          rx="6"
          fill="currentColor"
          fillOpacity="0.03"
          stroke="currentColor"
          strokeOpacity="0.12"
          strokeWidth="1.5"
        />
        <rect
          x="5"
          y="-5"
          width="70"
          height="90"
          rx="6"
          fill="currentColor"
          fillOpacity="0.05"
          stroke="currentColor"
          strokeOpacity="0.18"
          strokeWidth="1.5"
        />

        {/* Front active document */}
        <rect
          x="0"
          y="0"
          width="70"
          height="90"
          rx="6"
          fill="currentColor"
          fillOpacity="0.08"
          stroke="currentColor"
          strokeOpacity="0.25"
          strokeWidth="1.5"
        />

        {/* Document header */}
        <rect
          x="8"
          y="8"
          width="54"
          height="12"
          rx="3"
          fill="currentColor"
          fillOpacity="0.1"
        />
        <circle cx="14" cy="14" r="2.5" fill={accent} fillOpacity="0.6" />

        {/* Text content */}
        <g stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.2">
          <line x1="10" y1="28" x2="60" y2="28" />
          <line x1="10" y1="36" x2="55" y2="36" />
          <line x1="10" y1="44" x2="58" y2="44" />
          <line x1="10" y1="52" x2="52" y2="52" />
          <line x1="10" y1="60" x2="60" y2="60" />
          <line x1="10" y1="68" x2="54" y2="68" />
        </g>

        {/* Progress bar with percentage */}
        <rect
          x="10"
          y="78"
          width="50"
          height="6"
          rx="3"
          fill="currentColor"
          fillOpacity="0.1"
        />
        <rect x="10" y="78" width="32" height="6" rx="3" fill={accent}>
          <animate
            attributeName="width"
            values="32;38;32"
            dur="3s"
            repeatCount="indefinite"
          />
        </rect>

        {/* Active bookmark indicator - better positioned */}
        <g transform="translate(65, 20)">
          <path
            d="M0 -5 L0 25 L8 18 L16 25 L16 -5 Z"
            fill={accent}
            fillOpacity="0.3"
            stroke={accent}
            strokeOpacity="0.6"
            strokeWidth="1.5"
          />
          <circle cx="8" cy="8" r="3" fill={accent}>
            <animate
              attributeName="opacity"
              values="0.6;1;0.6"
              dur="2s"
              repeatCount="indefinite"
            />
          </circle>
        </g>
      </g>

      {/* Clock/timer with history ring */}
      <g transform="translate(130, 55)">
        {/* Outer history ring */}
        <circle
          cx="0"
          cy="0"
          r="32"
          fill="none"
          stroke="currentColor"
          strokeOpacity="0.1"
          strokeWidth="1.5"
        />

        {/* Progress arc */}
        <circle
          cx="0"
          cy="0"
          r="32"
          fill="none"
          stroke={accent}
          strokeOpacity="0.4"
          strokeWidth="2"
          strokeDasharray="200"
          strokeDashoffset="50"
          transform="rotate(-90)"
        >
          <animateTransform
            attributeName="transform"
            type="rotate"
            from="-90 0 0"
            to="270 0 0"
            dur="8s"
            repeatCount="indefinite"
          />
        </circle>

        {/* Clock face */}
        <circle
          cx="0"
          cy="0"
          r="24"
          fill="currentColor"
          fillOpacity="0.06"
          stroke={accent}
          strokeOpacity="0.4"
          strokeWidth="2"
        />

        {/* Clock markers */}
        <g stroke={accent} strokeOpacity="0.3" strokeWidth="1.5">
          <line x1="0" y1="-20" x2="0" y2="-17" />
          <line x1="0" y1="17" x2="0" y2="20" />
          <line x1="-20" y1="0" x2="-17" y2="0" />
          <line x1="17" y1="0" x2="20" y2="0" />
        </g>

        {/* Hour hand */}
        <line
          x1="0"
          y1="0"
          x2="0"
          y2="-12"
          stroke={accent}
          strokeWidth="2.5"
          strokeLinecap="round"
        >
          <animateTransform
            attributeName="transform"
            type="rotate"
            from="0 0 0"
            to="360 0 0"
            dur="6s"
            repeatCount="indefinite"
          />
        </line>

        {/* Minute hand */}
        <line
          x1="0"
          y1="0"
          x2="0"
          y2="-16"
          stroke={accent}
          strokeWidth="2"
          strokeLinecap="round"
          opacity="0.8"
        >
          <animateTransform
            attributeName="transform"
            type="rotate"
            from="0 0 0"
            to="360 0 0"
            dur="3s"
            repeatCount="indefinite"
          />
        </line>

        {/* Center dot */}
        <circle cx="0" cy="0" r="2.5" fill={accent} />

        {/* Resume indicator */}
        <g transform="translate(0, 42)">
          <circle cx="0" cy="0" r="6" fill={accent} fillOpacity="0.2" />
          <path
            d="M-2 -2 L-2 2 L2 0 Z"
            fill={accent}
            fillOpacity="0.8"
            transform="rotate(90)"
          >
            <animateTransform
              attributeName="transform"
              type="rotate"
              values="90;90;180;90"
              dur="4s"
              repeatCount="indefinite"
            />
          </path>
        </g>
      </g>
    </svg>
  );
} 