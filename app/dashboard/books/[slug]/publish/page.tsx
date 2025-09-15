'use client';

import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Skeleton } from '@/components/ui/skeleton';
import { BookHeader } from '@/components/books/book-header';
import { SingleBookView } from '@/components/books/single-book-view';
import { Card } from '@/components/ui/card';
import { Book, FileAudio, FileText, FileType, FileCode } from 'lucide-react';
import Link from 'next/link';
import { authClient } from '@/lib/auth-client';

export default function PublishPage() {
  const { slug } = useParams<{ slug: string }>();
  const { data: session } = authClient.useSession();
  
  // Fetch book data
  const { data: book, isLoading: isLoadingBook } = useQuery({
    queryKey: ['book', slug],
    queryFn: async () => {
      const response = await fetch(`/api/books/by-slug/${slug}`);
      if (!response.ok) throw new Error('Failed to fetch book');
      return response.json();
    },
    enabled: !!slug && !!session?.user,
  });
  
  const formats = [
    {
      title: 'ePub',
      description: 'Create dynamic, reflowable digital books perfect for every e-reader.',
      icon: <Book className="h-12 w-12" strokeWidth="1px" />,
      href: `/dashboard/books/${slug}/publish/epub`,
    },
    {
      title: 'Audiobook',
      description: 'Transform your text into an engaging listen-anywhere audio experience.',
      icon: <FileAudio className="h-12 w-12" strokeWidth="1px" />,
      href: '#', // Will be implemented later
    },
    {
      title: 'PDF',
      description: 'Generate pixel-perfect, printable PDF documents.',
      icon: <FileText className="h-12 w-12" strokeWidth="1px" />,
      href: '#', // Will be implemented later
    },
    {
      title: 'DOC',
      description: 'Export easily editable documents, perfect for collaboration and review.',
      icon: <FileType className="h-12 w-12" strokeWidth="1px" />,
      href: '#', // Will be implemented later
    },
    {
      title: 'HTML',
      description: 'Publish searchable, web-ready content for any website or browser.',
      icon: <FileCode className="h-12 w-12" strokeWidth="1px" />,
      href: '#', // Will be implemented later
    },
  ];

  // Handle loading state
  if (isLoadingBook || !session) {
    return (
      <div className="container mx-auto p-8 space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-6 w-48" />
        <div className="grid gap-6 mt-8 md:grid-cols-2">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32 w-full rounded-lg" />
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
    <div className="container w-full p-8 space-y-8">
      <div className="w-full">
        <BookHeader 
          title="Publish Your Book"
          description="Choose a format to publish your book"
          slug={slug as string}
          showEditButton={false}
        />
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Main Content */}
        <div className="flex-1">
          <div className="space-y-4">

            
            <div className="grid gap-6 md:grid-cols-2">
              {formats.map((format) => (
                <Link href={format.href} key={format.title}>
                  <Card className="h-full bg-card/20 p-6 hover:bg-primary/20 transition-colors border">
                    <div className="flex flex-col space-y-4">
                      <div className="flex items-center space-x-4">
                        <div className="p-3 rounded-lg bg-primary/10 text-primary flex-shrink-0">
                          {format.icon}
                        </div>
                        <h3 className="text-xl font-semibold">{format.title}</h3>
                      </div>
                      <p className="text-muted-foreground">{format.description}</p>
                    </div>
                  </Card>
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="lg:w-80 flex-shrink-0">
          <div className="sticky top-24">
            <SingleBookView 
              book={{
                id: book.id,
                title: book.title,
                author: book.author || null,
                coverImageUrl: book.coverImageUrl || null,
                slug: book.slug || undefined,
                description: book.description || undefined,
                publisher: book.publisher || null,
              }} 
            />
            <div className="mt-4 p-4 bg-muted/50 rounded-lg">
              <h3 className="font-medium mb-2">Publishing Tips</h3>
              <ul className="text-sm space-y-2 text-muted-foreground">
                <li>• Check your content before publishing</li>
                <li>• Different formats may require different formatting</li>
                <li>• Some formats may take longer to generate</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
