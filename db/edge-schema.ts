// db/edge-schema.ts
import { pgTable, text, timestamp, integer, pgEnum, jsonb } from 'drizzle-orm/pg-core';
import { boolean } from 'drizzle-orm/pg-core';

// Enums
export const userRoleEnum = pgEnum('user_role', ['user', 'admin', 'moderator']);
export const bookGenreEnum = pgEnum('book_genre', ['fiction', 'non-fiction', 'biography', 'history', 'science', 'technology']);

// Auth tables
export const user = pgTable('user', {
  id: text('id').primaryKey(),
  name: text('name'),
  email: text('email').notNull().unique(),
  emailVerified: timestamp('email_verified', { withTimezone: true }),
  image: text('image'),
  role: userRoleEnum('role').notNull().default('user'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const account = pgTable('account', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  type: text('type').notNull(),
  provider: text('provider').notNull(),
  providerAccountId: text('provider_account_id').notNull(),
  refresh_token: text('refresh_token'),
  access_token: text('access_token'),
  expires_at: integer('expires_at'),
  token_type: text('token_type'),
  scope: text('scope'),
  id_token: text('id_token'),
  session_state: text('session_state'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const session = pgTable('session', {
  id: text('id').primaryKey(),
  sessionToken: text('session_token').notNull().unique(),
  userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  expires: timestamp('expires', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const verificationToken = pgTable('verification_token', {
  identifier: text('identifier').notNull(),
  token: text('token').notNull(),
  expires: timestamp('expires', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  compositePk: { columns: [table.identifier, table.token] },
}));

// Application tables
export const subscription = pgTable('subscription', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  status: text('status').notNull(),
  priceId: text('price_id'),
  quantity: integer('quantity'),
  cancelAtPeriodEnd: boolean('cancel_at_period_end').notNull().default(false),
  currentPeriodStart: timestamp('current_period_start', { withTimezone: true }).notNull(),
  currentPeriodEnd: timestamp('current_period_end', { withTimezone: true }).notNull(),
  endedAt: timestamp('ended_at', { withTimezone: true }),
  cancelAt: timestamp('cancel_at', { withTimezone: true }),
  canceledAt: timestamp('canceled_at', { withTimezone: true }),
  trialStart: timestamp('trial_start', { withTimezone: true }),
  trialEnd: timestamp('trial_end', { withTimezone: true }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// User Balances
export const userBalances = pgTable('user_balances', {
  userId: text('user_id').primaryKey().references(() => user.id, { onDelete: 'cascade' }),
  balance: integer('balance').notNull().default(0),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Credit Transactions
export const transactionType = pgEnum('transaction_type', ['earn', 'spend']);

export const creditTransactions = pgTable('credit_transactions', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  type: transactionType('type').notNull(),
  amount: integer('amount').notNull(),
  balance: integer('balance').notNull(),
  reason: text('reason'),
  metadata: jsonb('metadata').$type<Record<string, unknown>>(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Books table
export const books = pgTable('books', {
  id: text('id').primaryKey().notNull(),
  title: text('title').notNull(),
  slug: text('slug').unique().notNull(),
  author: text('author'),
  description: text('description'),
  language: text('language').default('en'),
  subtitle: text('subtitle'),
  coverImageUrl: text('cover_image_url'),
  isPublished: boolean('is_published').default(false),
  userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  publisher: text('publisher'),
  isbn: text('isbn'),
  publishYear: integer('publish_year'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// First define the chapter type without the self-reference
type ChapterBase = {
  id: string;
  bookId: string;
  parentChapterId: string | null;
  title: string;
  content: string | null;
  order: number;
  level: number;
  isDraft: boolean;
  wordCount: number;
  readingTime: number | null;
  createdAt: Date;
  updatedAt: Date;
};

// Then define the full chapter type with children
export type Chapter = ChapterBase & {
  children?: Chapter[];
};

// Define the chapters table with proper typing
export const chapters = pgTable('chapters', {
  id: text('id').primaryKey().notNull(),
  bookId: text('book_id').notNull().references(() => books.id, { onDelete: 'cascade' }),
  // The foreign key constraint is added via a migration
  parentChapterId: text('parent_chapter_id'),
  title: text('title').notNull(),
  content: text('content'),
  order: integer('order').notNull().default(0),
  level: integer('level').notNull().default(1),
  isDraft: boolean('is_draft').default(false),
  wordCount: integer('word_count').default(0),
  readingTime: integer('reading_time'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Export types
export type User = typeof user.$inferSelect;
export type NewUser = typeof user.$inferInsert;
export type Account = typeof account.$inferSelect;
export type NewAccount = typeof account.$inferInsert;
export type Session = typeof session.$inferSelect;
export type NewSession = typeof session.$inferInsert;
export type VerificationToken = typeof verificationToken.$inferSelect;
export type NewVerificationToken = typeof verificationToken.$inferInsert;
export type Subscription = typeof subscription.$inferSelect;
export type NewSubscription = typeof subscription.$inferInsert;
export type UserBalance = typeof userBalances.$inferSelect;
export type NewUserBalance = typeof userBalances.$inferInsert;
export type CreditTransaction = typeof creditTransactions.$inferSelect;
export type NewCreditTransaction = typeof creditTransactions.$inferInsert;

export type Book = typeof books.$inferSelect;
export type NewBook = typeof books.$inferInsert;

export type NewChapter = typeof chapters.$inferInsert;

export type TransactionType = typeof transactionType.enumValues[number];
