// @/lib/validation/book.ts
import { z } from "zod";
import type { BookGenre } from '@/types';

// Align with the BookGenre type from @/types/book
export const BOOK_GENRES = [
  'FICTION', 'NON_FICTION', 'SCIENCE_FICTION', 'FANTASY', 'ROMANCE',
  'THRILLER', 'MYSTERY', 'HORROR', 'BIOGRAPHY', 'HISTORY', 'SELF_HELP',
  'CHILDREN', 'YOUNG_ADULT', 'COOKBOOK', 'TRAVEL', 'HUMOR', 'POETRY',
  'BUSINESS', 'TECHNOLOGY', 'SCIENCE', 'PHILOSOPHY', 'RELIGION', 'OTHER'
] as const satisfies readonly BookGenre[];

export type BookGenreType = BookGenre;

export const bookSchema = z.object({
    // Required fields
  title: z.string().min(1, { message: "Title is required" }),
  author: z.string().min(1, { message: "Author is required" }),
  publisher: z.string().min(1, { message: "Publisher is required" }),
  
  // Optional fields with validation
  slug: z.string()
    .min(3, { message: "Slug must be at least 3 characters long" })
    .regex(/^[a-z0-9-]+$/, { 
      message: "Slug can only contain lowercase letters, numbers, and hyphens" 
    })
    .refine(
      (val) => val === val.toLowerCase(),
      { message: "Slug must be lowercase" }
    )
    .optional()
    .nullable(),
    
  subtitle: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  publisherWebsite: z
    .string()
    .url({ message: "Invalid URL" })
    .or(z.literal(""))
    .optional()
    .nullable(),
    
  // Author information
  contributor: z.string().optional().nullable(),
  translator: z.string().optional().nullable(),
  
  // Publishing info
  publishYear: z
    .number()
    .int()
    .min(1000, { message: "Year must be at least 1000" })
    .max(new Date().getFullYear() + 1, {
      message: "Year cannot be in the future",
    })
    .optional()
    .nullable(),
    
  isbn: z
    .string()
    .regex(/^(\d{10}|\d{13})$/, {
      message: "Invalid ISBN format (must be 10 or 13 digits)",
    })
    .or(z.literal(""))
    .optional()
    .nullable(),
    
  // Book metadata
  language: z
    .string()
    .length(2, { message: "Must be a 2-letter language code" })
    .default("tr"),
    
  genre: z.enum([
    'FICTION', 'NON_FICTION', 'SCIENCE_FICTION', 'FANTASY', 'ROMANCE',
    'THRILLER', 'MYSTERY', 'HORROR', 'BIOGRAPHY', 'HISTORY', 'SELF_HELP',
    'CHILDREN', 'YOUNG_ADULT', 'COOKBOOK', 'TRAVEL', 'HUMOR', 'POETRY',
    'BUSINESS', 'TECHNOLOGY', 'SCIENCE', 'PHILOSOPHY', 'RELIGION', 'OTHER'
  ]).optional().nullable(),
  
  series: z.string().optional().nullable(),
  seriesIndex: z.number().int().min(1).optional().nullable(),
  tags: z.array(z.string()).optional().nullable(),
  
  // Media
  coverImageUrl: z
    .string()
    .url({ message: "Must be a valid URL" })
    .or(z.literal(""))
    .optional()
    .nullable(),
    
  epubUrl: z
    .string()
    .url({ message: "Must be a valid URL" })
    .or(z.literal(""))
    .optional()
    .nullable(),
  
  // Status flags
  isPublished: z.boolean().default(false),
  isFeatured: z.boolean().default(false)
});

export const bookFormSchema = bookSchema;

// Export the inferred type
export type BookFormValues = {
  // UI state
  activeTab?: 'main' | 'additional';
  
  // Required fields
  title: string;
  author: string;
  slug: string;
  language: string;
  isPublished: boolean;
  isFeatured: boolean;
  
  // Optional fields
  subtitle?: string | null;
  description?: string | null;
  publisher?: string | null;
  publisherWebsite?: string | null;
  publishYear?: number | null;
  isbn?: string | null;
  
  // Author and contributor information
  contributor?: string | null;
  translator?: string | null;
  illustrator?: string | null;
  
  // Book metadata
  genre?: BookGenre | null;
  series?: string | null;
  seriesIndex?: number | null;
  tags?: string[] | null;
  
  // Media
  coverImage?: string | null;
  coverImageUrl?: string | null;
  epubUrl?: string | null;
};