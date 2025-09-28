'use client';

import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Skeleton } from '@/components/ui/skeleton';
import { BookHeader } from '@/components/books/book-header';
import { BooksMenu } from '@/components/books/books-menu';
import { ChapterTreeArborist } from '@/components/chapters/ChapterTreeArborist';
import { SingleBookView } from '@/components/books/single-book-view';
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
      <div className="container mx-auto p-8 space-y-4">
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
      <div className="container mx-auto p-8">
        <p>Book not found</p>
      </div>
    );
  }

  return (
    <div className="container w-full p-8 space-y-6">
      <BookHeader 
        title="Chapters"
        description={book.title}
      >
        <BooksMenu bookSlug={book.slug} />
      </BookHeader>
      
      <div className="flex flex-col lg:flex-row gap-8">
        {/* Main Content */}
        <div className="flex-1">
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

        {/* Right Sidebar */}
        <div className="lg:w-80">
          <SingleBookView 
            book={{
              id: book.id,
              slug: book.slug,
              title: book.title,
              author: book.author || undefined,
              coverImageUrl: book.coverImageUrl || undefined,
              publisher: book.publisher || undefined
            }}
          />
        </div>
      </div>
    </div>
  );
}
