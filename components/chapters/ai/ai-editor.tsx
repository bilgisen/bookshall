'use client';

import { ReactEditor, useSelected } from 'slate-react';
import { useFocused } from 'slate-react';
import { AIEditorProvider } from './ai-editor-provider';
import { AI_PLUGIN_KEY } from './constants';
import { cn } from '@/lib/utils';

interface AIEditorProps {
  children: (props: { editor: ReactEditor }) => React.ReactNode;
}

export function AIEditor({ children }: AIEditorProps) {
  return (
    <AIEditorProvider>
      {({ editor }) => {
        if (!editor) return null;
        return children({ editor });
      }}
    </AIEditorProvider>
  );
}

interface AIEditorContentProps {
  className?: string;
  element: any;
  children: React.ReactNode;
}

export function AIEditorContent({
  className,
  element,
  children,
  ...props
}: AIEditorContentProps) {
  const selected = useSelected();
  const focused = useFocused();

  return (
    <div
      {...props}
      className={cn(
        'relative my-2 rounded-lg border border-border bg-muted/50 p-4',
        selected && focused && 'ring-2 ring-ring ring-offset-2',
        className
      )}
    >
      <div className="absolute right-2 top-2 flex items-center gap-1 rounded bg-background px-2 py-0.5 text-xs text-muted-foreground">
        <span className="h-2 w-2 rounded-full bg-blue-500" />
        <span>AI Generated</span>
      </div>
      <div className="prose prose-sm dark:prose-invert max-w-none">
        {children}
      </div>
    </div>
  );
}

AIEditor.Content = AIEditorContent;
