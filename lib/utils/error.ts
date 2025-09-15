/**
 * Type guard to check if a value is an Error-like object
 * @param value The value to check
 * @returns True if the value is an Error or has a message property
 */
export function isError(value: unknown): value is Error {
  return (
    value instanceof Error ||
    (typeof value === 'object' &&
      value !== null &&
      'message' in value &&
      typeof (value as { message: unknown }).message === 'string')
  );
}

/**
 * Creates a standard error response
 */
export function createErrorResponse(
  message: string,
  status: number = 500,
  code?: string,
  details?: unknown
) {
  return {
    success: false as const,
    error: {
      message,
      status,
      code,
      details,
      timestamp: new Date().toISOString(),
    },
  };
}

/**
 * Creates a standard success response
 */
export function createSuccessResponse<T = unknown>(data: T, meta?: unknown) {
  return {
    success: true as const,
    data,
    ...(meta && { meta }),
  };
}

/**
 * Type guard for API responses
 */
export function isApiResponse(
  response: unknown
): response is { success: boolean; data?: unknown; error?: unknown } {
  return (
    typeof response === 'object' &&
    response !== null &&
    'success' in response &&
    typeof response.success === 'boolean'
  );
}
