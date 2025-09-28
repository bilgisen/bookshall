"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import { authClient } from "@/lib/auth-client";
import { Download, Loader2 } from "lucide-react";
import { BooksMenu } from "@/components/books/books-menu";
import { Separator } from "@/components/ui/separator";

interface Book {
  id: string;
  slug: string;
  title: string;
  author: string;
  publisher: string;
  description?: string;
  isbn?: string;
  language?: string;
  coverImageUrl?: string;
  epubUrl?: string;
  subtitle?: string;
  series?: string;
  seriesIndex?: number | null;
  publishYear?: number | null;
  contributors?: Array<{ name: string }>;
  translators?: Array<{ name: string }>;
  genre?: string;
  tags?: string[];
  createdAt: string;
  updatedAt: string;
}

export default function ViewBookPage() {
  const router = useRouter();
  const { slug } = useParams<{ slug: string }>();
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

  const { data: book, isLoading, error } = useQuery<Book | null>({
    queryKey: ["book", slug],
    queryFn: async () => {
      if (isCheckingAuth || !slug) return null;
      
      try {
        const { data: session } = await authClient.getSession();
        if (!session?.user) {
          router.push('/sign-in');
          return null;
        }

        const response = await fetch(`/api/books/by-slug/${encodeURIComponent(slug)}`, {
          credentials: 'include',
          headers: {
            'Cache-Control': 'no-cache',
            'Content-Type': 'application/json',
          },
        });
        
        if (!response.ok) {
          if (response.status === 403) {
            toast.error("You don&#39;t have permission to view this book");
            router.push('/dashboard/books');
            return null;
          }
          if (response.status === 404) {
            throw new Error("Book not found");
          }
          throw new Error("Failed to fetch book");
        }
        
        const bookData = await response.json();
        
        // Check if current user is the owner of the book
        if (bookData.userId !== session.user.id) {
          toast.error("You don&#39;t have permission to view this book");
          router.push('/dashboard/books');
          return null;
        }
        
        return bookData;
      } catch (err) {
        console.error('Error fetching book:', err);
        throw err;
      }
    },
    retry: 1,
    enabled: !!slug && !isCheckingAuth,
  });

  if (isLoading || isCheckingAuth) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="container mx-auto p-8">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">Error loading book</h2>
          <p className="text-muted-foreground mb-4">
            {error.message || 'An error occurred while loading the book.'}
          </p>
          <Button onClick={() => router.push('/dashboard/books')}>
            Back to Books
          </Button>
        </div>
      </div>
    );
  }
  
  if (!book) {
    return (
      <div className="container w-full p-8">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">Book not found</h2>
          <p className="text-muted-foreground mb-4">
            The book you&#39;re looking for doesn&#39;t exist or has been removed.
          </p>
          <Button onClick={() => router.push('/dashboard/books')}>
            Back to Books
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen p-8">
      {/* Full-width header */}
      <div className="container mx-auto mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">{book.title}</h1>
            {book.author && (
              <p className="text-muted-foreground">{book.author}</p>
            )}
          </div>
          <BooksMenu bookSlug={book.slug} />
        </div>
        <Separator className="my-4" />
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 py-8">
        <div className="md:col-span-2 space-y-16">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h3 className="text-sm font-medium text-muted-foreground">Author</h3>
              <p>{book.author}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-muted-foreground">Publisher</h3>
              <p>{book.publisher}</p>
            </div>
            {book.publishYear && (
              <div>
                <h3 className="text-sm font-medium text-muted-foreground">Publication Year</h3>
                <p>{book.publishYear}</p>
              </div>
            )}
            {book.isbn && (
              <div>
                <h3 className="text-sm font-medium text-muted-foreground">ISBN</h3>
                <p>{book.isbn}</p>
              </div>
            )}
            {book.language && (
              <div>
                <h3 className="text-sm font-medium text-muted-foreground">Language</h3>
                <p>{book.language.toUpperCase()}</p>
              </div>
            )}
            {book.series && (
              <div>
                <h3 className="text-sm font-medium text-muted-foreground">Series</h3>
                <p>{book.series}{book.seriesIndex ? ` #${book.seriesIndex}` : ''}</p>
              </div>
            )}
            {book.genre && (
              <div>
                <h3 className="text-sm font-medium text-muted-foreground">Genre</h3>
                <p>{book.genre.replace(/_/g, ' ')}</p>
              </div>
            )}
          </div>

          {book.description && (
            <div className="pt-4 border-t">
              <h3 className="text-sm font-medium text-muted-foreground mb-2">Description</h3>
              <p className="whitespace-pre-line">{book.description}</p>
            </div>
          )}

          {((book.contributors && book.contributors.length > 0) || (book.translators && book.translators.length > 0)) && (
            <div className="pt-4 border-t">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {book.contributors && book.contributors.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium">Contributors</h4>
                    <ul className="mt-1 space-y-1">
                      {book.contributors.map((person, index) => (
                        <li key={index} className="text-sm">{person.name}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {book.translators && book.translators.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium">Translators</h4>
                    <ul className="mt-1 space-y-1">
                      {book.translators.map((person, index) => (
                        <li key={index} className="text-sm">{person.name}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
        
        <aside className="space-y-4">
          {book.coverImageUrl ? (
            <div className="overflow-hidden">
              <Image
                src={book.coverImageUrl}
                alt={`Cover of ${book.title}`}
                width={400}
                height={400}
                className="w-full h-auto max-h-[400px] object-contain"
              />
            </div>
          ) : (
            <div className="border rounded-lg h-[400px] flex items-center justify-center bg-muted/50">
              <span className="text-muted-foreground">No cover image</span>
            </div>
          )}
          
          <div className="space-y-4">
            {book.epubUrl ? (
              <Button 
                onClick={() => window.open(book.epubUrl, '_blank')}
                className="w-full bg-primary hover:bg-primary/90"
              >
                <Download className="mr-2 h-4 w-4" />
                Download Your EPUB
              </Button>
            ) : (
              <div className="text-center p-4 border rounded-md bg-muted/50">
                <p className="text-sm text-muted-foreground">
                  EPUB not generated yet. Go to Publish tab to generate.
                </p>
              </div>
            )}
            <div className="text-sm text-muted-foreground space-y-1">
              <p>Created: {new Date(book.createdAt).toLocaleDateString()}</p>
              <p>Last updated: {new Date(book.updatedAt).toLocaleDateString()}</p>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}