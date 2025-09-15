import Image from 'next/image';
import Link from 'next/link';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface SingleBookViewProps {
  book: {
    id?: string;
    slug?: string;
    title: string;
    author?: string | null;
    coverImageUrl?: string | null;
    publisher?: string | null;
    description?: string;
  };
  className?: string;
}

export function SingleBookView({ book, className = '' }: SingleBookViewProps) {
  return (
    <Card className={`w-full bg-card/50 max-w-sm ${className}`}>
     
      <CardContent>
        {book.coverImageUrl ? (
          <div className="relative aspect-[2/3] w-full overflow-hidden rounded-md">
            <Image
              src={book.coverImageUrl}
              alt={`${book.title} cover`}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 384px"
              priority={false}
            />
          </div>
        ) : (
          <div className="flex aspect-[9/16] w-full items-center justify-center rounded-md bg-muted">
            <span className="text-muted-foreground">No cover available</span>
          </div>
        )}
      </CardContent>
      <CardHeader>
        <CardTitle className="line-clamp-2">{book.title}</CardTitle>
        {book.author && (
          <CardDescription className="line-clamp-1">
            {book.author}
          </CardDescription>
        )}
      </CardHeader>
      {book.slug && (
        <CardFooter>
          <Button asChild variant="outline" className="w-full">
            <Link href={`/dashboard/books/${book.slug}/view`}>
              View Book Details
            </Link>
          </Button>
        </CardFooter>
      )}
    </Card>
  );
}
