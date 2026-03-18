'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Hand, Info } from 'lucide-react';
import Header from '@/components/Header';
import WebcamCapture from '@/components/SignToText/WebcamCapture';
import RecognitionDisplay from '@/components/SignToText/RecognitionDisplay';
import { useWebcam } from '@/hooks/useWebcam';
import { useHandDetection } from '@/hooks/useHandDetection';

const STABLE_THRESHOLD = 3;
const COOLDOWN_FRAMES = 5;

export default function SignToTextPage() {
  const { videoRef, isReady, error: cameraError, startCamera, stopCamera } = useWebcam();

  const {
    letter,
    confidence,
    handDetected,
    isModelLoading,
    error: modelError,
    isRunning,
    startDetection,
    stopDetection,
    landmarks,
  } = useHandDetection();

  const [currentWord, setCurrentWord] = useState('');
  const [words, setWords] = useState<string[]>([]);

  const stableRef = useRef({ letter: '', count: 0, cooldown: 0 });
  const [stableProgress, setStableProgress] = useState(0);

  useEffect(() => {
    if (!handDetected || !letter) {
      stableRef.current = { letter: '', count: 0, cooldown: 0 };
      setStableProgress(0);
      return;
    }

    const s = stableRef.current;

    if (s.cooldown > 0) {
      s.cooldown -= 1;
      setStableProgress(0);
      return;
    }

    if (letter === s.letter) {
      s.count += 1;
    } else {
      s.letter = letter;
      s.count = 1;
    }

    const progress = Math.min(s.count / STABLE_THRESHOLD, 1);
    setStableProgress(progress);

    if (s.count >= STABLE_THRESHOLD) {
      setCurrentWord((w) => w + letter);
      s.count = 0;
      s.cooldown = COOLDOWN_FRAMES;
      setStableProgress(0);
    }
  }, [letter, handDetected]);

  const handleStart = useCallback(async () => {
    await startCamera();
    if (videoRef.current) {
      await startDetection(videoRef.current);
    }
  }, [startCamera, startDetection, videoRef]);

  useEffect(() => {
    if (isReady && !isRunning && videoRef.current) {
      startDetection(videoRef.current);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isReady]);

  const handleStop = useCallback(() => {
    stopDetection();
    stopCamera();
    stableRef.current = { letter: '', count: 0, cooldown: 0 };
    setStableProgress(0);
  }, [stopDetection, stopCamera]);

  const handleBackspace = useCallback(() => {
    setCurrentWord((w) => w.slice(0, -1));
  }, []);

  const handleConfirmLetter = useCallback(() => {
    if (!letter) return;
    setCurrentWord((w) => w + letter);
    stableRef.current = { letter: '', count: 0, cooldown: COOLDOWN_FRAMES };
    setStableProgress(0);
  }, [letter]);

  const handleSpace = useCallback(() => {
    if (!currentWord) return;
    setWords((ws) => [...ws, currentWord]);
    setCurrentWord('');
  }, [currentWord]);

  const handleClear = useCallback(() => {
    setCurrentWord('');
    setWords([]);
    stableRef.current = { letter: '', count: 0, cooldown: 0 };
    setStableProgress(0);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;
      if (e.key === 'Backspace') { e.preventDefault(); handleBackspace(); }
      if (e.key === ' ')         { e.preventDefault(); handleSpace(); }
      if (e.key === 'c' || e.key === 'C') { handleConfirmLetter(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [handleBackspace, handleSpace, handleConfirmLetter]);

  return (
    <div className="flex min-h-screen flex-col">
      <Header />

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <Link
            href="/"
            className="mb-4 inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-100"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Home
          </Link>

          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent-100 dark:bg-accent-900/40">
              <Hand className="h-6 w-6 text-accent-600 dark:text-accent-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white sm:text-3xl">
                Sign to Text
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Show ASL letters to your camera — we&apos;ll build the words
              </p>
            </div>
          </div>
        </div>

        <div className="mb-6 flex items-start gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800 dark:border-blue-800/50 dark:bg-blue-900/20 dark:text-blue-300">
          <Info className="mt-0.5 h-4 w-4 shrink-0" />
          <p>
            Sign letters one at a time — each is confirmed after ~1 second.
            Use <strong>Space</strong> to add word breaks and <strong>Backspace</strong> to correct mistakes.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <WebcamCapture
            videoRef={videoRef}
            isReady={isReady}
            isRunning={isRunning}
            isModelLoading={isModelLoading}
            handDetected={handDetected}
            cameraError={cameraError}
            modelError={modelError}
            landmarks={landmarks}
            onStart={handleStart}
            onStop={handleStop}
          />

          <RecognitionDisplay
            currentLetter={letter}
            confidence={confidence}
            handDetected={handDetected}
            stableProgress={stableProgress}
            currentWord={currentWord}
            words={words}
            onBackspace={handleBackspace}
            onSpace={handleSpace}
            onClear={handleClear}
            onConfirmLetter={handleConfirmLetter}
          />
        </div>

        <section className="mt-10 rounded-2xl border border-gray-200 bg-gray-50 p-5 dark:border-gray-700 dark:bg-gray-800/40">
          <h2 className="mb-3 text-sm font-semibold text-gray-700 dark:text-gray-300">
            How to use
          </h2>
          <ol className="space-y-1.5 text-sm text-gray-600 dark:text-gray-400">
            <li>
              <span className="mr-1 font-bold text-primary-600">1.</span>
              Click <strong>Start Recognition</strong> and allow camera access.
            </li>
            <li>
              <span className="mr-1 font-bold text-primary-600">2.</span>
              Hold an ASL letter sign steady — the ring fills as it stabilises (~1 s).
            </li>
            <li>
              <span className="mr-1 font-bold text-primary-600">3.</span>
              The letter is added automatically. Sign all letters without worrying about spaces.
            </li>
            <li>
              <span className="mr-1 font-bold text-primary-600">4.</span>
              <strong>Backspace</strong> removes the last letter, <strong>Space</strong> adds a word break, <strong>Clear</strong> resets everything.
            </li>
          </ol>
        </section>
      </main>

      <footer className="border-t border-gray-200 py-6 text-center text-xs text-gray-500 dark:border-gray-800 dark:text-gray-400">
        <p>SignBridge &mdash; Breaking communication barriers with sign language</p>
      </footer>
    </div>
  );
}
