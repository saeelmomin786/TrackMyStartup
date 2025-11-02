import { supabase } from './supabase'
import { UserRole, InvestmentType, ComplianceStatus, InvestorType, InvestmentRoundType, EsopAllocationType, OfferStatus } from '../types'
import { DomainUpdateService } from './domainUpdateService'

// User Management
export const userService = {
  // Get current user profile
  async getCurrentUser() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null

    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .maybeSingle()

    if (error) throw error
    return data
  },

  // Update user profile
  async updateUser(userId: string, updates: any) {
    console.log('🔄 userService.updateUser called with:', { userId, updates });
    
    try {
      const { data, error } = await supabase
        .from('users')
        .update(updates)
        .eq('id', userId)
        .select()
        .single()

      if (error) {
        console.error('❌ Supabase update error:', error);
        console.error('Error details:', {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint
        });
        throw error;
      }
      
      console.log('✅ User updated successfully:', data);
      return data;
    } catch (error) {
      console.error('❌ userService.updateUser error:', error);
      throw error;
    }
  },

  // Get all users (admin only)
  async getAllUsers(): Promise<any[]> {
    console.log('Fetching all users...');
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false })
      
      if (error) {
        console.error('Error fetching users:', error)
        return []
      }
      
      console.log('Users fetched successfully:', data?.length || 0);
      return data || []
    } catch (error) {
      console.error('Error in getAllUsers:', error)
      return []
    }
  },

  // Get startup addition requests
  async getStartupAdditionRequests(): Promise<any[]> {
    console.log('Fetching startup addition requests...');
    try {
      const { data, error } = await supabase
        .from('startup_addition_requests')
        .select('*')
        .order('created_at', { ascending: false })
      
      if (error) {
        console.error('Error fetching startup addition requests:', error)
        return []
      }
      
      console.log('Startup addition requests fetched successfully:', data?.length || 0);
      return data || []
    } catch (error) {
      console.error('Error in getStartupAdditionRequests:', error)
      return []
    }
  },

  // Accept investment advisor request
  async acceptInvestmentAdvisorRequest(userId: string) {
    console.log('Accepting investment advisor request for user:', userId);
    try {
      const { data, error } = await supabase
        .from('users')
        .update({
          advisor_accepted: true,
          advisor_accepted_date: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', userId)
        .select()
        .single()

      if (error) {
        console.error('Error accepting investment advisor request:', error);
        // Provide more specific error information
        const errorMessage = error.message || 'Unknown database error';
        const errorCode = error.code || 'UNKNOWN_ERROR';
        throw new Error(`Database error (${errorCode}): ${errorMessage}`);
      }
      
      console.log('Investment advisor request accepted successfully:', data);
      return data
    } catch (error) {
      console.error('Error in acceptInvestmentAdvisorRequest:', error);
      // Re-throw with better error context
      if (error instanceof Error) {
        throw new Error(`Failed to accept investment advisor request: ${error.message}`);
      } else {
        throw new Error('Failed to accept investment advisor request: Unknown error occurred');
      }
    }
  },

  // Accept startup advisor request
  async acceptStartupAdvisorRequest(startupId: number, userId: string) {
    console.log('Accepting startup advisor request for startup:', startupId, 'user:', userId);
    try {
      // Use the SECURITY DEFINER function to bypass RLS
      const { data: userData, error: userError } = await supabase
        .rpc('accept_startup_advisor_request', {
          p_user_id: userId,
          p_advisor_id: (await supabase.auth.getUser()).data.user?.id,
          p_financial_matrix: null
        })

      if (userError) {
        console.error('Error updating user advisor acceptance:', userError)
        throw userError
      }

      // Create or update the investment advisor relationship
      const { data: relationshipData, error: relationshipError } = await supabase
        .from('investment_advisor_relationships')
        .upsert({
          investment_advisor_id: (await supabase.auth.getUser()).data.user?.id,
          startup_id: startupId,
          relationship_type: 'advisor_startup'
        }, {
          onConflict: 'investment_advisor_id,startup_id,relationship_type'
        })
        .select()

      if (relationshipError) {
        console.error('Error creating advisor relationship:', relationshipError)
        // Don't throw here as the main operation succeeded
      }

      
      console.log('Startup advisor request accepted successfully:', userData);
      return userData
    } catch (error) {
      console.error('Error in acceptStartupAdvisorRequest:', error)
      throw error
    }
  }
}

// Startup Management
export const startupService = {
  // Get all startups for current user
  async getAllStartups() {
    console.log('Fetching startups for current user...');
    try {
      // Get current user ID
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        console.log('No authenticated user found');
        return [];
      }

      const { data, error } = await supabase
        .from('startups')
        .select(`
          *,
          founders (*),
          startup_shares (*)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching startups:', error);
        return [];
      }
      
      // Startups fetched successfully
      
      // Get startup IDs for domain lookup
      const startupIds = (data || []).map(startup => startup.id);
      let domainMap: { [key: number]: string } = {};
      
      if (startupIds.length > 0) {
        // 1. First, try to get domain data from opportunity_applications (most recent)
        const { data: applicationData, error: applicationError } = await supabase
          .from('opportunity_applications')
          .select('startup_id, domain, sector')
          .in('startup_id', startupIds)
          .eq('status', 'accepted'); // Only get accepted applications

        if (!applicationError && applicationData) {
          applicationData.forEach(app => {
            // Try domain field first, then fallback to sector field
            const domainValue = app.domain || app.sector;
            if (domainValue && !domainMap[app.startup_id]) {
              domainMap[app.startup_id] = domainValue;
            }
          });
        }

        // 2. For startups without application data, check fundraising data
        const startupsWithoutData = startupIds.filter(id => !domainMap[id]);
        if (startupsWithoutData.length > 0) {
          console.log('🔍 Checking fundraising data for startups without application data:', startupsWithoutData);
          
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
          }
        }
      }
      
      // Map database fields to frontend expected format
      const mappedData = (data || []).map(startup => {
        // Use domain from applications/fundraising, fallback to startup sector, then to 'Unknown'
        const finalSector = domainMap[startup.id] || startup.sector || 'Unknown';
        console.log(`🔍 Startup ${startup.name} (ID: ${startup.id}): original sector=${startup.sector}, domain=${domainMap[startup.id]}, final sector=${finalSector}`);
        
        return {
          id: startup.id,
          name: startup.name,
          investmentType: startup.investment_type || 'Unknown',
          investmentValue: Number(startup.investment_value) || 0,
          equityAllocation: Number(startup.equity_allocation) || 0,
          currentValuation: Number(startup.current_valuation) || 0,
          complianceStatus: startup.compliance_status || 'Pending',
          sector: finalSector, // Use domain from applications/fundraising, fallback to startup sector
          totalFunding: Number(startup.total_funding) || 0,
          totalRevenue: Number(startup.total_revenue) || 0,
          registrationDate: startup.registration_date || '',
          currency: startup.currency || 'USD', // Include currency field
          founders: startup.founders || [],
          // Include shares data from startup_shares table
          esopReservedShares: startup.startup_shares?.[0]?.esop_reserved_shares || 0,
          totalShares: startup.startup_shares?.[0]?.total_shares || 0,
          pricePerShare: startup.startup_shares?.[0]?.price_per_share || 0
        };
      });
      
      console.log('🔍 Mapped startup data with ESOP and domains:', mappedData);
      
      // Automatically update startup sectors in background if needed
      DomainUpdateService.updateStartupSectors(startupIds).catch(error => {
        console.error('Background sector update failed:', error);
      });
      
      return mappedData;
    } catch (error) {
      console.error('Error in getAllStartups:', error);
      return [];
    }
  },

  // Get all startups (for admin users)
  async getAllStartupsForAdmin() {
    console.log('Fetching all startups for admin...');
    try {
      const { data, error } = await supabase
        .from('startups')
        .select(`
          *,
          founders (*),
          startup_shares (*)
        `)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching all startups:', error);
        console.error('Error details:', JSON.stringify(error, null, 2));
        return [];
      }
      
      console.log('All startups fetched successfully:', data?.length || 0);
      console.log('Raw startup data:', data);
      
      // Map database fields to frontend expected format
      const mappedData = (data || []).map(startup => ({
        id: startup.id,
        name: startup.name,
        investmentType: startup.investment_type,
        investmentValue: startup.investment_value,
        equityAllocation: startup.equity_allocation,
        currentValuation: startup.current_valuation,
        complianceStatus: startup.compliance_status,
        sector: startup.sector,
        totalFunding: startup.total_funding,
        totalRevenue: startup.total_revenue,
        registrationDate: startup.registration_date,
        currency: startup.currency || 'USD', // Include currency field
        founders: startup.founders || [],
        // Include shares data from startup_shares table
        esopReservedShares: startup.startup_shares?.[0]?.esop_reserved_shares || 0,
        totalShares: startup.startup_shares?.[0]?.total_shares || 0,
        pricePerShare: startup.startup_shares?.[0]?.price_per_share || 0
      }));
      
      return mappedData;
    } catch (error) {
      console.error('Error in getAllStartupsForAdmin:', error);
      return [];
    }
  },

  // Get all startups for Investment Advisors (using direct table access with RLS policy)
  async getAllStartupsForInvestmentAdvisor() {
    console.log('Fetching all startups for Investment Advisor...');
    try {
      const { data, error } = await supabase
        .from('startups')
        .select(`
          *,
          founders (*)
        `)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching startups for Investment Advisor:', error);
        console.error('Error details:', JSON.stringify(error, null, 2));
        return [];
      }
      
      console.log('Startups fetched successfully for Investment Advisor:', data?.length || 0);
      console.log('Raw startup data:', data);
      
      // Map database fields to frontend expected format
      const mappedData = (data || []).map(startup => ({
        id: startup.id,
        name: startup.name,
        user_id: startup.user_id,
        investmentType: startup.investment_type,
        investmentValue: startup.investment_value,
        equityAllocation: startup.equity_allocation,
        currentValuation: startup.current_valuation,
        complianceStatus: startup.compliance_status,
        sector: startup.sector,
        totalFunding: startup.total_funding,
        totalRevenue: startup.total_revenue,
        registrationDate: startup.registration_date,
        founders: startup.founders || []
      }));
      
      return mappedData;
    } catch (error) {
      console.error('Error in getAllStartupsForInvestmentAdvisor:', error);
      return [];
    }
  },

  // Get startups by names (canonical, any owner)
  async getStartupsByNames(names: string[]) {
    if (!names || names.length === 0) return [];
    try {
      const { data, error } = await supabase
        .from('startups')
        .select(`
          *,
          founders (*)
        `)
        .in('name', names);

      if (error) {
        console.error('Error fetching startups by names:', error);
        return [];
      }

      const mapped = (data || []).map((startup: any) => ({
        id: startup.id,
        name: startup.name,
        investmentType: startup.investment_type || 'Unknown',
        investmentValue: Number(startup.investment_value) || 0,
        equityAllocation: Number(startup.equity_allocation) || 0,
        currentValuation: Number(startup.current_valuation) || 0,
        complianceStatus: startup.compliance_status || 'Pending',
        sector: startup.sector || 'Unknown',
        totalFunding: Number(startup.total_funding) || 0,
        totalRevenue: Number(startup.total_revenue) || 0,
        registrationDate: startup.registration_date || '',
        founders: startup.founders || []
      }));

      return mapped;
    } catch (e) {
      console.error('Error in getStartupsByNames:', e);
      return [];
    }
  },

  // Get startup by ID
  async getStartupById(id: number) {
    const { data, error } = await supabase
      .from('startups')
      .select(`
        *,
        founders (*)
      `)
      .eq('id', id)
      .single()

    if (error) throw error
    return data
  },

  // Update startup compliance status (for CA)
  async updateCompliance(startupId: number, status: string) {
    console.log(`Updating compliance for startup ${startupId} to ${status}`);
    try {
      const { data, error } = await supabase
        .from('startups')
        .update({ compliance_status: status })
        .eq('id', startupId)
        .select()
        .single()

      if (error) {
        console.error('Error updating compliance:', error);
        throw error;
      }
      
      console.log('Compliance updated successfully');
      return data;
    } catch (error) {
      console.error('Error in updateCompliance:', error);
      throw error;
    }
  },

  // Create startup
  async createStartup(startupData: {
    name: string
    investment_type: InvestmentType
    investment_value: number
    equity_allocation: number
    current_valuation: number
    sector: string
    total_funding: number
    total_revenue: number
    registration_date: string
    founders?: { name: string; email: string }[]
  }) {
    // Get current user ID
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      throw new Error('User not authenticated')
    }
    const { data: startup, error: startupError } = await supabase
      .from('startups')
      .insert({
        name: startupData.name,
        investment_type: startupData.investment_type,
        investment_value: startupData.investment_value,
        equity_allocation: startupData.equity_allocation,
        current_valuation: startupData.current_valuation,
        compliance_status: 'Pending',
        sector: startupData.sector,
        total_funding: startupData.total_funding,
        total_revenue: startupData.total_revenue,
        registration_date: startupData.registration_date,
        user_id: user.id
      })
      .select()
      .single()

    if (startupError) throw startupError

    // Add founders if provided
    if (startupData.founders && startupData.founders.length > 0) {
      const foundersData = startupData.founders.map(founder => ({
        startup_id: startup.id,
        name: founder.name,
        email: founder.email
      }))

      const { error: foundersError } = await supabase
        .from('founders')
        .insert(foundersData)

      if (foundersError) {
        console.error('Error adding founders:', foundersError)
      }
    }

    return startup
  },

  // Update startup
  async updateStartup(id: number, updates: any) {
    const { data, error } = await supabase
      .from('startups')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data
  },

  // Update startup founders
  async updateStartupFounders(startupId: number, founders: { name: string; email: string }[]) {
    // Delete existing founders
    await supabase
      .from('founders')
      .delete()
      .eq('startup_id', startupId)

    // Add new founders
    if (founders.length > 0) {
      const foundersData = founders.map(founder => ({
        startup_id: startupId,
        name: founder.name,
        email: founder.email
      }))

      const { error } = await supabase
        .from('founders')
        .insert(foundersData)

      if (error) throw error
    }
  }
}

// Investment Management
export const investmentService = {
  // Get new investments
  async getNewInvestments() {
    console.log('Fetching new investments...');
    try {
      let { data, error } = await supabase
        .from('new_investments')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching new investments:', error);
        return [];
      }
      
      console.log('New investments fetched successfully:', data?.length || 0);
      
      // Map database fields to frontend expected format
      const mappedData = (data || []).map(investment => ({
        id: investment.id,
        name: investment.name,
        investmentType: investment.investment_type,
        investmentValue: investment.investment_value,
        equityAllocation: investment.equity_allocation,
        sector: investment.sector,
        totalFunding: investment.total_funding,
        totalRevenue: investment.total_revenue,
        registrationDate: investment.registration_date,
        pitchDeckUrl: investment.pitch_deck_url,
        pitchVideoUrl: investment.pitch_video_url,
        complianceStatus: investment.compliance_status
      }));
      
      return mappedData;
    } catch (error) {
      console.error('Error in getNewInvestments:', error);
      return [];
    }
  },

  // Create investment offer
  async createInvestmentOffer(offerData: {
    investor_email: string
    startup_name: string
    investment_id: number  // This is the new_investments.id
    offer_amount: number
    equity_percentage: number
    currency?: string
    co_investment_opportunity_id?: number  // For co-investment offers
  }) {
    console.log('Creating investment offer with data:', offerData);
    console.log('🔍 Co-investment opportunity ID in offerData:', offerData.co_investment_opportunity_id);
    console.log('🔍 Co-investment opportunity ID type:', typeof offerData.co_investment_opportunity_id);
    
    // Check what investment ID we're trying to reference
    console.log('Trying to reference investment_id:', offerData.investment_id);
    
    // First, check if the investment_id exists in new_investments table
    let investmentCheck = null;
    let checkError = null;
    
    try {
      const result = await supabase
      .from('new_investments')
      .select('id')
      .eq('id', offerData.investment_id)
      .single();
    
      investmentCheck = result.data;
      checkError = result.error;
    } catch (err) {
      checkError = err;
    }
    
    // Also check if this ID is actually a startup ID (for backward compatibility)
    let isStartupId = false;
    if (checkError || !investmentCheck) {
      const { data: startupCheck } = await supabase
        .from('startups')
        .select('id, name')
        .eq('id', offerData.investment_id)
        .single();
      
      if (startupCheck) {
        isStartupId = true;
        console.log('Investment ID is actually a startup ID, will create/find corresponding investment record');
      }
    }
    
    if (checkError || !investmentCheck) {
      console.log('Investment not found in new_investments table by ID:', offerData.investment_id);
      
      // Try to find a matching investment by name instead
      const { data: investmentByName, error: nameError } = await supabase
        .from('new_investments')
        .select('id')
        .eq('name', offerData.startup_name)
        .single();
      
      if (nameError || !investmentByName) {
        console.log('Investment not found by name either, attempting to create from startup data:', offerData.startup_name);
        
        // Try to find the startup - either by ID (if isStartupId is true) or by name
        let startupData = null;
        let startupError = null;
        
        if (isStartupId) {
          // If the investment_id is actually a startup ID, use it directly
          const result = await supabase
            .from('startups')
            .select('id, name, sector, registration_date, compliance_status, created_at')
            .eq('id', offerData.investment_id)
            .single();
          
          startupData = result.data;
          startupError = result.error;
        } else {
          // Otherwise, try to find by name
          const result = await supabase
            .from('startups')
            .select('id, name, sector, registration_date, compliance_status, created_at')
            .eq('name', offerData.startup_name)
            .single();
          
          startupData = result.data;
          startupError = result.error;
        }
        
        if (startupError || !startupData) {
          console.error('Startup not found:', isStartupId ? `ID: ${offerData.investment_id}` : offerData.startup_name);
          throw new Error(`Startup "${offerData.startup_name}" not found in the system.`);
        }
        
        // Get fundraising details for this startup
        const { data: fundraisingData, error: fundraisingError } = await supabase
          .from('fundraising_details')
          .select('value, equity, type, investment_value, equity_allocation')
          .eq('startup_id', startupData.id)
          .eq('active', true)
          .single();
        
        // Create a new_investments record from startup and fundraising data
        const investmentValue = fundraisingData?.value || fundraisingData?.investment_value || 1000000;
        const equityAllocation = fundraisingData?.equity || fundraisingData?.equity_allocation || 10;
        const investmentType = (fundraisingData?.type as any) || 'Seed';
        
        const { data: newInvestment, error: createError } = await supabase
          .from('new_investments')
          .insert({
            id: startupData.id, // Use startup.id as new_investments.id to maintain consistency
            name: startupData.name,
            investment_type: investmentType,
            investment_value: investmentValue,
            equity_allocation: equityAllocation,
            sector: startupData.sector || 'Technology',
            total_funding: 0,
            total_revenue: 0,
            registration_date: startupData.registration_date || new Date().toISOString().split('T')[0],
            compliance_status: (startupData.compliance_status as any) || 'Pending'
          })
          .select('id')
          .single();
        
        if (createError || !newInvestment) {
          console.error('Error creating investment record:', createError);
          // If insert fails (maybe due to ID conflict), try to use existing record
          const { data: existingByStartupId, error: existingError } = await supabase
            .from('new_investments')
            .select('id')
            .eq('id', startupData.id)
            .single();
          
          if (existingError || !existingByStartupId) {
            throw new Error(`Failed to create investment record for "${offerData.startup_name}". Please contact support.`);
          }
          
          console.log('Found existing investment record with startup ID:', existingByStartupId.id);
          offerData.investment_id = existingByStartupId.id;
        } else {
          console.log('Created new investment record:', newInvestment.id);
          offerData.investment_id = newInvestment.id;
        }
      } else {
        console.log('Found investment by name, using ID:', investmentByName.id);
        // Update the offerData to use the correct ID
        offerData.investment_id = investmentByName.id;
      }
    }
    
    // Check if user already has a pending offer for this investment
    // For co-investment offers, check co_investment_offers table
    // For regular offers, check investment_offers table
    const tableName = offerData.co_investment_opportunity_id ? 'co_investment_offers' : 'investment_offers';
    
    const { data: existingOffers, error: existingError } = await supabase
      .from(tableName)
      .select('id, status')
      .eq('investor_email', offerData.investor_email)
      .eq('investment_id', offerData.investment_id);
    
    console.log('Existing offers for this user and investment:', existingOffers);
    
    if (existingOffers && existingOffers.length > 0) {
      const pendingOffer = existingOffers.find(offer => 
        offer.status === 'pending' || 
        offer.status === 'pending_investor_advisor_approval' ||
        offer.status === 'pending_startup_advisor_approval' ||
        offer.status === 'investor_advisor_approved' ||
        offer.status === 'startup_advisor_approved'
      );
      
      if (pendingOffer) {
        console.error('User already has a pending offer for this startup');
        throw new Error(`You already have a pending offer for ${offerData.startup_name}. Please wait for it to be processed or contact support if you need to modify it.`);
      }
      
      // If there are rejected offers, delete them to allow new offers
      const rejectedOffers = existingOffers.filter(offer => 
        offer.status === 'rejected' || 
        offer.status === 'investor_advisor_rejected' ||
        offer.status === 'startup_advisor_rejected' ||
        offer.status === 'lead_investor_rejected'
      );
      
      if (rejectedOffers.length > 0) {
        console.log('Deleting rejected offers to allow new offer:', rejectedOffers);
        for (const rejectedOffer of rejectedOffers) {
          await supabase
            .from(tableName)
            .delete()
            .eq('id', rejectedOffer.id);
        }
      }
      
      // Check if there are any accepted offers
      const acceptedOffer = existingOffers.find(offer => 
        offer.status === 'accepted'
      );
      
      if (acceptedOffer) {
        console.error('User already has an accepted offer for this startup');
        throw new Error(`You already have an accepted offer for ${offerData.startup_name}. You cannot make another offer for the same startup.`);
      }
      
      // If there are any other offers that aren't rejected, we need to handle them
      const otherOffers = existingOffers.filter(offer => 
        offer.status !== 'rejected' && 
        offer.status !== 'investor_advisor_rejected' &&
        offer.status !== 'startup_advisor_rejected'
      );
      
      if (otherOffers.length > 0) {
        console.error('User has existing offers that cannot be replaced:', otherOffers);
        throw new Error(`You already have an offer for ${offerData.startup_name} with status: ${otherOffers[0].status}. Please contact support if you need assistance.`);
      }
    }
    
    // Check if this is a co-investment offer
    if (offerData.co_investment_opportunity_id) {
      // Use the new co_investment_offers table for co-investment offers
      console.log('🔄 Creating co-investment offer using co_investment_offers table');
      
      const coInvestmentId = Number(offerData.co_investment_opportunity_id);
      
      // Call the new SQL function for co-investment offers
      const { data: newOfferId, error: rpcError } = await supabase.rpc('create_co_investment_offer', {
        p_co_investment_opportunity_id: coInvestmentId,
        p_investor_email: offerData.investor_email,
        p_startup_name: offerData.startup_name,
        p_offer_amount: Number(offerData.offer_amount),
        p_equity_percentage: Number(offerData.equity_percentage),
        p_currency: offerData.currency || 'USD',
        p_startup_id: null as number | null,
        p_investment_id: offerData.investment_id != null ? Number(offerData.investment_id) : null as number | null
      });
      
      if (rpcError) {
        console.error('❌ Error creating co-investment offer:', rpcError);
        throw rpcError;
      }
      
      console.log('✅ Co-investment offer created with ID:', newOfferId);
      
      // Try to get the created offer from co_investment_offers table
      const { data: createdOffer, error: fetchError } = await supabase
        .from('co_investment_offers')
        .select('*')
        .eq('id', newOfferId)
        .single();
      
      if (fetchError) {
        console.error('⚠️ Error fetching created co-investment offer, but offer was created:', fetchError);
        console.log('⚠️ This might be due to RLS policies. Offer ID:', newOfferId);
        
        // If we can't fetch it, construct a basic offer object from what we know
        // This allows the frontend to work even if RLS blocks the read
        const basicOffer = {
          id: newOfferId,
          co_investment_opportunity_id: coInvestmentId,
          investor_email: offerData.investor_email,
          startup_name: offerData.startup_name,
          offer_amount: Number(offerData.offer_amount),
          equity_percentage: Number(offerData.equity_percentage),
          currency: offerData.currency || 'USD',
          status: 'pending_lead_investor_approval', // Default status
          created_at: new Date().toISOString()
        };
        
        console.log('✅ Returning basic offer object:', basicOffer);
        return basicOffer;
      }
      
      console.log('✅ Co-investment offer created successfully:', createdOffer);
      
      // Format the offer for return
      const formattedOffer = {
        ...createdOffer,
        offer_amount: Number(createdOffer?.offer_amount) || 0,
        equity_percentage: Number(createdOffer?.equity_percentage) || 0,
        created_at: createdOffer?.created_at ? new Date(createdOffer.created_at).toISOString() : new Date().toISOString()
      };
      
      return formattedOffer;
    } else {
      // Regular investment offer - use the existing flow
      console.log('🔄 Creating regular investment offer using investment_offers table');
      
      const rpcParams = {
        p_investor_email: offerData.investor_email,
        p_startup_name: offerData.startup_name,
        p_offer_amount: Number(offerData.offer_amount),
        p_equity_percentage: Number(offerData.equity_percentage),
        p_currency: offerData.currency || 'USD',
        p_startup_id: null as number | null,
        p_investment_id: offerData.investment_id != null ? Number(offerData.investment_id) : null as number | null,
        p_co_investment_opportunity_id: null as number | null
      };
      
      console.log('🔍 Calling create_investment_offer_with_fee with params:', JSON.stringify(rpcParams, null, 2));
      
      const { data, error } = await supabase.rpc('create_investment_offer_with_fee', rpcParams);

      if (error) {
        console.error('❌ Error creating investment offer:', error);
        console.error('❌ Error message:', error.message);
        throw error;
      }
      
      // Get the created offer
      const { data: createdOffer, error: fetchError } = await supabase
        .from('investment_offers')
        .select('*')
        .eq('id', data)
        .single();
      
      if (fetchError) {
        console.error('Error fetching created offer:', fetchError);
        throw fetchError;
      }
      
      console.log('Investment offer created successfully:', createdOffer);
      
      // Ensure the returned data has proper formatting
      const formattedOffer = {
        ...createdOffer,
        offer_amount: Number(createdOffer?.offer_amount) || 0,
        equity_percentage: Number(createdOffer?.equity_percentage) || 0,
        created_at: createdOffer?.created_at ? new Date(createdOffer.created_at).toISOString() : new Date().toISOString()
      };
      
      // Regular offer flow - trigger flow logic to set proper initial stage and status
      if (createdOffer?.id) {
        await this.handleInvestmentFlow(createdOffer.id);
      }
      
      return formattedOffer;
    }
  },

  // Get user's investment offers (both regular and co-investment offers)
  async getUserOffers(userEmail: string) {
    console.log('🔍 Fetching offers for investor:', userEmail);
    
    // Fetch regular investment offers
    const { data: regularOffers, error: regularError } = await supabase
      .from('investment_offers')
      .select(`
        *,
        investment:new_investments(*),
        startup:startups(
          id,
          name,
          sector,
          user_id,
          investment_advisor_code,
          compliance_status,
          startup_nation_validated,
          validation_date,
          created_at
        )
      `)
      .eq('investor_email', userEmail)
      .order('created_at', { ascending: false })

    if (regularError) {
      console.error('Error fetching regular investor offers:', regularError);
      throw regularError;
    }

    // Fetch co-investment offers
    const { data: coInvestmentOffers, error: coInvestmentError } = await supabase
      .from('co_investment_offers')
      .select(`
        *,
        investment:new_investments(*),
        startup:startups(
          id,
          name,
          sector,
          user_id,
          investment_advisor_code,
          compliance_status,
          startup_nation_validated,
          validation_date,
          created_at
        ),
        co_investment_opportunity:co_investment_opportunities(id, listed_by_user_id)
      `)
      .eq('investor_email', userEmail)
      .order('created_at', { ascending: false })

    if (coInvestmentError) {
      console.error('Error fetching co-investment offers:', coInvestmentError);
      // Don't throw - continue with regular offers if co-investment fetch fails
    }

    // Combine both types of offers
    const data = [
      ...(regularOffers || []).map(offer => ({ ...offer, is_co_investment: false })),
      ...(coInvestmentOffers || []).map(offer => ({ ...offer, is_co_investment: true }))
    ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    console.log('🔍 Raw investor offers data (regular + co-investment):', data);

    // Now fetch startup user information separately using user_id
    const enhancedData = await Promise.all((data || []).map(async (offer) => {
      console.log('🔍 Processing offer:', offer.id, 'startup:', offer.startup);
      
      if (offer.startup?.id) {
        console.log('🔍 Startup found for offer:', offer.id, 'user_id:', offer.startup.user_id);
        
        if (offer.startup?.user_id) {
          try {
            // Get startup user information using user_id
            console.log('🔍 Fetching user by user_id:', offer.startup.user_id);
            const { data: startupUserData, error: userError } = await supabase
              .from('users')
              .select('id, email, name, investment_advisor_code')
              .eq('id', offer.startup.user_id)
              .single();

            if (!userError && startupUserData) {
              offer.startup.startup_user = startupUserData;
              console.log('🔍 ✅ Added startup user data for offer:', offer.id, startupUserData);
            } else {
              console.log('🔍 ❌ No startup user found for user_id:', offer.startup.user_id, userError);
            }
          } catch (err) {
            console.log('🔍 ❌ Error fetching startup user for offer:', offer.id, err);
          }
        } else {
          console.log('🔍 ❌ No user_id found in startup for offer:', offer.id);
        }
        
        // Always try fallback method
        try {
          console.log('🔍 Trying fallback method for startup_name:', offer.startup_name);
          const { data: fallbackUserData, error: fallbackError } = await supabase
            .from('users')
            .select('id, email, name, investment_advisor_code')
            .eq('startup_name', offer.startup_name)
            .eq('role', 'Startup')
            .single();

          if (!fallbackError && fallbackUserData) {
            offer.startup.startup_user = fallbackUserData;
            console.log('🔍 ✅ Added startup user data via fallback for offer:', offer.id, fallbackUserData);
          } else {
            console.log('🔍 ❌ No startup user found via fallback for:', offer.startup_name, fallbackError);
          }
        } catch (err) {
          console.log('🔍 ❌ Error in fallback method for offer:', offer.id, err);
        }
      } else {
        console.log('🔍 ❌ No startup found for offer:', offer.id);
      }
      
      console.log('🔍 Final offer after processing:', offer.id, 'startup_user:', offer.startup?.startup_user);
      return offer;
    }));

    console.log('🔍 Enhanced investor offers data:', enhancedData);
    
    // Format offers to match InvestmentOffer interface (camelCase)
    const formattedOffers = enhancedData.map((offer: any) => {
      const isCoInvestment = offer.is_co_investment || !!offer.co_investment_opportunity_id;
      
      return {
        id: offer.id,
        investorEmail: offer.investor_email || offer.investorEmail,
        investorName: offer.investor_name || offer.investorName || offer.investor?.name,
        startupName: offer.startup_name || offer.startupName || offer.startup?.name,
        startupId: offer.startup_id || offer.startupId || offer.startup?.id,
        startup: offer.startup || null,
        offerAmount: Number(offer.offer_amount || offer.offerAmount) || 0,
        equityPercentage: Number(offer.equity_percentage || offer.equityPercentage) || 0,
        status: offer.status || 'pending',
        currency: offer.currency || 'USD',
        createdAt: offer.created_at ? new Date(offer.created_at).toISOString() : (offer.createdAt || new Date().toISOString()),
        // Co-investment fields
        is_co_investment: isCoInvestment,
        co_investment_opportunity_id: offer.co_investment_opportunity_id || null,
        // Approval fields
        investor_advisor_approval_status: offer.investor_advisor_approval_status || 'not_required',
        investor_advisor_approval_at: offer.investor_advisor_approval_at,
        lead_investor_approval_status: offer.lead_investor_approval_status || 'not_required',
        lead_investor_approval_at: offer.lead_investor_approval_at,
        startup_advisor_approval_status: offer.startup_advisor_approval_status || 'not_required',
        startup_advisor_approval_at: offer.startup_advisor_approval_at,
        stage: offer.stage || 1,
        contact_details_revealed: offer.contact_details_revealed || false,
        contact_details_revealed_at: offer.contact_details_revealed_at,
        // Keep original fields for backward compatibility (spread last to preserve)
        ...offer,
        // Ensure camelCase fields take precedence
        investorEmail: offer.investor_email || offer.investorEmail,
        investorName: offer.investor_name || offer.investorName || offer.investor?.name,
        startupName: offer.startup_name || offer.startupName || offer.startup?.name,
        startupId: offer.startup_id || offer.startupId || offer.startup?.id,
        offerAmount: Number(offer.offer_amount || offer.offerAmount) || 0,
        equityPercentage: Number(offer.equity_percentage || offer.equityPercentage) || 0,
        createdAt: offer.created_at ? new Date(offer.created_at).toISOString() : (offer.createdAt || new Date().toISOString())
      };
    });
    
    console.log('✅ Formatted investor offers:', formattedOffers.length);
    return formattedOffers;
  },

  // Update offer status
  async updateOfferStatus(offerId: number, status: OfferStatus) {
    const { error } = await supabase
      .from('investment_offers')
      .update({ status })
      .eq('id', offerId)
      ;

    if (error) throw error
    return true
  },

  // Update investment offer
  async updateInvestmentOffer(offerId: number, offerAmount: number, equityPercentage: number) {
    const { data, error } = await supabase
      .from('investment_offers')
      .update({ 
        offer_amount: offerAmount, 
        equity_percentage: equityPercentage 
      })
      .eq('id', offerId)
      .select()
      .single()

    if (error) throw error
    return data
  },

  // Delete investment offer
  async deleteInvestmentOffer(offerId: number) {
    console.log('🗑️ Attempting to delete investment offer with ID:', offerId);
    
    try {
      const { data, error } = await supabase
      .from('investment_offers')
      .delete()
      .eq('id', offerId)
        .select();

      console.log('🗑️ Delete operation result:', { data, error });

      if (error) {
        console.error('🗑️ Error deleting investment offer:', error);
        throw new Error(`Failed to delete investment offer: ${error.message}`);
      }

      console.log('✅ Investment offer deleted successfully');
      return true;
    } catch (err) {
      console.error('🗑️ Exception in deleteInvestmentOffer:', err);
      throw err;
    }
  },

  // Get all investment offers (admin)
  async getAllInvestmentOffers() {
    console.log('Fetching all investment offers...');
    try {
      const { data, error } = await supabase
        .from('investment_offers')
        .select(`
          *,
          startup:startups(*)
        `)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching investment offers:', error);
        return [];
      }
      
      console.log('Investment offers fetched successfully:', data?.length || 0);
      
      // Get unique investor emails to fetch their names
      const investorEmails = [...new Set((data || []).map(offer => offer.investor_email))];
      let investorNames: { [email: string]: string } = {};
      let users: any[] = [];
      
      if (investorEmails.length > 0) {
        const { data: usersData, error: usersError } = await supabase
          .from('users')
          .select('email, name')
          .in('email', investorEmails);
        
        if (!usersError && usersData) {
          users = usersData;
          investorNames = users.reduce((acc, user) => {
            acc[user.email] = user.name;
            return acc;
          }, {} as { [email: string]: string });
        }
      }
      
      // Map database fields to frontend expected format
      const mappedData = (data || []).map(offer => ({
        id: offer.id,
        investorEmail: offer.investor_email,
        investorName: (offer as any).investor_name || investorNames[offer.investor_email] || undefined,
        startupName: offer.startup_name,
        startupId: (offer as any).startup_id,
        startup: offer.startup ? {
          id: offer.startup.id,
          name: offer.startup.name,
          sector: offer.startup.sector,
          complianceStatus: offer.startup.compliance_status,
          startupNationValidated: offer.startup.startup_nation_validated,
          validationDate: offer.startup.validation_date,
          createdAt: offer.startup.created_at
        } : null,
        offerAmount: Number(offer.offer_amount) || 0,
        equityPercentage: Number(offer.equity_percentage) || 0,
        status: offer.status,
        currency: offer.currency || 'USD',
        createdAt: offer.created_at ? new Date(offer.created_at).toISOString() : new Date().toISOString(),
        // New scouting fee fields
        startup_scouting_fee_amount: offer.startup_scouting_fee_amount || 0,
        investor_scouting_fee_amount: offer.investor_scouting_fee_amount || 0,
        startup_scouting_fee_paid: offer.startup_scouting_fee_paid || false,
        investor_scouting_fee_paid: offer.investor_scouting_fee_paid || false,
        contact_details_revealed: offer.contact_details_revealed || false,
        contact_details_revealed_at: offer.contact_details_revealed_at,
        // New approval fields
        investor_advisor_approval_status: offer.investor_advisor_approval_status || 'not_required',
        investor_advisor_approval_at: offer.investor_advisor_approval_at,
        startup_advisor_approval_status: offer.startup_advisor_approval_status || 'not_required',
        startup_advisor_approval_at: offer.startup_advisor_approval_at,
        // Stage field
        stage: offer.stage || 1
      }));
      
      return mappedData;
    } catch (error) {
      console.error('Error in getAllInvestmentOffers:', error);
      return [];
    }
  },

  // Approve/reject offer by investor advisor
  async approveInvestorAdvisorOffer(offerId: number, action: 'approve' | 'reject') {
    try {
      // Check if this is a co-investment offer (check co_investment_offers table first)
      const { data: coInvestmentOfferData, error: coInvestmentError } = await supabase
        .from('co_investment_offers')
        .select('id, co_investment_opportunity_id')
        .eq('id', offerId)
        .single();
      
      if (!coInvestmentError && coInvestmentOfferData) {
        // This is a co-investment offer - use co-investment specific approval
        console.log('🔍 This is a co-investment offer, using co-investment approval flow');
        return await this.approveCoInvestmentOfferInvestorAdvisor(offerId, action);
      }
      
      // If not found in co_investment_offers, check investment_offers (for backward compatibility)
      const { data: offerData, error: offerError } = await supabase
        .from('investment_offers')
        .select('co_investment_opportunity_id')
        .eq('id', offerId)
        .single();
      
      if (!offerError && offerData?.co_investment_opportunity_id) {
        // This is a co-investment offer in the old table (should be migrated, but handle it)
        console.log('🔍 Found co-investment offer in old table, using co-investment approval flow');
        return await this.approveCoInvestmentOfferInvestorAdvisor(offerId, action);
      }
      
      // Regular offer approval flow
      console.log('🔍 Calling approve_investor_advisor_offer with params:', {
        p_offer_id: offerId,
        p_approval_action: action
      });
      
      const { data, error } = await supabase.rpc('approve_investor_advisor_offer', {
        p_offer_id: offerId,
        p_approval_action: action
      });

      if (error) {
        console.error('❌ Error in approveInvestorAdvisorOffer:', error);
        console.error('❌ Error message:', error.message);
        console.error('❌ Error code:', error.code);
        console.error('❌ Error details:', error.details);
        console.error('❌ Error hint:', error.hint);
        console.error('❌ Full error object:', JSON.stringify(error, null, 2));
        throw error;
      }

      console.log('✅ Investor advisor approval result:', data);
      
      // Trigger flow logic to ensure proper stage progression
      if (action === 'approve') {
        await this.handleInvestmentFlow(offerId);
      }
      
      return data;
    } catch (error) {
      console.error('Error approving investor advisor offer:', error);
      throw error;
    }
  },
  
  // Approve co-investment offer by investor advisor
  async approveCoInvestmentOfferInvestorAdvisor(offerId: number, action: 'approve' | 'reject') {
    try {
      console.log('🔍 Calling approve_co_investment_offer_investor_advisor with params:', {
        p_offer_id: offerId,
        p_approval_action: action
      });
      
      // The SQL function now works with co_investment_offers table
      // Verify parameters are correct: p_offer_id (INTEGER), p_approval_action (TEXT)
      console.log('🔍 RPC call parameters:', {
        function: 'approve_co_investment_offer_investor_advisor',
        p_offer_id: offerId,
        p_offer_id_type: typeof offerId,
        p_approval_action: action,
        p_approval_action_type: typeof action
      });
      
      const { data, error } = await supabase.rpc('approve_co_investment_offer_investor_advisor', {
        p_offer_id: Number(offerId), // Ensure it's a number
        p_approval_action: String(action) // Ensure it's a string
      });

      if (error) {
        console.error('❌ Error in approveCoInvestmentOfferInvestorAdvisor:', error);
        console.error('Error details:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        });
        
        // If it's a schema cache error, provide helpful message
        if (error.message?.includes('schema cache') || error.message?.includes('Could not find the function')) {
          console.error('💡 Schema cache issue detected. Try:');
          console.error('   1. Restart your Supabase project');
          console.error('   2. Or wait a few minutes for schema cache to refresh');
          console.error('   3. Or run REFRESH_POSTGREST_SCHEMA_CACHE.sql in Supabase SQL Editor');
        }
        
        throw error;
      }

      console.log('✅ Co-investment offer investor advisor approval result:', data);
      return data;
    } catch (error) {
      console.error('Error approving co-investment offer by investor advisor:', error);
      throw error;
    }
  },
  
  // Approve co-investment offer by lead investor
  async approveCoInvestmentOfferLeadInvestor(offerId: number, leadInvestorId: string, action: 'approve' | 'reject') {
    try {
      console.log('🔍 Calling approve_co_investment_offer_lead_investor with params:', {
        p_offer_id: offerId,
        p_lead_investor_id: leadInvestorId,
        p_approval_action: action
      });
      
      // The SQL function now works with co_investment_offers table
      const { data, error } = await supabase.rpc('approve_co_investment_offer_lead_investor', {
        p_offer_id: offerId,
        p_lead_investor_id: leadInvestorId,
        p_approval_action: action
      });

      if (error) {
        console.error('❌ Error in approveCoInvestmentOfferLeadInvestor:', error);
        throw error;
      }

      console.log('✅ Co-investment offer lead investor approval result:', data);
      return data;
    } catch (error) {
      console.error('Error approving co-investment offer by lead investor:', error);
      throw error;
    }
  },

  // Approve/reject offer by startup advisor
  async approveStartupAdvisorOffer(offerId: number, action: 'approve' | 'reject') {
    try {
      console.log('🔍 Calling approve_startup_advisor_offer with params:', {
        p_offer_id: offerId,
        p_approval_action: action
      });
      
      const { data, error } = await supabase.rpc('approve_startup_advisor_offer', {
        p_offer_id: offerId,
        p_approval_action: action
      });

      if (error) {
        console.error('❌ Error in approveStartupAdvisorOffer:', error);
        console.error('❌ Error message:', error.message);
        console.error('❌ Error code:', error.code);
        console.error('❌ Error details:', error.details);
        throw error;
      }

      console.log('✅ Startup advisor approval result:', data);
      console.log('🔍 New stage from SQL function:', data?.new_stage);
      console.log('🔍 New status from SQL function:', data?.new_status);
      
      // Trigger flow logic to ensure proper stage progression
      // SQL function should set stage to 3, but let's verify and ensure it's correct
      if (action === 'approve') {
        console.log('🔄 Triggering handleInvestmentFlow after startup advisor approval');
        await this.handleInvestmentFlow(offerId);
        
        // Verify the offer is now at stage 3
        const { data: verifyOffer } = await supabase
          .from('investment_offers')
          .select('id, stage, status, startup_advisor_approval_status')
          .eq('id', offerId)
          .single();
        
        console.log('✅ Offer after startup advisor approval:', {
          id: verifyOffer?.id,
          stage: verifyOffer?.stage,
          status: verifyOffer?.status,
          startup_advisor_status: verifyOffer?.startup_advisor_approval_status
        });
        
        if (verifyOffer?.stage !== 3) {
          console.warn('⚠️ Offer stage is not 3 after startup advisor approval. Expected stage 3, got:', verifyOffer?.stage);
        }
      }
      
      return data;
    } catch (error) {
      console.error('Error approving startup advisor offer:', error);
      throw error;
    }
  },

  // Approve/reject offer by startup (final approval)
  async approveStartupOffer(offerId: number, action: 'approve' | 'reject') {
    try {
      const { data, error } = await supabase.rpc('approve_startup_offer', {
        p_offer_id: offerId,
        p_approval_action: action
      });

      if (error) {
        console.error('Error in approveStartupOffer:', error);
        throw error;
      }

      console.log('✅ Startup approval result:', data);
      return data;
    } catch (error) {
      console.error('Error approving startup offer:', error);
      throw error;
    }
  },

  // Recommend co-investment opportunity to investors
  async recommendCoInvestmentOpportunity(opportunityId: number, advisorId: string, investorIds: string[]) {
    const { data, error } = await supabase.rpc('recommend_co_investment_opportunity', {
      p_opportunity_id: opportunityId,
      p_advisor_id: advisorId,
      p_investor_ids: investorIds
    });

    if (error) throw error;
    return data;
  },

  // Get recommended co-investment opportunities for an investor
  async getRecommendedCoInvestmentOpportunities(investorId: string) {
    const { data, error } = await supabase.rpc('get_recommended_co_investment_opportunities', {
      p_investor_id: investorId
    });

    if (error) throw error;
    return data || [];
  },

  // Update co-investment recommendation status
  async updateCoInvestmentRecommendationStatus(recommendationId: number, status: string) {
    const { data, error } = await supabase.rpc('update_co_investment_recommendation_status', {
      p_recommendation_id: recommendationId,
      p_status: status
    });

    if (error) throw error;
    return data;
  },

  // Get investment advisor information by code
  async getInvestmentAdvisorByCode(advisorCode: string) {
    try {
      console.log('🔍 Database: Looking for advisor with code:', advisorCode);
      
      const { data, error } = await supabase
        .from('users')
        .select('id, email, name, role, investment_advisor_code, logo_url')
        .eq('investment_advisor_code', advisorCode)
        .eq('role', 'Investment Advisor')
        .maybeSingle();

      if (error) {
        console.error('❌ Database: Error fetching investment advisor:', error);
        return null;
      }

      console.log('✅ Database: Found advisor:', data);
      return data;
    } catch (e) {
      console.error('❌ Database: Error in getInvestmentAdvisorByCode:', e);
      return null;
    }
  },

  // Get pending investment advisor relationships (service requests)
  async getPendingInvestmentAdvisorRelationships(advisorId: string) {
    try {
      console.log('🔍 Database: Fetching pending relationships for advisor:', advisorId);
      
      // Get the advisor's code first
      const { data: advisorData, error: advisorError } = await supabase
        .from('users')
        .select('investment_advisor_code')
        .eq('id', advisorId)
        .eq('role', 'Investment Advisor')
        .single();

      if (advisorError || !advisorData) {
        console.error('❌ Database: Error fetching advisor code:', advisorError);
        return [];
      }

      const advisorCode = advisorData.investment_advisor_code;
      console.log('🔍 Database: Advisor code:', advisorCode);

      // Get all relationships for this advisor directly
      const { data: allRelations, error: relationsError } = await supabase
        .from('investment_advisor_relationships')
        .select('*')
        .eq('investment_advisor_id', advisorId)
        .order('created_at', { ascending: false });

      if (relationsError) {
        console.error('❌ Database: Error fetching relationships:', relationsError);
        return [];
      }

      console.log('🔍 Database: Found relationships:', allRelations?.length || 0);

      // Get startup details for startup relationships
      const startupRelations = allRelations?.filter(rel => rel.relationship_type === 'advisor_startup') || [];
      const startupIds = startupRelations.map(rel => rel.startup_id);
      
      let startupDetails = [];
      if (startupIds.length > 0) {
        const { data: startups, error: startupError } = await supabase
          .from('startups')
          .select('id, name, created_at')
          .in('id', startupIds);
        
        if (!startupError && startups) {
          startupDetails = startups;
        }
      }

      // Get investor details for investor relationships
      const investorRelations = allRelations?.filter(rel => rel.relationship_type === 'advisor_investor') || [];
      const investorIds = investorRelations.map(rel => rel.investor_id);
      
      let investorDetails = [];
      if (investorIds.length > 0) {
        const { data: investors, error: investorError } = await supabase
          .from('users')
          .select('id, name, email, created_at')
          .in('id', investorIds);
        
        if (!investorError && investors) {
          investorDetails = investors;
        }
      }

      // Build the response
      const pendingRequests = [
        ...startupRelations.map(rel => {
          const startup = startupDetails.find(s => s.id === rel.startup_id);
          return {
            id: rel.id,
            type: 'startup',
            name: startup?.name || 'Unknown',
            email: 'N/A',
            created_at: rel.created_at
          };
        }),
        ...investorRelations.map(rel => {
          const investor = investorDetails.find(i => i.id === rel.investor_id);
          return {
            id: rel.id,
            type: 'investor',
            name: investor?.name || 'Unknown',
            email: investor?.email || 'Unknown',
            created_at: rel.created_at
          };
        })
      ];

      console.log('✅ Database: Found pending relationships:', pendingRequests.length);
      console.log('🔍 Database: Pending relationships details:', pendingRequests.map(req => ({
        id: req.id,
        type: req.type,
        name: req.name,
        email: req.email,
        created_at: req.created_at
      })));
      return pendingRequests;
    } catch (e) {
      console.error('❌ Database: Error in getPendingInvestmentAdvisorRelationships:', e);
      return [];
    }
  },

  // Accept investment advisor relationship
  async acceptInvestmentAdvisorRelationship(relationshipId: number, financialMatrix: any, agreementFile?: File) {
    try {
      console.log('🔍 Database: Accepting relationship:', relationshipId);
      
      // Update the relationship status (you might need to add a status field to the relationships table)
      const { data, error } = await supabase
        .from('investment_advisor_relationships')
        .update({ 
          // Add any status fields here if they exist
          updated_at: new Date().toISOString()
        })
        .eq('id', relationshipId)
        .select();

      if (error) {
        console.error('❌ Database: Error accepting relationship:', error);
        throw error;
      }

      console.log('✅ Database: Relationship accepted successfully');
      return data;
    } catch (e) {
      console.error('❌ Database: Error in acceptInvestmentAdvisorRelationship:', e);
      throw e;
    }
  },

  // Update investment offer stage
  async updateInvestmentOfferStage(offerId: number, newStage: number) {
    try {
      const { error } = await supabase
        .from('investment_offers')
        .update({ stage: newStage })
        .eq('id', offerId);

      if (error) {
        console.error('Error updating investment offer stage:', error);
        throw error;
      }

      console.log(`✅ Investment offer ${offerId} stage updated to ${newStage}`);
    } catch (error) {
      console.error('Error in updateInvestmentOfferStage:', error);
      throw error;
    }
  },

  // Handle investment flow logic based on stages
  async handleInvestmentFlow(offerId: number) {
    try {
      // Get the offer details
      // IMPORTANT: Include both investment_advisor_code and investment_advisor_code_entered
      const { data: offer, error: offerError } = await supabase
        .from('investment_offers')
        .select(`
          *,
          investor:users!investment_offers_investor_email_fkey(
            id,
            email,
            name,
            investor_code,
            investment_advisor_code,
            investment_advisor_code_entered
          ),
          startup:startups!investment_offers_startup_id_fkey(
            id,
            name,
            investment_advisor_code
          )
        `)
        .eq('id', offerId)
        .single();

      if (offerError || !offer) {
        console.error('Error fetching offer for flow logic:', offerError);
        return;
      }

      const currentStage = offer.stage || 1;
      console.log(`🔄 Processing investment flow for offer ${offerId}, current stage: ${currentStage}`);

      // Stage 1: Check if investor has investment advisor code
      // Check both investment_advisor_code and investment_advisor_code_entered (like the SQL function does)
      if (currentStage === 1) {
        const investorAdvisorCode = offer.investor?.investment_advisor_code || offer.investor?.investment_advisor_code_entered;
        if (investorAdvisorCode) {
          console.log(`✅ Investor has advisor code: ${investorAdvisorCode}, keeping at stage 1 for advisor approval`);
          // Update advisor approval status to pending if not already set
          if (!offer.investor_advisor_approval_status || offer.investor_advisor_approval_status === 'not_required') {
            await supabase
              .from('investment_offers')
              .update({ investor_advisor_approval_status: 'pending' })
              .eq('id', offerId);
          }
          // Keep at stage 1 - will be displayed in investor's advisor dashboard
          return;
        } else {
          console.log(`❌ Investor has no advisor code, moving to stage 2`);
          // Check if startup has advisor to determine next stage
          const startupAdvisorCode = offer.startup?.investment_advisor_code;
          if (startupAdvisorCode) {
            // Move to stage 2 (startup advisor approval)
            await supabase
              .from('investment_offers')
              .update({ 
                stage: 2,
                investor_advisor_approval_status: 'not_required',
                startup_advisor_approval_status: 'pending',
                status: 'pending'
              })
              .eq('id', offerId);
          } else {
            // Move to stage 3 (startup review, no advisors)
            await supabase
              .from('investment_offers')
              .update({ 
                stage: 3,
                investor_advisor_approval_status: 'not_required',
                startup_advisor_approval_status: 'not_required',
                status: 'pending'
              })
              .eq('id', offerId);
          }
        }
      }

      // Stage 2: Check if startup has investment advisor code
      // IMPORTANT: After startup advisor approval, this should move to Stage 3
      if (currentStage === 2) {
        console.log(`🔄 Processing Stage 2 - Offer at stage 2, checking startup advisor`);
        const startupAdvisorCode = offer.startup?.investment_advisor_code;
        const startupAdvisorStatus = offer.startup_advisor_approval_status;
        console.log(`🔍 Startup advisor code found: ${startupAdvisorCode || 'NONE'}`);
        console.log(`🔍 Startup advisor status: ${startupAdvisorStatus || 'NONE'}`);
        console.log(`🔍 Startup data:`, {
          startup_id: offer.startup_id,
          startup_name: offer.startup_name,
          startup_has_data: !!offer.startup,
          advisor_code: startupAdvisorCode,
          advisor_status: startupAdvisorStatus
        });
        
        // Check if startup advisor has already approved
        if (startupAdvisorStatus === 'approved') {
          console.log(`✅ Startup advisor has approved, moving to Stage 3 for startup review`);
          // Move to stage 3 - ready for startup review
          await supabase
            .from('investment_offers')
            .update({ 
              stage: 3,
              status: 'pending'
            })
            .eq('id', offerId);
          return;
        }
        
        // If investor advisor has approved but startup advisor hasn't
        if (offer.investor_advisor_approval_status === 'approved') {
        if (startupAdvisorCode) {
            // Startup has advisor - should wait for startup advisor approval
          console.log(`✅ Startup has advisor code: ${startupAdvisorCode}, keeping at stage 2 for advisor approval`);
            // Ensure startup advisor status is pending
            if (offer.startup_advisor_approval_status !== 'pending') {
              await supabase
                .from('investment_offers')
                .update({ startup_advisor_approval_status: 'pending' })
                .eq('id', offerId);
            }
          // Keep at stage 2 - will be displayed in startup's advisor dashboard
          return;
        } else {
            // Startup has no advisor - move directly to stage 3
            console.log(`✅ Startup has no advisor, moving to Stage 3 for startup review`);
            await supabase
              .from('investment_offers')
              .update({ 
                stage: 3,
                startup_advisor_approval_status: 'not_required',
                status: 'pending'
              })
              .eq('id', offerId);
            return;
          }
        }
      }

      // Stage 3: Display to startup (no further automatic progression)
      // IMPORTANT: This is the final stage where startup can approve/reject
      if (currentStage === 3) {
        console.log(`✅ Offer is at stage 3, ready for startup review`);
        // Ensure status is pending for startup review
        if (offer.status !== 'pending' && offer.status !== 'accepted' && offer.status !== 'rejected') {
          await supabase
            .from('investment_offers')
            .update({ status: 'pending' })
            .eq('id', offerId);
        }
        // Ensure all advisor approvals are marked as complete
        if (offer.investor_advisor_approval_status === 'approved' && offer.startup_advisor_approval_status === 'approved') {
          console.log(`✅ All advisor approvals complete, offer ready for startup decision`);
        }
        // This will be displayed in startup's "Offers Received" table
        return;
      }

    } catch (error) {
      console.error('Error in handleInvestmentFlow:', error);
    }
  },

  // Get offers for a specific startup (by startup_id)
  async getOffersForStartup(startupId: number) {
    try {
      console.log('🔍 Fetching offers for startup:', startupId);
      const { data, error } = await supabase
        .from('investment_offers')
        .select(`
          *,
          startup:startups(
            *,
            startup_user:users!startups_user_id_fkey(
              id,
              email,
              name,
              investment_advisor_code
            )
          )
        `)
        .eq('startup_id', startupId)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching startup offers:', error);
        return [];
      }

      // Filter offers that should be visible to startup
      // IMPORTANT: Only show offers that have passed all advisor approvals
      const visibleOffers = (data || []).filter(offer => {
        const stage = offer.stage || 1;
        const investorAdvisorStatus = offer.investor_advisor_approval_status;
        const startupAdvisorStatus = offer.startup_advisor_approval_status;
        const startupHasAdvisor = offer.startup?.investment_advisor_code;
        
        console.log('🔍 Filtering offer for startup visibility:', {
          offerId: offer.id,
          stage,
          investorAdvisorStatus,
          startupAdvisorStatus,
          startupHasAdvisor
        });
        
        // Stage 3: Always visible - ready for startup review
        if (stage >= 3) {
          console.log('✅ Offer at stage 3+, visible to startup');
          return true;
        }
        
        // Stage 1: Only show if investor advisor has approved OR investor has no advisor
        // DON'T show offers that are waiting for investor advisor approval
        if (stage === 1) {
          // If investor advisor approval is pending, don't show to startup yet
          if (investorAdvisorStatus === 'pending') {
            console.log('❌ Offer at stage 1 waiting for investor advisor approval, NOT visible to startup');
            return false;
          }
          // If investor advisor approval is 'not_required' or 'approved', it's visible
          if (investorAdvisorStatus === 'not_required' || investorAdvisorStatus === 'approved') {
            console.log('✅ Offer at stage 1 with investor advisor status:', investorAdvisorStatus, 'visible to startup');
            return true;
          }
          // Default: don't show if status is unclear
          console.log('⚠️ Offer at stage 1 with unclear status:', investorAdvisorStatus, 'NOT visible');
          return false;
        }
        
        // Stage 2: Only show if startup advisor has approved OR startup has no advisor
        // DON'T show offers that are waiting for startup advisor approval
        if (stage === 2) {
          // If startup has advisor and approval is pending, don't show to startup yet
          if (startupHasAdvisor && startupAdvisorStatus === 'pending') {
            console.log('❌ Offer at stage 2 waiting for startup advisor approval, NOT visible to startup');
            return false;
          }
          // If startup has no advisor OR advisor has approved, it's visible
          if (!startupHasAdvisor || startupAdvisorStatus === 'approved') {
            console.log('✅ Offer at stage 2 with startup advisor status:', startupAdvisorStatus, 'visible to startup');
          return true;
          }
          // Default: don't show if status is unclear
          console.log('⚠️ Offer at stage 2 with unclear status:', startupAdvisorStatus, 'NOT visible');
          return false;
        }
        
        return false;
      });

      console.log('🔍 Total offers fetched:', data?.length || 0);
      console.log('🔍 Visible offers after filtering:', visibleOffers.length);
      console.log('🔍 Raw offers data:', data);
      console.log('🔍 Filtered visible offers:', visibleOffers);

      // Get unique investor emails to fetch their names and advisor status
      const investorEmails = [...new Set((visibleOffers || []).map(offer => offer.investor_email))];
      let investorNames: { [email: string]: string } = {};
      let investorAdvisors: { [email: string]: string | null } = {};
      let users: any[] = [];
      
      if (investorEmails.length > 0) {
        const { data: usersData, error: usersError } = await supabase
          .from('users')
          .select('email, name, investment_advisor_code')
          .in('email', investorEmails);
        
        if (!usersError && usersData) {
          users = usersData;
          investorNames = users.reduce((acc, user) => {
            acc[user.email] = user.name;
            return acc;
          }, {} as { [email: string]: string });
          investorAdvisors = users.reduce((acc, user) => {
            acc[user.email] = user.investment_advisor_code;
            return acc;
          }, {} as { [email: string]: string | null });
        }
      }

      // Debug: Log raw data from database
      if (visibleOffers && visibleOffers.length > 0) {
        console.log('🔍 Raw startup offers data from database:', visibleOffers[0]);
        console.log('🔍 Raw offer amount:', visibleOffers[0].offer_amount);
        console.log('🔍 Raw equity percentage:', visibleOffers[0].equity_percentage);
        console.log('🔍 Raw investor email:', visibleOffers[0].investor_email);
        console.log('🔍 Raw investor name:', visibleOffers[0].investor_name);
        console.log('🔍 Raw stage:', visibleOffers[0].stage);
        console.log('🔍 Raw currency:', visibleOffers[0].currency);
        console.log('🔍 Raw status:', visibleOffers[0].status);
        console.log('🔍 Raw created_at:', visibleOffers[0].created_at);
        console.log('🔍 Investor emails to fetch:', investorEmails);
        console.log('🔍 Investor names mapping:', investorNames);
        console.log('🔍 Users query result:', users);
      }

      const mapped = (visibleOffers || []).map((offer: any) => {
        // Use stored investor name from database
        const investorName = offer.investor_name || investorNames[offer.investor_email] || 'Unknown Investor';
        
        const mappedOffer = {
        id: offer.id,
        investorEmail: offer.investor_email,
          investorName: investorName,
        startupName: offer.startup_name,
        startupId: offer.startup_id,
        startup: offer.startup ? {
          id: offer.startup.id,
          name: offer.startup.name,
          investment_advisor_code: offer.startup.investment_advisor_code,
          user_id: offer.startup.user_id,
          startup_user: offer.startup.startup_user ? {
            id: offer.startup.startup_user.id,
            email: offer.startup.startup_user.email,
            name: offer.startup.startup_user.name,
            investment_advisor_code: offer.startup.startup_user.investment_advisor_code
          } : null
        } : null,
          offerAmount: Number(offer.offer_amount) || 0,
          equityPercentage: Number(offer.equity_percentage) || 0,
        status: offer.status,
          currency: offer.currency || 'USD',
          stage: offer.stage || 1,
          createdAt: offer.created_at ? new Date(offer.created_at).toISOString() : new Date().toISOString(),
          investorAdvisorCode: investorAdvisors[offer.investor_email] || null
        };
        
        // Debug: Log mapped offer
        console.log('🔍 Mapped startup offer:', {
          id: mappedOffer.id,
          investorName: mappedOffer.investorName,
          investorAdvisorCode: mappedOffer.investorAdvisorCode,
          investorEmail: mappedOffer.investorEmail,
          offerAmount: mappedOffer.offerAmount,
          equityPercentage: mappedOffer.equityPercentage,
          currency: mappedOffer.currency,
          stage: mappedOffer.stage,
          status: mappedOffer.status,
          createdAt: mappedOffer.createdAt
        });
        
        return mappedOffer;
      });

      return mapped;
    } catch (e) {
      console.error('Error in getOffersForStartup:', e);
      return [];
    }
  },

  // Accept investment offer with investor scouting fee
  async acceptOfferWithFee(offerId: number, country: string, startupAmountRaised: number) {
    try {
      const { data, error } = await supabase.rpc('accept_investment_offer_with_fee', {
        p_offer_id: offerId,
        p_country: country,
        p_startup_amount_raised: startupAmountRaised
      });

      if (error) {
        console.error('Error accepting offer with fee:', error);
        throw error;
      }

      return data;
    } catch (e) {
      console.error('Error in acceptOfferWithFee:', e);
      throw e;
    }
  },

  // Accept investment offer (simple version without scouting fee)
  async acceptOfferSimple(offerId: number) {
    try {
      const { data, error } = await supabase.rpc('accept_investment_offer_simple', {
        p_offer_id: offerId
      });

      if (error) {
        console.error('Error accepting offer (simple):', error);
        throw error;
      }

      return data;
    } catch (e) {
      console.error('Error in acceptOfferSimple:', e);
      throw e;
    }
  },

  // Reject investment offer
  async rejectOffer(offerId: number) {
    try {
      const { data, error } = await supabase
        .from('investment_offers')
        .update({ status: 'rejected' })
        .eq('id', offerId)
        .select()
        .single();

      if (error) {
        console.error('Error rejecting offer:', error);
        throw error;
      }

      // Log the rejection
      await supabase
        .from('investment_ledger')
        .insert({
          offer_id: offerId,
          activity_type: 'offer_rejected',
          description: 'Investment offer rejected by startup'
        });

      return data;
    } catch (e) {
      console.error('Error in rejectOffer:', e);
      throw e;
    }
  },

  // Reveal contact details (for investment advisors)
  async revealContactDetails(offerId: number) {
    try {
      const { data, error } = await supabase.rpc('reveal_contact_details', {
        p_offer_id: offerId
      });

      if (error) {
        console.error('Error revealing contact details:', error);
        throw error;
      }

      return data;
    } catch (e) {
      console.error('Error in revealContactDetails:', e);
      throw e;
    }
  },

  // Get investment ledger for an offer
  async getInvestmentLedger(offerId: number) {
    try {
      const { data, error } = await supabase
        .from('investment_ledger')
        .select('*')
        .eq('offer_id', offerId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error getting investment ledger:', error);
        return [];
      }

      return data || [];
    } catch (e) {
      console.error('Error in getInvestmentLedger:', e);
      return [];
    }
  },

  // Get all active investment offers (for admin)
  async getAllActiveOffers() {
    try {
      const { data, error } = await supabase
        .from('investment_offers')
        .select(`
          *,
          startup:startups(*)
        `)
        .in('status', ['pending', 'accepted'])
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error getting all active offers:', error);
        return [];
      }

      return data || [];
    } catch (e) {
      console.error('Error in getAllActiveOffers:', e);
      return [];
    }
  },

  // Get investment ledger for all offers (for admin)
  async getAllInvestmentLedger() {
    try {
      const { data, error } = await supabase
        .from('investment_ledger')
        .select(`
          *,
          offer:investment_offers(*)
        `)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error getting all investment ledger:', error);
        return [];
      }

      return data || [];
    } catch (e) {
      console.error('Error in getAllInvestmentLedger:', e);
      return [];
    }
  },

  // Debug function to check what's actually in new_investments table
  async debugNewInvestmentsTable() {
    console.log('=== DEBUG: Checking new_investments table ===');
    try {
      const { data, error } = await supabase
        .from('new_investments')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('Error fetching new_investments:', error);
        return;
      }
      
      console.log('Current data in new_investments table:', data);
      console.log('Number of records:', data?.length || 0);
      
      if (data && data.length > 0) {
        console.log('Sample record:', data[0]);
      }
    } catch (error) {
      console.error('Error in debugNewInvestmentsTable:', error);
    }
  },

  // Debug function to check database state
  async debugInvestmentOffers() {
    console.log('=== DEBUG: Checking investment_offers table ===');
    
    // Check table structure
    const { data: structure, error: structureError } = await supabase
      .from('investment_offers')
      .select('*')
      .limit(1);
    
    console.log('Table structure check:', { structure, structureError });
    
    // Check existing offers
    const { data: existingOffers, error: offersError } = await supabase
      .from('investment_offers')
      .select('*');
    
    console.log('Existing offers:', { existingOffers, offersError });
    
    // Check new_investments table
    const { data: investments, error: investmentsError } = await supabase
      .from('new_investments')
      .select('id, name');
    
    console.log('Available investments:', { investments, investmentsError });
    
    // Check if new_investments table is empty
    if (!investments || investments.length === 0) {
      console.warn('WARNING: new_investments table is empty! This will cause foreign key constraint violations.');
    }
  },

  // Get investment offers for specific user (both regular and co-investment offers)
  async getUserInvestmentOffers(userEmail: string) {
    console.log('🔍 Fetching investment offers for user:', userEmail);
    try {
      // Fetch regular investment offers
      const { data: regularOffers, error: regularError } = await supabase
        .from('investment_offers')
        .select(`
          *,
          startup:startups(
            id,
            name,
            sector,
            user_id,
            investment_advisor_code,
            compliance_status,
            startup_nation_validated,
            validation_date,
            created_at
          )
        `)
        .eq('investor_email', userEmail)
        .order('created_at', { ascending: false })

      if (regularError) {
        console.error('Error fetching regular investor offers:', regularError);
        throw regularError;
      }

      // Fetch co-investment offers
      const { data: coInvestmentOffers, error: coInvestmentError } = await supabase
        .from('co_investment_offers')
        .select(`
          *,
          startup:startups(
            id,
            name,
            sector,
            user_id,
            investment_advisor_code,
            compliance_status,
            startup_nation_validated,
            validation_date,
            created_at
          ),
          co_investment_opportunity:co_investment_opportunities(id, listed_by_user_id)
        `)
        .eq('investor_email', userEmail)
        .order('created_at', { ascending: false })

      if (coInvestmentError) {
        console.error('Error fetching co-investment offers:', coInvestmentError);
        // Don't throw - continue with regular offers if co-investment fetch fails
      }

      // Combine both types of offers
      const data = [
        ...(regularOffers || []).map(offer => ({ ...offer, is_co_investment: false })),
        ...(coInvestmentOffers || []).map(offer => ({ ...offer, is_co_investment: true }))
      ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      console.log('🔍 Raw investor offers data (regular + co-investment):', data.length);

      if (!data || data.length === 0) {
        console.log('🔍 No offers found for user');
        return [];
      }
      
      console.log('🔍 User investment offers fetched successfully:', data.length);
      console.log('🔍 Raw investment offers data:', data);
      
      // Now fetch startup user information separately using user_id
      const enhancedData = await Promise.all((data || []).map(async (offer) => {
        console.log('🔍 Processing offer:', offer.id, 'startup:', offer.startup);
        
        if (offer.startup?.id) {
          console.log('🔍 Startup found for offer:', offer.id, 'user_id:', offer.startup.user_id);
          
          if (offer.startup?.user_id) {
            try {
              // Get startup user information using user_id
              console.log('🔍 Fetching user by user_id:', offer.startup.user_id);
              const { data: startupUserData, error: userError } = await supabase
                .from('users')
                .select('id, email, name, investment_advisor_code')
                .eq('id', offer.startup.user_id)
                .single();

              if (!userError && startupUserData) {
                offer.startup.startup_user = startupUserData;
                console.log('🔍 ✅ Added startup user data for offer:', offer.id, startupUserData);
              } else {
                console.log('🔍 ❌ No startup user found for user_id:', offer.startup.user_id, userError);
              }
            } catch (err) {
              console.log('🔍 ❌ Error fetching startup user for offer:', offer.id, err);
            }
          } else {
            console.log('🔍 ❌ No user_id found in startup for offer:', offer.id);
          }
          
          // Always try fallback method
          try {
            console.log('🔍 Trying fallback method for startup_name:', offer.startup_name);
            const { data: fallbackUserData, error: fallbackError } = await supabase
              .from('users')
              .select('id, email, name, investment_advisor_code')
              .eq('startup_name', offer.startup_name)
              .eq('role', 'Startup')
              .single();

            if (!fallbackError && fallbackUserData) {
              offer.startup.startup_user = fallbackUserData;
              console.log('🔍 ✅ Added startup user data via fallback for offer:', offer.id, fallbackUserData);
            } else {
              console.log('🔍 ❌ No startup user found via fallback for:', offer.startup_name, fallbackError);
            }
          } catch (err) {
            console.log('🔍 ❌ Error in fallback method for offer:', offer.id, err);
          }
        } else {
          console.log('🔍 ❌ No startup found for offer:', offer.id);
        }
        
        console.log('🔍 Final offer after processing:', offer.id, 'startup_user:', offer.startup?.startup_user);
        return offer;
      }));

      console.log('🔍 Enhanced investment offers data:', enhancedData);
      
      // Debug: Log raw data from database
      if (enhancedData && enhancedData.length > 0) {
        console.log('🔍 Raw offer data from database:', enhancedData[0]);
        console.log('🔍 Raw offer amount:', enhancedData[0].offer_amount);
        console.log('🔍 Raw equity percentage:', enhancedData[0].equity_percentage);
        console.log('🔍 Raw currency:', enhancedData[0].currency);
        console.log('🔍 Raw created_at:', enhancedData[0].created_at);
      }
      
      // Map database fields to frontend expected format
      const mappedData = (enhancedData || []).map(offer => ({
        id: offer.id,
        investorEmail: offer.investor_email,
        investorName: (offer as any).investor_name || undefined,
        startupName: offer.startup_name,
        startupId: (offer as any).startup_id,
        startup: offer.startup ? {
          id: offer.startup.id,
          name: offer.startup.name,
          sector: offer.startup.sector,
          complianceStatus: offer.startup.compliance_status,
          startupNationValidated: offer.startup.startup_nation_validated,
          validationDate: offer.startup.validation_date,
          createdAt: offer.startup.created_at,
          user_id: offer.startup.user_id,
          startup_user: offer.startup.startup_user ? {
            id: offer.startup.startup_user.id,
            email: offer.startup.startup_user.email,
            name: offer.startup.startup_user.name,
            investment_advisor_code: offer.startup.startup_user.investment_advisor_code
          } : null
        } : null,
        offerAmount: Number(offer.offer_amount) || 0,
        equityPercentage: Number(offer.equity_percentage) || 0,
        status: offer.status,
        currency: offer.currency || 'USD',
        createdAt: offer.created_at ? new Date(offer.created_at).toISOString() : new Date().toISOString(),
        // New scouting fee fields
        startup_scouting_fee_amount: offer.startup_scouting_fee_amount || 0,
        investor_scouting_fee_amount: offer.investor_scouting_fee_amount || 0,
        startup_scouting_fee_paid: offer.startup_scouting_fee_paid || false,
        investor_scouting_fee_paid: offer.investor_scouting_fee_paid || false,
        contact_details_revealed: offer.contact_details_revealed || false,
        contact_details_revealed_at: offer.contact_details_revealed_at,
        // New approval fields
        investor_advisor_approval_status: offer.investor_advisor_approval_status || 'not_required',
        investor_advisor_approval_at: offer.investor_advisor_approval_at,
        startup_advisor_approval_status: offer.startup_advisor_approval_status || 'not_required',
        startup_advisor_approval_at: offer.startup_advisor_approval_at,
        // Stage field
        stage: offer.stage || 1,
        // Co-investment fields
        is_co_investment: offer.is_co_investment || false,
        co_investment_opportunity_id: offer.co_investment_opportunity_id || null,
        // Approval fields for co-investment offers
        investor_advisor_approval_status: offer.investor_advisor_approval_status || 'not_required',
        investor_advisor_approval_at: offer.investor_advisor_approval_at,
        lead_investor_approval_status: offer.lead_investor_approval_status || 'not_required',
        lead_investor_approval_at: offer.lead_investor_approval_at,
        startup_advisor_approval_status: offer.startup_advisor_approval_status || 'not_required',
        startup_advisor_approval_at: offer.startup_advisor_approval_at,
        // Keep original fields for backward compatibility (spread last to preserve)
        ...offer,
        // Ensure camelCase fields take precedence
        investorEmail: offer.investor_email || offer.investorEmail,
        investorName: offer.investor_name || offer.investorName || offer.investor?.name,
        startupName: offer.startup_name || offer.startupName || offer.startup?.name,
        startupId: offer.startup_id || offer.startupId || offer.startup?.id,
        offerAmount: Number(offer.offer_amount || offer.offerAmount) || 0,
        equityPercentage: Number(offer.equity_percentage || offer.equityPercentage) || 0,
        createdAt: offer.created_at ? new Date(offer.created_at).toISOString() : (offer.createdAt || new Date().toISOString())
      }));
      
      // Debug: Log mapped data
      if (mappedData && mappedData.length > 0) {
        console.log('🔍 Mapped offer data:', mappedData[0]);
        console.log('🔍 Mapped offer amount:', mappedData[0].offerAmount);
        console.log('🔍 Mapped equity percentage:', mappedData[0].equityPercentage);
        console.log('🔍 Mapped currency:', mappedData[0].currency);
        console.log('🔍 Mapped created at:', mappedData[0].createdAt);
        console.log('🔍 Co-investment opportunity ID:', mappedData[0].co_investment_opportunity_id);
        console.log('🔍 Is co-investment:', mappedData[0].is_co_investment);
        console.log('🔍 Status:', mappedData[0].status);
      }
      
      console.log('✅ Formatted investor offers (getUserInvestmentOffers):', mappedData.length);
      return mappedData;
    } catch (error) {
      console.error('Error in getUserInvestmentOffers:', error);
      return [];
    }
  },

  // Create co-investment opportunity
  async createCoInvestmentOpportunity(opportunityData: {
    startup_id: number
    listed_by_user_id: string
    listed_by_type: 'Investor' | 'Investment Advisor'
    investment_amount: number
    equity_percentage: number
    minimum_co_investment: number
    maximum_co_investment: number
    description: string
  }) {
    console.log('Creating co-investment opportunity:', opportunityData);
    
    try {
      // First, check if the co_investment_opportunities table exists
      const { data: tableCheck, error: tableError } = await supabase
        .from('co_investment_opportunities')
        .select('id')
        .limit(1);

      if (tableError && tableError.code === 'PGRST116') {
        console.error('❌ co_investment_opportunities table does not exist');
        throw new Error('Co-investment system is not set up. Please run the FIX_CO_INVESTMENT_CREATION_ERROR.sql script in your Supabase database.');
      }

      // Check if startup exists and get advisor info in one query
      console.log('🔍 Checking startup and advisor status...');
      const { data: startupData, error: startupCheckError } = await supabase
        .from('startups')
        .select('id, name, investment_advisor_code')
        .eq('id', opportunityData.startup_id)
        .single();

      if (startupCheckError || !startupData) {
        console.error('❌ Startup not found:', opportunityData.startup_id, startupCheckError);
        throw new Error(`Startup with ID ${opportunityData.startup_id} not found`);
      }

      // Check if user exists and get advisor info in one query
      console.log('🔍 Checking lead investor user and advisor status...');
      const { data: leadInvestorUser, error: userCheckError } = await supabase
        .from('users')
        .select('id, email, role, name, investment_advisor_code, investment_advisor_code_entered')
        .eq('id', opportunityData.listed_by_user_id)
        .single();

      if (userCheckError || !leadInvestorUser) {
        console.error('❌ User not found:', opportunityData.listed_by_user_id, userCheckError);
        throw new Error(`User with ID ${opportunityData.listed_by_user_id} not found`);
      }

      // Check if co-investment opportunity already exists
      const { data: existingOpportunity, error: existingError } = await supabase
        .from('co_investment_opportunities')
        .select('id, status')
        .eq('startup_id', opportunityData.startup_id)
        .eq('listed_by_user_id', opportunityData.listed_by_user_id)
        .eq('status', 'active')
        .single();

      if (existingOpportunity) {
        console.error('❌ Co-investment opportunity already exists for this startup and user');
        throw new Error('A co-investment opportunity already exists for this startup');
      }

      // Check both fields - investors typically use investment_advisor_code_entered
      // IMPORTANT: Treat empty strings as "no advisor"
      const enteredCode = leadInvestorUser.investment_advisor_code_entered?.trim();
      const regularCode = leadInvestorUser.investment_advisor_code?.trim();
      const leadInvestorAdvisorCode = (enteredCode && enteredCode !== '') ? enteredCode : ((regularCode && regularCode !== '') ? regularCode : null);

      console.log('🔍 Lead investor advisor check:', {
        lead_investor_id: opportunityData.listed_by_user_id,
        lead_investor_email: leadInvestorUser.email,
        investment_advisor_code: leadInvestorUser.investment_advisor_code,
        investment_advisor_code_entered: leadInvestorUser.investment_advisor_code_entered,
        enteredCode_trimmed: enteredCode,
        regularCode_trimmed: regularCode,
        final_advisor_code: leadInvestorAdvisorCode,
        has_advisor: !!leadInvestorAdvisorCode
      });

      // Follow the SAME pattern as normal investment offers:
      // 1. Check INVESTOR advisor FIRST
      // 2. If investor has advisor → stage 1, investor advisor status = 'pending', startup advisor status = 'not_required'
      // 3. If investor NO advisor → check STARTUP advisor SECOND
      // 4. If startup has advisor → will be handled by handleCoInvestmentFlow to move to stage 2
      // 5. If no advisors → will be handled by handleCoInvestmentFlow to move to stage 3
      
      // Check INVESTOR advisor FIRST (same as normal offers)
      const initialLeadInvestorAdvisorStatus = leadInvestorAdvisorCode ? 'pending' : 'not_required';
      
      // Check STARTUP advisor SECOND (same as normal offers)
      // IMPORTANT: Check startup.investment_advisor_code (same column as normal offers)
      const startupAdvisorCode = startupData.investment_advisor_code?.trim();
      const startupHasAdvisor = (startupAdvisorCode && startupAdvisorCode !== '');
      
      console.log('🔍 Startup advisor check (during creation):', {
        startup_id: opportunityData.startup_id,
        startup_name: startupData.name,
        investment_advisor_code: startupData.investment_advisor_code,
        startup_advisor_code_trimmed: startupAdvisorCode,
        has_advisor: startupHasAdvisor,
        advisor_code_empty_string: startupData.investment_advisor_code === '',
        advisor_code_null: startupData.investment_advisor_code === null,
        advisor_code_undefined: startupData.investment_advisor_code === undefined
      });
      
      // Startup advisor status starts as 'not_required' - will be set to 'pending' by handleCoInvestmentFlow if needed
      // (Same pattern as normal offers: initial_startup_advisor_status = 'not_required' in SQL function)
      const initialStartupAdvisorStatus = 'not_required';
      
      // Always start at stage 1 (same as normal offers)
      // handleCoInvestmentFlow will determine the next stage based on advisor presence
      const initialStage = 1;

      console.log('🔍 Initial co-investment status determined (following normal offer pattern):', {
        initial_stage: initialStage,
        initial_lead_investor_advisor_status: initialLeadInvestorAdvisorStatus,
        initial_startup_advisor_status: initialStartupAdvisorStatus,
        lead_investor_has_advisor: !!leadInvestorAdvisorCode,
        startup_has_advisor: startupHasAdvisor,
        note: 'handleCoInvestmentFlow will determine next stage based on advisor presence'
      });

      // Create the co-investment opportunity with correct initial values
      const { data, error } = await supabase
        .from('co_investment_opportunities')
        .insert([{
          startup_id: opportunityData.startup_id,
          listed_by_user_id: opportunityData.listed_by_user_id,
          listed_by_type: opportunityData.listed_by_type,
          investment_amount: opportunityData.investment_amount,
          equity_percentage: opportunityData.equity_percentage,
          minimum_co_investment: opportunityData.minimum_co_investment,
          maximum_co_investment: opportunityData.maximum_co_investment,
          description: opportunityData.description,
          status: 'active',
          stage: initialStage,
          lead_investor_advisor_approval_status: initialLeadInvestorAdvisorStatus,
          startup_advisor_approval_status: initialStartupAdvisorStatus,
          startup_approval_status: 'pending'
        }])
        .select()
        .single();

      if (error) {
        console.error('❌ Error creating co-investment opportunity:', error);
        console.error('Error details:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        });
        throw new Error(`Failed to create co-investment opportunity: ${error.message}`);
      }

      console.log('✅ Co-investment opportunity created successfully:', data);
      console.log('🔍 Created co-investment opportunity details:', {
        id: data?.id,
        startup_id: data?.startup_id,
        listed_by_user_id: data?.listed_by_user_id,
        stage: data?.stage,
        lead_investor_advisor_approval_status: data?.lead_investor_advisor_approval_status,
        startup_advisor_approval_status: data?.startup_advisor_approval_status
      });
      
      // Handle the stage-wise flow logic
      if (data && data.id) {
        console.log('🔄 Triggering handleCoInvestmentFlow for opportunity ID:', data.id);
        try {
        await this.handleCoInvestmentFlow(data.id);
          console.log('✅ handleCoInvestmentFlow completed for opportunity ID:', data.id);
          
          // Verify the final state
          const { data: verifyData } = await supabase
            .from('co_investment_opportunities')
            .select('id, stage, lead_investor_advisor_approval_status, startup_advisor_approval_status')
            .eq('id', data.id)
            .single();
          
          console.log('🔍 Co-investment opportunity final state after flow:', verifyData);
        } catch (flowError) {
          console.error('❌ Error in handleCoInvestmentFlow:', flowError);
        }
      } else {
        console.warn('⚠️ Co-investment opportunity created but no ID returned');
      }
      
      return data;
    } catch (error) {
      console.error('❌ Error in createCoInvestmentOpportunity:', error);
      throw error;
    }
  },

  // Handle co-investment flow logic based on stages
  async handleCoInvestmentFlow(opportunityId: number) {
    try {
      // Get the opportunity details
      // IMPORTANT: Use explicit foreign key for startup join (same as normal offers)
      // Normal offers use: startup:startups!investment_offers_startup_id_fkey
      // For co-investment, we need to specify the foreign key relationship
      const { data: opportunity, error: opportunityError } = await supabase
        .from('co_investment_opportunities')
        .select(`
          *,
          startup:startups!fk_startup_id(
            id,
            name,
            investment_advisor_code
          ),
          lead_investor:users!fk_listed_by_user_id(
            id,
            email,
            name,
            investment_advisor_code_entered
          )
        `)
        .eq('id', opportunityId)
        .single();

      if (opportunityError || !opportunity) {
        console.error('Error fetching opportunity for flow logic:', opportunityError);
        return;
      }

      const currentStage = opportunity.stage || 1;
      console.log(`🔄 Processing co-investment flow for opportunity ${opportunityId}, current stage: ${currentStage}`);
      console.log('🔍 Full opportunity data:', {
        id: opportunity.id,
        startup_id: opportunity.startup_id,
        listed_by_user_id: opportunity.listed_by_user_id,
        stage: currentStage,
        lead_investor_advisor_approval_status: opportunity.lead_investor_advisor_approval_status,
        startup_advisor_approval_status: opportunity.startup_advisor_approval_status,
        startup_data_from_join: opportunity.startup,
        startup_has_data_from_join: !!opportunity.startup,
        startup_advisor_code_from_join: opportunity.startup?.investment_advisor_code,
        lead_investor_data: opportunity.lead_investor
      });
      
      // IMPORTANT: Even if JOIN worked, we still fetch directly to ensure we have the latest data
      // This matches the pattern we use for startup advisor checks
      if (!opportunity.startup_id) {
        console.error('❌ Opportunity has no startup_id, cannot proceed with flow logic');
        return;
      }

      // Stage 1: Check if lead investor has investment advisor code
      // IMPORTANT: Check both investment_advisor_code and investment_advisor_code_entered (like investment offers)
      if (currentStage === 1) {
        // Fetch lead investor data directly to ensure we have the latest advisor code
        // This is more reliable than relying on the join which might not work correctly
        const { data: leadInvestorUser, error: userError } = await supabase
          .from('users')
          .select('id, email, name, investment_advisor_code, investment_advisor_code_entered')
          .eq('id', opportunity.listed_by_user_id)
          .single();
        
        if (userError || !leadInvestorUser) {
          console.error('❌ Error fetching lead investor user data:', userError);
          console.error('❌ Cannot proceed with flow logic without lead investor data');
          // Don't proceed if we can't fetch user data - keep current state
          return;
        }
        
        // Check both fields - investors typically use investment_advisor_code_entered
        // IMPORTANT: Treat empty strings as "no advisor"
        const enteredCode = leadInvestorUser.investment_advisor_code_entered?.trim();
        const regularCode = leadInvestorUser.investment_advisor_code?.trim();
        const leadInvestorAdvisorCode = (enteredCode && enteredCode !== '') ? enteredCode : ((regularCode && regularCode !== '') ? regularCode : null);
        
        console.log(`🔍 Checking lead investor advisor code:`, {
          lead_investor_id: opportunity.listed_by_user_id,
          lead_investor_email: leadInvestorUser.email,
          investment_advisor_code: leadInvestorUser.investment_advisor_code,
          investment_advisor_code_entered: leadInvestorUser.investment_advisor_code_entered,
          final_advisor_code: leadInvestorAdvisorCode,
          advisor_code_empty_string: leadInvestorUser.investment_advisor_code_entered === '',
          advisor_code_null: leadInvestorUser.investment_advisor_code_entered === null,
          advisor_code_undefined: leadInvestorUser.investment_advisor_code_entered === undefined,
          current_approval_status: opportunity.lead_investor_advisor_approval_status,
          will_proceed_to_check: !!leadInvestorAdvisorCode
        });
        
        if (leadInvestorAdvisorCode) {
          console.log(`✅ Lead investor has advisor code: ${leadInvestorAdvisorCode}, keeping at stage 1 for advisor approval`);
          // Update advisor approval status to pending if not already set
          if (!opportunity.lead_investor_advisor_approval_status || opportunity.lead_investor_advisor_approval_status === 'not_required') {
            const { error: updateError } = await supabase
              .from('co_investment_opportunities')
              .update({ 
                lead_investor_advisor_approval_status: 'pending',
                stage: 1 // Ensure it stays at stage 1
              })
              .eq('id', opportunityId);
            
            if (updateError) {
              console.error('❌ Error updating lead_investor_advisor_approval_status:', updateError);
            } else {
              console.log(`✅ Set lead_investor_advisor_approval_status to 'pending' and kept at stage 1`);
            }
          }
          // Keep at stage 1 - will be displayed in lead investor's advisor dashboard
          return;
        } else {
          console.log(`❌ Lead investor has no advisor code, checking startup advisor to determine next stage`);
          // Check if startup has advisor to determine next stage (SAME as normal offers)
          // Use startup data from JOIN, just like normal offers do
          const startupAdvisorCode = opportunity.startup?.investment_advisor_code;
          
          console.log(`🔍 Startup advisor check (using JOIN data):`, {
            startup_id: opportunity.startup_id,
            startup_name: opportunity.startup?.name,
            startup_has_data: !!opportunity.startup,
            advisor_code_from_join: startupAdvisorCode,
            advisor_code_type: typeof startupAdvisorCode,
            advisor_code_is_null: startupAdvisorCode === null,
            advisor_code_is_undefined: startupAdvisorCode === undefined,
            advisor_code_is_empty_string: startupAdvisorCode === ''
          });
          
          if (startupAdvisorCode) {
            // Move to stage 2 (startup advisor approval)
            await supabase
              .from('co_investment_opportunities')
              .update({ 
                stage: 2,
                lead_investor_advisor_approval_status: 'not_required',
                startup_advisor_approval_status: 'pending'
              })
              .eq('id', opportunityId);
            console.log(`✅ Moved to stage 2 (startup has advisor: ${startupAdvisorCode})`);
          } else {
            // Move to stage 3 (startup review, no advisors)
            await supabase
              .from('co_investment_opportunities')
              .update({ 
                stage: 3,
                lead_investor_advisor_approval_status: 'not_required',
                startup_advisor_approval_status: 'not_required'
              })
              .eq('id', opportunityId);
            console.log(`✅ Moved to stage 3 (no advisors)`);
          }
        }
      }

      // Stage 2: Check if startup has investment advisor code
      // IMPORTANT: After startup advisor approval, this should move to Stage 3
      // SAME as normal offers - use startup data from JOIN
      if (currentStage === 2) {
        console.log(`🔄 Processing Stage 2 - Co-investment opportunity at stage 2, checking startup advisor`);
        // Check if startup has advisor (SAME as normal offers)
        const startupAdvisorCode = opportunity.startup?.investment_advisor_code;
        const startupAdvisorStatus = opportunity.startup_advisor_approval_status;
        
        console.log(`🔍 Startup advisor code found: ${startupAdvisorCode || 'NONE'}`);
        console.log(`🔍 Startup advisor status: ${startupAdvisorStatus || 'NONE'}`);
        console.log(`🔍 Startup data (from JOIN):`, {
          opportunity_id: opportunity.id,
          startup_id: opportunity.startup_id,
          startup_name: opportunity.startup?.name,
          startup_has_data: !!opportunity.startup,
          advisor_code: startupAdvisorCode,
          advisor_code_type: typeof startupAdvisorCode,
          advisor_status: startupAdvisorStatus,
          advisor_code_is_null: startupAdvisorCode === null,
          advisor_code_is_undefined: startupAdvisorCode === undefined,
          advisor_code_is_empty_string: startupAdvisorCode === ''
        });
        
        // Check if startup advisor has already approved
        if (startupAdvisorStatus === 'approved') {
          console.log(`✅ Startup advisor has approved, moving to Stage 3 for startup review`);
          // Move to stage 3 - ready for startup review
          await supabase
            .from('co_investment_opportunities')
            .update({ 
              stage: 3
            })
            .eq('id', opportunityId);
          return;
        }
        
        // If lead investor advisor has approved but startup advisor hasn't
        if (opportunity.lead_investor_advisor_approval_status === 'approved') {
        if (startupAdvisorCode) {
            // Startup has advisor - should wait for startup advisor approval
          console.log(`✅ Startup has advisor code: ${startupAdvisorCode}, keeping at stage 2 for advisor approval`);
            // Ensure startup advisor status is pending
            if (opportunity.startup_advisor_approval_status !== 'pending') {
              await supabase
                .from('co_investment_opportunities')
                .update({ startup_advisor_approval_status: 'pending' })
                .eq('id', opportunityId);
            }
          // Keep at stage 2 - will be displayed in startup's advisor dashboard
          return;
        } else {
            // Startup has no advisor - move directly to stage 3
            console.log(`✅ Startup has no advisor, moving to Stage 3 for startup review`);
            await supabase
              .from('co_investment_opportunities')
              .update({ 
                stage: 3,
                startup_advisor_approval_status: 'not_required'
              })
              .eq('id', opportunityId);
            return;
          }
        }
      }

      // Stage 3: Display to startup (no further automatic progression)
      // IMPORTANT: This is the final stage where startup can approve/reject
      if (currentStage === 3) {
        console.log(`✅ Co-investment opportunity is at stage 3, ready for startup review`);
        // Ensure all advisor approvals are marked as complete
        if (opportunity.lead_investor_advisor_approval_status === 'approved' && opportunity.startup_advisor_approval_status === 'approved') {
          console.log(`✅ All advisor approvals complete, co-investment opportunity ready for startup decision`);
        }
        // This will be displayed in startup's dashboard
        return;
      }

    } catch (error) {
      console.error('Error in handleCoInvestmentFlow:', error);
    }
  },

  // Update co-investment opportunity stage
  async updateCoInvestmentOpportunityStage(opportunityId: number, newStage: number) {
    try {
      const { error } = await supabase.rpc('update_co_investment_opportunity_stage', {
        p_opportunity_id: opportunityId,
        p_new_stage: newStage
      });

      if (error) {
        console.error('Error updating co-investment opportunity stage:', error);
        throw error;
      }

      console.log(`✅ Co-investment opportunity ${opportunityId} moved to stage ${newStage}`);
    } catch (error) {
      console.error('Error in updateCoInvestmentOpportunityStage:', error);
      throw error;
    }
  },

  // Approve co-investment opportunity by lead investor advisor
  async approveLeadInvestorAdvisorCoInvestment(opportunityId: number, action: 'approve' | 'reject') {
    try {
      console.log('🔍 Calling approve_lead_investor_advisor_co_investment with params:', {
        p_opportunity_id: opportunityId,
        p_approval_action: action
      });
      
      const { data, error } = await supabase.rpc('approve_lead_investor_advisor_co_investment', {
        p_opportunity_id: opportunityId,
        p_approval_action: action
      });

      if (error) {
        console.error('❌ Error approving co-investment by lead investor advisor:', error);
        console.error('❌ Error message:', error.message);
        console.error('❌ Error code:', error.code);
        console.error('❌ Error details:', error.details);
        console.error('❌ Error hint:', error.hint);
        throw error;
      }

      console.log('✅ Lead investor advisor approval result:', data);
      console.log(`✅ Lead investor advisor ${action} for co-investment opportunity ${opportunityId}`);
      
      // Trigger flow logic to ensure proper stage progression
      if (action === 'approve') {
        console.log('🔄 Triggering handleCoInvestmentFlow after lead investor advisor approval');
        await this.handleCoInvestmentFlow(opportunityId);
        
        // Verify the opportunity stage
        const { data: verifyOpportunity } = await supabase
          .from('co_investment_opportunities')
          .select('id, stage, lead_investor_advisor_approval_status, startup_advisor_approval_status')
          .eq('id', opportunityId)
          .single();
        
        console.log('✅ Co-investment opportunity after lead investor advisor approval:', {
          id: verifyOpportunity?.id,
          stage: verifyOpportunity?.stage,
          lead_investor_advisor_status: verifyOpportunity?.lead_investor_advisor_approval_status,
          startup_advisor_status: verifyOpportunity?.startup_advisor_approval_status
        });
      }
      
      return data;
    } catch (error: any) {
      console.error('❌ Error in approveLeadInvestorAdvisorCoInvestment:', error);
      console.error('❌ Error details:', {
        message: error?.message,
        code: error?.code,
        details: error?.details,
        hint: error?.hint
      });
      throw error;
    }
  },

  // Approve co-investment opportunity by startup advisor
  async approveStartupAdvisorCoInvestment(opportunityId: number, action: 'approve' | 'reject') {
    try {
      console.log('🔍 Calling approve_startup_advisor_co_investment with params:', {
        p_opportunity_id: opportunityId,
        p_approval_action: action
      });
      
      const { data, error } = await supabase.rpc('approve_startup_advisor_co_investment', {
        p_opportunity_id: opportunityId,
        p_approval_action: action
      });

      if (error) {
        console.error('❌ Error in approveStartupAdvisorCoInvestment:', error);
        console.error('❌ Error message:', error.message);
        console.error('❌ Error code:', error.code);
        console.error('❌ Error details:', error.details);
        throw error;
      }

      console.log('✅ Startup advisor approval result:', data);
      console.log('🔍 New stage from SQL function:', data?.new_stage);
      console.log('🔍 New status from SQL function:', data?.new_status);
      
      // Trigger flow logic to ensure proper stage progression
      // SQL function should set stage to 3, but let's verify and ensure it's correct
      if (action === 'approve') {
        console.log('🔄 Triggering handleCoInvestmentFlow after startup advisor approval');
        await this.handleCoInvestmentFlow(opportunityId);
        
        // Verify the opportunity is now at stage 3
        const { data: verifyOpportunity } = await supabase
          .from('co_investment_opportunities')
          .select('id, stage, startup_advisor_approval_status')
          .eq('id', opportunityId)
          .single();
        
        console.log('✅ Co-investment opportunity after startup advisor approval:', {
          id: verifyOpportunity?.id,
          stage: verifyOpportunity?.stage,
          startup_advisor_status: verifyOpportunity?.startup_advisor_approval_status
        });
        
        if (verifyOpportunity?.stage !== 3) {
          console.warn('⚠️ Co-investment opportunity stage is not 3 after startup advisor approval. Expected stage 3, got:', verifyOpportunity?.stage);
        }
      }
      
      return data;
    } catch (error) {
      console.error('Error in approveStartupAdvisorCoInvestment:', error);
      throw error;
    }
  },

  // Approve co-investment opportunity by startup
  async approveStartupCoInvestment(opportunityId: number, action: 'approve' | 'reject') {
    try {
      const { data, error } = await supabase.rpc('approve_startup_co_investment', {
        p_opportunity_id: opportunityId,
        p_approval_action: action
      });

      if (error) {
        console.error('Error approving co-investment by startup:', error);
        throw error;
      }

      console.log(`✅ Startup ${action} for co-investment opportunity ${opportunityId}`);
      return data;
    } catch (error) {
      console.error('Error in approveStartupCoInvestment:', error);
      throw error;
    }
  },

  // Get co-investment opportunities
  async getCoInvestmentOpportunities() {
    console.log('Fetching co-investment opportunities...');
    
    try {
      const { data, error } = await supabase
        .from('co_investment_opportunities')
        .select(`
          *,
          startup:startups(
            id,
            name,
            sector,
            stage,
            user_id
          ),
          listed_by_user:users(
            id,
            name,
            email
          )
        `)
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching co-investment opportunities:', error);
        return [];
      }

      console.log('Co-investment opportunities fetched successfully:', data?.length || 0);
      return data || [];
    } catch (error) {
      console.error('Error in getCoInvestmentOpportunities:', error);
      return [];
    }
  },

  // Get co-investment opportunities for a specific startup (by startup_id)
  // IMPORTANT: Only show opportunities that have passed all required advisor approvals
  async getCoInvestmentOpportunitiesForStartup(startupId: number) {
    try {
      console.log('🔍 Fetching co-investment opportunities for startup:', startupId);
      
      // First, fetch opportunities with explicit foreign key
      const { data, error } = await supabase
        .from('co_investment_opportunities')
        .select(`
          *,
          startup:startups!fk_startup_id(
            id,
            name,
            investment_advisor_code
          ),
          listed_by_user:users!fk_listed_by_user_id(
            id,
            email,
            name,
            investment_advisor_code,
            investment_advisor_code_entered
          )
        `)
        .eq('startup_id', startupId)
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ Error fetching startup co-investment opportunities:', error);
        console.error('❌ Error details:', {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint
        });
        return [];
      }

      console.log('✅ Fetched co-investment opportunities from database:', data?.length || 0);
      
      if (!data || data.length === 0) {
        console.log('⚠️ No co-investment opportunities found for startup:', startupId);
        return [];
      }

      // Filter opportunities that should be visible to startup
      // IMPORTANT: Only show opportunities that have passed all advisor approvals
      // Use Promise.all to handle async verification
      const visibleOpportunities = await Promise.all(
        (data || []).map(async (opp) => {
          const stage = opp.stage || 1;
          const leadInvestorAdvisorStatus = opp.lead_investor_advisor_approval_status;
          const startupAdvisorStatus = opp.startup_advisor_approval_status;
          const startupHasAdvisor = opp.startup?.investment_advisor_code;
          
          console.log('🔍 Filtering co-investment opportunity for startup visibility:', {
            opportunityId: opp.id,
            stage,
            leadInvestorAdvisorStatus,
            startupAdvisorStatus,
            startupHasAdvisor
          });
          
          // Stage 3: Always visible - ready for startup review
          // IMPORTANT: Stage 3 means all advisor approvals are done, ready for startup to review
          if (stage >= 3) {
            console.log('✅ Co-investment opportunity at stage 3+, visible to startup:', {
              opportunityId: opp.id,
              stage,
              leadInvestorAdvisorStatus,
              startupAdvisorStatus,
              startupApprovalStatus: opp.startup_approval_status
            });
            return { opp, visible: true };
          }
          
          // Stage 1: Only show if lead investor advisor has approved OR lead investor has no advisor
          // DON'T show opportunities that are waiting for lead investor advisor approval
          // IMPORTANT: Even if status is 'not_required', we need to verify the lead investor actually has no advisor
          if (stage === 1) {
            // If lead investor advisor approval is pending, don't show to startup yet
            if (leadInvestorAdvisorStatus === 'pending') {
              console.log('❌ Co-investment opportunity at stage 1 waiting for lead investor advisor approval, NOT visible to startup');
              return { opp, visible: false };
            }
            
            // If status is 'approved', it means advisor approved and we should have moved past stage 1
            // This shouldn't happen, but if it does, show it
            if (leadInvestorAdvisorStatus === 'approved') {
              console.log('⚠️ Co-investment opportunity at stage 1 with approved status (unexpected), visible to startup');
              return { opp, visible: true };
            }
            
            // If status is 'not_required', we need to verify the lead investor actually has no advisor
            // Fetch the lead investor data to verify
            if (leadInvestorAdvisorStatus === 'not_required') {
              try {
                const { data: leadInvestor } = await supabase
                  .from('users')
                  .select('id, investment_advisor_code, investment_advisor_code_entered')
                  .eq('id', opp.listed_by_user_id)
                  .single();
                
                const hasAdvisor = leadInvestor?.investment_advisor_code_entered || leadInvestor?.investment_advisor_code;
                
                if (hasAdvisor) {
                  // Lead investor has advisor but status is 'not_required' - this is incorrect
                  // The opportunity should be pending advisor approval, so don't show it
                  console.log('❌ Co-investment opportunity at stage 1: Lead investor has advisor but status is "not_required" (incorrect state), NOT visible to startup');
                  return { opp, visible: false };
                } else {
                  // Lead investor truly has no advisor, so it's visible
                  console.log('✅ Co-investment opportunity at stage 1: Lead investor has no advisor, visible to startup');
                  return { opp, visible: true };
                }
              } catch (verifyError) {
                console.error('❌ Error verifying lead investor advisor status:', verifyError);
                // On error, be conservative and don't show it
                return { opp, visible: false };
              }
            }
            
            // Default: don't show if status is unclear or null
            console.log('⚠️ Co-investment opportunity at stage 1 with unclear status:', leadInvestorAdvisorStatus, 'NOT visible');
            return { opp, visible: false };
          }
          
          // Stage 2: Only show if startup advisor has approved OR startup has no advisor
          // DON'T show opportunities that are waiting for startup advisor approval
          if (stage === 2) {
            // If startup has advisor and approval is pending, don't show to startup yet
            if (startupHasAdvisor && startupAdvisorStatus === 'pending') {
              console.log('❌ Co-investment opportunity at stage 2 waiting for startup advisor approval, NOT visible to startup');
              return { opp, visible: false };
            }
            // If startup has no advisor OR advisor has approved, it's visible
            if (!startupHasAdvisor || startupAdvisorStatus === 'approved') {
              console.log('✅ Co-investment opportunity at stage 2 with startup advisor status:', startupAdvisorStatus, 'visible to startup');
              return { opp, visible: true };
            }
            // Default: don't show if status is unclear
            console.log('⚠️ Co-investment opportunity at stage 2 with unclear status:', startupAdvisorStatus, 'NOT visible');
            return { opp, visible: false };
          }
          
          return { opp, visible: false };
        })
      );
      
      // Filter to only return visible opportunities
      const filtered = visibleOpportunities
        .filter(result => result.visible)
        .map(result => result.opp);

      console.log('🔍 Total co-investment opportunities fetched:', data?.length || 0);
      console.log('🔍 Visible co-investment opportunities after filtering:', filtered.length);
      console.log('🔍 Filtered visible opportunities:', filtered.map(o => ({
        id: o.id,
        stage: o.stage,
        leadInvestorAdvisorStatus: o.lead_investor_advisor_approval_status,
        startupAdvisorStatus: o.startup_advisor_approval_status,
        startupApprovalStatus: o.startup_approval_status
      })));

      // Additional logging for debugging
      if (filtered.length === 0 && data && data.length > 0) {
        console.warn('⚠️ No visible opportunities after filtering, but opportunities exist:', data.map(o => ({
          id: o.id,
          stage: o.stage,
          leadInvestorAdvisorStatus: o.lead_investor_advisor_approval_status,
          startupAdvisorStatus: o.startup_advisor_approval_status,
          startupApprovalStatus: o.startup_approval_status
        })));
      }

      return filtered;
    } catch (e) {
      console.error('Error in getCoInvestmentOpportunitiesForStartup:', e);
      return [];
    }
  },

  // Express interest in co-investment opportunity
  async expressCoInvestmentInterest(interestData: {
    opportunity_id: number
    interested_user_id: string
    interested_user_type: 'Investor' | 'Investment Advisor'
    message?: string
  }) {
    console.log('Expressing co-investment interest:', interestData);
    
    try {
      const { data, error } = await supabase
        .from('co_investment_interests')
        .insert([{
          opportunity_id: interestData.opportunity_id,
          interested_user_id: interestData.interested_user_id,
          interested_user_type: interestData.interested_user_type,
          message: interestData.message,
          status: 'pending'
        }])
        .select()
        .single();

      if (error) {
        console.error('Error expressing co-investment interest:', error);
        throw error;
      }

      console.log('Co-investment interest expressed successfully:', data);
      return data;
    } catch (error) {
      console.error('Error in expressCoInvestmentInterest:', error);
      throw error;
    }
  },

  // Update existing investment offer
  async updateInvestmentOffer(offerId: number, updateData: {
    offer_amount?: number
    equity_percentage?: number
    currency?: string
    wants_co_investment?: boolean
  }) {
    console.log('Updating investment offer:', offerId, updateData);
    
    try {
      const { data, error } = await supabase
        .from('investment_offers')
        .update({
          offer_amount: updateData.offer_amount,
          equity_percentage: updateData.equity_percentage,
          currency: updateData.currency,
          wants_co_investment: updateData.wants_co_investment,
          updated_at: new Date().toISOString()
        })
        .eq('id', offerId)
        .select()
        .single();

      if (error) {
        console.error('Error updating investment offer:', error);
        throw error;
      }

      console.log('Investment offer updated successfully:', data);
      
      // If co-investment is requested, create/update co-investment opportunity
      if (updateData.wants_co_investment && data) {
        try {
          // Check if co-investment opportunity already exists
          const { data: existingCoInvestment } = await supabase
            .from('co_investment_opportunities')
            .select('id')
            .eq('startup_id', data.startup_id)
            .eq('listed_by_user_id', data.investor_id)
            .single();

          if (existingCoInvestment) {
            // Update existing co-investment opportunity
            const remainingAmount = data.total_investment_amount - updateData.offer_amount!;
            await supabase
              .from('co_investment_opportunities')
              .update({
                investment_amount: data.total_investment_amount,
                minimum_co_investment: Math.min(remainingAmount * 0.1, 10000),
                maximum_co_investment: remainingAmount,
                description: `Co-investment opportunity for ${data.startup_name}. Lead investor has committed ${updateData.currency || 'USD'} ${updateData.offer_amount!.toLocaleString()} for ${updateData.equity_percentage}% equity. Remaining ${updateData.currency || 'USD'} ${remainingAmount.toLocaleString()} available for co-investors.`,
                updated_at: new Date().toISOString()
              })
              .eq('id', existingCoInvestment.id);
          } else {
            // Create new co-investment opportunity
            await this.createCoInvestmentOpportunity({
              startup_id: data.startup_id,
              listed_by_user_id: data.investor_id,
              listed_by_type: 'Investor',
              investment_amount: data.total_investment_amount,
              equity_percentage: data.equity_percentage,
              minimum_co_investment: Math.min((data.total_investment_amount - updateData.offer_amount!) * 0.1, 10000),
              maximum_co_investment: data.total_investment_amount - updateData.offer_amount!,
              description: `Co-investment opportunity for ${data.startup_name}. Lead investor has committed ${updateData.currency || 'USD'} ${updateData.offer_amount!.toLocaleString()} for ${updateData.equity_percentage}% equity. Remaining ${updateData.currency || 'USD'} ${(data.total_investment_amount - updateData.offer_amount!).toLocaleString()} available for co-investors.`
            });
          }
        } catch (coInvestmentError) {
          console.error('Error handling co-investment update:', coInvestmentError);
          // Don't throw error here, just log it
        }
      }
      
      return data;
    } catch (error) {
      console.error('Error in updateInvestmentOffer:', error);
      throw error;
    }
  }
}

// Verification function to check all table connections
export const verificationService = {
  // Get verification requests
  async getVerificationRequests() {
    console.log('Fetching verification requests...');
    try {
      const { data, error } = await supabase
        .from('verification_requests')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching verification requests:', error);
        return [];
      }
      
      console.log('Verification requests fetched successfully:', data?.length || 0);
      return data || [];
    } catch (error) {
      console.error('Error in getVerificationRequests:', error);
      return [];
    }
  },

  // Process verification request (approve/reject)
  async processVerification(requestId: number, status: 'approved' | 'rejected') {
    console.log(`Processing verification request ${requestId} with status ${status}`);
    try {
      // Get the verification request to find the startup
      const { data: request, error: requestError } = await supabase
        .from('verification_requests')
        .select('*')
        .eq('id', requestId)
        .single()

      if (requestError) {
        console.error('Error fetching verification request:', requestError);
        throw requestError;
      }

      // Update startup compliance status based on verification result
      const complianceStatus = status === 'approved' ? 'Compliant' : 'Non-Compliant';
      
      const { error: updateError } = await supabase
        .from('startups')
        .update({ compliance_status: complianceStatus })
        .eq('id', request.startup_id)

      if (updateError) {
        console.error('Error updating startup compliance:', updateError);
        throw updateError;
      }

      // Delete the verification request
      const { error: deleteError } = await supabase
        .from('verification_requests')
        .delete()
        .eq('id', requestId)

      if (deleteError) {
        console.error('Error deleting verification request:', deleteError);
        throw deleteError;
      }

      console.log('Verification processed successfully');
      return { success: true, status };
    } catch (error) {
      console.error('Error in processVerification:', error);
      throw error;
    }
  },

  // Create verification request
  async createVerificationRequest(requestData: {
    startup_id: number
    startup_name: string
  }) {
    const { data, error } = await supabase
      .from('verification_requests')
      .insert({
        startup_id: requestData.startup_id,
        startup_name: requestData.startup_name,
        request_date: new Date().toISOString().split('T')[0]
      })
      .select()
      .single()

    if (error) throw error
    return data
  },

  // Delete verification request
  async deleteVerificationRequest(requestId: number) {
    const { error } = await supabase
      .from('verification_requests')
      .delete()
      .eq('id', requestId)

    if (error) throw error
  },

  // Verify all table connections and column names
  async verifyDatabaseConnections() {
    console.log('Verifying database connections...');
    const results = {
      users: false,
      startups: false,
      founders: false,
      new_investments: false,
      investment_offers: false,
      verification_requests: false,
      startup_addition_requests: false,
      financial_records: false,
      employees: false
    };

    try {
      // Test users table
      const { data: users, error: usersError } = await supabase.from('users').select('count').limit(1);
      results.users = !usersError;
      console.log('Users table:', usersError ? '❌' : '✅');

      // Test startups table
      const { data: startups, error: startupsError } = await supabase.from('startups').select('count').limit(1);
      results.startups = !startupsError;
      console.log('Startups table:', startupsError ? '❌' : '✅');

      // Test founders table
      const { data: founders, error: foundersError } = await supabase.from('founders').select('count').limit(1);
      results.founders = !foundersError;
      console.log('Founders table:', foundersError ? '❌' : '✅');

      // Test new_investments table
      const { data: newInvestments, error: newInvestmentsError } = await supabase.from('new_investments').select('count').limit(1);
      results.new_investments = !newInvestmentsError;
      console.log('New investments table:', newInvestmentsError ? '❌' : '✅');

      // Test investment_offers table
      const { data: investmentOffers, error: investmentOffersError } = await supabase.from('investment_offers').select('count').limit(1);
      results.investment_offers = !investmentOffersError;
      console.log('Investment offers table:', investmentOffersError ? '❌' : '✅');

      // Test verification_requests table
      const { data: verificationRequests, error: verificationRequestsError } = await supabase.from('verification_requests').select('count').limit(1);
      results.verification_requests = !verificationRequestsError;
      console.log('Verification requests table:', verificationRequestsError ? '❌' : '✅');

      // Test startup_addition_requests table
      const { data: startupAdditionRequests, error: startupAdditionRequestsError } = await supabase.from('startup_addition_requests').select('count').limit(1);
      results.startup_addition_requests = !startupAdditionRequestsError;
      console.log('Startup addition requests table:', startupAdditionRequestsError ? '❌' : '✅');

      // Test financial_records table
      const { data: financialRecords, error: financialRecordsError } = await supabase.from('financial_records').select('count').limit(1);
      results.financial_records = !financialRecordsError;
      console.log('Financial records table:', financialRecordsError ? '❌' : '✅');

      // Test employees table
      const { data: employees, error: employeesError } = await supabase.from('employees').select('count').limit(1);
      results.employees = !employeesError;
      console.log('Employees table:', employeesError ? '❌' : '✅');

      const allConnected = Object.values(results).every(result => result);
      console.log(`Database verification complete: ${allConnected ? '✅ All tables connected' : '❌ Some tables failed'}`);
      
      return { success: allConnected, results };
    } catch (error) {
      console.error('Error verifying database connections:', error);
      return { success: false, error: error.message };
    }
  }
}

// Startup Addition Request Management
export const startupAdditionService = {
  // Clean up orphaned startup addition requests
  async cleanupOrphanedRequests() {
    console.log('🧹 Cleaning up orphaned startup addition requests...');
    try {
      // Find requests that don't have corresponding investments
      const { data: orphanedRequests, error: fetchError } = await supabase
        .from('startup_addition_requests')
        .select('*');

      if (fetchError) throw fetchError;

      let cleanedCount = 0;
      for (const request of orphanedRequests || []) {
        // Check if there's a corresponding investment record
        const { data: investment, error: checkError } = await supabase
          .from('investment_records')
          .select('id')
          .eq('investor_code', request.investor_code)
          .eq('startup_id', (await supabase
            .from('startups')
            .select('id')
            .eq('name', request.name)
            .single()
          ).data?.id)
          .single();

        if (checkError && checkError.code !== 'PGRST116') { // PGRST116 = no rows returned
          console.warn('Error checking investment for request:', checkError);
          continue;
        }

        // If no investment found, delete the orphaned request
        if (!investment) {
          const { error: deleteError } = await supabase
            .from('startup_addition_requests')
            .delete()
            .eq('id', request.id);

          if (deleteError) {
            console.warn('Could not delete orphaned request:', deleteError);
          } else {
            cleanedCount++;
          }
        }
      }

      console.log(`✅ Cleaned up ${cleanedCount} orphaned startup addition requests`);
      return cleanedCount;
    } catch (error) {
      console.error('Error cleaning up orphaned requests:', error);
      throw error;
    }
  },

  // Create startup addition request
  async createStartupAdditionRequest(requestData: {
    name: string;
    investment_type: string;
    investment_value: number;
    equity_allocation: number;
    sector: string;
    total_funding: number;
    total_revenue: number;
    registration_date: string;
    investor_code: string;
    status?: string;
  }) {
    console.log('Creating startup addition request:', requestData);
    try {
      const { data, error } = await supabase
        .from('startup_addition_requests')
        .insert({
          name: requestData.name,
          investment_type: requestData.investment_type,
          investment_value: requestData.investment_value,
          equity_allocation: requestData.equity_allocation,
          sector: requestData.sector,
          total_funding: requestData.total_funding,
          total_revenue: requestData.total_revenue,
          registration_date: requestData.registration_date,
          investor_code: requestData.investor_code,
          status: requestData.status || 'pending'
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating startup addition request:', error);
        throw error;
      }

      console.log('Startup addition request created successfully:', data);
      return data;
    } catch (error) {
      console.error('Error in createStartupAdditionRequest:', error);
      throw error;
    }
  },

  // Accept startup addition request (link to existing startup)
  async acceptStartupRequest(requestId: number) {
    console.log(`Accepting startup addition request ${requestId}`);
    try {
      // Get the request data
      const { data: request, error: requestError } = await supabase
        .from('startup_addition_requests')
        .select('*')
        .eq('id', requestId)
        .single()

      if (requestError) {
        console.error('Error fetching startup addition request:', requestError);
        throw requestError;
      }

      // Find the EXISTING startup instead of creating a new one
      const { data: existingStartup, error: startupError } = await supabase
        .from('startups')
        .select('*')
        .eq('name', request.name)
        .single()

      if (startupError) {
        console.error('Error finding existing startup:', startupError);
        throw new Error(`Startup "${request.name}" not found. Cannot accept request.`);
      }

      if (!existingStartup) {
        throw new Error(`Startup "${request.name}" not found. Cannot accept request.`);
      }

      console.log('Found existing startup:', existingStartup);

      // Mark request as approved (keeps portfolio link)
      console.log('🔍 Updating request status to approved:', {
        requestId,
        requestName: request.name,
        investorCode: request.investor_code,
        currentStatus: request.status
      });
      
      const { data: updatedRequest, error: updateReqError } = await supabase
        .from('startup_addition_requests')
        .update({ status: 'approved' })
        .eq('id', requestId)
        .select()
        .single();

      if (updateReqError) {
        console.error('❌ Error updating request status:', updateReqError);
        throw updateReqError;
      }

      // Verify the update was successful
      if (!updatedRequest || updatedRequest.status !== 'approved') {
        console.error('❌ Request status update verification failed:', {
          updatedRequest,
          expectedStatus: 'approved',
          actualStatus: updatedRequest?.status
        });
        throw new Error('Failed to update request status to approved');
      }

      console.log('✅ Request status updated successfully:', {
        id: updatedRequest.id,
        name: updatedRequest.name,
        status: updatedRequest.status,
        investorCode: updatedRequest.investor_code
      });

      // Verify the status persisted correctly
      const { data: verifyRequest, error: verifyError } = await supabase
        .from('startup_addition_requests')
        .select('id, name, status, investor_code')
        .eq('id', requestId)
        .single();

      if (verifyError) {
        console.error('❌ Error verifying request status:', verifyError);
      } else {
        console.log('✅ Verified request status in database:', {
          id: verifyRequest?.id,
          name: verifyRequest?.name,
          status: verifyRequest?.status,
          investorCode: verifyRequest?.investor_code
        });
      }

      // Create investment record if request has investment data
      if (request.investment_value && request.investment_value > 0 && request.investor_code) {
        try {
          console.log('🔍 Creating investment record for approved request');
          
          // Get current user info for investor name
          const { data: { user } } = await supabase.auth.getUser();
          const { data: userData } = await supabase
            .from('users')
            .select('name, email')
            .eq('id', user?.id)
            .single();
          
          const investorName = userData?.name || userData?.email || 'Unknown Investor';
          
          // Calculate pre-money valuation (if equity is provided)
          let preMoneyValuation = null;
          if (request.equity_allocation && request.equity_allocation > 0 && request.investment_value > 0) {
            // pre_money = (investment / equity%) * (1 - equity%)
            preMoneyValuation = (request.investment_value / (request.equity_allocation / 100)) * (1 - (request.equity_allocation / 100));
          }
          
          const { error: investmentRecordError } = await supabase
            .from('investment_records')
            .insert({
              startup_id: existingStartup.id,
              date: request.registration_date || new Date().toISOString().split('T')[0],
              investor_type: 'Investor',
              investment_type: 'Equity', // investment_round_type enum only accepts 'Equity', 'Debt', or 'Grant'
              investor_name: investorName,
              investor_code: request.investor_code,
              amount: request.investment_value,
              equity_allocated: request.equity_allocation || 0,
              pre_money_valuation: preMoneyValuation,
              proof_url: null
            });
          
          if (investmentRecordError) {
            console.error('⚠️ Error creating investment record (non-critical):', investmentRecordError);
            // Don't throw here - request approval succeeded, investment record is optional
          } else {
            console.log('✅ Investment record created successfully');
          }
        } catch (error) {
          console.error('⚠️ Error creating investment record (non-critical):', error);
          // Don't throw - request approval succeeded
        }
      }

      console.log('Startup addition request accepted successfully - linked to existing startup');
      return existingStartup; // Return the existing startup, not a new one
    } catch (error) {
      console.error('Error in acceptStartupRequest:', error);
      throw error;
    }
  }
}

// Financial Records Management
export const financialService = {
  // Get startup financial records
  async getStartupFinancialRecords(startupId: number) {
    const { data, error } = await supabase
      .from('financial_records')
      .select('*')
      .eq('startup_id', startupId)
      .order('date', { ascending: false })

    if (error) throw error
    return data
  },

  // Add financial record
  async addFinancialRecord(recordData: {
    startup_id: number
    date: string
    entity: string
    description: string
    vertical: string
    amount: number
    funding_source?: string
    cogs?: number
    attachment_url?: string
  }) {
    // Import and validate financial record date (no future dates allowed)
    const { validateFinancialRecordDate } = await import('./dateValidation');
    const dateValidation = validateFinancialRecordDate(recordData.date);
    if (!dateValidation.isValid) {
      throw new Error(dateValidation.error);
    }

    const { data, error } = await supabase
      .from('financial_records')
      .insert(recordData)
      .select()
      .single()

    if (error) throw error
    return data
  }
}

// Employee Management
export const employeeService = {
  // Get startup employees
  async getStartupEmployees(startupId: number) {
    const { data, error } = await supabase
      .from('employees')
      .select('*')
      .eq('startup_id', startupId)
      .order('joining_date', { ascending: false })

    if (error) throw error
    return data
  },

  // Add employee
  async addEmployee(employeeData: {
    startup_id: number
    name: string
    joining_date: string
    entity: string
    department: string
    salary: number
    esop_allocation?: number
    allocation_type?: EsopAllocationType
    esop_per_allocation?: number
    contract_url?: string
  }) {
    // Import and validate joining date (no future dates allowed)
    const { validateJoiningDate } = await import('./dateValidation');
    const dateValidation = validateJoiningDate(employeeData.joining_date);
    if (!dateValidation.isValid) {
      throw new Error(dateValidation.error);
    }

    // Validation: Check if employee joining date is before company registration date
    const { data: startupData, error: startupError } = await supabase
      .from('startups')
      .select('registration_date')
      .eq('id', employeeData.startup_id)
      .single()

    if (startupError) throw startupError

    if (startupData?.registration_date && employeeData.joining_date) {
      const joiningDate = new Date(employeeData.joining_date)
      const registrationDate = new Date(startupData.registration_date)
      
      if (joiningDate < registrationDate) {
        throw new Error(`Employee joining date cannot be before the company registration date (${startupData.registration_date}). Please select a date on or after the registration date.`)
      }
    }

    const { data, error } = await supabase
      .from('employees')
      .insert(employeeData)
      .select()
      .single()

    if (error) throw error
    return data
  }
}

// Analytics and Reporting
export const analyticsService = {
  // Get user growth data
  async getUserGrowthData() {
    const { data, error } = await supabase
      .from('users')
      .select('registration_date, role')
      .order('registration_date', { ascending: true })

    if (error) throw error
    return data
  },

  // Get portfolio distribution by sector
  async getPortfolioDistribution() {
    const { data, error } = await supabase
      .from('startups')
      .select('sector')

    if (error) throw error
    return data
  },

  // Get compliance statistics
  async getComplianceStats() {
    const { data, error } = await supabase
      .from('startups')
      .select('compliance_status')

    if (error) throw error
    return data
  }
}

// Real-time subscriptions
export const realtimeService = {
  // Subscribe to new investment opportunities
  subscribeToNewInvestments(callback: (payload: any) => void) {
    return supabase
      .channel('new_investments')
      .on('postgres_changes', 
        { event: 'INSERT', schema: 'public', table: 'new_investments' },
        callback
      )
      .subscribe()
  },

  // Subscribe to investment offers
  subscribeToInvestmentOffers(callback: (payload: any) => void) {
    return supabase
      .channel('investment_offers')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'investment_offers' },
        callback
      )
      .subscribe()
  },

  // Subscribe to verification requests
  subscribeToVerificationRequests(callback: (payload: any) => void) {
    return supabase
      .channel('verification_requests')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'verification_requests' },
        callback
      )
      .subscribe()
  }
}
