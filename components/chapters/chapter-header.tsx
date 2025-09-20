"use client";

import Link from 'next/link';
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Plus, ListOrdered, BookOpen } from "lucide-react";

interface ChapterHeaderProps {
  title: string;
  bookName: string;
  bookSlug: string;
  chapterId: string;
  action?: React.ReactNode;
}

export function ChapterHeader(props: ChapterHeaderProps) {
  const { title, bookName, bookSlug, action } = props;
  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
          <p className="text-muted-foreground mt-1">
            <Link href={`/dashboard/books/${bookSlug}/view`} className="hover:underline flex items-center">
              <BookOpen className="h-4 w-4 mr-1" />
              {bookName}
            </Link>
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Add Chapter Button */}
          <Button asChild variant="outline" size="sm" className="gap-2">
            <Link href={`/dashboard/books/${bookSlug}/chapters/new`}>
              <Plus className="h-4 w-4" />
              Add Chapter
            </Link>
          </Button>
          
          {/* Table of Contents Button */}
          <Button asChild variant="outline" size="icon" title="Table of Contents">
            <Link href={`/dashboard/books/${bookSlug}/chapters`}>
              <ListOrdered className="h-4 w-4" />
              <span className="sr-only">Table of Contents</span>
            </Link>
          </Button>
          
          {/* Action Button (Edit Chapter) */}
          {action}
        </div>
      </div>
      <Separator />
    </div>
  );
}
