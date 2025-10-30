import { pgTable, uuid, varchar, text, timestamp, jsonb, pgEnum } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// --- ENUMS ---

export const spaceEnum = pgEnum('space', ['work', 'personal']);

// --- TABLES ---

// Users table (for preferences and saved reports)
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: varchar('email', { length: 255 }).unique(),
  name: varchar('name', { length: 255 }),
  eventernoteUserId: varchar('eventernote_user_id', { length: 255 }).notNull().unique(),
  preferences: jsonb('preferences').$type<{
    defaultSpace?: 'work' | 'personal';
    defaultDateRange?: string;
  }>(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
});

// Cached events from Eventernote
export const cachedEvents = pgTable('cached_events', {
  id: uuid('id').primaryKey().defaultRandom(),
  eventernoteUserId: varchar('eventernote_user_id', { length: 255 }).notNull(),
  eventHref: varchar('event_href', { length: 500 }).notNull(),
  eventName: varchar('event_name', { length: 500 }).notNull(),
  eventDate: varchar('event_date', { length: 50 }).notNull(),
  place: varchar('place', { length: 500 }).notNull(),
  artists: jsonb('artists').$type<string[]>().notNull(),
  description: text('description'),
  imageUrl: varchar('image_url', { length: 1000 }),
  cachedAt: timestamp('cached_at').defaultNow().notNull(),
  expiresAt: timestamp('expires_at').notNull()
});

// Event details cache (for individual event pages)
export const cachedEventDetails = pgTable('cached_event_details', {
  id: uuid('id').primaryKey().defaultRandom(),
  eventHref: varchar('event_href', { length: 500 }).notNull().unique(),
  artists: jsonb('artists').$type<string[]>().notNull(),
  description: text('description'),
  imageUrl: varchar('image_url', { length: 1000 }),
  cachedAt: timestamp('cached_at').defaultNow().notNull(),
  expiresAt: timestamp('expires_at').notNull()
});

// User reports (saved report configurations)
export const savedReports = pgTable('saved_reports', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id).notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  startDate: varchar('start_date', { length: 50 }),
  endDate: varchar('end_date', { length: 50 }),
  filters: jsonb('filters').$type<{
    artists?: string[];
    venues?: string[];
    hasMultipleArtists?: boolean;
  }>(),
  shareUrl: varchar('share_url', { length: 500 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
});

// --- RELATIONS ---

export const usersRelations = relations(users, ({ many }) => ({
  reports: many(savedReports)
}));

export const savedReportsRelations = relations(savedReports, ({ one }) => ({
  user: one(users, {
    fields: [savedReports.userId],
    references: [users.id]
  })
}));

// --- TYPE INFERENCE ---

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export type CachedEvent = typeof cachedEvents.$inferSelect;
export type NewCachedEvent = typeof cachedEvents.$inferInsert;

export type CachedEventDetails = typeof cachedEventDetails.$inferSelect;
export type NewCachedEventDetails = typeof cachedEventDetails.$inferInsert;

export type SavedReport = typeof savedReports.$inferSelect;
export type NewSavedReport = typeof savedReports.$inferInsert;
