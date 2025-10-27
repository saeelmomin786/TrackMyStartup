import { supabase } from './supabase';
import { DomainUpdateService } from './domainUpdateService';

export interface FacilitatorStartup {
  id: string;
  facilitatorId: string;
  startupId: number;
  recognitionRecordId: number; // Changed back to number for recognition_records table
  accessGrantedAt: string;
  status: 'active' | 'inactive' | 'revoked';
  createdAt: string;
  updatedAt: string;
}

export interface StartupDashboardData {
  id: number;
  name: string;
  sector: string;
  currentValuation: number;
  complianceStatus: string;
  totalFunding: number;
  totalRevenue: number;
  registrationDate: string;
  // Cap table data
  capTableData: any[];
  // Compliance data
  complianceData: any[];
  // Financial data
  financialData: any[];
  // Incubation data
  incubationData: any[];
}

class FacilitatorStartupService {
  // Add a startup to facilitator's portfolio
  async addStartupToPortfolio(
    facilitatorId: string, 
    startupId: number, 
    recognitionRecordId: number // Changed back to number for recognition_records table
  ): Promise<FacilitatorStartup | null> {
    try {
      const { data, error } = await supabase
        .from('facilitator_startups')
        .upsert({
          facilitator_id: facilitatorId,
          startup_id: startupId,
          recognition_record_id: recognitionRecordId,
          status: 'active'
        }, { onConflict: 'facilitator_id,startup_id' })
        .select()
        .single();

      if (error) {
        console.error('❌ Error adding startup to portfolio:', error);
        console.error('❌ Error details:', {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint
        });
        console.error('🔍 Data being inserted:', {
          facilitator_id: facilitatorId,
          startup_id: startupId,
          recognition_record_id: recognitionRecordId,
          status: 'active'
        });
        throw error;
      }

      return {
        id: data.id,
        facilitatorId: data.facilitator_id,
        startupId: data.startup_id,
        recognitionRecordId: data.recognition_record_id,
        accessGrantedAt: data.access_granted_at,
        status: data.status,
        createdAt: data.created_at,
        updatedAt: data.updated_at
      };
    } catch (error) {
      console.error('Error in addStartupToPortfolio:', error);
      return null;
    }
  }

