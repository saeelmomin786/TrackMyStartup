import { supabase } from './supabase';

export interface IntakeCRMColumn {
  id: string;
  facilitator_id: string;
  label: string;
  color: string;
  position: number;
  created_at: string;
  updated_at: string;
}

export interface IntakeCRMStatusMap {
  id: string;
  facilitator_id: string;
  application_id: string;
  column_id: string;
  created_at: string;
  updated_at: string;
}

export interface IntakeCRMAttachment {
  id: string;
  facilitator_id: string;
  application_id: string;
  title: string;
  url: string;
  created_at: string;
}

class IntakeCRMService {
  // ============ COLUMNS ============
  async getColumns(facilitatorId: string): Promise<IntakeCRMColumn[]> {
    const { data, error } = await supabase
      .from('intake_crm_columns')
      .select('*')
      .eq('facilitator_id', facilitatorId)
      .order('position');

    if (error) {
      console.error('Error loading intake CRM columns:', error);
      return [];
    }
    return data || [];
  }

  async addColumn(
    facilitatorId: string,
    label: string,
    color: string,
    position: number
  ): Promise<IntakeCRMColumn | null> {
    const { data, error } = await supabase
      .from('intake_crm_columns')
      .insert({
        facilitator_id: facilitatorId,
        label,
        color,
        position
      })
      .select()
      .single();

    if (error) {
      console.error('Error adding intake CRM column:', error);
      return null;
    }
    return data;
  }

  async updateColumn(
    columnId: string,
    updates: Partial<Pick<IntakeCRMColumn, 'label' | 'color' | 'position'>>
  ): Promise<IntakeCRMColumn | null> {
    const { data, error } = await supabase
      .from('intake_crm_columns')
      .update(updates)
      .eq('id', columnId)
      .select()
      .single();

    if (error) {
      console.error('Error updating intake CRM column:', error);
      return null;
    }
    return data;
  }

  async deleteColumn(columnId: string): Promise<boolean> {
    const { error } = await supabase
      .from('intake_crm_columns')
      .delete()
      .eq('id', columnId);

    if (error) {
      console.error('Error deleting intake CRM column:', error);
      return false;
    }
    return true;
  }

  async reorderColumns(facilitatorId: string, columnIds: string[]): Promise<boolean> {
    // Batch update positions
    const updates = columnIds.map((id, index) => ({
      id,
      facilitator_id: facilitatorId,
      position: index
    }));

    const { error } = await supabase
      .from('intake_crm_columns')
      .upsert(updates);

    if (error) {
      console.error('Error reordering intake CRM columns:', error);
      return false;
    }
    return true;
  }

  // ============ STATUS MAP ============
  async getStatusMap(facilitatorId: string): Promise<Record<string, string>> {
    const { data, error } = await supabase
      .from('intake_crm_status_map')
      .select('application_id, column_id')
      .eq('facilitator_id', facilitatorId);

    if (error) {
      console.error('Error loading intake CRM status map:', error);
      return {};
    }

    const map: Record<string, string> = {};
    (data || []).forEach(row => {
      map[row.application_id] = row.column_id;
    });
    return map;
  }

  async setApplicationStatus(
    applicationId: string,
    customStatus: string
  ): Promise<boolean> {
    const { error } = await supabase
      .from('intake_crm_application_status')
      .upsert(
        {
          application_id: applicationId,
          custom_status: customStatus,
          updated_at: new Date().toISOString()
        } as any,
        { onConflict: 'application_id' }
      );

    if (error) {
      console.error('Error setting application status:', error);
      return false;
    }
    return true;
  }

  async moveApplicationToColumn(
    facilitatorId: string,
    applicationId: string,
    columnId: string
  ): Promise<boolean> {
    const { error } = await supabase
      .from('intake_crm_status_map')
      .upsert(
        {
          facilitator_id: facilitatorId,
          application_id: applicationId,
          column_id: columnId
        } as any,
        { onConflict: 'facilitator_id,application_id' }
      );

    if (error) {
      console.error('Error moving application to column:', error);
      return false;
    }
    return true;
  }



  // ============ ATTACHMENTS ============
  async getAttachments(facilitatorId: string): Promise<Record<string, IntakeCRMAttachment[]>> {
    const { data, error } = await supabase
      .from('intake_crm_attachments')
      .select('*')
      .eq('facilitator_id', facilitatorId)
      .order('created_at');

    if (error) {
      console.error('Error loading intake CRM attachments:', error);
      return {};
    }

    const map: Record<string, IntakeCRMAttachment[]> = {};
    (data || []).forEach(attachment => {
      if (!map[attachment.application_id]) {
        map[attachment.application_id] = [];
      }
      map[attachment.application_id].push(attachment);
    });
    return map;
  }

  async addAttachment(
    facilitatorId: string,
    applicationId: string,
    title: string,
    url: string
  ): Promise<IntakeCRMAttachment | null> {
    const { data, error } = await supabase
      .from('intake_crm_attachments')
      .insert({
        facilitator_id: facilitatorId,
        application_id: applicationId,
        title,
        url
      })
      .select()
      .single();

    if (error) {
      console.error('Error adding intake CRM attachment:', error);
      return null;
    }
    return data;
  }

  async deleteAttachment(attachmentId: string): Promise<boolean> {
    const { error } = await supabase
      .from('intake_crm_attachments')
      .delete()
      .eq('id', attachmentId);

    if (error) {
      console.error('Error deleting intake CRM attachment:', error);
      return false;
    }
    return true;
  }

  // ============ INITIALIZATION ============
  async initializeDefaultColumns(facilitatorId: string): Promise<IntakeCRMColumn[]> {
    const defaults = [
      { label: 'Pending Review', color: 'bg-yellow-50', position: 0 },
      { label: 'Approved', color: 'bg-green-50', position: 1 },
      { label: 'Rejected', color: 'bg-red-50', position: 2 }
    ];

    const { data, error } = await supabase
      .from('intake_crm_columns')
      .insert(defaults.map(d => ({
        facilitator_id: facilitatorId,
        label: d.label,
        color: d.color,
        position: d.position
      })))
      .select();

    if (error) {
      // 409 Conflict typically means columns already exist or RLS policy blocks insert
      // Either way, just return empty - parent will use defaults
      console.error('Error initializing default columns:', error);
      
      // If it's a 409 conflict, it might mean they already exist
      // Try to fetch existing columns instead
      if (error.code === '23505' || error.message?.includes('Conflict')) {
        console.log('Columns may already exist, attempting to fetch...');
        const existing = await this.getColumns(facilitatorId);
        if (existing.length > 0) {
          return existing;
        }
      }
      
      return [];
    }
    return data || [];
  }
}

export const intakeCRMService = new IntakeCRMService();
