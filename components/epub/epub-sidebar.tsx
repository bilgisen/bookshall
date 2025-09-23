// components/epub/epub-sidebar.tsx
'use client';

import { motion } from 'framer-motion';
import { SingleBookView } from '@/components/books/single-book-view';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

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
      <div className="sticky top-24 space-y-6">
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
        
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="bg-muted/30 backdrop-blur-sm border-border/50">
            <CardHeader>
              <CardTitle className="text-lg font-semibold">EPUB Tips</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3 text-sm">
                <TipItem 
                  emoji="📘" 
                  text="EPUB works on most e-readers and mobile devices" 
                />
                <TipItem 
                  emoji="🖼️" 
                  text="Include a cover image for better presentation" 
                />
                <TipItem 
                  emoji="📋" 
                  text="Table of contents improves navigation" 
                />
                <TipItem 
                  emoji="📱" 
                  text="Test your EPUB on different devices before publishing" 
                />
              </ul>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </motion.div>
  );
}

function TipItem({ emoji, text }: { emoji: string; text: string }) {
  return (
    <motion.li 
      className="flex items-start space-x-2"
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.2 }}
      whileHover={{ x: 5 }}
    >
      <span className="text-lg">{emoji}</span>
      <span className="text-muted-foreground">{text}</span>
    </motion.li>
  );
}