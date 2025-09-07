'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Loader2, Save, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useGetChapter, useUpdateChapter, useDeleteChapter } from '@/hooks/useChapterApi';
import type { ChapterFormValues } from '@/types/chapter';

export function ChapterDetails() {
  const { chapterId } = useParams<{ chapterId: string }>();

  const [formData, setFormData] = useState<Pick<ChapterFormValues, 'title' | 'content'>>({
    title: '',
    content: '',
  });

  // Fetch chapter data
  const { data: chapter, isLoading, error } = useGetChapter(chapterId);
  
  // Setup mutations
  const updateChapter = useUpdateChapter();
  const deleteChapter = useDeleteChapter();

  // Update form data when chapter data is loaded
  useEffect(() => {
    if (chapter) {
      // Safely handle chapter content which could be string or object
      const chapterContent = typeof chapter.content === 'string' 
        ? chapter.content 
        : JSON.stringify(chapter.content, null, 2);
        
      setFormData({
        title: chapter.title || '',
        content: chapterContent,
      });
    }
  }, [chapter]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chapterId || updateChapter.isPending) return;
    
    try {
      // Parse content if it's a JSON string, otherwise use as-is
      let content: string | object = formData.content;
      try {
        content = JSON.parse(formData.content) as object;
      } catch {
        // If it's not valid JSON, use it as a string
        content = formData.content;
      }
      
      // Create the update data with correct typing
      const updateData = {
        id: parseInt(chapterId, 10), // Convert string ID to number
        title: formData.title,
        content,
      };
      
      await updateChapter.mutateAsync(updateData as { id: number } & Partial<ChapterFormValues>);
    } catch (error) {
      // Error is already handled by the mutation's onError callback
      console.error('Failed to update chapter:', error);
    }
  };

  const handleDelete = async () => {
    if (!chapterId || deleteChapter.isPending) return;
    
    if (confirm('Are you sure you want to delete this chapter? This action cannot be undone.')) {
      try {
        await deleteChapter.mutateAsync(parseInt(chapterId, 10));
      } catch (error) {
        // Error is already handled by the mutation's onError callback
        console.error('Failed to delete chapter:', error);
      }
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
      </div>
    );
  }

  if (error) {
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return (
      <div className="p-8 text-center text-red-500">
        Error loading chapter: {errorMessage}
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label htmlFor="title" className="block text-sm font-medium mb-1">
            Title
          </label>
          <Input
            id="title"
            name="title"
            value={formData.title}
            onChange={handleChange}
            placeholder="Chapter title"
            className="w-full"
          />
        </div>

        <div>
          <label htmlFor="content" className="block text-sm font-medium mb-1">
            Content
          </label>
          <Textarea
            id="content"
            name="content"
            value={formData.content}
            onChange={handleChange}
            placeholder="Chapter content"
            rows={10}
            className="w-full font-mono text-sm"
          />
        </div>

        <div className="flex justify-between pt-4 border-t">
          <Button
            type="button"
            variant="destructive"
            onClick={handleDelete}
            disabled={deleteChapter.isPending}
          >
            {deleteChapter.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="mr-2 h-4 w-4" />
            )}
            Delete Chapter
          </Button>
          
          <Button
            type="submit"
            disabled={updateChapter.isPending}
          >
            {updateChapter.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            Save Changes
          </Button>
        </div>
      </form>
    </div>
  );
}