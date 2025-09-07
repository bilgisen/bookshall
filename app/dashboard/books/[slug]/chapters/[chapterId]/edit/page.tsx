'use client';

import React from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { ChapterHeader } from '@/components/chapters/chapter-header';
import { ChapterForm } from '@/components/chapters/ChapterForm';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import type { ChapterOption } from '@/components/chapters/ParentChapterSelect';

interface BookInfo {
  id: number;
  title: string;
  slug: string;
  author?: string | null;
  coverImageUrl?: string | null;
  description?: string | null;
}

interface ChapterWithBook {
  id: number;
  title: string;
  content: string | object; // Content can be string or Tiptap JSON object
  order: number;
  parentChapterId: number | null;
  bookId: number;
  book: BookInfo;
  uuid?: string;  // Make uuid optional to match the form schema
  createdAt: string;
  updatedAt: string;
}

interface ChapterData {
  id: number;
  title: string;
  // Add other properties as needed
}

async function fetchChapter(slug: string, chapterId: string): Promise<ChapterWithBook> {
  console.log(`[fetchChapter] Fetching chapter ${chapterId} from book ${slug}`);
  
  try {
    const response = await fetch(`/api/books/by-slug/${slug}/chapters/${chapterId}`, {
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache',
      },
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('[fetchChapter] Failed to fetch chapter:', {
        status: response.status,
        statusText: response.statusText,
        error: errorData.error || 'Unknown error',
      });
      throw new Error(errorData.error || 'Failed to fetch chapter');
    }
    
    const data = await response.json();
    
    console.log('[fetchChapter] API Response:', {
      data,
      content: data.content,
      contentType: typeof data.content,
      contentLength: data.content ? 
        (typeof data.content === 'string' ? data.content.length : 'object') : 0,
      isJSON: typeof data.content === 'string' && 
        (data.content.trim().startsWith('{') || data.content.trim().startsWith('['))
    });
    
    return {
      ...data,
      content: data.content
    };
  } catch (error) {
    console.error('[fetchChapter] Error in fetchChapter:', error);
    throw error;
  }
}

async function fetchParentChapters(bookSlug: string, currentChapterId?: number): Promise<ChapterOption[]> {
  const response = await fetch(`/api/books/by-slug/${bookSlug}/chapters`, {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
  });
  
  if (!response.ok) {
    throw new Error('Failed to fetch parent chapters');
  }
  
  const data = await response.json();
  return data
    .filter((chapter: ChapterData) => chapter.id !== currentChapterId)
    .map((chapter: ChapterData) => ({
      value: chapter.id.toString(),
      label: chapter.title,
      level: 0 // Add appropriate level property or remove if not needed
    }));
}

export default function EditChapterPage() {
  const router = useRouter();
  const { slug, chapterId } = useParams<{ slug: string; chapterId: string }>();
  
  const handleSuccess = (updatedChapterId: string) => {
    toast.success('Chapter updated successfully');
    router.push(`/dashboard/books/${slug}/chapters/${updatedChapterId}/view`);
  };

  const { data: chapter, isLoading, error } = useQuery<ChapterWithBook>({
    queryKey: ['chapter', slug, chapterId],
    queryFn: () => fetchChapter(slug, chapterId),
    enabled: !!slug && !!chapterId,
  });

  const { data: parentChapters = [] } = useQuery<ChapterOption[]>({
    queryKey: ['parentChapters', slug, chapter?.id],
    queryFn: () => {
      if (!slug || !chapter?.id) return Promise.resolve([]);
      return fetchParentChapters(slug, chapter.id);
    },
    enabled: !!slug && !!chapter?.id,
  });

  // ✅ Always call hooks before conditional returns
  const formContent = React.useMemo(() => {
    const content = chapter?.content;

    if (content === null || content === undefined) {
      return '';
    }
    if (typeof content === 'string') {
      return content;
    }
    if (typeof content === 'object') {
      try {
        return JSON.stringify(content);
      } catch {
        console.warn('Could not stringify content object');
        return '';
      }
    }
    return String(content);
  }, [chapter?.content]);

  if (isLoading || !chapter) {
    return (
      <div className="container mx-auto py-8 px-4 max-w-4xl">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container w-full p-8">
        <div className="space-y-4">
          <h1 className="text-2xl font-bold">Error</h1>
          <p>Failed to load chapter. Please try again.</p>
          <Button asChild variant="outline">
            <Link href={`/dashboard/books/${slug}/chapters`}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Chapters
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container w-full p-8">
      <div className="flex w-full justify-between">
        <ChapterHeader 
          title={`Edit: ${chapter.title}`}
          bookName={chapter.book.title}
          action={
            <Button asChild variant="outline">
              <Link href={`/dashboard/books/${slug}/chapters/${chapterId}/view`}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to View
              </Link>
            </Button>
          }
        />
      </div>

      <ChapterForm
        initialData={{
          id: String(chapter.id),
          bookId: String(chapter.bookId),
          title: chapter.title,
          content: formContent,
          parentChapterId: chapter.parentChapterId ? String(chapter.parentChapterId) : null,
          order: chapter.order,
          uuid: chapter.uuid,
          createdAt: new Date(chapter.createdAt),
          updatedAt: new Date(chapter.updatedAt),
        }}
        bookId={chapter.bookId}
        parentChapters={parentChapters}
        onSuccess={handleSuccess}
      />
    </div>
  );
}