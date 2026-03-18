'use client';

import React, { useEffect, useRef } from 'react';
import { Camera, CameraOff, Loader2, AlertCircle } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

// Hand skeleton connections (matches the Python predictor's drawing order)
const CONNECTIONS: [number, number][] = [
  [0, 1], [1, 2], [2, 3], [3, 4],       // thumb
  [5, 6], [6, 7], [7, 8],               // index
  [9, 10], [10, 11], [11, 12],          // middle
  [13, 14], [14, 15], [15, 16],         // ring
  [17, 18], [18, 19], [19, 20],         // pinky
  [5, 9], [9, 13], [13, 17],            // palm knuckles
  [0, 5], [0, 17],                      // wrist to outer fingers
];

interface WebcamCaptureProps {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  isReady: boolean;
  isRunning: boolean;
  isModelLoading: boolean;
  handDetected: boolean;
  cameraError: string | null;
  modelError: string | null;
  landmarks?: [number, number][] | null;
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
  landmarks,
  onStart,
  onStop,
}: WebcamCaptureProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Draw skeleton on canvas whenever landmarks change
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Size canvas to match its display size
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width || canvas.offsetWidth;
    canvas.height = rect.height || canvas.offsetHeight;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (!landmarks || landmarks.length < 21) return;

    const W = canvas.width;
    const H = canvas.height;

    // Mirror x to match the CSS scale-x-[-1] on the video
    const x = (nx: number) => (1 - nx) * W;
    const y = (ny: number) => ny * H;

    // Draw connections
    ctx.strokeStyle = '#00ff44';
    ctx.lineWidth = 2.5;
    ctx.lineJoin = 'round';
    for (const [a, b] of CONNECTIONS) {
      ctx.beginPath();
      ctx.moveTo(x(landmarks[a][0]), y(landmarks[a][1]));
      ctx.lineTo(x(landmarks[b][0]), y(landmarks[b][1]));
      ctx.stroke();
    }

    // Draw landmark dots
    for (let i = 0; i < 21; i++) {
      const cx = x(landmarks[i][0]);
      const cy = y(landmarks[i][1]);
      ctx.beginPath();
      ctx.arc(cx, cy, i === 0 ? 5 : 3, 0, Math.PI * 2);
      ctx.fillStyle = i === 0 ? '#ffffff' : '#ff3333';
      ctx.fill();
    }
  }, [landmarks]);

  return (
    <div className="flex flex-col gap-3">
      {/* Video container */}
      <div className="relative overflow-hidden rounded-2xl bg-gray-900 aspect-video">
        <video
          ref={videoRef}
          className={cn(
            'h-full w-full object-cover scale-x-[-1]',
            !isReady && 'opacity-0'
          )}
          playsInline
          muted
        />

        {/* Skeleton overlay canvas */}
        <canvas
          ref={canvasRef}
          className="absolute inset-0 h-full w-full pointer-events-none"
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
            <p className="text-sm font-medium">Connecting to inference server…</p>
            <p className="text-xs text-gray-400">Make sure the Python server is running on port 8000</p>
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
            Connecting…
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
