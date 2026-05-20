export type AppErrorCode = 'NOT_FOUND' | 'UNAUTHORIZED' | 'DB_ERROR' | 'VALIDATION' | 'UNKNOWN';

export class AppError extends Error {
  constructor(
    message: string,
    public code: AppErrorCode,
    public originalError?: unknown,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export function handleSupabaseError(error: unknown, context: string): never {
  const message =
    error instanceof Error ? error.message : 'An unexpected error occurred';

  console.error(`[${context}]`, error);

  throw new AppError(
    `${context}: ${message}`,
    error instanceof Error && 'code' in error && (error as { code: string }).code === 'PGRST116'
      ? 'NOT_FOUND'
      : 'DB_ERROR',
    error,
  );
}
