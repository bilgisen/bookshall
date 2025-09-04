import { z } from 'zod';

export const chapterFormSchema = z.object({
  id: z.number().optional(),
  bookId: z.number().min(1, 'Book ID is required'),
  parentChapterId: z.number().nullable().optional(),
  title: z.string().min(1, 'Title is required').max(255, 'Title is too long'),
  content: z.any(), // Will be validated by Plate editor
  excerpt: z.string().max(500, 'Excerpt is too long').optional(),
  order: z.number().int().min(0).default(0),
  level: z.number().int().min(1).default(1),
  isDraft: z.boolean().default(false),
});

export type ChapterFormValues = z.infer<typeof chapterFormSchema>;
