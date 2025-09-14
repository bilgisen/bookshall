export class CreditSystemError extends Error {
  constructor(
    message: string, 
    public readonly code: string, 
    public readonly details?: unknown
  ) {
    super(message);
    this.name = 'CreditSystemError';
  }
}

export class InsufficientCreditsError extends CreditSystemError {
  constructor(available: number, required: number) {
    super(
      `Insufficient credits. Available: ${available}, Required: ${required}`,
      'INSUFFICIENT_CREDITS',
      { available, required }
    );
  }
}

export class InvalidAmountError extends CreditSystemError {
  constructor(amount: number) {
    super(
      `Invalid credit amount: ${amount}. Amount must be greater than zero`,
      'INVALID_AMOUNT',
      { amount }
    );
  }
}
