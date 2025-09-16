// components/chapters/ChapterContentEditor.tsx
'use client';

import * as React from 'react';
import { MinimalTiptap } from '@/components/ui/shadcn-io/minimal-tiptap';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

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
  // Normalize content for Tiptap
  const editorContent = React.useMemo(() => {
    try {
      // If value is null or undefined, return empty doc structure
      if (value === null || value === undefined || value === '') {
        return { type: 'doc', content: [{ type: 'paragraph' }] };
      }
      
      // If it's already an object with the expected structure, return it
      if (typeof value === 'object' && value !== null && 'type' in value) {
        return value;
      }
      
      // If it's a string, determine if it's HTML or JSON
      if (typeof value === 'string') {
        // Check if it's HTML (contains HTML tags)
        const isHTML = /<[a-z][\s\S]*>/i.test(value);
        
        if (isHTML) {
          // For HTML content, return it as is - the editor will parse it
          return value;
        }
        
        // Try to parse as JSON
        try {
          const parsed = JSON.parse(value);
          if (parsed && typeof parsed === 'object') {
            return parsed;
          }
        } catch {
          // If it's not JSON, treat as plain text
          return {
            type: 'doc',
            content: [
              {
                type: 'paragraph',
                content: value ? [{ type: 'text', text: value }] : []
              }
            ]
          };
        }
      }
      
      // Fallback to empty document
      return { type: 'doc', content: [{ type: 'paragraph' }] };
    } catch (error) {
      console.error('Error normalizing editor content:', error);
      return { type: 'doc', content: [{ type: 'paragraph' }] };
    }
  }, [value]);

  const isEditorDisabled = readOnly || disabled;

  const handleImageUpload = async (file: File): Promise<string> => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
        credentials: 'include', // Important for auth cookies
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to upload image');
      }
      
      const data = await response.json();
      return data.file?.url || data.file?.src;
    } catch (error) {
      console.error('Error uploading image:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to upload image');
      throw error;
    }
  };

  return (
    <div
      className={cn('rounded-md border', className, {
        'opacity-50 cursor-not-allowed': disabled,
      })}
    >
      <MinimalTiptap
        content={editorContent}
        onChange={isEditorDisabled ? undefined : (content) => {
          // Ensure we're only calling onChange with string content
          if (typeof content === 'string') {
            onChange(content);
          } else if (content) {
            // If it's an object, convert to JSON string
            onChange(JSON.stringify(content));
          } else {
            onChange('');
          }
        }}
        placeholder={placeholder}
        editable={!isEditorDisabled}
        onImageUpload={handleImageUpload}
      />
    </div>
  );
}
