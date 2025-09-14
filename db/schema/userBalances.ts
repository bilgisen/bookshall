import { pgTable, text, integer, timestamp } from 'drizzle-orm/pg-core';

export const userBalances = pgTable('user_balances', {
  userId: text('user_id').primaryKey(),
  balance: integer('balance').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export type UserBalance = typeof userBalances.$inferSelect;
export type NewUserBalance = typeof userBalances.$inferInsert;
