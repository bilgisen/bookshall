// lib/services/credit/credit.utils.ts
import { v4 as uuidv4 } from 'uuid';
import { 
  CreditSystemError, 
  InsufficientCreditsError, 
  InvalidAmountError 
} from './credit.errors';

// Local error type checking
const isError = (error: unknown): error is Error => {
  return error instanceof Error;
};

// Error classes are now imported from './credit.errors.ts'

export const DEFAULT_BALANCE = 1000;
export const DEFAULT_LIMIT = 10;
export const MAX_LIMIT = 100;

export function isUniqueConstraintError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  
  // Check for PostgreSQL unique violation error code
  if ('code' in error && error.code === '23505') {
    return true;
  }
  
  // Check for common error messages
  const errorMessage = (error as Error).message || '';
  return (
    errorMessage.includes('duplicate key') ||
    errorMessage.includes('unique constraint') ||
    errorMessage.includes('already exists')
  );
}

export function logOperation(type: string, data: Record<string, unknown>) {
  console.log(`[${new Date().toISOString()}] [${type.toUpperCase()}]`, JSON.stringify(data, null, 2));
}

export function handleDbError<T>(error: unknown, context: string): T {
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

/**
 * Handles service-level errors consistently across the credit service
 * @param error The error that occurred
 * @param context Additional context for the error
 * @returns A new Error with proper formatting and context
 */
export function handleServiceError(error: unknown, context: string): Error {
  const errorId = uuidv4();
  const timestamp = new Date().toISOString();
  
  // Log the error with context
  console.error(`[${timestamp}] [SERVICE_ERROR:${errorId}] ${context}`, error);
  
  // Handle known error types
  if (error instanceof InsufficientCreditsError || 
      error instanceof InvalidAmountError ||
      error instanceof CreditSystemError) {
    return error; // Return as is, already properly formatted
  }
  
  // Handle generic errors
  if (isError(error)) {
    return new CreditSystemError(
      `${context}: ${error.message}`,
      'SERVICE_ERROR',
      { originalError: error, errorId }
    );
  }
  
  // Handle unknown error types
  return new CreditSystemError(
    `${context}: An unknown error occurred`,
    'UNKNOWN_ERROR',
    { errorId, originalError: error }
  );
}
