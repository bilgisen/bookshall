import { Chapter as DbChapter } from '@/db';

export type Chapter = DbChapter & {
  children?: Chapter[];
  parent?: Chapter | null;
};

export type ChapterTreeItem = {
  id: number;
  uuid: string;
  title: string;
  level: number;
  order: number;
  parentChapterId: number | null;
  children: ChapterTreeItem[];
};

export type ChapterFormValues = {
  id?: number;
  uuid?: string;
  bookId: number;
  parentChapterId: number | null;
  title: string;
  content: string;
  order: number;
  level: number;
  wordCount: number;
  readingTime?: number | null;
  createdAt?: Date | string;
  updatedAt?: Date | string;
};

export type ChapterBreadcrumb = {
  id: number;
  uuid: string;
  title: string;
  level: number;
};

export type ReorderPatch = {
  id: string;
  order: number;
  level: number;
  parentChapterId: string | null;
};

export type ReorderChaptersInput = {
  bookId: string;
  patches: ReorderPatch[];
};

export type ChapterWithBook = Chapter & {
  book: {
    id: number;
    title: string;
    slug: string;
    author?: string | null;
    coverImageUrl?: string | null;
    language: string;
    createdAt: Date | string;
    updatedAt: Date | string;
  };
};
