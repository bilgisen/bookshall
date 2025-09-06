import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { authClient } from '@/lib/auth-client';
import type { Chapter, ChapterFormValues } from '@/types/chapter';

// Helper function to handle API requests
const fetchApi = async (url: string, options: RequestInit = {}) => {
  const { data: session } = await authClient.getSession();
  
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    credentials: 'include',
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || 'An error occurred');
  }

  return response.json();
};

// Hook for getting a single chapter
export function useGetChapter(chapterId?: string) {
  return useQuery<Chapter>({
    queryKey: ['chapter', chapterId],
    queryFn: async () => {
      if (!chapterId) throw new Error('Chapter ID is required');
      return fetchApi(`/api/chapters/${chapterId}`);
    },
    enabled: !!chapterId,
  });
}

// Hook for updating a chapter
export function useUpdateChapter() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: number } & Partial<ChapterFormValues>) => {
      return fetchApi(`/api/chapters/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(updates),
      });
    },
    onSuccess: (data, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['chapter', id] });
      queryClient.invalidateQueries({ queryKey: ['chapters'] });
      toast.success('Chapter updated successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update chapter');
    },
  });
}

// Hook for deleting a chapter
export function useDeleteChapter() {
  const queryClient = useQueryClient();
  const router = useRouter();
  
  return useMutation({
    mutationFn: async (id: number) => {
      return fetchApi(`/api/chapters/${id}`, {
        method: 'DELETE',
      });
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['chapters'] });
      toast.success('Chapter deleted successfully');
      router.push('/dashboard/books');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to delete chapter');
    },
  });
}
