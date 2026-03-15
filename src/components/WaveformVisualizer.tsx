'use client';

import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface WaveformVisualizerProps {
  frequencyData: Uint8Array | null;
  isActive: boolean;
}

const BAR_COUNT = 36;

export default function WaveformVisualizer({ frequencyData, isActive }: WaveformVisualizerProps) {
  const bars = useMemo(() => {
    if (!isActive || !frequencyData || frequencyData.length === 0) {
      return Array.from({ length: BAR_COUNT }, () => 0);
    }

    const step = Math.floor(frequencyData.length / BAR_COUNT);
    return Array.from({ length: BAR_COUNT }, (_, i) => {
      const index = Math.min(i * step, frequencyData.length - 1);
      return frequencyData[index] / 255;
    });
  }, [frequencyData, isActive]);

  return (
    <div
      aria-hidden="true"
      className={cn(
        'flex w-full max-w-md items-end justify-center gap-[2px] sm:gap-1',
        'h-16 sm:h-20'
      )}
    >
      {bars.map((value, index) => {
        const minHeight = 4;
        const maxHeight = 100;
        const height = isActive
          ? minHeight + value * (maxHeight - minHeight)
          : minHeight;

        const progress = index / (BAR_COUNT - 1);

        return (
          <motion.div
            key={index}
            className="flex-1 rounded-full"
            style={{
              background: `linear-gradient(to top, var(--color-primary-500, #6366f1), var(--color-accent-500, #f59e0b))`,
              opacity: isActive ? 0.7 + value * 0.3 : 0.3,
            }}
            animate={{
              height: `${height}%`,
            }}
            transition={{
              type: 'spring',
              stiffness: 300,
              damping: 20,
              mass: 0.5,
            }}
          />
        );
      })}
    </div>
  );
}
