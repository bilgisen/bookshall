'use client';

import * as React from 'react';
import { useEditorState } from '@platejs/core/react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface BlockToolbarButtonProps {
  value: string;
  tooltip: string;
  onClick: () => void;
  className?: string;
  children: React.ReactNode;
}

export function BlockToolbarButton({
  value,
  tooltip,
  onClick,
  className,
  children,
  ...props
}: BlockToolbarButtonProps) {
  const editor = useEditorState();
  const isActive = editor?.tf[value]?.isActive?.();

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          onClick={onClick}
          className={cn(
            'inline-flex h-8 w-8 items-center justify-center rounded-md hover:bg-accent hover:text-accent-foreground',
            isActive ? 'bg-accent text-accent-foreground' : 'text-muted-foreground',
            className
          )}
          {...props}
        >
          {children}
        </button>
      </TooltipTrigger>
      <TooltipContent side="bottom" sideOffset={8}>
        {tooltip}
      </TooltipContent>
    </Tooltip>
  );
}
