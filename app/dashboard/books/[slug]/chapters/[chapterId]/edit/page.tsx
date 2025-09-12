'use client';

import React, { useCallback, useEffect, useRef, useState, useMemo } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { generateJSON } from '@tiptap/html';
import { Document } from '@tiptap/extension-document';
import { Text } from '@tiptap/extension-text';
import { Paragraph } from '@tiptap/extension-paragraph';
import { Heading } from '@tiptap/extension-heading';
import { Bold } from '@tiptap/extension-bold';
import { Italic } from '@tiptap/extension-italic';
import { ListItem } from '@tiptap/extension-list-item';
import { BulletList } from '@tiptap/extension-bullet-list';
import { OrderedList } from '@tiptap/extension-ordered-list';
import  { Link as TiptapLink }  from '@tiptap/extension-link';
import dynamic from 'next/dynamic';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { AlertCircle, ArrowLeft, Loader2, RefreshCw } from 'lucide-react';
import type { ChapterOption } from '@/components/chapters/ParentChapterSelect';
import { BooksMenu } from '@/components/books/books-menu';
import debounce from 'lodash/debounce';

// Dynamically import ChapterForm with SSR disabled to prevent hydration issues
const ChapterForm = dynamic(
  () => import('@/components/chapters/ChapterForm'),
  { 
    ssr: false,
    loading: () => <div className="flex items-center justify-center p-8"><Loader2 className="h-8 w-8 animate-spin" /></div>
  }
);

// Dynamically import Link with SSR disabled to prevent hydration issues
const Link = dynamic(
  () => import('next/link'),
  { 
    ssr: false,
    loading: () => <div className="flex items-center justify-center p-8"><Loader2 className="h-8 w-8 animate-spin" /></div>
  }
);

interface BookInfo {
  id: number;
  title: string;
  slug: string;
  author?: string | null;
  coverImageUrl?: string | null;
  description?: string | null;
}

interface ChapterWithBook {
  id: string | number;
  title: string;
  book: BookInfo;
  parentChapter?: {
    id: string | number;
    title: string;
  } | null;
  children?: Array<{
    id: string | number;
    title: string;
  }>;
  level?: number;
  wordCount?: number;
  readingTime?: number;
  content?: unknown;
  order: number;
  parentChapterId: string | number | null;
  bookId: string | number;
  uuid?: string;
  createdAt?: string;
  updatedAt?: string;
}

interface ChapterApiResponse {
  id: string | number;
  title: string;
  parentChapterId: string | number | null;
  level?: number;
  order: number;
  content?: unknown;
  wordCount?: number;
  readingTime?: number | null;
  slug?: string;
  bookId?: string | number;
  uuid?: string;
  createdAt?: string;
  updatedAt?: string;
}

// Auto-save delay in milliseconds (60 seconds)
const AUTO_SAVE_DELAY = 60000;

// Type for the save function ref
type SaveFunction = (data: Record<string, unknown>) => Promise<boolean>;

// Define field transformation types
type FieldKey = keyof ChapterWithBook;
type FieldTransformations = {
  [K in FieldKey]?: (val: unknown) => ChapterWithBook[K] | undefined;
};