  // Get all startups in facilitator's portfolio
  async getFacilitatorPortfolio(facilitatorId: string): Promise<StartupDashboardData[]> {
    try {
      // Get facilitator-startup relationships
      const { data: relationships, error: relError } = await supabase
        .from('facilitator_startups')
        .select(`
          startup_id,
          status,
          access_granted_at
        `)
        .eq('facilitator_id', facilitatorId)
        .eq('status', 'active');

      if (relError) {
        console.error('Error fetching facilitator relationships:', relError);
        throw relError;
      }

      if (!relationships || relationships.length === 0) {
        return [];
      }

      const startupIds = relationships.map(r => r.startup_id);
      
      // Fetch startup data with real-time information
      const { data: startups, error: startupError } = await supabase
        .from('startups')
        .select(`
          id,
          name,
          sector,
          current_valuation,
          compliance_status,
          total_funding,
          total_revenue,
          registration_date
        `)
        .in('id', startupIds);

      if (startupError) {
        console.error('Error fetching startup data:', startupError);
        throw startupError;
      }

      // Fetch domain information from opportunity applications for these startups
      const { data: applicationData, error: applicationError } = await supabase
        .from('opportunity_applications')
        .select(`
          startup_id,
          domain,
          sector
        `)
        .in('startup_id', startupIds)
        .eq('status', 'accepted'); // Only get accepted applications

      if (applicationError) {
        console.error('Error fetching application data:', applicationError);
        // Continue without domain data if there's an error
      }

      // Create a map of startup_id to domain for quick lookup
      const domainMap: { [key: number]: string } = {};
      
      // 1. First, try to get domain data from opportunity_applications (most recent)
      if (applicationData) {
        console.log('🔍 Portfolio Debug - Application data fetched:', applicationData);
        applicationData.forEach(app => {
          // Try domain field first, then fallback to sector field
          const domainValue = app.domain || app.sector;
          if (domainValue && !domainMap[app.startup_id]) {
            domainMap[app.startup_id] = domainValue;
          }
        });
        console.log('🔍 Portfolio Debug - Domain map from applications:', domainMap);
      } else {
        console.log('🔍 Portfolio Debug - No application data found');
      }

      // 2. For startups without application data, check fundraising data
      const startupsWithoutData = startupIds.filter(id => !domainMap[id]);
      if (startupsWithoutData.length > 0) {
        console.log('🔍 Portfolio Debug - Checking fundraising data for startups without application data:', startupsWithoutData);
        
        // Check fundraising_details table for domain information
        const { data: fundraisingData, error: fundraisingError } = await supabase
          .from('fundraising_details')
          .select('startup_id, domain')
          .in('startup_id', startupsWithoutData);

        if (!fundraisingError && fundraisingData) {
          fundraisingData.forEach(fund => {
            if (fund.domain && !domainMap[fund.startup_id]) {
              domainMap[fund.startup_id] = fund.domain;
            }
          });
          console.log('🔍 Portfolio Debug - Domain map after fundraising check:', domainMap);
        }
      }

      // Fetch investment records for current valuation (using existing table)
      const { data: investmentData, error: investmentError } = await supabase
        .from('investment_records')
        .select('*')
        .in('startup_id', startupIds)
        .order('date', { ascending: false });

      // Initialize empty arrays for missing tables
      let capTableData = [];
      let complianceData = [];
      let financialData = [];
      let incubationData = [];

      // Try to fetch cap table data (if table exists)
      try {
        const { data: capData, error: capError } = await supabase
          .from('cap_table')
          .select('*')
          .in('startup_id', startupIds)
          .order('created_at', { ascending: false });
        
        if (!capError) {
          capTableData = capData || [];
        }
      } catch (err) {
        console.warn('Cap table not available, using investment records instead');
      }

      // Try to fetch compliance data (if table exists)
      try {
        const { data: complianceDataResult, error: complianceError } = await supabase
          .from('compliance_tasks')
          .select('*')
          .in('startup_id', startupIds);
        
        if (!complianceError) {
          complianceData = complianceDataResult || [];
        }
      } catch (err) {
        console.warn('Compliance tasks table not available');
      }

      // Try to fetch financial data (if table exists)
      try {
        const { data: financialDataResult, error: financialError } = await supabase
          .from('financials')
          .select('*')
          .in('startup_id', startupIds);
        
        if (!financialError) {
          financialData = financialDataResult || [];
        }
      } catch (err) {
        console.warn('Financials table not available');
      }

      // Try to fetch incubation programs data (if table exists)
      try {
        const { data: incubationDataResult, error: incubationError } = await supabase
          .from('incubation_programs')
          .select('*')
          .in('startup_id', startupIds);
        
        if (!incubationError) {
          incubationData = incubationDataResult || [];
        }
      } catch (err) {
        console.warn('Incubation programs table not available');
      }

      // Log errors but don't fail the entire operation
      if (investmentError) console.warn('Warning: Could not fetch investment data:', investmentError);

      // Map the data
      console.log('🔍 Portfolio Debug - Startups fetched:', startups);
      console.log('🔍 Portfolio Debug - Final domain map:', domainMap);
      
      const mappedStartups = (startups || []).map(startup => {
        const startupCapTable = capTableData?.filter(c => c.startup_id === startup.id) || [];
        const startupCompliance = complianceData?.filter(c => c.startup_id === startup.id) || [];
        const startupFinancial = financialData?.filter(c => c.startup_id === startup.id) || [];
        const startupIncubation = incubationData?.filter(c => c.startup_id === startup.id) || [];
        const startupInvestments = investmentData?.filter(c => c.startup_id === startup.id) || [];

        // Calculate current valuation from investment records (latest entry)
        const latestInvestment = startupInvestments[0]; // Already ordered by date DESC
        const latestCapTableEntry = startupCapTable[0]; // Fallback to cap table if available
        
        const currentValuation = latestInvestment?.post_money_valuation || 
                                latestCapTableEntry?.post_money_valuation || 
                                startup.current_valuation || 0;

        // Calculate overall compliance status
        const complianceStatus = this.calculateOverallComplianceStatus(startupCompliance);

        const finalSector = domainMap[startup.id] || startup.sector || 'N/A';
        console.log(`🔍 Portfolio Debug - Startup ${startup.name} (ID: ${startup.id}): original sector=${startup.sector}, domain=${domainMap[startup.id]}, final sector=${finalSector}`);
        
        return {
          id: startup.id,
          name: startup.name,
          sector: finalSector, // Use domain from applications, fallback to startup sector
          currentValuation,
          complianceStatus,
          totalFunding: startup.total_funding || 0,
          totalRevenue: startup.total_revenue || 0,
          registrationDate: startup.registration_date || new Date().toISOString().split('T')[0],
          capTableData: startupCapTable,
          complianceData: startupCompliance,
          financialData: startupFinancial,
          incubationData: startupIncubation,
          investmentData: startupInvestments
        };
      });
      
      console.log('🔍 Portfolio Debug - Final mapped startups:', mappedStartups);
      
      // Automatically update startup sectors in background if needed
      DomainUpdateService.updateStartupSectors(startupIds).catch(error => {
        console.error('Background sector update failed:', error);
      });
      
      return mappedStartups;
    } catch (error) {
      console.error('Error in getFacilitatorPortfolio:', error);
      return [];
    }
  }

  // Calculate overall compliance status
  private calculateOverallComplianceStatus(complianceTasks: any[]): string {
    if (!complianceTasks || complianceTasks.length === 0) {
      return 'Pending';
    }

    const totalTasks = complianceTasks.length;
    const completedTasks = complianceTasks.filter(task => task.status === 'completed').length;
    const pendingTasks = complianceTasks.filter(task => task.status === 'pending').length;
    const overdueTasks = complianceTasks.filter(task => 
      task.status === 'pending' && task.due_date && new Date(task.due_date) < new Date()
    ).length;

    if (overdueTasks > 0) {
      return 'Non-Compliant';
    } else if (completedTasks === totalTasks) {
      return 'Compliant';
    } else if (pendingTasks > 0) {
      return 'Pending';
    } else {
      return 'Pending';
    }
  }

  // Check if facilitator has access to a specific startup
  async hasAccessToStartup(facilitatorId: string, startupId: number): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('facilitator_startups')
        .select('id')
        .eq('facilitator_id', facilitatorId)
        .eq('startup_id', startupId)
        .eq('status', 'active')
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return false; // No access
        }
        throw error;
      }

      return !!data;
    } catch (error) {
      console.error('Error checking facilitator access:', error);
      return false;
    }
  }

  // Revoke access to a startup
  async revokeAccess(facilitatorId: string, startupId: number): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('facilitator_startups')
        .update({ status: 'revoked' })
        .eq('facilitator_id', facilitatorId)
        .eq('startup_id', startupId);

      if (error) {
        console.error('Error revoking access:', error);
        throw error;
      }

      return true;
    } catch (error) {
      console.error('Error in revokeAccess:', error);
      return false;
    }
  }
}

export const facilitatorStartupService = new FacilitatorStartupService();
