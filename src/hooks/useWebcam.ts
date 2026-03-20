import { useRef, useState, useCallback, useEffect } from 'react';

interface UseWebcamReturn {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  isReady: boolean;
  error: string | null;
  startCamera: () => Promise<void>;
  stopCamera: () => void;
}

export function useWebcam(): UseWebcamReturn {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startCamera = useCallback(async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user',
        },
        audio: false,
      });
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute('playsinline', 'true');
        try {
          await videoRef.current.play();
        } catch {
          await new Promise<void>((resolve) => {
            if (!videoRef.current) return resolve();
            videoRef.current.oncanplay = async () => {
              await videoRef.current!.play();
              resolve();
            };
          });
        }
        setIsReady(true);
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === 'NotAllowedError') {
        setError('Camera access was denied. Please allow camera permissions in your browser.');
      } else if (err instanceof DOMException && err.name === 'OverconstrainedError') {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: 'user' },
            audio: false,
          });
          streamRef.current = stream;
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            videoRef.current.setAttribute('playsinline', 'true');
            await videoRef.current.play();
            setIsReady(true);
          }
        } catch (e) {
          setError(e instanceof Error ? e.message : 'Failed to access camera.');
        }
      } else {
        setError(err instanceof Error ? err.message : 'Failed to access camera.');
      }
    }
  }, []);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsReady(false);
  }, []);

  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  return { videoRef, isReady, error, startCamera, stopCamera };
}
