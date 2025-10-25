'use client';
import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogTitle } from './ui/dialog';
import { X, FileText, Upload, Play, Clock } from 'lucide-react';
import Image from 'next/image';

export function WelcomeModal() {
  const [open, setOpen] = useState(false);
  
  useEffect(() => {
    // Check localStorage AFTER hydration (client-side only)
    const hasSeenWelcome = localStorage.getItem('hasSeenWelcome');
    if (!hasSeenWelcome) {
      // Small delay to avoid flash
      setTimeout(() => setOpen(true), 500);
    }
  }, []);
  
  const handleClose = () => {
    localStorage.setItem('hasSeenWelcome', 'true');
    setOpen(false);
  };
  
  return (
    <Dialog open={open} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="max-w-2xl bg-neutral-900 border-white/10 text-neutral-200">
        {/* Visually hidden title for accessibility */}
        <DialogTitle className="sr-only">Welcome to ReadAloud</DialogTitle>
        
        {/* Close button */}
        <button
          onClick={handleClose}
          className="absolute right-4 top-4 rounded-sm opacity-70 hover:opacity-100"
        >
          <X className="h-4 w-4" />
        </button>
        
        {/* Content sections */}
        <div className="space-y-6 py-4">
          {/* Header */}
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-semibold">Welcome to ReadAloud</h2>
            <p className="text-neutral-400 text-sm">
              Transform text into natural speech with word-level highlighting
            </p>
          </div>
          
          {/* Features grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Feature 1: Text Input */}
            <FeatureCard
              icon={<FileText className="w-5 h-5" />}
              title="Paste Text"
              description="Type or paste any text directly into the editor"
              imagePath="/features/text-input.svg"
            />
            
            {/* Feature 2: PDF Upload */}
            <FeatureCard
              icon={<Upload className="w-5 h-5" />}
              title="Upload PDFs"
              description="Drop PDF documents for automatic text extraction"
              imagePath="/features/pdf-upload.svg"
            />
            
            {/* Feature 3: Playback */}
            <FeatureCard
              icon={<Play className="w-5 h-5" />}
              title="Real-time Highlighting"
              description="Follow along with synchronized word highlighting"
              imagePath="/features/playback.svg"
            />
            
            {/* Feature 4: History */}
            <FeatureCard
              icon={<Clock className="w-5 h-5" />}
              title="Session History"
              description="Resume from where you left off anytime"
              imagePath="/features/history.svg"
            />
          </div>
          
          {/* Privacy notice */}
          <div className="text-xs text-neutral-500 text-center border-t border-white/5 pt-4">
            Usage analytics are collected (IP address, input text) for service improvement.
          </div>
          
          {/* Get Started button */}
          <div className="flex justify-center">
            <button
              onClick={handleClose}
              className="px-6 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 rounded-md transition-colors"
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
  imagePath 
}: { 
  icon: React.ReactNode; 
  title: string; 
  description: string; 
  imagePath: string;
}) {
  return (
    <div className="flex items-start gap-3 p-3 rounded-lg border border-white/5 bg-white/[0.02]">
      <div className="mt-1 text-neutral-400">{icon}</div>
      <div className="flex-1 space-y-1">
        <h3 className="font-medium text-sm">{title}</h3>
        <p className="text-xs text-neutral-500">{description}</p>
        {/* Placeholder for images - will be simple SVG icons */}
        <div className="mt-2 h-16 flex items-center justify-center opacity-40">
          <Image 
            src={imagePath} 
            alt={title} 
            width={80} 
            height={64}
            className="object-contain"
          />
        </div>
      </div>
    </div>
  );
}