'use client';

import React, { useState } from 'react';
import type { SignSequenceItem } from '@/types';

interface ISLSignPlayerProps {
  currentSign: SignSequenceItem | null;
  isPlaying: boolean;
  speed: number;
  className?: string;
}

export default function ISLSignPlayer({
  currentSign,
  className,
}: ISLSignPlayerProps) {
  const [imgError, setImgError] = useState(false);

  if (!currentSign || !currentSign.mediaUrl) {
    return (
      <div className={`flex items-center justify-center bg-gray-100 dark:bg-gray-800 ${className ?? ''}`}>
        <p className="text-sm text-gray-400">No sign available</p>
      </div>
    );
  }

  if (imgError) {
    return (
      <div className={`flex flex-col items-center justify-center gap-2 bg-gray-100 dark:bg-gray-800 ${className ?? ''}`}>
        <span className="text-3xl font-bold text-primary-600">
          {currentSign.glossToken}
        </span>
        <p className="text-xs text-gray-400">Image unavailable</p>
      </div>
    );
  }

  return (
    <div className={`relative flex items-center justify-center bg-white dark:bg-gray-900 ${className ?? ''}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        key={currentSign.mediaUrl}
        src={currentSign.mediaUrl}
        alt={currentSign.glossToken}
        className="h-full w-full object-contain"
        onError={() => setImgError(true)}
        onLoad={() => setImgError(false)}
      />
    </div>
  );
}
