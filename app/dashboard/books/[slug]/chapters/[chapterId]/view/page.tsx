'use client';

import { useRouter, useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { authClient } from '@/lib/auth-client';
import { ChapterHeader } from '@/components/chapters/chapter-header';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { format } from 'date-fns';
import { ArrowLeft, Edit, BookOpen, Calendar, Clock, FileText, Bookmark } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import { generateHTML } from '@tiptap/html';
import Document from '@tiptap/extension-document';
import Paragraph from '@tiptap/extension-paragraph';
import Text from '@tiptap/extension-text';
import Heading from '@tiptap/extension-heading';
import BulletList from '@tiptap/extension-bullet-list';
import OrderedList from '@tiptap/extension-ordered-list';
import ListItem from '@tiptap/extension-list-item';
import Bold from '@tiptap/extension-bold';
import Italic from '@tiptap/extension-italic';
import HardBreak from '@tiptap/extension-hard-break';
import LinkExtension from '@tiptap/extension-link';

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
  id: number;
  title: string;
  content: string | object; // Content can be string or Tiptap JSON object
  excerpt?: string | null;
  order: number;
  level: number;
  isDraft: boolean;
  wordCount: number;
  readingTime?: number | null;
  createdAt: string;
  updatedAt: string;
  publishedAt?: string | null;
  parentChapterId: number | null;
  bookId: number;
  book: BookInfo;
}

async function fetchChapter(slug: string, chapterId: string): Promise<ChapterWithBook> {
  const res = await fetch(`/api/books/by-slug/${slug}/chapters/${chapterId}`, {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData?.error || 'Failed to fetch chapter');
  }

  return res.json();
}

// Define the extensions used in your editor for generateHTML
// Configure them here as needed
const tiptapExtensionsForRendering = [
  Document,
  Paragraph.configure({
    HTMLAttributes: { class: 'tiptap-p' }
  }),
  Text,
  Heading.configure({
    levels: [1, 2, 3],
    HTMLAttributes: {
      class: 'tiptap-heading'
    }
  }),
  BulletList.configure({
    HTMLAttributes: { class: 'tiptap-ul' }
  }),
  OrderedList.configure({
    HTMLAttributes: { class: 'tiptap-ol' }
  }),
  ListItem.configure({
    HTMLAttributes: { class: 'tiptap-li' }
  }),
  Bold,
  Italic,
  HardBreak,
  // Configure the Link extension correctly
  LinkExtension.configure({
    HTMLAttributes: {
      class: 'text-primary underline underline-offset-4 hover:text-primary/80',
      target: '_blank',
      rel: 'noopener noreferrer',
    },
    // openOnClick: false, // Optional: Disable default click behavior if needed
  }),
];

// Remove the old tiptapExtensions array and parseChapterContent function
// as they are not used with the new generateHTML approach

// ... (BookInfo and ChapterWithBook interfaces remain the same)

// ... (fetchChapter function remains the same)

