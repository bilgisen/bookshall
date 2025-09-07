"use client";

import { Pencil } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { BooksMenu } from "@/components/books/books-menu";
import { Button } from "@/components/ui/button";
import Link from "next/link";

interface BookHeaderProps {
  title: string;
  description?: string;
  slug?: string;
  onEdit?: () => void;
  showEditButton?: boolean;
}

export function BookHeader({
  title,
  description,
  slug,
  showEditButton = true,
}: BookHeaderProps) {
  return (
    <div className="w-full space-y-4">
      <div className="flex items-center justify-between w-full">
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold tracking-tight truncate">{title}</h1>
          {description && (
            <p className="text-muted-foreground mt-1 line-clamp-2">{description}</p>
          )}
        </div>
        
        <div className="flex items-center gap-2 ml-4">
          {showEditButton && slug && (
            <Button
              variant="outline"
              size="sm"
              asChild
              className="flex items-center gap-1.5"
            >
              <Link href={`/dashboard/books/${slug}/edit`}>
                <Pencil className="h-4 w-4" />
                <span>Edit Book</span>
              </Link>
            </Button>
          )}
          <BooksMenu 
            slug={slug || ""} 
            hideEdit 
            className="ml-2"
          />
        </div>
      </div>
      <Separator />
    </div>
  );
}