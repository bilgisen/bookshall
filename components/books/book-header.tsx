"use client";

import { Pencil, ListOrdered, Plus, Printer } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { BooksMenu } from "@/components/books/books-menu";
import { Button } from "@/components/ui/button";
import Link from "next/link";

interface BookHeaderProps {
  title: string;
  description?: string;
  slug?: string;
  author?: string;
  onEdit?: () => void;
  showEditButton?: boolean;
  className?: string;
  children?: React.ReactNode;
}

export function BookHeader({
  title,
  description,
  slug,
  author,
  showEditButton = true,
  className = "",
  children,
}: BookHeaderProps) {
  return (
    <div className={`w-full space-y-4 ${className}`}>
      <div className="flex items-center justify-between w-full">
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold tracking-tight truncate">{title}</h1>
          {author && (
            <p className="text-muted-foreground text-sm">{author}</p>
          )}
          {description && (
            <p className="text-muted-foreground mt-1 line-clamp-2 text-sm">{description}</p>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2">
            {children}
            
            {/* Add Chapter Button */}
            {slug && (
              <Button variant="outline" size="sm" asChild>
                <Link href={`/dashboard/books/${slug}/chapters/new`} className="flex items-center gap-1">
                  <Plus className="h-4 w-4 mr-1" />
                  <span>Add Chapter</span>
                </Link>
              </Button>
            )}
            
            {/* Table of Contents Button */}
            {slug && (
              <Button variant="outline" size="icon" asChild>
                <Link href={`/dashboard/books/${slug}/chapters`} title="Table of Contents">
                  <ListOrdered className="h-4 w-4" />
                  <span className="sr-only">Table of Contents</span>
                </Link>
              </Button>
            )}
            
            {/* Print Button */}
            {slug && showEditButton && (
              <Button variant="outline" size="icon" asChild>
                <Link href={`/dashboard/books/${slug}/publish`} title="Print">
                  <Printer className="h-4 w-4" />
                  <span className="sr-only">Print</span>
                </Link>
              </Button>
            )}
            
            {/* Edit Button */}
            {showEditButton && slug && (
              <Button variant="outline" size="icon" asChild>
                <Link href={`/dashboard/books/${slug}/edit`} title="Edit">
                  <Pencil className="h-4 w-4" />
                  <span className="sr-only">Edit</span>
                </Link>
              </Button>
            )}
            
            {/* Kebab Menu */}
            <BooksMenu 
              slug={slug} 
              hideEdit={!slug} 
              onEdit={slug ? undefined : () => {}}
              onDelete={slug ? undefined : () => Promise.resolve({ success: true })}
            />
          </div>
        </div>
      </div>
      <Separator />
    </div>
  );
}