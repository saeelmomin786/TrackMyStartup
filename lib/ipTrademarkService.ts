import { supabase } from './supabase';
import { 
    IPTrademarkRecord, 
    IPTrademarkDocument, 
    CreateIPTrademarkRecordData, 
    UpdateIPTrademarkRecordData,
    IPType,
    IPStatus,
    IPDocumentType
} from '../types';

export class IPTrademarkService {
    // Get all IP/trademark records for a startup
    async getIPTrademarkRecords(startupId: number): Promise<IPTrademarkRecord[]> {
        try {
            const { data, error } = await supabase
                .from('ip_trademark_records')
                .select(`
                    *,
                    documents:ip_trademark_documents(*)
                `)
                .eq('startup_id', startupId)
                .order('created_at', { ascending: false });

            if (error) {
                console.error('Error fetching IP/trademark records:', error);
                throw error;
            }

            return data || [];
        } catch (error) {
            console.error('Error in getIPTrademarkRecords:', error);
            throw error;
        }
    }

    // Get a single IP/trademark record by ID
    async getIPTrademarkRecord(id: string): Promise<IPTrademarkRecord | null> {
        try {
            const { data, error } = await supabase
                .from('ip_trademark_records')
                .select(`
                    *,
                    documents:ip_trademark_documents(*)
                `)
                .eq('id', id)
                .single();

            if (error) {
                console.error('Error fetching IP/trademark record:', error);
                throw error;
            }

            return data;
        } catch (error) {
            console.error('Error in getIPTrademarkRecord:', error);
            throw error;
        }
    }

    // Create a new IP/trademark record
    async createIPTrademarkRecord(
        startupId: number, 
        recordData: CreateIPTrademarkRecordData
    ): Promise<IPTrademarkRecord> {
        try {
            const { data, error } = await supabase
                .from('ip_trademark_records')
                .insert({
                    startup_id: startupId,
                    type: recordData.type,
                    name: recordData.name,
                    description: recordData.description,
                    registration_number: recordData.registrationNumber,
                    registration_date: recordData.registrationDate,
                    expiry_date: recordData.expiryDate,
                    jurisdiction: recordData.jurisdiction,
                    status: recordData.status || IPStatus.Active,
                    owner: recordData.owner,
                    filing_date: recordData.filingDate,
                    priority_date: recordData.priorityDate,
                    renewal_date: recordData.renewalDate,
                    estimated_value: recordData.estimatedValue,
                    notes: recordData.notes
                })
                .select()
                .single();

            if (error) {
                console.error('Error creating IP/trademark record:', error);
                throw error;
            }

            return data;
        } catch (error) {
            console.error('Error in createIPTrademarkRecord:', error);
            throw error;
        }
    }

    // Update an existing IP/trademark record
    async updateIPTrademarkRecord(
        id: string, 
        recordData: UpdateIPTrademarkRecordData
    ): Promise<IPTrademarkRecord> {
        try {
            const updateData: any = {};
            
            if (recordData.type !== undefined) updateData.type = recordData.type;
            if (recordData.name !== undefined) updateData.name = recordData.name;
            if (recordData.description !== undefined) updateData.description = recordData.description;
            if (recordData.registrationNumber !== undefined) updateData.registration_number = recordData.registrationNumber;
            if (recordData.registrationDate !== undefined) updateData.registration_date = recordData.registrationDate;
            if (recordData.expiryDate !== undefined) updateData.expiry_date = recordData.expiryDate;
            if (recordData.jurisdiction !== undefined) updateData.jurisdiction = recordData.jurisdiction;
            if (recordData.status !== undefined) updateData.status = recordData.status;
            if (recordData.owner !== undefined) updateData.owner = recordData.owner;
            if (recordData.filingDate !== undefined) updateData.filing_date = recordData.filingDate;
            if (recordData.priorityDate !== undefined) updateData.priority_date = recordData.priorityDate;
            if (recordData.renewalDate !== undefined) updateData.renewal_date = recordData.renewalDate;
            if (recordData.estimatedValue !== undefined) updateData.estimated_value = recordData.estimatedValue;
            if (recordData.notes !== undefined) updateData.notes = recordData.notes;

            const { data, error } = await supabase
                .from('ip_trademark_records')
                .update(updateData)
                .eq('id', id)
                .select()
                .single();

            if (error) {
                console.error('Error updating IP/trademark record:', error);
                throw error;
            }

            return data;
        } catch (error) {
            console.error('Error in updateIPTrademarkRecord:', error);
            throw error;
        }
    }

