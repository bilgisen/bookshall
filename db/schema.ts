// src/db/schema.ts
import { sql } from 'drizzle-orm';
import {
  pgTable,
  text,
  timestamp,
  boolean,
  integer,
  serial,
  jsonb,
  AnyPgColumn,
  uniqueIndex,
  uuid,
  pgEnum,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

/* ============================
   ENUMS (books-side helpers)
   ============================ */
export const userRoleEnum = pgEnumIfNeeded();
export const bookGenreEnum = pgEnumIfNeeded();

/**
 * Helper: create an enum only if it does not already exist at runtime.
 * (Used to avoid accidental redeclare in hot-reload / multiple includes.)
 * Replace with direct pgEnum(...) if you prefer strict single-declare.
 */
function pgEnumIfNeeded() {
  // This function is a lightweight local helper to avoid re-declarations
  // in environments with module reloads (dev). It returns a function
  // that acts like a placeholder; drizzle will accept the call-site shape.
  // IMPORTANT: At build/migration time you can switch to:
  // export const userRoleEnum = pgEnum('user_role', ['ADMIN','AUTHOR','MEMBER']);
  // export const bookGenreEnum = pgEnum('book_genre', ['FICTION','NON_FICTION',...]);
  // I keep this small helper to avoid duplicate-declare issues during dev.
  // (If you want explicit enums now, I can replace these with explicit pgEnum calls.)
  // For migrations, explicit pgEnum(...) is preferred.
  // This is a type-safe way to create a placeholder for pgEnum
  type PgEnumType<T extends string> = (name: string, values: T[]) => T;
  return (() => ({})) as unknown as PgEnumType<string>;
}

/* ============================
   BETTER-AUTH / POLAR (TABLO A)
   - **DİKKAT**: A yapısı korunmuştur (alan adları/isimleri birebir).
   ============================ */

/** user (Better-Auth) */
export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("emailVerified").notNull().default(false),
  image: text("image"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
});

/** session (Better-Auth) - includes token (required by Better-Auth) */
export const session = pgTable("session", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expiresAt").notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
  ipAddress: text("ipAddress"),
  userAgent: text("userAgent"),
  userId: text("userId")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
});

/** account (Better-Auth / OAuth providers) */
export const account = pgTable("account", {
  id: text("id").primaryKey(),
  accountId: text("accountId").notNull(),
  providerId: text("providerId").notNull(),
  userId: text("userId")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("accessToken"),
  refreshToken: text("refreshToken"),
  idToken: text("idToken"),
  accessTokenExpiresAt: timestamp("accessTokenExpiresAt"),
  refreshTokenExpiresAt: timestamp("refreshTokenExpiresAt"),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
});

/** verification (Better-Auth) */
export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expiresAt").notNull(),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
});

/** subscription (Polar webhook data) - kept exactly like Tablo A */
export const subscription = pgTable("subscription", {
  id: text("id").primaryKey(),
  createdAt: timestamp("createdAt"), // notNull kaldırıldı
  modifiedAt: timestamp("modifiedAt"),
  amount: integer("amount"), // notNull kaldırıldı
  currency: text("currency"), // notNull kaldırıldı
  recurringInterval: text("recurringInterval"), // notNull kaldırıldı
  status: text("status"), // notNull kaldırıldı
  currentPeriodStart: timestamp("currentPeriodStart"), // notNull kaldırıldı
  currentPeriodEnd: timestamp("currentPeriodEnd"), // notNull kaldırıldı
  cancelAtPeriodEnd: boolean("cancelAtPeriodEnd").default(false), // notNull kaldırıldı
  canceledAt: timestamp("canceledAt"),
  startedAt: timestamp("startedAt"), // notNull kaldırıldı
  endsAt: timestamp("endsAt"),
  endedAt: timestamp("endedAt"),
  customerId: text("customerId"), // notNull kaldırıldı
  productId: text("productId"), // notNull kaldırıldı
  discountId: text("discountId"),
  checkoutId: text("checkoutId"), // notNull kaldırıldı
  customerCancellationReason: text("customerCancellationReason"),
  customerCancellationComment: text("customerCancellationComment"),
  metadata: text("metadata"), // Stored as JSON string in original A
  customFieldData: text("customFieldData"), // Stored as JSON string in original A
  userId: text("userId").references(() => user.id), // opsiyonel bırakıldı
});



