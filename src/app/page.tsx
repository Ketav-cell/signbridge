'use client';

import React from 'react';
import {
  Play,
  Pause,
  SkipForward,
  SkipBack,
  RotateCcw,
  Loader2,
  Hand,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import dynamic from 'next/dynamic';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/store/appStore';
import { useSignPlayer } from '@/hooks/useSignPlayer';
import Header from '@/components/Header';
import VoiceInput from '@/components/VoiceInput';
import { Button } from '@/components/ui/button';

const AvatarSignPlayer = dynamic(() => import('@/components/AvatarSignPlayer'), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center">
      <Hand className="h-16 w-16 text-primary-300 animate-pulse sm:h-20 sm:w-20" />
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
    <div className="flex min-h-screen flex-col">
      <Header />

      <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-8 px-4 py-8 sm:px-6 lg:px-8">
        {/* Hero Section */}
        <section className="text-center">
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-4xl">
            Speech to <span className="text-gradient">Sign Language</span>
          </h1>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400 sm:text-base">
            Speak in any language and see ASL signs in real time
          </p>
        </section>

        {/* Voice Input */}
        <section className="flex justify-center">
          <div className="w-full max-w-lg">
            <VoiceInput />
          </div>
        </section>

        {/* Processing Indicator */}
        <AnimatePresence>
          {isProcessing && (
            <motion.div
              className="flex items-center justify-center gap-2 text-primary-600"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <Loader2 className="h-5 w-5 animate-spin" />
              <span className="text-sm font-medium">Processing speech...</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Error Display */}
        <AnimatePresence>
          {error && (
            <motion.div
              className="mx-auto max-w-lg rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              role="alert"
            >
              {error}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Transcript Display */}
        {transcript && (
          <section className="mx-auto w-full max-w-2xl space-y-2">
            {settings.showEnglishText && (
              <div className="glass-card px-4 py-3">
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
                  Transcript
                </p>
                <p className="mt-1 text-sm text-gray-900 dark:text-gray-100">
                  {transcript}
                </p>
              </div>
            )}
            {translatedText && translatedText !== transcript && (
              <div className="glass-card px-4 py-3">
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
                  English Translation
                </p>
                <p className="mt-1 text-sm text-gray-900 dark:text-gray-100">
                  {translatedText}
                </p>
              </div>
            )}
          </section>
        )}

        {/* Sign Display Area */}
        {signSequence.length > 0 && (
          <section className="mx-auto w-full max-w-3xl space-y-6">
            {/* Current Sign Card */}
            <motion.div
              className="sign-card min-h-[280px] sm:min-h-[340px]"
              key={currentIndex}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.2 }}
            >
              {currentSign ? (
                <>
                  {/* Sign Visual - 3D avatar */}
                  <div className="h-52 w-52 overflow-hidden rounded-2xl bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 sm:h-64 sm:w-64">
                    <AvatarSignPlayer
                      currentSign={currentSign}
                      isPlaying={isPlaying}
                      speed={playback.speed}
                      className="h-full w-full"
                    />
                  </div>

                  {/* Sign Info */}
                  <div className="mt-4 text-center">
                    <p className="text-lg font-semibold text-gray-900 dark:text-white sm:text-xl">
                      {currentSign.glossToken}
                    </p>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                      {currentSign.description}
                    </p>
                    {currentSign.signType === 'fingerspell' &&
                      currentSign.letters && (
                        <div className="mt-3 flex items-center justify-center gap-1">
                          {currentSign.letters.map((letter, i) => (
                            <span
                              key={i}
                              className={cn(
                                'flex h-8 w-8 items-center justify-center rounded-lg text-xs font-bold transition-colors',
                                'bg-primary-100 text-primary-700 dark:bg-primary-900 dark:text-primary-300'
                              )}
                            >
                              {letter}
                            </span>
                          ))}
                        </div>
                      )}
                  </div>
                </>
              ) : (
                <p className="text-gray-400">No sign to display</p>
              )}
            </motion.div>

            {/* Playback Controls */}
            <div className="flex items-center justify-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={prev}
                aria-label="Previous sign"
              >
                <SkipBack className="h-5 w-5" />
              </Button>
              <Button
                variant="default"
                size="icon-lg"
                onClick={togglePlay}
                aria-label={isPlaying ? 'Pause' : 'Play'}
                className="rounded-full"
              >
                {isPlaying ? (
                  <Pause className="h-6 w-6" />
                ) : (
                  <Play className="h-6 w-6 ml-0.5" />
                )}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={next}
                aria-label="Next sign"
              >
                <SkipForward className="h-5 w-5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={reset}
                aria-label="Reset"
              >
                <RotateCcw className="h-4 w-4" />
              </Button>
            </div>

            {/* Speed Control */}
            <div className="flex items-center justify-center gap-4">
              <span className="text-xs text-gray-500 dark:text-gray-400">Speed</span>
              <div className="flex gap-1">
                {[0.5, 0.75, 1, 1.25, 1.5].map((speed) => (
                  <button
                    key={speed}
                    onClick={() => setSpeed(speed)}
                    className={cn(
                      'rounded-lg px-2.5 py-1 text-xs font-medium transition-colors',
                      playback.speed === speed
                        ? 'bg-primary-600 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
                    )}
                  >
                    {speed}x
                  </button>
                ))}
              </div>
            </div>

            {/* Progress */}
            <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
              <span>
                {currentIndex + 1} / {signSequence.length}
              </span>
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
                <div
                  className="h-full rounded-full bg-primary-600 transition-all duration-300"
                  style={{
                    width: `${((currentIndex + 1) / signSequence.length) * 100}%`,
                  }}
                />
              </div>
            </div>

            {/* Sign Timeline */}
            <div>
              <button
                onClick={() => setShowTimeline(!showTimeline)}
                className="flex items-center gap-1 text-xs font-medium text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                {showTimeline ? (
                  <ChevronUp className="h-3 w-3" />
                ) : (
                  <ChevronDown className="h-3 w-3" />
                )}
                Sign Sequence
              </button>

              <AnimatePresence>
                {showTimeline && (
                  <motion.div
                    className="mt-2 flex flex-wrap gap-2"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                  >
                    {signSequence.map((sign, index) => (
                      <button
                        key={index}
                        onClick={() => goToIndex(index)}
                        className={cn(
                          'rounded-lg px-3 py-1.5 text-xs font-medium transition-all',
                          index === currentIndex
                            ? 'bg-primary-600 text-white shadow-md scale-105'
                            : index < currentIndex
                              ? 'bg-primary-100 text-primary-700 dark:bg-primary-900/50 dark:text-primary-300'
                              : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700'
                        )}
                      >
                        {sign.glossToken}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Reset Session */}
            <div className="flex justify-center">
              <Button variant="outline" size="sm" onClick={resetSession} className="gap-2">
                <RotateCcw className="h-3.5 w-3.5" />
                New Session
              </Button>
            </div>
          </section>
        )}

        {/* Empty State */}
        {signSequence.length === 0 && !isProcessing && !transcript && (
          <section className="flex flex-1 flex-col items-center justify-center gap-4 py-12 text-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary-100 dark:bg-primary-900/30">
              <Hand className="h-10 w-10 text-primary-500" />
            </div>
            <div>
              <p className="text-lg font-medium text-gray-700 dark:text-gray-300">
                Tap the microphone to start
              </p>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Your speech will be converted to sign language in real time
              </p>
            </div>
          </section>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-200 py-6 text-center text-xs text-gray-500 dark:border-gray-800 dark:text-gray-400">
        <p>SignBridge &mdash; Breaking communication barriers with sign language</p>
      </footer>
    </div>
  );
}
