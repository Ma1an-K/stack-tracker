import { supabase } from '@/integrations/supabase/client';
import { SessionPaymentWithDetails } from '@/types/database';

/**
 * Load payments for a set of sessions, grouped by session id.
 *
 * Fetched separately from the sessions query (not embedded) so that a missing
 * `session_payments` table — e.g. before the migration is applied — degrades
 * to "no payments" instead of breaking session loading.
 */
export async function fetchPaymentsForSessions(
  sessionIds: string[]
): Promise<Map<string, SessionPaymentWithDetails[]>> {
  const byId = new Map<string, SessionPaymentWithDetails[]>();
  if (sessionIds.length === 0) return byId;

  const { data, error } = await supabase
    .from('session_payments')
    .select(`
      *,
      from_player:players!session_payments_from_player_id_fkey (*),
      to_player:players!session_payments_to_player_id_fkey (*)
    `)
    .in('session_id', sessionIds)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching session payments (treating as none):', error);
    return byId;
  }

  for (const row of (data ?? []) as unknown as SessionPaymentWithDetails[]) {
    const list = byId.get(row.session_id) ?? [];
    list.push(row);
    byId.set(row.session_id, list);
  }
  return byId;
}

export function attachPayments<T extends { id: string }>(
  sessions: T[],
  byId: Map<string, SessionPaymentWithDetails[]>
): (T & { session_payments: SessionPaymentWithDetails[] })[] {
  return sessions.map(s => ({ ...s, session_payments: byId.get(s.id) ?? [] }));
}
