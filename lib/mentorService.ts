import { supabase } from './supabase';
import { Startup } from '../types';

export interface MentorRequest {
  id: number;
  mentor_id: string;
  requester_id: string;
  requester_type: 'Startup' | 'Investor';
  startup_id?: number;
  status: 'pending' | 'negotiating' | 'accepted' | 'rejected' | 'cancelled';
  requested_at: string;
  responded_at?: string;
  message?: string;
  requester_name?: string;
  requester_email?: string;
  startup_name?: string;
  startup_website?: string;
  startup_sector?: string;
  fee_type?: string;
  fee_amount?: number;
  fee_currency?: string;
  // New fields for negotiation
  proposed_fee_amount?: number;
  proposed_equity_amount?: number;
  proposed_esop_percentage?: number;
  negotiated_fee_amount?: number;
  negotiated_equity_amount?: number;
  negotiated_esop_percentage?: number;
}

export interface MentorAssignment {
  id: number;
  mentor_id: string;
  startup_id: number;
  status: 'active' | 'completed' | 'cancelled';
  assigned_at: string;
  completed_at?: string;
  fee_amount: number;
  fee_currency: string;
  esop_percentage: number;
  esop_value: number;
  notes?: string;
  startup?: Startup;
}

export interface FoundedStartupWithNotes extends Startup {
  email_id?: string;
  website?: string;
  notes?: string;
}

export interface MentorMetrics {
  requestsReceived: number;
  startupsMentoring: number;
  startupsMentoredPreviously: number;
  verifiedStartupsMentored: number; // Only startups that are registered users on TMS
  startupsFounded: number;
  totalEarningsFees: number;
  totalEarningsESOP: number;
  activeAssignments: MentorAssignment[];
  completedAssignments: MentorAssignment[];
  pendingRequests: MentorRequest[];
  foundedStartups: FoundedStartupWithNotes[];
}

