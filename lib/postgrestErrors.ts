/** True when PostgREST / Postgres reports a missing table or unknown relation. */
export function isMissingRelationError(error: unknown): boolean {
  if (error == null || typeof error !== 'object') return false;
  const e = error as {
    code?: string;
    message?: string;
    details?: string;
    status?: number;
    statusCode?: number;
  };
  const msg = `${e.message || ''} ${e.details || ''}`.toLowerCase();
  const status = e.status ?? e.statusCode;
  if (status === 404) {
    return (
      e.code === 'PGRST205' ||
      msg.includes('schema') ||
      msg.includes('relation') ||
      msg.includes('table') ||
      msg.includes('could not find') ||
      msg.includes('not found')
    );
  }
  return (
    e.code === '42P01' ||
    e.code === 'PGRST205' ||
    msg.includes('schema cache') ||
    msg.includes('could not find the table') ||
    msg.includes('404') ||
    (msg.includes('does not exist') && (msg.includes('relation') || msg.includes('table')))
  );
}
