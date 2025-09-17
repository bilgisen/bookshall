'use client';

import React, { useMemo } from 'react';
import { renderToHTMLString } from '@tiptap/static-renderer';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import { cn } from '@/lib/utils';
import { JSONContent } from '@tiptap/core';

type ChapterContentRendererProps = {
  content: string | JSONContent | null | undefined;
  className?: string;
};

// Extensions to use for rendering
const extensions = [
  StarterKit,
  Link.configure({
    openOnClick: false,
  }),
  Image,
];

// Default empty content
const defaultContent: JSONContent = {
  type: 'doc',
  content: [
    {
      type: 'paragraph',
    },
  ],};

export function ChapterContentRenderer({ content, className }: ChapterContentRendererProps) {
  const html = useMemo(() => {
    try {
      if (!content) return '';
      
      let jsonContent: JSONContent;
      
      if (typeof content === 'string') {
        const trimmed = content.trim();
        
        if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
          // Parse as JSON
          jsonContent = JSON.parse(trimmed);
        } else if (trimmed.startsWith('<') && trimmed.endsWith('>')) {
          // For HTML content, we'll use the HTML directly since it's already in the right format
          return trimmed;
        } else {
          // Plain text
          jsonContent = {
            type: 'doc',
            content: [
              {
                type: 'paragraph',
                content: [
                  {
                    type: 'text',
                    text: trimmed,
                  },
                ],
              },
            ],
          };
        }
      } else {
        // Already in JSON format
        jsonContent = 'content' in content ? content : { content: [content] };
      }

      // Ensure we have valid content
      if (!jsonContent.content || !Array.isArray(jsonContent.content)) {
        jsonContent = defaultContent;
      }

      // Render to HTML string
      return renderToHTMLString({
        content: jsonContent,
        extensions,
      });
      
    } catch (error) {
      console.error('Error rendering chapter content:', error);
      return '';
    }
  }, [content]);

  if (!content) {
    return <div className={cn('prose dark:prose-invert max-w-none', className)}>No content available</div>;
  }

  if (!html) {
    return (
      <div className={cn('prose dark:prose-invert max-w-none p-4 bg-red-50 dark:bg-red-900/20 rounded', className)}>
        <p className="text-red-600 dark:text-red-400">Error rendering content</p>
        {typeof content === 'string' && content.length > 200 
          ? `${content.substring(0, 200)}...` 
          : JSON.stringify(content)}
      </div>
    );
  }

  return (
    <div 
      className={cn('prose dark:prose-invert max-w-none', className)}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
