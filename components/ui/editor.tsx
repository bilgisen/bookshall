'use client';

import * as React from 'react';
import { useSlate, useSlateStatic } from 'slate-react';
import { cn } from '@/lib/utils';

const editorContainerVariants = {
  default: 'h-full',
  comment: cn(
    'flex flex-wrap justify-between gap-1 px-1 py-0.5 text-sm',
    'rounded-md border-[1.5px] border-transparent bg-transparent',
    'focus-within:border-brand/50 focus-within:ring-2 focus-within:ring-brand/30',
    'aria-disabled:border-input aria-disabled:bg-muted'
  ),
  demo: 'h-[650px]',
  select: cn(
    'group rounded-md border border-input ring-offset-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2',
    'data-readonly:w-fit data-readonly:cursor-default data-readonly:border-transparent data-readonly:focus-within:[box-shadow:none]'
  ),
};

export function EditorContainer({
  className,
  variant = 'default',
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { variant?: keyof typeof editorContainerVariants }) {
  return (
    <div
      className={cn(
        'relative w-full cursor-text overflow-y-auto caret-primary select-text',
        'focus-visible:outline-none [&_.slate-selection-area]:z-50',
        '[&_.slate-selection-area]:border [&_.slate-selection-area]:border-brand/25',
        '[&_.slate-selection-area]:bg-brand/15',
        editorContainerVariants[variant],
        className
      )}
      {...props}
    />
  );
}

const editorBaseStyles = cn(
  'group/editor',
  'relative w-full cursor-text overflow-x-hidden break-words whitespace-pre-wrap select-text',
  'text-foreground/90 bg-transparent',
  'outline-none transition-colors duration-200 ease-in-out',
  'disabled:cursor-not-allowed disabled:opacity-50',
  'placeholder:text-muted-foreground/50',
  'selection:bg-brand/15 selection:text-foreground',
  'first:mt-0 last:mb-0',
  'data-[readonly]:pointer-events-none data-[readonly]:opacity-100',
  'rounded-md ring-offset-background focus-visible:outline-none',
  '[&::placeholder]:text-muted-foreground/50',
  'focus-visible:outline-none',
  '[&_strong]:font-bold',
  '[&_em]:italic',
  '[&_u]:underline'
);

const editorVariants = {
  default: 'min-h-[200px]',
  comment: 'min-h-[40px]',
  select: 'min-h-[40px]',
  ai: 'w-full px-0 text-base md:text-sm',
  aiChat: 'max-h-[min(70vh,320px)] w-full max-w-[700px] overflow-y-auto px-3 py-2 text-base md:text-sm',
  fullWidth: 'size-full px-16 pt-4 pb-72 text-base sm:px-24',
  none: ''
} as const;

const editorSizes = {
  default: 'text-sm',
  sm: 'text-xs',
  lg: 'text-base',
} as const;

export type EditorProps = React.HTMLAttributes<HTMLDivElement> & {
  disabled?: boolean;
  focused?: boolean;
  variant?: keyof typeof editorVariants;
  size?: keyof typeof editorSizes;
  placeholder?: string;
  readOnly?: boolean;
  spellCheck?: boolean;
};

export const Editor = React.forwardRef<HTMLDivElement, EditorProps>(
  ({
    className,
    disabled = false,
    focused = false,
    variant = 'default',
    size = 'default',
    placeholder,
    readOnly = false,
    spellCheck = true,
    ...props
  }, ref) => {
    const editor = useSlateStatic();
    
    return (
      <div
        ref={ref}
        className={cn(
          editorBaseStyles,
          editorVariants[variant],
          editorSizes[size],
          disabled && 'cursor-not-allowed opacity-50',
          focused && 'ring-2 ring-ring ring-offset-2',
          !readOnly && 'focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
          className
        )}
        contentEditable={!disabled && !readOnly ? true : undefined}
        suppressContentEditableWarning
        spellCheck={spellCheck}
        data-placeholder={placeholder}
        {...props}
      />
    );
  }
);

Editor.displayName = 'Editor';

// Simple view component for the editor
// Note: Removed PlateView dependency as it's not needed with our custom implementation
export function EditorView({
  className,
  variant = 'default',
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { variant?: keyof typeof editorVariants }) {
  return (
    <div
      {...props}
      className={cn(editorVariants[variant], className)}
    />
  );
}

EditorView.displayName = 'EditorView';
