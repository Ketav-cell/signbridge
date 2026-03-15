'use client';

import React from 'react';
import { Camera, CameraOff, Wifi, WifiOff, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface WebcamCaptureProps {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  isReady: boolean;
  isRunning: boolean;
  isConnected: boolean;
  handDetected: boolean;
  cameraError: string | null;
  connectionError: string | null;
  onStart: () => void;
  onStop: () => void;
}

/**
 * Shows the live webcam feed and status indicators.
 * The <video> element is controlled by the parent via videoRef.
 */
export default function WebcamCapture({
  videoRef,
  isReady,
  isRunning,
  isConnected,
  handDetected,
  cameraError,
  connectionError,
  onStart,
  onStop,
}: WebcamCaptureProps) {
  return (
    <div className="flex flex-col gap-3">
      {/* Video container */}
      <div className="relative overflow-hidden rounded-2xl bg-gray-900 aspect-video">
        {/* Video element — always rendered so the ref is attached */}
        <video
          ref={videoRef}
          className={cn(
            'h-full w-full object-cover',
            // Mirror for natural selfie feel
            'scale-x-[-1]',
            !isReady && 'opacity-0'
          )}
          playsInline
          muted
        />

        {/* Placeholder when camera is off */}
        {!isReady && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-gray-500">
            <CameraOff className="h-12 w-12" />
            <p className="text-sm">Camera off</p>
          </div>
        )}

        {/* Status badges (top-left) */}
        <div className="absolute left-3 top-3 flex flex-col gap-1.5">
          {/* Connection badge */}
          {isRunning && (
            <span
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium',
                isConnected
                  ? 'bg-green-500/90 text-white'
                  : 'bg-yellow-500/90 text-white'
              )}
            >
              {isConnected ? (
                <Wifi className="h-3 w-3" />
              ) : (
                <WifiOff className="h-3 w-3" />
              )}
              {isConnected ? 'Connected' : 'Connecting…'}
            </span>
          )}

          {/* Hand detected badge */}
          <AnimatePresence>
            {isRunning && isConnected && (
              <motion.span
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium',
                  handDetected
                    ? 'bg-primary-600/90 text-white'
                    : 'bg-black/50 text-gray-300'
                )}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -8 }}
              >
                <span
                  className={cn(
                    'h-2 w-2 rounded-full',
                    handDetected ? 'bg-white animate-pulse' : 'bg-gray-500'
                  )}
                />
                {handDetected ? 'Hand detected' : 'No hand'}
              </motion.span>
            )}
          </AnimatePresence>
        </div>

        {/* REC indicator */}
        {isRunning && (
          <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-red-600/90 px-2.5 py-1 text-xs font-bold text-white">
            <span className="h-2 w-2 animate-pulse rounded-full bg-white" />
            REC
          </span>
        )}
      </div>

      {/* Error messages */}
      {(cameraError || connectionError) && (
        <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <p>{cameraError ?? connectionError}</p>
        </div>
      )}

      {/* Start / Stop button */}
      <Button
        variant={isRunning ? 'destructive' : 'default'}
        size="lg"
        className="w-full gap-2"
        onClick={isRunning ? onStop : onStart}
      >
        {isRunning ? (
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
