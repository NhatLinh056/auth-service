/** Prisma's pg adapter may surface serialization failures directly on commit. */
export function isTransactionConflict(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const failure = error as { code?: string; cause?: { originalCode?: string } };
  return failure.code === 'P2034' || ['40001', '40P01'].includes(failure.cause?.originalCode || '');
}
