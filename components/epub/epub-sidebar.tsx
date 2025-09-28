// components/epub/epub-sidebar.tsx
'use client';

import { motion } from 'framer-motion';
import { SingleBookView } from '@/components/books/single-book-view';

interface Book {
  id: string;
  title: string;
  slug: string;
  description?: string;
  coverImageUrl?: string | null;
  author?: string | null;
  publisher?: string | null;
}

interface EpubSidebarProps {
  book: Book;
}

export function EpubSidebar({ book }: EpubSidebarProps) {
  return (
    <motion.div
      className="lg:w-80 flex-shrink-0"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.1, duration: 0.3 }}
    >
      <div className="sticky top-24">
        <SingleBookView 
          book={{
            id: book.id,
            title: book.title,
            author: book.author || null,
            coverImageUrl: book.coverImageUrl || null,
            slug: book.slug,
            description: book.description || undefined,
            publisher: book.publisher || null,
          }} 
        />
      </div>
    </motion.div>
  );
}
