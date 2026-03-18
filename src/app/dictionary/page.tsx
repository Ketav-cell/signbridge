'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { Search, Hand, ArrowLeft, BookOpen } from 'lucide-react';
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

const CATEGORY_COLORS: Record<string, string> = {
  alphabet: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
  greetings: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
  common: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  feelings: 'bg-pink-100 text-pink-700 dark:bg-pink-900/40 dark:text-pink-300',
  actions: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300',
  food: 'bg-lime-100 text-lime-700 dark:bg-lime-900/40 dark:text-lime-300',
  places: 'bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300',
  people: 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300',
  things: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-300',
  time: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  questions: 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300',
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
      const matchesCategory =
        selectedCategory === 'all' || e.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [search, selectedCategory]);

  return (
    <div className="flex min-h-screen flex-col">
      <Header />

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6 lg:px-8">
        {/* Page Header */}
        <div className="mb-8">
          <Link
            href="/"
            className="mb-4 inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-100"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Home
          </Link>
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-100 dark:bg-primary-900/40">
              <BookOpen className="h-6 w-6 text-primary-600 dark:text-primary-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white sm:text-3xl">
                ISL Dictionary
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {entries.length} signs across {categories.length} categories
              </p>
            </div>
          </div>
        </div>

        {/* Search + Filter */}
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search signs, descriptions, or synonyms..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className={cn(
                'w-full rounded-xl border border-gray-300 bg-white py-2.5 pl-9 pr-4 text-sm',
                'focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20',
                'dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100'
              )}
            />
          </div>

          {/* Category filter */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className={cn(
              'rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm',
              'focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20',
              'dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100'
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

        {/* Results count */}
        <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">
          Showing {filtered.length} of {entries.length} signs
        </p>

        {/* Grid */}
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Hand className="mb-3 h-12 w-12 text-gray-300 dark:text-gray-600" />
            <p className="text-gray-500 dark:text-gray-400">
              No signs found for &ldquo;{search}&rdquo;
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filtered.map((entry, i) => (
              <motion.div
                key={entry.id}
                className={cn(
                  'group rounded-2xl border border-gray-200 bg-white p-4 shadow-sm',
                  'dark:border-gray-700 dark:bg-gray-800',
                  'transition-shadow hover:shadow-md'
                )}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(i * 0.02, 0.3) }}
              >
                {/* Sign visual */}
                <div className="mb-3 h-36 overflow-hidden rounded-xl bg-white dark:bg-gray-900">
                  {entry.mediaUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={entry.mediaUrl}
                      alt={entry.glossToken}
                      className="h-full w-full object-contain"
                      loading="lazy"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center">
                      <Hand className="h-10 w-10 text-primary-400" />
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="space-y-1.5">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-semibold capitalize text-gray-900 dark:text-white">
                      {entry.englishWord}
                    </h3>
                    <span
                      className={cn(
                        'shrink-0 rounded-full px-2 py-0.5 text-xs font-medium',
                        CATEGORY_COLORS[entry.category] ?? 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'
                      )}
                    >
                      {CATEGORY_LABELS[entry.category] ?? entry.category}
                    </span>
                  </div>
                  <p className="text-xs leading-relaxed text-gray-500 dark:text-gray-400">
                    {entry.description}
                  </p>
                  {entry.synonyms.length > 0 && (
                    <p className="text-xs text-gray-400 dark:text-gray-500">
                      Also: {entry.synonyms.slice(0, 3).join(', ')}
                    </p>
                  )}
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-xs text-gray-400 dark:text-gray-500">
                      {(entry.duration / 1000).toFixed(1)}s
                    </span>
                    <span className="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-xs text-gray-500 dark:bg-gray-700 dark:text-gray-400">
                      ASL
                    </span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </main>

      <footer className="border-t border-gray-200 py-6 text-center text-xs text-gray-500 dark:border-gray-800 dark:text-gray-400">
        <p>SignBridge &mdash; Breaking communication barriers with sign language</p>
      </footer>
    </div>
  );
}