export default function ChapterViewPage() {
  const router = useRouter();
  // Fix the params access warning by awaiting params
  const params = useParams();
  // Use React.use if this were a sync component needing params immediately,
  // but since we use it in the queryFn which is async, awaiting params is appropriate.
  // However, for client components, React.use is often preferred if you need the value synchronously.
  // Let's assume the query handles it correctly for now, but note the potential issue.
  // A more robust fix would involve restructuring how params are used.
  const slug = params?.slug as string;
  const chapterId = params?.chapterId as string;

  const { data: chapter, isLoading, error, isError } = useQuery<ChapterWithBook, Error>({
    queryKey: ['chapter', slug, chapterId],
    queryFn: async () => {
      // Await params inside the async function
      const awaitedParams = await params;
      const currentSlug = awaitedParams.slug as string;
      const currentChapterId = awaitedParams.chapterId as string;

      if (!currentSlug || !currentChapterId) {
        throw new Error('Missing book slug or chapter ID');
      }

      try {
        // First check if we have a valid session
        const { data: session } = await authClient.getSession();
        if (!session?.user) {
          router.push('/sign-in');
          throw new Error('Not authenticated');
        }

        const data = await fetchChapter(currentSlug, currentChapterId); // Use awaited params

        // Ensure the data has the expected structure
        if (!data || typeof data !== 'object') {
          throw new Error('Invalid chapter data received');
        }

        return data;
      } catch (error) {
        console.error('Error in chapter query:', error);

        if (error instanceof Error) {
          if (error.message.includes('401') || error.message.includes('Not authenticated')) {
            toast.error('Please sign in to view this chapter');
            // Use awaited params for navigation
            router.push(`/sign-in?callbackUrl=${encodeURIComponent(window.location.pathname)}`);
          } else if (error.message.includes('404') || error.message.includes('not found')) {
            toast.error('Chapter not found');
             // Use awaited params for navigation
            router.push(`/dashboard/books/${currentSlug}`); // Or use data from query if available
          } else {
            toast.error(error.message || 'Failed to load chapter');
          }
        } else {
          toast.error('An unknown error occurred');
        }

        throw error;
      }
    },
    enabled: !!params && !!params.slug && !!params.chapterId, // Enable only when params are available
    retry: (failureCount, error) => {
      // Don't retry on 404 errors
      if (error?.message?.includes('404') || error?.message?.includes('not found')) {
        return false;
      }
      // Only retry once for other errors
      return failureCount < 1;
    }
  });

  // ... (isLoading and isError rendering remain mostly the same,
  // but ensure router usage is consistent if needed)

  if (isLoading) {
    return (
      <div className="flex flex-col min-h-screen">
        <div className="bg-background border-b">
          <div className="container mx-auto px-4 py-6">
            <ChapterHeader
              title=""
              bookName=""
            />
          </div>
        </div>
      </div>
    );
  }

  if (isError || !chapter) {
    const errorMessage = error?.message || 'Failed to load chapter';
    return (
      <div className="container mx-auto py-8 px-4 max-w-4xl">
        <Card>
          <CardHeader>
            <CardTitle>Error Loading Chapter</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-destructive mb-4">
              {errorMessage}. Please try again.
            </p>
            <div className="flex space-x-4">
              <Button variant="outline" onClick={() => router.back()}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Go Back
              </Button>
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
    );
  }

  const formattedDate = chapter?.updatedAt
    ? format(new Date(chapter.updatedAt), 'MMM d, yyyy')
    : 'Not available';

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl space-y-8">
      {/* Chapter Header */}
      <ChapterHeader
        title={chapter.title}
        bookName={chapter.book.title}
        action={
          <div className="flex space-x-2">
            <Button variant="outline" size="sm" onClick={() => router.back()}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
            <Link href={`/dashboard/books/${chapter.book.slug}/chapters/${chapter.id}/edit`}>
              <Button size="sm">
                <Edit className="mr-2 h-4 w-4" />
                Edit
              </Button>
            </Link>
          </div>
        }
      />

      {/* Chapter Content */}
      <div className="overflow-hidden border rounded-lg bg-card text-card-foreground shadow-sm"> {/* Added Card-like styling */}
        <div className="p-6"> {/* Added padding like CardContent */}
          {chapter.content ? (
            <div className="tiptap-content w-full max-w-none">
              {(() => {
                try {
                  let contentToRender = chapter.content;

                  // If content is a string, try to parse it as JSON
                  if (typeof contentToRender === 'string') {
                    try {
                      // Try to parse as JSON if it looks like JSON
                      if (contentToRender.trim().startsWith('{') || contentToRender.trim().startsWith('[')) {
                        contentToRender = JSON.parse(contentToRender);
                        // After parsing, it should be an object, proceed to generateHTML
                      } else {
                        // It's a plain string, wrap it in a paragraph or render directly
                         // Assuming it's plain text if not JSON
                         return (
                          <div
                            className="whitespace-pre-wrap"
                            dangerouslySetInnerHTML={{ __html: contentToRender }}
                          />
                        );
                      }
                    } catch (parseError) {
                      console.warn('Failed to parse chapter content string as JSON, rendering as text:', parseError);
                      // If parsing fails, treat as plain text
                      return (
                        <div
                          className="whitespace-pre-wrap"
                          dangerouslySetInnerHTML={{ __html: contentToRender }}
                        />
                      );
                    }
                  }

                  // If we have a Tiptap document (object with type 'doc'), generate HTML
                  if (typeof contentToRender === 'object' &&
                      contentToRender !== null &&
                      'type' in contentToRender &&
                      contentToRender.type === 'doc') {

                    try {
                      // Use the correctly configured extensions array
                      // Ensure contentToRender is properly typed as JSONContent
                      const htmlContent = generateHTML(contentToRender as any, tiptapExtensionsForRendering);

                      return (
                        <div
                          className="w-full prose dark:prose-invert max-w-none" // Added prose classes for basic styling
                          dangerouslySetInnerHTML={{ __html: htmlContent }}
                        />
                      );
                    } catch (generateError) {
                      console.error('Error generating HTML from Tiptap content:', generateError);
                      // Fall through to error handling
                      throw generateError; // Re-throw to be caught by the outer try/catch
                    }
                  }

                  // Fallback for other content types (e.g., array or unexpected object)
                  console.warn('Unexpected chapter content format for HTML generation:', typeof contentToRender, contentToRender);
                  return (
                    <div
                      className="whitespace-pre-wrap"
                      dangerouslySetInnerHTML={{
                        __html: typeof contentToRender === 'object' ? JSON.stringify(contentToRender, null, 2) : String(contentToRender)
                      }}
                    />
                  );
                } catch (renderError) {
                  console.error('Error rendering chapter content:', renderError);
                  return (
                    <div className="text-destructive p-4 bg-destructive/10 rounded">
                      Error rendering content. Please try again or contact support.
                      {/* Optionally, display the raw content for debugging:
                      <pre className="text-xs mt-2 overflow-auto">{JSON.stringify(chapter.content, null, 2)}</pre>
                      */}
                    </div>
                  );
                }
              })()}

              {/* Chapter Metadata - Moved to bottom */}
              <div className="mt-8 pt-4 border-t flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
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
                This chapter doesn't have any content yet. Click 'Edit' to get started.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}