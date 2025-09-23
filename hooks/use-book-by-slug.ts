// hooks/use-book-by-slug.ts
import { useQuery } from '@tanstack/react-query';

export interface Book {
  id: string;
  title: string;
  slug: string;
  description?: string;
  coverImageUrl?: string | null;
  epubUrl?: string | null;
  author?: string | null;
  publisher?: string | null;
  [key: string]: unknown;
}

export function useBookBySlug(slug: string | undefined, enabled: boolean = true) {
  const { data, isLoading, error } = useQuery<Book>({
    queryKey: ['book', slug],
    queryFn: async () => {
      const response = await fetch(`/api/books/by-slug/${slug}`);
      if (!response.ok) throw new Error('Failed to fetch book');
      return response.json();
    },
    enabled: !!slug && enabled,
    staleTime: 1000 * 60 * 5, // 5 dakika
  });

  return {
    book: data,
    isLoading,
    error,
  };
}