// components/chapters/ChapterForm.tsx
'use client';

import React from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, Control } from 'react-hook-form';
import type * as z from 'zod';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import ChapterContentEditor from './ChapterContentEditor';
import type { ChapterOption } from './ParentChapterSelect';
import ParentChapterSelect from './ParentChapterSelect';
import { useRouter } from 'next/navigation';
import { useState, useMemo } from 'react';
import { Loader2 } from 'lucide-react';
import { chapterFormSchema, type ChapterFormValues } from '@/lib/validation/chapter';
import { authClient } from '@/lib/auth-client';
import { toast } from 'sonner';
import type { InferInsertModel } from 'drizzle-orm';
import { chapters } from '@/db/schema';

type DbChapter = InferInsertModel<typeof chapters> & {
  id?: string | number;
  uuid?: string;
};

interface BaseChapterFormProps {
  initialData?: DbChapter | null;
  bookId: number | string;  // Accept both number and string for flexibility
  parentChapters: ChapterOption[];
  onSuccess?: (chapterId: string) => void;
  onChange?: (data: Partial<ChapterFormValues>) => void;
  isSubmitting?: boolean;
}

// For new chapters, slug is required
interface NewChapterFormProps extends BaseChapterFormProps {
  initialData?: undefined;
  slug: string;
}

// For editing, slug is optional
interface EditChapterFormProps extends BaseChapterFormProps {
  initialData: DbChapter;
  slug?: string;
}

type ChapterFormProps = NewChapterFormProps | EditChapterFormProps;

