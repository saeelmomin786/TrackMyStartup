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
  async acceptInvestmentAdvisorRequest(userId: string, financialMatrix: any) {
    console.log('Accepting investment advisor request for user:', userId);
    console.log('🔍 Financial matrix:', financialMatrix);
    try {
      // Validate and clean financial matrix data
      const cleanFinancialMatrix = {
        minimum_investment: financialMatrix.minimumInvestment ? parseFloat(financialMatrix.minimumInvestment) : null,
        maximum_investment: financialMatrix.maximumInvestment ? parseFloat(financialMatrix.maximumInvestment) : null,
        success_fee: financialMatrix.successFee ? parseFloat(financialMatrix.successFee) : null,
        success_fee_type: financialMatrix.successFeeType || 'percentage',
        scouting_fee: financialMatrix.scoutingFee ? parseFloat(financialMatrix.scoutingFee) : null
      };

      // Validate success fee based on type
      if (cleanFinancialMatrix.success_fee !== null) {
        if (cleanFinancialMatrix.success_fee_type === 'percentage') {
          if (cleanFinancialMatrix.success_fee < 0 || cleanFinancialMatrix.success_fee > 100) {
            throw new Error('Success fee percentage must be between 0 and 100');
          }
        } else if (cleanFinancialMatrix.success_fee_type === 'fixed') {
          if (cleanFinancialMatrix.success_fee < 0) {
            throw new Error('Success fee amount must be positive');
          }
        }
      }

      console.log('🔍 Cleaned financial matrix:', cleanFinancialMatrix);

      const { data, error } = await supabase
        .from('users')
        .update({
          advisor_accepted: true,
          minimum_investment: cleanFinancialMatrix.minimum_investment,
          maximum_investment: cleanFinancialMatrix.maximum_investment,
          success_fee: cleanFinancialMatrix.success_fee,
          success_fee_type: cleanFinancialMatrix.success_fee_type,
          scouting_fee: cleanFinancialMatrix.scouting_fee,
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

      // Use the SECURITY DEFINER function to bypass RLS
      const { data: userData, error: userError } = await supabase
        .rpc('accept_startup_advisor_request', {
          p_user_id: userId,
          p_advisor_id: (await supabase.auth.getUser()).data.user?.id,
          p_financial_matrix: cleanFinancialMatrix
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

      // Create investment offers for the startup
      console.log('💰 Creating investment offers for startup:', startupId);
      try {
        // Get the startup details
        const { data: startupData, error: startupError } = await supabase
          .from('startups')
          .select('name, user_id')
          .eq('id', startupId)
          .single();

        if (startupError) {
          console.error('Error fetching startup data:', startupError);
        } else if (startupData) {
          // Get the advisor details
          const { data: advisorData, error: advisorError } = await supabase
            .from('users')
            .select('name, email, investment_advisor_code')
            .eq('id', (await supabase.auth.getUser()).data.user?.id)
            .single();

          if (!advisorError && advisorData) {
            // Create investment offers for the startup
            const { data: offerData, error: offerError } = await supabase
              .from('investment_offers')
              .insert({
                startup_id: startupId,
                startup_name: startupData.name,
                investor_email: advisorData.email,
                investor_name: advisorData.name,
                offer_amount: cleanFinancialMatrix.minimum_investment || 0,
                equity_percentage: 0, // Will be set when actual offers are made
                status: 'pending',
                created_at: new Date().toISOString()
              })
              .select();

            if (offerError) {
              console.error('Error creating investment offer:', offerError);
            } else {
              console.log('✅ Investment offer created successfully:', offerData);
            }
          }
        }
      } catch (offerCreationError) {
        console.error('Error in investment offer creation:', offerCreationError);
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
    startup_id: number
    offer_amount: number
    equity_percentage: number
    currency?: string
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
      const pendingOffer = existingOffers.find(offer => 
        offer.status === 'pending' || 
        offer.status === 'pending_investor_advisor_approval' ||
        offer.status === 'pending_startup_advisor_approval' ||
        offer.status === 'investor_advisor_approved' ||
        offer.status === 'startup_advisor_approved'
      );
      if (pendingOffer) {
        console.error('User already has a pending offer for this startup');
        throw new Error('You already have a pending offer for this startup');
      }
      
      // If there are rejected offers, delete them to allow new offers
      const rejectedOffers = existingOffers.filter(offer => 
        offer.status === 'rejected' || 
        offer.status === 'investor_advisor_rejected' ||
        offer.status === 'startup_advisor_rejected'
      );
      
      if (rejectedOffers.length > 0) {
        console.log('Deleting rejected offers to allow new offer:', rejectedOffers);
        for (const rejectedOffer of rejectedOffers) {
          await supabase
            .from('investment_offers')
            .delete()
            .eq('id', rejectedOffer.id);
        }
      }
    }
    
    // Use the simple function to create offer without scouting fees
    const { data, error } = await supabase.rpc('create_investment_offer_with_fee', {
      p_investor_email: offerData.investor_email,
      p_startup_name: offerData.startup_name,
      p_startup_id: offerData.startup_id,
      p_offer_amount: offerData.offer_amount,
      p_equity_percentage: offerData.equity_percentage,
      p_currency: offerData.currency || 'USD'
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
    
    console.log('Investment offer created successfully:', createdOffer);
    console.log('🔍 Created offer details:', {
      id: createdOffer?.id,
      offer_amount: createdOffer?.offer_amount,
      equity_percentage: createdOffer?.equity_percentage,
      currency: createdOffer?.currency,
      created_at: createdOffer?.created_at,
      startup_name: createdOffer?.startup_name,
      investor_email: createdOffer?.investor_email
    });
    
    // Ensure the returned data has proper formatting
    const formattedOffer = {
      ...createdOffer,
      offer_amount: Number(createdOffer?.offer_amount) || 0,
      equity_percentage: Number(createdOffer?.equity_percentage) || 0,
      created_at: createdOffer?.created_at ? new Date(createdOffer.created_at).toISOString() : new Date().toISOString()
    };
    
    console.log('🔍 Formatted offer for return:', formattedOffer);
    
    // Handle investment flow logic after creating the offer
    if (createdOffer && createdOffer.id) {
      await this.handleInvestmentFlow(createdOffer.id);
    }
    
    return formattedOffer;
  },

  // Get user's investment offers
  async getUserOffers(userEmail: string) {
    console.log('🔍 Fetching offers for investor:', userEmail);
    
    const { data, error } = await supabase
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

    if (error) {
      console.error('Error fetching investor offers:', error);
      throw error;
    }

    console.log('🔍 Raw investor offers data:', data);

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
    return enhancedData;
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
      const { data, error } = await supabase.rpc('approve_investor_advisor_offer', {
        p_offer_id: offerId,
        p_approval_action: action
      });

      if (error) {
        console.error('Error in approveInvestorAdvisorOffer:', error);
        throw error;
      }

      console.log('✅ Investor advisor approval result:', data);
      return data;
    } catch (error) {
      console.error('Error approving investor advisor offer:', error);
      throw error;
    }
  },

  // Approve/reject offer by startup advisor
  async approveStartupAdvisorOffer(offerId: number, action: 'approve' | 'reject') {
    try {
      const { data, error } = await supabase.rpc('approve_startup_advisor_offer', {
        p_offer_id: offerId,
        p_approval_action: action
      });

      if (error) {
        console.error('Error in approveStartupAdvisorOffer:', error);
        throw error;
      }

      console.log('✅ Startup advisor approval result:', data);
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
      const { data: offer, error: offerError } = await supabase
        .from('investment_offers')
        .select(`
          *,
          investor:users!investment_offers_investor_email_fkey(
            id,
            email,
            name,
            investor_code,
            investment_advisor_code
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
      if (currentStage === 1) {
        const investorAdvisorCode = offer.investor?.investment_advisor_code;
        if (investorAdvisorCode) {
          console.log(`✅ Investor has advisor code: ${investorAdvisorCode}, keeping at stage 1 for advisor approval`);
          // Keep at stage 1 - will be displayed in investor's advisor dashboard
          return;
        } else {
          console.log(`❌ Investor has no advisor code, moving to stage 2`);
          // Move to stage 2
          await this.updateInvestmentOfferStage(offerId, 2);
        }
      }

      // Stage 2: Check if startup has investment advisor code
      if (currentStage === 2) {
        const startupAdvisorCode = offer.startup?.investment_advisor_code;
        if (startupAdvisorCode) {
          console.log(`✅ Startup has advisor code: ${startupAdvisorCode}, keeping at stage 2 for advisor approval`);
          // Keep at stage 2 - will be displayed in startup's advisor dashboard
          return;
        } else {
          console.log(`❌ Startup has no advisor code, moving to stage 3`);
          // Move to stage 3
          await this.updateInvestmentOfferStage(offerId, 3);
        }
      }

      // Stage 3: Display to startup (no further automatic progression)
      if (currentStage === 3) {
        console.log(`✅ Offer is at stage 3, ready for startup review`);
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
      const visibleOffers = (data || []).filter(offer => {
        const stage = offer.stage || 1;
        const startupHasAdvisor = offer.startup?.investment_advisor_code;
        
        // Show offers that are ready for startup review
        if (stage >= 3) {
          return true; // Stage 3+ are always visible
        }
        
        // For stage 1: show if investor has no advisor (auto-progresses)
        // We'll check investor advisor status separately
        if (stage === 1) {
          return true; // Show all stage 1 offers, we'll check advisor status later
        }
        
        // For stage 2: show if startup has no advisor (auto-progresses)
        if (stage === 2 && !startupHasAdvisor) {
          return true;
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

  // Get investment offers for specific user
  async getUserInvestmentOffers(userEmail: string) {
    console.log('🔍 Fetching investment offers for user:', userEmail);
    try {
      const { data, error } = await supabase
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

      if (error) {
        console.error('Error fetching user investment offers:', error);
        return [];
      }
      
      console.log('🔍 User investment offers fetched successfully:', data?.length || 0);
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
        stage: offer.stage || 1
      }));
      
      // Debug: Log mapped data
      if (mappedData && mappedData.length > 0) {
        console.log('🔍 Mapped offer data:', mappedData[0]);
        console.log('🔍 Mapped offer amount:', mappedData[0].offerAmount);
        console.log('🔍 Mapped equity percentage:', mappedData[0].equityPercentage);
        console.log('🔍 Mapped currency:', mappedData[0].currency);
        console.log('🔍 Mapped created at:', mappedData[0].createdAt);
      }
      
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
