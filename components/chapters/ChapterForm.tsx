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
import { chapters } from '@/db';

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
    
    // If content is null or undefined, return empty string
    if (content === null || content === undefined) {
      return '';
    }
    
    // If it's already a string, return as is
    if (typeof content === 'string') {
      return content;
    }
    
    // If it's an object (Tiptap JSON), return as is - ChapterContentEditor will handle it
    return content;
  }, [initialData?.content]);

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
    parentChapterId: initialData?.parentChapterId ? String(initialData.parentChapterId) : null,
    order: initialData?.order ?? 0,
    level: initialData?.level ?? 1,
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
      bookId: defaultValues.bookId ? String(defaultValues.bookId) : '',
      parentChapterId: defaultValues.parentChapterId ? String(defaultValues.parentChapterId) : null,
      title: defaultValues.title || '',
      // Handle both string and object content types
      content: (() => {
        if (!defaultValues.content) return '';
        if (typeof defaultValues.content === 'string') return defaultValues.content;
        return JSON.stringify(defaultValues.content);
      })(),
      order: Number(defaultValues.order) || 0,
      level: Number(defaultValues.level) || 1,
      wordCount: Number(defaultValues.wordCount) || 0,
      readingTime: defaultValues.readingTime ? Number(defaultValues.readingTime) : null,
      id: defaultValues.id ? String(defaultValues.id) : undefined,
      uuid: defaultValues.uuid,
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
  
  // Wrap the async submit handler to match the expected type
  const handleFormSubmit = (data: FormValues) => {
    onSubmit(data).catch(console.error);
  };

  // Handle form submission with proper typing
  const onSubmit = async (formValues: FormValues) => {
    try {
      setIsLoading(true);
      
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
        ...formValues,
        bookId: String(bookId), // Ensure bookId is a string
        parentChapterId: formValues.parentChapterId || null,
        order: Number(formValues.order) || 0,
        level: Number(formValues.level) || 1,
        wordCount: Number(formValues.wordCount) || 0,
        readingTime: formValues.readingTime ? Number(formValues.readingTime) : null,
        uuid: formValues.uuid,
        ...(formValues.id && { id: String(formValues.id) }),
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
        hasId: !!formValues.id,
        slug,
        chapterId: formValues.id
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
                    <ParentChapterSelect
                      parentChapters={parentChapters}
                      value={field.value?.toString() ?? ''}
                      onChange={(value: string | null) => 
                        field.onChange(value ? Number(value) : null)
                      }
                      disabled={isLoading}
                    />
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