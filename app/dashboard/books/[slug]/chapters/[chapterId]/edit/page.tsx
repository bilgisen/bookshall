'use client';

import React, { useCallback, useEffect, useRef, useState, useMemo } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ChapterHeader } from '@/components/chapters/chapter-header';
import ChapterForm from '@/components/chapters/ChapterForm';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, ArrowLeft, Loader2, Save } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import type { ChapterOption } from '@/components/chapters/ParentChapterSelect';
import debounce from 'lodash/debounce';
import { z } from 'zod';

type ContentType = string | Record<string, any> | null;

// Schema for form validation
const chapterFormSchema = z.object({
  title: z.string().min(1, 'Title is required').max(100, 'Title is too long'),
  content: z.unknown().optional().nullable(),
  parentChapterId: z.string().nullable(),
  order: z.number().int().min(0),
  bookId: z.string(),
  uuid: z.string().optional(),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
});

type ChapterFormValues = z.infer<typeof chapterFormSchema>;

interface BookInfo {
  id: number;
  title: string;
  slug: string;
  author?: string | null;
  coverImageUrl?: string | null;
  description?: string | null;
}

interface ChapterWithBook extends Omit<ChapterFormValues, 'id'> {
  id: string | number;
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
  content?: any;
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
type SaveFunction = (data: Record<string, any>) => Promise<void>;

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

export default function EditChapterPage({ params }: { params: { slug: string; chapterId: string } }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { slug, chapterId } = useParams<{ slug: string; chapterId: string }>();
  
  // State management
  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Refs
  const initialLoad = useRef(true);
  const saveRef = useRef<SaveFunction | null>(null);
  
  // Fetch chapter data
  const { 
    data: chapter, 
    isLoading, 
    error: fetchError, 
    refetch 
  } = useQuery<ChapterWithBook>({
    queryKey: ['chapter', slug, chapterId],
    queryFn: () => fetchChapter(slug!, chapterId!),
    enabled: !!slug && !!chapterId,
    refetchOnWindowFocus: false,
  });
  
  // Fetch parent chapters
  const { data: parentChapters = [], isLoading: isLoadingParents } = useQuery<ChapterOption[]>({
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
  const saveChapter = useCallback(async (data: Record<string, any>, isAutoSave = false): Promise<ChapterWithBook> => {
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
        toast.success('Changes saved successfully');
      }
      
      return updatedChapter;
    } catch (error) {
      console.error('Error in saveChapter:', error);
      throw error;
    }
  }, [chapter, slug, chapterId, queryClient]);

  // Debounced auto-save function
  const debouncedSave = useMemo(
    () =>
      debounce(
        async (data: Record<string, any>) => {
          if (isSaving) return; // Skip if already saving
          
          setIsSaving(true);
          try {
            await saveChapter(data, true);
            setLastSaved(new Date());
            setHasUnsavedChanges(false);
            toast.success('Auto-saved successfully', { 
              duration: 2000, 
              position: 'bottom-right' 
            });
          } catch (error) {
            console.error('Auto-save error:', error);
            // Don't show error toast for auto-save to avoid being annoying
          } finally {
            // Only reset saving state if there are no pending saves
            setTimeout(() => {
              setIsSaving(false);
            }, 300);
          }
        },
        AUTO_SAVE_DELAY,
        { leading: false, trailing: true, maxWait: AUTO_SAVE_DELAY * 2 }
      ),
    [saveChapter, isSaving]
  );

  // Update the save ref when debouncedSave changes
  useEffect(() => {
    const currentSaveRef = debouncedSave;
    const saveHandler: SaveFunction = async (data: Record<string, any>) => {
      setIsSaving(true);
      try {
        await currentSaveRef(data);
      } finally {
        setIsSaving(false);
      }
    };
    
    saveRef.current = saveHandler;
    
    return () => {
      if (saveRef.current) {
        saveRef.current = null;
      }
    };
  }, [debouncedSave]);

  // Handle form changes
  const handleFormChange = useCallback((formData: Record<string, any>) => {
    if (initialLoad.current) {
      initialLoad.current = false;
      return;
    }
    
    setHasUnsavedChanges(true);
    
    // Only include changed fields to minimize data being saved
    const updateData: Record<string, any> = {
      bookId: String(chapter?.bookId || formData.bookId)
    };
    
    // Skip auto-save if we're already saving
    if (isSaving) {
      return;
    }
    
    // Only include fields that have actually changed
    if (chapter) {
      const changedFields: Record<string, any> = {};
      
      // Check each field for changes
      if (formData.title !== undefined && formData.title !== chapter.title) {
        changedFields.title = String(formData.title);
      }
      
      if (formData.content !== undefined && formData.content !== chapter.content) {
        changedFields.content = formData.content;
      }
      
      if (formData.parentChapterId !== undefined && 
          String(formData.parentChapterId) !== String(chapter.parentChapterId)) {
        changedFields.parentChapterId = formData.parentChapterId || null;
      }
      
      if (formData.order !== undefined && formData.order !== chapter.order) {
        changedFields.order = Number(formData.order);
      }
      
      // Only proceed if there are actual changes
      if (Object.keys(changedFields).length > 0) {
        const updatePayload = { ...updateData, ...changedFields };
        
        // Use requestIdleCallback to prevent UI blocking
        if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
          requestIdleCallback(
            () => {
              if (saveRef.current) {
                saveRef.current(updatePayload);
              }
            },
            { timeout: 1000 }
          );
        } else if (saveRef.current) {
          // Fallback for browsers that don't support requestIdleCallback
          setTimeout(() => {
            if (saveRef.current) {
              saveRef.current(updatePayload);
            }
          }, 100);
        }
      }
    }
  }, [chapter]);

