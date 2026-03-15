import { useRef, useState, useCallback, useEffect } from 'react';

export interface RecognitionResult {
  letter: string | null;
  confidence: number;
  handDetected: boolean;
}

interface UseSignRecognitionReturn {
  result: RecognitionResult;
  isConnected: boolean;
  isRunning: boolean;
  connectionError: string | null;
  startRecognition: (videoEl: HTMLVideoElement) => void;
  stopRecognition: () => void;
}

/**
 * Connects to the Python FastAPI WebSocket inference server.
 * Every FRAME_INTERVAL ms it captures a frame from the <video> element,
 * encodes it as base64 JPEG, sends it to the server, and receives:
 *   { hand_detected: bool, letter: string|null, confidence: float }
 *
 * The WebSocket URL defaults to ws://localhost:8000/ws but can be
 * overridden via NEXT_PUBLIC_INFERENCE_WS_URL in .env.local.
 */

const WS_URL =
  (typeof process !== 'undefined' &&
    process.env.NEXT_PUBLIC_INFERENCE_WS_URL) ||
  'ws://localhost:8000/ws';

/** How often we send a frame (ms). 150ms ≈ 6-7 FPS — fast enough for letters. */
const FRAME_INTERVAL = 150;

/** JPEG quality (0–1). Lower = smaller payload, faster round-trip. */
const JPEG_QUALITY = 0.7;

export function useSignRecognition(): UseSignRecognitionReturn {
  const wsRef = useRef<WebSocket | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const offscreenCanvas = useRef<HTMLCanvasElement | null>(null);

  const [isRunning, setIsRunning] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [result, setResult] = useState<RecognitionResult>({
    letter: null,
    confidence: 0,
    handDetected: false,
  });

  // -----------------------------------------------------------------------
  // WebSocket helpers
  // -----------------------------------------------------------------------

  const openWebSocket = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;

    ws.onopen = () => {
      setIsConnected(true);
      setConnectionError(null);
    };

    ws.onmessage = (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data as string);
        setResult({
          letter: data.letter ?? null,
          confidence: data.confidence ?? 0,
          handDetected: data.hand_detected ?? false,
        });
      } catch {
        // Ignore malformed messages
      }
    };

    ws.onerror = () => {
      setConnectionError(
        'Cannot reach the inference server. Make sure it is running on port 8000.'
      );
    };

    ws.onclose = () => {
      setIsConnected(false);
    };
  }, []);

  // -----------------------------------------------------------------------
  // Frame capture + send
  // -----------------------------------------------------------------------

  const captureAndSend = useCallback((videoEl: HTMLVideoElement) => {
    if (wsRef.current?.readyState !== WebSocket.OPEN) return;
    if (!videoEl.videoWidth) return;

    // Reuse a single offscreen canvas to avoid repeated allocation
    if (!offscreenCanvas.current) {
      offscreenCanvas.current = document.createElement('canvas');
    }
    const canvas = offscreenCanvas.current;
    canvas.width = videoEl.videoWidth;
    canvas.height = videoEl.videoHeight;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(videoEl, 0, 0);

    // Strip the "data:image/jpeg;base64," prefix — server only wants the raw b64
    const dataUrl = canvas.toDataURL('image/jpeg', JPEG_QUALITY);
    const base64 = dataUrl.split(',')[1];

    wsRef.current.send(JSON.stringify({ frame: base64 }));
  }, []);

  // -----------------------------------------------------------------------
  // Public API
  // -----------------------------------------------------------------------

  const startRecognition = useCallback(
    (videoEl: HTMLVideoElement) => {
      openWebSocket();
      setIsRunning(true);

      intervalRef.current = setInterval(() => {
        captureAndSend(videoEl);
      }, FRAME_INTERVAL);
    },
    [openWebSocket, captureAndSend]
  );

  const stopRecognition = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    wsRef.current?.close();
    wsRef.current = null;
    setIsRunning(false);
    setIsConnected(false);
    setResult({ letter: null, confidence: 0, handDetected: false });
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      wsRef.current?.close();
    };
  }, []);

  return {
    result,
    isConnected,
    isRunning,
    connectionError,
    startRecognition,
    stopRecognition,
  };
}
