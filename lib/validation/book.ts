// @/lib/validation/book.ts
import { z } from "zod";

export const BOOK_GENRES = [
  "FICTION", "NON_FICTION", "SCIENCE_FICTION", "FANTASY", "ROMANCE",
  "THRILLER", "MYSTERY", "HORROR", "BIOGRAPHY", "HISTORY", "SELF_HELP",
  "CHILDREN", "YOUNG_ADULT", "COOKBOOK", "TRAVEL", "HUMOR", "POETRY",
  "BUSINESS", "TECHNOLOGY", "SCIENCE", "PHILOSOPHY", "RELIGION", "OTHER",
] as const;

export type BookGenreType = (typeof BOOK_GENRES)[number];

export const bookSchema = z
  .object({
    title: z.string().min(1, { message: "Title is required" }),
    author: z.string().min(1, { message: "Author is required" }),
    publisher: z.string().min(1, { message: "Publisher is required" }),
    contributors: z.array(z.object({ name: z.string() })).optional(),
    translators: z.array(z.object({ name: z.string() })).optional(),
    slug: z.string().optional(),
    subtitle: z.string().optional(),
    description: z.string().optional(),
    publisherWebsite: z
      .string()
      .url({ message: "Invalid URL" })
      .or(z.literal(""))
      .optional(),
    publishYear: z
      .coerce.number()
      .int()
      .min(1000, { message: "Year must be at least 1000" })
      .max(new Date().getFullYear() + 1, {
        message: "Year cannot be in the future",
      })
      .optional(),
    isbn: z
      .string()
      .regex(/^(\d{10}|\d{13})$/, {
        message: "Invalid ISBN format (must be 10 or 13 digits",
      })
      .or(z.literal(""))
      .optional(),
    language: z
      .string()
      .length(2, { message: "Must be a 2-letter language code" })
      .default("tr")
      .optional(),
    genre: z.enum(BOOK_GENRES).optional(),
    series: z.string().optional(),
    seriesIndex: z.coerce.number().int().min(1).optional(),
    tags: z.array(z.string()).optional(),
    coverImageUrl: z
      .string()
      .url({ message: "Invalid image URL" })
      .or(z.literal(""))
      .optional(),
    isPublished: z.boolean().default(false).optional(),
    isFeatured: z.boolean().default(false).optional(),
  })
  .superRefine((data, ctx) => {
    if (!data.isbn && !data.publishYear) {
      ctx.addIssue({
        code: "custom",
        message: "Either ISBN or Publish Year is required",
        path: ["isbn"],
      });
    }
  });

// Export the inferred type
export type BookFormValues = z.infer<typeof bookSchema>;