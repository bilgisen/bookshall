// components/chapters/renderer.tsx
'use client';

import DOMPurify from 'dompurify';
import { JSONContent } from '@tiptap/core'; // <-- buradan alıyoruz
import { generateHTML } from '@tiptap/html';
import StarterKit from '@tiptap/starter-kit';

interface ChapterContentRendererProps {
  content: string | JSONContent | null;
  className?: string;
}

export function ChapterContentRenderer({ content, className = '' }: ChapterContentRendererProps) {
  if (!content) {
    return <p className="text-muted-foreground">No content available</p>;
  }

  let html = '';
  try {
    // Eğer content string ise, direkt HTML kabul et
    if (typeof content === 'string') {
      html = content;
    } else {
      // TipTap JSON → HTML dönüşümü
      html = generateHTML(content, [StarterKit]);
    }
  } catch (err) {
    console.error('Failed to render chapter content:', err);
    return <p className="text-destructive">Failed to render content</p>;
  }

  const clean = DOMPurify.sanitize(html);

  return (
    <div
      className={`prose dark:prose-invert max-w-none ${className}`}
      dangerouslySetInnerHTML={{ __html: clean }}
    />
  );
}
