'use client';

import React, { useCallback, useEffect, useRef, useState, useMemo } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import ChapterForm from '@/components/chapters/ChapterForm';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, ArrowLeft, Loader2, Save } from 'lucide-react';
import Link from 'next/link';
import type { ChapterOption } from '@/components/chapters/ParentChapterSelect';
import debounce from 'lodash/debounce';

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

interface ChapterData {
  id: number;
  title: string;
  parentChapterId: number | null;
  order: number;
}

// Auto-save delay in milliseconds (25 seconds)
const AUTO_SAVE_DELAY = 25000;

// Type for the save function ref
type SaveFunction = (data: Record<string, unknown>) => Promise<void>;

// Define field transformation types
type FieldKey = keyof ChapterWithBook;
type FieldTransformations = {
  [K in FieldKey]?: (val: unknown) => ChapterWithBook[K] | undefined;
};

async function fetchChapter(slug: string, chapterId: string): Promise<ChapterWithBook> {
  const response = await fetch(`/api/books/by-slug/${slug}/chapters/${chapterId}`, {
    credentials: 'include',
  });
  
  if (!response.ok) {
    throw new Error('Failed to fetch chapter');
  }
  
  return response.json();
}

async function fetchParentChapters(bookSlug: string, currentChapterId?: number): Promise<ChapterOption[]> {
  const response = await fetch(`/api/books/by-slug/${bookSlug}/chapters`, {
    credentials: 'include',
  });
  
  if (!response.ok) {
    throw new Error('Failed to fetch parent chapters');
  }
  
  const chapters = await response.json();
  
  return chapters
    .filter((chapter: ChapterData) => !currentChapterId || chapter.id !== currentChapterId)
    .map((chapter: ChapterData) => ({
      value: String(chapter.id),
      label: chapter.title,
    }));
}

export default function EditChapterPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { slug, chapterId } = useParams<{ slug: string; chapterId: string }>();
  
  // State management
  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Refs
  const saveRef = useRef<SaveFunction | null>(null);
  
  // Fetch chapter data
  const { 
    data: chapter, 
    isLoading, 
    error: fetchError
  } = useQuery<ChapterWithBook>({
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
      setLastSaved(new Date());
    }
  }, [chapter, fetchError]);

  // Centralized save function
  const saveChapter = useCallback(async (data: Record<string, unknown>, isAutoSave = false): Promise<ChapterWithBook> => {
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
    
    const updateData = {
      ...data,
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
      setLastSaved(new Date());
      setHasUnsavedChanges(false);
      queryClient.setQueryData(['chapter', slug, chapterId], updatedChapter);
      
      if (!isAutoSave) {
        // Removed unused toast import
      }
      
      return updatedChapter;
    } catch (error) {
      console.error('Error in saveChapter:', error);
      throw error;
    }
  }, [slug, chapterId, queryClient]);

  // Create a stable reference to the save function
  const stableSaveChapter = useCallback((data: Record<string, unknown>, isAutoSave?: boolean) => 
    saveChapter(data, isAutoSave),
    [saveChapter]
  );

  // Debounced save function
  const debouncedSave = useMemo(
    () =>
      debounce(
        async (formData: Record<string, unknown>, isAutoSave: boolean = false) => {
          if (!chapter || !chapterId || !slug) return;
          
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
            await stableSaveChapter(updateData, isAutoSave);
            
            // Update state
            setLastSaved(new Date());
            setHasUnsavedChanges(false);
            
            return true;
          } catch (error) {
            console.error('Error saving chapter:', error);
            setError(error instanceof Error ? error.message : 'Failed to save chapter');
            throw error;
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
    const saveHandler: SaveFunction = async (data: Record<string, unknown>) => {
      setIsSaving(true);
      try {
        await currentSaveRef(data, false);
      } finally {
        setIsSaving(false);
      }
    };
    
    saveRef.current = saveHandler;
    
    return () => {
      if (saveRef.current) {
        saveRef.current = null;
      }
      debouncedSave.cancel();
    };
  }, [debouncedSave]);

  // Handle form changes
  const handleFormChange = useCallback(
    (formData: Record<string, unknown>) => {
      setIsSaving(true);
      setError(null);
      return debouncedSave(formData, false);
    },
    [debouncedSave]
  );

  // Handle before unload
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        // Modern browsers handle this automatically
        e.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  // Clean up debounce on unmount
  useEffect(() => {
    return () => {
      debouncedSave.cancel();
    };
  }, [debouncedSave]);

  if (isLoading || !chapter) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (fetchError) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Failed to load chapter. Please try again.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="container w-full p-4 md:p-8 max-w-6xl mx-auto">
      {/* Header with save status */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <div>
          <Button variant="ghost" size="sm" asChild>
            <Link href={`/dashboard/books/${slug}/chapters/${chapterId}`}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to chapter
            </Link>
          </Button>
          <h1 className="text-2xl font-bold mt-2">Edit Chapter</h1>
          <p className="text-sm text-muted-foreground">
            {hasUnsavedChanges ? (
              <span className="text-amber-500">You have unsaved changes</span>
            ) : lastSaved ? (
              `Last saved: ${lastSaved.toLocaleString()}`
            ) : null}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isSaving && (
            <div className="flex items-center text-sm text-muted-foreground">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </div>
          )}
          <Button 
            type="submit" 
            form="chapter-form" 
            disabled={isSaving}
            className="flex items-center gap-2"
          >
            <Save className="h-4 w-4" />
            Save Changes
          </Button>
        </div>
      </div>

      {/* Error message */}
      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Main form */}
      <div className="bg-background">
        <ChapterForm
          bookId={String(chapter.bookId)}
          slug={slug}
          parentChapters={parentChapters}
          initialData={{
            id: String(chapter.id),
            title: chapter.title,
            content: typeof chapter.content === 'string' ? JSON.parse(chapter.content) : chapter.content || { type: 'doc', content: [] },
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
      </div>
    </div>
  );
}