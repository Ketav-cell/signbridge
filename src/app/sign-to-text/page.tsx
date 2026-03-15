'use client';

/**
 * /sign-to-text
 *
 * Real-time sign language → text page.
 *
 * Data flow:
 *  1. useWebcam      → getUserMedia → attaches stream to <video>
 *  2. useSignRecognition → every 150ms captures a frame from <video>,
 *                          sends base64 JPEG over WebSocket to inference server
 *  3. inference server   → MediaPipe detects 21 hand landmarks
 *                          → CNN predicts letter (A-Z) + confidence
 *  4. result back to hook → page state updates
 *  5. "stable letter" logic: same letter held for STABLE_THRESHOLD frames
 *     → letter appended to currentWord (with cooldown to prevent spamming)
 *  6. Space button → moves currentWord into words[]
 *     Backspace    → removes last char from currentWord
 *     Clear        → resets everything
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Hand, Info } from 'lucide-react';
import Header from '@/components/Header';
import WebcamCapture from '@/components/SignToText/WebcamCapture';
import RecognitionDisplay from '@/components/SignToText/RecognitionDisplay';
import { useWebcam } from '@/hooks/useWebcam';
import { useSignRecognition } from '@/hooks/useSignRecognition';

// ── Letter-stability settings ────────────────────────────────────────────────
/** How many consecutive matching detections before we commit a letter. */
const STABLE_THRESHOLD = 6; // ~900 ms at 150 ms/frame
/** Cooldown frames after committing a letter before the next one can be added. */
const COOLDOWN_FRAMES = 8; // ~1.2 s

export default function SignToTextPage() {
  // Webcam
  const { videoRef, isReady, error: cameraError, startCamera, stopCamera } =
    useWebcam();

  // Sign recognition
  const {
    result,
    isConnected,
    isRunning,
    connectionError,
    startRecognition,
    stopRecognition,
  } = useSignRecognition();

  // Word builder state
  const [currentWord, setCurrentWord] = useState('');
  const [words, setWords] = useState<string[]>([]);

  // Stability tracking (not in React state — updated every frame)
  const stableRef = useRef({ letter: '', count: 0, cooldown: 0 });
  const [stableProgress, setStableProgress] = useState(0);

  // ── Letter stability logic ──────────────────────────────────────────────
  useEffect(() => {
    const { letter, handDetected } = result;

    if (!handDetected || !letter) {
      stableRef.current = { letter: '', count: 0, cooldown: 0 };
      setStableProgress(0);
      return;
    }

    const s = stableRef.current;

    // Decrement cooldown if active
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
      // Commit the letter
      setCurrentWord((w) => w + letter);
      s.count = 0;
      s.cooldown = COOLDOWN_FRAMES;
      setStableProgress(0);
    }
  }, [result]);

  // ── Controls ────────────────────────────────────────────────────────────
  const handleStart = useCallback(async () => {
    await startCamera();
    if (videoRef.current) {
      startRecognition(videoRef.current);
    }
  }, [startCamera, startRecognition, videoRef]);

  const handleStop = useCallback(() => {
    stopRecognition();
    stopCamera();
    stableRef.current = { letter: '', count: 0, cooldown: 0 };
    setStableProgress(0);
  }, [stopRecognition, stopCamera]);

  // Start recognition once video is ready (handles async delay between
  // startCamera resolving and the video element being populated)
  useEffect(() => {
    if (isReady && isRunning === false && videoRef.current) {
      startRecognition(videoRef.current);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isReady]);

  const handleBackspace = useCallback(() => {
    setCurrentWord((w) => w.slice(0, -1));
  }, []);

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

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="flex min-h-screen flex-col">
      <Header />

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6 lg:px-8">
        {/* ── Page header ── */}
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

        {/* ── Info banner ── */}
        <div className="mb-6 flex items-start gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800 dark:border-blue-800/50 dark:bg-blue-900/20 dark:text-blue-300">
          <Info className="mt-0.5 h-4 w-4 shrink-0" />
          <p>
            Hold each letter sign steady for ~1 second to confirm it.
            Press <strong>Space</strong> to finish a word.
            The inference server must be running on port&nbsp;8000.
          </p>
        </div>

        {/* ── Main two-column layout ── */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Left: webcam */}
          <WebcamCapture
            videoRef={videoRef}
            isReady={isReady}
            isRunning={isRunning}
            isConnected={isConnected}
            handDetected={result.handDetected}
            cameraError={cameraError}
            connectionError={connectionError}
            onStart={handleStart}
            onStop={handleStop}
          />

          {/* Right: recognition output */}
          <RecognitionDisplay
            currentLetter={result.letter}
            confidence={result.confidence}
            handDetected={result.handDetected}
            stableProgress={stableProgress}
            currentWord={currentWord}
            words={words}
            onBackspace={handleBackspace}
            onSpace={handleSpace}
            onClear={handleClear}
          />
        </div>

        {/* ── How to use ── */}
        <section className="mt-10 rounded-2xl border border-gray-200 bg-gray-50 p-5 dark:border-gray-700 dark:bg-gray-800/40">
          <h2 className="mb-3 text-sm font-semibold text-gray-700 dark:text-gray-300">
            How to use
          </h2>
          <ol className="space-y-1.5 text-sm text-gray-600 dark:text-gray-400">
            <li>
              <span className="mr-1 font-bold text-primary-600">1.</span>
              Make sure the inference server is running:{' '}
              <code className="rounded bg-gray-200 px-1.5 py-0.5 text-xs dark:bg-gray-700">
                cd inference &amp;&amp; uvicorn server:app --port 8000
              </code>
            </li>
            <li>
              <span className="mr-1 font-bold text-primary-600">2.</span>
              Click <strong>Start Recognition</strong> and allow camera access.
            </li>
            <li>
              <span className="mr-1 font-bold text-primary-600">3.</span>
              Hold an ASL letter sign steady — the ring fills as it stabilises (~1 s).
            </li>
            <li>
              <span className="mr-1 font-bold text-primary-600">4.</span>
              The letter is added automatically. Press <strong>Space</strong> to finish a word.
            </li>
            <li>
              <span className="mr-1 font-bold text-primary-600">5.</span>
              Use <strong>Backspace</strong> to undo the last letter,{' '}
              <strong>Clear</strong> to start over.
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
