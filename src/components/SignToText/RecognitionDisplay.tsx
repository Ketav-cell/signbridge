'use client';

import React from 'react';
import { Delete, Space, RotateCcw, Check } from 'lucide-react';
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
  onBackspace: () => void;
  onSpace: () => void;
  onClear: () => void;
  onConfirmLetter: () => void;
}

export default function RecognitionDisplay({
  currentLetter,
  confidence,
  handDetected,
  stableProgress,
  currentWord,
  words,
  onBackspace,
  onSpace,
  onClear,
  onConfirmLetter,
}: RecognitionDisplayProps) {
  const rawLetters = words.join('') + currentWord;
  const circumference = 2 * Math.PI * 36;

  return (
    <div className="flex flex-col gap-5">
      <div className="surface-panel flex flex-col items-center gap-5 px-6 py-8">
        <div className="relative flex h-32 w-32 items-center justify-center">
          <svg className="absolute inset-0 -rotate-90" viewBox="0 0 80 80">
            <circle cx="40" cy="40" r="36" fill="none" stroke="currentColor" strokeWidth="4.5" className="text-gray-200 dark:text-gray-700" />
            <circle
              cx="40"
              cy="40"
              r="36"
              fill="none"
              stroke="currentColor"
              strokeWidth="4.5"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={circumference * (1 - stableProgress)}
              className="text-sky-500 transition-all duration-100"
            />
          </svg>

          <AnimatePresence mode="wait">
            <motion.span
              key={currentLetter ?? 'empty'}
              className={cn(
                'text-6xl font-semibold tracking-[-0.06em] tabular-nums',
                currentLetter && handDetected ? 'text-gray-950 dark:text-white' : 'text-gray-300 dark:text-gray-600'
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

        <div className="w-full max-w-[220px] space-y-2">
          <div className="flex justify-between text-xs font-medium uppercase tracking-[0.18em] text-gray-400 dark:text-gray-500">
            <span>Confidence</span>
            <span>{Math.round(confidence * 100)}%</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
            <div className="h-full rounded-full bg-slate-950 transition-all duration-150 dark:bg-white" style={{ width: `${confidence * 100}%` }} />
          </div>
        </div>

        <div className="text-center text-xs text-gray-400 dark:text-gray-500">
          {!handDetected && <p>Show your hand to the camera.</p>}
          {handDetected && stableProgress < 1 && <p>Hold still or confirm manually.</p>}
          {handDetected && stableProgress >= 1 && <p>Letter captured.</p>}
        </div>

        <Button
          size="sm"
          variant="outline"
          onClick={onConfirmLetter}
          disabled={!currentLetter || !handDetected}
          className="gap-1.5"
          title="Add this letter now (key: C)"
        >
          <Check className="h-3.5 w-3.5" />
          Confirm &ldquo;{currentLetter ?? '?'}&rdquo; (C)
        </Button>
      </div>

      <div className="surface-panel px-5 py-4">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400 dark:text-gray-500">
          Signed letters
        </p>
        <div className="mt-3 flex min-h-[2.5rem] flex-wrap gap-2">
          {rawLetters.length === 0 ? (
            <span className="text-sm text-gray-300 dark:text-gray-600">Start signing…</span>
          ) : (
            rawLetters.split('').map((ch, i) => (
              <motion.span
                key={i}
                className="flex h-9 w-9 items-center justify-center rounded-2xl bg-slate-950 text-sm font-semibold text-white dark:bg-white dark:text-slate-950"
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

      <div className="grid grid-cols-3 gap-2">
        <Button variant="outline" size="sm" onClick={onBackspace} disabled={rawLetters.length === 0} className="gap-1.5" title="Delete last letter (Backspace)">
          <Delete className="h-4 w-4" />
          Back
        </Button>
        <Button variant="outline" size="sm" onClick={onSpace} disabled={rawLetters.length === 0} className="gap-1.5" title="Manual word break (Space)">
          <Space className="h-4 w-4" />
          Space
        </Button>
        <Button variant="outline" size="sm" onClick={onClear} className="gap-1.5" title="Clear everything">
          <RotateCcw className="h-4 w-4" />
          Clear
        </Button>
      </div>

      <div className="surface-panel px-5 py-4">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400 dark:text-gray-500">
          Manual words
        </p>
        <p className="mt-2 min-h-[2.5rem] text-base leading-relaxed text-gray-900 dark:text-white">
          {words.length === 0 && !currentWord ? (
            <span className="text-sm text-gray-300 dark:text-gray-600">Add spaces to separate full words.</span>
          ) : (
            <>
              {words.join(' ')}
              {currentWord && <span className="text-sky-500"> {currentWord}</span>}
              <span className="ml-0.5 inline-block h-4 w-0.5 animate-pulse bg-sky-500" />
            </>
          )}
        </p>
      </div>
    </div>
  );
}
