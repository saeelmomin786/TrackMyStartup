import { supabase } from './supabase';
export type NetworkKind = 'service_provider' | 'partner';

export type FacilitatorNetworkContactRow = {
  id: string;
  facilitator_id: string;
  network_kind: NetworkKind;
  name: string;
  contact_number: string;
  email: string;
  service_type: string;
  created_at: string;
  updated_at: string;
};

export type FacilitatorNetworkAssignmentRow = {
  id: string;
  facilitator_id: string;
  startup_id: number;
  contact_id: string;
  created_at: string;
};

export type StartupNetworkLink = {
  facilitator_id: string;
  startup_id: number;
  contact_id: string;
  network_kind: NetworkKind;
  name: string;
  contact_number: string;
  email: string;
  service_type: string;
};

class FacilitatorNetworkService {
  async listContacts(facilitatorId: string): Promise<FacilitatorNetworkContactRow[]> {
    const { data, error } = await supabase
      .from('facilitator_network_contacts')
      .select('*')
      .eq('facilitator_id', facilitatorId)
      .order('created_at', { ascending: false });
    if (error) {
      console.error('facilitatorNetworkService.listContacts', error);
      return [];
    }
    return (data || []) as FacilitatorNetworkContactRow[];
  }

  async listAssignments(facilitatorId: string): Promise<FacilitatorNetworkAssignmentRow[]> {
    const { data, error } = await supabase
      .from('facilitator_network_assignments')
      .select('*')
      .eq('facilitator_id', facilitatorId)
      .order('created_at', { ascending: false });
    if (error) {
      console.error('facilitatorNetworkService.listAssignments', error);
      return [];
    }
    return (data || []) as FacilitatorNetworkAssignmentRow[];
  }

  /** For startup dashboard: all network links visible to this startup (RLS). */
  async listLinksForStartup(startupId: number): Promise<StartupNetworkLink[]> {
    const { data: assigns, error: aErr } = await supabase
      .from('facilitator_network_assignments')
      .select('id, facilitator_id, startup_id, contact_id')
      .eq('startup_id', startupId);
    if (aErr) {
      console.error('facilitatorNetworkService.listLinksForStartup', aErr);
      return [];
    }
    if (!assigns?.length) return [];

    const contactIds = [...new Set(assigns.map((r: any) => r.contact_id).filter(Boolean))];
    const { data: contacts, error: cErr } = await supabase
      .from('facilitator_network_contacts')
      .select('id, network_kind, name, contact_number, email, service_type')
      .in('id', contactIds);
    if (cErr) {
      console.error('facilitatorNetworkService.listLinksForStartup contacts', cErr);
      return [];
    }
    const byId = new Map((contacts || []).map((c: any) => [c.id, c]));
    return assigns.map((a: any) => {
      const c = byId.get(a.contact_id);
      return {
        facilitator_id: a.facilitator_id,
        startup_id: a.startup_id,
        contact_id: a.contact_id,
        network_kind: (c?.network_kind || 'service_provider') as NetworkKind,
        name: c?.name || '',
        contact_number: c?.contact_number || '',
        email: c?.email || '',
        service_type: c?.service_type || '',
      };
    });
  }

  async createContact(
    facilitatorId: string,
    row: { network_kind: NetworkKind; name: string; contactNumber: string; email: string; serviceType: string }
  ): Promise<FacilitatorNetworkContactRow | null> {
    const { data, error } = await supabase
      .from('facilitator_network_contacts')
      .insert({
        facilitator_id: facilitatorId,
        network_kind: row.network_kind,
        name: row.name,
        contact_number: row.contactNumber,
        email: row.email,
        service_type: row.serviceType,
      })
      .select('*')
      .single();
    if (error) {
      console.error('facilitatorNetworkService.createContact', error);
      return null;
    }
    return data as FacilitatorNetworkContactRow;
  }

  async createContactsBulk(
    facilitatorId: string,
    network_kind: NetworkKind,
    rows: { name: string; contactNumber: string; email: string; serviceType: string }[]
  ): Promise<FacilitatorNetworkContactRow[]> {
    if (!rows.length) return [];
    const payload = rows.map((r) => ({
      facilitator_id: facilitatorId,
      network_kind,
      name: r.name,
      contact_number: r.contactNumber,
      email: r.email,
      service_type: r.serviceType,
    }));
    const { data, error } = await supabase.from('facilitator_network_contacts').insert(payload).select('*');
    if (error) {
      console.error('facilitatorNetworkService.createContactsBulk', error);
      return [];
    }
    return (data || []) as FacilitatorNetworkContactRow[];
  }

  async deleteContact(contactId: string): Promise<boolean> {
    const { error } = await supabase.from('facilitator_network_contacts').delete().eq('id', contactId);
    if (error) {
      console.error('facilitatorNetworkService.deleteContact', error);
      return false;
    }
    return true;
  }

  async createAssignments(
    facilitatorId: string,
    pairs: { startup_id: number; contact_id: string }[]
  ): Promise<{ inserted: number; skipped: number }> {
    if (!pairs.length) return { inserted: 0, skipped: 0 };
    let inserted = 0;
    for (const p of pairs) {
      const { error } = await supabase.from('facilitator_network_assignments').insert({
        facilitator_id: facilitatorId,
        startup_id: p.startup_id,
        contact_id: p.contact_id,
      });
      if (!error) inserted++;
      else if ((error as { code?: string }).code !== '23505') {
        console.error('facilitatorNetworkService.createAssignments', error);
      }
    }
    return { inserted, skipped: pairs.length - inserted };
  }
}

export const facilitatorNetworkService = new FacilitatorNetworkService();
