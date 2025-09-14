import { v4 as uuidv4 } from 'uuid';
import { CreditSystemError, InsufficientCreditsError, InvalidAmountError } from './credit.errors';

export const DEFAULT_BALANCE = 1000;
export const DEFAULT_LIMIT = 10;
export const MAX_LIMIT = 100;

export function logOperation(type: string, data: Record<string, unknown>) {
  console.log(`[${new Date().toISOString()}] [${type.toUpperCase()}]`, JSON.stringify(data, null, 2));
}

export function handleDbError(error: unknown, context: string): never {
  const errorId = uuidv4();
  console.error(`[${new Date().toISOString()}] [DB_ERROR] [${errorId}] ${context}`, error);
  
  if (error instanceof Error) {
    throw new CreditSystemError(
      `Database error in ${context}: ${error.message}`,
      'DATABASE_ERROR',
      { errorId, context, originalError: error }
    );
  }
  
  throw new CreditSystemError(
    `Unknown database error in ${context}`,
    'UNKNOWN_DATABASE_ERROR',
    { errorId, context }
  );
}

export function parseMetadata(metadata: unknown): Record<string, unknown> {
  if (typeof metadata === 'string') {
    try {
      return JSON.parse(metadata);
    } catch (error) {
      logOperation('parseMetadataError', { error });
      return {};
    }
  }
  return metadata as Record<string, unknown> || {};
}

export function validateAmount(amount: number): void {
  if (amount <= 0) {
    throw new InvalidAmountError(amount);
  }
}

export function ensureSufficientCredits(balance: number, amount: number): void {
  if (balance < amount) {
    throw new InsufficientCreditsError(balance, amount);
  }
}