async function fetchChapter(slug: string, chapterId: string): Promise<ChapterWithBook> {
  console.log(`fetchChapter: Fetching chapter ${chapterId} from book ${slug}`);
  const url = `/api/books/by-slug/${slug}/chapters/${chapterId}`;
  
  try {
    const response = await fetch(url, {
      credentials: 'include',
      headers: {
        'Accept': 'application/json',
        'Cache-Control': 'no-cache',
      },
    });
    
    console.log(`fetchChapter: Response status for ${url}`, response.status);
    
    // First check if the response is JSON
    const contentType = response.headers.get('content-type');
    const isJson = contentType?.includes('application/json');
    
    if (!isJson) {
      const responseText = await response.text();
      console.error('fetchChapter: Received non-JSON response:', responseText.substring(0, 500));
      
      // Check for common HTML error pages
      if (responseText.includes('<html') || responseText.includes('<!DOCTYPE')) {
        if (response.status === 401) {
          throw new Error('Authentication required. Please log in again.');
        } else if (response.status === 403) {
          throw new Error('You do not have permission to access this chapter.');
        } else if (response.status === 404) {
          throw new Error('Chapter not found. It may have been deleted or moved.');
        } else {
          throw new Error(`Server returned HTML instead of JSON. Status: ${response.status}`);
        }
      }
      
      throw new Error('Invalid response format from server');
    }
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('fetchChapter: Error response:', errorData);
      throw new Error(errorData.message || `Failed to fetch chapter: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log('fetchChapter: Received chapter data:', { 
      id: data.id, 
      title: data.title,
      hasContent: !!data.content
    });
    return data;
  } catch (error) {
    console.error('fetchChapter: Error fetching chapter:', error);
    if (error instanceof Error) {
      // Preserve the original error message
      throw error;
    }
    throw new Error('An unknown error occurred while fetching the chapter');
  }
}

interface ChapterApiResponseWithFlat {
  flat?: ChapterApiResponse[];
}

async function fetchParentChapters(bookSlug: string, currentChapterId?: number): Promise<ChapterOption[]> {
  const response = await fetch(`/api/books/by-slug/${bookSlug}/chapters`, {
    credentials: 'include',
  });
  
  if (!response.ok) {
    throw new Error('Failed to fetch parent chapters');
  }
  
  // Type the API response
  const data = await response.json() as ChapterApiResponseWithFlat;
  
  // The API returns both flat and tree formats, we'll use the flat array
  const chapters: ChapterApiResponse[] = Array.isArray(data.flat) ? data.flat : [];
  
  // Filter out the current chapter and any descendants
  const filteredChapters = chapters.filter((chapter) => {
    // Skip if this is the current chapter being edited
    if (currentChapterId && String(chapter.id) === String(currentChapterId)) {
      return false;
    }
    
    // If parentChapterId matches currentChapterId, it's a child of the current chapter
    if (currentChapterId && String(chapter.parentChapterId) === String(currentChapterId)) {
      return false;
    }
    
    return true;
  });
  
  return filteredChapters.map((chapter) => ({
    id: chapter.id,
    title: chapter.title,
    level: chapter.level || 0,
    disabled: false
  }));
}

// Client-side only component to avoid hydration issues
function ClientSideChapterEditor() {
  console.log('ClientSideChapterEditor: Component mounting');
  const router = useRouter();
  const queryClient = useQueryClient();
  const { slug, chapterId } = useParams<{ slug: string; chapterId: string }>();
  
  // State management
  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Refs
  const saveRef = useRef<SaveFunction | null>(null);
  
  // Fetch chapter data with error handling
  const { 
    data: chapter, 
    isLoading, 
    error: fetchError,
    isError
  } = useQuery<ChapterWithBook, Error>({
    queryKey: ['chapter', slug, chapterId],
    queryFn: () => fetchChapter(slug!, chapterId!),
    enabled: !!slug && !!chapterId,
    refetchOnWindowFocus: false,
  });
  
  // Fetch parent chapters
  const { data: parentChapters = [] } = useQuery<ChapterOption[]>({
    queryKey: ['parentChapters', slug, chapterId],
    queryFn: () => {
      // Make sure we have a valid slug before making the request
      if (!slug) throw new Error('Book slug is required');
      return fetchParentChapters(slug, chapter?.id ? Number(chapter.id) : undefined);
    },
    enabled: !!slug && !!chapterId && !isLoading && !fetchError,
  });

  // Handle query state changes
  useEffect(() => {
    if (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : 'Failed to load chapter');
    } else if (chapter) {
      setError(null);
    }
  }, [chapter, fetchError]);

  // Centralized save function
  const saveChapter = useCallback(async (data: Record<string, unknown>, isAutoSave = false): Promise<boolean> => {
    if (!slug) {
      const error = new Error('Book slug is missing');
      console.error('Save failed - missing book slug');
      throw error;
    }
    
    if (!chapterId) {
      const error = new Error('Chapter ID is missing');
      console.error('Save failed - missing chapter ID');
      throw error;
    }
    
    console.log('Preparing to save chapter:', { 
      slug,
      chapterId,
      data: Object.keys(data)
    });
    
    // Handle content type conversion
    const processedData = { ...data };
    
    // Handle content formatting
    if ('content' in processedData) {
      const content = processedData.content;
      
      // If content is already a string, ensure it's properly formatted
      if (typeof content === 'string') {
        try {
          // If it's a JSON string, parse and re-stringify to ensure consistency
          const parsed = JSON.parse(content);
          if (parsed && typeof parsed === 'object') {
            processedData.content = JSON.stringify(parsed);
          }
          // If it's not valid JSON, keep it as is
        } catch {
          // If it's not JSON, leave it as is (plain text)
        }
      } 
      // If content is an object, stringify it
      else if (content !== null && typeof content === 'object') {
        processedData.content = JSON.stringify(content);
      }
    }
    
    const updateData = {
      ...processedData,
      updatedAt: new Date().toISOString()
    };
    
    console.log('Sending PATCH to:', `/api/books/by-slug/${slug}/chapters/${chapterId}`);
    
    try {
      const response = await fetch(`/api/books/by-slug/${slug}/chapters/${chapterId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(updateData),
      });
      
      const responseData = await response.json().catch(() => ({}));
      
      if (!response.ok) {
        console.error('Save failed with status:', response.status, responseData);
        throw new Error(responseData.error || `Failed to save changes (${response.status})`);
      }
      
      const updatedChapter = responseData as ChapterWithBook;
      setHasUnsavedChanges(false);
      queryClient.setQueryData(['chapter', slug, chapterId], updatedChapter);
      
      if (!isAutoSave) {
        // Removed unused toast import
      }
      
      return true;
    } catch (error) {
      console.error('Error in saveChapter:', error);
      throw error;
    }
  }, [slug, chapterId, queryClient]);

  // Create a stable reference to the save function
  const stableSaveChapter = useCallback(async (data: Record<string, unknown>, isAutoSave?: boolean): Promise<boolean> => 
    saveChapter(data, isAutoSave),
    [saveChapter]
  );

  // Debounced save function with auto-save
  const debouncedSave = useMemo(
    () =>
      debounce(
        async (formData: Record<string, unknown>, isAutoSave: boolean = true): Promise<boolean> => {
          if (!chapter || !chapterId || !slug) {
            console.warn('Missing required data for save');
            return false;
          }
          
          try {
            // Prepare update data with type safety
            const updateData: Record<string, unknown> = {};
            
            // Define field transformations
            const fieldTransformations: FieldTransformations = {
              title: (val: unknown) => (val ? String(val) : undefined),
              content: (val: unknown) => (val !== undefined ? val : undefined),
              order: (val: unknown) => (typeof val === 'number' ? val : undefined),
              parentChapterId: (val: unknown) => {
                if (val === null) return null;
                if (val !== undefined) return String(val);
                return undefined;
              },
              level: (val: unknown) => (typeof val === 'number' ? val : undefined),
              wordCount: (val: unknown) => (typeof val === 'number' ? val : undefined),
              readingTime: (val: unknown) => (typeof val === 'number' ? val : undefined),
              bookId: (val: unknown) => (val ? String(val) : undefined),
              uuid: (val: unknown) => (val ? String(val) : undefined),
              id: (val: unknown) => (val ? String(val) : undefined),
              createdAt: (val: unknown) => (typeof val === 'string' ? val : undefined),
              updatedAt: (val: unknown) => (typeof val === 'string' ? val : undefined),
              book: () => undefined,
              children: () => undefined,
              parentChapter: () => undefined,
            };
            
            // Apply transformations
            Object.entries(fieldTransformations).forEach(([field, transform]) => {
              if (field in formData) {
                const value = formData[field];
                if (value !== undefined) {
                  updateData[field] = transform(value);
                }
              }
            });
            
            console.log('Saving chapter with data:', { updateData });
            
            // Use the stable save function
            const saveResult = await stableSaveChapter(updateData, isAutoSave);
            
            // Only update state if save was successful
            if (saveResult) {
              setHasUnsavedChanges(false);
              return true;
            }
            
            return false;
          } catch (error) {
            console.error('Error saving chapter:', error);
            setError(error instanceof Error ? error.message : 'Failed to save chapter');
            return false;
          } finally {
            if (!isAutoSave) {
              setIsSaving(false);
            }
          }
        },
        AUTO_SAVE_DELAY,
        { leading: false, trailing: true, maxWait: AUTO_SAVE_DELAY * 2 }
      ),
    [chapter, chapterId, slug, stableSaveChapter]
  );

  // Update the save ref when debouncedSave changes
  useEffect(() => {
    const currentSaveRef = debouncedSave;
    
    // Manual save handler (for save button)
    const saveHandler: SaveFunction = async (data: Record<string, unknown>): Promise<boolean> => {
      setIsSaving(true);
      setError(null);
      try {
        await currentSaveRef.cancel(); // Cancel any pending auto-save
        const result = await currentSaveRef(data, false); // Force immediate save
        return result !== false; // Ensure we return a boolean
      } catch (error) {
        console.error('Manual save failed:', error);
        setError(error instanceof Error ? error.message : 'Failed to save changes');
        return false;
      } finally {
        setIsSaving(false);
      }
    };
    
    saveRef.current = saveHandler;
    
    // Cleanup function
    return () => {
      saveRef.current = null;
      currentSaveRef.cancel();
    };
  }, [debouncedSave]);

  // Handle form changes
  const handleFormChange = useCallback(
    (formData: Record<string, unknown>) => {
      setHasUnsavedChanges(true);
      setError(null);
      // Only trigger save if there are actual changes
      return debouncedSave(formData, true);
    },
    [debouncedSave]
  );

  // Handle before unload
  useEffect(() => {
    if (!hasUnsavedChanges) return;
    
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      // Chrome requires returnValue to be set
      e.returnValue = '';
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [hasUnsavedChanges]);

  // Clean up debounce on unmount
  useEffect(() => {
    return () => {
      debouncedSave.cancel();
    };
  }, [debouncedSave]);

  if (isLoading) {
    console.log('ClientSideChapterEditor: Loading chapter data...');
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-8">
        <Loader2 className="w-12 h-12 animate-spin text-primary mb-4" />
        <h2 className="text-xl font-semibold mb-2">Loading Chapter</h2>
        <p className="text-muted-foreground text-center">
          Loading chapter data, please wait...
        </p>
      </div>
    );
  }

  if (isError || !chapter) {
    console.error('ClientSideChapterEditor: Error loading chapter:', fetchError);
    return (
      <div className="container mx-auto p-8 max-w-2xl">
        <div className="space-y-4">
          <div className="text-center">
            <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2">Unable to Load Chapter</h2>
            <p className="text-muted-foreground mb-6">
              {fetchError?.message || 'An unexpected error occurred while loading the chapter.'}
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button 
                variant="default"
                onClick={() => window.location.reload()}
                className="gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                Try Again
              </Button>
              <Button 
                variant="outline" 
                asChild
              >
                <Link href={`/dashboard/books/${slug}`}>
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Book
                </Link>
              </Button>
            </div>
          </div>
          
          {process.env.NODE_ENV === 'development' && fetchError && (
            <div className="mt-8 p-4 bg-muted/50 rounded-lg">
              <h3 className="text-sm font-mono font-medium mb-2">Error Details:</h3>
              <pre className="text-xs text-muted-foreground overflow-auto p-2 bg-background rounded">
                {JSON.stringify({
                  message: fetchError.message,
                  stack: fetchError.stack,
                }, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="container w-full p-4 md:p-8 max-w-6xl mx-auto">
      {/* Header with chapter info and actions */}
      <div className="flex flex-col gap-4 mb-6">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold"><span className="text-muted-foreground">Edit:</span> {chapter?.title || 'Chapter'}</h1>
            <p className="text-muted-foreground">{chapter?.book?.title || 'description'}</p>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              asChild
              className="gap-2"
            >
              <Link href={`/dashboard/books/${slug}/chapters/${chapterId}/view`}>
                <ArrowLeft className="h-4 w-4" />
                Back to chapter
              </Link>
            </Button>
            <BooksMenu 
              slug={slug} 
              bookId={chapter?.bookId ? String(chapter.bookId) : undefined} 
              chapterId={chapterId}
              hideEdit 
            />
          </div>
        </div>
        <Separator />
      </div>

      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Main form - Only render on client side */}
      <div className="bg-background">
        {chapter && (
          <ChapterForm
              key={`${chapter.id}-client`}
              bookId={String(chapter.bookId)}
              slug={slug}
              parentChapters={parentChapters}
              initialData={{
                id: String(chapter.id),
                title: chapter.title,
                content: (() => {
                  try {
                    // If content is already an object and has the expected structure, return it as is
                    if (chapter.content && 
                        typeof chapter.content === 'object' && 
                        !Array.isArray(chapter.content) && 
                        'type' in chapter.content && 
                        'content' in chapter.content) {
                      return chapter.content;
                    }
                    
                    // If content is a string, try to parse it
                    if (typeof chapter.content === 'string') {
                      const trimmedContent = chapter.content.trim();
                      
                      // If it's empty, return empty doc
                      if (!trimmedContent) {
                        return { type: 'doc', content: [] };
                      }
                      
                      // Try to parse as JSON
                      try {
                        const parsed = JSON.parse(trimmedContent);
                        // If parsing succeeds and has the right structure, return it
                        if (parsed && typeof parsed === 'object' && 'type' in parsed) {
                          return parsed;
                        }
                      } catch {
                        // If parsing as JSON fails, it might be HTML or plain text
                        console.log('Content is not valid JSON, treating as plain text');
                      }
                      
                      // If we get here, it's either HTML or plain text
                      // For HTML content, convert it to Tiptap JSON format
                      if (trimmedContent.startsWith('<') || trimmedContent.includes('</')) {
                        try {
                          // Use Tiptap's HTML to JSON converter with the same extensions as the editor
                          return generateJSON(trimmedContent, [
                            Document,
                            Text,
                            Paragraph,
                            Heading,
                            Bold,
                            Italic,
                            ListItem,
                            BulletList,
                            OrderedList,
                            TiptapLink,
                          ]);
                        } catch (error) {
                          console.error('Error converting HTML to Tiptap JSON:', error);
                          // Fallback to plain text if conversion fails
                          return {
                            type: 'doc',
                            content: [{
                              type: 'paragraph',
                              content: [{
                                type: 'text',
                                text: trimmedContent.replace(/<[^>]*>/g, ' ')
                              }]
                            }]
                          };
                        }
                      }
                      
                      // For plain text, create a simple document
                      return {
                        type: 'doc',
                        content: [
                          {
                            type: 'paragraph',
                            content: [
                              {
                                type: 'text',
                                text: trimmedContent
                              }
                            ]
                          }
                        ]
                      };
                    }
                    
                    // Default fallback
                    return { type: 'doc', content: [] };
                  } catch (error) {
                    console.error('Error parsing chapter content:', error);
                    return { type: 'doc', content: [] };
                  }
                })(),
                parentChapterId: chapter.parentChapterId ? String(chapter.parentChapterId) : null,
                order: chapter.order,
                bookId: String(chapter.bookId),
                level: chapter.level,
                wordCount: chapter.wordCount,
                readingTime: chapter.readingTime,
                uuid: chapter.uuid,
                createdAt: chapter.createdAt ? new Date(chapter.createdAt) : undefined,
                updatedAt: chapter.updatedAt ? new Date(chapter.updatedAt) : undefined,
              }}
              onChange={handleFormChange}
              onSuccess={(chapterId) => {
                router.push(`/dashboard/books/${slug}/chapters/${chapterId}/view`);
              }}
              isSubmitting={isSaving}
            />
        )}
      </div>
    </div>
  );
}

export default function EditChapterPage() {
  console.log('EditChapterPage: Component mounting');
  const [isClient, setIsClient] = useState(false);
  
  // Set isClient to true when component mounts on the client
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Show loading state until client-side hydration is complete
  if (!isClient) {
    console.log('EditChapterPage: Server-side render, showing loading state');
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading editor...</span>
      </div>
    );
  }
  
  console.log('EditChapterPage: Client-side hydrated, rendering ClientSideChapterEditor');
  
  return <ClientSideChapterEditor />;
}