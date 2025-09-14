'use client';

import { cn } from '@/lib/utils';
import { CreditCard } from 'lucide-react';

interface CreditBadgeProps {
  amount: number;
  className?: string;
  showIcon?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export function CreditBadge({ 
  amount, 
  className = '',
  showIcon = true,
  size = 'md'
}: CreditBadgeProps) {
  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-2.5 py-1',
    lg: 'text-base px-3 py-1.5',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full bg-primary/10 text-primary font-medium',
        sizeClasses[size],
        className
      )}
    >
      {showIcon && <CreditCard className="h-3.5 w-3.5 mr-1.5" />}
      {amount.toLocaleString()} credits
    </span>
  );
}
