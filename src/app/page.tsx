'use client';

import React from 'react';
import {
  Play,
  Pause,
  SkipForward,
  SkipBack,
  RotateCcw,
  Loader2,
  ChevronDown,
  ChevronUp,
  Volume2,
} from 'lucide-react';
import dynamic from 'next/dynamic';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/store/appStore';
import { useSignPlayer } from '@/hooks/useSignPlayer';
import Header from '@/components/Header';
import VoiceInput from '@/components/VoiceInput';
import { Button } from '@/components/ui/button';

const ISLSignPlayer = dynamic(() => import('@/components/ISLSignPlayer'), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
    </div>
  ),
});

export default function HomePage() {
  const {
    signSequence,
    isProcessing,
    error,
    transcript,
    translatedText,
    settings,
    playback,
    resetSession,
    setSpeed,
  } = useAppStore();

  const {
    currentIndex,
    currentSign,
    isPlaying,
    togglePlay,
    next,
    prev,
    goToIndex,
    reset,
  } = useSignPlayer(signSequence, playback.speed, playback.isLooping);

  const [showTimeline, setShowTimeline] = React.useState(true);

  return (
    <div className="flex min-h-screen flex-col pb-10">
      <Header />

      <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-8 px-4 pb-8 pt-8 sm:px-6 lg:px-8">
        <section className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr] lg:items-start">
          <div className="surface-panel p-8 sm:p-10">
            <h1 className="section-title max-w-3xl">
              A more minimal way to turn speech into sign language.
            </h1>
            <p className="section-copy mt-4 max-w-2xl">
              Speak naturally in your preferred language and watch SignBridge translate, map, and play signs back instantly with the same features you already rely on.
            </p>

            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              {[
                ['Live transcription', 'Continuous speech capture with instant processing'],
                ['Translation aware', 'Multi-language input still routes through English mapping'],
                ['Playback controls', 'Pause, skip, reset, and fine-tune speed any time'],
              ].map(([title, copy]) => (
                <div key={title} className="surface-subtle px-4 py-4">
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">{title}</p>
                  <p className="mt-1 text-sm leading-6 text-gray-500 dark:text-gray-400">{copy}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="surface-panel p-6 sm:p-8">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-gray-900 dark:text-white">Voice input</p>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  Start or stop recording without changing the translation flow.
                </p>
              </div>
            </div>
            <VoiceInput />
          </div>
        </section>

        <AnimatePresence>
          {isProcessing && (
            <motion.div
              className="surface-panel mx-auto flex w-full max-w-2xl items-center justify-center gap-3 px-4 py-3 text-sky-600 dark:text-sky-300"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
            >
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm font-medium">Processing speech and building your sign sequence…</span>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {error && (
            <motion.div
              className="mx-auto w-full max-w-2xl rounded-[24px] border border-red-200/80 bg-red-50/90 px-4 py-3 text-sm text-red-700 dark:border-red-900/80 dark:bg-red-950/30 dark:text-red-300"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              role="alert"
            >
              {error}
            </motion.div>
          )}
        </AnimatePresence>

        {transcript && (
          <section className="grid gap-4 lg:grid-cols-2">
            {settings.showEnglishText && (
              <div className="surface-panel px-5 py-4">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-400 dark:text-gray-500">Transcript</p>
                <p className="mt-3 text-sm leading-7 text-gray-900 dark:text-gray-100">{transcript}</p>
              </div>
            )}
            {translatedText && translatedText !== transcript && (
              <div className="surface-panel px-5 py-4">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-400 dark:text-gray-500">English translation</p>
                <p className="mt-3 text-sm leading-7 text-gray-900 dark:text-gray-100">{translatedText}</p>
              </div>
            )}
          </section>
        )}

        {signSequence.length > 0 && (
          <section className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
            <motion.div
              className="sign-card min-h-[320px] sm:min-h-[380px]"
              key={currentIndex}
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.2 }}
            >
              {currentSign ? (
                <>
                  <div className="flex h-72 w-full max-w-[320px] items-center justify-center overflow-hidden rounded-[28px] border border-black/[0.06] bg-gradient-to-b from-white to-slate-100 dark:border-white/10 dark:from-slate-900 dark:to-slate-950">
                    <ISLSignPlayer
                      currentSign={currentSign}
                      isPlaying={isPlaying}
                      speed={playback.speed}
                      className="h-full w-full"
                    />
                  </div>

                  <div className="mt-6 text-center">
                    <p className="text-2xl font-semibold tracking-[-0.04em] text-gray-950 dark:text-white">
                      {currentSign.glossToken}
                    </p>
                    <p className="mt-2 max-w-xl text-sm leading-6 text-gray-500 dark:text-gray-400">
                      {currentSign.description}
                    </p>
                  </div>
                </>
              ) : (
                <p className="text-gray-400">No sign to display</p>
              )}
            </motion.div>

            <div className="space-y-4">
              <div className="surface-panel p-5">
                <div className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white">
                  <Volume2 className="h-4 w-4 text-sky-500" />
                  Playback controls
                </div>
                <div className="mt-4 flex items-center justify-center gap-3">
                  <Button variant="secondary" size="icon" onClick={prev} aria-label="Previous sign">
                    <SkipBack className="h-4 w-4" />
                  </Button>
                  <Button variant="default" size="icon-lg" onClick={togglePlay} aria-label={isPlaying ? 'Pause' : 'Play'}>
                    {isPlaying ? <Pause className="h-6 w-6" /> : <Play className="ml-0.5 h-6 w-6" />}
                  </Button>
                  <Button variant="secondary" size="icon" onClick={next} aria-label="Next sign">
                    <SkipForward className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="icon" onClick={reset} aria-label="Reset">
                    <RotateCcw className="h-4 w-4" />
                  </Button>
                </div>

                <div className="mt-6 flex items-center justify-between gap-3 rounded-[22px] bg-black/[0.03] px-4 py-3 dark:bg-white/[0.04]">
                  <span className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-500 dark:text-gray-400">Speed</span>
                  <div className="flex flex-wrap justify-end gap-2">
                    {[0.5, 0.75, 1, 1.25, 1.5].map((speed) => (
                      <button
                        key={speed}
                        onClick={() => setSpeed(speed)}
                        className={cn(
                          'rounded-full px-3 py-1.5 text-xs font-medium transition-all',
                          playback.speed === speed
                            ? 'bg-slate-950 text-white dark:bg-white dark:text-slate-950'
                            : 'bg-white text-gray-500 hover:text-gray-950 dark:bg-white/[0.06] dark:text-gray-300 dark:hover:text-white'
                        )}
                      >
                        {speed}x
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="surface-panel p-5">
                <button
                  onClick={() => setShowTimeline((v) => !v)}
                  className="flex w-full items-center justify-between text-left"
                  aria-expanded={showTimeline}
                >
                  <div>
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">Sequence timeline</p>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                      Jump to any sign while keeping the same playback behavior.
                    </p>
                  </div>
                  {showTimeline ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
                </button>

                <AnimatePresence initial={false}>
                  {showTimeline && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
                        {signSequence.map((sign, index) => (
                          <button
                            key={`${sign.glossToken}-${index}`}
                            onClick={() => goToIndex(index)}
                            className={cn(
                              'rounded-[20px] border px-3 py-3 text-left transition-all',
                              currentIndex === index
                                ? 'border-slate-950 bg-slate-950 text-white dark:border-white dark:bg-white dark:text-slate-950'
                                : 'border-black/[0.06] bg-black/[0.02] text-gray-600 hover:border-black/[0.12] hover:text-gray-950 dark:border-white/10 dark:bg-white/[0.03] dark:text-gray-300 dark:hover:text-white'
                            )}
                          >
                            <p className="text-xs uppercase tracking-[0.18em] opacity-60">{index + 1}</p>
                            <p className="mt-1 truncate text-sm font-semibold">{sign.glossToken}</p>
                          </button>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <div className="surface-subtle px-4 py-4">
                <p className="text-sm font-semibold text-gray-900 dark:text-white">Session tools</p>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  Reset the current transcript, translation, and sign sequence whenever you want a clean slate.
                </p>
                <Button variant="outline" className="mt-4" onClick={resetSession}>
                  Reset session
                </Button>
              </div>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
