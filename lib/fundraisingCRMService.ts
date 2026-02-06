import { supabase } from './supabase';

// =====================================================
// TYPES
// =====================================================
export interface CRMColumn {
  id: string;
  startupId: number;
  label: string;
  color: string;
  position: number;
  createdAt: string;
  updatedAt: string;
}

export interface CRMInvestor {
  id: string;
  startupId: number;
  name: string;
  email?: string;
  amount?: number;
  pitchDeckUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CRMMetadata {
  id: string;
  startupId: number;
  itemId: string;
  itemType: 'investor' | 'program';
  status: string;
  priority: 'low' | 'medium' | 'high';
  approach?: string;
  firstContact?: string;
  notes?: string;
  tags?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface CRMAttachment {
  id: string;
  startupId: number;
  itemId: string;
  itemType: 'investor' | 'program';
  title: string;
  url: string;
  createdAt: string;
}

export interface AddCRMColumnData {
  label: string;
  color: string;
  position: number;
}

export interface AddCRMInvestorData {
  name: string;
  email?: string;
  amount?: number;
  pitchDeckUrl?: string;
}

export interface AddCRMMetadataData {
  itemId: string;
  itemType: 'investor' | 'program';
  status: string;
  priority: 'low' | 'medium' | 'high';
  approach?: string;
  firstContact?: string;
  notes?: string;
  tags?: string[];
}

export interface AddCRMAttachmentData {
  itemId: string;
  itemType: 'investor' | 'program';
  title: string;
  url: string;
}

class FundraisingCRMService {
  // =====================================================
  // CRM COLUMNS - CRUD OPERATIONS
  // =====================================================

  async getColumns(startupId: number): Promise<CRMColumn[]> {
    const { data, error } = await supabase
      .from('fundraising_crm_columns' as any)
      .select('*')
      .eq('startup_id', startupId)
      .order('position', { ascending: true });

    if (error) throw error;

    return (data || []).map((col: any) => ({
      id: col.id,
      startupId: col.startup_id,
      label: col.label,
      color: col.color,
      position: col.position,
      createdAt: col.created_at,
      updatedAt: col.updated_at
    }));
  }

  async addColumn(startupId: number, columnData: AddCRMColumnData): Promise<CRMColumn> {
    const { data, error } = await supabase
      .from('fundraising_crm_columns' as any)
      .insert({
        startup_id: startupId,
        label: columnData.label,
        color: columnData.color,
        position: columnData.position
      } as any)
      .select()
      .single();

    if (error) throw error;
    if (!data) throw new Error('No data returned from insert');

    const result = data as any;
    return {
      id: result.id,
      startupId: result.startup_id,
      label: result.label,
      color: result.color,
      position: result.position,
      createdAt: result.created_at,
      updatedAt: result.updated_at
    };
  }

  async updateColumn(id: string, columnData: Partial<AddCRMColumnData>): Promise<CRMColumn> {
    const updateData: any = {};
    if (columnData.label !== undefined) updateData.label = columnData.label;
    if (columnData.color !== undefined) updateData.color = columnData.color;
    if (columnData.position !== undefined) updateData.position = columnData.position;

    const { data, error } = await supabase
      .from('fundraising_crm_columns' as any)
      // @ts-ignore - Table doesn't exist in Supabase yet (will be created by migration)
      .update(updateData as any)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    if (!data) throw new Error('No data returned from update');

    const result = data as any;
    return {
      id: result.id,
      startupId: result.startup_id,
      label: result.label,
      color: result.color,
      position: result.position,
      createdAt: result.created_at,
      updatedAt: result.updated_at
    };
  }

  async deleteColumn(id: string): Promise<void> {
    const { error } = await supabase
      .from('fundraising_crm_columns' as any)
      .delete()
      .eq('id', id);

    if (error) throw error;
  }

  async updateColumnPositions(columns: { id: string; position: number }[]): Promise<void> {
    const promises = columns.map(col =>
      supabase
        .from('fundraising_crm_columns' as any)
        // @ts-ignore - Table doesn't exist in Supabase yet (will be created by migration)
        .update({ position: col.position } as any)
        .eq('id', col.id)
    );

    const results = await Promise.all(promises);
    const error = results.find(r => r.error)?.error;
    if (error) throw error;
  }

  // =====================================================
  // CRM INVESTORS - CRUD OPERATIONS
  // =====================================================

  async getInvestors(startupId: number): Promise<CRMInvestor[]> {
    const { data, error } = await supabase
      .from('fundraising_crm_investors' as any)
      .select('*')
      .eq('startup_id', startupId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return (data || []).map((inv: any) => ({
      id: inv.id,
      startupId: inv.startup_id,
      name: inv.name,
      email: inv.email,
      amount: inv.amount,
      pitchDeckUrl: inv.pitch_deck_url,
      createdAt: inv.created_at,
      updatedAt: inv.updated_at
    }));
  }

  async addInvestor(startupId: number, investorData: AddCRMInvestorData): Promise<CRMInvestor> {
    const { data, error } = await supabase
      .from('fundraising_crm_investors' as any)
      .insert({
        startup_id: startupId,
        name: investorData.name,
        email: investorData.email,
        amount: investorData.amount,
        pitch_deck_url: investorData.pitchDeckUrl
      } as any)
      .select()
      .single();

    if (error) throw error;
    if (!data) throw new Error('No data returned from insert');

    const result = data as any;
    return {
      id: result.id,
      startupId: result.startup_id,
      name: result.name,
      email: result.email,
      amount: result.amount,
      pitchDeckUrl: result.pitch_deck_url,
      createdAt: result.created_at,
      updatedAt: result.updated_at
    };
  }

  async updateInvestor(id: string, investorData: Partial<AddCRMInvestorData>): Promise<CRMInvestor> {
    const updateData: any = {};
    if (investorData.name !== undefined) updateData.name = investorData.name;
    if (investorData.email !== undefined) updateData.email = investorData.email;
    if (investorData.amount !== undefined) updateData.amount = investorData.amount;
    if (investorData.pitchDeckUrl !== undefined) updateData.pitch_deck_url = investorData.pitchDeckUrl;

    const { data, error } = await supabase
      .from('fundraising_crm_investors' as any)
      // @ts-ignore - Table doesn't exist in Supabase yet (will be created by migration)
      .update(updateData as any)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    if (!data) throw new Error('No data returned from update');

    const result = data as any;
    return {
      id: result.id,
      startupId: result.startup_id,
      name: result.name,
      email: result.email,
      amount: result.amount,
      pitchDeckUrl: result.pitch_deck_url,
      createdAt: result.created_at,
      updatedAt: result.updated_at
    };
  }

  async deleteInvestor(id: string): Promise<void> {
    const { error } = await supabase
      .from('fundraising_crm_investors' as any)
      .delete()
      .eq('id', id);

    if (error) throw error;
  }

  // =====================================================
  // CRM METADATA - CRUD OPERATIONS
  // =====================================================

  async getMetadata(startupId: number, itemId?: string, itemType?: 'investor' | 'program'): Promise<CRMMetadata[]> {
    let query = supabase
      .from('fundraising_crm_metadata' as any)
      .select('*')
      .eq('startup_id', startupId);

    if (itemId) query = query.eq('item_id', itemId);
    if (itemType) query = query.eq('item_type', itemType);

    const { data, error } = await query;

    if (error) throw error;

    return (data || []).map((meta: any) => ({
      id: meta.id,
      startupId: meta.startup_id,
      itemId: meta.item_id,
      itemType: meta.item_type,
      status: meta.status,
      priority: meta.priority,
      approach: meta.approach,
      firstContact: meta.first_contact,
      notes: meta.notes,
      tags: meta.tags || [],
      createdAt: meta.created_at,
      updatedAt: meta.updated_at
    }));
  }

  async upsertMetadata(startupId: number, metadataData: AddCRMMetadataData): Promise<CRMMetadata> {
    const { data, error } = await supabase
      .from('fundraising_crm_metadata' as any)
      .upsert({
        startup_id: startupId,
        item_id: metadataData.itemId,
        item_type: metadataData.itemType,
        status: metadataData.status,
        priority: metadataData.priority,
        approach: metadataData.approach,
        first_contact: metadataData.firstContact,
        notes: metadataData.notes,
        tags: metadataData.tags || []
      } as any, {
        onConflict: 'startup_id,item_id,item_type'
      })
      .select()
      .single();

    if (error) throw error;
    if (!data) throw new Error('No data returned from upsert');

    const result = data as any;
    return {
      id: result.id,
      startupId: result.startup_id,
      itemId: result.item_id,
      itemType: result.item_type,
      status: result.status,
      priority: result.priority,
      approach: result.approach,
      firstContact: result.first_contact,
      notes: result.notes,
      tags: result.tags || [],
      createdAt: result.created_at,
      updatedAt: result.updated_at
    };
  }

  async updateMetadata(itemId: string, itemType: 'investor' | 'program', metadataData: Partial<AddCRMMetadataData>): Promise<CRMMetadata> {
    const updateData: any = {};
    if (metadataData.status !== undefined) updateData.status = metadataData.status;
    if (metadataData.priority !== undefined) updateData.priority = metadataData.priority;
    if (metadataData.approach !== undefined) updateData.approach = metadataData.approach;
    if (metadataData.firstContact !== undefined) updateData.first_contact = metadataData.firstContact;
    if (metadataData.notes !== undefined) updateData.notes = metadataData.notes;
    if (metadataData.tags !== undefined) updateData.tags = metadataData.tags;

    const { data, error } = await supabase
      .from('fundraising_crm_metadata' as any)
      // @ts-ignore - Table doesn't exist in Supabase yet (will be created by migration)
      .update(updateData as any)
      .eq('item_id', itemId)
      .eq('item_type', itemType)
      .select()
      .single();

    if (error) throw error;
    if (!data) throw new Error('No data returned from update');

    const result = data as any;
    return {
      id: result.id,
      startupId: result.startup_id,
      itemId: result.item_id,
      itemType: result.item_type,
      status: result.status,
      priority: result.priority,
      approach: result.approach,
      firstContact: result.first_contact,
      notes: result.notes,
      tags: result.tags || [],
      createdAt: result.created_at,
      updatedAt: result.updated_at
    };
  }

  async deleteMetadata(itemId: string, itemType: 'investor' | 'program'): Promise<void> {
    const { error } = await supabase
      .from('fundraising_crm_metadata' as any)
      .delete()
      .eq('item_id', itemId)
      .eq('item_type', itemType);

    if (error) throw error;
  }

  // =====================================================
  // CRM ATTACHMENTS - CRUD OPERATIONS
  // =====================================================

  async getAttachments(startupId: number, itemId?: string, itemType?: 'investor' | 'program'): Promise<CRMAttachment[]> {
    let query = supabase
      .from('fundraising_crm_attachments' as any)
      .select('*')
      .eq('startup_id', startupId);

    if (itemId) query = query.eq('item_id', itemId);
    if (itemType) query = query.eq('item_type', itemType);

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) throw error;

    return (data || []).map((att: any) => ({
      id: att.id,
      startupId: att.startup_id,
      itemId: att.item_id,
      itemType: att.item_type,
      title: att.title,
      url: att.url,
      createdAt: att.created_at
    }));
  }

  async addAttachment(startupId: number, attachmentData: AddCRMAttachmentData): Promise<CRMAttachment> {
    const { data, error } = await supabase
      .from('fundraising_crm_attachments' as any)
      .insert({
        startup_id: startupId,
        item_id: attachmentData.itemId,
        item_type: attachmentData.itemType,
        title: attachmentData.title,
        url: attachmentData.url
      } as any)
      .select()
      .single();

    if (error) throw error;
    if (!data) throw new Error('No data returned from insert');

    const result = data as any;
    return {
      id: result.id,
      startupId: result.startup_id,
      itemId: result.item_id,
      itemType: result.item_type,
      title: result.title,
      url: result.url,
      createdAt: result.created_at
    };
  }

  async deleteAttachment(id: string): Promise<void> {
    const { error } = await supabase
      .from('fundraising_crm_attachments' as any)
      .delete()
      .eq('id', id);

    if (error) throw error;
  }

  // =====================================================
  // MIGRATION HELPER - Import from localStorage
  // =====================================================
  async migrateFromLocalStorage(startupId: number, localStorageData: {
    columns?: any[];
    investors?: any[];
    programsMetadata?: Record<string, any>;
  }): Promise<{ success: boolean; message: string }> {
    try {
      // Migrate columns
      if (localStorageData.columns && localStorageData.columns.length > 0) {
        const existingColumns = await this.getColumns(startupId);
        if (existingColumns.length === 0) {
          for (const col of localStorageData.columns) {
            await this.addColumn(startupId, {
              label: col.label,
              color: col.color,
              position: col.position || 0
            });
          }
        }
      }

      // Migrate investors
      if (localStorageData.investors && localStorageData.investors.length > 0) {
        for (const inv of localStorageData.investors) {
          const investorData: AddCRMInvestorData = {
            name: inv.name,
            email: inv.email,
            amount: inv.amount ? parseFloat(inv.amount) : undefined,
            pitchDeckUrl: inv.pitchDeckUrl
          };
          const savedInvestor = await this.addInvestor(startupId, investorData);

          // Migrate metadata
          const metadataData: AddCRMMetadataData = {
            itemId: savedInvestor.id,
            itemType: 'investor',
            status: inv.status || 'to_be_contacted',
            priority: inv.priority || 'medium',
            approach: inv.approach,
            firstContact: inv.firstContact,
            notes: inv.notes,
            tags: inv.tags || []
          };
          await this.upsertMetadata(startupId, metadataData);

          // Migrate attachments
          if (inv.attachments && inv.attachments.length > 0) {
            for (const att of inv.attachments) {
              await this.addAttachment(startupId, {
                itemId: savedInvestor.id,
                itemType: 'investor',
                title: att.title,
                url: att.url
              });
            }
          }
        }
      }

      // Migrate program metadata
      if (localStorageData.programsMetadata) {
        for (const [programId, metadata] of Object.entries(localStorageData.programsMetadata)) {
          if (metadata) {
            const metadataData: AddCRMMetadataData = {
              itemId: programId,
              itemType: 'program',
              status: (metadata as any).status || 'to_be_contacted',
              priority: (metadata as any).priority || 'medium',
              approach: (metadata as any).approach,
              firstContact: (metadata as any).firstContact,
              notes: (metadata as any).notes,
              tags: (metadata as any).tags || []
            };
            await this.upsertMetadata(startupId, metadataData);

            // Migrate attachments
            if ((metadata as any).attachments && (metadata as any).attachments.length > 0) {
              for (const att of (metadata as any).attachments) {
                await this.addAttachment(startupId, {
                  itemId: programId,
                  itemType: 'program',
                  title: att.title,
                  url: att.url
                });
              }
            }
          }
        }
      }

      return { success: true, message: 'Data migrated successfully from localStorage' };
    } catch (error) {
      console.error('Migration error:', error);
      return { success: false, message: `Migration failed: ${error}` };
    }
  }
}

export const fundraisingCRMService = new FundraisingCRMService();
