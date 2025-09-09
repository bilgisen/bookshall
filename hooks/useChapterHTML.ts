import { useQuery } from '@tanstack/react-query';

interface ChapterHTMLOptions {
  enabled?: boolean;
}

export function useChapterHTML(chapterId: string | undefined, options: ChapterHTMLOptions = {}) {
  return useQuery({
    queryKey: ['chapter-html', chapterId],
    queryFn: async () => {
      if (!chapterId) return null;
      
      const response = await fetch(`/api/chapters/${chapterId}/html`, {
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch chapter HTML');
      }
      
      return await response.text();
    },
    enabled: options.enabled !== false && !!chapterId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
  });
}
