/**
 * useHandDetection
 *
 * Browser-native hand detection using @mediapipe/tasks-vision (npm package).
 * WASM files are served from /public/tasks-vision-wasm/ — no CDN required.
 * Model weights are fetched from Google's CDN on first use (cached by browser).
 *
 * Data flow:
 *  <video> element (webcam)
 *    → every DETECT_INTERVAL ms, HandLandmarker.detectForVideo() runs inference
 *    → 21 normalised landmarks returned synchronously
 *    → classifyASLLetter() maps landmarks to a letter (A-Z)
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

const DETECT_INTERVAL = 150;
const MIN_CONFIDENCE = 0.50;

/** WASM files are copied from node_modules to public/ so no CDN is needed. */
const WASM_PATH = '/tasks-vision-wasm';

const MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task';

export function useHandDetection(): UseHandDetectionReturn {
  const detectorRef = useRef<any>(null);
  const videoRef    = useRef<HTMLVideoElement | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const classifyRef = useRef<((lm: Landmark[]) => ClassifyResult) | null>(null);

  const [isRunning, setIsRunning] = useState(false);
  const [state, setState] = useState<HandDetectionState>({
    letter: null,
    confidence: 0,
    handDetected: false,
    isModelLoading: false,
    error: null,
  });

  const initModel = useCallback(async () => {
    if (detectorRef.current) return;

    setState((s) => ({ ...s, isModelLoading: true, error: null }));

    try {
      // Dynamic imports — never run on the server
      const [{ HandLandmarker, FilesetResolver }, classifierModule] = await Promise.all([
        import('@mediapipe/tasks-vision'),
        import('@/lib/aslClassifier'),
      ]);

      classifyRef.current = classifierModule.classifyASLLetter;

      // WASM served locally from /public/tasks-vision-wasm/
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
      if (!detectorRef.current) return; // init failed, error already set in state

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
            setState((s) => ({ ...s, handDetected: false, letter: null, confidence: 0 }));
            return;
          }

          const lm: Landmark[] = results.landmarks[0].map((pt: any) => ({
            x: pt.x,
            y: pt.y,
            z: pt.z ?? 0,
          }));

          const { letter, confidence } = classifyRef.current!(lm);
          setState((s) => ({
            ...s,
            handDetected: true,
            letter: confidence >= MIN_CONFIDENCE ? letter : null,
            confidence,
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
    videoRef.current = null;
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
