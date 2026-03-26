'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { Search, ArrowLeft } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import Header from '@/components/Header';
import dictionaryData from '@/data/dictionary.json';

type DictionaryEntry = {
  id: string;
  englishWord: string;
  glossToken: string;
  signLanguage: string;
  category: string;
  description: string;
  mediaUrl: string;
  duration: number;
  synonyms: string[];
};

const entries = dictionaryData as DictionaryEntry[];

const CATEGORY_LABELS: Record<string, string> = {
  alphabet: 'Alphabet',
  greetings: 'Greetings',
  common: 'Common',
  feelings: 'Feelings',
  actions: 'Actions',
  food: 'Food',
  places: 'Places',
  people: 'People',
  things: 'Things',
  time: 'Time',
  questions: 'Questions',
};

export default function DictionaryPage() {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const categories = useMemo(() => {
    const seen = new Set<string>();
    for (const e of entries) seen.add(e.category);
    return Array.from(seen).sort();
  }, []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return entries.filter((e) => {
      const matchesSearch =
        !q ||
        e.englishWord.toLowerCase().includes(q) ||
        e.glossToken.toLowerCase().includes(q) ||
        e.description.toLowerCase().includes(q) ||
        e.synonyms.some((s) => s.toLowerCase().includes(q));
      const matchesCategory = selectedCategory === 'all' || e.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [search, selectedCategory]);

  return (
    <div className="flex min-h-screen flex-col pb-10">
      <Header />

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6 lg:px-8">
        <section className="surface-panel p-6 sm:p-8">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm text-gray-500 transition-colors hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Home
          </Link>

          <div className="mt-6 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
                <h1 className="section-title">ISL Dictionary</h1>
              <p className="section-copy mt-3">
                Search the full sign library with the same data, categories, and sign metadata — now presented in a simpler, quieter layout.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              {[
                [`${entries.length}`, 'Total signs'],
                [`${categories.length}`, 'Categories'],
                [`${filtered.length}`, 'Visible results'],
              ].map(([value, label]) => (
                <div key={label} className="surface-subtle min-w-[120px] px-4 py-4 text-center">
                  <p className="text-2xl font-semibold tracking-[-0.05em] text-gray-950 dark:text-white">{value}</p>
                  <p className="mt-1 text-xs uppercase tracking-[0.18em] text-gray-400 dark:text-gray-500">{label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <div className="surface-panel mt-6 p-4 sm:p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search signs, descriptions, or synonyms..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className={cn(
                  'w-full rounded-full border border-black/[0.08] bg-white/80 py-3 pl-11 pr-4 text-sm text-gray-900 outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-200/50 dark:border-white/10 dark:bg-white/[0.06] dark:text-gray-100 dark:focus:ring-sky-500/20'
                )}
              />
            </div>

            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className={cn(
                'rounded-full border border-black/[0.08] bg-white/80 px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-200/50 dark:border-white/10 dark:bg-white/[0.06] dark:text-gray-100 dark:focus:ring-sky-500/20'
              )}
            >
              <option value="all">All Categories</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {CATEGORY_LABELS[cat] ?? cat}
                </option>
              ))}
            </select>
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="surface-panel mt-6 flex flex-col items-center justify-center py-20 text-center">
            <p className="text-gray-500 dark:text-gray-400">No signs found for &ldquo;{search}&rdquo;</p>
          </div>
        ) : (
          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filtered.map((entry, i) => (
              <motion.div
                key={entry.id}
                className="surface-panel p-4"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(i * 0.02, 0.3) }}
              >
                <div className="mb-4 flex h-40 items-center justify-center overflow-hidden rounded-[24px] bg-black/[0.03] dark:bg-white/[0.04]">
                  {entry.mediaUrl && (
                    <img src={entry.mediaUrl} alt={entry.glossToken} className="h-full w-full object-contain" loading="lazy" />
                  )}
                </div>

                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-semibold capitalize tracking-[-0.03em] text-gray-950 dark:text-white">{entry.englishWord}</h3>
                    <span className="rounded-full bg-black/[0.04] px-3 py-1 text-[11px] font-medium uppercase tracking-[0.16em] text-gray-500 dark:bg-white/[0.06] dark:text-gray-300">
                      {CATEGORY_LABELS[entry.category] ?? entry.category}
                    </span>
                  </div>
                  <p className="text-sm leading-6 text-gray-500 dark:text-gray-400">{entry.description}</p>
                  {entry.synonyms.length > 0 && (
                    <p className="text-xs text-gray-400 dark:text-gray-500">Also: {entry.synonyms.slice(0, 3).join(', ')}</p>
                  )}
                  <div className="flex items-center justify-between pt-1 text-xs text-gray-400 dark:text-gray-500">
                    <span>{(entry.duration / 1000).toFixed(1)}s</span>
                    <span className="rounded-full bg-slate-950 px-2.5 py-1 font-medium uppercase tracking-[0.16em] text-white dark:bg-white dark:text-slate-950">
                      {entry.signLanguage}
                    </span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </main>

      <footer className="px-4 text-center text-xs text-gray-500 dark:text-gray-400">
        <p>SignBridge &mdash; Breaking communication barriers with sign language</p>
      </footer>
    </div>
  );
}
