import { supabase } from './supabase';
import { Startup } from '../types';

export interface MentorRequest {
  id: number;
  mentor_id: string;
  requester_id: string;
  requester_type: 'Startup' | 'Investor';
  startup_id?: number;
  status: 'pending' | 'accepted' | 'rejected' | 'cancelled';
  requested_at: string;
  responded_at?: string;
  message?: string;
  requester_name?: string;
  requester_email?: string;
  startup_name?: string;
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
      // Get active assignments (gracefully handle if table doesn't exist)
      let activeAssignments: any[] = [];
      try {
        const { data, error } = await supabase
          .from('mentor_startup_assignments')
          .select(`
            *,
            startups (*)
          `)
          .eq('mentor_id', mentorId)
          .eq('status', 'active')
          .order('assigned_at', { ascending: false });

        if (error) {
          console.warn('Error fetching active assignments (table may not exist):', error);
        } else {
          activeAssignments = data || [];
        }
      } catch (err) {
        console.warn('Table mentor_startup_assignments may not exist yet:', err);
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
          .eq('mentor_id', mentorId)
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
        const { data: requestsData, error: requestsError } = await supabase
          .from('mentor_requests')
          .select(`
            *,
            requester:users!mentor_requests_requester_id_fkey (
              id,
              name,
              email
            )
          `)
          .eq('mentor_id', mentorId)
          .eq('status', 'pending')
          .order('requested_at', { ascending: false });

        if (requestsError) {
          console.warn('Error fetching requests:', requestsError);
        } else {
          requests = requestsData || [];
        }

        // Get all requests (for count)
        const { data: allRequestsData, error: allRequestsError } = await supabase
          .from('mentor_requests')
          .select('id')
          .eq('mentor_id', mentorId);

        if (allRequestsError) {
          console.warn('Error fetching all requests:', allRequestsError);
        } else {
          allRequests = allRequestsData || [];
        }
      } catch (err) {
        console.warn('Table mentor_requests may not exist yet:', err);
      }

      // Get founded startups
      let foundedStartups: any[] = [];
      try {
        const { data, error } = await supabase
          .from('mentor_founded_startups')
          .select(`
            *,
            startups (*)
          `)
          .eq('mentor_id', mentorId)
          .order('founded_at', { ascending: false });

        if (error) {
          console.warn('Error fetching founded startups:', error);
        } else {
          foundedStartups = data || [];
        }
      } catch (err) {
        console.warn('Table mentor_founded_startups may not exist yet:', err);
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

      // Map requests with requester info
      const mappedRequests = requests.map(req => {
        const requester = (req as any).requester;
        return {
          ...req,
          requester_name: requester?.name || 'Unknown',
          requester_email: requester?.email || 'Unknown',
        } as MentorRequest;
      });

      // Map assignments with startup info
      const mapAssignments = (assignments: any[]): MentorAssignment[] => {
        return assignments.map(assignment => ({
          ...assignment,
          startup: assignment.startups || undefined,
        } as MentorAssignment));
      };

      return {
        requestsReceived: allRequests.length,
        startupsMentoring: activeAssignments.length,
        startupsMentoredPreviously: completedAssignments.length,
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
}

export const mentorService = new MentorService();

