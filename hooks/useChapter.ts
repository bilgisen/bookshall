import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { authClient } from '@/lib/auth-client';
import type { 
  Chapter, 
  ChapterWithBook,
  ChapterFormValues 
} from '@/types/chapter';

interface UseChapterOptions {
  bookSlug?: string;
  chapterId?: string;
  enabled?: boolean;
}

export function useChapter({ bookSlug, chapterId, enabled = true }: UseChapterOptions) {
  const queryClient = useQueryClient();
  const router = useRouter();

  // Get a single chapter
  const {
    data: chapter,
    isLoading,
    error,
    isError,
  } = useQuery<ChapterWithBook, Error>({
    queryKey: ['chapter', bookSlug, chapterId],
    queryFn: async () => {
      if (!bookSlug || !chapterId) {
        throw new Error('Book slug and chapter ID are required');
      }

      const { data: session } = await authClient.getSession();
      if (!session?.user) {
        router.push('/sign-in');
        throw new Error('Not authenticated');
      }

      const response = await fetch(`/api/books/by-slug/${bookSlug}/chapters/${chapterId}`, {
        credentials: 'include',
        headers: {
          'Cache-Control': 'no-cache',
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch chapter');
      }

      return data;
    },
    enabled: !!bookSlug && !!chapterId && enabled,
    retry: 1,
  });

  // Update a chapter
  const updateChapter = useMutation({
    mutationFn: async (updatedChapter: Partial<Chapter>) => {
      if (!bookSlug || !chapterId) {
        throw new Error('Book slug and chapter ID are required');
      }

      const response = await fetch(`/api/books/by-slug/${bookSlug}/chapters/${chapterId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatedChapter),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update chapter');
      }

      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['chapter', bookSlug, chapterId] });
      queryClient.invalidateQueries({ queryKey: ['chapters', bookSlug] });
      toast.success('Chapter updated successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update chapter');
    },
  });

  // Delete a chapter
  const deleteChapter = useMutation({
    mutationFn: async () => {
      if (!bookSlug || !chapterId) {
        throw new Error('Book slug and chapter ID are required');
      }

      const response = await fetch(`/api/books/by-slug/${bookSlug}/chapters/${chapterId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete chapter');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chapters', bookSlug] });
      toast.success('Chapter deleted successfully');
      router.push(`/dashboard/books/${bookSlug}`);
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to delete chapter');
    },
  });

  return {
    chapter,
    isLoading,
    error,
    isError,
    updateChapter: updateChapter.mutateAsync,
    isUpdating: updateChapter.isPending,
    deleteChapter: deleteChapter.mutateAsync,
    isDeleting: deleteChapter.isPending,
  };
}

// Hook for creating a new chapter
export function useCreateChapter(bookSlug: string) {
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: async (newChapter: Omit<ChapterFormValues, 'id'>) => {
      const response = await fetch(`/api/books/by-slug/${bookSlug}/chapters`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newChapter),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create chapter');
      }

      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['chapters', bookSlug] });
      toast.success('Chapter created successfully');
      router.push(`/dashboard/books/${bookSlug}/chapters/${data.id}/edit`);
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create chapter');
    },
  });
}

// Hook for getting chapter HTML content
export function useChapterHtml(chapterId?: string) {
  return useQuery({
    queryKey: ['chapter-html', chapterId],
    queryFn: async () => {
      if (!chapterId) return null;
      
      const response = await fetch(`/api/chapters/${chapterId}/html`);
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to load chapter content');
      }
      
      return response.text();
    },
    enabled: !!chapterId,
  });
}
