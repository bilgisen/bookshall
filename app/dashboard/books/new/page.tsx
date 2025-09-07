"use client"
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { BookHeader } from "@/components/books/book-header";
import { BookForm } from "@/components/books/book-form";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { authClient } from "@/lib/auth-client";
import type { BookFormValues } from "@/lib/validation/book";

export default function NewBookPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  
  // Client-side auth check
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: session } = await authClient.getSession();
        if (!session?.user) {
          router.push('/sign-in');
          return;
        }
        setIsLoading(false);
      } catch (error) {
        console.error('Auth check failed:', error);
        router.push('/sign-in');
      }
    };
    
    checkAuth();
  }, [router]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  const handleSubmit = async (data: BookFormValues) => {
    console.log('Submitting form with data:', data);
    
    try {
      const { data: session } = await authClient.getSession();
      if (!session?.user) {
        router.push('/sign-in');
        return;
      }

      // Prepare the book data according to the database schema
      const bookData = {
        title: data.title?.trim(),
        author: data.author?.trim(),
        publisher: data.publisher?.trim(),
        description: data.description?.trim(),
        isbn: data.isbn?.trim(),
        language: data.language || 'en',
        coverImageUrl: data.coverImageUrl?.trim(),
        isPublished: Boolean(data.isPublished),
        isFeatured: Boolean(data.isFeatured),
        slug: data.slug,
        subtitle: data.subtitle?.trim(),
        series: data.series?.trim(),
        seriesIndex: data.seriesIndex ? Number(data.seriesIndex) : null,
        publishYear: data.publishYear ? Number(data.publishYear) : null,
        contributor: data.contributor || null,
        translator: data.translator || null
      };

      console.log('Sending book data to API:', bookData);

      const response = await fetch('/api/books', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(session.user.id && { 'X-User-ID': session.user.id })
        },
        body: JSON.stringify(bookData),
      });

      const responseData = await response.json();

      if (!response.ok) {
        console.error('API Error Response:', responseData);
        throw new Error(
          responseData.error?.message || 
          responseData.message || 
          `Failed to create book: ${response.status} ${response.statusText}`
        );
      }

      toast.success('Book created successfully');
      
      // Ensure we have a valid slug before redirecting
      if (!responseData.slug) {
        console.error('No slug in response:', responseData);
        throw new Error('Failed to create book: Invalid response from server');
      }
      
      // Redirect to the book's view page with the slug from the response
      router.push(`/dashboard/books/${encodeURIComponent(responseData.slug)}/view`);
      router.refresh(); // Ensure the page updates with the new book
      
      return responseData;
    } catch (error) {
      console.error('Error in handleSubmit:', error);
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      toast.error(`Failed to save book: ${errorMessage}`);
      throw error; // Re-throw to let the form handle the error state
    }
  };

  return (
    <div className="space-y-6 p-8">
      <div>
        <BookHeader
          title="Create Book"
          description="Add a new book to your library."
        />
      </div>
      <div className="max-w-full mx-auto">
        <BookForm 
          onSubmit={handleSubmit}
          redirectPath="/dashboard/books"
        />
      </div>
    </div>
  );
}
