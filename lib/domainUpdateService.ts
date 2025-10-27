// Domain Update Service
// This service automatically updates startup sectors when domain information is available

import { supabase } from './supabase';

export class DomainUpdateService {
  // Update startup sectors based on domain information from applications and fundraising
  static async updateStartupSectors(startupIds?: number[]): Promise<void> {
    try {
      console.log('🔄 Starting automatic startup sector update...');
      
      // If no specific startup IDs provided, get all startups with default sectors
      let query = supabase
        .from('startups')
        .select('id, name, sector')
        .in('sector', ['Technology', 'Unknown']); // Only update startups with default sectors
      
      if (startupIds && startupIds.length > 0) {
        query = query.in('id', startupIds);
      }
      
      const { data: startups, error: startupError } = await query;
      
      if (startupError) {
        console.error('❌ Error fetching startups for sector update:', startupError);
        return;
      }
      
      if (!startups || startups.length === 0) {
        console.log('✅ No startups need sector updates');
        return;
      }
      
      console.log(`🔍 Found ${startups.length} startups that may need sector updates`);
      
      const startupIdsToCheck = startups.map(s => s.id);
      
      // 1. Get domain information from opportunity_applications
      const { data: applicationData, error: applicationError } = await supabase
        .from('opportunity_applications')
        .select('startup_id, domain, sector')
        .in('startup_id', startupIdsToCheck)
        .eq('status', 'accepted');
      
      if (applicationError) {
        console.error('❌ Error fetching application data:', applicationError);
      }
      
      // 2. Get domain information from fundraising_details
      const { data: fundraisingData, error: fundraisingError } = await supabase
        .from('fundraising_details')
        .select('startup_id, domain')
        .in('startup_id', startupIdsToCheck);
      
      if (fundraisingError) {
        console.error('❌ Error fetching fundraising data:', fundraisingError);
      }
      
      // Create domain map with priority: applications > fundraising
      const domainMap: { [key: number]: string } = {};
      
      // First priority: opportunity_applications
      if (applicationData) {
        applicationData.forEach(app => {
          if (app.domain && !domainMap[app.startup_id]) {
            domainMap[app.startup_id] = app.domain;
          }
        });
      }
      
      // Second priority: fundraising_details (only if not already set)
      if (fundraisingData) {
        fundraisingData.forEach(fund => {
          if (fund.domain && !domainMap[fund.startup_id]) {
            domainMap[fund.startup_id] = fund.domain;
          }
        });
      }
      
      console.log('🔍 Domain mapping created:', domainMap);
      
      // Update startup sectors
      const updatePromises = Object.entries(domainMap).map(async ([startupId, domain]) => {
        const startupIdNum = parseInt(startupId);
        const startup = startups.find(s => s.id === startupIdNum);
        
        if (!startup) return;
        
        // Only update if current sector is default
        if (startup.sector === 'Technology' || startup.sector === 'Unknown') {
          console.log(`🔄 Updating startup ${startup.name} (ID: ${startupId}) sector from "${startup.sector}" to "${domain}"`);
          
          const { error: updateError } = await supabase
            .from('startups')
            .update({ sector: domain })
            .eq('id', startupIdNum);
          
          if (updateError) {
            console.error(`❌ Error updating startup ${startupId} sector:`, updateError);
          } else {
            console.log(`✅ Successfully updated startup ${startup.name} sector to: ${domain}`);
          }
        } else {
          console.log(`⏭️ Skipping startup ${startup.name} - already has custom sector: ${startup.sector}`);
        }
      });
      
      await Promise.all(updatePromises);
      console.log('✅ Completed automatic startup sector updates');
      
    } catch (error) {
      console.error('❌ Error in updateStartupSectors:', error);
    }
  }
  
  // Update sectors for a specific startup
  static async updateStartupSector(startupId: number): Promise<void> {
    await this.updateStartupSectors([startupId]);
  }
  
  // Get the best available domain for a startup
  static async getStartupDomain(startupId: number): Promise<string | null> {
    try {
      // 1. Try opportunity_applications first
      const { data: applicationData, error: applicationError } = await supabase
        .from('opportunity_applications')
        .select('domain, sector')
        .eq('startup_id', startupId)
        .eq('status', 'accepted')
        .single();
      
      if (!applicationError && applicationData) {
        // Try domain field first, then fallback to sector field
        const domainValue = applicationData.domain || applicationData.sector;
        if (domainValue) {
          return domainValue;
        }
      }
      
      // 2. Try fundraising_details
      const { data: fundraisingData, error: fundraisingError } = await supabase
        .from('fundraising_details')
        .select('domain')
        .eq('startup_id', startupId)
        .single();
      
      if (!fundraisingError && fundraisingData?.domain) {
        return fundraisingData.domain;
      }
      
      // 3. Fallback to startup sector (if not default)
      const { data: startupData, error: startupError } = await supabase
        .from('startups')
        .select('sector')
        .eq('id', startupId)
        .single();
      
      if (!startupError && startupData?.sector && 
          startupData.sector !== 'Technology' && 
          startupData.sector !== 'Unknown') {
        return startupData.sector;
      }
      
      return null;
    } catch (error) {
      console.error('❌ Error getting startup domain:', error);
      return null;
    }
  }
}
