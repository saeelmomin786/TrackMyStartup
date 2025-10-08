import React, { useEffect, useState } from 'react';
import { Bell } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface NotificationBadgeProps {
  startupId: number;
  badgeOnly?: boolean;
  className?: string;
}

const NotificationBadge: React.FC<NotificationBadgeProps> = ({ startupId, badgeOnly = false, className = '' }) => {
  const [unreadCount, setUnreadCount] = useState(0);
  const [startupUserId, setStartupUserId] = useState<string | null>(null);

  useEffect(() => {
    loadStartupUserId();
  }, [startupId]);

  useEffect(() => {
    if (startupUserId) {
      loadUnreadCount();
      
      // Set up real-time subscription for new messages and updates
      const subscription = supabase
        .channel('startup_notification_badge')
        .on('postgres_changes', 
          { 
            event: 'INSERT', 
            schema: 'public', 
            table: 'incubation_messages',
            filter: `receiver_id=eq.${startupUserId}`
          },
          () => {
            loadUnreadCount(); // Reload count
          }
        )
        .on('postgres_changes', 
          { 
            event: 'UPDATE', 
            schema: 'public', 
            table: 'incubation_messages',
            filter: `receiver_id=eq.${startupUserId}`
          },
          () => {
            loadUnreadCount(); // Reload count when messages are marked as read
          }
        )
        .subscribe();

      return () => {
        subscription.unsubscribe();
      };
    }
  }, [startupUserId]);

  const loadStartupUserId = async () => {
    try {
      const { data: userData, error: userError } = await supabase
        .from('startups')
        .select('user_id')
        .eq('id', startupId)
        .single();
      
      if (!userError && userData) {
        setStartupUserId(userData.user_id);
      }
    } catch (error) {
      console.error('Error loading startup user ID:', error);
    }
  };

  const loadUnreadCount = async () => {
    if (!startupUserId) return;
    
    try {
      // Get applications for this startup
      const { data: applications, error: appsError } = await supabase
        .from('opportunity_applications')
        .select('id')
        .eq('startup_id', startupId);

      if (appsError) throw appsError;

      let totalUnread = 0;

      // Count unread messages for each application
      for (const app of applications || []) {
        const { data: messages, error: msgError } = await supabase
          .from('incubation_messages')
          .select('id')
          .eq('application_id', app.id)
          .eq('receiver_id', startupUserId)
          .eq('is_read', false);

        if (!msgError && messages) {
          totalUnread += messages.length;
        }
      }

      setUnreadCount(totalUnread);
    } catch (error) {
      console.error('Error loading unread count:', error);
    }
  };

  if (unreadCount === 0) return null;

  if (badgeOnly) {
    return (
      <span className={`bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center ${className}`}>
        {unreadCount > 9 ? '9+' : unreadCount}
      </span>
    );
  }

  return (
    <div className="relative">
      <Bell className="w-4 h-4" />
      <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
        {unreadCount > 9 ? '9+' : unreadCount}
      </span>
    </div>
  );
};

export default NotificationBadge;
