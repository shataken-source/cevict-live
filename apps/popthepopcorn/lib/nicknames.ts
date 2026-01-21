/**
 * PopThePopcorn Nickname System
 * Gen Z-friendly short names for quick reference
 * "Did you check The Kernel today?"
 */

export const nicknames = {
  primary: 'The Kernel', // Short, punchy, refers to the "seed" of a story
  alternatives: [
    'Pop', // Ultra-short
    'The Spill', // "Spilling the tea"
    'Butter', // Smooth, rich details
    'The Corn', // Direct reference
    'PTT', // Acronym
  ],
}

/**
 * Get random nickname for variety
 */
export function getRandomNickname(): string {
  const all = [nicknames.primary, ...nicknames.alternatives]
  return all[Math.floor(Math.random() * all.length)]
}

/**
 * Generate context-aware nickname usage
 */
export function generateNicknameUsage(context: 'alert' | 'casual' | 'formal'): string {
  switch (context) {
    case 'alert':
      return `Pop alert: Drama meter at ${Math.floor(Math.random() * 10) + 1}/10`
    case 'casual':
      return `Did you check ${getRandomNickname()} today?`
    case 'formal':
      return `PopThePopcorn (${nicknames.primary})`
    default:
      return nicknames.primary
  }
}
