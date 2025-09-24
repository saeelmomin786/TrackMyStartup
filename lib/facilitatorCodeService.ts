import { supabase } from './supabase';

export interface FacilitatorOpportunity {
  id: string;
  programName: string;
  description: string;
  deadline: string;
  posterUrl?: string;
  videoUrl?: string;
    facilitatorId: string;
  facilitatorCode: string;
  createdAt: string;
}

export interface FacilitatorApplication {
  id: string;
  startupId: number;
  startupName: string;
  opportunityId: string;
  status: 'pending' | 'accepted' | 'rejected';
  diligenceStatus: 'none' | 'requested' | 'approved';
  agreementUrl?: string;
  facilitatorCode: string;
  pitchDeckUrl?: string;
  pitchVideoUrl?: string;
  createdAt: string;
}

class FacilitatorCodeService {
  // Generate a unique facilitator code (max 10 characters)
  generateFacilitatorCode(): string {
    // Use a shorter format: FAC + 7 random characters = 10 total
    const random = Math.random().toString(36).substring(2, 9).toUpperCase();
    return `FAC${random}`;
  }

  // Get facilitator code for a user
  async getFacilitatorCodeByUserId(userId: string): Promise<string | null> {
    try {
        const { data, error } = await supabase
        .from('users')
        .select('facilitator_code')
        .eq('id', userId)
        .eq('role', 'Startup Facilitation Center')
        .single();
        
        if (error) {
        console.error('Error fetching facilitator code:', error);
            return null;
        }
        
      return data?.facilitator_code || null;
    } catch (error) {
      console.error('Error in getFacilitatorCodeByUserId:', error);
        return null;
    }
}

  // Get opportunities by facilitator code
  async getOpportunitiesByCode(facilitatorCode: string): Promise<FacilitatorOpportunity[]> {
    try {
        const { data, error } = await supabase
        .from('incubation_opportunities')
        .select('*')
        .eq('facilitator_code', facilitatorCode)
        .order('created_at', { ascending: false });
        
        if (error) {
        console.error('Error fetching opportunities by facilitator code:', error);
        return [];
      }

      console.log('Found opportunities for facilitator code:', facilitatorCode, data);

      return (data || []).map(item => ({
        id: item.id,
        programName: item.program_name,
        description: item.description,
        deadline: item.deadline,
        posterUrl: item.poster_url || undefined,
        videoUrl: item.video_url || undefined,
        facilitatorId: item.facilitator_id,
        facilitatorCode: item.facilitator_code || facilitatorCode,
        createdAt: item.created_at
      }));
    } catch (error) {
      console.error('Error in getOpportunitiesByCode:', error);
      return [];
    }
  }

  // Get applications by facilitator code
  async getApplicationsByCode(facilitatorCode: string): Promise<FacilitatorApplication[]> {
    try {
      // First get all opportunities for this facilitator code
      const { data: opportunities, error: oppError } = await supabase
        .from('incubation_opportunities')
        .select('id')
        .eq('facilitator_code', facilitatorCode);

      if (oppError) {
        console.error('Error fetching opportunities by facilitator code:', oppError);
        return [];
      }

      if (!opportunities || opportunities.length === 0) {
        console.log('No opportunities found for facilitator code:', facilitatorCode);
        return [];
      }

      const opportunityIds = opportunities.map(opp => opp.id);
      console.log('Found opportunities for facilitator code:', opportunityIds);

      // Then get applications for these opportunities
      const { data: applications, error: appError } = await supabase
        .from('opportunity_applications')
        .select(`
          *,
          incubation_opportunities!opportunity_applications_opportunity_id_fkey (
            program_name,
            facilitator_code
          ),
          startups!opportunity_applications_startup_id_fkey (
            name
          )
        `)
        .in('opportunity_id', opportunityIds)
        .order('created_at', { ascending: false });

      if (appError) {
        console.error('Error fetching applications:', appError);
        return [];
      }

      console.log('Raw applications data:', applications);

      // Get pitch materials for all startups
      const startupIds = [...new Set(applications?.map(app => app.startup_id) || [])];
      let pitchMaterials: { [key: number]: { pitchDeckUrl?: string; pitchVideoUrl?: string } } = {};
      
      if (startupIds.length > 0) {
        const { data: pitchData, error: pitchError } = await supabase
          .from('startup_pitch_materials')
          .select('startup_id, pitch_deck_url, pitch_video_url')
          .in('startup_id', startupIds);

        if (!pitchError && pitchData) {
          pitchMaterials = (pitchData || []).reduce((acc, item) => {
            acc[item.startup_id] = {
              pitchDeckUrl: item.pitch_deck_url || undefined,
              pitchVideoUrl: item.pitch_video_url || undefined
            };
            return acc;
          }, {} as { [key: number]: { pitchDeckUrl?: string; pitchVideoUrl?: string } });
        }
      }

      console.log('Pitch materials loaded:', pitchMaterials);

      if (appError) {
        console.error('Error fetching applications:', appError);
        return [];
      }

      console.log('Raw applications data:', applications);

      return (applications || []).map(item => {
        const startupPitchMaterials = pitchMaterials[item.startup_id] || {};
        return {
          id: item.id,
          startupId: item.startup_id,
          startupName: item.startups?.name || 'Unknown Startup',
          opportunityId: item.opportunity_id,
          status: item.status || 'pending',
          diligenceStatus: item.diligence_status || 'none',
          agreementUrl: item.agreement_url || undefined,
          pitchDeckUrl: item.pitch_deck_url || startupPitchMaterials.pitchDeckUrl || undefined,
          pitchVideoUrl: item.pitch_video_url || startupPitchMaterials.pitchVideoUrl || undefined,
          facilitatorCode: item.incubation_opportunities?.facilitator_code || facilitatorCode,
          createdAt: item.created_at
        };
      });
    } catch (error) {
      console.error('Error in getApplicationsByCode:', error);
      return [];
    }
  }

