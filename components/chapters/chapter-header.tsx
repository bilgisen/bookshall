"use client";

import { MoreVertical } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { BooksMenu } from "@/components/books/books-menu";

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
  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
          <p className="text-muted-foreground mt-1">From: {bookName}</p>
        </div>
        {action || <BooksMenu slug="new" bookId="new" hideEdit />}
      </div>
      <Separator />
    </div>
  );
}
