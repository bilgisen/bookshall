'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { BookForm } from '@/components/books/book-form';

export default function EditBookPage() {
  const router = useRouter();
  const { slug } = useParams<{ slug: string }>();
  const [book, setBook] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Client-side auth check and book data fetching
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Check authentication
        const authResponse = await fetch('/api/auth/session');
        if (!authResponse.ok) {
          router.push('/sign-in');
          return;
        }

        // Fetch book data
        const bookResponse = await fetch(`/api/books/${slug}`, {
          credentials: 'include',
        });

        if (!bookResponse.ok) {
          throw new Error('Failed to fetch book');
        }

        const bookData = await bookResponse.json();
        setBook(bookData);
      } catch (error) {
        console.error('Error:', error);
        toast.error('Failed to load book data');
        router.push('/dashboard/books');
      } finally {
        setIsLoading(false);
      }
    };

    if (slug) {
      fetchData();
    }
  }, [slug, router]);

  const handleSubmit = async (data: any) => {
    try {
      const response = await fetch(`/api/books/${slug}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to update book');
      }

      const result = await response.json();
      toast.success('Book updated successfully');
      router.push(`/dashboard/books/${result.slug}/view`);
    } catch (error) {
      console.error('Error updating book:', error);
      toast.error('Failed to update book');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (!book) {
    return (
      <div className="text-center py-10">
        <p>Book not found</p>
        <button
          onClick={() => router.push('/dashboard/books')}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Back to Books
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-8">
      <h1 className="text-2xl font-bold">Edit Book</h1>
      <BookForm 
        defaultValues={book}
        onSubmit={handleSubmit}
        redirectPath="/dashboard/books"
      />
    </div>
  );
}