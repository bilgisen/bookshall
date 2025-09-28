"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// Icons
import {
  BookPlus,
  NotebookPen,
  BookOpen,
  BookX,
  Library,
  Printer,
  ChevronDown,
  ListOrdered,
  Plus,
} from "lucide-react";

// UI Components
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface BooksMenuProps {
  bookSlug?: string;
  className?: string;
}

export function BooksMenu({ bookSlug, className = "" }: BooksMenuProps) {
  const router = useRouter();
  const [isDeleteBookDialogOpen, setIsDeleteBookDialogOpen] = useState(false);
  const [isDeleteChapterDialogOpen, setIsDeleteChapterDialogOpen] = useState(false);
  
  // Book menu items
  const bookMenuItems = [
    {
      icon: <Library className="h-4 w-4 mr-2" />,
      label: "Library",
      onClick: () => router.push("/dashboard/books"),
      disabled: false,
    },
    {
      icon: <BookPlus className="h-4 w-4 mr-2" />,
      label: "New Book",
      onClick: () => router.push("/dashboard/books/new"),
      disabled: false,
    },
    {
      icon: <NotebookPen className="h-4 w-4 mr-2" />,
      label: "Edit Book",
      onClick: () => bookSlug && router.push(`/dashboard/books/${bookSlug}/edit`),
      disabled: !bookSlug,
    },
    {
      icon: <BookOpen className="h-4 w-4 mr-2" />,
      label: "View Book",
      onClick: () => bookSlug && router.push(`/dashboard/books/${bookSlug}/view`),
      disabled: !bookSlug,
    },
    {
      icon: <BookX className="h-4 w-4 mr-2 text-destructive" />,
      label: "Delete Book",
      onClick: () => setIsDeleteBookDialogOpen(true),
      disabled: !bookSlug,
    },
    {
      icon: <Printer className="h-4 w-4 mr-2" />,
      label: "Publish Book",
      onClick: () => bookSlug && router.push(`/dashboard/books/${bookSlug}/publish`),
      disabled: !bookSlug,
    },
  ];

  // Chapter menu items
  const chapterMenuItems = [
    {
      icon: <ListOrdered className="h-4 w-4 mr-2" />,
      label: "Chapters",
      onClick: () => bookSlug && router.push(`/dashboard/books/${bookSlug}/chapters`),
      disabled: !bookSlug,
    },
    {
      icon: <Plus className="h-4 w-4 mr-2" />,
      label: "New Chapter",
      onClick: () => bookSlug && router.push(`/dashboard/books/${bookSlug}/chapters/new`),
      disabled: !bookSlug,
    },
    {
      icon: <NotebookPen className="h-4 w-4 mr-2" />,
      label: "Edit Chapter",
      onClick: () => {},
      disabled: true, // This would need a chapter context
    },
    {
      icon: <BookX className="h-4 w-4 mr-2 text-destructive" />,
      label: "Delete Chapter",
      onClick: () => setIsDeleteChapterDialogOpen(true),
      disabled: !bookSlug,
    },
  ];

  const handleDelete = async () => {
    if (!bookSlug) return;
    
    try {
      const response = await fetch(`/api/books/by-slug/${bookSlug}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete book');
      }
      
      toast.success('Book deleted successfully');
      router.push('/dashboard/books');
      router.refresh();
    } catch (error) {
      console.error('Error deleting book:', error);
      toast.error('Failed to delete book');
    } finally {
      setIsDeleteBookDialogOpen(false);
    }
  };

  const handleDeleteChapter = async () => {
    if (!bookSlug) return;
    
    try {
      // Get the current chapter ID from the URL
      const pathSegments = window.location.pathname.split('/');
      const chapterId = pathSegments[pathSegments.indexOf('chapters') + 1];
      
      if (!chapterId || chapterId === 'new') {
        throw new Error('No chapter selected');
      }
      
      const response = await fetch(`/api/books/by-slug/${bookSlug}/chapters/${chapterId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete chapter');
      }
      
      toast.success('Chapter deleted successfully');
      router.push(`/dashboard/books/${bookSlug}/chapters`);
      router.refresh();
    } catch (error) {
      console.error('Error deleting chapter:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to delete chapter');
    } finally {
      setIsDeleteChapterDialogOpen(false);
    }
  };

  return (
    <>
      {/* Delete Book Confirmation Dialog */}
      <AlertDialog open={isDeleteBookDialogOpen} onOpenChange={setIsDeleteBookDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Book</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the book and all its contents, including all chapters.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete Book
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Chapter Confirmation Dialog */}
      <AlertDialog open={isDeleteChapterDialogOpen} onOpenChange={setIsDeleteChapterDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Chapter</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the current chapter.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteChapter}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete Chapter
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Main Menu */}
      <div className={cn("flex items-center space-x-4", className)}>
        {/* Books Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="flex items-center gap-1">
              Books
              <ChevronDown className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56">
            <DropdownMenuLabel>Book Actions</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {bookMenuItems.map((item) => (
              <DropdownMenuItem 
                key={item.label} 
                onClick={item.onClick}
                disabled={item.disabled}
                className={item.label.includes('Delete') ? 'text-destructive' : ''}
              >
                {item.icon}
                <span>{item.label}</span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Chapters Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="flex items-center gap-1">
              Chapters
              <ChevronDown className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56">
            <DropdownMenuLabel>Chapter Actions</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {chapterMenuItems.map((item) => (
              <DropdownMenuItem 
                key={item.label} 
                onClick={item.onClick}
                disabled={item.disabled}
                className={item.label.includes('Delete') ? 'text-destructive' : ''}
              >
                {item.icon}
                <span>{item.label}</span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </>
  );
}
