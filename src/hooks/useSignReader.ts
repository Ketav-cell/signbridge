import { useRef, useState, useCallback, useEffect } from 'react';

export interface RecognitionResult {
  letter: string | null;
  confidence: number;
  handDetected: boolean;
}

interface UseSignReaderReturn {
  result: RecognitionResult;
  isConnected: boolean;
  isRunning: boolean;
  connectionError: string | null;
  startRecognition: (videoEl: HTMLVideoElement) => void;
  stopRecognition: () => void;
}

const WS_URL =
  (typeof process !== 'undefined' &&
    process.env.NEXT_PUBLIC_INFERENCE_WS_URL) ||
  'ws://localhost:8000/ws';

const FRAME_INTERVAL = 150;

const JPEG_QUALITY = 0.7;

export function useSignReader(): UseSignReaderReturn {
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

  const captureAndSend = useCallback((videoEl: HTMLVideoElement) => {
    if (wsRef.current?.readyState !== WebSocket.OPEN) return;
    if (!videoEl.videoWidth) return;

    if (!offscreenCanvas.current) {
      offscreenCanvas.current = document.createElement('canvas');
    }
    const canvas = offscreenCanvas.current;
    canvas.width = videoEl.videoWidth;
    canvas.height = videoEl.videoHeight;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(videoEl, 0, 0);

    const dataUrl = canvas.toDataURL('image/jpeg', JPEG_QUALITY);
    const base64 = dataUrl.split(',')[1];

    wsRef.current.send(JSON.stringify({ frame: base64 }));
  }, []);

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