class MentorService {
  // Get all metrics for a mentor
  async getMentorMetrics(mentorId: string): Promise<MentorMetrics> {
    try {
      // Get actual auth user ID (mentorId might be profile ID from user_profiles)
      let actualMentorId = mentorId;
      
      // Get current auth user ID
      const { data: { user: authUser } } = await supabase.auth.getUser();
      
      // If mentorId matches current auth user ID, use it directly
      if (authUser && mentorId === authUser.id) {
        actualMentorId = authUser.id;
      } else {
        // Check if mentorId is a profile ID (from user_profiles) and convert to auth_user_id
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('auth_user_id')
          .eq('id', mentorId)
          .maybeSingle();
        
        if (profile?.auth_user_id) {
          // Found profile ID, convert to auth_user_id
          actualMentorId = profile.auth_user_id;
        } else if (authUser?.id && mentorId !== authUser.id) {
          // If mentorId doesn't match auth.uid() and isn't a profile ID,
          // and we're getting metrics for current user, use auth.uid()
          // (This handles the case where currentUser.id is a profile ID)
          actualMentorId = authUser.id;
        }
        // Otherwise, use mentorId as-is (might be auth_user_id for another user)
      }
      
      // Get active assignments (gracefully handle if table doesn't exist)
      let activeAssignments: any[] = [];
      try {
        console.log('🔍 Fetching active assignments for mentor_id:', actualMentorId);
        const { data, error } = await supabase
          .from('mentor_startup_assignments')
          .select(`
            *,
            startups (*)
          `)
          .eq('mentor_id', actualMentorId)
          .eq('status', 'active')
          .order('assigned_at', { ascending: false });

        if (error) {
          console.warn('❌ Error fetching active assignments:', error);
        } else {
          activeAssignments = data || [];
          console.log('✅ Fetched active assignments:', activeAssignments.length, 'assignments');
          
          // Check which assignments came from mentor requests
          if (activeAssignments.length > 0) {
            const startupIds = activeAssignments
              .filter(a => a.startup_id)
              .map(a => a.startup_id);
            
            if (startupIds.length > 0) {
              // Check for accepted mentor requests for these startups
              const { data: acceptedRequests } = await supabase
                .from('mentor_requests')
                .select('startup_id')
                .eq('mentor_id', actualMentorId)
                .eq('status', 'accepted')
                .in('startup_id', startupIds);
              
              const requestedStartupIds = new Set(
                (acceptedRequests || []).map(r => r.startup_id)
              );
              
              // Mark assignments that came from requests
              activeAssignments = activeAssignments.map(assignment => ({
                ...assignment,
                fromRequest: assignment.startup_id ? requestedStartupIds.has(assignment.startup_id) : false
              }));
            } else {
              // No startup_ids, mark all as not from request
              activeAssignments = activeAssignments.map(assignment => ({
                ...assignment,
                fromRequest: false
              }));
            }
            
            console.log('📋 Active assignments:', activeAssignments.map(a => ({
              id: a.id,
              startup_id: a.startup_id,
              startup_name: a.startups?.name || 'N/A',
              status: a.status,
              fromRequest: a.fromRequest
            })));
          }
        }
      } catch (err) {
        console.warn('❌ Table mentor_startup_assignments may not exist yet:', err);
      }

      // Get completed assignments
      let completedAssignments: any[] = [];
      try {
        const { data, error } = await supabase
          .from('mentor_startup_assignments')
          .select(`
            *,
            startups (*)
          `)
          .eq('mentor_id', actualMentorId)
          .eq('status', 'completed')
          .order('completed_at', { ascending: false });

        if (error) {
          console.warn('Error fetching completed assignments:', error);
        } else {
          completedAssignments = data || [];
        }
      } catch (err) {
        console.warn('Table mentor_startup_assignments may not exist yet:', err);
      }

      // Get pending requests
      let requests: any[] = [];
      let allRequests: any[] = [];
      try {
        console.log('🔍 Fetching mentor requests for mentor_id:', actualMentorId);
        // First, get the basic request data
        const { data: requestsData, error: requestsError } = await supabase
          .from('mentor_requests')
          .select('*')
          .eq('mentor_id', actualMentorId)
          .eq('status', 'pending')
          .order('requested_at', { ascending: false });

        if (requestsError) {
          console.warn('❌ Error fetching requests:', requestsError);
          requests = [];
        } else {
          console.log('✅ Fetched requests data:', requestsData?.length || 0, 'requests');
          if (requestsData && requestsData.length > 0) {
          // Fetch requester and startup data separately
          const enrichedRequests = await Promise.all(
            requestsData.map(async (request) => {
              // Fetch requester user data
              let requesterName: string | undefined;
              let requesterEmail: string | undefined;
              if (request.requester_id) {
                try {
                  const { data: requesterData, error: requesterError } = await supabase
                    .from('users')
                    .select('id, name, email')
                    .eq('id', request.requester_id)
                    .single();
                  if (!requesterError && requesterData) {
                    requesterName = requesterData.name || undefined;
                    requesterEmail = requesterData.email || undefined;
                  }
                } catch (err) {
                  console.warn('Error fetching requester data:', err);
                }
              }

              // Fetch startup data
              let startupName: string | undefined;
              let startupWebsite: string | undefined;
              let startupSector: string | undefined;
              if (request.startup_id) {
                try {
                  // First get basic startup data
                  const { data: startupData, error: startupError } = await supabase
                    .from('startups')
                    .select('id, name, sector')
                    .eq('id', request.startup_id)
                    .single();
                  
                  if (!startupError && startupData) {
                    startupName = startupData.name || undefined;
                    startupSector = startupData.sector || undefined;
                    
                    // Try to get domain/website from opportunity_applications
                    try {
                      const { data: oppData } = await supabase
                        .from('opportunity_applications')
                        .select('domain')
                        .eq('startup_id', request.startup_id)
                        .eq('status', 'accepted')
                        .order('created_at', { ascending: false })
                        .limit(1)
                        .maybeSingle();
                      
                      if (oppData?.domain) {
                        startupWebsite = oppData.domain;
                      }
                    } catch (oppErr) {
                      // Ignore if opportunity_applications doesn't exist or has no data
                    }
                  }
                } catch (err) {
                  console.warn('Error fetching startup data:', err);
                }
              }

              // Fetch fee information from mentor_equity_records
              let feeType: string | undefined;
              let feeAmount: number | undefined;
              try {
                const { data: equityData, error: equityError } = await supabase
                  .from('mentor_equity_records')
                  .select('fee_type, fee_amount')
                  .eq('request_id', request.id)
                  .single();
                if (!equityError && equityData) {
                  feeType = equityData.fee_type || undefined;
                  feeAmount = equityData.fee_amount || undefined;
                }
              } catch (err) {
                console.warn('Error fetching fee data:', err);
              }

              return {
                ...request,
                requester_name: requesterName,
                requester_email: requesterEmail,
                startup_name: startupName,
                startup_website: startupWebsite,
                startup_sector: startupSector,
                fee_type: feeType,
                fee_amount: feeAmount
              };
            })
          );
          requests = enrichedRequests;
          console.log('✅ Enriched requests:', requests.length);
        } else {
          requests = [];
          console.log('ℹ️ No pending requests found');
        }

        // Get all requests (for count) - only count pending requests for requestsReceived
        const { data: allRequestsData, error: allRequestsError } = await supabase
          .from('mentor_requests')
          .select('id, status')
          .eq('mentor_id', actualMentorId);

        if (allRequestsError) {
          console.warn('Error fetching all requests:', allRequestsError);
        } else {
          allRequests = allRequestsData || [];
          console.log('📊 All requests breakdown:', {
            total: allRequests.length,
            pending: allRequests.filter(r => r.status === 'pending').length,
            accepted: allRequests.filter(r => r.status === 'accepted').length,
            rejected: allRequests.filter(r => r.status === 'rejected').length
          });
        }
        } // Close the outer else block
      } catch (err) {
        console.warn('Table mentor_requests may not exist yet:', err);
      }

      // Get founded startups from mentor_founded_startups table
      let foundedStartups: any[] = [];
      try {
        const { data, error } = await supabase
          .from('mentor_founded_startups')
          .select(`
            *,
            startups (*)
          `)
          .eq('mentor_id', actualMentorId)
          .order('founded_at', { ascending: false });

        if (error) {
          console.warn('Error fetching founded startups:', error);
        } else {
          foundedStartups = data || [];
        }
      } catch (err) {
        console.warn('Table mentor_founded_startups may not exist yet:', err);
      }

      // Also get startups where founders have this mentor's mentor_code
      // First, get the mentor's mentor_code
      let mentorCode: string | null = null;
      try {
        const { data: mentorUser, error: mentorUserError } = await supabase
          .from('users')
          .select('mentor_code')
          .eq('id', actualMentorId)
          .single();

        if (!mentorUserError && mentorUser?.mentor_code) {
          mentorCode = mentorUser.mentor_code;
        }
      } catch (err) {
        console.warn('Error fetching mentor code:', err);
      }

      // If mentor has a code, find startups where founders have this mentor_code
      if (mentorCode) {
        try {
          const { data: foundersWithMentorCode, error: foundersError } = await supabase
            .from('founders')
            .select(`
              startup_id,
              startups (*)
            `)
            .eq('mentor_code', mentorCode)
            .not('startup_id', 'is', null);

          if (!foundersError && foundersWithMentorCode && foundersWithMentorCode.length > 0) {
            // Get unique startup IDs
            const startupIds = [...new Set(foundersWithMentorCode.map(f => f.startup_id).filter(Boolean))];
            
            // Check which startups are already in foundedStartups
            const existingStartupIds = new Set(
              foundedStartups
                .map(f => f.startup_id)
                .filter(Boolean)
            );

            // Add startups that aren't already in the list
            for (const founder of foundersWithMentorCode) {
              if (founder.startup_id && !existingStartupIds.has(founder.startup_id) && founder.startups) {
                // Create a mentor_founded_startups entry for this startup
                // First check if it already exists
                const { data: existingEntry } = await supabase
                  .from('mentor_founded_startups')
                  .select('id')
                  .eq('mentor_id', actualMentorId)
                  .eq('startup_id', founder.startup_id)
                  .maybeSingle();

                if (!existingEntry) {
                  // Create entry in mentor_founded_startups
                  await supabase
                    .from('mentor_founded_startups')
                    .insert({
                      mentor_id: actualMentorId,
                      startup_id: founder.startup_id,
                      founded_at: new Date().toISOString()
                    });
                }

                // Add to foundedStartups list
                foundedStartups.push({
                  id: null, // Will be set when fetched again
                  mentor_id: actualMentorId,
                  startup_id: founder.startup_id,
                  founded_at: new Date().toISOString(),
                  notes: null,
                  startups: founder.startups
                });
              }
            }
          }
        } catch (err) {
          console.warn('Error fetching startups by founder mentor_code:', err);
        }
      }

      // Calculate totals
      const allAssignments = [
        ...activeAssignments,
        ...completedAssignments
      ];

      const totalEarningsFees = allAssignments.reduce((sum, assignment) => {
        return sum + (parseFloat(String(assignment.fee_amount || 0)));
      }, 0);

      const totalEarningsESOP = allAssignments.reduce((sum, assignment) => {
        return sum + (parseFloat(String(assignment.esop_value || 0)));
      }, 0);

      // Map requests with requester info and startup info
      const mappedRequests = requests.map(req => {
        const requester = (req as any).requester;
        const startup = (req as any).startups;
        return {
          ...req,
          requester_name: requester?.name || 'Unknown',
          requester_email: requester?.email || 'Unknown',
          startup_name: startup?.name || req.startup_name || 'N/A',
        } as MentorRequest;
      });

      // Map assignments with startup info
      const mapAssignments = (assignments: any[]): MentorAssignment[] => {
        return assignments.map(assignment => ({
          ...assignment,
          startup: assignment.startups || undefined,
        } as MentorAssignment));
      };

      // Calculate verified startups mentored (only those with user_id - registered users on TMS)
      const verifiedActiveCount = activeAssignments.filter(a => 
        a.startup_id && a.startups && a.startups.user_id
      ).length;
      const verifiedCompletedCount = completedAssignments.filter(a => 
        a.startup_id && a.startups && a.startups.user_id
      ).length;
      const verifiedStartupsMentored = verifiedActiveCount + verifiedCompletedCount;

      return {
        requestsReceived: allRequests.filter(r => r.status === 'pending').length, // Only count pending requests
        startupsMentoring: activeAssignments.length,
        startupsMentoredPreviously: completedAssignments.length,
        verifiedStartupsMentored: verifiedStartupsMentored,
        startupsFounded: foundedStartups.length,
        totalEarningsFees,
        totalEarningsESOP,
        activeAssignments: mapAssignments(activeAssignments),
        completedAssignments: mapAssignments(completedAssignments),
        pendingRequests: mappedRequests,
        foundedStartups: foundedStartups.map(f => {
          // If startup_id is null, create a Startup object from notes
          if (!f.startups && f.notes) {
            try {
              const notesData = JSON.parse(f.notes);
              return {
                id: f.id || 0,
                name: notesData.startup_name || 'Unknown Startup',
                sector: notesData.sector || '',
                domain: notesData.website || '',
                currency: 'USD',
                complianceStatus: 'Pending' as any,
                currentValuation: 0,
                totalFunding: 0,
                totalRevenue: 0,
                created_at: f.founded_at || new Date().toISOString(),
                email_id: notesData.email_id || '',
                website: notesData.website || '',
                notes: f.notes,
              } as FoundedStartupWithNotes;
            } catch (e) {
              return null;
            }
          }
          // If startup exists, add email, website, and sector from notes if available
          const startup = f.startups as Startup;
          let emailId = '';
          let website = '';
          let sector = '';
          if (f.notes) {
            try {
              const notesData = JSON.parse(f.notes);
              emailId = notesData.email_id || '';
              website = notesData.website || '';
              sector = notesData.sector || '';
            } catch (e) {
              // Notes is not JSON
            }
          }
          return {
            ...startup,
            email_id: emailId,
            website: website || startup.domain || '',
            sector: sector || startup.sector || '',
            notes: f.notes,
          } as FoundedStartupWithNotes;
        }).filter(Boolean) as FoundedStartupWithNotes[],
      };
    } catch (error) {
      console.error('Error fetching mentor metrics:', error);
      return {
        requestsReceived: 0,
        startupsMentoring: 0,
        startupsMentoredPreviously: 0,
        verifiedStartupsMentored: 0,
        startupsFounded: 0,
        totalEarningsFees: 0,
        totalEarningsESOP: 0,
        activeAssignments: [],
        completedAssignments: [],
        pendingRequests: [],
        foundedStartups: [],
      };
    }
  }

