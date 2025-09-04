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
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { ChapterContentEditor } from './ChapterContentEditor';
import type { Chapter } from '@/types/chapter';
import type { ChapterOption } from './ParentChapterSelect';
import ParentChapterSelect from './ParentChapterSelect';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { chapterFormSchema } from '@/lib/validation/chapter';

// Define the form values type
type FormData = {
  title: string;
  content: any; // Consider replacing 'any' with a more specific type
  parentChapterId?: number | null;
  order: number;
  level: number;
  bookId: number;
};

interface ChapterFormProps {
  initialData?: Chapter | null;
  bookId: number;
  parentChapters: ChapterOption[];
  onSuccess?: () => void;
}

export function ChapterForm({ 
  initialData, 
  bookId, 
  parentChapters,
  onSuccess 
}: ChapterFormProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<FormData>({
    resolver: zodResolver(chapterFormSchema) as any,
    defaultValues: {
      title: initialData?.title || '',
      content: initialData?.content || { type: 'p', children: [{ text: '' }] },
      parentChapterId: initialData?.parentChapterId ?? null,
      order: initialData?.order ?? 0,
      level: initialData?.level ?? 1,
      bookId,
    },
  });

  const onSubmit: SubmitHandler<FormData> = async (values) => {
    try {
      setIsLoading(true);
      const url = initialData 
        ? `/api/books/${bookId}/chapters/${initialData.id}`
        : `/api/books/${bookId}/chapters`;
      
      const method = initialData ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(values),
      });

      if (!response.ok) {
        throw new Error('Failed to save chapter');
      }

      const data = await response.json();
      
      // Use window.alert as a fallback for toast
      alert(initialData ? 'Chapter updated' : 'Chapter created');

      if (onSuccess) {
        onSuccess();
      } else if (!initialData) {
        router.push(`/dashboard/books/${bookId}/chapters/${data.id}`);
      }
    } catch (error) {
      console.error('Error saving chapter:', error);
      alert('Failed to save chapter. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="space-y-4">
          <FormField
            control={form.control}
            name="title"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Chapter Title</FormLabel>
                <FormControl>
                  <Input 
                    placeholder="Enter chapter title" 
                    {...field} 
                    disabled={isLoading}
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
                <FormLabel>Parent Chapter (Optional)</FormLabel>
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
                <FormDescription>
                  Select a parent chapter if this is a sub-chapter
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="content"
            render={({ field }) => (
              <FormItem>

                <FormControl>
                  <div className="rounded-md border">
                    <ChapterContentEditor
                      value={field.value}
                      onChange={(value: any) => field.onChange(value)}
                      readOnly={isLoading}
                    />
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

        </div>

        <div className="flex items-center justify-end space-x-4">
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