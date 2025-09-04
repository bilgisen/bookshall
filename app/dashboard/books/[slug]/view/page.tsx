"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { BookHeader } from "@/components/books/book-header";
import { toast } from "sonner";

async function getBook(slug: string) {
  const res = await fetch(`/api/books/${slug}`, {
    credentials: 'include',
  });
  if (!res.ok) throw new Error("Failed to fetch book");
  return res.json();
}

export default function ViewBookPage() {
  const router = useRouter();
  const { slug } = useParams<{ slug: string }>();
  
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

  const { data, isLoading, error } = useQuery({
    queryKey: ["book", slug],
    queryFn: () => getBook(slug as string),
    enabled: !!slug,
  });

  if (isLoading) return <div className="flex items-center justify-center h-64">Loading...</div>;
  
  if (error) {
    toast.error("Failed to load book");
    return <div className="text-center py-10">Error loading book. Please try again.</div>;
  }

  return (
    <div className="space-y-6">
      <BookHeader title={data.title} description="Book details overview" />
      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 space-y-4">
          <p><strong>Author:</strong> {data.author}</p>
          <p><strong>Publisher:</strong> {data.publisher}</p>
          <p><strong>Year:</strong> {data.year}</p>
          <p><strong>ISBN:</strong> {data.isbn}</p>
          <p><strong>Description:</strong> {data.description}</p>
        </div>
        <aside>
          {data.coverUrl && (
            <img
              src={data.coverUrl}
              alt="Book Cover"
              className="rounded border object-cover w-full"
            />
          )}
        </aside>
      </div>
    </div>
  );
}
