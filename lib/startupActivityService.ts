import { supabase } from './supabase';

export interface ActivityLogEntry {
  id: string;
  tableName: string;
  label: string;
  action: 'INSERT' | 'UPDATE' | 'DELETE';
  changedFields: string[];
  changedAt: string;
}

const TABLE_LABELS: Record<string, string> = {
  startups: 'Profile',
  subsidiaries: 'Profile — Subsidiary',
  international_ops: 'Profile — International Operations',
  financial_records: 'Financial Records',
  compliance_checks: 'Compliance',
  compliance_uploads: 'Compliance — Document',
  investment_records: 'Cap Table — Investment',
  mentor_equity_records: 'Cap Table — Mentor Equity',
  recognition_records: 'Cap Table — Recognition/Incubation',
  founders: 'Cap Table — Founder',
  fundraising_details: 'Cap Table — Fundraising',
  valuation_history: 'Cap Table — Valuation',
  equity_holdings: 'Cap Table — Equity Holding',
  startup_shares: 'Cap Table — Shares',
};

class StartupActivityService {
  private formatLabel(tableName: string): string {
    return TABLE_LABELS[tableName] || tableName;
  }

  private diffChangedFields(oldValues: any, newValues: any): string[] {
    if (!oldValues || !newValues) return [];
    const fields = new Set<string>([...Object.keys(oldValues), ...Object.keys(newValues)]);
    const changed: string[] = [];
    fields.forEach(key => {
      if (key === 'updated_at' || key === 'created_at') return;
      if (JSON.stringify(oldValues[key]) !== JSON.stringify(newValues[key])) {
        changed.push(key);
      }
    });
    return changed;
  }

  async getActivityLog(startupId: number, limit = 20): Promise<ActivityLogEntry[]> {
    const { data, error } = await supabase
      .from('profile_audit_log')
      .select('id, table_name, action, old_values, new_values, changed_at')
      .eq('startup_id', startupId)
      .order('changed_at', { ascending: false })
      .limit(limit);

    if (error || !data) return [];

    return data.map((row: any) => ({
      id: row.id,
      tableName: row.table_name,
      label: this.formatLabel(row.table_name),
      action: row.action,
      changedFields: row.action === 'UPDATE' ? this.diffChangedFields(row.old_values, row.new_values) : [],
      changedAt: row.changed_at,
    }));
  }

  async getUnreadCounts(facilitatorId: string, startupIds: number[]): Promise<Record<number, number>> {
    if (startupIds.length === 0) return {};

    const { data: lastSeenRows } = await supabase
      .from('facilitator_activity_last_seen')
      .select('startup_id, last_seen_at')
      .eq('facilitator_id', facilitatorId)
      .in('startup_id', startupIds);

    const lastSeenMap = new Map<number, string>();
    (lastSeenRows || []).forEach((r: any) => lastSeenMap.set(r.startup_id, r.last_seen_at));

    const { data: logRows } = await supabase
      .from('profile_audit_log')
      .select('startup_id, changed_at')
      .in('startup_id', startupIds);

    const counts: Record<number, number> = {};
    startupIds.forEach(id => { counts[id] = 0; });
    (logRows || []).forEach((row: any) => {
      const lastSeen = lastSeenMap.get(row.startup_id);
      if (!lastSeen || new Date(row.changed_at) > new Date(lastSeen)) {
        counts[row.startup_id] = (counts[row.startup_id] || 0) + 1;
      }
    });

    return counts;
  }

  async markSeen(facilitatorId: string, startupId: number): Promise<void> {
    await supabase
      .from('facilitator_activity_last_seen')
      .upsert(
        { facilitator_id: facilitatorId, startup_id: startupId, last_seen_at: new Date().toISOString() },
        { onConflict: 'facilitator_id,startup_id' }
      );
  }
}

export const startupActivityService = new StartupActivityService();
