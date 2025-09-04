'use client';

import { cn } from '@/lib/utils';
import { Toolbar, ToolbarProps } from '@/components/ui/toolbar';

export function AIFloatingToolbar({
  className,
  ...props
}: ToolbarProps) {
  return (
    <Toolbar
      className={cn(
        'fixed z-[100] flex w-fit min-w-[300px] -translate-y-full rounded-lg border bg-popover p-1 shadow-md transition-opacity duration-200',
        'opacity-0 group-has-[[data-floating-toolbar=true]]:opacity-100',
        className
      )}
      {...props}
    />
  );
}
