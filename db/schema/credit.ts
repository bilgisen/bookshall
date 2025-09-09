import { pgTable, uuid, integer, varchar, timestamp, jsonb, pgEnum } from 'drizzle-orm/pg-core';
import { user } from '../../auth-schema';

export const transactionType = pgEnum('transaction_type', ['earn', 'spend']);

export const creditTransactions = pgTable('credit_transactions', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  type: transactionType('type').notNull(),
  amount: integer('amount').notNull(),
  reason: varchar('reason', { length: 255 }),
  metadata: jsonb('metadata').default({}),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export type CreditTransaction = typeof creditTransactions.$inferSelect;
export type NewCreditTransaction = typeof creditTransactions.$inferInsert;

export type TransactionType = 'earn' | 'spend';
