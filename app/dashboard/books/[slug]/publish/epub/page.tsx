'use client';

import { useParams } from 'next/navigation';
import { BookHeader } from '@/components/books/book-header';
import { BooksMenu } from '@/components/books/books-menu';
import { EpubGenerator } from '@/components/epub/epub-generator';
import { EpubHelp } from '@/components/epub/epub-help';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

export default function GenerateEbookPage() {
  const { slug } = useParams<{ slug: string }>();
  
  return (
    <div className="space-y-6 w-full">
      <div className="px-8 pt-8">
        <BookHeader 
          title="ePub Publishing"
          description={slug ? `Book: ${slug}` : 'Loading book...'}
        >
          <BooksMenu bookSlug={slug} />
        </BookHeader>
      </div>
      
      <div className="w-full space-y-6 px-8 pb-8">
        <EpubGenerator />
        <Card>
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold mb-4">ePub Publishing Guide</h3>
            <Separator className="my-4" />
            <EpubHelp />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}