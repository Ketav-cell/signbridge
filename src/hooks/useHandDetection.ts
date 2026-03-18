/**
 * useHandDetection
 *
 * Sends webcam frames to the Python inference server (ws://localhost:8000/ws)
 * which runs the CNN skeleton-based hand-sign classifier from:
 * Sign-Language-To-Text-and-Speech-Conversion
 *
 * Data flow:
 *  <video> element (webcam)
 *    → every DETECT_INTERVAL ms, draw frame onto offscreen <canvas>
 *    → toDataURL('image/jpeg') → base64
 *    → send to WebSocket server
 *    → receive { hand_detected, letter, confidence }
 *    → majority-vote sliding window → stable letter emitted
 *    → state update → UI re-render
 *
 * Falls back gracefully if the server is not reachable.
 */

import { useRef, useState, useCallback, useEffect } from 'react';

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

// Keep these types for backward compatibility with aslClassifier imports
export type { ClassifyResult, Landmark } from '@/lib/aslClassifier';

const DETECT_INTERVAL = 120;   // ms between frames sent to server
const MIN_CONFIDENCE  = 0.30;  // minimum confidence to count a vote
const WINDOW_SIZE     = 7;     // sliding window size
const MIN_VOTES       = 4;     // minimum agreeing votes to emit a letter

const WS_URL = 'ws://localhost:8000/ws';

export function useHandDetection(): UseHandDetectionReturn {
  const videoRef     = useRef<HTMLVideoElement | null>(null);
  const canvasRef    = useRef<HTMLCanvasElement | null>(null);
  const wsRef        = useRef<WebSocket | null>(null);
  const intervalRef  = useRef<ReturnType<typeof setInterval> | null>(null);
  const waitingRef   = useRef(false); // prevent overlapping requests

  // Sliding window buffer for majority-vote smoothing
  const windowRef = useRef<{ letter: string; confidence: number }[]>([]);

  const [isRunning, setIsRunning]   = useState(false);
  const [state, setState] = useState<HandDetectionState>({
    letter:         null,
    confidence:     0,
    handDetected:   false,
    isModelLoading: false,
    error:          null,
  });

  // Connect WebSocket
  const connectWS = useCallback((): Promise<WebSocket> => {
    return new Promise((resolve, reject) => {
      const ws = new WebSocket(WS_URL);
      ws.onopen = () => resolve(ws);
      ws.onerror = () => reject(new Error('Cannot connect to inference server at ' + WS_URL));
      ws.onclose = () => {
        wsRef.current = null;
      };
    });
  }, []);

  const startDetection = useCallback(
    async (videoEl: HTMLVideoElement) => {
      videoRef.current = videoEl;
      setState((s) => ({ ...s, isModelLoading: true, error: null }));

      // Create offscreen canvas for frame capture
      if (!canvasRef.current) {
        canvasRef.current = document.createElement('canvas');
      }

      try {
        const ws = await connectWS();
        wsRef.current = ws;
        setState((s) => ({ ...s, isModelLoading: false }));

        // Handle incoming messages
        ws.onmessage = (event) => {
          waitingRef.current = false;
          try {
            const result: { hand_detected: boolean; letter?: string | null; confidence?: number } =
              JSON.parse(event.data);

            if (!result.hand_detected) {
              windowRef.current = [];
              setState((s) => ({ ...s, handDetected: false, letter: null, confidence: 0 }));
              return;
            }

            const letter     = result.letter ?? null;
            const confidence = result.confidence ?? 0;

            if (letter && confidence >= MIN_CONFIDENCE) {
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
            let bestConf   = 0;
            let bestCount  = 0;
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
              confidence:   stableLetter ? bestConf : 0,
            }));
          } catch {
            // ignore malformed messages
          }
        };

        windowRef.current = [];
        setIsRunning(true);

        // Frame capture loop
        intervalRef.current = setInterval(() => {
          if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
          if (!videoRef.current || videoRef.current.readyState < 2) return;
          if (waitingRef.current) return; // skip frame if server hasn't responded yet

          const video  = videoRef.current;
          const canvas = canvasRef.current!;
          canvas.width  = video.videoWidth  || 320;
          canvas.height = video.videoHeight || 240;

          const ctx = canvas.getContext('2d');
          if (!ctx) return;
          ctx.drawImage(video, 0, 0);

          // Strip the data-URL prefix
          const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
          const b64 = dataUrl.replace(/^data:image\/jpeg;base64,/, '');

          waitingRef.current = true;
          wsRef.current.send(JSON.stringify({ frame: b64 }));
        }, DETECT_INTERVAL);

      } catch (err) {
        setState((s) => ({
          ...s,
          isModelLoading: false,
          error: err instanceof Error
            ? `${err.message} — start the inference server with: cd inference && uvicorn server:app --port 8000`
            : 'Failed to connect to inference server.',
        }));
      }
    },
    [connectWS]
  );

  const stopDetection = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    videoRef.current  = null;
    windowRef.current = [];
    waitingRef.current = false;
    setIsRunning(false);
    setState((s) => ({ ...s, handDetected: false, letter: null, confidence: 0 }));
  }, []);

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (wsRef.current) wsRef.current.close();
    };
  }, []);

  return { ...state, isRunning, startDetection, stopDetection };
}
