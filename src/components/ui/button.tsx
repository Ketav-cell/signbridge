'use client';

import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center whitespace-nowrap rounded-full text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98]',
  {
    variants: {
      variant: {
        default: 'bg-slate-950 text-white shadow-[0_16px_40px_-24px_rgba(15,23,42,0.9)] hover:bg-slate-800 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200',
        secondary: 'border border-black/[0.06] bg-white/80 text-gray-900 hover:bg-white dark:border-white/10 dark:bg-white/[0.06] dark:text-white dark:hover:bg-white/[0.1]',
        outline: 'border border-black/[0.08] bg-transparent text-gray-700 hover:bg-black/[0.04] dark:border-white/10 dark:text-gray-200 dark:hover:bg-white/[0.06]',
        ghost: 'text-gray-600 hover:bg-black/[0.04] hover:text-gray-950 dark:text-gray-200 dark:hover:bg-white/[0.06] dark:hover:text-white',
        accent: 'bg-sky-500 text-white shadow-[0_16px_40px_-24px_rgba(14,165,233,0.8)] hover:bg-sky-600',
        destructive: 'bg-red-500 text-white shadow-[0_16px_40px_-24px_rgba(239,68,68,0.85)] hover:bg-red-600',
      },
      size: {
        default: 'h-11 px-5 py-2',
        sm: 'h-9 px-3.5 text-xs',
        lg: 'h-12 px-6 text-base',
        xl: 'h-14 px-8 text-lg',
        icon: 'h-10 w-10',
        'icon-lg': 'h-14 w-14',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = 'Button';

export { Button, buttonVariants };
