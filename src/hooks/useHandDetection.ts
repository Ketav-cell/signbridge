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

export type { ClassifyResult, Landmark } from '@/lib/aslClassifier';

const WS_URL          = 'ws://localhost:8000/ws';
const WS_TIMEOUT_MS   = 2000;
const DETECT_INTERVAL = 120;
const MIN_CONFIDENCE  = 0.25;
const WINDOW_SIZE     = 7;
const MIN_VOTES       = 4;

const MODEL_URL = 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task';
const WASM_PATH = '/tasks-vision-wasm';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let browserLandmarkerPromise: Promise<any> | null = null;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function getBrowserLandmarker(): Promise<any> {
  if (browserLandmarkerPromise) return browserLandmarkerPromise;
  browserLandmarkerPromise = (async () => {
    const { HandLandmarker, FilesetResolver } = await import('@mediapipe/tasks-vision');
    const vision = await FilesetResolver.forVisionTasks(WASM_PATH);
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
  return browserLandmarkerPromise;
}

export function useHandDetection(): UseHandDetectionReturn {
  const videoRef    = useRef<HTMLVideoElement | null>(null);
  const wsRef       = useRef<WebSocket | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const windowRef   = useRef<{ letter: string; confidence: number }[]>([]);
  const waitingRef  = useRef(false);

  const [isRunning, setIsRunning] = useState(false);
  const [state, setState] = useState<HandDetectionState>({
    letter: null, confidence: 0, handDetected: false,
    isModelLoading: false, error: null, landmarks: null,
  });

  const pushVote = useCallback((letter: string, confidence: number) => {
    if (!letter || letter === '?' || confidence < MIN_CONFIDENCE) return null;
    windowRef.current.push({ letter, confidence });
    if (windowRef.current.length > WINDOW_SIZE) windowRef.current.shift();

    const votes: Record<string, { count: number; totalConf: number }> = {};
    for (const e of windowRef.current) {
      if (!votes[e.letter]) votes[e.letter] = { count: 0, totalConf: 0 };
      votes[e.letter].count++;
      votes[e.letter].totalConf += e.confidence;
    }
    let bestLetter: string | null = null, bestConf = 0, bestCount = 0;
    for (const [l, { count, totalConf }] of Object.entries(votes)) {
      if (count > bestCount || (count === bestCount && totalConf > bestConf)) {
        bestLetter = l; bestConf = totalConf / count; bestCount = count;
      }
    }
    return bestCount >= MIN_VOTES ? { letter: bestLetter, conf: bestConf } : null;
  }, []);

  const startWebSocket = useCallback((videoEl: HTMLVideoElement): Promise<boolean> => {
    return new Promise((resolve) => {
      const ws = new WebSocket(WS_URL);
      const timeout = setTimeout(() => { ws.close(); resolve(false); }, WS_TIMEOUT_MS);

      ws.onopen = () => {
        clearTimeout(timeout);
        wsRef.current = ws;

        ws.onmessage = (event) => {
          waitingRef.current = false;
          try {
            const result = JSON.parse(event.data);
            const lm: [number, number][] | null = result.landmarks?.length ? result.landmarks : null;

            if (!result.hand_detected) {
              windowRef.current = [];
              setState((s) => ({ ...s, handDetected: false, letter: null, confidence: 0, landmarks: null }));
              return;
            }

            const rawLetter = result.letter ?? null;
            const rawConf   = result.confidence ?? 0;
            const stable = rawLetter ? pushVote(rawLetter, rawConf) : null;

            setState((s) => ({
              ...s,
              handDetected: true,
              letter:       stable?.letter ?? null,
              confidence:   rawConf,
              landmarks:    lm,
            }));
          } catch { /* ignore */ }
        };

        ws.onclose = () => { wsRef.current = null; };

        intervalRef.current = setInterval(() => {
          if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
          const video = videoRef.current;
          if (!video || video.readyState < 2) return;
          if (waitingRef.current) return;

          const canvas = document.createElement('canvas');
          canvas.width  = video.videoWidth  || 320;
          canvas.height = video.videoHeight || 240;
          const ctx = canvas.getContext('2d');
          if (!ctx) return;
          ctx.drawImage(video, 0, 0);
          const b64 = canvas.toDataURL('image/jpeg', 0.7).replace(/^data:image\/jpeg;base64,/, '');
          waitingRef.current = true;
          wsRef.current.send(JSON.stringify({ frame: b64 }));
        }, DETECT_INTERVAL);

        resolve(true);
      };

      ws.onerror = () => { clearTimeout(timeout); ws.close(); resolve(false); };
    });
  }, [pushVote]);

  const startBrowserNative = useCallback(async (videoEl: HTMLVideoElement) => {
    setState((s) => ({ ...s, isModelLoading: true }));
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let landmarker: any;
    try {
      landmarker = await getBrowserLandmarker();
    } catch (err) {
      setState((s) => ({
        ...s,
        isModelLoading: false,
        error: err instanceof Error ? err.message : 'Failed to load hand model.',
      }));
      return;
    }
    setState((s) => ({ ...s, isModelLoading: false }));

    let lastTs = -1;
    intervalRef.current = setInterval(() => {
      const video = videoRef.current;
      if (!video || video.readyState < 2) return;
      const now = performance.now();
      if (now <= lastTs) return;
      lastTs = now;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const results: any = landmarker.detectForVideo(video, now);
      if (!results.landmarks || results.landmarks.length === 0) {
        windowRef.current = [];
        setState((s) => ({ ...s, handDetected: false, letter: null, confidence: 0, landmarks: null }));
        return;
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const rawLm = results.landmarks[0];
      const pts: [number, number][] = rawLm.map((p: { x: number; y: number }) => [p.x, p.y]);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const mirroredLm = rawLm.map((p: any) => ({ ...p, x: 1 - p.x }));
      const { letter, confidence } = classifyASLLetter(mirroredLm);

      const stable = letter && letter !== '?' ? pushVote(letter, confidence) : null;
      setState((s) => ({
        ...s,
        handDetected: true,
        letter:       stable?.letter ?? null,
        confidence:   confidence,
        landmarks:    pts,
      }));
    }, DETECT_INTERVAL);
  }, [pushVote]);

  const startDetection = useCallback(async (videoEl: HTMLVideoElement) => {
    videoRef.current = videoEl;
    windowRef.current = [];
    setState((s) => ({ ...s, isModelLoading: true, error: null }));

    const serverConnected = await startWebSocket(videoEl);
    if (!serverConnected) {
      await startBrowserNative(videoEl);
    } else {
      setState((s) => ({ ...s, isModelLoading: false }));
    }

    setIsRunning(true);
  }, [startWebSocket, startBrowserNative]);

  const stopDetection = useCallback(() => {
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
    if (wsRef.current) { wsRef.current.close(); wsRef.current = null; }
    videoRef.current   = null;
    windowRef.current  = [];
    waitingRef.current = false;
    setIsRunning(false);
    setState((s) => ({ ...s, handDetected: false, letter: null, confidence: 0, landmarks: null }));
  }, []);

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (wsRef.current) wsRef.current.close();
    };
  }, []);

  return { ...state, isRunning, startDetection, stopDetection };
}
