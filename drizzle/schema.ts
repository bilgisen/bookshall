import { pgTable, foreignKey, unique, text, integer, boolean, timestamp, uniqueIndex, serial, jsonb } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"



export const books = pgTable("books", {
	id: text().primaryKey().notNull(),
	userId: text().notNull(),
	title: text().notNull(),
	subtitle: text(),
	slug: text().notNull(),
	author: text().notNull(),
	contributor: text(),
	translator: text(),
	publisher: text(),
	publisherWebsite: text(),
	publishYear: integer(),
	isbn: text(),
	genre: text(),
	series: text(),
	seriesIndex: integer(),
	tags: text().array(),
	description: text(),
	language: text().default('tr'),
	isPublished: boolean().default(false),
	coverImageUrl: text(),
	epubUrl: text(),
	createdAt: timestamp({ withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [user.id],
			name: "books_userId_user_id_fk"
		}).onDelete("cascade"),
	unique("books_slug_unique").on(table.slug),
]);

export const media = pgTable("media", {
	id: serial().primaryKey().notNull(),
	userId: text().notNull(),
	bookId: text(),
	url: text().notNull(),
	name: text().notNull(),
	mimeType: text().notNull(),
	size: integer().notNull(),
	width: integer(),
	height: integer(),
	altText: text(),
	caption: text(),
	createdAt: timestamp({ withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	uniqueIndex("media_url_uq").using("btree", table.url.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.bookId],
			foreignColumns: [books.id],
			name: "media_bookId_books_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [user.id],
			name: "media_userId_user_id_fk"
		}).onDelete("cascade"),
]);

export const subscriptionPlans = pgTable("subscription_plans", {
	id: serial().primaryKey().notNull(),
	name: text().notNull(),
	description: text(),
	monthlyBookQuota: integer().notNull(),
	priceMonthly: integer().notNull(),
	priceYearly: integer(),
	features: jsonb().default({}),
	isActive: boolean().default(true).notNull(),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
});

export const userPreferences = pgTable("user_preferences", {
	id: serial().primaryKey().notNull(),
	userId: text().notNull(),
	language: text().default('tr'),
	theme: text().default('light'),
	notifications: jsonb().default({"push":true,"email":true,"newsletter":true}),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [user.id],
			name: "user_preferences_userId_user_id_fk"
		}).onDelete("cascade"),
]);

export const verification = pgTable("verification", {
	id: text().primaryKey().notNull(),
	identifier: text().notNull(),
	value: text().notNull(),
	expiresAt: timestamp({ mode: 'string' }).notNull(),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
});

export const user = pgTable("user", {
	id: text().primaryKey().notNull(),
	name: text().notNull(),
	email: text().notNull(),
	emailVerified: boolean().default(false).notNull(),
	image: text(),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	unique("user_email_unique").on(table.email),
]);

export const account = pgTable("account", {
	id: text().primaryKey().notNull(),
	accountId: text().notNull(),
	providerId: text().notNull(),
	userId: text().notNull(),
	accessToken: text(),
	refreshToken: text(),
	idToken: text(),
	accessTokenExpiresAt: timestamp({ mode: 'string' }),
	refreshTokenExpiresAt: timestamp({ mode: 'string' }),
	scope: text(),
	password: text(),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [user.id],
			name: "account_userId_user_id_fk"
		}).onDelete("cascade"),
]);

export const chapters = pgTable("chapters", {
	id: text().primaryKey().notNull(),
	uuid: text().notNull(),
	bookId: text().notNull(),
	parentChapterId: text(),
	title: text().notNull(),
	content: text().notNull(),
	order: integer().default(0).notNull(),
	level: integer().default(1).notNull(),
	isDraft: boolean().default(true),
	wordCount: integer().default(0).notNull(),
	readingTime: integer(),
	createdAt: timestamp({ withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.bookId],
			foreignColumns: [books.id],
			name: "chapters_bookId_books_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.parentChapterId],
			foreignColumns: [table.id],
			name: "chapters_parentChapterId_chapters_id_fk"
		}).onDelete("set null"),
	unique("chapters_uuid_unique").on(table.uuid),
]);

export const session = pgTable("session", {
	id: text().primaryKey().notNull(),
	expiresAt: timestamp({ mode: 'string' }).notNull(),
	token: text().notNull(),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	ipAddress: text(),
	userAgent: text(),
	userId: text().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [user.id],
			name: "session_userId_user_id_fk"
		}).onDelete("cascade"),
	unique("session_token_unique").on(table.token),
]);

export const subscription = pgTable("subscription", {
	id: text().primaryKey().notNull(),
	createdAt: timestamp({ mode: 'string' }).notNull(),
	modifiedAt: timestamp({ mode: 'string' }),
	amount: integer().notNull(),
	currency: text().notNull(),
	recurringInterval: text().notNull(),
	status: text().notNull(),
	currentPeriodStart: timestamp({ mode: 'string' }).notNull(),
	currentPeriodEnd: timestamp({ mode: 'string' }).notNull(),
	cancelAtPeriodEnd: boolean().default(false).notNull(),
	canceledAt: timestamp({ mode: 'string' }),
	startedAt: timestamp({ mode: 'string' }).notNull(),
	endsAt: timestamp({ mode: 'string' }),
	endedAt: timestamp({ mode: 'string' }),
	customerId: text().notNull(),
	productId: text().notNull(),
	discountId: text(),
	checkoutId: text().notNull(),
	customerCancellationReason: text(),
	customerCancellationComment: text(),
	metadata: text(),
	customFieldData: text(),
	userId: text(),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [user.id],
			name: "subscription_userId_user_id_fk"
		}),
]);

export const userProfiles = pgTable("user_profiles", {
	id: serial().primaryKey().notNull(),
	userId: text().notNull(),
	firstName: text(),
	lastName: text(),
	imageUrl: text(),
	role: text().default('MEMBER'),
	isActive: boolean().default(true).notNull(),
	permissions: text().array().default(["read:books"]).notNull(),
	subscriptionId: text(),
	subscriptionStatus: text().default('TRIAL'),
	subscriptionPlan: text(),
	subscriptionStartDate: timestamp({ mode: 'string' }),
	subscriptionEndDate: timestamp({ mode: 'string' }),
	stripeCustomerId: text(),
	metadata: jsonb().default({}),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	lastLoginAt: timestamp({ mode: 'string' }),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [user.id],
			name: "user_profiles_userId_user_id_fk"
		}).onDelete("cascade"),
	unique("user_profiles_subscriptionId_unique").on(table.subscriptionId),
	unique("user_profiles_stripeCustomerId_unique").on(table.stripeCustomerId),
]);
