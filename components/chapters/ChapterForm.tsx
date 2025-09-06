'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, type SubmitHandler } from 'react-hook-form';
import type * as z from 'zod';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
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

type DbChapter = InferInsertModel<typeof chapters>;

interface BaseChapterFormProps {
  initialData?: DbChapter | null;
  bookId: number;
  parentChapters: ChapterOption[];
  onSuccess?: (chapterId: string) => void;
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

export function ChapterForm({ 
  initialData, 
  bookId, 
  slug,
  parentChapters,
  onSuccess 
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

  const form = useForm<ChapterFormValues>({
    resolver: zodResolver(chapterFormSchema) as any, // Temporary type assertion
    defaultValues: {
      title: initialData?.title ?? '',
      content: formContent,
      parentChapterId: initialData?.parentChapterId ?? null,
      order: initialData?.order ?? 0,
      level: initialData?.level ?? 1,
      bookId: bookId,
      wordCount: initialData?.wordCount ?? 0,
      readingTime: initialData?.readingTime ?? null,
      uuid: initialData?.uuid ?? '',
    },
  });

  const handleSubmit: SubmitHandler<ChapterFormValues> = async (data) => {
    try {
      setIsLoading(true);

      // Get the session
      const { data: session } = await authClient.getSession();
      
      if (!session?.user || !session?.session?.id) {
        router.push('/sign-in');
        return;
      }

      // Get the book slug from the URL
      const urlSlug = window.location.pathname.split('/')[3];
      if (!urlSlug) {
        throw new Error('Could not determine book slug from URL');
      }

      // Prepare chapter data - send content as is (Tiptap JSON or HTML string)
      const chapterData = {
        title: data.title,
        content: data.content, // Let the API handle the format conversion
        parentChapterId: data.parentChapterId || null,
        order: data.order || 0,
        level: data.level || 1,
        wordCount: data.wordCount || 0,
        readingTime: data.readingTime || null,
        bookId: data.bookId,
        uuid: data.uuid,
      };

      const bookSlug = urlSlug || (initialData ? `book-${bookId}` : '');
      
      if (!bookSlug) {
        throw new Error('Book slug is required for creating new chapters');
      }
      
      const apiUrl = initialData
        ? `/api/books/by-slug/${bookSlug}/chapters/${initialData.id}`
        : `/api/books/by-slug/${bookSlug}/chapters`;

      const response = await fetch(apiUrl, {
        method: initialData ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': `session=${session.session.id}`
        },
        credentials: 'include',
        body: JSON.stringify(chapterData),
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
        router.push(`/dashboard/books/${urlSlug}/chapters/${responseData.id}/view`);
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
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <FormField
              control={form.control}
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
              control={form.control}
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
            control={form.control}
            name="content"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <ChapterContentEditor
                    value={field.value} // This can be string or object - ChapterContentEditor handles both
                    onChange={field.onChange}
                    disabled={isLoading}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Removed wordCount, readingTime, level, and order fields as requested */}
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
          <Button type="submit" disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {initialData ? 'Update Chapter' : 'Create Chapter'}
          </Button>
        </div>
      </form>
    </Form>
  );
}