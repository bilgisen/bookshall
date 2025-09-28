'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Book } from "@/types/book";
import type { ChapterOption } from '@/components/chapters/ParentChapterSelect';
import ChapterForm from '@/components/chapters/ChapterForm';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { authClient } from "@/lib/auth-client";
import { BookHeader } from "@/components/books/book-header";
import { BooksMenu } from "@/components/books/books-menu";

export default function NewChapterPage() {
  const router = useRouter();
  const params = useParams<{ slug: string }>();
  const slug = Array.isArray(params.slug) ? params.slug[0] : params.slug;
  const [book, setBook] = useState<Book | null>(null);
  const [parentChapters, setParentChapters] = useState<ChapterOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  // Client-side auth check with authClient
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: session } = await authClient.getSession();
        if (!session?.user) {
          router.push('/sign-in');
          return false;
        }
        setIsCheckingAuth(false);
        return true;
      } catch (error) {
        console.error('Auth check failed:', error);
        router.push('/sign-in');
        return false;
      }
    };
    
    checkAuth();
  }, [router]);

  // Fetch book data
  useEffect(() => {
    if (isCheckingAuth || !slug) return;

    const fetchBook = async () => {
      try {
        const { data: session } = await authClient.getSession();
        if (!session?.user) {
          router.push('/sign-in');
          return;
        }

        const response = await fetch(`/api/books/by-slug/${encodeURIComponent(slug)}`, {
          method: 'GET',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache',
          },
        });

        if (!response.ok) {
          if (response.status === 404) {
            throw new Error('Book not found');
          }
          throw new Error('Failed to fetch book');
        }

        const bookData = await response.json();
        
        // Check if current user is the owner of the book
        if (bookData.userId !== session.user.id) {
          toast.error("You don't have permission to add chapters to this book");
          router.push('/dashboard/books');
          return;
        }
        
        setBook(bookData);
        
        // Fetch chapters for the book
        const chaptersResponse = await fetch(`/api/books/by-slug/${slug}/chapters`, {
          credentials: 'include'
        });
        
        if (!chaptersResponse.ok) {
          throw new Error('Failed to fetch chapters');
        }
        
        const { flat: chapters } = await chaptersResponse.json();
        
        // Transform chapters to the format expected by ParentChapterSelect
        const chapterOptions = chapters.map((chapter: {
          id: string | number;
          title?: string;
          level?: number;
        }) => ({
          id: chapter.id,
          title: chapter.title || 'Untitled Chapter',
          level: chapter.level || 0
        }));
        
        setParentChapters(chapterOptions);
      } catch (err) {
        console.error('Error fetching book:', err);
        toast.error(err instanceof Error ? err.message : 'Failed to load book');
        router.push('/dashboard/books');
      } finally {
        setIsLoading(false);
      }
    };

    fetchBook();
  }, [slug, router, isCheckingAuth]);

  const handleSuccess = (newChapterId: string) => {
    toast.success('Chapter created successfully');
    // Use the book's slug and the new chapter ID to navigate to the view page
    router.push(`/dashboard/books/${encodeURIComponent(slug)}/chapters/${encodeURIComponent(newChapterId)}/view`);
    router.refresh();
  };

  if (isLoading || isCheckingAuth) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!book) {
    return (
      <div className="container mx-auto p-8">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">Book not found</h2>
          <p className="text-muted-foreground mb-4">
            The book you&apos;re trying to add a chapter to doesn&apos;t exist or you don&apos;t have permission to access it.
          </p>
          <button 
            onClick={() => router.push('/dashboard/books')}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
          >
            Back to Books
          </button>
        </div>
      </div>
    );
  }

  if (!book) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Loading book data...</p>
      </div>
    );
  }

  return (
    <div className="container w-full p-8 space-y-6">
      <div className="space-y-2">
        <BookHeader 
          title="Add New Chapter"
          description={book.title}
        >
          <BooksMenu bookSlug={slug} />
        </BookHeader>
      </div>
      
      <div className="pt-4">
        <ChapterForm 
          bookId={Number(book.id)}
          slug={params.slug}
          parentChapters={parentChapters}
          onSuccess={handleSuccess}
        />
      </div>
    </div>
  );
}
