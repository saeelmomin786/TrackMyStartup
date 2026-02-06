import { supabase } from './supabase';

export interface FacilitatorAccess {
  access_id: string;
  startup_id: number;
  startup_name: string;
  access_type: string;
  granted_at: string;
  expires_at: string;
  is_active: boolean;
  days_remaining: number;
}

export class FacilitatorAccessService {
  /**
   * Check if a facilitator has access to a startup's compliance tab
   */
  static async checkAccess(facilitatorId: string, startupId: number): Promise<boolean> {
    try {
      const { data, error } = await supabase.rpc('check_facilitator_access', {
        p_facilitator_id: facilitatorId,
        p_startup_id: startupId,
        p_access_type: 'compliance_view'
      });

      if (error) {
        console.error('Error checking facilitator access:', error);
        return false;
      }

      return data || false;
    } catch (err) {
      console.error('Error checking facilitator access:', err);
      return false;
    }
  }

  /**
   * Get list of startups a facilitator has access to
   */
  static async getFacilitatorAccess(facilitatorId: string): Promise<FacilitatorAccess[]> {
    try {
      const { data, error } = await supabase.rpc('get_facilitator_access_list', {
        p_facilitator_id: facilitatorId
      });

      if (error) {
        console.error('Error getting facilitator access list:', error);
        return [];
      }

      return data || [];
    } catch (err) {
      console.error('Error getting facilitator access list:', err);
      return [];
    }
  }

  /**
   * Get list of facilitators who have access to a startup
   */
  static async getStartupAccess(startupId: number): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('facilitator_access')
        .select(`
          id,
          facilitator_id,
          access_type,
          granted_at,
          expires_at,
          is_active,
          user_profiles!facilitator_id(name, email)
        `)
        .eq('startup_id', startupId)
        .eq('is_active', true)
        .gt('expires_at', new Date().toISOString());

      if (error) {
        console.error('Error getting startup access list:', error);
        return [];
      }

      return data || [];
    } catch (err) {
      console.error('Error getting startup access list:', err);
      return [];
    }
  }

  /**
   * Grant access to a facilitator (manual override)
   */
  static async grantAccess(facilitatorId: string, startupId: number): Promise<boolean> {
    try {
      const { data, error } = await supabase.rpc('grant_facilitator_compliance_access', {
        p_facilitator_id: facilitatorId,
        p_startup_id: startupId
      });

      if (error) {
        console.error('Error granting facilitator access:', error);
        return false;
      }

      return data || false;
    } catch (err) {
      console.error('Error granting facilitator access:', err);
      return false;
    }
  }

  /**
   * Revoke access from a facilitator
   */
  static async revokeAccess(facilitatorId: string, startupId: number): Promise<boolean> {
    try {
      const { data, error } = await supabase.rpc('revoke_facilitator_access', {
        p_facilitator_id: facilitatorId,
        p_startup_id: startupId,
        p_access_type: 'compliance_view'
      });

      if (error) {
        console.error('Error revoking facilitator access:', error);
        return false;
      }

      return data || false;
    } catch (err) {
      console.error('Error revoking facilitator access:', err);
      return false;
    }
  }

  /**
   * Cleanup expired access records
   */
  static async cleanupExpiredAccess(): Promise<number> {
    try {
      const { data, error } = await supabase.rpc('cleanup_expired_access');

      if (error) {
        console.error('Error cleaning up expired access:', error);
        return 0;
      }

      return data || 0;
    } catch (err) {
      console.error('Error cleaning up expired access:', err);
      return 0;
    }
  }

  /**
   * Check if access is expired
   */
  static isAccessExpired(expiresAt: string): boolean {
    return new Date(expiresAt) <= new Date();
  }

  /**
   * Get days remaining for access
   */
  static getDaysRemaining(expiresAt: string): number {
    const now = new Date();
    const expiry = new Date(expiresAt);
    const diffTime = expiry.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(0, diffDays);
  }

  /**
   * Format access status for display
   */
  static getAccessStatus(access: FacilitatorAccess): {
    status: 'active' | 'expired' | 'expiring_soon';
    message: string;
    color: string;
  } {
    if (!access.is_active) {
      return {
        status: 'expired',
        message: 'Access revoked',
        color: 'text-red-600'
      };
    }

    if (this.isAccessExpired(access.expires_at)) {
      return {
        status: 'expired',
        message: 'Access expired',
        color: 'text-red-600'
      };
    }

    const daysRemaining = this.getDaysRemaining(access.expires_at);
    
    if (daysRemaining <= 7) {
      return {
        status: 'expiring_soon',
        message: `Expires in ${daysRemaining} day${daysRemaining !== 1 ? 's' : ''}`,
        color: 'text-orange-600'
      };
    }

    return {
      status: 'active',
      message: `Active for ${daysRemaining} more day${daysRemaining !== 1 ? 's' : ''}`,
      color: 'text-green-600'
    };
  }
}