    // Delete an IP/trademark record
    async deleteIPTrademarkRecord(id: string): Promise<boolean> {
        try {
            const { error } = await supabase
                .from('ip_trademark_records')
                .delete()
                .eq('id', id);

            if (error) {
                console.error('Error deleting IP/trademark record:', error);
                throw error;
            }

            return true;
        } catch (error) {
            console.error('Error in deleteIPTrademarkRecord:', error);
            throw error;
        }
    }

    // Upload a document for an IP/trademark record
    async uploadIPTrademarkDocument(
        ipRecordId: string,
        file: File,
        documentType: IPDocumentType,
        uploadedBy: string
    ): Promise<IPTrademarkDocument> {
        try {
            // Generate a unique filename
            const fileExt = file.name.split('.').pop();
            const fileName = `${ipRecordId}_${Date.now()}.${fileExt}`;
            const filePath = fileName; // Store directly in bucket root, no subfolder needed

            // Upload file to Supabase storage
            const { data: uploadData, error: uploadError } = await supabase.storage
                .from('ip-trademark-documents')
                .upload(filePath, file);

            if (uploadError) {
                console.error('Error uploading file:', uploadError);
                throw uploadError;
            }

            // Get the public URL
            const { data: urlData } = supabase.storage
                .from('ip-trademark-documents')
                .getPublicUrl(filePath);

            // Save document record to database
            const { data, error } = await supabase
                .from('ip_trademark_documents')
                .insert({
                    ip_record_id: ipRecordId,
                    file_name: file.name,
                    file_url: urlData.publicUrl,
                    file_type: file.type,
                    file_size: file.size,
                    document_type: documentType,
                    uploaded_by: uploadedBy
                })
                .select()
                .single();

            if (error) {
                console.error('Error saving document record:', error);
                throw error;
            }

            return data;
        } catch (error) {
            console.error('Error in uploadIPTrademarkDocument:', error);
            throw error;
        }
    }

    // Delete a document
    async deleteIPTrademarkDocument(id: string): Promise<boolean> {
        try {
            // First get the document to get the file path
            const { data: document, error: fetchError } = await supabase
                .from('ip_trademark_documents')
                .select('file_url')
                .eq('id', id)
                .single();

            if (fetchError) {
                console.error('Error fetching document:', fetchError);
                throw fetchError;
            }

            // Extract file path from URL
            const url = new URL(document.file_url);
            // Get just the filename (last part of the path)
            const filePath = url.pathname.split('/').pop();

            // Delete from storage
            const { error: storageError } = await supabase.storage
                .from('ip-trademark-documents')
                .remove([filePath]);

            if (storageError) {
                console.error('Error deleting file from storage:', storageError);
                // Continue with database deletion even if storage deletion fails
            }

            // Delete from database
            const { error } = await supabase
                .from('ip_trademark_documents')
                .delete()
                .eq('id', id);

            if (error) {
                console.error('Error deleting document record:', error);
                throw error;
            }

            return true;
        } catch (error) {
            console.error('Error in deleteIPTrademarkDocument:', error);
            throw error;
        }
    }

    // Get documents for an IP/trademark record
    async getIPTrademarkDocuments(ipRecordId: string): Promise<IPTrademarkDocument[]> {
        try {
            const { data, error } = await supabase
                .from('ip_trademark_documents')
                .select('*')
                .eq('ip_record_id', ipRecordId)
                .order('uploaded_at', { ascending: false });

            if (error) {
                console.error('Error fetching IP/trademark documents:', error);
                throw error;
            }

            return data || [];
        } catch (error) {
            console.error('Error in getIPTrademarkDocuments:', error);
            throw error;
        }
    }

    // Get IP/trademark statistics for a startup
    async getIPTrademarkStats(startupId: number): Promise<{
        total: number;
        byType: Record<string, number>;
        byStatus: Record<string, number>;
        totalValue: number;
    }> {
        try {
            const { data, error } = await supabase
                .from('ip_trademark_records')
                .select('type, status, estimated_value')
                .eq('startup_id', startupId);

            if (error) {
                console.error('Error fetching IP/trademark stats:', error);
                throw error;
            }

            const stats = {
                total: data?.length || 0,
                byType: {} as Record<string, number>,
                byStatus: {} as Record<string, number>,
                totalValue: 0
            };

            data?.forEach(record => {
                // Count by type
                stats.byType[record.type] = (stats.byType[record.type] || 0) + 1;
                
                // Count by status
                stats.byStatus[record.status] = (stats.byStatus[record.status] || 0) + 1;
                
                // Sum estimated values
                if (record.estimated_value) {
                    stats.totalValue += record.estimated_value;
                }
            });

            return stats;
        } catch (error) {
            console.error('Error in getIPTrademarkStats:', error);
            throw error;
        }
    }
}

// Export a singleton instance
export const ipTrademarkService = new IPTrademarkService();

