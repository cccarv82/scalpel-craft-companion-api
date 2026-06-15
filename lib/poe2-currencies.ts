// PoE2 crafting currency catalog. Sourced from in-game and curated PoE2 wiki +
// community notes. Used by the plugin's currency picker and recipe validation.
// Update as GGG patches add/remove currencies.

export type CurrencyCategory =
  | 'essence'
  | 'omen'
  | 'bone'
  | 'echo'
  | 'well'
  | 'recombinator'
  | 'rune'
  | 'standard'

export interface CurrencyEntry {
  name: string
  category: CurrencyCategory
  // optional grouping: e.g. "essence-greed" or "omen-sinistral"
  group?: string
  // free-form short description
  hint?: string
}

export const POE2_CURRENCIES: CurrencyEntry[] = [
  // --- standard ---
  { name: 'Orb of Transmutation', category: 'standard' },
  { name: 'Orb of Augmentation', category: 'standard' },
  { name: 'Perfect Orb of Augmentation', category: 'standard' },
  { name: 'Regal Orb', category: 'standard' },
  { name: 'Perfect Regal Orb', category: 'standard' },
  { name: 'Chaos Orb', category: 'standard' },
  { name: 'Exalted Orb', category: 'standard' },
  { name: 'Greater Exalted Orb', category: 'standard' },
  { name: 'Perfect Exalted Orb', category: 'standard' },
  { name: 'Divine Orb', category: 'standard' },
  { name: 'Orb of Annulment', category: 'standard' },
  { name: 'Mirror of Kalandra', category: 'standard' },
  { name: 'Vaal Orb', category: 'standard' },
  { name: 'Orb of Chance', category: 'standard' },
  { name: 'Orb of Alchemy', category: 'standard' },
  { name: 'Glassblower’s Bauble', category: 'standard' },
  { name: 'Artificer’s Orb', category: 'standard' },

  // --- essences (PoE2) ---
  { name: 'Essence of the Body', category: 'essence', group: 'life' },
  { name: 'Greater Essence of the Body', category: 'essence', group: 'life' },
  { name: 'Perfect Essence of the Body', category: 'essence', group: 'life' },
  { name: 'Essence of the Mind', category: 'essence', group: 'mana' },
  { name: 'Greater Essence of the Mind', category: 'essence', group: 'mana' },
  { name: 'Perfect Essence of the Mind', category: 'essence', group: 'mana' },
  { name: 'Essence of Greed', category: 'essence', group: 'life-prefix' },
  { name: 'Greater Essence of Greed', category: 'essence', group: 'life-prefix' },
  { name: 'Perfect Essence of Greed', category: 'essence', group: 'life-prefix' },
  { name: 'Essence of Haste', category: 'essence', group: 'attack-speed' },
  { name: 'Greater Essence of Haste', category: 'essence', group: 'attack-speed' },
  { name: 'Perfect Essence of Haste', category: 'essence', group: 'attack-speed' },
  { name: 'Essence of Battle', category: 'essence', group: 'flat-physical' },
  { name: 'Greater Essence of Battle', category: 'essence', group: 'flat-physical' },
  { name: 'Perfect Essence of Battle', category: 'essence', group: 'flat-physical' },
  { name: 'Essence of Seeking', category: 'essence', group: 'crit' },
  { name: 'Greater Essence of Seeking', category: 'essence', group: 'crit' },
  { name: 'Perfect Essence of Seeking', category: 'essence', group: 'crit' },
  { name: 'Essence of Electricity', category: 'essence', group: 'lightning' },
  { name: 'Greater Essence of Electricity', category: 'essence', group: 'lightning' },
  { name: 'Perfect Essence of Electricity', category: 'essence', group: 'lightning' },
  { name: 'Essence of Enhancement', category: 'essence', group: 'defenses-prefix' },
  { name: 'Greater Essence of Enhancement', category: 'essence', group: 'defenses-prefix' },
  { name: 'Perfect Essence of Enhancement', category: 'essence', group: 'defenses-prefix' },
  { name: 'Essence of Hysteria', category: 'essence', group: 'movement-speed' },
  { name: 'Greater Essence of Hysteria', category: 'essence', group: 'movement-speed' },
  { name: 'Perfect Essence of Hysteria', category: 'essence', group: 'movement-speed' },
  { name: 'Essence of Horror', category: 'essence', group: 'attack-speed-prefix' },
  { name: 'Greater Essence of Horror', category: 'essence', group: 'attack-speed-prefix' },
  { name: 'Perfect Essence of Horror', category: 'essence', group: 'attack-speed-prefix' },
  { name: 'Essence of Fortify', category: 'essence', group: 'defenses' },
  { name: 'Greater Essence of Fortify', category: 'essence', group: 'defenses' },
  { name: 'Perfect Essence of Fortify', category: 'essence', group: 'defenses' },
  { name: 'Essence of Abrasion', category: 'essence', group: 'flat-physical-prefix' },
  { name: 'Greater Essence of Abrasion', category: 'essence', group: 'flat-physical-prefix' },
  { name: 'Perfect Essence of Abrasion', category: 'essence', group: 'flat-physical-prefix' },
  { name: 'Essence of Abyss', category: 'essence', group: 'special' },
  { name: 'Greater Essence of Abyss', category: 'essence', group: 'special' },
  { name: 'Perfect Essence of Abyss', category: 'essence', group: 'special' },

  // --- omens (PoE2) ---
  // Sinistral = prefix-focused; Dextral = suffix-focused
  { name: 'Omen of Sinistral Exaltation', category: 'omen', hint: 'exalt hits prefix' },
  { name: 'Omen of Dextral Exaltation', category: 'omen', hint: 'exalt hits suffix' },
  { name: 'Omen of Greater Exaltation', category: 'omen', hint: 'exalt adds 2 mods' },
  { name: 'Omen of Catalysing Exaltation', category: 'omen', hint: 'exalt biased to matching catalyst' },
  { name: 'Omen of Homogenising Exaltation', category: 'omen', hint: 'exalt biased to same family' },
  { name: 'Omen of Sinistral Crystallisation', category: 'omen', hint: 'next currency removes prefix only' },
  { name: 'Omen of Dextral Crystallisation', category: 'omen', hint: 'next currency removes suffix only' },
  { name: 'Omen of Sinistral Necromancy', category: 'omen', hint: 'bone targets prefix' },
  { name: 'Omen of Dextral Necromancy', category: 'omen', hint: 'bone targets suffix' },
  { name: 'Omen of the Liege', category: 'omen', hint: 'next bone is fated good (no junk)' },
  { name: 'Omen of Whittling', category: 'omen' },
  { name: 'Omen of Sinistral Annulment', category: 'omen' },
  { name: 'Omen of Dextral Annulment', category: 'omen' },
  { name: 'Omen of Light', category: 'omen', hint: 'next annul targets desecrated/unveiled mod' },
  { name: 'Omen of Sinistral Coronation', category: 'omen' },
  { name: 'Omen of Dextral Coronation', category: 'omen' },
  { name: 'Omen of Homogenising Coronation', category: 'omen' },
  { name: 'Omen of Refreshment', category: 'omen' },

  // --- bones (desecration system) ---
  { name: 'Preserved Jawbone', category: 'bone', hint: 'item-level 65+' },
  { name: 'Preserved Rib', category: 'bone', hint: 'item-level 65+' },
  { name: 'Preserved Collarbone', category: 'bone', hint: 'item-level 65+' },
  { name: 'Ancient Jawbone', category: 'bone', hint: 'item-level 75+' },
  { name: 'Ancient Rib', category: 'bone', hint: 'item-level 75+' },
  { name: 'Ancient Collarbone', category: 'bone', hint: 'item-level 75+' },
  { name: 'Gnawed Jawbone', category: 'bone' },
  { name: 'Gnawed Rib', category: 'bone' },
  { name: 'Gnawed Collarbone', category: 'bone' },

  // --- echoes ---
  { name: 'Abyssal Echoes', category: 'echo', hint: 'reroll desecrated unveil choices' },

  // --- wells ---
  { name: 'The Well of Souls', category: 'well', hint: 'targeted suffix bias (e.g. attack speed)' },

  // --- recombinator ---
  { name: 'Recombinator', category: 'recombinator', hint: 'combine two rares' },

  // --- runes (socketed) ---
  { name: 'Iron Rune', category: 'rune' },
  { name: 'Greater Iron Rune', category: 'rune' },
  { name: 'Perfect Iron Rune', category: 'rune' },
  { name: 'Adept Rune', category: 'rune' },
  { name: 'Greater Adept Rune', category: 'rune' },
  { name: 'Perfect Adept Rune', category: 'rune' },
  { name: 'Body Rune', category: 'rune' },
  { name: 'Greater Body Rune', category: 'rune' },
  { name: 'Perfect Body Rune', category: 'rune' },
  { name: 'Mind Rune', category: 'rune' },
  { name: 'Greater Mind Rune', category: 'rune' },
  { name: 'Perfect Mind Rune', category: 'rune' },
]

export function findCurrency(name: string): CurrencyEntry | undefined {
  const needle = name.toLowerCase()
  return POE2_CURRENCIES.find((c) => c.name.toLowerCase() === needle)
}

export function currenciesByCategory(category: CurrencyCategory): CurrencyEntry[] {
  return POE2_CURRENCIES.filter((c) => c.category === category)
}
