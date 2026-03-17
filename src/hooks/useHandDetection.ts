/**
 * useHandDetection
 *
 * Browser-native hand detection using @mediapipe/tasks-vision.
 * WASM files are served from /public/tasks-vision-wasm/ — no CDN required.
 *
 * Data flow:
 *  <video> element (webcam)
 *    → every DETECT_INTERVAL ms, HandLandmarker.detectForVideo() runs inference
 *    → 21 normalised landmarks returned
 *    → classifyASLLetter() maps landmarks to a letter (A-Z)
 *    → majority vote over a sliding window → stable letter emitted
 *    → state update → UI re-render
 */

import { useRef, useState, useCallback, useEffect } from 'react';
import type { ClassifyResult, Landmark } from '@/lib/aslClassifier';

export interface HandDetectionState {
  letter: string | null;
  confidence: number;
  handDetected: boolean;
  isModelLoading: boolean;
  error: string | null;
}

export interface UseHandDetectionReturn extends HandDetectionState {
  isRunning: boolean;
  startDetection: (videoEl: HTMLVideoElement) => Promise<void>;
  stopDetection: () => void;
}

const DETECT_INTERVAL = 100;  // ms between frames (was 150)
const MIN_CONFIDENCE  = 0.45; // minimum confidence to emit a letter
const WINDOW_SIZE     = 7;    // sliding window for majority vote
const MIN_VOTES       = 4;    // minimum votes in window to emit (majority)

/** WASM files are copied from node_modules to public/ so no CDN is needed. */
const WASM_PATH = '/tasks-vision-wasm';

const MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task';

export function useHandDetection(): UseHandDetectionReturn {
  const detectorRef  = useRef<any>(null);
  const videoRef     = useRef<HTMLVideoElement | null>(null);
  const intervalRef  = useRef<ReturnType<typeof setInterval> | null>(null);
  const classifyRef  = useRef<((lm: Landmark[]) => ClassifyResult) | null>(null);

  // Sliding window buffer for majority-vote smoothing
  const windowRef = useRef<{ letter: string; confidence: number }[]>([]);

  const [isRunning, setIsRunning] = useState(false);
  const [state, setState] = useState<HandDetectionState>({
    letter:          null,
    confidence:      0,
    handDetected:    false,
    isModelLoading:  false,
    error:           null,
  });

  const initModel = useCallback(async () => {
    if (detectorRef.current) return;
    setState((s) => ({ ...s, isModelLoading: true, error: null }));

    try {
      const [{ HandLandmarker, FilesetResolver }, classifierModule] = await Promise.all([
        import('@mediapipe/tasks-vision'),
        import('@/lib/aslClassifier'),
      ]);

      classifyRef.current = classifierModule.classifyASLLetter;

      const vision = await FilesetResolver.forVisionTasks(WASM_PATH);

      const landmarker = await HandLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: MODEL_URL,
          delegate: 'GPU',
        },
        runningMode: 'VIDEO',
        numHands: 1,
      });

      detectorRef.current = landmarker;
      setState((s) => ({ ...s, isModelLoading: false }));
    } catch (err) {
      setState((s) => ({
        ...s,
        isModelLoading: false,
        error: err instanceof Error ? err.message : 'Failed to load hand detection.',
      }));
    }
  }, []);

  const startDetection = useCallback(
    async (videoEl: HTMLVideoElement) => {
      videoRef.current = videoEl;
      await initModel();
      if (!detectorRef.current) return;

      windowRef.current = [];
      setIsRunning(true);

      intervalRef.current = setInterval(() => {
        if (!detectorRef.current || !videoRef.current) return;
        if (videoRef.current.readyState < 2) return;

        try {
          const results = detectorRef.current.detectForVideo(
            videoRef.current,
            performance.now()
          );

          if (!results.landmarks?.length) {
            windowRef.current = [];
            setState((s) => ({ ...s, handDetected: false, letter: null, confidence: 0 }));
            return;
          }

          const lm: Landmark[] = results.landmarks[0].map((pt: any) => ({
            x: pt.x,
            y: pt.y,
            z: pt.z ?? 0,
          }));

          const raw = classifyRef.current!(lm);

          // Add to sliding window
          windowRef.current.push(raw);
          if (windowRef.current.length > WINDOW_SIZE) {
            windowRef.current.shift();
          }

          // Majority vote over the window
          const votes: Record<string, { count: number; totalConf: number }> = {};
          for (const entry of windowRef.current) {
            if (entry.confidence < MIN_CONFIDENCE) continue;
            if (!votes[entry.letter]) votes[entry.letter] = { count: 0, totalConf: 0 };
            votes[entry.letter].count++;
            votes[entry.letter].totalConf += entry.confidence;
          }

          let bestLetter = null;
          let bestConf   = 0;
          let bestCount  = 0;
          for (const [letter, { count, totalConf }] of Object.entries(votes)) {
            if (count > bestCount || (count === bestCount && totalConf > bestConf)) {
              bestLetter = letter;
              bestConf   = totalConf / count;
              bestCount  = count;
            }
          }

          // Only emit if we have enough agreeing votes
          const stableLetter = bestCount >= MIN_VOTES ? bestLetter : null;
          const stableConf   = stableLetter ? bestConf : 0;

          setState((s) => ({
            ...s,
            handDetected: true,
            letter:       stableLetter,
            confidence:   stableConf,
          }));
        } catch {
          // Ignore single-frame errors
        }
      }, DETECT_INTERVAL);
    },
    [initModel]
  );

  const stopDetection = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    videoRef.current    = null;
    windowRef.current   = [];
    setIsRunning(false);
    setState((s) => ({ ...s, handDetected: false, letter: null, confidence: 0 }));
  }, []);

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  return { ...state, isRunning, startDetection, stopDetection };
}
