'use client';

import React from 'react';
import { Delete, Space, RotateCcw, Sparkles, Loader2, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface RecognitionDisplayProps {
  currentLetter: string | null;
  confidence: number;
  handDetected: boolean;
  stableProgress: number;
  currentWord: string;
  words: string[];
  interpreted: string | null;
  isInterpreting: boolean;
  onBackspace: () => void;
  onSpace: () => void;
  onClear: () => void;
  onInterpret: () => void;
  onConfirmLetter: () => void;
}

export default function RecognitionDisplay({
  currentLetter,
  confidence,
  handDetected,
  stableProgress,
  currentWord,
  words,
  interpreted,
  isInterpreting,
  onBackspace,
  onSpace,
  onClear,
  onInterpret,
  onConfirmLetter,
}: RecognitionDisplayProps) {
  const rawLetters = words.join('') + currentWord;
  const circumference = 2 * Math.PI * 36;

  return (
    <div className="flex flex-col gap-5">
      {/* ── Current letter card ───────────────────────────────────────── */}
      <div className="flex flex-col items-center gap-4 rounded-2xl border border-gray-200 bg-white px-6 py-8 dark:border-gray-700 dark:bg-gray-800">
        {/* Circular progress ring + letter */}
        <div className="relative flex h-28 w-28 items-center justify-center">
          <svg className="absolute inset-0 -rotate-90" viewBox="0 0 80 80">
            <circle
              cx="40" cy="40" r="36"
              fill="none" stroke="currentColor" strokeWidth="5"
              className="text-gray-200 dark:text-gray-700"
            />
            <circle
              cx="40" cy="40" r="36"
              fill="none" stroke="currentColor" strokeWidth="5"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={circumference * (1 - stableProgress)}
              className="text-primary-500 transition-all duration-100"
            />
          </svg>

          <AnimatePresence mode="wait">
            <motion.span
              key={currentLetter ?? 'empty'}
              className={cn(
                'text-5xl font-bold tabular-nums',
                currentLetter && handDetected
                  ? 'text-gray-900 dark:text-white'
                  : 'text-gray-300 dark:text-gray-600'
              )}
              initial={{ scale: 0.7, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.7, opacity: 0 }}
              transition={{ duration: 0.12 }}
            >
              {currentLetter ?? '—'}
            </motion.span>
          </AnimatePresence>
        </div>

        {/* Confidence bar */}
        <div className="w-full max-w-[180px] space-y-1">
          <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
            <span>Confidence</span>
            <span>{Math.round(confidence * 100)}%</span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
            <div
              className="h-full rounded-full bg-primary-500 transition-all duration-150"
              style={{ width: `${confidence * 100}%` }}
            />
          </div>
        </div>

        {!handDetected && (
          <p className="text-xs text-gray-400 dark:text-gray-500">
            Show your hand to the camera
          </p>
        )}
        {handDetected && stableProgress < 1 && (
          <p className="text-xs text-gray-400 dark:text-gray-500">
            Hold still — or tap the button below
          </p>
        )}

        {/* Manual confirm — no need to hold steady */}
        <Button
          size="sm"
          variant="outline"
          onClick={onConfirmLetter}
          disabled={!currentLetter || !handDetected}
          className="gap-1.5 text-xs"
          title="Add this letter now (key: C)"
        >
          <Check className="h-3.5 w-3.5" />
          Confirm &ldquo;{currentLetter ?? '?'}&rdquo; (C)
        </Button>
      </div>

      {/* ── Raw letter stream ──────────────────────────────────────────── */}
      <div className="rounded-2xl border border-gray-200 bg-white px-5 py-4 dark:border-gray-700 dark:bg-gray-800">
        <p className="mb-1.5 text-xs font-medium text-gray-500 dark:text-gray-400">
          Signed letters
        </p>
        <div className="flex min-h-[2.5rem] flex-wrap gap-1">
          {rawLetters.length === 0 ? (
            <span className="text-sm text-gray-300 dark:text-gray-600">
              (start signing…)
            </span>
          ) : (
            rawLetters.split('').map((ch, i) => (
              <motion.span
                key={i}
                className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-100 text-sm font-bold text-primary-700 dark:bg-primary-900/50 dark:text-primary-300"
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.15 }}
              >
                {ch}
              </motion.span>
            ))
          )}
        </div>
      </div>

      {/* ── Action buttons ────────────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={onBackspace}
          disabled={rawLetters.length === 0}
          className="gap-1.5"
          title="Delete last letter (Backspace)"
        >
          <Delete className="h-4 w-4" />
          Back
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={onSpace}
          disabled={rawLetters.length === 0}
          className="gap-1.5"
          title="Manual word break (Space)"
        >
          <Space className="h-4 w-4" />
          Space
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={onClear}
          className="gap-1.5"
          title="Clear everything"
        >
          <RotateCcw className="h-4 w-4" />
          Clear
        </Button>
      </div>

      {/* ── Interpret button ──────────────────────────────────────────── */}
      <Button
        onClick={onInterpret}
        disabled={rawLetters.length === 0 || isInterpreting}
        className="w-full gap-2"
        title="Let AI add spaces and figure out the words (Enter)"
      >
        {isInterpreting ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Interpreting…
          </>
        ) : (
          <>
            <Sparkles className="h-4 w-4" />
            Interpret with AI
          </>
        )}
      </Button>

      {/* ── AI interpreted result ─────────────────────────────────────── */}
      <AnimatePresence>
        {interpreted && (
          <motion.div
            className="rounded-2xl border border-primary-200 bg-primary-50 px-5 py-4 dark:border-primary-800/50 dark:bg-primary-900/20"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
          >
            <p className="mb-1 text-xs font-medium text-primary-600 dark:text-primary-400">
              AI interpretation
            </p>
            <p className="text-lg font-semibold text-gray-900 dark:text-white">
              {interpreted}
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Manual sentence (if user used Space) ─────────────────────── */}
      {words.length > 0 && (
        <div className="rounded-2xl border border-gray-200 bg-white px-5 py-4 dark:border-gray-700 dark:bg-gray-800">
          <p className="mb-1.5 text-xs font-medium text-gray-500 dark:text-gray-400">
            Manual words
          </p>
          <p className="text-base leading-relaxed text-gray-900 dark:text-white">
            {words.join(' ')}
            {currentWord && <span className="text-primary-500"> {currentWord}</span>}
            <span className="ml-0.5 inline-block h-4 w-0.5 animate-pulse bg-primary-500" />
          </p>
        </div>
      )}
    </div>
  );
}
