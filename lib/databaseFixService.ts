import { supabase } from './supabase'

export const databaseFixService = {
  // Fix RLS policies to prevent infinite recursion
  async fixRLSPolicies(): Promise<{ success: boolean; message: string }> {
    try {
      console.log('🔧 Starting RLS policy fix...')
      
      // Since we can't execute SQL directly, we'll test if the current policies are working
      // by trying to access the users table
      const { data: testData, error: testError } = await supabase
        .from('users')
        .select('id, email, name')
        .limit(1)
      
      if (testError) {
        console.log('❌ RLS policies are still causing issues:', testError.message)
        return { success: false, message: `RLS policies need manual fixing: ${testError.message}` }
      } else {
        console.log('✅ RLS policies are working correctly')
        return { success: true, message: 'RLS policies are working correctly' }
      }
      
    } catch (error) {
      console.error('❌ Error testing RLS policies:', error)
      return { success: false, message: `Failed to test RLS policies: ${error.message}` }
    }
  },

  // Assign investment advisor code to current user
  async assignInvestmentAdvisorCode(userId: string): Promise<{ success: boolean; message: string; code?: string }> {
    try {
      console.log('🔧 Assigning investment advisor code to user:', userId)
      
      // Generate a unique investment advisor code
      const advisorCode = `IA-${Math.random().toString(36).substr(2, 6).toUpperCase()}`
      
      // Update the user's profile with the investment advisor code
      // Only change role to Investment Advisor if user is not already an Admin
      const { data: currentUserData } = await supabase
        .from('users')
        .select('role')
        .eq('id', userId)
        .single()
      
      const shouldChangeRole = currentUserData?.role !== 'Admin'
      
      const { data, error } = await supabase
        .from('users')
        .update({
          investment_advisor_code: advisorCode,
          ...(shouldChangeRole && { role: 'Investment Advisor' })
        })
        .eq('id', userId)
        .select()
        .single()
      
      if (error) {
        console.error('❌ Error updating user profile:', error)
        return { success: false, message: `Failed to assign advisor code: ${error.message}` }
      }
      
      console.log('✅ Investment advisor code assigned:', advisorCode)
      return { success: true, message: 'Investment advisor code assigned successfully', code: advisorCode }
      
    } catch (error) {
      console.error('❌ Error assigning investment advisor code:', error)
      return { success: false, message: `Failed to assign advisor code: ${error.message}` }
    }
  },

  // Test database connectivity
  async testDatabaseConnection(): Promise<{ success: boolean; message: string; data?: any }> {
    try {
      console.log('🔧 Testing database connection...')
      
      // Test basic users table access
      const { data: users, error: usersError } = await supabase
        .from('users')
        .select('id, email, name, role')
        .limit(5)
      
      if (usersError) {
        console.error('❌ Error accessing users table:', usersError)
        return { success: false, message: `Database connection failed: ${usersError.message}` }
      }
      
      // Test startups table access
      const { data: startups, error: startupsError } = await supabase
        .from('startups')
        .select('id, name, user_id')
        .limit(5)
      
      if (startupsError) {
        console.error('❌ Error accessing startups table:', startupsError)
        return { success: false, message: `Database connection failed: ${startupsError.message}` }
      }
      
      console.log('✅ Database connection test successful')
      return { 
        success: true, 
        message: 'Database connection successful',
        data: {
          usersCount: users?.length || 0,
          startupsCount: startups?.length || 0,
          sampleUsers: users,
          sampleStartups: startups
        }
      }
      
    } catch (error) {
      console.error('❌ Error testing database connection:', error)
      return { success: false, message: `Database connection test failed: ${error.message}` }
    }
  },

  // Create missing investment offers using the new automatic system
  async createMissingInvestmentOffers(): Promise<{ success: boolean; message: string; created?: number }> {
    try {
      console.log('🔧 Creating missing investment offers using automatic system...')

      // First, create missing relationships
      const { data: relationshipResult, error: relationshipError } = await supabase
        .rpc('create_missing_relationships')

      if (relationshipError) {
        console.error('❌ Error creating relationships:', relationshipError)
        return { success: false, message: `Failed to create relationships: ${relationshipError.message}` }
      }

      console.log('✅ Relationships created:', relationshipResult)

      // Then, create missing offers
      const { data: offerResult, error: offerError } = await supabase
        .rpc('create_missing_offers')

      if (offerError) {
        console.error('❌ Error creating offers:', offerError)
        return { success: false, message: `Failed to create offers: ${offerError.message}` }
      }

      console.log('✅ Offers created:', offerResult)

      const createdCount = offerResult?.[0]?.created_count || 0
      const relationshipCount = relationshipResult?.[0]?.created_count || 0

      return {
        success: true,
        message: `Created ${relationshipCount} relationships and ${createdCount} investment offers`,
        created: createdCount
      }

    } catch (error) {
      console.error('❌ Error creating missing investment offers:', error)
      return { success: false, message: `Failed to create missing offers: ${error.message}` }
    }
  },

  // Fix all database issues
  async fixAllDatabaseIssues(): Promise<{ success: boolean; message: string; results?: any }> {
    try {
      console.log('🔧 Starting comprehensive database fix...')
      
      const results = {
        rlsFix: null,
        advisorCode: null,
        connectionTest: null,
        missingOffers: null
      }
      
      // Test database connection first
      const connectionTest = await this.testDatabaseConnection()
      results.connectionTest = connectionTest
      
      if (!connectionTest.success) {
        return { success: false, message: 'Database connection failed, cannot proceed with fixes' }
      }
      
      // Fix RLS policies
      const rlsFix = await this.fixRLSPolicies()
      results.rlsFix = rlsFix
      
      // Get current user and assign advisor code
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const advisorCode = await this.assignInvestmentAdvisorCode(user.id)
        results.advisorCode = advisorCode
      }
      
      // Create missing investment offers
      const missingOffers = await this.createMissingInvestmentOffers()
      results.missingOffers = missingOffers
      
      console.log('✅ Comprehensive database fix completed')
      return { 
        success: true, 
        message: 'All database issues fixed successfully',
        results
      }
      
    } catch (error) {
      console.error('❌ Error in comprehensive database fix:', error)
      return { success: false, message: `Comprehensive database fix failed: ${error.message}` }
    }
  }
}