  // Handle manual save
  const handleManualSave = async (formData: Record<string, any>) => {
    if (!chapter || !chapterId || !slug) {
      const error = new Error('Missing required data for saving');
      console.error(error.message, { chapterId, slug, hasChapter: !!chapter });
      toast.error('Cannot save: Missing required data');
      return false;
    }
    
    try {
      setIsSaving(true);
      setError(null);
      
      // Prepare update data with type safety
      const updateData: Record<string, any> = {};
      
      // Define field transformations
      const fieldTransformations = {
        title: (val: any) => val ? String(val) : undefined,
        content: (val: any) => val !== undefined ? val : undefined,
        order: (val: any) => val !== undefined ? Number(val) : undefined,
        parentChapterId: (val: any) => val !== undefined ? (val || null) : undefined,
        level: (val: any) => val !== undefined ? Number(val) : undefined,
        wordCount: (val: any) => val !== undefined ? Number(val) : undefined,
        readingTime: (val: any) => val !== undefined ? Number(val) : undefined,
      } as const;
      
      // Apply transformations
      (Object.entries(fieldTransformations) as [keyof typeof fieldTransformations, any][]).forEach(([field, transform]) => {
        if (field in formData) {
          const value = formData[field];
          if (value !== undefined) {
            updateData[field] = transform(value);
          }
        }
      });
      
      console.log('Saving chapter with data:', { updateData });
      
      // Use the centralized save function
      await saveChapter(updateData, false);
      
      // Update state
      setLastSaved(new Date());
      setHasUnsavedChanges(false);
      
      return true;
    } catch (error) {
      console.error('Error saving chapter:', error);
      setError(error instanceof Error ? error.message : 'Failed to save chapter');
      throw error;
    } finally {
      setIsSaving(false);
    }
  };

  // Handle form submission
  const handleSubmit = async (formData: Record<string, any>) => {
    try {
      await handleManualSave(formData);
      // Use router.push for client-side navigation
      if (router && slug && chapterId) {
        router.push(`/dashboard/books/${slug}/chapters/${chapterId}/view`);
        router.refresh();
      }
    } catch (error) {
      console.error('Failed to save chapter:', error);
      toast.error('Failed to save chapter', {
        description: error instanceof Error ? error.message : 'An unknown error occurred',
      });
    }
  };

  // Handle before unload
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        // @ts-ignore - returnValue is supported in most browsers
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
            content: chapter.content || {} as any,
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
