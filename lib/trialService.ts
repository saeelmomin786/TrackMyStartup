import { supabase } from './supabase';

export interface TrialStatus {
  hasActiveTrial: boolean;
  trialStartTime: string | null;
  trialEndTime: string | null;
  minutesRemaining: number;
  hasUsedTrial: boolean;
}

export interface SubscriptionStatus {
  hasValidSubscription: boolean;
  subscriptionId: string | null;
  planName: string | null;
  status: string | null;
}

export class TrialService {
  /**
   * Start a 5-minute free trial for a user
   */
  static async startTrial(userId: string, startupId?: number): Promise<{
    success: boolean;
    trialId?: string;
    trialStartTime?: string;
    trialEndTime?: string;
    error?: string;
  }> {
    try {
      console.log('🔍 Starting 5-minute trial for user:', userId);
      
      const { data, error } = await supabase.rpc('start_user_trial', {
        user_uuid: userId,
        startup_id_param: startupId || null
      });

      if (error) {
        console.error('Error starting trial:', error);
        return { success: false, error: error.message };
      }

      if (data && data.length > 0) {
        const trial = data[0];
        console.log('✅ Trial started successfully:', trial);
        return {
          success: true,
          trialId: trial.trial_id,
          trialStartTime: trial.trial_start_time,
          trialEndTime: trial.trial_end_time
        };
      }

      return { success: false, error: 'Failed to start trial' };
    } catch (error) {
      console.error('Error in startTrial:', error);
      return { success: false, error: 'Failed to start trial' };
    }
  }

  /**
   * Check if user has an active trial
   */
  static async checkTrialStatus(userId: string): Promise<TrialStatus> {
    try {
      console.log('🔍 Checking trial status for user:', userId);
      
      const { data, error } = await supabase.rpc('check_user_trial_status', {
        user_uuid: userId
      });

      if (error) {
        console.error('Error checking trial status:', error);
        return {
          hasActiveTrial: false,
          trialStartTime: null,
          trialEndTime: null,
          minutesRemaining: 0,
          hasUsedTrial: false
        };
      }

      if (data && data.length > 0) {
        const trial = data[0];
        return {
          hasActiveTrial: trial.has_active_trial,
          trialStartTime: trial.trial_start_time,
          trialEndTime: trial.trial_end_time,
          minutesRemaining: trial.minutes_remaining,
          hasUsedTrial: false // This would need to be checked separately
        };
      }

      // Check if user has used trial before
      const { data: subscriptionData, error: subscriptionError } = await supabase
        .from('user_subscriptions')
        .select('has_used_trial')
        .eq('user_id', userId)
        .single();

      return {
        hasActiveTrial: false,
        trialStartTime: null,
        trialEndTime: null,
        minutesRemaining: 0,
        hasUsedTrial: subscriptionData?.has_used_trial || false
      };
    } catch (error) {
      console.error('Error in checkTrialStatus:', error);
      return {
        hasActiveTrial: false,
        trialStartTime: null,
        trialEndTime: null,
        minutesRemaining: 0,
        hasUsedTrial: false
      };
    }
  }

  /**
   * End a user's trial
   */
  static async endTrial(userId: string): Promise<boolean> {
    try {
      console.log('🔍 Ending trial for user:', userId);
      
      const { data, error } = await supabase.rpc('end_user_trial', {
        user_uuid: userId
      });

      if (error) {
        console.error('Error ending trial:', error);
        return false;
      }

      console.log('✅ Trial ended successfully');
      return true;
    } catch (error) {
      console.error('Error in endTrial:', error);
      return false;
    }
  }

  /**
   * Check if user has valid subscription
   */
  static async checkSubscriptionStatus(userId: string): Promise<SubscriptionStatus> {
    try {
      console.log('🔍 Checking subscription status for user:', userId);
      
      const { data, error } = await supabase.rpc('check_user_subscription_status', {
        user_uuid: userId
      });

      if (error) {
        console.error('Error checking subscription status:', error);
        return {
          hasValidSubscription: false,
          subscriptionId: null,
          planName: null,
          status: null
        };
      }

      if (data && data.length > 0) {
        const subscription = data[0];
        return {
          hasValidSubscription: subscription.has_valid_subscription,
          subscriptionId: subscription.subscription_id,
          planName: subscription.plan_name,
          status: subscription.status
        };
      }

      return {
        hasValidSubscription: false,
        subscriptionId: null,
        planName: null,
        status: null
      };
    } catch (error) {
      console.error('Error in checkSubscriptionStatus:', error);
      return {
        hasValidSubscription: false,
        subscriptionId: null,
        planName: null,
        status: null
      };
    }
  }

  /**
   * Get subscription plans
   */
  static async getSubscriptionPlans(): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('subscription_plans')
        .select('*')
        .eq('is_active', true)
        .order('price', { ascending: true });

      if (error) {
        console.error('Error fetching subscription plans:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error in getSubscriptionPlans:', error);
      return [];
    }
  }

  /**
   * Auto-end expired trials (call this periodically)
   */
  static async autoEndExpiredTrials(): Promise<void> {
    try {
      console.log('🔍 Auto-ending expired trials');
      
      const { error } = await supabase.rpc('auto_end_expired_trials');

      if (error) {
        console.error('Error auto-ending expired trials:', error);
      } else {
        console.log('✅ Expired trials ended successfully');
      }
    } catch (error) {
      console.error('Error in autoEndExpiredTrials:', error);
    }
  }
}