  // Accept a mentor request and create assignment
  async acceptMentorRequest(requestId: number): Promise<boolean> {
    try {
      // Get the request
      const { data: request, error: requestError } = await supabase
        .from('mentor_requests')
        .select('*')
        .eq('id', requestId)
        .single();

      if (requestError || !request) {
        console.error('Error fetching mentor request:', requestError);
        return false;
      }

      // Check if request is pending or negotiating
      if (request.status !== 'pending' && request.status !== 'negotiating') {
        console.error('Request is not pending or negotiating:', request.status);
        return false;
      }

      // Update request status to accepted
      const { error: updateError } = await supabase
        .from('mentor_requests')
        .update({
          status: 'accepted',
          responded_at: new Date().toISOString()
        })
        .eq('id', requestId);

      if (updateError) {
        console.error('Error updating mentor request:', updateError);
        return false;
      }

      // Create mentor assignment if startup_id exists
      if (request.startup_id) {
        console.log('📝 Creating mentor assignment for startup_id:', request.startup_id);
        // Get mentor equity record to get fee details
        const { data: equityRecord, error: equityError } = await supabase
          .from('mentor_equity_records')
          .select('fee_amount, fee_type, shares, price_per_share, equity_allocated, investment_amount')
          .eq('request_id', requestId)
          .single();

        if (equityError) {
          console.warn('⚠️ Error fetching equity record:', equityError);
        }

        // Use negotiated amounts if available, otherwise use proposed amounts, otherwise use equity record
        const feeAmount = request.negotiated_fee_amount ?? request.proposed_fee_amount ?? equityRecord?.fee_amount ?? 0;
        const esopPercentage = request.negotiated_esop_percentage ?? request.proposed_esop_percentage ?? equityRecord?.equity_allocated ?? 0;
        const esopValue = request.negotiated_equity_amount ?? request.proposed_equity_amount ?? equityRecord?.investment_amount ?? 0;

        // Get currency from request or mentor profile
        let assignmentCurrency = (request as any).fee_currency || 'USD';
        if (!(request as any).fee_currency) {
          try {
            const { data: mentorProfile } = await supabase
              .from('mentor_profiles')
              .select('fee_currency')
              .eq('user_id', request.mentor_id)
              .single();
            
            if (mentorProfile?.fee_currency) {
              assignmentCurrency = mentorProfile.fee_currency;
            }
          } catch (err) {
            console.warn('Could not fetch mentor currency, using USD:', err);
          }
        }

        console.log('💰 Assignment details:', {
          mentor_id: request.mentor_id,
          startup_id: request.startup_id,
          feeAmount,
          esopPercentage,
          esopValue,
          currency: assignmentCurrency
        });

        // Check if assignment already exists
        const { data: existingAssignment, error: checkError } = await supabase
          .from('mentor_startup_assignments')
          .select('id')
          .eq('mentor_id', request.mentor_id)
          .eq('startup_id', request.startup_id)
          .maybeSingle();

        if (checkError) {
          console.error('❌ Error checking existing assignment:', checkError);
        }

        let assignmentData;
        let assignmentError;

        if (existingAssignment) {
          // Update existing assignment
          console.log('🔄 Updating existing assignment:', existingAssignment.id);
          const { data, error } = await supabase
            .from('mentor_startup_assignments')
            .update({
              status: 'active',
              fee_amount: feeAmount,
              fee_currency: assignmentCurrency,
              esop_percentage: esopPercentage,
              esop_value: esopValue,
              assigned_at: new Date().toISOString()
            })
            .eq('id', existingAssignment.id)
            .select();
          assignmentData = data;
          assignmentError = error;
        } else {
          // Create new assignment
          console.log('➕ Creating new assignment');
          const { data, error } = await supabase
            .from('mentor_startup_assignments')
            .insert({
              mentor_id: request.mentor_id,
              startup_id: request.startup_id,
              status: 'active',
              fee_amount: feeAmount,
              fee_currency: assignmentCurrency,
              esop_percentage: esopPercentage,
              esop_value: esopValue,
              assigned_at: new Date().toISOString()
            })
            .select();
          assignmentData = data;
          assignmentError = error;
        }

        if (assignmentError) {
          console.error('❌ Error creating/updating mentor assignment:', assignmentError);
          return false; // Fail if assignment creation fails
        } else {
          console.log('✅ Mentor assignment created/updated successfully:', assignmentData);
        }
      } else {
        console.warn('⚠️ Request has no startup_id, cannot create assignment');
      }

      return true;
    } catch (error) {
      console.error('Error accepting mentor request:', error);
      return false;
    }
  }

