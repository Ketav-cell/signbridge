'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft } from 'lucide-react';
import { motion } from 'framer-motion';
import Header from '@/components/Header';
import { Button } from '@/components/ui/button';

const features = [
  {
    title: 'Voice Recognition',
    description: 'Speak in 15+ languages and SignBridge transcribes your words in real time using the Web Speech API built into your browser.',
  },
  {
    title: 'Multi-Language Translation',
    description: 'Automatically translate from any supported language into English before mapping to ASL signs, so nothing is lost in translation.',
  },
  {
    title: 'ASL Sign Mapping',
    description: 'Every English word is looked up in our ASL dictionary. Words not found are automatically fingerspelled letter by letter so you never miss a word.',
  },
  {
    title: 'Real-Time Playback',
    description: 'Signs play back sequentially with adjustable speed (0.5x – 1.5x). Step through manually or let the auto-play sequence run.',
  },
  {
    title: 'Growing Dictionary',
    description: 'Our dictionary covers greetings, pronouns, verbs, adjectives, numbers, colors, family, places, and more — with new signs added regularly.',
  },
  {
    title: 'Accessibility First',
    description: 'Dark mode, high-contrast support, and a clean interface designed so SignBridge works for everyone, everywhere.',
  },
];

const howItWorks = [
  { step: '01', title: 'Tap the microphone', description: 'Press the mic button and start speaking. SignBridge listens continuously.' },
  { step: '02', title: 'Speech is transcribed', description: 'Your browser converts your voice to text in real time using the Web Speech API.' },
  { step: '03', title: 'Translated to English', description: 'If you spoke in another language, the text is automatically translated to English.' },
  { step: '04', title: 'Mapped to ASL signs', description: 'Each English word is looked up in our dictionary or fingerspelled if not found.' },
  { step: '05', title: 'Signs displayed', description: 'The sign sequence plays back with the hand shape description and gloss token.' },
];

export default function AboutPage() {
  return (
    <div className="flex min-h-screen flex-col pb-10">
      <Header />

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6 lg:px-8">
        <section className="surface-panel p-6 sm:p-10">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm text-gray-500 transition-colors hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Home
          </Link>

          <motion.div
            className="mt-10 flex flex-col items-center gap-6 text-center sm:flex-row sm:text-left"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <Image
              src="/logo.png"
              alt="SignBridge logo"
              width={100}
              height={100}
              className="rounded-2xl shrink-0 shadow-md"
            />
            <div>
              <h1 className="section-title">About SignBridge</h1>
              <p className="section-copy mt-3 max-w-2xl">
                SignBridge is an open-source, real-time speech-to-sign-language translator built to break down communication barriers between hearing and Deaf/Hard-of-Hearing communities. The interface is intentionally minimal, but every core translation and accessibility feature stays in place.
              </p>
            </div>
          </motion.div>
        </section>

        <section className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              className="surface-panel p-6"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06 }}
            >
              <h3 className="font-semibold tracking-[-0.03em] text-gray-950 dark:text-white">{f.title}</h3>
              <p className="mt-2 text-sm leading-6 text-gray-500 dark:text-gray-400">{f.description}</p>
            </motion.div>
          ))}
        </section>

        <section className="surface-panel mt-6 p-6 sm:p-8">
          <h2 className="text-2xl font-semibold tracking-[-0.04em] text-gray-950 dark:text-white">How it works</h2>
          <div className="mt-6 space-y-3">
            {howItWorks.map((step, i) => (
              <motion.div
                key={step.step}
                className="surface-subtle flex gap-4 px-5 py-4"
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.08 }}
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-950 text-sm font-semibold text-white dark:bg-white dark:text-slate-950">
                  {step.step}
                </div>
                <div className="flex flex-col justify-center">
                  <h3 className="font-semibold text-gray-950 dark:text-white">{step.title}</h3>
                  <p className="mt-0.5 text-sm leading-6 text-gray-500 dark:text-gray-400">{step.description}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </section>

        <section className="mt-6 grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="surface-panel p-6">
            <h2 className="text-lg font-semibold tracking-[-0.03em] text-gray-950 dark:text-white">Built with</h2>
            <div className="mt-4 flex flex-wrap gap-2">
              {['Next.js 14', 'React 18', 'TypeScript', 'Tailwind CSS', 'Framer Motion', 'Zustand', 'MediaPipe', 'Web Speech API', 'Python FastAPI', 'TensorFlow'].map((tech) => (
                <span
                  key={tech}
                  className="rounded-full border border-black/[0.06] bg-black/[0.02] px-3 py-1.5 text-xs font-medium text-gray-700 dark:border-white/10 dark:bg-white/[0.04] dark:text-gray-200"
                >
                  {tech}
                </span>
              ))}
            </div>
          </div>

          <div className="rounded-[28px] border border-yellow-200/80 bg-yellow-50/90 p-6 dark:border-yellow-800/40 dark:bg-yellow-950/20">
            <h3 className="font-semibold text-yellow-800 dark:text-yellow-200">Browser compatibility</h3>
            <p className="mt-2 text-sm leading-6 text-yellow-700 dark:text-yellow-300">
              SignBridge uses the Web Speech API for voice recognition, which is currently supported in <strong>Google Chrome</strong> and <strong>Microsoft Edge</strong>. Safari and Firefox have limited or no support for this API.
            </p>
          </div>
        </section>

        <div className="mt-10 flex justify-center">
          <Button asChild size="lg">
            <Link href="/">Try SignBridge now</Link>
          </Button>
        </div>
      </main>

      <footer className="mt-6 px-4 text-center text-xs text-gray-500 dark:text-gray-400">
        <p>SignBridge &mdash; Breaking communication barriers with sign language</p>
      </footer>
    </div>
  );
}
