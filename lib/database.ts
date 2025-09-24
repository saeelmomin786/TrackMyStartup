import { supabase } from './supabase'
import { UserRole, InvestmentType, ComplianceStatus, InvestorType, InvestmentRoundType, EsopAllocationType, OfferStatus } from '../types'

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
      .single()

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
  async acceptInvestmentAdvisorRequest(userId: string, financialMatrix: any) {
    console.log('Accepting investment advisor request for user:', userId);
    try {
      const { data, error } = await supabase
        .from('users')
        .update({
          advisor_accepted: true,
          minimum_investment: financialMatrix.minimumInvestment,
          maximum_investment: financialMatrix.maximumInvestment,
          success_fee: financialMatrix.successFee,
          success_fee_type: financialMatrix.successFeeType,
          scouting_fee: financialMatrix.scoutingFee,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId)
        .select()
        .single()

      if (error) {
        console.error('Error accepting investment advisor request:', error)
        throw error
      }
      
      console.log('Investment advisor request accepted successfully:', data);
      return data
    } catch (error) {
      console.error('Error in acceptInvestmentAdvisorRequest:', error)
      throw error
    }
  },

  // Accept startup advisor request
  async acceptStartupAdvisorRequest(startupId: number, userId: string, financialMatrix: any) {
    console.log('Accepting startup advisor request for startup:', startupId, 'user:', userId);
    console.log('🔍 Original financial matrix:', financialMatrix);
    try {
      // Validate and clean financial matrix data
      const cleanFinancialMatrix = {
        minimum_investment: financialMatrix.minimumInvestment ? parseFloat(financialMatrix.minimumInvestment) : null,
        maximum_investment: financialMatrix.maximumInvestment ? parseFloat(financialMatrix.maximumInvestment) : null,
        success_fee: financialMatrix.successFee ? parseFloat(financialMatrix.successFee) : null,
        success_fee_type: financialMatrix.successFeeType || null,
        scouting_fee: financialMatrix.scoutingFee ? parseFloat(financialMatrix.scoutingFee) : null
      };

      console.log('🔍 Cleaned financial matrix:', cleanFinancialMatrix);
      console.log('🔍 User ID to update:', userId);

      // Update the user's advisor acceptance status
      const updateData = {
        advisor_accepted: true,
        advisor_accepted_date: new Date().toISOString(),
        minimum_investment: cleanFinancialMatrix.minimum_investment,
        maximum_investment: cleanFinancialMatrix.maximum_investment,
        success_fee: cleanFinancialMatrix.success_fee,
        success_fee_type: cleanFinancialMatrix.success_fee_type,
        scouting_fee: cleanFinancialMatrix.scouting_fee,
        updated_at: new Date().toISOString()
      };
      
      console.log('🔍 Update data being sent:', updateData);

      const { data: userData, error: userError } = await supabase
        .from('users')
        .update(updateData)
        .eq('id', userId)
        .select()
        .single()

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
      
      console.log('🚨🚨🚨 DATABASE DEBUGGING - STARTUP DATA 🚨🚨🚨');
      console.log('Startups fetched successfully:', data?.length || 0);
      console.log('🔍 Raw startup data with shares:', data);
      console.log('🔍 First startup founders:', data?.[0]?.founders);
      console.log('🔍 First startup startup_shares:', data?.[0]?.startup_shares);
      console.log('🚨🚨🚨 END DATABASE DEBUGGING 🚨🚨🚨');
      
      // Map database fields to frontend expected format
      const mappedData = (data || []).map(startup => ({
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
        currency: startup.currency || 'USD', // Include currency field
        founders: startup.founders || [],
        // Include shares data from startup_shares table
        esopReservedShares: startup.startup_shares?.[0]?.esop_reserved_shares || 0
      }));
      
      console.log('🔍 Mapped startup data with ESOP:', mappedData);
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
        esopReservedShares: startup.startup_shares?.[0]?.esop_reserved_shares || 0
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
      
      // If no data in database, populate it with mock data
      if (!data || data.length === 0) {
        console.log('No investments found in database, populating with mock data...');
        const populated = await this.populateNewInvestments();
        if (populated) {
          // Fetch again after populating
          const { data: newData, error: newError } = await supabase
            .from('new_investments')
            .select('*')
            .order('created_at', { ascending: false })
          
          if (newError) {
            console.error('Error fetching new investments after population:', newError);
            return [];
          }
          
          data = newData;
          console.log('New investments fetched after population:', data?.length || 0);
        }
      }
      
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

  // Create investment offer with scouting fee
  async createInvestmentOffer(offerData: {
    investor_email: string
    startup_name: string
    startup_id: number
    offer_amount: number
    equity_percentage: number
    country?: string
    startup_amount_raised?: number
  }) {
    console.log('Creating investment offer with data:', offerData);
    
    // Check what startup ID we're trying to reference
    console.log('Trying to reference startup_id:', offerData.startup_id);
    
    // First, check if the startup_id exists in startups table
    const { data: startupCheck, error: checkError } = await supabase
      .from('startups')
      .select('id')
      .eq('id', offerData.startup_id)
      .single();
    
    if (checkError || !startupCheck) {
      console.error('Startup not found in startups table:', offerData.startup_id);
      throw new Error(`Startup with ID ${offerData.startup_id} not found in startups table`);
    }
    
    // Check if user already has a pending offer for this startup
    const { data: existingOffers, error: existingError } = await supabase
      .from('investment_offers')
      .select('id, status')
      .eq('investor_email', offerData.investor_email)
      .eq('startup_id', offerData.startup_id);
    
    console.log('Existing offers for this user and investment:', existingOffers);
    
    if (existingOffers && existingOffers.length > 0) {
      const pendingOffer = existingOffers.find(offer => offer.status === 'pending');
      if (pendingOffer) {
        console.error('User already has a pending offer for this startup');
        throw new Error('You already have a pending offer for this startup');
      }
    }
    
    // Use the new function to create offer with scouting fee
    const { data, error } = await supabase.rpc('create_investment_offer_with_fee', {
      p_investor_email: offerData.investor_email,
      p_startup_name: offerData.startup_name,
      p_startup_id: offerData.startup_id,
      p_offer_amount: offerData.offer_amount,
      p_equity_percentage: offerData.equity_percentage,
      p_country: offerData.country || 'United States',
      p_startup_amount_raised: offerData.startup_amount_raised || 0
    });

    if (error) {
      console.error('Error creating investment offer:', error);
      console.error('Error details:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      });
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
    
    console.log('Investment offer created successfully with scouting fee:', createdOffer);
    return createdOffer;
  },

  // Get user's investment offers
  async getUserOffers(userEmail: string) {
    const { data, error } = await supabase
      .from('investment_offers')
      .select(`
        *,
        investment:new_investments(*)
      `)
      .eq('investor_email', userEmail)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data
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
    const { error } = await supabase
      .from('investment_offers')
      .delete()
      .eq('id', offerId)

    if (error) throw error
    return true
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
      
      if (investorEmails.length > 0) {
        const { data: users, error: usersError } = await supabase
          .from('users')
          .select('email, name')
          .in('email', investorEmails);
        
        if (!usersError && users) {
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
        offerAmount: offer.offer_amount,
        equityPercentage: offer.equity_percentage,
        status: offer.status,
        createdAt: offer.created_at,
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
        startup_advisor_approval_at: offer.startup_advisor_approval_at
      }));
      
      return mappedData;
    } catch (error) {
      console.error('Error in getAllInvestmentOffers:', error);
      return [];
    }
  },

  // Approve/reject offer by investor advisor
  async approveInvestorAdvisorOffer(offerId: number, action: 'approve' | 'reject') {
    const { data, error } = await supabase.rpc('approve_investor_advisor_offer', {
      p_offer_id: offerId,
      p_approval_action: action
    });

    if (error) throw error;
    return data;
  },

  // Approve/reject offer by startup advisor
  async approveStartupAdvisorOffer(offerId: number, action: 'approve' | 'reject') {
    const { data, error } = await supabase.rpc('approve_startup_advisor_offer', {
      p_offer_id: offerId,
      p_approval_action: action
    });

    if (error) throw error;
    return data;
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
        .single();

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

  // Get offers for a specific startup (by startup_id)
  async getOffersForStartup(startupId: number) {
    try {
      const { data, error } = await supabase
        .from('investment_offers')
        .select(`
          *,
          startup:startups(*)
        `)
        .eq('startup_id', startupId)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching startup offers:', error);
        return [];
      }

      // Get unique investor emails to fetch their names
      const investorEmails = [...new Set((data || []).map(offer => offer.investor_email))];
      let investorNames: { [email: string]: string } = {};
      
      if (investorEmails.length > 0) {
        const { data: users, error: usersError } = await supabase
          .from('users')
          .select('email, name')
          .in('email', investorEmails);
        
        if (!usersError && users) {
          investorNames = users.reduce((acc, user) => {
            acc[user.email] = user.name;
            return acc;
          }, {} as { [email: string]: string });
        }
      }

      const mapped = (data || []).map((offer: any) => ({
        id: offer.id,
        investorEmail: offer.investor_email,
        investorName: offer.investor_name || investorNames[offer.investor_email] || undefined,
        startupName: offer.startup_name,
        startupId: offer.startup_id,
        startup: offer.startup ? {
          id: offer.startup.id,
          name: offer.startup.name
        } : null,
        offerAmount: offer.offer_amount,
        equityPercentage: offer.equity_percentage,
        status: offer.status,
        createdAt: offer.created_at
      }));

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

  // Populate new_investments table with mock data
  async populateNewInvestments() {
    console.log('=== POPULATING new_investments table ===');
    
    // Import mock data from constants
    const mockData = [
      { id: 101, name: 'QuantumLeap', investment_type: 'Seed', investment_value: 150000, equity_allocation: 7, sector: 'DeepTech', total_funding: 150000, total_revenue: 0, registration_date: '2024-02-01', pitch_deck_url: '#', pitch_video_url: 'https://www.youtube.com/watch?v=QJ21TaeN9K0', compliance_status: 'Compliant' },
      { id: 102, name: 'AgroFuture', investment_type: 'SeriesA', investment_value: 1200000, equity_allocation: 18, sector: 'AgriTech', total_funding: 2500000, total_revenue: 400000, registration_date: '2023-08-15', pitch_deck_url: '#', pitch_video_url: 'https://www.youtube.com/watch?v=gt_l_4TfG4k', compliance_status: 'Pending' },
      { id: 103, name: 'CyberGuard', investment_type: 'SeriesB', investment_value: 3000000, equity_allocation: 10, sector: 'Cybersecurity', total_funding: 5000000, total_revenue: 1000000, registration_date: '2022-07-22', pitch_deck_url: '#', pitch_video_url: 'https://www.youtube.com/watch?v=rok_p26_Z5o', compliance_status: 'Compliant' },
      { id: 104, name: 'BioSynth', investment_type: 'Seed', investment_value: 500000, equity_allocation: 15, sector: 'BioTech', total_funding: 500000, total_revenue: 50000, registration_date: '2024-01-05', pitch_deck_url: '#', pitch_video_url: 'https://www.youtube.com/watch?v=8aGhZQkoFbQ', compliance_status: 'Compliant' },
      { id: 105, name: 'RetailNext', investment_type: 'SeriesA', investment_value: 2500000, equity_allocation: 12, sector: 'RetailTech', total_funding: 4000000, total_revenue: 800000, registration_date: '2023-05-18', pitch_deck_url: '#', pitch_video_url: 'https://www.youtube.com/watch?v=Y_N1_Jj9-KA', compliance_status: 'Pending' },
      { id: 106, name: 'GameOn', investment_type: 'Seed', investment_value: 750000, equity_allocation: 20, sector: 'Gaming', total_funding: 750000, total_revenue: 150000, registration_date: '2023-11-30', pitch_deck_url: '#', pitch_video_url: 'https://www.youtube.com/watch?v=d_HlPboL_sA', compliance_status: 'Compliant' },
      { id: 107, name: 'PropTech Pro', investment_type: 'PreSeed', investment_value: 100000, equity_allocation: 5, sector: 'Real Estate', total_funding: 100000, total_revenue: 10000, registration_date: '2024-03-01', pitch_deck_url: '#', pitch_video_url: 'https://www.youtube.com/watch?v=uK67H2PAmn8', compliance_status: 'Pending' },
      { id: 108, name: 'LogiChain', investment_type: 'SeriesA', investment_value: 1800000, equity_allocation: 9, sector: 'Logistics', total_funding: 3000000, total_revenue: 600000, registration_date: '2022-09-10', pitch_deck_url: '#', pitch_video_url: 'https://www.youtube.com/watch?v=uJg4B5a-a28', compliance_status: 'Compliant' },
      { id: 109, name: 'EduKids', investment_type: 'Seed', investment_value: 300000, equity_allocation: 10, sector: 'EdTech', total_funding: 300000, total_revenue: 60000, registration_date: '2023-10-25', pitch_deck_url: '#', pitch_video_url: 'https://www.youtube.com/watch?v=GGlY3g_2Q_E', compliance_status: 'NonCompliant' },
      { id: 110, name: 'QuantumLeap 2', investment_type: 'Seed', investment_value: 150000, equity_allocation: 7, sector: 'DeepTech', total_funding: 150000, total_revenue: 0, registration_date: '2024-02-01', pitch_deck_url: '#', pitch_video_url: 'https://www.youtube.com/watch?v=P1ww1X2-S1U', compliance_status: 'Compliant' },
      { id: 111, name: 'SpaceHaul', investment_type: 'SeriesB', investment_value: 10000000, equity_allocation: 15, sector: 'Aerospace', total_funding: 25000000, total_revenue: 500000, registration_date: '2021-12-01', pitch_deck_url: '#', pitch_video_url: 'https://www.youtube.com/watch?v=sO-tjb4Edb8', compliance_status: 'Compliant' },
      { id: 112, name: 'MindWell', investment_type: 'Seed', investment_value: 400000, equity_allocation: 12, sector: 'HealthTech', total_funding: 400000, total_revenue: 80000, registration_date: '2024-04-10', pitch_deck_url: '#', pitch_video_url: 'https://www.youtube.com/watch?v=4x7_v-2-a3I', compliance_status: 'Compliant' },
      { id: 113, name: 'CleanPlate', investment_type: 'Seed', investment_value: 200000, equity_allocation: 8, sector: 'FoodTech', total_funding: 200000, total_revenue: 40000, registration_date: '2023-09-05', pitch_deck_url: '#', pitch_video_url: 'https://www.youtube.com/watch?v=ysz5S6PUM-U', compliance_status: 'Pending' },
      { id: 114, name: 'Solaris', investment_type: 'SeriesA', investment_value: 2200000, equity_allocation: 11, sector: 'GreenTech', total_funding: 3500000, total_revenue: 700000, registration_date: '2022-11-20', pitch_deck_url: '#', pitch_video_url: 'https://www.youtube.com/watch?v=o0u4M6vppCI', compliance_status: 'Compliant' },
      { id: 115, name: 'LegalEase', investment_type: 'PreSeed', investment_value: 120000, equity_allocation: 6, sector: 'LegalTech', total_funding: 120000, total_revenue: 25000, registration_date: '2024-05-15', pitch_deck_url: '#', pitch_video_url: 'https://www.youtube.com/watch?v=J132shgI_Ns', compliance_status: 'Pending' },
      { id: 116, name: 'TravelBug', investment_type: 'Seed', investment_value: 600000, equity_allocation: 14, sector: 'TravelTech', total_funding: 600000, total_revenue: 120000, registration_date: '2023-03-12', pitch_deck_url: '#', pitch_video_url: 'https://www.youtube.com/watch?v=T_i-T58-S2E', compliance_status: 'Compliant' },
      { id: 117, name: 'DataWeave', investment_type: 'SeriesB', investment_value: 4500000, equity_allocation: 10, sector: 'Data Analytics', total_funding: 8000000, total_revenue: 1500000, registration_date: '2021-10-01', pitch_deck_url: '#', pitch_video_url: 'https://www.youtube.com/watch?v=R2vXbFp5C9o', compliance_status: 'Compliant' },
      { id: 118, name: 'AutoDrive', investment_type: 'SeriesA', investment_value: 5000000, equity_allocation: 18, sector: 'Automotive', total_funding: 10000000, total_revenue: 800000, registration_date: '2022-06-01', pitch_deck_url: '#', pitch_video_url: 'https://www.youtube.com/watch?v=uA8X54c_w18', compliance_status: 'NonCompliant' }
    ];
    
    try {
      // Clear existing data
      const { error: deleteError } = await supabase
        .from('new_investments')
        .delete()
        .neq('id', 0);
      
      if (deleteError) {
        console.error('Error clearing new_investments:', deleteError);
        return false;
      }
      
      // Insert mock data
      const { data, error } = await supabase
        .from('new_investments')
        .insert(mockData);
      
      if (error) {
        console.error('Error populating new_investments:', error);
        return false;
      }
      
      console.log('Successfully populated new_investments with', data?.length || 0, 'records');
      return true;
    } catch (error) {
      console.error('Error in populateNewInvestments:', error);
      return false;
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

  // Get investment offers for specific user
  async getUserInvestmentOffers(userEmail: string) {
    console.log('Fetching investment offers for user:', userEmail);
    try {
      const { data, error } = await supabase
        .from('investment_offers')
        .select(`
          *,
          startup:startups(*)
        `)
        .eq('investor_email', userEmail)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching user investment offers:', error);
        return [];
      }
      
      console.log('User investment offers fetched successfully:', data?.length || 0);
      
      // Map database fields to frontend expected format
      const mappedData = (data || []).map(offer => ({
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
          createdAt: offer.startup.created_at
        } : null,
        offerAmount: offer.offer_amount,
        equityPercentage: offer.equity_percentage,
        status: offer.status,
        createdAt: offer.created_at,
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
        startup_advisor_approval_at: offer.startup_advisor_approval_at
      }));
      
      return mappedData;
    } catch (error) {
      console.error('Error in getUserInvestmentOffers:', error);
      return [];
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
      const { error: updateReqError } = await supabase
        .from('startup_addition_requests')
        .update({ status: 'approved' })
        .eq('id', requestId);

      if (updateReqError) {
        console.error('Error updating request status:', updateReqError);
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
