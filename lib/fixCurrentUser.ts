import { supabase } from './supabase'

export const fixCurrentUser = {
  // Assign investment advisor code to current user
  async assignInvestmentAdvisorCode(): Promise<{ success: boolean; message: string; code?: string }> {
    try {
      console.log('🔧 Assigning investment advisor code to current user...')
      
      // Get current user
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      if (authError || !user) {
        return { success: false, message: 'No authenticated user found' }
      }
      
      // Generate a unique investment advisor code
      const advisorCode = `IA-${Math.random().toString(36).substr(2, 6).toUpperCase()}`
      
      // Update the user's profile with the investment advisor code
      // Only change role to Investment Advisor if user is not already an Admin
      const { data: currentUserData } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single()
      
      const shouldChangeRole = currentUserData?.role !== 'Admin'
      
      const { data, error } = await supabase
        .from('users')
        .update({
          investment_advisor_code: advisorCode,
          ...(shouldChangeRole && { role: 'Investment Advisor' })
        })
        .eq('id', user.id)
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

  // Test if current user can access data
  async testDataAccess(): Promise<{ success: boolean; message: string; data?: any }> {
    try {
      console.log('🔧 Testing data access for current user...')
      
      // Test users table access
      const { data: users, error: usersError } = await supabase
        .from('users')
        .select('id, email, name, role, investment_advisor_code')
        .limit(10)
      
      if (usersError) {
        console.error('❌ Error accessing users table:', usersError)
        return { success: false, message: `Users table access failed: ${usersError.message}` }
      }
      
      // Test startups table access
      const { data: startups, error: startupsError } = await supabase
        .from('startups')
        .select('id, name, user_id')
        .limit(10)
      
      if (startupsError) {
        console.error('❌ Error accessing startups table:', startupsError)
        return { success: false, message: `Startups table access failed: ${startupsError.message}` }
      }
      
      // Get current user ID
      const { data: { user } } = await supabase.auth.getUser()
      
      console.log('✅ Data access test successful')
      return { 
        success: true, 
        message: 'Data access test successful',
        data: {
          usersCount: users?.length || 0,
          startupsCount: startups?.length || 0,
          currentUser: users?.find(u => u.id === user?.id)
        }
      }
      
    } catch (error) {
      console.error('❌ Error testing data access:', error)
      return { success: false, message: `Data access test failed: ${error.message}` }
    }
  }
}
