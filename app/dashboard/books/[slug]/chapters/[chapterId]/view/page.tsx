'use client';

import { useRouter, useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { authClient } from '@/lib/auth-client';
import { ChapterHeader } from '@/components/chapters/chapter-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { format } from 'date-fns';
import { BookOpen, Calendar, Clock, FileText, Bookmark } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import { JSONContent } from '@tiptap/core';
import { ChapterContentRenderer } from '@/components/chapters/ChapterContentRenderer';

interface BookInfo {
  id: number;
  title: string;
  slug: string;
  author?: string | null;
  coverImageUrl?: string | null;
  isPublished: boolean;
  publishedAt?: string | null;
  description?: string | null;
}

interface ChapterWithBook {
  id: string;
  title: string;
  content: string | JSONContent;
  excerpt?: string | null;
  order: number;
  level: number;
  isDraft: boolean;
  wordCount: number;
  readingTime?: number | null;
  createdAt: string;
  updatedAt: string;
  publishedAt?: string | null;
  parentChapterId: string | null;
  bookId: string;
  book: BookInfo;
}

async function fetchChapter(slug: string, chapterId: string): Promise<ChapterWithBook> {
  try {
    // Use the new view endpoint for chapter content
    const res = await fetch(`/api/books/by-slug/${slug}/chapters/${chapterId}/view`, {
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      console.error('Failed to fetch chapter:', {
        status: res.status,
        statusText: res.statusText,
        error: errorData,
        url: `/api/books/by-slug/${slug}/chapters/${chapterId}/view`,
      });
      throw new Error(errorData?.error || `Failed to fetch chapter (${res.status})`);
    }

    const data = await res.json();
    console.log('Fetched chapter data:', data);
    return data;
  } catch (error) {
    console.error('Error in fetchChapter:', error);
    throw error;
  }
}

export default function ChapterViewPage() {
  const router = useRouter();
  const params = useParams();
  const slug = params?.slug as string;
  const chapterId = params?.chapterId as string;

  const { data: chapter, isLoading, error, isError } = useQuery<ChapterWithBook, Error>({
    queryKey: ['chapter', slug, chapterId],
    queryFn: async () => {
      const currentSlug = slug;
      const currentChapterId = chapterId;

      if (!currentSlug || !currentChapterId) {
        throw new Error('Missing book slug or chapter ID');
      }

      try {
        const { data: session } = await authClient.getSession();
        if (!session?.user) {
          router.push('/sign-in');
          throw new Error('Not authenticated');
        }

        const data = await fetchChapter(currentSlug, currentChapterId);
        return data;
      } catch (error) {
        console.error('Error in chapter query:', error);

        if (error instanceof Error) {
          if (error.message.includes('401') || error.message.includes('Not authenticated')) {
            toast.error('Please sign in to view this chapter');
            router.push(`/sign-in?callbackUrl=${encodeURIComponent(window.location.pathname)}`);
          } else if (error.message.includes('404') || error.message.includes('not found')) {
            toast.error('Chapter not found');
            router.push(`/dashboard/books/${currentSlug}`);
          } else {
            toast.error(error.message || 'Failed to load chapter');
          }
        } else {
          toast.error('An unknown error occurred');
        }

        throw error;
      }
    },
    enabled: !!params && !!params.slug && !!params.chapterId,
    retry: (failureCount, error) => {
      if (error?.message?.includes('404') || error?.message?.includes('not found')) {
        return false;
      }
      return failureCount < 1;
    },
  });

  if (isLoading) {
    return (
      <div className="flex flex-col min-h-screen">
        <div className="bg-background border-b">
          <div className="container mx-auto px-4 py-6">
            <ChapterHeader 
              title="" 
              bookName="" 
              bookSlug={typeof slug === 'string' ? slug : ''}
              chapterId={typeof chapterId === 'string' ? chapterId : ''}
            />
          </div>
        </div>
      </div>
    );
  }

  if (isError || !chapter) {
    const errorMessage = error?.message || 'Failed to load chapter';
    return (
      <div className="container w-full p-8">
        <ChapterHeader 
          title="Error Loading Chapter"
          bookName=""
          bookSlug={typeof slug === 'string' ? slug : ''}
          chapterId={typeof chapterId === 'string' ? chapterId : ''}
        />
        <div className="mt-8">
          <Card>
            <CardContent className="pt-6">
              <p className="text-destructive mb-4">
                {errorMessage}. Please try again.
              </p>
              <div className="flex space-x-4">
                <Button asChild variant="outline">
                  <Link href="/dashboard/books">
                    <BookOpen className="mr-2 h-4 w-4" />
                    View All Books
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const formattedDate = chapter?.updatedAt
    ? format(new Date(chapter.updatedAt), 'MMM d, yyyy')
    : 'Not available';

  return (
    <div className="container w-full p-8">
      <ChapterHeader
        title={chapter.title}
        bookName={chapter.book.title}
        bookSlug={chapter.book.slug}
        chapterId={chapter.id}
      />

      <div className="overflow-hidden">
        <div className="p-8">
          {chapter.content ? (
            <div className="w-4xl mx-auto">
              <h1 className="text-4xl font-bold pb-8 tracking-tight">{chapter.title}</h1>
              <ChapterContentRenderer 
                content={chapter.content} 
                className="prose dark:prose-invert max-w-none"
              />
              <div className="mt-8 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center">
                  <Calendar className="mr-1 h-4 w-4" />
                  <span>Last updated: {formattedDate}</span>
                </div>
                {chapter.wordCount > 0 && (
                  <div className="flex items-center">
                    <FileText className="mr-1 h-4 w-4" />
                    <span>{chapter.wordCount} words</span>
                  </div>
                )}
                {chapter.readingTime && (
                  <div className="flex items-center">
                    <Clock className="mr-1 h-4 w-4" />
                    <span>{chapter.readingTime} min read</span>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Bookmark className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">No content yet</h3>
              <p className="text-muted-foreground text-sm mt-1">
                This chapter doesn&apos;t have any content yet. Click &apos;Edit&apos; to get started.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