export default function ChapterForm({ 
  initialData, 
  bookId, 
  parentChapters,
  onSuccess,
  onChange,
  isSubmitting = false,
  slug,
}: ChapterFormProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  // Prepare content for the form - ensure it's compatible with ChapterContentEditor
  const formContent = useMemo(() => {
    const content = initialData?.content;
    
    // If content is null or undefined, return empty doc structure
    if (content === null || content === undefined) {
      return { type: 'doc', content: [] };
    }
    
    // If it's already an object with the expected structure, return as is
    if (typeof content === 'object' && content !== null && 'type' in content && 'content' in content) {
      return content;
    }
    
    // If it's a string, process it
    if (typeof content === 'string') {
      const trimmedContent = content.trim();
      
      // Check if it's HTML
      const isHtml = /<[a-z][\s\S]*>/i.test(trimmedContent);
      
      if (isHtml) {
        // Preserve HTML as-is to avoid losing elements like <img>
        return trimmedContent;
      }
      
      // Try to parse as JSON
      try {
        const parsed = JSON.parse(trimmedContent);
        if (parsed && typeof parsed === 'object' && 'type' in parsed) {
          return parsed;
        }
      } catch {
        // If it's not valid JSON, create a doc with the text as content
        return {
          type: 'doc',
          content: [
            {
              type: 'paragraph',
              content: [
                {
                  type: 'text',
                  text: content
                }
              ]
            }
          ]
        };
      }
    }
    
    // Default fallback
    return { type: 'doc', content: [] };
  }, [initialData?.content]);

  // Ensure parentChapterId is properly formatted as a string before using it in defaultValues
  const formattedParentChapterId = React.useMemo(() => {
    if (!initialData?.parentChapterId) return null;
    return String(initialData.parentChapterId);
  }, [initialData?.parentChapterId]);

  // Create base values with proper string types for IDs
  const defaultValues: Omit<ChapterFormValues, 'uuid' | 'parentChapterId' | 'bookId'> & {
    id?: string | number;
    parentChapterId?: string | null;
    bookId: string;
    uuid?: string;
  } = {
    ...(initialData?.id && { id: initialData.id }),
    title: initialData?.title ?? '',
    content: formContent,
    parentChapterId: formattedParentChapterId, // Now properly declared
    order: initialData?.order ?? 0,
    level: initialData?.level ?? 1,
    isDraft: initialData?.isDraft ?? false,
    bookId: String(bookId),
    wordCount: initialData?.wordCount ?? 0,
    readingTime: initialData?.readingTime ?? null,
  };
  
  // Add uuid if it exists in the initial data
  if (initialData && 'uuid' in initialData && initialData.uuid) {
    defaultValues.uuid = String(initialData.uuid);
  }

  // Define form values type from schema
  type FormValues = z.infer<typeof chapterFormSchema>;
  
  // Initialize form with proper typing
  const form = useForm<FormValues>({
    // Use type assertion to handle the resolver type
    // @ts-expect-error - Type inference issue between react-hook-form and zod
    resolver: zodResolver(chapterFormSchema),
    defaultValues: {
      title: defaultValues.title || '',
      // Only include slug if it exists in defaultValues
      ...(defaultValues.slug !== undefined && { slug: defaultValues.slug }),
      content: (() => {
        if (!defaultValues.content) return '';
        
        // If it's already HTML content, return as is
        if (typeof defaultValues.content === 'string' && 
            defaultValues.content.trim().startsWith('<')) {
          return defaultValues.content;
        }
        
        // If it's an object, stringify it
        if (typeof defaultValues.content === 'object' && defaultValues.content !== null) {
          return JSON.stringify(defaultValues.content);
        }
        
        // For any other case, convert to string
        return String(defaultValues.content);
      })(),
      parentChapterId: defaultValues.parentChapterId ? String(defaultValues.parentChapterId) : null,
      order: Number(defaultValues.order) || 0,
      level: Number(defaultValues.level) || 1,
      wordCount: Number(defaultValues.wordCount) || 0,
      readingTime: defaultValues.readingTime ? Number(defaultValues.readingTime) : null,
      id: defaultValues.id ? String(defaultValues.id) : undefined,
      uuid: defaultValues.uuid,
      bookId: String(bookId), // Ensure bookId is always set
    },
  });
  
  // Watch for form changes and call onChange prop
  const watchFields = form.watch();
  React.useEffect(() => {
    if (onChange) {
      onChange(watchFields);
    }
  }, [watchFields, onChange]);
  
  // Get form control with proper typing
  const { control, handleSubmit } = form as unknown as {
    control: Control<FormValues>;
    handleSubmit: (onSubmit: (data: FormValues) => void) => (e?: React.FormEvent<HTMLFormElement>) => void;
    watch: () => FormValues;
  };
  
  // Ensure parentChapters is always an array and properly formatted
  const safeParentChapters = React.useMemo(() => {
    return (Array.isArray(parentChapters) ? parentChapters : []).map(chapter => {
      // Only disable the current chapter (if it exists)
      const isCurrentChapter = initialData?.id !== undefined && 
                             String(chapter.id) === String(initialData.id);
      
      return {
        ...chapter,
        id: String(chapter.id), // Ensure ID is always a string for consistency
        disabled: isCurrentChapter, // Only disable the current chapter
        level: chapter.level || 0
      };
    });
  }, [parentChapters, initialData?.id]);
  
  // Debug log to verify parent chapters
  React.useEffect(() => {
    console.log('Parent chapters:', safeParentChapters);
  }, [safeParentChapters]);
  
  // Wrap the async submit handler to match the expected type
  const handleFormSubmit = async (data: FormValues) => {
    try {
      // Process content before submission
      const processedData = { ...data };
      
      // Ensure content is properly formatted
      if (processedData.content) {
        // If it's already HTML, leave it as is
        if (typeof processedData.content === 'string' && 
            processedData.content.trim().startsWith('<')) {
          // No transformation needed for HTML content
        } 
        // If it's a JSON string, parse it to ensure it's valid
        else if (typeof processedData.content === 'string') {
          try {
            const parsed = JSON.parse(processedData.content);
            if (parsed && typeof parsed === 'object') {
              processedData.content = JSON.stringify(parsed);
            }
          } catch (error) {
            // If it's not valid JSON, leave as is (treat as plain text)
            console.log('Content is not JSON, treating as plain text', error);
          }
        }
      }
      
      await onSubmit(processedData);
    } catch (error) {
      console.error('Error in form submission:', error);
      toast.error('Failed to save chapter. Please try again.');
    }
  };

  // Handle form submission with proper typing
  const onSubmit = async (data: ChapterFormValues) => {
    try {
      setIsLoading(true);
      
      // Process content before submission
      let processedContent = data.content;
      
      // If content is a string that's not HTML, try to parse it as JSON
      if (typeof processedContent === 'string' && !processedContent.trim().startsWith('<')) {
        try {
          const parsed = JSON.parse(processedContent);
          if (parsed && typeof parsed === 'object') {
            processedContent = JSON.stringify(parsed);
          }
        } catch (error) {
          // If it's not valid JSON, leave as is (treat as plain text)
          console.log('Content is not JSON, treating as plain text', error);
        }
      }
      
      // Prepare the form data
      const formData = {
        ...data,
        content: processedContent,
        bookId: Number(bookId),
        parentChapterId: data.parentChapterId ? Number(data.parentChapterId) : null,
      };
      
      // Ensure content is properly formatted and upload any blob: images at save time
      if (formData.content) {
        // If content is an HTML string, scan for blob: images and upload them
        if (typeof formData.content === 'string' && formData.content.trim().startsWith('<')) {
          const html = formData.content;
          // Only do work if blob: URLs are present
          if (html.includes('src="blob:') || html.includes("src='blob:")) {
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');
            const images = Array.from(doc.querySelectorAll('img[src^="blob:"]')) as HTMLImageElement[];
            for (const img of images) {
              const blobUrl = img.getAttribute('src');
              if (!blobUrl) continue;
              try {
                const res = await fetch(blobUrl);
                const blob = await res.blob();
                const filename = `editor-upload-${Date.now()}-${Math.random().toString(36).slice(2)}.${(blob.type.split('/')[1] || 'png')}`;
                const fd = new FormData();
                // Append the blob directly; Next API reads as File on the server
                fd.append('file', blob, filename);
                const uploadRes = await fetch('/api/upload-image', { method: 'POST', body: fd, credentials: 'include' });
                if (uploadRes.ok) {
                  const { url } = await uploadRes.json();
                  if (typeof url === 'string' && url.length > 0) {
                    img.setAttribute('src', url);
                    img.setAttribute('alt', img.getAttribute('alt') || filename);
                    img.setAttribute('title', img.getAttribute('title') || filename);
                  }
                } else {
                  // If upload fails, leave the blob URL; server-side renderer won't display it but avoid blocking save
                  console.error('Failed to upload blob image during save');
                }
              } catch (e) {
                console.error('Error uploading blob image during save:', e);
              }
            }
            // Serialize the updated HTML back
            formData.content = doc.body.innerHTML;
          }
          // else leave HTML as is
        } else if (typeof formData.content === 'object') {
          // If it's an object, stringify it
          formData.content = JSON.stringify(formData.content);
        }
      }
      
      const session = await authClient.getSession();
      const sessionId = session?.data?.session?.id;
      if (!sessionId) {
        throw new Error('Not authenticated');
      }

      if (!slug) {
        throw new Error('Book slug is required');
      }
      
      // Prepare the chapter data for the API
      const chapterPayload = {
        ...formData,
        order: Number(formData.order) || 0,
        level: Number(formData.level) || 1,
        wordCount: Number(formData.wordCount) || 0,
        readingTime: formData.readingTime ? Number(formData.readingTime) : null,
        uuid: formData.uuid,
        ...(formData.id && { id: String(formData.id) }),
      };
      
      // For PATCH requests, we should have an ID from initialData
      const chapterId = initialData?.id ? String(initialData.id) : undefined;
      
      if (initialData && !chapterId) {
        throw new Error('Chapter ID is required for updating');
      }

      // Use slug-based URL for the API endpoint
      const apiUrl = chapterId 
        ? `/api/books/by-slug/${slug}/chapters/${chapterId}`
        : `/api/books/by-slug/${slug}/chapters`;

      console.log('Making API request:', {
        method: initialData ? 'PATCH' : 'POST',
        url: apiUrl,
        hasId: !!formData.id,
        slug,
        chapterId: formData.id
      });

      const response = await fetch(apiUrl, {
        method: initialData ? 'PATCH' : 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify(chapterPayload),
      });

      const contentType = response.headers.get('content-type');
      let responseData;
      
      if (contentType && contentType.includes('application/json')) {
        responseData = await response.json();
      } else {
        const text = await response.text();
        throw new Error(`Unexpected response format: ${text.substring(0, 200)}`);
      }

      if (!response.ok) {
        throw new Error(
          responseData.error?.message || 
          responseData.message || 
          `Failed to ${initialData ? 'update' : 'create'} chapter`
        );
      }

      toast.success(initialData ? 'Chapter updated successfully' : 'Chapter created successfully');

      if (onSuccess) {
        onSuccess(responseData.id);
      } else if (!initialData) {
        // Use slug in the URL for consistency
        router.push(`/dashboard/books/${slug}/chapters/${responseData.id}/view`);
        router.refresh();
      } else if (initialData) {
        // For updates, redirect to the view page
        router.push(`/dashboard/books/${slug}/chapters/${responseData.id}/view`);
        router.refresh();
      }
    } catch (error) {
      console.error('Error saving chapter:', error);
      toast.error(
        error instanceof Error 
          ? error.message 
          : 'Failed to save chapter. Please try again.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <FormField
              control={control} // Using the properly typed control
              name="title"
              render={({ field }) => (
                <FormItem className="md:col-span-2">
                  <FormLabel className="text-sm text-muted-foreground">Chapter Title</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="Enter chapter title" 
                      {...field} 
                      disabled={isLoading}
                      className="w-full"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={control} // Using the properly typed control
              name="parentChapterId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm text-muted-foreground">Parent Chapter (Optional)</FormLabel>
                  <FormControl>
                    <div className="w-full">
                      <ParentChapterSelect
                        parentChapters={safeParentChapters}
                        value={field.value !== null && field.value !== undefined ? String(field.value) : null}
                        onChange={(value: string | null) => {
                          field.onChange(value ? Number(value) : null);
                        }}
                        disabled={isLoading}
                        placeholder="Select parent chapter"
                      />
                      {safeParentChapters.length === 0 && !isLoading && (
                        <p className="text-xs text-muted-foreground mt-1">
                          No other chapters available to select as parent
                        </p>
                      )}
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={control}
            name="content"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <ChapterContentEditor
                    value={field.value}
                    onChange={field.onChange}
                    disabled={isLoading}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="flex justify-between pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={isLoading || isSubmitting}>
            {isLoading || isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {isSubmitting ? 'Saving...' : 'Loading...'}
              </>
            ) : (
              'Save Chapter'
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
}