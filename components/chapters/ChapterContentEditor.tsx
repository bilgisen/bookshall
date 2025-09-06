// components/chapters/ChapterContentEditor.tsx
'use client';

import * as React from 'react';
import { MinimalTiptap } from '@/components/ui/shadcn-io/minimal-tiptap';
import { cn } from '@/lib/utils';

interface ChapterContentEditorProps {
  /** The content to display in the editor (HTML string or Tiptap JSON) */
  value?: string | object | null;
  /** Callback when the content changes (always string = HTML) */
  onChange: (content: string) => void;
  /** Whether the editor is read-only */
  readOnly?: boolean;
  /** Whether the editor is disabled */
  disabled?: boolean;
  /** Placeholder text to show when content is empty */
  placeholder?: string;
  /** Additional CSS classes */
  className?: string;
}

export default function ChapterContentEditor({
  value = '',
  onChange,
  readOnly = false,
  disabled = false,
  placeholder = 'Add your chapter content here...',
  className,
}: ChapterContentEditorProps) {
  // Tiptap'e string gönderecek şekilde normalize et
  const editorContent = React.useMemo(() => {
    if (!value) return '';
    if (typeof value === 'string') return value;
    try {
      return JSON.stringify(value); // JSON doc gönderildiğinde
    } catch {
      return '';
    }
  }, [value]);

  const isEditorDisabled = readOnly || disabled;

  return (
    <div
      className={cn('rounded-md border', className, {
        'opacity-50 cursor-not-allowed': disabled,
      })}
    >
      <MinimalTiptap
        content={editorContent}
        onChange={isEditorDisabled ? undefined : onChange}
        placeholder={placeholder}
        editable={!isEditorDisabled}
      />
    </div>
  );
}
