import {
  boolean,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  smallint,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core'

// --- enums ---

export const slotEnum = pgEnum('recipe_slot', [
  'bow',
  'crossbow',
  'wand',
  'staff',
  'sceptre',
  'spear',
  'mace',
  'weapon_1h',
  'weapon_2h',
  'quiver',
  'shield',
  'focus',
  'helmet',
  'body_armour',
  'gloves',
  'boots',
  'belt',
  'amulet',
  'ring',
  'jewel',
  'other',
])

export const costCurrencyEnum = pgEnum('recipe_cost_currency', ['chaos', 'divine', 'exalted', 'mirror'])

export const recipeStatusEnum = pgEnum('recipe_status', ['draft', 'published', 'flagged', 'deprecated'])

export const completionOutcomeEnum = pgEnum('completion_outcome', ['success', 'failure', 'partial'])

export const eventKindEnum = pgEnum('event_kind', [
  'recipe_published',
  'recipe_flagged',
  'recipe_comment',
  'new_completion',
])

// --- users (mirror Services Market) ---

export const users = pgTable(
  'users',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    discordId: text('discord_id').notNull(),
    discordUsername: text('discord_username').notNull(),
    displayName: text('display_name').notNull(),
    banned: boolean('banned').default(false).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    discordIdUnique: uniqueIndex('users_discord_id_uq').on(t.discordId),
  }),
)

// --- recipes ---

export const recipes = pgTable(
  'recipes',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    authorId: uuid('author_id').references(() => users.id, { onDelete: 'set null' }),
    title: text('title').notNull(),
    slot: slotEnum('slot').notNull(),
    poeVersion: smallint('poe_version').notNull(),
    league: text('league').notNull().default('all'),
    goal: text('goal').notNull(),
    difficulty: smallint('difficulty').notNull().default(3),
    estimatedCostMin: numeric('estimated_cost_min', { precision: 12, scale: 2 }),
    estimatedCostMax: numeric('estimated_cost_max', { precision: 12, scale: 2 }),
    costCurrency: costCurrencyEnum('cost_currency').notNull().default('divine'),
    baseRequirements: jsonb('base_requirements').notNull().default({}),
    steps: jsonb('steps').notNull().default([]),
    pricingTips: jsonb('pricing_tips').notNull().default([]),
    notes: jsonb('notes').notNull().default([]),
    status: recipeStatusEnum('status').notNull().default('draft'),
    upvotes: integer('upvotes').notNull().default(0),
    downvotes: integer('downvotes').notNull().default(0),
    viewCount: integer('view_count').notNull().default(0),
    successCount: integer('success_count').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    slotPoeStatusIdx: index('recipes_slot_poe_status_idx').on(t.slot, t.poeVersion, t.status),
    authorIdx: index('recipes_author_idx').on(t.authorId),
    topIdx: index('recipes_top_idx').on(t.poeVersion, t.status, t.upvotes),
  }),
)

export const recipeVotes = pgTable(
  'recipe_votes',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    recipeId: uuid('recipe_id').notNull().references(() => recipes.id, { onDelete: 'cascade' }),
    userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    value: smallint('value').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    uniqueIdx: uniqueIndex('recipe_votes_recipe_user_uq').on(t.recipeId, t.userId),
  }),
)

export const recipeComments = pgTable(
  'recipe_comments',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    recipeId: uuid('recipe_id').notNull().references(() => recipes.id, { onDelete: 'cascade' }),
    userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    body: text('body').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    recipeIdx: index('recipe_comments_recipe_idx').on(t.recipeId, t.createdAt),
  }),
)

export const recipeReports = pgTable(
  'recipe_reports',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    recipeId: uuid('recipe_id').notNull().references(() => recipes.id, { onDelete: 'cascade' }),
    reporterId: uuid('reporter_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    reason: text('reason').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    uniqueIdx: uniqueIndex('recipe_reports_recipe_reporter_uq').on(t.recipeId, t.reporterId),
  }),
)

export const recipeCompletions = pgTable(
  'recipe_completions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    recipeId: uuid('recipe_id').notNull().references(() => recipes.id, { onDelete: 'cascade' }),
    userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    outcome: completionOutcomeEnum('outcome').notNull(),
    attempts: integer('attempts'),
    costSpent: numeric('cost_spent', { precision: 12, scale: 2 }),
    notes: text('notes'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    recipeIdx: index('recipe_completions_recipe_idx').on(t.recipeId, t.createdAt),
    userIdx: index('recipe_completions_user_idx').on(t.userId),
  }),
)

// --- mod tier dataset (RePoE-fork mirror) ---

export const modDataset = pgTable('mod_dataset', {
  id: text('id').primaryKey(), // 'poe1' | 'poe2'
  schemaVersion: integer('schema_version').notNull(),
  data: jsonb('data').notNull(),
  sourceHash: text('source_hash'),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})

// --- events for polling ---

export const events = pgTable(
  'events',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    kind: eventKindEnum('kind').notNull(),
    payload: jsonb('payload').notNull().default({}),
    read: boolean('read').default(false).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    userTsIdx: index('events_user_ts_idx').on(t.userId, t.createdAt),
  }),
)

// --- sessions + device codes (Discord OAuth) ---

export const sessions = pgTable(
  'sessions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    token: text('token').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  },
  (t) => ({
    tokenIdx: uniqueIndex('sessions_token_uq').on(t.token),
    userIdx: index('sessions_user_idx').on(t.userId),
  }),
)

export const deviceCodes = pgTable(
  'device_codes',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    code: text('code').notNull(),
    userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }),
    sessionToken: text('session_token'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  },
  (t) => ({
    codeIdx: uniqueIndex('device_codes_code_uq').on(t.code),
  }),
)

export const REPORT_FLAG_THRESHOLD = 3
