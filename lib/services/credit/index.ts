// Export main service
export * from './credit.service';

// Export types
export type {
  CreditOperationResult,
  TransactionHistoryResult,
  CreditSummary,
  BalanceWithDetails,
  TransactionMetadata
} from './credit.types';

// Export errors
export {
  CreditSystemError,
  InsufficientCreditsError,
  InvalidAmountError
} from './credit.errors';

// Export constants
export { DEFAULT_BALANCE, DEFAULT_LIMIT, MAX_LIMIT } from './credit.utils';
