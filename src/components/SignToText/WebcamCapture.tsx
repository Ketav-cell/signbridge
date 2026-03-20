'use client';

import React, { useEffect, useRef } from 'react';
import { Camera, CameraOff, Loader2, AlertCircle } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

const CONNECTIONS: [number, number][] = [
  [0, 1], [1, 2], [2, 3], [3, 4],
  [5, 6], [6, 7], [7, 8],
  [9, 10], [10, 11], [11, 12],
  [13, 14], [14, 15], [15, 16],
  [17, 18], [18, 19], [19, 20],
  [5, 9], [9, 13], [13, 17],
  [0, 5], [0, 17],
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

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = (rect.width || canvas.offsetWidth) * dpr;
    canvas.height = (rect.height || canvas.offsetHeight) * dpr;
    ctx.scale(dpr, dpr);

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (!landmarks || landmarks.length < 21) return;

    const rect2 = canvas.getBoundingClientRect();
    const W = rect2.width || canvas.offsetWidth;
    const H = rect2.height || canvas.offsetHeight;

    const x = (nx: number) => (1 - nx) * W;
    const y = (ny: number) => ny * H;

    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2.5;
    ctx.lineJoin = 'round';
    for (const [a, b] of CONNECTIONS) {
      ctx.beginPath();
      ctx.moveTo(x(landmarks[a][0]), y(landmarks[a][1]));
      ctx.lineTo(x(landmarks[b][0]), y(landmarks[b][1]));
      ctx.stroke();
    }

    for (let i = 0; i < 21; i++) {
      const cx = x(landmarks[i][0]);
      const cy = y(landmarks[i][1]);
      ctx.beginPath();
      ctx.arc(cx, cy, i === 0 ? 5 : 3, 0, Math.PI * 2);
      ctx.fillStyle = i === 0 ? '#ffffff' : '#0f172a';
      ctx.fill();
    }
  }, [landmarks]);

  return (
    <div className="flex flex-col gap-3">
      <div className="surface-panel relative overflow-hidden p-3">
        <div className="relative aspect-[4/3] overflow-hidden rounded-[24px] bg-slate-950">
          <video
            ref={videoRef}
            className={cn('h-full w-full scale-x-[-1] object-cover', !isReady && 'opacity-0')}
            playsInline
            autoPlay
            muted
          />

          <canvas ref={canvasRef} className="pointer-events-none absolute inset-0 h-full w-full" />

          {!isReady && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-gray-400">
              <CameraOff className="h-12 w-12" />
              <p className="text-sm">Camera off</p>
            </div>
          )}

          {isModelLoading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/60 px-4 text-center text-white">
              <Loader2 className="h-10 w-10 animate-spin text-sky-400" />
              <p className="text-sm font-medium">Loading hand detection model…</p>
              <p className="text-xs text-gray-400">Downloading MediaPipe model (~7 MB, first load only)</p>
            </div>
          )}

          <AnimatePresence>
            {isRunning && !isModelLoading && (
              <motion.div className="absolute left-3 top-3" initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -8 }}>
                <span
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium backdrop-blur-md',
                    handDetected ? 'bg-white text-slate-950' : 'bg-black/40 text-gray-200'
                  )}
                >
                  <span className={cn('h-2 w-2 rounded-full', handDetected ? 'animate-pulse bg-sky-500' : 'bg-gray-500')} />
                  {handDetected ? 'Hand detected' : 'No hand'}
                </span>
              </motion.div>
            )}
          </AnimatePresence>

          {isRunning && !isModelLoading && (
            <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-red-500 px-3 py-1.5 text-xs font-semibold text-white">
              <span className="h-2 w-2 animate-pulse rounded-full bg-white" />
              REC
            </span>
          )}
        </div>
      </div>

      {(cameraError || modelError) && (
        <div className="rounded-[24px] border border-red-200/80 bg-red-50/90 px-4 py-3 text-sm text-red-700 dark:border-red-900/80 dark:bg-red-950/30 dark:text-red-300">
          <div className="flex items-start gap-2">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <p>{cameraError ?? modelError}</p>
          </div>
        </div>
      )}

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
