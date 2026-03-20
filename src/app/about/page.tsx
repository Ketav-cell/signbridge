'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft } from 'lucide-react';
import { motion } from 'framer-motion';
import Header from '@/components/Header';
import { Button } from '@/components/ui/button';


const steps = [
  { n: '1', text: 'Hit the mic and start talking. It listens the whole time you speak.' },
  { n: '2', text: 'Your speech gets converted to text live in the browser — no servers involved.' },
  { n: '3', text: 'Non-English input gets translated to English automatically.' },
  { n: '4', text: 'Each word gets matched to a sign. Unknown words get fingerspelled.' },
  { n: '5', text: 'Signs play back in order. You control the speed and can step through manually.' },
];

export default function AboutPage() {
  return (
    <div className="flex min-h-screen flex-col pb-10">
      <Header />

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:px-6 lg:px-8">

        <div className="mb-6">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm text-gray-500 transition-colors hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Link>
        </div>

        <motion.section
          className="surface-panel p-8 sm:p-10"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
        >
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
            <Image
              src="/logo.png"
              alt="SignBridge"
              width={88}
              height={88}
              className="rounded-2xl shadow-sm shrink-0"
            />
            <div>
              <h1 className="text-3xl font-semibold tracking-[-0.04em] text-gray-950 dark:text-white sm:text-4xl">
                SignBridge
              </h1>
              <p className="mt-3 max-w-2xl text-base leading-7 text-gray-500 dark:text-gray-400">
                We built this because communicating across hearing and signing communities is harder than it needs to be. SignBridge takes what you say and turns it into sign language — live, in your browser, no installs required.
              </p>
            </div>
          </div>
        </motion.section>

        <section className="surface-panel mt-6 p-6 sm:p-8">
          <h2 className="text-xl font-semibold tracking-[-0.03em] text-gray-950 dark:text-white">How it works</h2>
          <div className="mt-5 space-y-3">
            {steps.map((s, i) => (
              <motion.div
                key={s.n}
                className="flex items-start gap-4"
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.07 }}
              >
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-950 text-xs font-semibold text-white dark:bg-white dark:text-slate-950">
                  {s.n}
                </span>
                <p className="pt-0.5 text-sm leading-6 text-gray-600 dark:text-gray-300">{s.text}</p>
              </motion.div>
            ))}
          </div>
        </section>

        <section className="mt-6 surface-panel p-6">
          <h2 className="font-semibold text-gray-950 dark:text-white">Stack</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {['Next.js 14', 'React 18', 'TypeScript', 'Tailwind CSS', 'Framer Motion', 'Zustand', 'MediaPipe', 'Web Speech API', 'Python FastAPI', 'TensorFlow'].map((t) => (
              <span
                key={t}
                className="rounded-full border border-black/[0.06] bg-black/[0.02] px-3 py-1 text-xs font-medium text-gray-600 dark:border-white/10 dark:bg-white/[0.04] dark:text-gray-300"
              >
                {t}
              </span>
            ))}
          </div>
        </section>

        <div className="mt-10 flex justify-center">
          <Button asChild size="lg">
            <Link href="/">Try it out</Link>
          </Button>
        </div>

      </main>

      <footer className="mt-6 px-4 text-center text-xs text-gray-500 dark:text-gray-400">
        SignBridge &mdash; open source, built for accessibility
      </footer>
    </div>
  );
}
