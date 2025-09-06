'use client';

import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';
import { authClient } from '@/lib/auth-client';
import { toast } from 'sonner';
import { Book } from '@/types/book';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';

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

export default function BooksPage() {
  const router = useRouter();
  
  const { data: books, isLoading, error, refetch } = useQuery({
    queryKey: ['books'],
    queryFn: fetchBooks,
    retry: 1,
    retryDelay: 1000,
  });

  useEffect(() => {
    if (error) {
      console.error('Error fetching books:', error);
      if (error instanceof Error) {
        if (error.message === 'Not authenticated') {
          router.push('/sign-in');
          return;
        }
        toast.error(`Failed to load books: ${error.message}`, {
          action: {
            label: 'Retry',
            onClick: () => refetch(),
          },
        });
      } else {
        toast.error('Failed to load books. Please try again later.', {
          action: {
            label: 'Retry',
            onClick: () => refetch(),
          },
        });
      }
    }
  }, [error, router, refetch]);

  if (isLoading) {
    return (
      <div className="container mx-auto p-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">My Books</h1>
          <Button asChild>
            <Link href="/dashboard/books/new">
              <Plus className="mr-2 h-4 w-4" /> Add Book
            </Link>
          </Button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <div className="h-48 bg-muted" />
              <CardHeader>
                <div className="h-4 bg-muted rounded w-3/4" />
              </CardHeader>
              <CardContent>
                <div className="h-3 bg-muted rounded w-1/2 mb-2" />
                <div className="h-3 bg-muted rounded w-1/4" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">My Books</h1>
        <Button asChild>
          <Link href="/dashboard/books/new">
            <Plus className="mr-2 h-4 w-4" /> Add Book
          </Link>
        </Button>
      </div>

      {!isLoading && (!books || books.length === 0) ? (
        <div className="text-center py-12">
          <div className="mx-auto w-24 h-24 bg-muted rounded-full flex items-center justify-center mb-4">
            <BookOpen className="h-12 w-12 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-medium">No books yet</h3>
          <p className="text-muted-foreground mb-4">
            Get started by creating your first book
          </p>
          <Button asChild>
            <Link href="/dashboard/books/new">Create Book</Link>
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {books?.map((book: Book) => (
            <Card key={book.id} className="hover:shadow-lg transition-shadow">
              <div className="relative h-48">
                {book.coverImageUrl ? (
                  <Image
                    src={book.coverImageUrl}
                    alt={book.title}
                    fill
                    className="object-cover rounded-t-lg"
                  />
                ) : (
                  <div className="w-full h-full bg-muted flex items-center justify-center">
                    <BookOpen className="h-12 w-12 text-muted-foreground" />
                  </div>
                )}
              </div>
              <CardHeader>
                <CardTitle className="line-clamp-1">{book.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  {book.author}
                </p>
                {book.publishYear && (
                  <p className="text-sm text-muted-foreground">
                    {new Date(book.publishYear).getFullYear()}
                  </p>
                )}
              </CardContent>
              <CardFooter className="flex justify-between">
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/dashboard/books/${book.slug}/view`}>View</Link>
                </Button>
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/dashboard/books/${book.slug}/chapters`}>
                    Chapters
                  </Link>
                </Button>
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/dashboard/books/${book.slug}/edit`}>Edit</Link>
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function BookOpen(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" />
    </svg>
  );
}