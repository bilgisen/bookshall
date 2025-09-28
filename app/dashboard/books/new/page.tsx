"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { authClient } from "@/lib/auth-client";
import { generateUniqueSlug } from "@/lib/utils/slugify";
import { BookForm } from "@/components/books/book-form";
import { BooksMenu } from "@/components/books/books-menu";
import { BooksHelp } from "@/components/books/books-help";
import { Separator } from "@/components/ui/separator";

type BookFormValues = {
  title: string;
  slug?: string;
  author: string;
  description?: string | null;
  language?: string;
  isPublished?: boolean;
  publisher?: string | null;
  isbn?: string | null;
  coverImageUrl?: string | null;
  isFeatured?: boolean;
  subtitle?: string | null;
  series?: string | null;
  seriesIndex?: number | null;
  publishYear?: number | null;
  contributor?: string | null;
  translator?: string | null;
  tags?: string[] | null;
};

export default function NewBookPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  
  const defaultValues: Partial<BookFormValues> = {
    title: "",
    slug: "",
    author: "",
    description: "",
    language: "en",
    isPublished: false,
  };
  
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

  const handleSubmit = async (formData: BookFormValues) => {
    setIsSubmitting(true);
    try {
      const { data: session } = await authClient.getSession();
      if (!session?.user) {
        router.push('/sign-in');
        return;
      }

      // Generate slug from title if not provided
      const slug = formData.slug || generateUniqueSlug(formData.title, []);

      // Prepare the book data according to the database schema
      const bookData = {
        ...formData,
        title: formData.title.trim(),
        slug,
        author: formData.author.trim(),
        publisher: formData.publisher?.trim() || null,
        description: formData.description?.trim() || null,
        isbn: formData.isbn?.trim() || null,
        language: formData.language || 'en',
        coverImageUrl: formData.coverImageUrl?.trim() || null,
        isPublished: Boolean(formData.isPublished),
        isFeatured: Boolean(formData.isFeatured),
        subtitle: formData.subtitle?.trim() || null,
        series: formData.series?.trim() || null,
        seriesIndex: formData.seriesIndex ? Number(formData.seriesIndex) : null,
        publishYear: formData.publishYear ? Number(formData.publishYear) : null,
        contributor: formData.contributor?.trim() || null,
        translator: formData.translator?.trim() || null,
        tags: Array.isArray(formData.tags) ? formData.tags : []
      };

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
        throw new Error(
          responseData.error?.message || 
          responseData.message || 
          `Failed to create book: ${response.status} ${response.statusText}`
        );
      }

      toast.success('Book created successfully');
      
      if (!responseData.slug) {
        throw new Error('Failed to create book: Invalid response from server');
      }
      
      router.push(`/dashboard/books/${encodeURIComponent(responseData.slug)}/view`);
      router.refresh();
      
      return responseData;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      toast.error(`Failed to save book: ${errorMessage}`);
      throw error;
    } finally {
      setIsSubmitting(false);
    }
  };


  return (
    <div className="container mx-auto p-8">
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Create New Book</h1>
            <p className="text-muted-foreground">
              Fill in the details below to add a new book to your collection.
            </p>
          </div>
          <BooksMenu />
        </div>
        <Separator className="mt-4" />
      </div>
      <BookForm 
        defaultValues={defaultValues}
        onSubmit={handleSubmit}
        isSubmitting={isSubmitting}
        onGenerateSlug={(title) => generateUniqueSlug(title, [])}
        redirectPath="/dashboard/books"
      />
      
      <div className="mt-12">
        <BooksHelp />
      </div>
    </div>
  );
}
