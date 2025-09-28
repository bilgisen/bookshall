"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { MoreVertical } from "lucide-react";
import { toast } from "sonner";

interface BooksMenuProps {
  slug?: string;  // Book slug for navigation (made optional)
  bookId?: string; // Book ID for direct operations
  chapterId?: string; // Chapter ID for chapter-specific actions
  onView?: () => void;
  onEdit?: () => void;
  onDelete?: () => Promise<{ success: boolean; error?: string }>;
  onAddChapter?: () => void;
  hideEdit?: boolean; // New prop to hide Edit Book menu item
}

export function BooksMenu({
  slug,
  onView,
  onEdit,
  onDelete,
  onAddChapter,
  hideEdit = false, // Default to false for backward compatibility
}: BooksMenuProps) {
  const router = useRouter();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    console.log('BooksMenu - slug:', slug); // Debug log
    setIsMounted(true);
  }, [slug]); // Add slug to dependency array to log when it changes

  if (!isMounted) {
    // Return a placeholder button while hydrating
    return (
      <Button variant="ghost" size="icon" className="h-8 w-8" disabled>
        <MoreVertical className="h-4 w-4" />
      </Button>
    );
  }

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this book? This action cannot be undone.')) {
      return;
    }

    try {
      if (onDelete) {
        // If onDelete is provided, use it
        const result = await onDelete();
        if (result.success) {
          toast.success('Book deleted successfully');
          router.push('/dashboard/books');
          router.refresh();
        } else {
          const errorMessage = result.error || 'Failed to delete book';
          console.error('Delete book error:', errorMessage);
          toast.error(`Error: ${errorMessage}`);
        }
      } else {
        // Fallback to direct API call if onDelete is not provided
        const response = await fetch(`/api/books/by-slug/${slug}`, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          const errorMessage = errorData?.error || 'Failed to delete book';
          throw new Error(errorMessage);
        }

        toast.success('Book deleted successfully');
        router.push('/dashboard/books');
        router.refresh();
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
      console.error('Error deleting book:', error);
      toast.error(`Error: ${errorMessage}`);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <MoreVertical className="h-4 w-4" />
          <span className="sr-only">More options</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-40">
        {slug && onView && (
          <DropdownMenuItem onSelect={onView}>
            View Details
          </DropdownMenuItem>
        )}
        {!hideEdit && (onEdit || slug) && (
          <DropdownMenuItem onSelect={onEdit || (() => slug && router.push(`/dashboard/books/${slug}/edit`))}>
            Edit Book
          </DropdownMenuItem>
        )}
        {(onAddChapter || slug) && (
          <DropdownMenuItem onSelect={() => onAddChapter?.() ?? (slug && router.push(`/dashboard/books/${slug}/chapters/new`))}>
            Add Chapter
          </DropdownMenuItem>
        )}
        {slug && (
          <DropdownMenuItem onSelect={() => router.push(`/dashboard/books/${slug}/chapters`)}>
            View Chapters
          </DropdownMenuItem>
        )}
        {(onDelete || slug) && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              className="text-destructive focus:text-destructive"
              onSelect={handleDelete}
            >
              Delete Book
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export { BooksMenu as default };