// components/chapters/renderer.tsx
'use client';

import DOMPurify from 'dompurify';
import { JSONContent } from '@tiptap/core';
import { generateHTML } from '@tiptap/html';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';

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
    // Eğer content string ise, önce TipTap JSON olma ihtimalini kontrol et
    if (typeof content === 'string') {
      const trimmed = content.trim();
      if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
        try {
          const parsed = JSON.parse(trimmed) as JSONContent;
          if (parsed && typeof parsed === 'object') {
            // TipTap JSON → HTML dönüşümü
            html = generateHTML(parsed, [StarterKit, Link, Image]);
          } else {
            // JSON değilse veya beklenmedik yapıdaysa, olduğu gibi bırak
            html = content;
          }
        } catch {
          // Geçerli JSON değilse, olduğu gibi HTML kabul et
          html = content;
        }
      } else {
        // JSON değilse HTML olarak kabul et
        html = content;
      }
    } else {
      // TipTap JSON → HTML dönüşümü
      html = generateHTML(content, [StarterKit, Link, Image]);
    }
  } catch (err) {
    console.error('Failed to render chapter content:', err);
    return <p className="text-destructive">Failed to render content</p>;
  }

  const clean = DOMPurify.sanitize(html, {
    // Extend default allowlist without referencing DOMPurify.defaults
    ADD_TAGS: ['img'],
    ADD_ATTR: ['src', 'alt', 'title', 'class', 'width', 'height', 'loading', 'decoding'],
  });

  return (
    <div
      className={`prose dark:prose-invert max-w-none ${className}`}
      dangerouslySetInnerHTML={{ __html: clean }}
    />
  );
}

