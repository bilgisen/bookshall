'use client';

import { cn } from '@/lib/utils';
import { Toolbar, ToolbarProps } from '@/components/ui/toolbar';

export function AIFixedToolbar({
  className,
  ...props
}: ToolbarProps) {
  return (
    <Toolbar
      className={cn(
        'sticky top-0 z-50 w-full justify-between overflow-x-auto rounded-t-lg border bg-background p-1',
        className
      )}
      {...props}
    />
  );
}
