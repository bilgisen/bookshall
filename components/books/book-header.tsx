"use client";

import { MoreVertical } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { BooksMenu } from "@/components/books/books-menu";

export function BookHeader({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
          {description && (
            <p className="text-muted-foreground mt-1">{description}</p>
          )}
        </div>
        <BooksMenu slug="new" bookId="new" hideEdit />
      </div>
      <Separator />
    </div>
  );
}
