import { z } from 'zod';

export const chapterFormSchema = z.object({
  id: z.union([z.string(), z.number()]).transform(String).optional(),
  uuid: z.string().uuid().optional(),
  bookId: z.union([z.string(), z.number()]).transform(String),
  parentChapterId: z.union([z.string(), z.number()])
    .transform(val => val === null ? null : String(val))
    .nullable()
    .optional(),
  title: z.string().min(1, 'Title is required').max(255, 'Title is too long'),
  slug: z.string()
    .min(1, 'Slug is required')
    .max(255, 'Slug is too long')
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug must be URL-friendly')
    .optional(),
  content: z.union([
    z.string().min(1, 'Content is required'),
    z.object({
      type: z.string(),
      content: z.array(z.any()).optional(),
      text: z.string().optional(),
      attrs: z.record(z.string(), z.any()).optional(),
      marks: z.array(z.any()).optional()
    })
  ]).transform(val => typeof val === 'string' ? val : JSON.stringify(val)),
  order: z.number().int().min(0).default(0),
  level: z.number().int().min(1).default(1),
  wordCount: z.number().int().min(0).default(0),
  readingTime: z.number().int().min(0).nullable().optional(),
  createdAt: z.date().or(z.string()).optional(),
  updatedAt: z.date().or(z.string()).optional(),
});

export type ChapterFormValues = z.infer<typeof chapterFormSchema>;
