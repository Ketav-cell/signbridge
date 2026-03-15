'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowLeft, Hand, Mic, BookOpen, Globe, Zap, Heart } from 'lucide-react';
import { motion } from 'framer-motion';
import Header from '@/components/Header';

const features = [
  {
    icon: Mic,
    title: 'Voice Recognition',
    description:
      'Speak in 15+ languages and SignBridge transcribes your words in real time using the Web Speech API built into your browser.',
  },
  {
    icon: Globe,
    title: 'Multi-Language Translation',
    description:
      'Automatically translate from any supported language into English before mapping to ASL signs, so nothing is lost in translation.',
  },
  {
    icon: Hand,
    title: 'ASL Sign Mapping',
    description:
      'Every English word is looked up in our ASL dictionary. Words not found are automatically fingerspelled letter by letter so you never miss a word.',
  },
  {
    icon: Zap,
    title: 'Real-Time Playback',
    description:
      'Signs play back sequentially with adjustable speed (0.5x – 1.5x). Step through manually or let the auto-play sequence run.',
  },
  {
    icon: BookOpen,
    title: 'Growing Dictionary',
    description:
      'Our dictionary covers greetings, pronouns, verbs, adjectives, numbers, colors, family, places, and more — with new signs added regularly.',
  },
  {
    icon: Heart,
    title: 'Accessibility First',
    description:
      'Dark mode, high-contrast support, and a clean interface designed so SignBridge works for everyone, everywhere.',
  },
];

const howItWorks = [
  {
    step: '01',
    title: 'Tap the microphone',
    description: 'Press the mic button and start speaking. SignBridge listens continuously.',
  },
  {
    step: '02',
    title: 'Speech is transcribed',
    description: 'Your browser converts your voice to text in real time using the Web Speech API.',
  },
  {
    step: '03',
    title: 'Translated to English',
    description: 'If you spoke in another language, the text is automatically translated to English.',
  },
  {
    step: '04',
    title: 'Mapped to ASL signs',
    description: 'Each English word is looked up in our dictionary or fingerspelled if not found.',
  },
  {
    step: '05',
    title: 'Signs displayed',
    description: 'The sign sequence plays back with the hand shape description and gloss token.',
  },
];

export default function AboutPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:px-6 lg:px-8">
        {/* Back */}
        <Link
          href="/"
          className="mb-8 inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-100"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Home
        </Link>

        {/* Hero */}
        <motion.section
          className="mb-16 text-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-3xl bg-primary-100 dark:bg-primary-900/40">
            <Hand className="h-10 w-10 text-primary-600 dark:text-primary-400" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white sm:text-4xl">
            About SignBridge
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-gray-600 dark:text-gray-400">
            SignBridge is an open-source, real-time speech-to-sign-language translator built to
            break down communication barriers between hearing and Deaf/Hard-of-Hearing communities.
            Speak naturally — we handle the rest.
          </p>
        </motion.section>

        {/* Features */}
        <section className="mb-16">
          <h2 className="mb-8 text-center text-xl font-bold text-gray-900 dark:text-white sm:text-2xl">
            What SignBridge Can Do
          </h2>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((f, i) => (
              <motion.div
                key={f.title}
                className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06 }}
              >
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-primary-100 dark:bg-primary-900/40">
                  <f.icon className="h-5 w-5 text-primary-600 dark:text-primary-400" />
                </div>
                <h3 className="mb-1.5 font-semibold text-gray-900 dark:text-white">{f.title}</h3>
                <p className="text-sm leading-relaxed text-gray-500 dark:text-gray-400">
                  {f.description}
                </p>
              </motion.div>
            ))}
          </div>
        </section>

        {/* How it works */}
        <section className="mb-16">
          <h2 className="mb-8 text-center text-xl font-bold text-gray-900 dark:text-white sm:text-2xl">
            How It Works
          </h2>
          <div className="relative space-y-0">
            {/* Connecting line */}
            <div className="absolute left-8 top-8 hidden h-[calc(100%-3rem)] w-px bg-gray-200 dark:bg-gray-700 sm:block" />
            {howItWorks.map((step, i) => (
              <motion.div
                key={step.step}
                className="relative flex gap-5 py-4"
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.08 }}
              >
                <div className="relative z-10 flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-primary-600 text-white shadow-md">
                  <span className="text-lg font-bold">{step.step}</span>
                </div>
                <div className="flex flex-col justify-center">
                  <h3 className="font-semibold text-gray-900 dark:text-white">{step.title}</h3>
                  <p className="mt-0.5 text-sm leading-relaxed text-gray-500 dark:text-gray-400">
                    {step.description}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Tech stack */}
        <section className="mb-16 rounded-2xl border border-gray-200 bg-gray-50 p-6 dark:border-gray-700 dark:bg-gray-800/50">
          <h2 className="mb-4 text-lg font-bold text-gray-900 dark:text-white">
            Built With
          </h2>
          <div className="flex flex-wrap gap-2">
            {[
              'Next.js 14',
              'React 18',
              'TypeScript',
              'Tailwind CSS',
              'Framer Motion',
              'Zustand',
              'Web Speech API',
              'MyMemory Translation API',
            ].map((tech) => (
              <span
                key={tech}
                className="rounded-lg bg-white px-3 py-1.5 text-xs font-medium text-gray-700 shadow-sm ring-1 ring-gray-200 dark:bg-gray-700 dark:text-gray-200 dark:ring-gray-600"
              >
                {tech}
              </span>
            ))}
          </div>
        </section>

        {/* Browser note */}
        <section className="rounded-2xl border border-yellow-200 bg-yellow-50 p-5 dark:border-yellow-800/50 dark:bg-yellow-900/20">
          <h3 className="mb-1 font-semibold text-yellow-800 dark:text-yellow-200">
            Browser Compatibility
          </h3>
          <p className="text-sm leading-relaxed text-yellow-700 dark:text-yellow-300">
            SignBridge uses the Web Speech API for voice recognition, which is currently supported
            in <strong>Google Chrome</strong> and <strong>Microsoft Edge</strong>. For the best
            experience, use one of these browsers. Safari and Firefox have limited or no support for
            this API.
          </p>
        </section>

        {/* CTA */}
        <div className="mt-12 text-center">
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-2xl bg-primary-600 px-6 py-3 text-sm font-semibold text-white shadow-md transition-colors hover:bg-primary-700"
          >
            <Mic className="h-4 w-4" />
            Try SignBridge Now
          </Link>
        </div>
      </main>

      <footer className="mt-12 border-t border-gray-200 py-6 text-center text-xs text-gray-500 dark:border-gray-800 dark:text-gray-400">
        <p>SignBridge &mdash; Breaking communication barriers with sign language</p>
      </footer>
    </div>
  );
}
