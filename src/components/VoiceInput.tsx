'use client';

import React, { useCallback, useEffect } from 'react';
import { Mic, MicOff, Square, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/store/appStore';
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition';
import { useAudioAnalyser } from '@/hooks/useAudioAnalyser';
import WaveformVisualizer from '@/components/WaveformVisualizer';
import { Button } from '@/components/ui/button';
import languageCodes from '@/data/languageCodes.json';
import type { SupportedLanguage } from '@/types';

const languages = languageCodes as SupportedLanguage[];

export default function VoiceInput() {
  const {
    settings,
    updateSettings,
    setTranscript,
    setInterimTranscript,
    setSignSequence,
    setIsProcessing,
    setError: setStoreError,
    setTranslatedText,
  } = useAppStore();

  const {
    isListening,
    transcript,
    interimTranscript,
    error: speechError,
    isSupported,
    startListening,
    stopListening,
    resetTranscript,
    setLanguage,
  } = useSpeechRecognition();

  const {
    frequencyData,
    isActive: audioActive,
    start: startAudio,
    stop: stopAudio,
  } = useAudioAnalyser();

  useEffect(() => {
    setInterimTranscript(interimTranscript);
  }, [interimTranscript, setInterimTranscript]);

  useEffect(() => {
    if (speechError) {
      setStoreError(speechError);
    }
  }, [speechError, setStoreError]);

  const currentLanguage = languages.find((l) => l.code === settings.inputLanguage);
  const speechCode = currentLanguage?.speechCode || 'en-US';

  const processTranscript = useCallback(
    async (text: string) => {
      if (!text.trim()) return;

      setTranscript(text);
      setIsProcessing(true);
      setStoreError(null);

      try {
        let englishText = text;

        if (settings.inputLanguage !== 'en' && settings.inputLanguage !== 'auto') {
          const translateRes = await fetch('/api/translate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              text,
              sourceLanguage: settings.inputLanguage,
              targetLanguage: 'en',
            }),
          });

          if (!translateRes.ok) {
            throw new Error('Translation failed');
          }

          const translateData = await translateRes.json();
          englishText = translateData.translatedText;
          setTranslatedText(englishText);
        }

        const signRes = await fetch('/api/sign-lookup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: englishText,
            signLanguage: settings.outputSignLanguage,
          }),
        });

        if (!signRes.ok) {
          throw new Error('Sign lookup failed');
        }

        const signData = await signRes.json();
        setSignSequence(signData.sequence);
      } catch (err) {
        setStoreError(err instanceof Error ? err.message : 'An error occurred during processing');
      } finally {
        setIsProcessing(false);
      }
    },
    [
      settings.inputLanguage,
      settings.outputSignLanguage,
      setTranscript,
      setTranslatedText,
      setSignSequence,
      setIsProcessing,
      setStoreError,
    ]
  );

  useEffect(() => {
    if (transcript) {
      processTranscript(transcript);
    }
  }, [transcript, processTranscript]);

  const handleStart = useCallback(async () => {
    setLanguage(speechCode);
    resetTranscript();
    setStoreError(null);
    startListening();
    await startAudio();
  }, [speechCode, setLanguage, resetTranscript, setStoreError, startListening, startAudio]);

  const handleStop = useCallback(() => {
    stopListening();
    stopAudio();
  }, [stopListening, stopAudio]);

  const handleLanguageChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const code = e.target.value;
      updateSettings({ inputLanguage: code });
      const lang = languages.find((l) => l.code === code);
      if (lang?.speechCode) {
        setLanguage(lang.speechCode);
      }
    },
    [updateSettings, setLanguage]
  );

  if (!isSupported) {
    return (
      <div className="surface-subtle flex flex-col items-center gap-4 p-6 text-center">
        <AlertCircle className="h-10 w-10 text-yellow-500" />
        <div>
          <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
            Speech recognition is not supported in this browser.
          </p>
          <p className="mt-1 text-xs text-yellow-600 dark:text-yellow-400">
            Please try using Google Chrome or Microsoft Edge for the best experience.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-6">
      <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400 dark:text-gray-500">
            Input language
          </p>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Voice recognition and translation still follow your current settings.
          </p>
        </div>
        <select
          value={settings.inputLanguage}
          onChange={handleLanguageChange}
          className={cn(
            'w-full rounded-full border border-black/[0.08] bg-white/80 px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-200/50 dark:border-white/10 dark:bg-white/[0.06] dark:text-gray-100 dark:focus:ring-sky-500/20 sm:w-auto sm:min-w-[220px]'
          )}
        >
          {languages.map((language) => (
            <option key={language.code} value={language.code}>
              {language.name}
            </option>
          ))}
        </select>
      </div>

      <div className="surface-subtle relative flex w-full flex-col items-center justify-center overflow-hidden px-6 py-10">
        <AnimatePresence>
          {isListening && (
            <motion.div
              className="absolute inset-0 m-auto h-36 w-36 rounded-full bg-sky-500/10"
              initial={{ scale: 1, opacity: 0.6 }}
              animate={{ scale: [1, 1.25, 1], opacity: [0.6, 0, 0.6] }}
              exit={{ scale: 1, opacity: 0 }}
              transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
            />
          )}
        </AnimatePresence>

        <motion.button
          onClick={isListening ? handleStop : handleStart}
          className={cn(
            'relative z-10 flex h-24 w-24 items-center justify-center rounded-full border text-white shadow-[0_24px_60px_-24px_rgba(15,23,42,0.6)] transition-colors focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-sky-400/30 sm:h-28 sm:w-28',
            isListening
              ? 'border-red-400 bg-red-500 hover:bg-red-600'
              : 'border-slate-900 bg-slate-950 hover:bg-slate-800 dark:border-white dark:bg-white dark:text-slate-950 dark:hover:bg-slate-100'
          )}
          whileTap={{ scale: 0.97 }}
          aria-label={isListening ? 'Stop recording' : 'Start recording'}
        >
          {isListening ? <MicOff className="h-9 w-9 sm:h-10 sm:w-10" /> : <Mic className="h-9 w-9 sm:h-10 sm:w-10" />}
        </motion.button>

        <p className="mt-5 text-sm font-medium text-gray-900 dark:text-white">
          {isListening ? 'Listening now… tap to stop' : 'Tap to start listening'}
        </p>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Your existing speech recognition, translation, and sign mapping workflow remains unchanged.
        </p>
      </div>

      <AnimatePresence>
        {isListening && (
          <motion.div
            className="w-full"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            <WaveformVisualizer frequencyData={frequencyData} isActive={audioActive} />
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isListening && (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}>
            <Button variant="destructive" size="lg" onClick={handleStop} aria-label="Stop recording" className="gap-2">
              <Square className="h-4 w-4" />
              Stop recording
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {(interimTranscript || transcript) && (
        <div className="surface-subtle w-full px-4 py-4 text-left">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400 dark:text-gray-500">Live transcript</p>
          <p className="mt-2 min-h-[3rem] text-sm leading-7 text-gray-900 dark:text-gray-100">
            {interimTranscript || transcript || 'Start speaking to see your words appear here.'}
          </p>
        </div>
      )}
    </div>
  );
}
