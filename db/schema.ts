// Intentionally empty by default.
// Add Drizzle tables here when the site actually needs a database.
// See examples/d1/db/schema.ts for an opt-in example.
import { sqliteTable, text, integer, uniqueIndex } from "drizzle-orm/sqlite-core";
import { sql } from 'drizzle-orm';

// One versioned district document is the transaction boundary. Updates use CAS.
export const districts = sqliteTable("districts", {
  id: text("id").primaryKey(),
  revision: integer("revision").notNull().default(0),
  data: text("data").notNull(),
});

export const accounts = sqliteTable('accounts', {
  id: text('id').primaryKey(), email: text('email').notNull().unique(),
  name: text('name').notNull(), password: text('password').notNull(), salt: text('salt').notNull(),
  role: text('role').notNull(), status: text('status').notNull().default('onboarding'),
  profile: text('profile').notNull().default('{}'), entity: text('entity').notNull(),
  review: text('review').notNull().default(''), created: integer('created').notNull(),
},table=>[uniqueIndex('one_initial_coordinator').on(table.role).where(sql`${table.role} = 'coordinator'`)]);
export const sessions = sqliteTable('sessions', {
  token: text('token').primaryKey(), account: text('account').notNull(), expires: integer('expires').notNull(),
});
export const documents = sqliteTable('documents', {
  id: text('id').primaryKey(), account: text('account').notNull(), kind: text('kind').notNull(),
  name: text('name').notNull(), mime: text('mime').notNull(), size: integer('size').notNull(), created: integer('created').notNull(),
});
export const authLimits=sqliteTable('auth_limits',{key:text('key').primaryKey(),count:integer('count').notNull(),until:integer('until').notNull()});
export const directoryCache=sqliteTable('directory_cache',{key:text('key').primaryKey(),data:text('data').notNull(),expires:integer('expires').notNull()});
