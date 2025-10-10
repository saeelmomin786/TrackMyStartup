import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export default function UserIDDebugger() {
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  const runDebug = async () => {
    setIsLoading(true);
    try {
      // Get current authenticated user
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError) {
        console.error('❌ Auth error:', authError);
        return;
      }

      // Get user profile
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user?.id)
        .single();

      // Get all subscriptions for current user
      const { data: subscriptions, error: subError } = await supabase
        .from('user_subscriptions')
        .select('*')
        .eq('user_id', user?.id);

      // Get all subscriptions (to see if there are any with different user IDs)
      const { data: allSubscriptions, error: allSubError } = await supabase
        .from('user_subscriptions')
        .select('*')
        .limit(10);

      setDebugInfo({
        currentUserId: user?.id,
        currentUserEmail: user?.email,
        profile,
        userSubscriptions: subscriptions || [],
        allSubscriptions: allSubscriptions || [],
        errors: {
          auth: authError,
          profile: profileError,
          subscriptions: subError,
          allSubscriptions: allSubError
        }
      });

    } catch (error) {
      console.error('❌ Debug error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    runDebug();
  }, []);

  if (!debugInfo) {
    return (
      <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
        <h3 className="text-lg font-semibold text-yellow-800">User ID Debugger</h3>
        <p className="text-yellow-700">Loading...</p>
      </div>
    );
  }

  return (
    <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-red-800">User ID Debugger</h3>
        <button
          onClick={runDebug}
          disabled={isLoading}
          className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700 disabled:opacity-50"
        >
          {isLoading ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>
      
      <div className="space-y-3 text-sm">
        <div className="p-3 bg-white border border-gray-200 rounded">
          <strong className="text-red-800">Current Authenticated User:</strong>
          <div className="mt-1">
            <div><strong>ID:</strong> {debugInfo.currentUserId}</div>
            <div><strong>Email:</strong> {debugInfo.currentUserEmail}</div>
          </div>
        </div>

        <div className="p-3 bg-white border border-gray-200 rounded">
          <strong className="text-red-800">User's Subscriptions:</strong>
          <div className="mt-1">
            {debugInfo.userSubscriptions.length === 0 ? (
              <div className="text-red-600">❌ No subscriptions found for current user</div>
            ) : (
              debugInfo.userSubscriptions.map((sub: any, index: number) => (
                <div key={index} className="text-xs mt-2 p-2 bg-green-50 border border-green-200 rounded">
                  <div><strong>Status:</strong> {sub.status}</div>
                  <div><strong>Amount:</strong> {sub.amount}</div>
                  <div><strong>Period End:</strong> {new Date(sub.current_period_end).toLocaleString()}</div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="p-3 bg-white border border-gray-200 rounded">
          <strong className="text-red-800">All Subscriptions (First 10):</strong>
          <div className="mt-1">
            {debugInfo.allSubscriptions.map((sub: any, index: number) => (
              <div key={index} className="text-xs mt-2 p-2 bg-blue-50 border border-blue-200 rounded">
                <div><strong>User ID:</strong> {sub.user_id}</div>
                <div><strong>Status:</strong> {sub.status}</div>
                <div><strong>Amount:</strong> {sub.amount}</div>
                <div><strong>Is Current User:</strong> {sub.user_id === debugInfo.currentUserId ? '✅ YES' : '❌ NO'}</div>
              </div>
            ))}
          </div>
        </div>

        {debugInfo.errors.auth && (
          <div className="p-3 bg-red-100 border border-red-300 rounded">
            <strong className="text-red-800">Auth Error:</strong>
            <div className="text-xs text-red-600">{JSON.stringify(debugInfo.errors.auth)}</div>
          </div>
        )}

        {debugInfo.errors.subscriptions && (
          <div className="p-3 bg-red-100 border border-red-300 rounded">
            <strong className="text-red-800">Subscription Error:</strong>
            <div className="text-xs text-red-600">{JSON.stringify(debugInfo.errors.subscriptions)}</div>
          </div>
        )}
      </div>
    </div>
  );
}

