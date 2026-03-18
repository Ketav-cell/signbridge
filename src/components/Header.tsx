'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Sun, Moon, Menu, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/store/appStore';
import { Button } from '@/components/ui/button';

const navLinks = [
  { href: '/', label: 'Home' },
  { href: '/sign-to-text', label: 'Sign to Text' },
  { href: '/dictionary', label: 'Dictionary' },
  { href: '/about', label: 'About' },
];

export default function Header() {
  const pathname = usePathname();
  const { settings, updateSettings } = useAppStore();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (settings.darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [settings.darkMode]);

  const toggleDarkMode = () => {
    updateSettings({ darkMode: !settings.darkMode });
  };

  return (
    <header className="sticky top-0 z-50 px-4 pt-4 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-7xl items-center justify-between rounded-full border border-white/70 bg-white/75 px-3 py-3 shadow-[0_18px_50px_-30px_rgba(15,23,42,0.45)] backdrop-blur-2xl dark:border-white/10 dark:bg-black/30">
        <Link
          href="/"
          className="rounded-full px-3 py-1.5 text-base font-semibold tracking-[-0.03em] text-gray-950 transition-opacity hover:opacity-80 dark:text-white"
          aria-label="SignBridge home"
        >
          SignBridge
        </Link>

        <nav className="hidden items-center gap-1 rounded-full bg-black/[0.03] p-1 dark:bg-white/[0.04] md:flex" aria-label="Main navigation">
          {navLinks.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  'rounded-full px-4 py-2 text-sm font-medium transition-all',
                  isActive
                    ? 'bg-white text-gray-950 shadow-sm dark:bg-white dark:text-slate-950'
                    : 'text-gray-500 hover:text-gray-950 dark:text-gray-300 dark:hover:text-white'
                )}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          <Button
            variant="secondary"
            size="icon"
            onClick={toggleDarkMode}
            aria-label={settings.darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
            className="rounded-full"
          >
            {settings.darkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>
        </div>

        <div className="flex items-center gap-2 md:hidden">
          <Button
            variant="secondary"
            size="icon"
            onClick={toggleDarkMode}
            aria-label={settings.darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
            className="rounded-full"
          >
            {settings.darkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>
          <Button
            variant="secondary"
            size="icon"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={mobileMenuOpen}
            className="rounded-full"
          >
            {mobileMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.nav
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className="mx-auto mt-3 max-w-7xl overflow-hidden rounded-[28px] border border-white/70 bg-white/90 p-3 shadow-[0_18px_50px_-30px_rgba(15,23,42,0.45)] backdrop-blur-2xl dark:border-white/10 dark:bg-slate-950/80 md:hidden"
            aria-label="Mobile navigation"
          >
            <div className="space-y-1">
              {navLinks.map((link) => {
                const isActive = pathname === link.href;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={cn(
                      'block rounded-2xl px-4 py-3 text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-slate-950 text-white dark:bg-white dark:text-slate-950'
                        : 'text-gray-600 hover:bg-black/[0.04] hover:text-gray-950 dark:text-gray-300 dark:hover:bg-white/[0.06] dark:hover:text-white'
                    )}
                  >
                    {link.label}
                  </Link>
                );
              })}
            </div>
          </motion.nav>
        )}
      </AnimatePresence>
    </header>
  );
}
