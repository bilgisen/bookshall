// @/lib/validation/book.ts
import { z } from "zod";

export const BOOK_GENRES = [
  "FICTION", "NON_FICTION", "SCIENCE_FICTION", "FANTASY", "ROMANCE",
  "THRILLER", "MYSTERY", "HORROR", "BIOGRAPHY", "HISTORY", "SELF_HELP",
  "CHILDREN", "YOUNG_ADULT", "COOKBOOK", "TRAVEL", "HUMOR", "POETRY",
  "BUSINESS", "TECHNOLOGY", "SCIENCE", "PHILOSOPHY", "RELIGION", "OTHER",
] as const;

export type BookGenreType = (typeof BOOK_GENRES)[number];

export const bookSchema = z.object({
  // Required fields
  title: z.string().min(1, { message: "Title is required" }),
  author: z.string().min(1, { message: "Author is required" }),
  slug: z.string()
    .min(3, { message: "Slug must be at least 3 characters long" })
    .regex(/^[a-z0-9-]+$/, { 
      message: "Slug can only contain lowercase letters, numbers, and hyphens" 
    })
    .refine(
      (val) => val === val.toLowerCase(),
      { message: "Slug must be lowercase" }
    ),
  
  // Optional fields with validation
  subtitle: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  publisher: z.string().optional().nullable(),
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

export const bookFormSchema = bookSchema.superRefine((data, ctx) => {
    if (!data.isbn && !data.publishYear) {
      ctx.addIssue({
        code: "custom",
        message: "Either ISBN or Publish Year is required",
        path: ["isbn"],
      });
    }
  });

// Export the inferred type
export type BookFormValues = {
  // Required fields
  title: string;
  author: string;
  slug: string;
  
  // Optional fields
  subtitle?: string | null;
  description?: string | null;
  publisher?: string | null;
  publisherWebsite?: string | null;
  publishYear?: number | null;
  isbn?: string | null;
  
  // Author information
  contributor?: string | null;
  translator?: string | null;
  
  // Book metadata
  language: string;
  genre?: BookGenreType | null;
  series?: string | null;
  seriesIndex?: number | null;
  tags?: string[] | null;
  
  // Media
  coverImageUrl?: string | null;
  epubUrl?: string | null;
  
  // Status flags
  isPublished: boolean;
  isFeatured: boolean;
};