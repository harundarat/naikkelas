import { pgTable, text, timestamp, jsonb, primaryKey, integer } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

export const users = pgTable('users', {
  id: text('id').primaryKey().notNull(), // user_id from Google OAuth
  name: text('name'),
  email: text('email').notNull().unique(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const chats = pgTable('chats', {
  id: text('id').primaryKey().notNull(), // chat_id
  userId: text('user_id').notNull().references(() => users.id),
  title: text('title').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const messages = pgTable('messages', {
  id: text('id').primaryKey().notNull(), // message_id
  chatId: text('chat_id').notNull().references(() => chats.id),
  userId: text('user_id').notNull().references(() => users.id),
  role: text('role').notNull(), // 'user' or 'ai'
  content: text('content').notNull(),
  attachments: jsonb('attachments').$type<{ type: string; url: string; }[]>().default(sql`'[]'::jsonb`).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const facts = pgTable('facts', {
  id: text('id').primaryKey().notNull(), // fact_id
  userId: text('user_id').notNull().references(() => users.id),
  key: text('key').notNull(),
  value: text('value').notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const conversationSummary = pgTable('conversation_summary', {
  id: text('id').primaryKey().notNull(), // summary_id
  userId: text('user_id').notNull().references(() => users.id),
  summaryText: text('summary_text').notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const userCredits = pgTable('user_credits', {
  id: text('id').primaryKey().notNull(),
  userId: text('user_id').notNull().references(() => users.id).unique(),
  credits: integer('credits').notNull().default(10),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const topupTransactions = pgTable('topup_transactions', {
  id: text('id').primaryKey().notNull(),
  userId: text('user_id').notNull().references(() => users.id),
  flipBillId: text('flip_bill_id').notNull().unique(),
  flipBillLink: text('flip_bill_link'),
  amount: integer('amount').notNull(), // in IDR
  credits: integer('credits').notNull(),
  status: text('status').notNull().default('PENDING'), // PENDING, SUCCESSFUL, FAILED, CANCELLED
  paidAt: timestamp('paid_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Referral System Tables

export const referralCodes = pgTable('referral_codes', {
  id: text('id').primaryKey().notNull(),
  userId: text('user_id').notNull().references(() => users.id).unique(),
  code: text('code').notNull().unique(), // e.g., "REF_abc123"
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const referrals = pgTable('referrals', {
  id: text('id').primaryKey().notNull(),
  referredUserId: text('referred_user_id').notNull().references(() => users.id).unique(),
  referrerLevel1Id: text('referrer_level1_id').notNull().references(() => users.id),
  referrerLevel2Id: text('referrer_level2_id').references(() => users.id), // nullable
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const userRewards = pgTable('user_rewards', {
  id: text('id').primaryKey().notNull(),
  userId: text('user_id').notNull().references(() => users.id).unique(),
  balance: integer('balance').notNull().default(0), // in IDR
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const rewardTransactions = pgTable('reward_transactions', {
  id: text('id').primaryKey().notNull(),
  userId: text('user_id').notNull().references(() => users.id),
  amount: integer('amount').notNull(), // positive = credit, negative = debit
  type: text('type').notNull(), // 'REFERRAL_LEVEL1', 'REFERRAL_LEVEL2', 'REDEMPTION'
  referralId: text('referral_id').references(() => referrals.id), // nullable, links to referral
  description: text('description'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});
