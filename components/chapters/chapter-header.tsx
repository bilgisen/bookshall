"use client";

import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Separator } from "@/components/ui/separator";
import { BooksMenu } from "@/components/books/books-menu";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

interface ChapterHeaderProps {
  title: string;
  bookName: string;
  action?: React.ReactNode;
}

export function ChapterHeader({
  title,
  bookName,
  action,
}: ChapterHeaderProps) {
  const params = useParams();
  const slug = Array.isArray(params.slug) ? params.slug[0] : params.slug;
  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
          <p className="text-muted-foreground mt-1">From: {bookName}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild variant="outline" size="sm" className="gap-2">
            <Link href={`/dashboard/books/${slug}/chapters/new`}>
              <Plus className="h-4 w-4" />
              Add chapter
            </Link>
          </Button>
          {action || <BooksMenu slug={slug} bookId="new" hideEdit />}
        </div>
      </div>
      <Separator />
    </div>
  );
}
