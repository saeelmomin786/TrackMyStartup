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
  programName?: string;
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

  // Add a startup to facilitator's portfolio with program assignment
  async addStartupToPortfolioWithProgram(
      facilitatorId: string, 
      startupId: number, 
      recognitionRecordId: number,
      programName: string | null
    ): Promise<FacilitatorStartup | null> {
      try {
        // Add/update the facilitator-startup relationship with program_name
        const { data, error } = await supabase
          .from('facilitator_startups')
          .upsert({
            facilitator_id: facilitatorId,
            startup_id: startupId,
            recognition_record_id: recognitionRecordId,
            program_name: programName, // Store program_name here
            status: 'active'
          }, { onConflict: 'facilitator_id,startup_id' })
          .select()
          .single();

        if (error) {
          console.error('❌ Error adding startup to portfolio with program:', error);
          throw error;
        }

        console.log(`✅ Updated facilitator portfolio: startup ${startupId} with program: ${programName}`);

        // After adding to portfolio, update any pending opportunity_applications to 'accepted'
        // This links Intake Management with Track My Startups
        if (programName) {
          // Find opportunity application for this startup and program
          const { data: opportunities } = await supabase
            .from('incubation_opportunities')
            .select('id')
            .eq('facilitator_id', facilitatorId)
            .eq('program_name', programName);

          if (opportunities && opportunities.length > 0) {
            const oppId = opportunities[0].id;
            
            // Update application status to 'accepted'
            const { error: updateAppError } = await supabase
              .from('opportunity_applications')
              .update({ status: 'accepted' })
              .eq('startup_id', startupId)
              .eq('opportunity_id', oppId)
              .eq('status', 'pending'); // Only update if still pending

            if (updateAppError) {
              console.warn('⚠️ Could not update opportunity application:', updateAppError);
            } else {
              console.log(`✅ Marked opportunity application as accepted for startup ${startupId}`);
            }
          }
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
        console.error('Error in addStartupToPortfolioWithProgram:', error);
        return null;
      }
    }

  // Get all startups in facilitator's portfolio
  async getFacilitatorPortfolio(facilitatorId: string): Promise<StartupDashboardData[]> {
    try {
      // Get facilitator-startup relationships WITH program_name
      const { data: relationships, error: relError } = await supabase
        .from('facilitator_startups')
        .select(`
          startup_id,
          status,
          access_granted_at,
          program_name
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
      
      // Create a map of startup_id to program_name for quick lookup
      const programMap: { [key: number]: string | null } = {};
      relationships.forEach(rel => {
        programMap[rel.startup_id] = rel.program_name;
      });
      
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
        .select('startup_id, domain')
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
          // Use domain field (sector column was renamed to domain)
          if (app.domain && !domainMap[app.startup_id]) {
            domainMap[app.startup_id] = app.domain;
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

      // Note: cap_table, compliance_tasks, and financials tables are not used
      // Portfolio data comes from investment_records and incubation_programs
      
      let incubationData = [];

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
        const rel = relationships.find(r => r.startup_id === startup.id);
        const programName = programMap[startup.id] || undefined; // Get from facilitator_startups.program_name
        const startupIncubation = incubationData?.filter(c => c.startup_id === startup.id) || [];
        const startupInvestments = investmentData?.filter(c => c.startup_id === startup.id) || [];

        // Calculate current valuation from investment records (latest entry)
        const latestInvestment = startupInvestments[0]; // Already ordered by date DESC
        
        const currentValuation = latestInvestment?.post_money_valuation || 
                                startup.current_valuation || 0;

        const finalSector = domainMap[startup.id] || startup.sector || 'N/A';
        console.log(`🔍 Portfolio Debug - Startup ${startup.name} (ID: ${startup.id}): original sector=${startup.sector}, domain=${domainMap[startup.id]}, final sector=${finalSector}, program=${programName}`);
        
        return {
          id: startup.id,
          name: startup.name,
          sector: finalSector, // Use domain from applications, fallback to startup sector
          currentValuation,
          complianceStatus: 'Pending', // Default status since compliance_tasks table doesn't exist
          totalFunding: startup.total_funding || 0,
          totalRevenue: startup.total_revenue || 0,
          registrationDate: startup.registration_date || new Date().toISOString().split('T')[0],
          capTableData: [],
          complianceData: [],
          financialData: [],
          incubationData: startupIncubation,
          investmentData: startupInvestments,
          programName
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
