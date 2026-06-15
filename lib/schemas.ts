import { z } from 'zod'

// --- enums (mirrors db/schema.ts) ---

export const SLOTS = [
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
] as const

export const COST_CURRENCIES = ['chaos', 'divine', 'exalted', 'mirror'] as const

export const RECIPE_STATUSES = ['draft', 'published', 'flagged', 'deprecated'] as const

export const COMPLETION_OUTCOMES = ['success', 'failure', 'partial'] as const

export const POE_VERSIONS = [1, 2] as const

export const CURRENCY_CATEGORIES = [
  'essence',
  'omen',
  'bone',
  'echo',
  'well',
  'recombinator',
  'rune',
  'standard',
] as const

// --- recipe step shape (jsonb, validated client-side at submission) ---

export const modRequirementSchema = z.object({
  pattern: z.string().min(1).max(200),       // regex against mod text
  minRoll: z.number().optional(),
  minTier: z.number().int().min(1).max(10).optional(),
  prefix: z.boolean().optional(),
  suffix: z.boolean().optional(),
  description: z.string().max(120).optional(),
})

export const itemMatcherSchema: z.ZodType<unknown> = z.object({
  rarity: z.array(z.enum(['normal', 'magic', 'rare', 'unique'])).optional(),
  affixCount: z
    .object({
      min: z.number().int().min(0).max(8).optional(),
      max: z.number().int().min(0).max(8).optional(),
    })
    .optional(),
  ilvlMin: z.number().int().min(1).max(100).optional(),
  baseTypeIncludes: z.array(z.string().max(80)).max(20).optional(),
  requiredMods: z.array(modRequirementSchema).max(8).optional(),
  forbiddenMods: z.array(z.string().max(200)).max(8).optional(),
  fractured: z.boolean().optional(),
})

export const currencyRequirementSchema = z.object({
  name: z.string().trim().min(1).max(80),
  category: z.enum(CURRENCY_CATEGORIES),
  qty: z.number().int().min(1).max(9999).optional(),
  optional: z.boolean().optional(),
})

export const branchSchema = z.object({
  condition: z.string().trim().min(1).max(200),
  match: itemMatcherSchema,
  nextStep: z.number().int().min(0).max(50),
  message: z.string().max(300).optional(),
})

export const recipeStepSchema = z.object({
  index: z.number().int().min(0).max(50),
  title: z.string().trim().min(1).max(120),
  description: z.string().trim().min(1).max(2000),
  currency: z.array(currencyRequirementSchema).max(20).default([]),
  expectedAfter: itemMatcherSchema.optional(),
  branches: z.array(branchSchema).max(8).optional(),
  stopLoss: z.string().max(400).optional(),
})

export const baseRequirementsSchema = z.object({
  ilvl: z.number().int().min(1).max(100),
  base: z.string().trim().min(1).max(120),          // "Gemini Bow" or "Obliterator/Warmonger Bow"
  hint: z.string().max(400).optional(),             // free-form base notes
  sockets: z.number().int().min(0).max(6).optional(),
  fractureFriendly: z.boolean().optional(),
})

// --- recipe create/update ---

export const recipeCreateSchema = z.object({
  title: z.string().trim().min(4).max(120),
  slot: z.enum(SLOTS),
  poeVersion: z.union([z.literal(1), z.literal(2)]),
  league: z.string().trim().min(1).max(60).default('all'),
  goal: z.string().trim().min(4).max(400),
  difficulty: z.number().int().min(1).max(5).default(3),
  estimatedCostMin: z.number().nonnegative().optional(),
  estimatedCostMax: z.number().nonnegative().optional(),
  costCurrency: z.enum(COST_CURRENCIES).default('divine'),
  baseRequirements: baseRequirementsSchema,
  steps: z.array(recipeStepSchema).min(1).max(50),
  pricingTips: z.array(z.string().max(400)).max(12).default([]),
  notes: z.array(z.string().max(400)).max(20).default([]),
})

export const recipeUpdateSchema = recipeCreateSchema.partial()

export const recipeListQuerySchema = z.object({
  slot: z.enum(SLOTS).optional(),
  poeVersion: z.coerce.number().int().refine((n) => n === 1 || n === 2).optional(),
  league: z.string().trim().max(60).optional(),
  status: z.enum(RECIPE_STATUSES).optional(),
  authorId: z.string().uuid().optional(),
  q: z.string().trim().min(1).max(120).optional(),
  sort: z.enum(['top', 'recent', 'trending']).default('top'),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(20),
})

export const voteSchema = z.object({
  value: z.union([z.literal(-1), z.literal(0), z.literal(1)]),
})

export const commentSchema = z.object({
  body: z.string().trim().min(1).max(2000),
})

export const reportSchema = z.object({
  reason: z.string().trim().min(3).max(300),
})

export const completionSchema = z.object({
  outcome: z.enum(COMPLETION_OUTCOMES),
  attempts: z.number().int().min(1).max(9999).optional(),
  costSpent: z.number().nonnegative().optional(),
  notes: z.string().trim().max(500).optional(),
})

export const modLookupSchema = z.object({
  baseType: z.string().trim().min(1).max(120),
  modText: z.string().trim().min(1).max(400),
})

// --- limits ---

export const MAX_RECIPES_PER_USER = 100
export const MAX_PENDING_COMMENTS_PER_MIN = 5
export const REPORT_FLAG_THRESHOLD = 3
