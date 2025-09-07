'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { BookForm } from '@/components/books/book-form';
import { BookHeader } from '@/components/books/book-header';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { authClient } from '@/lib/auth-client';
import type { Book } from '@/types/book';
import { BOOK_GENRES, BookGenreType } from '@/lib/validation/book';
import type { BookFormValues } from '@/lib/validation/book';

// API Response Types
interface ApiResponse<T> {
  data?: T;
  message?: string;
  error?: string;
}

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
  const router = useRouter();
  const params = useParams();
  const slug = Array.isArray(params.slug) ? params.slug[0] : params.slug;
  const [book, setBook] = useState<Book | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
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

  // Client-side auth check
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: session } = await authClient.getSession();
        if (!session?.user) {
          router.push('/sign-in');
          return;
        }
        setIsAuthorized(true);
      } catch (error) {
        console.error('Auth check failed:', error);
        router.push('/sign-in');
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, [router]);

  // Fetch book data after auth check
  useEffect(() => {
    if (!isAuthorized || !slug) return;

    const fetchBook = async () => {
      try {
        console.log('Fetching book with slug:', slug);
        const response = await fetch(`/api/books/by-slug/${encodeURIComponent(slug)}`, {
          method: 'GET',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache',
          },
        });

        const responseData = await response.json();
        console.log('Book fetch response:', { status: response.status, data: responseData });

        if (!response.ok) {
          throw new Error(responseData.message || 'Failed to fetch book');
        }

        if (!responseData) {
          throw new Error('No book data received from server');
        }

        // The API returns the book directly, not wrapped in a data property
        const bookData = responseData as BookResponse;
        
        // Create a proper Book object with all required fields
        const book: Book = {
          ...bookData,
          // Ensure we have all required Book fields
          createdAt: bookData.createdAt || new Date().toISOString(),
          updatedAt: bookData.updatedAt || new Date().toISOString(),
          created_at: bookData.created_at || bookData.createdAt,
          updated_at: bookData.updated_at || bookData.updatedAt,
          // Add any other required fields with defaults if needed
          viewCount: bookData.viewCount || 0,
          publishedAt: bookData.publishedAt || null
        };
        
        // Set the book data
        setBook(book);
        
        // Map BookResponse to BookFormValues with exact type matching
        const formValues: BookFormValues = {
          // Required fields
          title: bookData.title || '',
          author: bookData.author || '',
          slug: bookData.slug || '',
          language: bookData.language || 'tr',
          
          // Status flags
          isPublished: Boolean(bookData.isPublished),
          isFeatured: Boolean(bookData.isFeatured),
          
          // Optional fields
          subtitle: bookData.subtitle || null,
          description: bookData.description || null,
          publisher: bookData.publisher || null,
          publisherWebsite: bookData.publisherWebsite || null,
          
          // Numeric fields
          publishYear: typeof bookData.publishYear === 'number' ? bookData.publishYear : null,
          
          // String fields
          isbn: bookData.isbn || null,
          contributor: bookData.contributor || null,
          translator: bookData.translator || null,
          
          // Genre - must be one of the valid values or undefined
          genre: bookData.genre && BOOK_GENRES.includes(bookData.genre as BookGenreType)
            ? (bookData.genre as BookGenreType)
            : undefined,
            
          series: bookData.series || null,
          seriesIndex: typeof bookData.seriesIndex === 'number' ? bookData.seriesIndex : null,
          
          // Array field - ensure it's an array of strings
          tags: Array.isArray(bookData.tags) 
            ? bookData.tags.filter((tag): tag is string => typeof tag === 'string')
            : [],
            
          // Media URLs
          coverImageUrl: bookData.coverImageUrl || null,
          epubUrl: bookData.epubUrl || null
        };
        
        // Reset form with new values
        form.reset(formValues);
      } catch (error) {
        console.error('Error fetching book:', error);
        toast.error('Failed to load book data');
        router.push('/dashboard/books');
      } finally {
        setIsLoading(false);
      }
    };

    if (slug && isAuthorized) {
      fetchBook();
    }
  }, [slug, router, isAuthorized, form]);

  const handleSubmit = async (formData: BookFormValues) => {
    if (isSubmitting) return;
    
    if (!book) {
      toast.error('Book data not loaded');
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

      // Prepare the data for the API
      const updateData = {
        ...formData,
        id: book.id,
        userId: session.user.id,
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
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update book');
      }

      const responseData = await response.json() as ApiResponse<BookResponse>;
      
      if (!responseData.data) {
        throw new Error('No data received from server after update');
      }

      console.log('Book updated successfully:', responseData);
      toast.success('Book updated successfully');
      
      // Handle redirect based on whether slug changed
      const updatedBook = responseData.data;
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

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/3"></div>
          <div className="h-4 bg-muted rounded w-1/4"></div>
          <Separator className="my-4" />
          <div className="space-y-8">
            {[1, 2, 3].map((i) => (
              <div key={i} className="space-y-2">
                <div className="h-4 bg-muted rounded w-1/4"></div>
                <div className="h-10 bg-muted rounded"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!book) {
    return (
      <div className="container mx-auto p-6">
        <BookHeader 
          title="Book Not Found"
          description="The book you're looking for doesn't exist or you don't have permission to view it."
        />
        <Button 
          onClick={() => router.push('/dashboard/books')}
          variant="outline"
          className="mt-4"
        >
          Back to Books
        </Button>
      </div>
    );
  }

  // Transform Book to BookFormValues
  const formValues: BookFormValues = book ? {
    // Required fields with empty string fallback
    title: book.title || '',
    author: book.author || '',
    publisher: book.publisher || '',
    slug: book.slug || '',
    
    // Handle contributor and translator as strings
    contributor: book.contributor || null,
    translator: book.translator || null,
    
    // Optional fields with undefined for null values
    subtitle: book.subtitle || undefined,
    description: book.description || undefined,
    publisherWebsite: book.publisherWebsite || undefined,
    publishYear: book.publishYear || undefined,
    isbn: book.isbn || undefined,
    language: book.language || 'tr',
    genre: book.genre || undefined,
    series: book.series || undefined,
    seriesIndex: book.seriesIndex || undefined,
    tags: [], // Initialize empty array for tags if needed
    coverImageUrl: book.coverImageUrl || undefined,
    isPublished: book.isPublished || false,
    isFeatured: book.isFeatured || false
  } : {
    // Default empty values if book is null
    title: '',
    author: '',
    publisher: '',
    slug: '',
    language: 'tr',
    isPublished: false,
    isFeatured: false,
    contributor: null,
    translator: null
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {book ? (
        <>
          <BookHeader 
            title={`Edit: ${book.title}`}
            description="Update the book details below"
          />
          <BookForm 
            defaultValues={formValues}
            onSubmit={handleSubmit}
            isSubmitting={isSubmitting}
            redirectPath="/dashboard/books"
          />
        </>
      ) : (
        <div className="text-center py-12">
          <p className="text-muted-foreground">Loading book details...</p>
        </div>
      )}
    </div>
  );
}