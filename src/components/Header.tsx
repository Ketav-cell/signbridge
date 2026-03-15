'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Hand, Sun, Moon, Settings, Menu, X } from 'lucide-react';
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
    <header
      className={cn(
        'sticky top-0 z-50 w-full border-b border-white/10',
        'bg-white/70 dark:bg-gray-900/70 backdrop-blur-xl backdrop-saturate-150',
        'supports-[backdrop-filter]:bg-white/60 dark:supports-[backdrop-filter]:bg-gray-900/60'
      )}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <Link
          href="/"
          className="flex items-center gap-2 text-lg font-bold text-gray-900 dark:text-white"
          aria-label="SignBridge home"
        >
          <Hand className="h-7 w-7 text-primary-600" />
          <span>SignBridge</span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden items-center gap-1 md:flex" aria-label="Main navigation">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                'rounded-lg px-4 py-2 text-sm font-medium transition-colors',
                'text-gray-600 hover:text-gray-900 hover:bg-gray-100',
                'dark:text-gray-300 dark:hover:text-white dark:hover:bg-gray-800'
              )}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Desktop Actions */}
        <div className="hidden items-center gap-2 md:flex">
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleDarkMode}
            aria-label={settings.darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {settings.darkMode ? (
              <Sun className="h-5 w-5 text-yellow-400" />
            ) : (
              <Moon className="h-5 w-5 text-gray-600" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Open settings"
          >
            <Settings className="h-5 w-5 text-gray-600 dark:text-gray-300" />
          </Button>
        </div>

        {/* Mobile Menu Button */}
        <div className="flex items-center gap-2 md:hidden">
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleDarkMode}
            aria-label={settings.darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {settings.darkMode ? (
              <Sun className="h-5 w-5 text-yellow-400" />
            ) : (
              <Moon className="h-5 w-5 text-gray-600" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? (
              <X className="h-5 w-5 text-gray-600 dark:text-gray-300" />
            ) : (
              <Menu className="h-5 w-5 text-gray-600 dark:text-gray-300" />
            )}
          </Button>
        </div>
      </div>

      {/* Mobile Navigation */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.nav
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            className="overflow-hidden border-t border-gray-200 dark:border-gray-700 md:hidden"
            aria-label="Mobile navigation"
          >
            <div className="space-y-1 px-4 py-3">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={cn(
                    'block rounded-lg px-4 py-2.5 text-sm font-medium transition-colors',
                    'text-gray-600 hover:text-gray-900 hover:bg-gray-100',
                    'dark:text-gray-300 dark:hover:text-white dark:hover:bg-gray-800'
                  )}
                >
                  {link.label}
                </Link>
              ))}
              <button
                onClick={() => setMobileMenuOpen(false)}
                className={cn(
                  'flex w-full items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors',
                  'text-gray-600 hover:text-gray-900 hover:bg-gray-100',
                  'dark:text-gray-300 dark:hover:text-white dark:hover:bg-gray-800'
                )}
                aria-label="Open settings"
              >
                <Settings className="h-4 w-4" />
                Settings
              </button>
            </div>
          </motion.nav>
        )}
      </AnimatePresence>
    </header>
  );
}
