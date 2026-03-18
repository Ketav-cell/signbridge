'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import type { SignSequenceItem } from '@/types';

interface UseSignPlayerReturn {
  currentIndex: number;
  currentSign: SignSequenceItem | null;
  isPlaying: boolean;
  play: () => void;
  pause: () => void;
  togglePlay: () => void;
  next: () => void;
  prev: () => void;
  goToIndex: (index: number) => void;
  reset: () => void;
  progress: number;
}

export function useSignPlayer(
  signSequence: SignSequenceItem[],
  speed: number = 1,
  isLooping: boolean = false
): UseSignPlayerReturn {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [letterIndex, setLetterIndex] = useState(0);

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isPlayingRef = useRef(false);
  const currentIndexRef = useRef(0);
  const letterIndexRef = useRef(0);

  const currentSign = signSequence.length > 0 ? signSequence[currentIndex] ?? null : null;

  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const advance = useCallback(() => {
    if (!isPlayingRef.current || signSequence.length === 0) return;

    const sign = signSequence[currentIndexRef.current];
    if (!sign) return;

    if (sign.signType === 'fingerspell' && sign.letters && sign.letters.length > 0) {
      const nextLetterIndex = letterIndexRef.current + 1;
      if (nextLetterIndex < sign.letters.length) {
        letterIndexRef.current = nextLetterIndex;
        setLetterIndex(nextLetterIndex);

        const letterDuration = (sign.duration / sign.letters.length) / speed;
        timerRef.current = setTimeout(advance, letterDuration);
        return;
      }
    }

    const nextIndex = currentIndexRef.current + 1;

    if (nextIndex < signSequence.length) {
      currentIndexRef.current = nextIndex;
      letterIndexRef.current = 0;
      setCurrentIndex(nextIndex);
      setLetterIndex(0);

      const nextSign = signSequence[nextIndex];
      const duration = (nextSign.duration / speed);
      if (nextSign.signType === 'fingerspell' && nextSign.letters && nextSign.letters.length > 0) {
        timerRef.current = setTimeout(advance, (nextSign.duration / nextSign.letters.length) / speed);
      } else {
        timerRef.current = setTimeout(advance, duration);
      }
    } else if (isLooping) {
      currentIndexRef.current = 0;
      letterIndexRef.current = 0;
      setCurrentIndex(0);
      setLetterIndex(0);

      const firstSign = signSequence[0];
      const duration = (firstSign.duration / speed);
      if (firstSign.signType === 'fingerspell' && firstSign.letters && firstSign.letters.length > 0) {
        timerRef.current = setTimeout(advance, (firstSign.duration / firstSign.letters.length) / speed);
      } else {
        timerRef.current = setTimeout(advance, duration);
      }
    } else {
      isPlayingRef.current = false;
      setIsPlaying(false);
    }
  }, [signSequence, speed, isLooping]);

  const play = useCallback(() => {
    if (signSequence.length === 0) return;

    clearTimer();
    isPlayingRef.current = true;
    setIsPlaying(true);

    const sign = signSequence[currentIndexRef.current];
    if (!sign) return;

    let duration: number;
    if (sign.signType === 'fingerspell' && sign.letters && sign.letters.length > 0) {
      duration = (sign.duration / sign.letters.length) / speed;
    } else {
      duration = sign.duration / speed;
    }

    timerRef.current = setTimeout(advance, duration);
  }, [signSequence, speed, advance, clearTimer]);

  const pause = useCallback(() => {
    clearTimer();
    isPlayingRef.current = false;
    setIsPlaying(false);
  }, [clearTimer]);

  const togglePlay = useCallback(() => {
    if (isPlayingRef.current) {
      pause();
    } else {
      play();
    }
  }, [play, pause]);

  const next = useCallback(() => {
    if (signSequence.length === 0) return;

    clearTimer();
    const nextIndex = currentIndexRef.current + 1;

    if (nextIndex < signSequence.length) {
      currentIndexRef.current = nextIndex;
      letterIndexRef.current = 0;
      setCurrentIndex(nextIndex);
      setLetterIndex(0);
    } else if (isLooping) {
      currentIndexRef.current = 0;
      letterIndexRef.current = 0;
      setCurrentIndex(0);
      setLetterIndex(0);
    }

    if (isPlayingRef.current) {
      const sign = signSequence[currentIndexRef.current];
      if (sign) {
        const duration = sign.signType === 'fingerspell' && sign.letters && sign.letters.length > 0
          ? (sign.duration / sign.letters.length) / speed
          : sign.duration / speed;
        timerRef.current = setTimeout(advance, duration);
      }
    }
  }, [signSequence, speed, isLooping, advance, clearTimer]);

  const prev = useCallback(() => {
    if (signSequence.length === 0) return;

    clearTimer();
    const prevIndex = currentIndexRef.current - 1;

    if (prevIndex >= 0) {
      currentIndexRef.current = prevIndex;
      letterIndexRef.current = 0;
      setCurrentIndex(prevIndex);
      setLetterIndex(0);
    } else if (isLooping) {
      currentIndexRef.current = signSequence.length - 1;
      letterIndexRef.current = 0;
      setCurrentIndex(signSequence.length - 1);
      setLetterIndex(0);
    }

    if (isPlayingRef.current) {
      const sign = signSequence[currentIndexRef.current];
      if (sign) {
        const duration = sign.signType === 'fingerspell' && sign.letters && sign.letters.length > 0
          ? (sign.duration / sign.letters.length) / speed
          : sign.duration / speed;
        timerRef.current = setTimeout(advance, duration);
      }
    }
  }, [signSequence, speed, isLooping, advance, clearTimer]);

  const goToIndex = useCallback(
    (index: number) => {
      if (index < 0 || index >= signSequence.length) return;

      clearTimer();
      currentIndexRef.current = index;
      letterIndexRef.current = 0;
      setCurrentIndex(index);
      setLetterIndex(0);

      if (isPlayingRef.current) {
        const sign = signSequence[index];
        if (sign) {
          const duration = sign.signType === 'fingerspell' && sign.letters && sign.letters.length > 0
            ? (sign.duration / sign.letters.length) / speed
            : sign.duration / speed;
          timerRef.current = setTimeout(advance, duration);
        }
      }
    },
    [signSequence, speed, advance, clearTimer]
  );

  const reset = useCallback(() => {
    clearTimer();
    isPlayingRef.current = false;
    currentIndexRef.current = 0;
    letterIndexRef.current = 0;
    setIsPlaying(false);
    setCurrentIndex(0);
    setLetterIndex(0);
  }, [clearTimer]);

  const progress = signSequence.length > 0 ? currentIndex / signSequence.length : 0;

  useEffect(() => {
    return () => {
      clearTimer();
    };
  }, [clearTimer]);

  useEffect(() => {
    reset();
  }, [signSequence, reset]);

  return {
    currentIndex,
    currentSign,
    isPlaying,
    play,
    pause,
    togglePlay,
    next,
    prev,
    goToIndex,
    reset,
    progress,
  };
}
