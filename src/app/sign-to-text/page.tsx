'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Info } from 'lucide-react';
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
    <div className="flex min-h-screen flex-col pb-10">
      <Header />

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6 lg:px-8">
        <div className="surface-panel p-6 sm:p-8">
          <Link
            href="/"
            className="mb-6 inline-flex items-center gap-1.5 text-sm text-gray-500 transition-colors hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Home
          </Link>

          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="max-w-2xl">
              <h1 className="section-title">ASL to Text</h1>
              <p className="section-copy mt-3">
                All recognition controls, keyboard shortcuts, stabilisation logic, and manual corrections stay intact — only the visual language is now cleaner and calmer.
              </p>
            </div>
            <div className="surface-subtle flex items-start gap-2 px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-sky-500" />
              <p>
                Sign letters one at a time. Use <strong>Space</strong> for word breaks, <strong>Backspace</strong> to remove the last letter, and <strong>C</strong> to confirm the current prediction instantly.
              </p>
            </div>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
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

        <section className="surface-panel mt-6 p-5 sm:p-6">
          <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-gray-400 dark:text-gray-500">
            How to use
          </h2>
          <ol className="mt-4 grid gap-3 md:grid-cols-2">
            {[
              'Click Start Recognition and allow camera access.',
              'Hold an ASL letter sign steady while the progress ring fills.',
              'Letters are added automatically once stable; use C to confirm sooner.',
              'Use Backspace, Space, or Clear to edit your output at any time.',
            ].map((step, index) => (
              <li key={step} className="surface-subtle flex gap-3 px-4 py-4 text-sm text-gray-600 dark:text-gray-300">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-950 text-xs font-semibold text-white dark:bg-white dark:text-slate-950">
                  {index + 1}
                </span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
        </section>
      </main>

      <footer className="mt-6 px-4 text-center text-xs text-gray-500 dark:text-gray-400">
        <p>SignBridge &mdash; Breaking communication barriers with sign language</p>
      </footer>
    </div>
  );
}
