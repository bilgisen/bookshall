'use client';

import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Skeleton } from '@/components/ui/skeleton';
import { ChapterHeader } from '@/components/chapters/chapter-header';
import { ChapterTreeArborist } from '@/components/chapters/ChapterTreeArborist';
import { authClient } from '@/lib/auth-client';

export default function BookChaptersPage() {
  const { slug } = useParams();
  const { data: session } = authClient.useSession();
  
  // Fetch book details
  const { data: book, isLoading: isLoadingBook } = useQuery({
    queryKey: ['book', slug],
    queryFn: async () => {
      const response = await fetch(`/api/books/by-slug/${slug}`);
      if (!response.ok) throw new Error('Failed to fetch book');
      return response.json();
    },
    enabled: !!slug && !!session?.user,
  });

  // Handle loading state
  if (isLoadingBook || !session) {
    return (
      <div className="container mx-auto py-8 space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-6 w-48" />
        <div className="space-y-2 mt-4">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      </div>
    );
  }

  if (!book) {
    return (
      <div className="container mx-auto py-8">
        <p>Book not found</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-8 space-y-6">
      <ChapterHeader 
        title="Chapters" 
        bookName={book.title} 
      />
      
      <div className="p-0">
        <ChapterTreeArborist 
          bookSlug={slug as string}
          onSelectChapter={(chapter) => {
            // Handle chapter selection
            console.log('Selected chapter:', chapter);
          }}
          onViewChapter={(chapter) => {
            // Handle view chapter
            window.open(`/dashboard/books/${slug}/chapters/${chapter.id}`, '_blank');
          }}
          onEditChapter={(chapter) => {
            // Handle edit chapter
            window.location.href = `/dashboard/books/${slug}/chapters/${chapter.id}/edit`;
          }}
          onDeleteChapter={async (chapter) => {
            // Handle delete chapter
            if (confirm('Are you sure you want to delete this chapter?')) {
              try {
                const response = await fetch(`/api/chapters/${chapter.id}`, {
                  method: 'DELETE',
                });
                if (!response.ok) throw new Error('Failed to delete chapter');
                // Refresh the list
                window.location.reload();
              } catch (error) {
                console.error('Error deleting chapter:', error);
                alert('Failed to delete chapter');
              }
            }
          }}
        />
      </div>
    </div>
  );
}
