import { Chapter as DbChapter } from '../db/schema';

export type Chapter = DbChapter & {
  children?: Chapter[];
  parent?: Chapter | null;
};

export type ChapterTreeItem = {
  id: number;
  title: string;
  level: number;
  order: number;
  parentChapterId: number | null;
  children: ChapterTreeItem[];
};

export type ChapterFormValues = {
  id?: number;
  bookId: number;
  parentChapterId: number | null;
  title: string;
  content: any; // Plate editor content
  excerpt?: string;
  order: number;
  level: number;
  isDraft: boolean;
};

export type ChapterContent = {
  type: string;
  children: any[];
};

export type ChapterBreadcrumb = {
  id: number;
  title: string;
  level: number;
};
