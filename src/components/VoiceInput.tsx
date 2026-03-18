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

  const currentLanguage = languages.find(
    (l) => l.code === settings.inputLanguage
  );
  const speechCode = currentLanguage?.speechCode || 'en-US';

  const processTranscript = useCallback(
    async (text: string) => {
      if (!text.trim()) return;

      setTranscript(text);
      setIsProcessing(true);
      setStoreError(null);

      try {
        let englishText = text;

        if (
          settings.inputLanguage !== 'en' &&
          settings.inputLanguage !== 'auto'
        ) {
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
        setStoreError(
          err instanceof Error ? err.message : 'An error occurred during processing'
        );
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
      <div className="flex flex-col items-center gap-4 rounded-2xl border border-yellow-300 bg-yellow-50 p-6 text-center dark:border-yellow-700 dark:bg-yellow-900/20">
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
      <div className="relative flex items-center justify-center">
        <AnimatePresence>
          {isListening && (
            <motion.div
              className="absolute inset-0 rounded-full bg-red-500/20"
              initial={{ scale: 1, opacity: 0.6 }}
              animate={{
                scale: [1, 1.4, 1],
                opacity: [0.6, 0, 0.6],
              }}
              exit={{ scale: 1, opacity: 0 }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
              style={{
                width: '80px',
                height: '80px',
                margin: 'auto',
                inset: 0,
                position: 'absolute',
              }}
            />
          )}
        </AnimatePresence>

        <motion.button
          onClick={isListening ? handleStop : handleStart}
          className={cn(
            'relative z-10 flex items-center justify-center rounded-full shadow-lg transition-colors',
            'h-20 w-20 sm:h-24 sm:w-24',
            'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary-600/50',
            isListening
              ? 'bg-red-500 text-white hover:bg-red-600'
              : 'bg-primary-600 text-white hover:bg-primary-700'
          )}
          whileTap={{ scale: 0.95 }}
          aria-label={isListening ? 'Stop recording' : 'Start recording'}
        >
          {isListening ? (
            <MicOff className="h-8 w-8 sm:h-10 sm:w-10" />
          ) : (
            <Mic className="h-8 w-8 sm:h-10 sm:w-10" />
          )}
        </motion.button>
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
            <WaveformVisualizer
              frequencyData={frequencyData}
              isActive={audioActive}
            />
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isListening && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
          >
            <Button
              variant="destructive"
              size="lg"
              onClick={handleStop}
              aria-label="Stop recording"
              className="gap-2"
            >
              <Square className="h-4 w-4" />
              Stop Recording
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="w-full max-w-xs">
        <label
          htmlFor="language-select"
          className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400"
        >
          Input Language
        </label>
        <select
          id="language-select"
          value={settings.inputLanguage}
          onChange={handleLanguageChange}
          className={cn(
            'w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm',
            'text-gray-900 shadow-sm transition-colors',
            'focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20',
            'dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100'
          )}
          aria-label="Select input language"
        >
          {languages.map((lang) => (
            <option key={lang.code} value={lang.code}>
              {lang.name} {lang.nativeName !== lang.name ? `(${lang.nativeName})` : ''}
            </option>
          ))}
        </select>
      </div>

      <AnimatePresence>
        {(interimTranscript || transcript) && (
          <motion.div
            className="w-full max-w-lg rounded-xl bg-gray-100 px-4 py-3 dark:bg-gray-800"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
          >
            {transcript && (
              <p className="text-sm text-gray-900 dark:text-gray-100">
                {transcript}
              </p>
            )}
            {interimTranscript && (
              <p className="text-sm italic text-gray-500 dark:text-gray-400">
                {interimTranscript}
              </p>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {speechError && (
          <motion.div
            className="flex w-full max-w-lg items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 dark:border-red-800 dark:bg-red-900/20"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            role="alert"
          >
            <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-red-500" />
            <p className="text-sm text-red-700 dark:text-red-300">
              {speechError}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
