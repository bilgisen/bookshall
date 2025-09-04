"use client"
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { BookHeader } from "@/components/books/book-header";
import { BookForm } from "@/components/books/book-form";


export default function NewBookPage() {
  const router = useRouter();
  
  // Client-side auth check
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch('/api/auth/session');
        if (!response.ok) {
          router.push('/sign-in');
        }
      } catch (error) {
        console.error('Auth check failed:', error);
        router.push('/sign-in');
      }
    };
    
    checkAuth();
  }, [router]);

  const handleSubmit = async (data: any) => {
    try {
      const response = await fetch('/api/books', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error('Failed to create book');
      }

      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Error creating book:', error);
      throw error;
    }
  };

  return (
    <div className="flex flex-col h-screen max-h-screen">
      <div className="flex-none p-8 pb-4 border-b">
        <BookHeader
          title="Create Book"
          description="Add a new book to your library."
        />
      </div>
      <div className="flex-1 min-h-0 overflow-auto">
        <div className="p-8 pt-6">
          <BookForm 
            onSubmit={handleSubmit}
            redirectPath="/dashboard/books"
          />
        </div>
      </div>
    </div>
  );
}
