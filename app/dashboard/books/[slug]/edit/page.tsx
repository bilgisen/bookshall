// app/dashboard/books/[slug]/edit/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { BookForm } from '@/components/books/book-form';
import { Separator } from '@/components/ui/separator';
import { authClient } from '@/lib/auth-client';
import { BooksMenu } from '@/components/books/books-menu';
import type { Book } from '@/types/book';
import { BOOK_GENRES } from '@/lib/validation/book';
import type { BookFormValues } from '@/lib/validation/book';
import type { BookGenre } from '@/types';

interface BookResponse extends Omit<Book, 'createdAt' | 'updatedAt' | 'created_at' | 'updated_at'> {
  // Add back the required fields from Book
  createdAt: string;
  updatedAt: string;
  created_at?: string;
  updated_at?: string;
}

// Regex to validate URL-friendly slugs
const SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

// No need for EditBookPageProps since we'll use useParams()

export default function EditBookPage() {
  const params = useParams();
  const slug = Array.isArray(params.slug) ? params.slug[0] : params.slug;
  const [book, setBook] = useState<Book | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [initialLoad, setInitialLoad] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();
  
  // Initialize form with proper types
  const form = useForm<BookFormValues>({
    defaultValues: {
      title: '',
      author: '',
      slug: '',
      language: 'tr',
      isPublished: false,
      isFeatured: false,
      subtitle: null,
      description: null,
      publisher: null,
      publisherWebsite: null,
      publishYear: null,
      isbn: null,
      contributor: null,
      translator: null,
      genre: null,
      series: null,
      seriesIndex: null,
      tags: [],
      coverImageUrl: null,
      epubUrl: null
    }
  });
  
  
  // Validate slug format
  useEffect(() => {
    if (slug && !SLUG_REGEX.test(slug)) {
      toast.error('Invalid book URL format');
      router.push('/dashboard/books');
      return;
    }
  }, [slug, router]);

  // Combined auth check and data fetching
  useEffect(() => {
    let isMounted = true;
    
    const fetchBook = async () => {
      if (!slug) return;
      
      setIsLoading(true);
      setBook(null); // Reset book state when slug changes
      
      try {
        // 1. Check authentication first
        const { data: session } = await authClient.getSession();
        if (!session?.user) {
          router.push('/sign-in');
          return;
        }
        
        // 2. If authenticated, fetch book data
        console.log('Fetching book with slug:', slug);
        const response = await fetch(`/api/books/by-slug/${encodeURIComponent(slug)}`, {
          method: 'GET',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache',
          },
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.message || 'Failed to fetch book');
        }

        const bookData = await response.json() as BookResponse;
        
        if (!isMounted) return;
        
        // Create a proper Book object with all required fields
        const book: Book = {
          ...bookData,
          createdAt: bookData.createdAt || new Date().toISOString(),
          updatedAt: bookData.updatedAt || new Date().toISOString(),
          created_at: bookData.created_at || bookData.createdAt,
          updated_at: bookData.updated_at || bookData.updatedAt,
          viewCount: bookData.viewCount || 0,
          publishedAt: bookData.publishedAt || null
        };
        
        setBook(book);
        setInitialLoad(false);
        
        // Prepare form values
        const formValues: BookFormValues = {
          title: book.title || '',
          author: book.author || '',
          slug: book.slug || '',
          language: book.language || 'tr',
          isPublished: Boolean(book.isPublished),
          isFeatured: Boolean(book.isFeatured),
          subtitle: book.subtitle || undefined,
          description: book.description || undefined,
          publisher: book.publisher || undefined,
          publisherWebsite: book.publisherWebsite || undefined,
          publishYear: typeof book.publishYear === 'number' ? book.publishYear : undefined,
          isbn: book.isbn || undefined,
          contributor: book.contributor || null,
          translator: book.translator || null,
          genre: (book.genre && BOOK_GENRES.includes(book.genre as BookGenre))
            ? (book.genre as BookGenre)
            : null,
          series: book.series || undefined,
          seriesIndex: typeof book.seriesIndex === 'number' ? book.seriesIndex : undefined,
          tags: Array.isArray(book.tags) 
            ? book.tags.filter((tag): tag is string => typeof tag === 'string')
            : [],
          coverImageUrl: book.coverImageUrl || undefined,
          epubUrl: book.epubUrl || undefined
        };
        
        form.reset(formValues);
        
      } catch (error) {
        console.error('Error:', error);
        if (isMounted) {
          if (error instanceof Error && error.message.includes('Failed to fetch')) {
            router.push('/dashboard/books');
          } else {
            toast.error('Failed to load book data');
            router.push('/dashboard/books');
          }
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    fetchBook();
    
    return () => {
      isMounted = false;
    };

  }, [slug, router, form]);

  const handleSubmit = async (formData: BookFormValues) => {
    if (isSubmitting || !book) {
      toast.error('Book data not loaded or already submitting');
      return;
    }
    
    console.log('Submitting form data:', formData);
    setIsSubmitting(true);
    
    try {
      // Get session first to ensure user is authenticated
      const { data: session } = await authClient.getSession();
      if (!session?.user) {
        toast.error('Session expired. Please sign in again.');
        router.push('/sign-in');
        return;
      }

      // Ensure slug is not empty and is URL-friendly
      let slug = formData.slug?.trim() || '';
      if (!slug) {
        // If slug is empty, generate one from the title
        slug = formData.title
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-') // Replace non-alphanumeric with dash
          .replace(/^-+|-+$/g, ''); // Remove leading/trailing dashes
      }

      // Prepare the data for the API
      const updateData = {
        ...formData,
        id: book.id,
        userId: session.user.id,
        slug, // Use the processed slug
        // Convert empty strings to null for optional fields
        subtitle: formData.subtitle || null,
        description: formData.description || null,
        publisher: formData.publisher || null,
        publisherWebsite: formData.publisherWebsite || null,
      };

      // Make the API call
      const response = await fetch(`/api/books/by-id/${book.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(updateData),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || errorData.message || 'Failed to update book');
      }

      // Parse the response directly as BookResponse
      let updatedBook: BookResponse | null = null;
      try {
        const rawData = await response.json();
        
        // Ensure the response contains at least some expected book fields
        if (rawData && typeof rawData === 'object' && 'id' in rawData) {
          updatedBook = rawData as BookResponse;
        } else {
          console.warn('API response does not contain a valid book object:', rawData);
          throw new Error('Invalid book data received from server');
        }
      } catch (parseError) {
        console.error('Failed to parse JSON response:', parseError);
        throw new Error('Received invalid response format from server');
      }

      if (!updatedBook) {
        throw new Error('No valid book data received from server after update');
      }

      console.log('Book updated successfully:', updatedBook);
      toast.success('Book updated successfully');
      
      // Handle redirect based on whether slug changed
      if (updatedBook.slug !== slug) {
        // If slug changed, redirect to new URL
        router.push(`/dashboard/books/${updatedBook.slug}/view`);
      } else {
        // Otherwise, just refresh to show updated data
        router.refresh();
      }
    } catch (error) {
      console.error('Error updating book:', error);
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      toast.error(`Failed to update book: ${errorMessage}`);
      throw error; // Re-throw to let the form handle it
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading || initialLoad) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">Loading book data...</p>
      </div>
    );
  }

  if (!book) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Book not found</p>
      </div>
    );
  }

  // Prepare form values from book data
  const formValues: BookFormValues = {
    title: book.title || '',
    author: book.author || '',
    slug: book.slug || '',
    language: book.language || 'tr',
    isPublished: Boolean(book.isPublished),
    isFeatured: Boolean(book.isFeatured),
    subtitle: book.subtitle || undefined,
    description: book.description || undefined,
    publisher: book.publisher || undefined,
    publisherWebsite: book.publisherWebsite || undefined,
    publishYear: typeof book.publishYear === 'number' ? book.publishYear : undefined,
    isbn: book.isbn || undefined,
    contributor: book.contributor || null,
    translator: book.translator || null,
    genre: (book.genre && BOOK_GENRES.includes(book.genre as BookGenre))
      ? (book.genre as BookGenre)
      : null,
    series: book.series || undefined,
    seriesIndex: typeof book.seriesIndex === 'number' ? book.seriesIndex : undefined,
    tags: Array.isArray(book.tags) 
      ? book.tags.filter((tag): tag is string => typeof tag === 'string')
      : [],
    coverImageUrl: book.coverImageUrl || undefined,
    epubUrl: book.epubUrl || undefined
  };


  return (
    <div className="container mx-auto p-8">
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Edit Book</h1>
            <p className="text-muted-foreground">
              Update book details
            </p>
          </div>
          <div className="flex items-center gap-2">
            <BooksMenu bookSlug={book.slug} />
          </div>
        </div>
        <Separator className="mt-4" />
      </div>
      <BookForm 
        defaultValues={formValues}
        onSubmit={handleSubmit}
        isSubmitting={isSubmitting}
        redirectPath="/dashboard/books"
      />
    </div>
  );
}