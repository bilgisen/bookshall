import { Book as DBBook } from '@/db/schema';

export type BookGenre = 'FICTION' | 'NON_FICTION' | 'SCIENCE_FICTION' | 'FANTASY' | 'ROMANCE' |
  'THRILLER' | 'MYSTERY' | 'HORROR' | 'BIOGRAPHY' | 'HISTORY' | 'SELF_HELP' |
  'CHILDREN' | 'YOUNG_ADULT' | 'COOKBOOK' | 'TRAVEL' | 'HUMOR' | 'POETRY' |
  'BUSINESS' | 'TECHNOLOGY' | 'SCIENCE' | 'PHILOSOPHY' | 'RELIGION' | 'OTHER';

export interface Book {
  // Core fields from DB schema
  id: number;
  userId: string;
  title: string;
  slug: string;
  author: string;
  
  // Author Information
  contributor: string | null;
  translator: string | null;
  
  // Publishing Information
  publisher: string | null;
  publisherWebsite: string | null;
  publishYear: number | null;
  isbn: string | null;
  
  // Book Metadata
  subtitle: string | null;
  description: string | null;
  language: string;
  genre: BookGenre | null;
  series: string | null;
  seriesIndex: number | null;
  tags: string[] | null;
  
  // Media
  coverImageUrl: string | null;
  epubUrl: string | null;
  
  // Status flags
  isPublished: boolean;
  isFeatured: boolean;
  viewCount: number;
  
  // Timestamps
  createdAt: string;
  updatedAt: string;
  publishedAt: string | null;
  
  // Legacy fields (for backward compatibility)
  created_at?: string;
  updated_at?: string;
};

// Chapter type
export type Chapter = {
  id: string;
  title: string;
  content: string;
  order: number;
  level: number;
  parentId: string | null;
  bookId: string;
  createdAt: string;
  updatedAt: string;
  // Backward compatibility with snake_case fields
  book_id?: string;
  parent_id?: string | null;
  created_at?: string;
  updated_at?: string;
};

// Book with chapters type
type BookWithChapters = Omit<Book, 'createdAt' | 'updatedAt' | 'created_at' | 'updated_at'> & {
  chapters: Chapter[];
  // Use Date objects for consistency with Chapter type
  createdAt: Date;
  updatedAt: Date;
  publishedAt: Date | null;
  // Snake case aliases for backward compatibility
  created_at: string;
  updated_at: string;
  // Alias for cover_image_url
  coverImage?: string | null;
};

export default BookWithChapters;