  // Mark assignment as completed (move from Currently Mentoring to Previously Mentored)
  async completeMentoringAssignment(assignmentId: number): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('mentor_startup_assignments')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString()
        })
        .eq('id', assignmentId);

      if (error) {
        console.error('Error completing mentor assignment:', error);
        return false;
      }

      console.log('✅ Mentor assignment marked as completed:', assignmentId);
      return true;
    } catch (error) {
      console.error('Error completing mentor assignment:', error);
      return false;
    }
  }

  // Reject a mentor request
  async rejectMentorRequest(requestId: number): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('mentor_requests')
        .update({
          status: 'rejected',
          responded_at: new Date().toISOString()
        })
        .eq('id', requestId);

      if (error) {
        console.error('Error rejecting mentor request:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error rejecting mentor request:', error);
      return false;
    }
  }

  // Send negotiation (mentor counter-proposal)
  async sendNegotiation(
    requestId: number,
    negotiatedFeeAmount?: number,
    negotiatedEquityAmount?: number,
    negotiatedEsopPercentage?: number
  ): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('mentor_requests')
        .update({
          status: 'negotiating',
          negotiated_fee_amount: negotiatedFeeAmount || null,
          negotiated_equity_amount: negotiatedEquityAmount || null,
          negotiated_esop_percentage: negotiatedEsopPercentage || null,
          responded_at: new Date().toISOString()
        })
        .eq('id', requestId);

      if (error) {
        console.error('Error sending negotiation:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error sending negotiation:', error);
      return false;
    }
  }

  // Check if a request already exists for a mentor-startup pair
  async checkExistingRequest(
    mentorId: string,
    requesterId: string,
    startupId: number | null
  ): Promise<{ exists: boolean; request?: MentorRequest }> {
    try {
      const { data, error } = await supabase
        .from('mentor_requests')
        .select('*')
        .eq('mentor_id', mentorId)
        .eq('requester_id', requesterId)
        .eq('startup_id', startupId)
        .in('status', ['pending', 'negotiating', 'accepted'])
        .order('requested_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        console.error('Error checking existing request:', error);
        return { exists: false };
      }

      return { exists: !!data, request: data || undefined };
    } catch (error: any) {
      console.error('Error checking existing request:', error);
      return { exists: false };
    }
  }

  // Send connect request from startup
  async sendConnectRequest(
    mentorId: string,
    requesterId: string,
    startupId: number | null,
    message?: string,
    proposedFeeAmount?: number,
    proposedEquityAmount?: number,
    proposedEsopPercentage?: number,
    currency?: string
  ): Promise<{ success: boolean; requestId?: number; error?: string }> {
    try {
      // Get the actual auth_user_id from the current session
      // The requesterId might be a profile_id, so we need to get auth_user_id
      const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
      if (authError || !authUser) {
        console.error('❌ Not authenticated:', authError);
        return { 
          success: false, 
          error: 'You must be logged in to send a connection request.' 
        };
      }
      
      // Use the auth user ID (this is what the foreign key needs)
      const actualRequesterId = authUser.id;
      
      // Validate requesterId - check if it's a valid UUID format
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(actualRequesterId)) {
        console.error('❌ Invalid requester ID format:', actualRequesterId);
        return { 
          success: false, 
          error: 'Invalid user ID. Please ensure you are logged in correctly.' 
        };
      }

      // Validate mentorId - check if it's a valid UUID format
      if (!uuidRegex.test(mentorId)) {
        console.error('❌ Invalid mentor ID format:', mentorId);
        return { 
          success: false, 
          error: 'Invalid mentor ID. Please try again.' 
        };
      }

      // Verify mentor_id exists in user_profiles (to ensure it's a valid user)
      // The mentorId might be a profile_id, so check both
      let actualMentorId = mentorId;
      const { data: mentorProfileByAuthId } = await supabase
        .from('user_profiles')
        .select('auth_user_id')
        .eq('auth_user_id', mentorId)
        .limit(1);

      if (!mentorProfileByAuthId || mentorProfileByAuthId.length === 0) {
        // Might be a profile_id, try to get auth_user_id
        const { data: mentorProfileById } = await supabase
          .from('user_profiles')
          .select('auth_user_id')
          .eq('id', mentorId)
          .single();
        
        if (mentorProfileById?.auth_user_id) {
          actualMentorId = mentorProfileById.auth_user_id;
          console.log('✅ Converted mentor profile_id to auth_user_id:', actualMentorId);
        } else {
          return { 
            success: false, 
            error: 'Invalid mentor. Please try selecting a different mentor.' 
          };
        }
      }

      // Get mentor's fee_currency if not provided
      let mentorCurrency = currency || 'USD';
      if (!currency) {
        try {
          const { data: mentorProfile } = await supabase
            .from('mentor_profiles')
            .select('fee_currency')
            .eq('user_id', actualMentorId)
            .single();
          
          if (mentorProfile?.fee_currency) {
            mentorCurrency = mentorProfile.fee_currency;
          }
        } catch (err) {
          console.warn('Could not fetch mentor currency, using USD:', err);
        }
      }

      const { data, error } = await supabase
        .from('mentor_requests')
        .insert({
          mentor_id: actualMentorId,
          requester_id: actualRequesterId,
          requester_type: 'Startup',
          startup_id: startupId,
          status: 'pending',
          message: message || null,
          proposed_fee_amount: proposedFeeAmount || null,
          proposed_equity_amount: proposedEquityAmount || null,
          proposed_esop_percentage: proposedEsopPercentage || null,
          fee_currency: mentorCurrency
        })
        .select()
        .single();

      if (error) {
        console.error('Error sending connect request:', error);
        
        // Provide more helpful error messages
        if (error.code === '23503') { // Foreign key violation
          if (error.message.includes('requester_id')) {
            return { 
              success: false, 
              error: 'Your user account is not properly set up. Please contact support or try logging in again.' 
            };
          } else if (error.message.includes('mentor_id')) {
            return { 
              success: false, 
              error: 'Invalid mentor. Please try selecting a different mentor.' 
            };
          }
        }
        
        return { success: false, error: error.message || 'Failed to send request. Please try again.' };
      }

      return { success: true, requestId: data.id };
    } catch (error: any) {
      console.error('Error sending connect request:', error);
      return { success: false, error: error.message || 'Unknown error' };
    }
  }

  // Delete a mentor assignment
  async deleteMentoringAssignment(assignmentId: number): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('mentor_startup_assignments')
        .delete()
        .eq('id', assignmentId);

      if (error) {
        console.error('Error deleting mentor assignment:', error);
        return false;
      }

      console.log('✅ Mentor assignment deleted:', assignmentId);
      return true;
    } catch (error) {
      console.error('Error deleting mentor assignment:', error);
      return false;
    }
  }

  // Format currency
  formatCurrency(value: number, currency: string = 'USD'): string {
    try {
      return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: currency,
        notation: 'compact',
        maximumFractionDigits: 1,
      }).format(value);
    } catch (error) {
      return `${currency} ${value.toLocaleString()}`;
    }
  }

  // =====================================================
  // MENTOR PROFILE OPERATIONS
  // =====================================================

  /**
   * Get mentor profile by user ID (uses auth.uid() for security)
   */
  async getMentorProfile(userId?: string): Promise<any | null> {
    try {
      // Get actual auth user ID
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) {
        console.error('No authenticated user found');
        return null;
      }
      
      const actualUserId = userId || authUser.id;
      
      const { data, error } = await supabase
        .from('mentor_profiles')
        .select('*')
        .eq('user_id', actualUserId)
        .maybeSingle();

      if (error) {
        if (error.code === 'PGRST116') {
          // No profile found - this is okay
          return null;
        }
        console.error('Error fetching mentor profile:', error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error in getMentorProfile:', error);
      return null;
    }
  }

  /**
   * Save or update mentor profile
   */
  async saveMentorProfile(profileData: any): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      // Get actual auth user ID
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) {
        return { success: false, error: 'Not authenticated' };
      }

      // Ensure user_id matches auth.uid() for security
      const profileToSave = {
        ...profileData,
        user_id: authUser.id,
        updated_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('mentor_profiles')
        .upsert(profileToSave, {
          onConflict: 'user_id'
        })
        .select()
        .single();

      if (error) {
        console.error('Error saving mentor profile:', error);
        return { success: false, error: error.message };
      }

      return { success: true, data };
    } catch (error: any) {
      console.error('Error in saveMentorProfile:', error);
      return { success: false, error: error.message || 'Failed to save profile' };
    }
  }

  /**
   * Delete mentor profile
   */
  async deleteMentorProfile(): Promise<{ success: boolean; error?: string }> {
    try {
      // Get actual auth user ID
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) {
        return { success: false, error: 'Not authenticated' };
      }

      const { error } = await supabase
        .from('mentor_profiles')
        .delete()
        .eq('user_id', authUser.id);

      if (error) {
        console.error('Error deleting mentor profile:', error);
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error: any) {
      console.error('Error in deleteMentorProfile:', error);
      return { success: false, error: error.message || 'Failed to delete profile' };
    }
  }

  /**
   * Get all public mentor profiles (for discovery)
   */
  async getAllMentorProfiles(filters?: {
    mentor_type?: string;
    sectors?: string[];
    expertise_areas?: string[];
    fee_type?: string;
  }): Promise<any[]> {
    try {
      let query = supabase
        .from('mentor_profiles')
        .select('*')
        .order('created_at', { ascending: false });

      // Apply filters
      if (filters?.mentor_type) {
        query = query.eq('mentor_type', filters.mentor_type);
      }
      if (filters?.fee_type) {
        query = query.eq('fee_type', filters.fee_type);
      }
      if (filters?.sectors && filters.sectors.length > 0) {
        query = query.contains('sectors', filters.sectors);
      }
      if (filters?.expertise_areas && filters.expertise_areas.length > 0) {
        query = query.contains('expertise_areas', filters.expertise_areas);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching mentor profiles:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error in getAllMentorProfiles:', error);
      return [];
    }
  }

  /**
   * Search mentor profiles
   */
  async searchMentorProfiles(searchTerm: string): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('mentor_profiles')
        .select('*')
        .or(`mentor_name.ilike.%${searchTerm}%,location.ilike.%${searchTerm}%,mentor_type.ilike.%${searchTerm}%`)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error searching mentor profiles:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error in searchMentorProfiles:', error);
      return [];
    }
  }
}

export const mentorService = new MentorService();