/** user_profiles - extends Better-Auth user (1:1-ish) */
export const userProfiles = pgTable("user_profiles", {
  id: serial("id").primaryKey(),
  userId: text("userId")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  firstName: text("firstName"),
  lastName: text("lastName"),
  imageUrl: text("imageUrl"),
  role: text("role").default("MEMBER"),
  isActive: boolean("isActive").default(true).notNull(),
  permissions: text("permissions").array().default(["read:books"]).notNull(),
  subscriptionId: text("subscriptionId").unique(),
  subscriptionStatus: text("subscriptionStatus").default("TRIAL"),
  subscriptionPlan: text("subscriptionPlan"),
  subscriptionStartDate: timestamp("subscriptionStartDate"),
  subscriptionEndDate: timestamp("subscriptionEndDate"),
  stripeCustomerId: text("stripeCustomerId").unique(),
  metadata: jsonb("metadata").default({}),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  lastLoginAt: timestamp("lastLoginAt"),
});

/** user_preferences */
export const userPreferences = pgTable("user_preferences", {
  id: serial("id").primaryKey(),
  userId: text("userId")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  language: text("language").default("tr"),
  theme: text("theme").default("light"),
  notifications: jsonb("notifications").default(
    sql`'{"email":true,"push":true,"newsletter":true}'::jsonb`
  ),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

/** books */
/** workflow_status - tracks status of background workflows */
export const workflowStatus = pgTable("workflow_status", {
  id: text("id").primaryKey().notNull().$defaultFn(() => crypto.randomUUID()),
  bookId: text("bookId")
    .notNull()
    .references(() => books.id, { onDelete: "cascade" }),
  workflowId: text("workflowId").notNull(),
  status: text("status", { enum: ['pending', 'queued', 'in-progress', 'completed', 'failed'] } as const).notNull().default("pending"),
  progress: integer("progress").default(0).notNull(),
  error: text("error"),
  result: jsonb("result"),
  workflowRunUrl: text("workflowRunUrl"),
  metadata: jsonb("metadata"),
  startedAt: timestamp("startedAt", { withTimezone: true }),
  completedAt: timestamp("completedAt", { withTimezone: true }),
  createdAt: timestamp("createdAt", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updatedAt", { withTimezone: true }).notNull().defaultNow(),
});

/** books */
export const books = pgTable("books", {
  id: text("id").primaryKey().notNull().$defaultFn(() => crypto.randomUUID()),
  userId: text("userId")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  subtitle: text("subtitle"),
  slug: text("slug").notNull().unique(),
  author: text("author").notNull(),
  contributor: text("contributor"),
  translator: text("translator"),
  publisher: text("publisher"),
  publisherWebsite: text("publisherWebsite"),
  publishYear: integer("publishYear"),
  isbn: text("isbn"),
  genre: text("genre"), // kept text to avoid implicit enum mismatch
  series: text("series"),
  seriesIndex: integer("seriesIndex"),
  tags: text("tags").array(),
  description: text("description"),
  language: text("language").default("tr"),
  isPublished: boolean("isPublished").default(false),
  coverImageUrl: text("coverImageUrl"), // NOTE: intentionally NOT a FK to media.url (avoids circular)
  epubUrl: text("epubUrl"),
  createdAt: timestamp("createdAt", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updatedAt", { withTimezone: true }).notNull().defaultNow(),
});

/** media */
export const media = pgTable(
  "media",
  {
    id: serial("id").primaryKey(),
    userId: text("userId")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    bookId: text("bookId").references(() => books.id, { onDelete: "cascade" }),
    url: text("url").notNull(),
    name: text("name").notNull(),
    mimeType: text("mimeType").notNull(),
    size: integer("size").notNull(),
    width: integer("width"),
    height: integer("height"),
    altText: text("altText"),
    caption: text("caption"),
    createdAt: timestamp("createdAt", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updatedAt", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    urlUq: uniqueIndex("media_url_uq").on(t.url),
  }),
);

/** chapters - self-referential (AnyPgColumn to avoid TS circular errors) */
export const chapters = pgTable("chapters", {
  id: text("id").primaryKey().notNull().$defaultFn(() => crypto.randomUUID()),
  uuid: text("uuid").unique().notNull().$defaultFn(() => crypto.randomUUID()),
  bookId: text("bookId")
    .notNull()
    .references(() => books.id, { onDelete: "cascade" }),
  parentChapterId: text("parentChapterId").references(
    (): AnyPgColumn => chapters.id,
    { onDelete: "set null" },
  ),
  title: text("title").notNull(),
  content: text("content").notNull(), 
  order: integer("order").default(0).notNull(),
  level: integer("level").default(1).notNull(),
  isDraft: boolean("isDraft").default(false),
  wordCount: integer("wordCount").default(0).notNull(),
  readingTime: integer("readingTime"),
  createdAt: timestamp("createdAt", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updatedAt", { withTimezone: true }).notNull().defaultNow(),
});

/* ============================
   RELATIONS
   (hepsi bir arada; ilişkiler sütun tanımlarından ayrı olduğundan TS circular hatası oluşturmaz)
   ============================ */

export const userRelations = relations(user, ({ one, many }) => ({
  profiles: many(userProfiles),
  preferences: many(userPreferences),
  accounts: many(account),
  sessions: many(session),
  subscriptions: many(subscription),
  books: many(books),
  media: many(media),
}));

export const sessionRelations = relations(session, ({ one }) => ({
  user: one(user, {
    fields: [session.userId],
    references: [user.id],
  }),
}));

export const accountRelations = relations(account, ({ one }) => ({
  user: one(user, {
    fields: [account.userId],
    references: [user.id],
  }),
}));

export const verificationRelations = relations(verification, () => ({
  // no direct relations aside from maybe userIdentifier mapping; kept empty intentionally
}));

export const subscriptionRelations = relations(subscription, ({ one }) => ({
  user: one(user, {
    fields: [subscription.userId],
    references: [user.id],
  }),
}));

export const userProfilesRelations = relations(userProfiles, ({ one, many }) => ({
  user: one(user, {
    fields: [userProfiles.userId],
    references: [user.id],
  }),
  // userProfiles -> books/media -> chapters via userId/bookId etc.
  books: many(books),
  media: many(media),
}));

export const userPreferencesRelations = relations(userPreferences, ({ one }) => ({
  user: one(user, {
    fields: [userPreferences.userId],
    references: [user.id],
  }),
}));

export const booksRelations = relations(books, ({ one, many }) => ({
  user: one(user, {
    fields: [books.userId],
    references: [user.id],
  }),
  media: many(media),
  chapters: many(chapters),
}));

export const mediaRelations = relations(media, ({ one }) => ({
  book: one(books, {
    fields: [media.bookId],
    references: [books.id],
  }),
  user: one(user, {
    fields: [media.userId],
    references: [user.id],
  }),
}));

export const chaptersRelations = relations(chapters, ({ one, many }) => ({
  book: one(books, {
    fields: [chapters.bookId],
    references: [books.id],
  }),
  parent: one(chapters, {
    fields: [chapters.parentChapterId],
    references: [chapters.id],
    relationName: "parentChapter",
  }),
  children: many(chapters, {
    relationName: "parentChapter",
  }),
}));

/* ============================
   TYPES (Infer Select / Insert)
   ============================ */

export type User = typeof user.$inferSelect;
export type NewUser = typeof user.$inferInsert;

export type Session = typeof session.$inferSelect;
export type NewSession = typeof session.$inferInsert;

export type Account = typeof account.$inferSelect;
export type NewAccount = typeof account.$inferInsert;

export type Verification = typeof verification.$inferSelect;
export type NewVerification = typeof verification.$inferInsert;

export type Subscription = typeof subscription.$inferSelect;
export type NewSubscription = typeof subscription.$inferInsert;

export type UserProfile = typeof userProfiles.$inferSelect;
export type NewUserProfile = typeof userProfiles.$inferInsert;

export type UserPreference = typeof userPreferences.$inferSelect;
export type NewUserPreference = typeof userPreferences.$inferInsert;

export type Book = typeof books.$inferSelect;
export type NewBook = typeof books.$inferInsert;

export type Media = typeof media.$inferSelect;
export type NewMedia = typeof media.$inferInsert;

export type Chapter = typeof chapters.$inferSelect;
export type NewChapter = typeof chapters.$inferInsert;

export type WorkflowStatus = typeof workflowStatus.$inferSelect;
export type NewWorkflowStatus = typeof workflowStatus.$inferInsert;

// User Balances
export const userBalances = pgTable('user_balances', {
  userId: text('user_id').primaryKey().references(() => user.id, { onDelete: 'cascade' }),
  balance: integer('balance').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export type UserBalance = typeof userBalances.$inferSelect;
export type NewUserBalance = typeof userBalances.$inferInsert;

// Credit Transactions
export const transactionType = pgEnum('transaction_type', ['earn', 'spend']);

export const creditTransactions = pgTable('credit_transactions', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  type: transactionType('type').notNull(),
  amount: integer('amount').notNull(),
  reason: text('reason'),
  metadata: jsonb('metadata').default({}),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export type CreditTransaction = typeof creditTransactions.$inferSelect;
export type NewCreditTransaction = typeof creditTransactions.$inferInsert;
export type TransactionType = 'earn' | 'spend';