import { relations } from "drizzle-orm/relations";
import { user, books, media, userPreferences, account, chapters, session, subscription, userProfiles } from "./schema";

export const booksRelations = relations(books, ({one, many}) => ({
	user: one(user, {
		fields: [books.userId],
		references: [user.id]
	}),
	media: many(media),
	chapters: many(chapters),
}));

export const userRelations = relations(user, ({many}) => ({
	books: many(books),
	media: many(media),
	userPreferences: many(userPreferences),
	accounts: many(account),
	sessions: many(session),
	subscriptions: many(subscription),
	userProfiles: many(userProfiles),
}));

export const mediaRelations = relations(media, ({one}) => ({
	book: one(books, {
		fields: [media.bookId],
		references: [books.id]
	}),
	user: one(user, {
		fields: [media.userId],
		references: [user.id]
	}),
}));

export const userPreferencesRelations = relations(userPreferences, ({one}) => ({
	user: one(user, {
		fields: [userPreferences.userId],
		references: [user.id]
	}),
}));

export const accountRelations = relations(account, ({one}) => ({
	user: one(user, {
		fields: [account.userId],
		references: [user.id]
	}),
}));

export const chaptersRelations = relations(chapters, ({one, many}) => ({
	book: one(books, {
		fields: [chapters.bookId],
		references: [books.id]
	}),
	chapter: one(chapters, {
		fields: [chapters.parentChapterId],
		references: [chapters.id],
		relationName: "chapters_parentChapterId_chapters_id"
	}),
	chapters: many(chapters, {
		relationName: "chapters_parentChapterId_chapters_id"
	}),
}));

export const sessionRelations = relations(session, ({one}) => ({
	user: one(user, {
		fields: [session.userId],
		references: [user.id]
	}),
}));

export const subscriptionRelations = relations(subscription, ({one}) => ({
	user: one(user, {
		fields: [subscription.userId],
		references: [user.id]
	}),
}));

export const userProfilesRelations = relations(userProfiles, ({one}) => ({
	user: one(user, {
		fields: [userProfiles.userId],
		references: [user.id]
	}),
}));