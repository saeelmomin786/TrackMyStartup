import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

interface SubscriptionDebuggerProps {
  userId: string;
}

export default function SubscriptionDebugger({ userId }: SubscriptionDebuggerProps) {
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  const runDiagnostics = async () => {
    setIsLoading(true);
    try {
      console.log('🔍 Running subscription diagnostics...');
      
      // Check user subscription
      const { data: subscriptions, error: subError } = await supabase
        .from('user_subscriptions')
        .select('*')
        .eq('user_id', userId);
      
      if (subError) {
        console.error('❌ Error fetching subscriptions:', subError);
      }
      
      // Check user profile
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role, email')
        .eq('id', userId)
        .single();
      
      if (profileError) {
        console.error('❌ Error fetching profile:', profileError);
      }
      
      // Check current auth state
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError) {
        console.error('❌ Error fetching auth user:', authError);
      }
      
      const debugData = {
        userId,
        authUser: user,
        profile,
        subscriptions,
        currentTime: new Date().toISOString(),
        activeSubscriptions: subscriptions?.filter(sub => sub.status === 'active') || [],
        expiredSubscriptions: subscriptions?.filter(sub => {
          const now = new Date();
          const periodEnd = new Date(sub.current_period_end);
          return sub.status === 'active' && periodEnd < now;
        }) || []
      };
      
      setDebugInfo(debugData);
      console.log('📊 Debug data:', debugData);
      
    } catch (error) {
      console.error('❌ Error in diagnostics:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (userId) {
      runDiagnostics();
    }
  }, [userId]);

  if (!debugInfo) {
    return (
      <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
        <h3 className="text-lg font-semibold text-yellow-800 mb-2">Subscription Debugger</h3>
        <p className="text-yellow-700">Loading...</p>
      </div>
    );
  }

  return (
    <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-blue-800">Subscription Debugger</h3>
        <button
          onClick={runDiagnostics}
          disabled={isLoading}
          className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 disabled:opacity-50"
        >
          {isLoading ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>
      
      <div className="space-y-3 text-sm">
        <div>
          <strong>User ID:</strong> {debugInfo.userId}
        </div>
        
        <div>
          <strong>Auth User:</strong> {debugInfo.authUser?.email || 'Not found'}
        </div>
        
        <div>
          <strong>Profile Role:</strong> {debugInfo.profile?.role || 'Not found'}
        </div>
        
        <div>
          <strong>Total Subscriptions:</strong> {debugInfo.subscriptions?.length || 0}
        </div>
        
        <div>
          <strong>Active Subscriptions:</strong> {debugInfo.activeSubscriptions.length}
        </div>
        
        <div>
          <strong>Expired Subscriptions:</strong> {debugInfo.expiredSubscriptions.length}
        </div>
        
        {debugInfo.activeSubscriptions.length > 0 && (
          <div className="mt-4">
            <strong>Active Subscription Details:</strong>
            <div className="mt-2 p-3 bg-green-50 border border-green-200 rounded">
              {debugInfo.activeSubscriptions.map((sub: any, index: number) => (
                <div key={index} className="text-xs">
                  <div><strong>Status:</strong> {sub.status}</div>
                  <div><strong>Amount:</strong> {sub.amount}</div>
                  <div><strong>Interval:</strong> {sub.interval}</div>
                  <div><strong>Period Start:</strong> {new Date(sub.current_period_start).toLocaleString()}</div>
                  <div><strong>Period End:</strong> {new Date(sub.current_period_end).toLocaleString()}</div>
                  <div><strong>Is in Trial:</strong> {sub.is_in_trial ? 'Yes' : 'No'}</div>
                  <div><strong>Razorpay ID:</strong> {sub.razorpay_subscription_id || 'None'}</div>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {debugInfo.expiredSubscriptions.length > 0 && (
          <div className="mt-4">
            <strong>Expired Subscriptions:</strong>
            <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded">
              {debugInfo.expiredSubscriptions.map((sub: any, index: number) => (
                <div key={index} className="text-xs">
                  <div><strong>Status:</strong> {sub.status}</div>
                  <div><strong>Period End:</strong> {new Date(sub.current_period_end).toLocaleString()}</div>
                </div>
              ))}
            </div>
          </div>
        )}
        
        <div className="mt-4 p-3 bg-gray-50 border border-gray-200 rounded">
          <strong>Current Time:</strong> {new Date(debugInfo.currentTime).toLocaleString()}
        </div>
      </div>
    </div>
  );
}

