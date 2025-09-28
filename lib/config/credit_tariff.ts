/**
 * Credit costs for various actions in the application.
 * These values determine how many credits are spent/refunded for each action.
 */
export const CREDIT_COSTS = {
  /** Cost to create a new book */
  BOOK_CREATION: 300,
  
  /** Cost to generate an EPUB file */
  EPUB_GENERATION: 200,
  
  // Add other credit costs here as needed
} as const;

/**
 * Type for credit action types
 */
export type CreditAction = keyof typeof CREDIT_COSTS;

/**
 * Gets the credit cost for a specific action
 * @param action The credit action to get cost for
 * @returns The credit cost as a number
 * @throws Error if the action is not found in CREDIT_COSTS
 */
export function getCreditCost(action: CreditAction): number {
  const cost = CREDIT_COSTS[action];
  if (cost === undefined) {
    throw new Error(`No credit cost defined for action: ${action}`);
  }
  return cost;
}
