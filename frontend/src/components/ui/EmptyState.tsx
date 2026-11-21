import React from 'react';
import { FileX } from 'lucide-react';

export function EmptyState({
  title,
  description,
  action,
  icon: Icon = FileX,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  icon?: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="text-center py-16 px-4">
      <Icon className="mx-auto h-12 w-12 text-gray-300 mb-4" />
      <h3 className="text-sm font-semibold text-gray-900 mb-1">{title}</h3>
      {description && (
        <p className="text-sm text-gray-500 mb-4 max-w-xs mx-auto">{description}</p>
      )}
      {action}
    </div>
  );
}
