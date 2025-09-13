'use client';

import { useQuery } from '@tanstack/react-query';
import { authClient } from '@/lib/auth-client';
import { toast } from 'sonner';
import { Book } from '@/types/book';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BookHeader } from '@/components/books/book-header';
import { Plus } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { Skeleton } from '@/components/ui/skeleton';

async function fetchBooks(): Promise<Book[]> {
  try {
    const { data: session } = await authClient.getSession();
    if (!session?.user || !session.session?.id) {
      throw new Error('Not authenticated');
    }

    const response = await fetch('/api/books/by-slug', {
      method: 'GET',
      credentials: 'include',
      headers: {
        'Cache-Control': 'no-cache',
        'Content-Type': 'application/json',
        'Cookie': `session=${session.session.id}`
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('Failed to fetch books:', {
        status: response.status,
        statusText: response.statusText,
        errorData
      });
      throw new Error(errorData.error || 'Failed to fetch books');
    }

    const books = await response.json();
    console.log('Fetched books:', books);
    return books;
  } catch (error) {
    console.error('Error in fetchBooks:', error);
    throw error;
  }
}

// Skeleton Loader Component
const BookCardSkeleton = () => (
  <div className="space-y-3">
    <Skeleton className="h-48 w-full rounded-lg" />
    <div className="space-y-2">
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-4 w-1/2" />
    </div>
  </div>
);

export default function BooksPage() {
  const { data: books, isLoading, error } = useQuery<Book[]>({
    queryKey: ['books'],
    queryFn: fetchBooks,
    retry: 1,
  });

  if (error) {
    toast.error('Failed to load books');
  }

  return (
    <div className="container mx-auto p-8 space-y-6">
      <BookHeader 
        title="My Books" 
        description="Manage your book collection"
        slug="" // Empty string to show the menu but disable book-specific actions
      >
        <Button asChild>
          <Link href="/dashboard/books/new">
            <Plus className="mr-2 h-4 w-4" /> Add Book
          </Link>
        </Button>
      </BookHeader>

      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6">
          {[...Array(8)].map((_, i) => (
            <BookCardSkeleton key={i} />
          ))}
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center py-12 text-center space-y-4">
          <p className="text-muted-foreground">Failed to load books. Please try again.</p>
          <Button variant="outline" onClick={() => window.location.reload()}>
            Retry
          </Button>
        </div>
      ) : books?.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center space-y-4">
          <p className="text-muted-foreground">No books found. Create your first book to get started.</p>
          <Button asChild>
            <Link href="/dashboard/books/new">
              <Plus className="mr-2 h-4 w-4" /> Create Book
            </Link>
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6">
          {books?.map((book) => (
            <Link 
              key={book.slug} 
              href={`/dashboard/books/${book.slug}/view`}
              className="group"
            >
              <Card className="h-full overflow-hidden transition-all bg-card/20 duration-200 hover:shadow-lg hover:border-primary/20 p-2">
                <CardContent className="p-0 [&>div]:!m-0">
                  <div className="relative aspect-[9/14] w-full">
                    {book.coverImageUrl ? (
                      <Image
                        src={book.coverImageUrl}
                        alt={`${book.title} cover`}
                        fill
                        className="object-cover transition-transform duration-300 group-hover:scale-105"
                        sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33.33vw, 25vw"
                      />
                    ) : (
                      <div className="h-full w-full bg-muted flex items-center justify-center">
                        <span className="text-muted-foreground text-sm">No cover</span>
                      </div>
                    )}
                  </div>
                </CardContent>
                <CardHeader className="px-2 py-0">
                  <CardTitle className="text-base font-semibold line-clamp-2">
                    {book.title}
                  </CardTitle>
                  {book.author && (
                    <p className="text-sm text-muted-foreground line-clamp-1">
                      {book.author}
                    </p>
                  )}
                </CardHeader>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}