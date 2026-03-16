'use client';

import React from 'react';
import { Camera, CameraOff, Loader2, AlertCircle } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface WebcamCaptureProps {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  isReady: boolean;
  isRunning: boolean;
  isModelLoading: boolean;
  handDetected: boolean;
  cameraError: string | null;
  modelError: string | null;
  onStart: () => void;
  onStop: () => void;
}

export default function WebcamCapture({
  videoRef,
  isReady,
  isRunning,
  isModelLoading,
  handDetected,
  cameraError,
  modelError,
  onStart,
  onStop,
}: WebcamCaptureProps) {
  return (
    <div className="flex flex-col gap-3">
      {/* Video container */}
      <div className="relative overflow-hidden rounded-2xl bg-gray-900 aspect-video">
        <video
          ref={videoRef}
          className={cn(
            'h-full w-full object-cover scale-x-[-1]', // mirror for natural feel
            !isReady && 'opacity-0'
          )}
          playsInline
          muted
        />

        {/* Placeholder when off */}
        {!isReady && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-gray-500">
            <CameraOff className="h-12 w-12" />
            <p className="text-sm">Camera off</p>
          </div>
        )}

        {/* Model loading overlay */}
        {isModelLoading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/60 text-white">
            <Loader2 className="h-10 w-10 animate-spin text-primary-400" />
            <p className="text-sm font-medium">Loading hand detection model…</p>
            <p className="text-xs text-gray-400">First load may take a few seconds</p>
          </div>
        )}

        {/* Hand detected badge */}
        <AnimatePresence>
          {isRunning && !isModelLoading && (
            <motion.div
              className="absolute left-3 top-3"
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -8 }}
            >
              <span
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium',
                  handDetected
                    ? 'bg-primary-600/90 text-white'
                    : 'bg-black/50 text-gray-300'
                )}
              >
                <span
                  className={cn(
                    'h-2 w-2 rounded-full',
                    handDetected ? 'animate-pulse bg-white' : 'bg-gray-500'
                  )}
                />
                {handDetected ? 'Hand detected' : 'No hand'}
              </span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* REC badge */}
        {isRunning && !isModelLoading && (
          <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-red-600/90 px-2.5 py-1 text-xs font-bold text-white">
            <span className="h-2 w-2 animate-pulse rounded-full bg-white" />
            REC
          </span>
        )}
      </div>

      {/* Error messages */}
      {(cameraError || modelError) && (
        <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <p>{cameraError ?? modelError}</p>
        </div>
      )}

      {/* Start / Stop button */}
      <Button
        variant={isRunning ? 'destructive' : 'default'}
        size="lg"
        className="w-full gap-2"
        onClick={isRunning ? onStop : onStart}
        disabled={isModelLoading}
      >
        {isModelLoading ? (
          <>
            <Loader2 className="h-5 w-5 animate-spin" />
            Loading model…
          </>
        ) : isRunning ? (
          <>
            <CameraOff className="h-5 w-5" />
            Stop Recognition
          </>
        ) : (
          <>
            <Camera className="h-5 w-5" />
            Start Recognition
          </>
        )}
      </Button>
    </div>
  );
}
