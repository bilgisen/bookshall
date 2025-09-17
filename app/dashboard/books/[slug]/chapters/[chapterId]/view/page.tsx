'use client';

import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { ChapterHeader } from '@/components/chapters/chapter-header';
import { ChapterContentRenderer } from '@/components/chapters/renderer';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { format } from 'date-fns';
import { BookOpen, Calendar, Clock, FileText, Bookmark } from 'lucide-react';
import { SingleBookView } from '@/components/books/single-book-view';
import Link from 'next/link';
import { JSONContent } from '@tiptap/core';

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
  content: string | JSONContent | null;
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
  const res = await fetch(`/api/books/by-slug/${slug}/chapters/${chapterId}`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    cache: 'no-store',
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData?.error || `Failed to fetch chapter (${res.status})`);
  }

  return res.json();
}

export default function ChapterViewPage() {
  const params = useParams();
  const slug = params?.slug as string;
  const chapterId = params?.chapterId as string;

  const { data: chapter, isLoading, error, isError } = useQuery<ChapterWithBook, Error>({
    queryKey: ['chapter', slug, chapterId],
    queryFn: async () => {
      if (!slug || !chapterId) throw new Error('Missing book slug or chapter ID');
      return fetchChapter(slug, chapterId);
    },
    enabled: !!slug && !!chapterId,
    retry: (count, err) => !(err.message.includes('404') || err.message.includes('not found')) && count < 1,
  });

  if (isLoading) {
    return (
      <div className="flex flex-col min-h-screen">
        <div className="bg-background border-b">
          <div className="container mx-auto px-4 py-6">
            <ChapterHeader title="" bookName="" bookSlug={slug} chapterId={chapterId} />
          </div>
        </div>
      </div>
    );
  }

  if (isError || !chapter) {
    const errorMessage = error?.message || 'Failed to load chapter';
    return (
      <div className="container w-full p-8">
        <ChapterHeader title="Error Loading Chapter" bookName="" bookSlug={slug} chapterId={chapterId} />
        <div className="mt-8">
          <Card>
            <CardContent className="pt-6">
              <p className="text-destructive mb-4">{errorMessage}. Please try again.</p>
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

  const formattedDate = chapter.updatedAt ? format(new Date(chapter.updatedAt), 'MMM d, yyyy') : 'Not available';

  return (
    <div className="container w-full p-8">
      <ChapterHeader 
        title={chapter.title} 
        bookName={chapter.book?.title || ''} 
        bookSlug={chapter.book?.slug || ''} 
        chapterId={chapter.id}
        action={
          <Button asChild>
            <Link href={`/dashboard/books/${chapter.book?.slug || slug}/chapters/${chapter.id}/edit`}>
              Edit Chapter
            </Link>
          </Button>
        }
      />

      <div className="flex flex-col lg:flex-row gap-8 mt-8">
        {/* Main Content */}
        <div className="flex-1">
          <div className="bg-card/30 rounded-lg p-6">
            {chapter.content ? (
              <div className="max-w-4xl mx-auto">
                <h1 className="text-4xl font-bold pb-8 tracking-tight">{chapter.title}</h1>
                <ChapterContentRenderer content={chapter.content} />
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

        {/* Sidebar with Book Widget */}
        <div className="lg:w-80 flex-shrink-0">
          <SingleBookView 
            book={{
              title: chapter.book.title,
              author: chapter.book.author,
              coverImageUrl: chapter.book.coverImageUrl,
              slug: chapter.book.slug,
            }}
            className="sticky top-24"
          />
        </div>
      </div>
    </div>
  );
}