  // Create or update facilitator code for a user
  async createOrUpdateFacilitatorCode(userId: string): Promise<string | null> {
    try {
      console.log('🔍 Creating/updating facilitator code for user:', userId);
      
      // Check if user already has a facilitator code
      const existingCode = await this.getFacilitatorCodeByUserId(userId);
      if (existingCode) {
        console.log('✅ User already has facilitator code:', existingCode);
        return existingCode;
      }

      // Generate new facilitator code
      const newCode = this.generateFacilitatorCode();
      console.log('📝 Generated new facilitator code:', newCode, '(length:', newCode.length, ')');
      
      // Update user with new facilitator code
      const { error } = await supabase
        .from('users')
        .update({ facilitator_code: newCode })
        .eq('id', userId)
        .eq('role', 'Startup Facilitation Center');
        
        if (error) {
        console.error('❌ Error updating user with facilitator code:', error);
        console.error('❌ Code that failed:', newCode, '(length:', newCode.length, ')');
            return null;
        }
        
      console.log('✅ Successfully created facilitator code:', newCode);
      return newCode;
    } catch (error) {
      console.error('❌ Error in createOrUpdateFacilitatorCode:', error);
        return null;
    }
}

  // Check if facilitator has access to startup compliance
  async checkComplianceAccess(facilitatorCode: string, startupId: number): Promise<boolean> {
    try {
      console.log('🔍 Checking compliance access for facilitator code:', facilitatorCode, 'startup ID:', startupId);
      
      // First get all opportunities for this facilitator code
      const { data: opportunities, error: oppError } = await supabase
        .from('incubation_opportunities')
        .select('id')
        .eq('facilitator_code', facilitatorCode);

      if (oppError) {
        console.error('Error fetching opportunities for facilitator code:', oppError);
            return false;
        }
        
      if (!opportunities || opportunities.length === 0) {
        console.log('No opportunities found for facilitator code:', facilitatorCode);
        return false;
    }

      const opportunityIds = opportunities.map(opp => opp.id);
      console.log('Found opportunities for facilitator code:', opportunityIds);

      // Then check if any application from this startup to these opportunities has approved diligence
      const { data: applications, error: appError } = await supabase
        .from('opportunity_applications')
        .select('id, diligence_status')
        .eq('startup_id', startupId)
        .in('opportunity_id', opportunityIds)
        .eq('diligence_status', 'approved');

      if (appError) {
        console.error('Error checking applications for compliance access:', appError);
            return false;
        }
        
      const hasAccess = applications && applications.length > 0;
      console.log('Compliance access check result:', hasAccess, 'for startup:', startupId);
      
      return hasAccess;
    } catch (error) {
      console.error('Error in checkComplianceAccess:', error);
        return false;
    }
}
}

export const facilitatorCodeService = new FacilitatorCodeService();
