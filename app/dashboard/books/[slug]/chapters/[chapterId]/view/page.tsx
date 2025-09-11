'use client';

import { useRouter, useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { authClient } from '@/lib/auth-client';
import { ChapterHeader } from '@/components/chapters/chapter-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { format } from 'date-fns';
import { ArrowLeft, Edit, BookOpen, Calendar, Clock, FileText, Bookmark } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import { generateHTML } from '@tiptap/html';
import { JSONContent } from '@tiptap/core';
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
  id: string; // Changed from number to string to handle UUID
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
  parentChapterId: string | null; // Changed from number | null to string | null
  bookId: string; // Changed from number to string
  book: BookInfo;
}

async function fetchChapter(slug: string, chapterId: string): Promise<ChapterWithBook> {
  try {
    console.log(`Fetching chapter with ID: ${chapterId} for book: ${slug}`);
    
    const res = await fetch(`/api/books/by-slug/${slug}/chapters/${chapterId}`, {
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
      cache: 'no-store' // Prevent caching to ensure fresh data
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      console.error('Failed to fetch chapter:', {
        status: res.status,
        statusText: res.statusText,
        error: errorData,
        url: `/api/books/by-slug/${slug}/chapters/${chapterId}`
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

export default function ChapterViewPage() {
  const router = useRouter();
  const params = useParams();
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

        // Debug log to inspect the content type and format
        console.log('Chapter data received:', {
          ...data,
          contentType: typeof data.content,
          contentSample: typeof data.content === 'string' 
            ? data.content.substring(0, 100) + (data.content.length > 100 ? '...' : '')
            : data.content
        });

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
      <div className="overflow-hidden border rounded-lg bg-card text-card-foreground shadow-sm">
        <div className="p-6">
          {chapter.content ? (
            <div className="tiptap-content w-full max-w-none">
              {(() => {
                try {
                  let contentToRender = chapter.content;
                  console.log('Rendering content:', {
                    type: typeof contentToRender,
                    content: contentToRender
                  });

                  // 1. Handle null/undefined content
                  if (!contentToRender) {
                    return <p className="text-muted-foreground">No content available</p>;
                  }

                  // 2. Handle string content
                  if (typeof contentToRender === 'string') {
                    const trimmedContent = contentToRender.trim();
                    // If it's a JSON string, parse it and continue processing
                    if (trimmedContent.startsWith('{') || trimmedContent.startsWith('[')) {
                      try {
                        const parsedContent = JSON.parse(trimmedContent);
                        console.log('Parsed JSON content:', parsedContent);
                        // If it's already a valid Tiptap document, use it as is
                        if (typeof parsedContent === 'object' && parsedContent !== null && 'type' in parsedContent) {
                          contentToRender = parsedContent as JSONContent;
                        } else {
                          // Otherwise, wrap in a document structure
                          contentToRender = {
                            type: 'doc',
                            content: [
                              {
                                type: 'paragraph',
                                content: [
                                  {
                                    type: 'text',
                                    text: typeof parsedContent === 'string' 
                                      ? parsedContent 
                                      : JSON.stringify(parsedContent)
                                  }
                                ]
                              }
                            ]
                          };
                        }
                      } catch (error) {
                        console.warn('Failed to parse content as JSON, treating as plain text', error);
                        // If it's not valid JSON but has HTML tags, render as HTML
                        if (typeof contentToRender === 'string' && /<[a-z][\s\S]*>/i.test(contentToRender)) {
                          return (
                            <div 
                              className="prose dark:prose-invert max-w-none"
                              dangerouslySetInnerHTML={{ __html: contentToRender }} 
                            />
                          );
                        }
                        // Otherwise, treat as plain text
                        const textContent = typeof contentToRender === 'string' 
                          ? contentToRender 
                          : JSON.stringify(contentToRender);
                        return (
                          <div className="prose dark:prose-invert max-w-none">
                            <p>{textContent}</p>
                          </div>
                        );
                      }
                    } else {
                      // It's a plain string, not JSON
                      const textContent = typeof contentToRender === 'string' 
                        ? contentToRender 
                        : JSON.stringify(contentToRender);
                      return (
                        <div className="prose dark:prose-invert max-w-none">
                          <p>{textContent}</p>
                        </div>
                      );
                    }
                  }

                  // 3. Handle Tiptap JSON content (object with type 'doc')
                  if (typeof contentToRender === 'object' && contentToRender !== null) {
                    try {
                      // Define Tiptap document types
                      interface TiptapNode {
                        type: string;
                        content?: TiptapNode[];
                        [key: string]: unknown;
                      }

                      interface TiptapDocument extends TiptapNode {
                        type: 'doc';
                        content: TiptapNode[];
                      }

                      // Type guard to check if it's a Tiptap document
                      const isTiptapDoc = (obj: unknown): obj is TiptapDocument => {
                        return (
                          typeof obj === 'object' && 
                          obj !== null && 
                          'type' in obj && 
                          obj.type === 'doc' && 
                          'content' in obj && 
                          Array.isArray(obj.content)
                        );
                      };

                      if (isTiptapDoc(contentToRender)) {
                        // Ensure content is an array and has elements
                        if (Array.isArray(contentToRender.content) && contentToRender.content.length > 0) {
                          try {
                            const tiptapContent = contentToRender as JSONContent;
                            const htmlContent = generateHTML(tiptapContent, tiptapExtensionsForRendering);
                            return (
                              <div 
                                className="prose dark:prose-invert max-w-none"
                                dangerouslySetInnerHTML={{ __html: htmlContent }} 
                              />
                            );
                          } catch (generateError) {
                            console.error('Error generating HTML from Tiptap content:', generateError);
                            // Fallback to rendering content as JSON
                            return (
                              <div className="prose dark:prose-invert max-w-none">
                                <pre className="whitespace-pre-wrap p-4 bg-muted/50 rounded">
                                  {JSON.stringify(contentToRender, null, 2)}
                                </pre>
                              </div>
                            );
                          }
                        } else {
                          // Empty content
                          return <p className="text-muted-foreground">No content available</p>;
                        }
                      }
                      
                      // If it's an object but not a Tiptap doc, try to stringify it
                      console.warn('Unexpected object format for chapter content:', contentToRender);
                      return (
                        <div className="prose dark:prose-invert max-w-none">
                          <pre className="whitespace-pre-wrap p-4 bg-muted/50 rounded">
                            {JSON.stringify(contentToRender, null, 2)}
                          </pre>
                        </div>
                      );
                    } catch (e) {
                      console.error('Error processing content object:', e);
                      // Try to render as much as possible even if there's an error
                      return (
                        <div className="prose dark:prose-invert max-w-none">
                          <pre className="whitespace-pre-wrap p-4 bg-muted/50 rounded">
                            {JSON.stringify(contentToRender, null, 2)}
                          </pre>
                        </div>
                      );
                    }
                  }

                  // Fallback for other content types (e.g., array or unexpected object)
                  console.warn('Unexpected chapter content format for HTML generation:', typeof contentToRender, contentToRender);
                  return (
                    <div className="prose dark:prose-invert max-w-none">
                      <pre className="whitespace-pre-wrap p-4 bg-muted/50 rounded">
                        {typeof contentToRender === 'object' 
                          ? JSON.stringify(contentToRender, null, 2) 
                          : String(contentToRender)
                        }
                      </pre>
                    </div>
                  );
                } catch (renderError) {
                  console.error('Error rendering chapter content:', renderError);
                  return (
                    <div className="text-destructive p-4 bg-destructive/10 rounded">
                      Error rendering content. Please try again or contact support.
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
                This chapter doesn&#39;t have any content yet. Click &#39;Edit&#39; to get started.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}