/**
 * useHandDetection
 *
 * Fully browser-native hand detection using @mediapipe/tasks-vision.
 * No Python server required — works on Vercel and mobile browsers.
 *
 * Data flow:
 *  <video> element (webcam)
 *    → every DETECT_INTERVAL ms, run MediaPipe HandLandmarker
 *    → 21 landmarks → classifyASLLetter()
 *    → majority-vote sliding window → stable letter emitted
 *    → state update → UI re-render
 */

import { useRef, useState, useCallback, useEffect } from 'react';
import { classifyASLLetter } from '@/lib/aslClassifier';

export interface HandDetectionState {
  letter: string | null;
  confidence: number;
  handDetected: boolean;
  isModelLoading: boolean;
  error: string | null;
  landmarks: [number, number][] | null;
}

export interface UseHandDetectionReturn extends HandDetectionState {
  isRunning: boolean;
  startDetection: (videoEl: HTMLVideoElement) => Promise<void>;
  stopDetection: () => void;
}

// Keep these types for backward compatibility
export type { ClassifyResult, Landmark } from '@/lib/aslClassifier';

const DETECT_INTERVAL = 120;  // ms between frames
const MIN_CONFIDENCE  = 0.30;
const WINDOW_SIZE     = 7;
const MIN_VOTES       = 4;

// MediaPipe hand landmarker model — served from CDN
const MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task';
const WASM_PATH = '/tasks-vision-wasm';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let landmarkerPromise: Promise<any> | null = null;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function getHandLandmarker(): Promise<any> {
  if (landmarkerPromise) return landmarkerPromise;
  landmarkerPromise = (async () => {
    const { HandLandmarker, FilesetResolver } = await import('@mediapipe/tasks-vision');
    const vision = await FilesetResolver.forVisionTasks(WASM_PATH);
    // Try GPU first, fall back to CPU
    try {
      return await HandLandmarker.createFromOptions(vision, {
        baseOptions: { modelAssetPath: MODEL_URL, delegate: 'GPU' },
        runningMode: 'VIDEO',
        numHands: 1,
      });
    } catch {
      return await HandLandmarker.createFromOptions(vision, {
        baseOptions: { modelAssetPath: MODEL_URL, delegate: 'CPU' },
        runningMode: 'VIDEO',
        numHands: 1,
      });
    }
  })();
  return landmarkerPromise;
}

export function useHandDetection(): UseHandDetectionReturn {
  const videoRef    = useRef<HTMLVideoElement | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const windowRef   = useRef<{ letter: string; confidence: number }[]>([]);

  const [isRunning, setIsRunning] = useState(false);
  const [state, setState] = useState<HandDetectionState>({
    letter:         null,
    confidence:     0,
    handDetected:   false,
    isModelLoading: false,
    error:          null,
    landmarks:      null,
  });

  const startDetection = useCallback(async (videoEl: HTMLVideoElement) => {
    videoRef.current = videoEl;
    setState((s) => ({ ...s, isModelLoading: true, error: null }));

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let landmarker: any;
    try {
      landmarker = await getHandLandmarker();
    } catch (err) {
      setState((s) => ({
        ...s,
        isModelLoading: false,
        error: err instanceof Error ? err.message : 'Failed to load hand detection model.',
      }));
      return;
    }

    setState((s) => ({ ...s, isModelLoading: false }));
    windowRef.current = [];
    setIsRunning(true);

    let lastTimestamp = -1;

    intervalRef.current = setInterval(() => {
      const video = videoRef.current;
      if (!video || video.readyState < 2) return;

      const now = performance.now();
      if (now <= lastTimestamp) return;
      lastTimestamp = now;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const results: any = landmarker.detectForVideo(video, now);

      if (!results.landmarks || results.landmarks.length === 0) {
        windowRef.current = [];
        setState((s) => ({ ...s, handDetected: false, letter: null, confidence: 0, landmarks: null }));
        return;
      }

      // Raw landmarks — used for overlay (WebcamCapture canvas mirrors them itself)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const rawLm = results.landmarks[0];
      const pts: [number, number][] = rawLm.map((p: { x: number; y: number }) => [p.x, p.y]);

      // Mirror x before classifying so classifier sees right-hand orientation
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const lm = rawLm.map((p: any) => ({ ...p, x: 1 - p.x }));
      const { letter, confidence } = classifyASLLetter(lm);

      if (letter && letter !== '?' && confidence >= MIN_CONFIDENCE) {
        windowRef.current.push({ letter, confidence });
        if (windowRef.current.length > WINDOW_SIZE) windowRef.current.shift();
      }

      // Majority vote
      const votes: Record<string, { count: number; totalConf: number }> = {};
      for (const entry of windowRef.current) {
        if (!votes[entry.letter]) votes[entry.letter] = { count: 0, totalConf: 0 };
        votes[entry.letter].count++;
        votes[entry.letter].totalConf += entry.confidence;
      }

      let bestLetter: string | null = null;
      let bestConf  = 0;
      let bestCount = 0;
      for (const [l, { count, totalConf }] of Object.entries(votes)) {
        if (count > bestCount || (count === bestCount && totalConf > bestConf)) {
          bestLetter = l;
          bestConf   = totalConf / count;
          bestCount  = count;
        }
      }

      const stableLetter = bestCount >= MIN_VOTES ? bestLetter : null;

      setState((s) => ({
        ...s,
        handDetected: true,
        letter:       stableLetter,
        confidence:   stableLetter ? bestConf : confidence,
        landmarks:    pts,
      }));
    }, DETECT_INTERVAL);
  }, []);

  const stopDetection = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    videoRef.current  = null;
    windowRef.current = [];
    setIsRunning(false);
    setState((s) => ({ ...s, handDetected: false, letter: null, confidence: 0, landmarks: null }));
  }, []);

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  return { ...state, isRunning, startDetection, stopDetection };
}
