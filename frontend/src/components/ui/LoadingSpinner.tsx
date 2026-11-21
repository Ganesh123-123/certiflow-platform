import React from 'react';
import { clsx } from 'clsx';

export function LoadingSpinner({
  size = 'md',
  className,
}: {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}) {
  const sizes = { sm: 'h-4 w-4', md: 'h-8 w-8', lg: 'h-12 w-12' };
  return (
    <div
      className={clsx(
        'animate-spin rounded-full border-2 border-gray-200 border-t-primary-600',
        sizes[size],
        className
      )}
    />
  );
}

export function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="text-center">
        <LoadingSpinner size="lg" className="mx-auto mb-4" />
        <p className="text-gray-500 text-sm font-medium">Loading CertiFlow...</p>
      </div>
    </div>
  );
}

export function InlineLoader({ text = 'Loading...' }: { text?: string }) {
  return (
    <div className="flex items-center justify-center py-12 gap-3">
      <LoadingSpinner size="md" />
      <span className="text-gray-500 text-sm">{text}</span>
    </div>
  );
}
