'use client';

import { useState, useRef, useCallback } from 'react';

interface UseTranslationReturn {
  translate: (text: string, sourceLang: string) => Promise<string>;
  translatedText: string;
  isTranslating: boolean;
  error: string | null;
}

export function useTranslation(): UseTranslationReturn {
  const [translatedText, setTranslatedText] = useState('');
  const [isTranslating, setIsTranslating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cacheRef = useRef<Map<string, string>>(new Map());

  const translate = useCallback(
    (text: string, sourceLang: string): Promise<string> => {
      return new Promise((resolve, reject) => {
        if (debounceTimerRef.current) {
          clearTimeout(debounceTimerRef.current);
        }

        debounceTimerRef.current = setTimeout(async () => {
          if (!text.trim()) {
            setTranslatedText('');
            setError(null);
            resolve('');
            return;
          }

          const cacheKey = `${sourceLang}:${text}`;
          const cached = cacheRef.current.get(cacheKey);

          if (cached) {
            setTranslatedText(cached);
            setError(null);
            resolve(cached);
            return;
          }

          setIsTranslating(true);
          setError(null);

          try {
            const response = await fetch('/api/translate', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ text, sourceLang }),
            });

            if (!response.ok) {
              const errorData = await response.json().catch(() => ({}));
              throw new Error(
                errorData.message || `Translation failed with status ${response.status}`
              );
            }

            const data = await response.json();
            const result = data.translatedText as string;

            cacheRef.current.set(cacheKey, result);
            setTranslatedText(result);
            setIsTranslating(false);
            resolve(result);
          } catch (err) {
            const message =
              err instanceof Error ? err.message : 'An unexpected translation error occurred';
            setError(message);
            setIsTranslating(false);
            reject(new Error(message));
          }
        }, 300);
      });
    },
    []
  );

  return {
    translate,
    translatedText,
    isTranslating,
    error,
  };
}
