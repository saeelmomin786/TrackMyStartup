import React, { useEffect, useState } from 'react';
import { Bell, MessageCircle, FileText, CreditCard, AlertCircle, CheckCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface StartupNotificationsProps {
  startupId: number;
  onOpenMessaging: (applicationId: string) => void;
  onOpenContracts: (applicationId: string) => void;
  onOpenPayment: (applicationId: string) => void;
}

interface NotificationItem {
  id: string;
  type: 'message' | 'contract' | 'status';
  title: string;
  message: string;
  applicationId: string;
  isRead: boolean;
  createdAt: string;
  priority: 'low' | 'medium' | 'high';
}

const StartupNotifications: React.FC<StartupNotificationsProps> = ({
  startupId,
  onOpenMessaging,
  onOpenContracts,
  onOpenPayment
}) => {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [startupUserId, setStartupUserId] = useState<string | null>(null);

  useEffect(() => {
    loadStartupUserId();
  }, [startupId]);

  useEffect(() => {
    if (startupUserId) {
      loadNotifications();
      
      // Set up real-time subscription for new notifications and updates
      const subscription = supabase
        .channel('startup_notifications')
        .on('postgres_changes', 
          { 
            event: 'INSERT', 
            schema: 'public', 
            table: 'incubation_messages',
            filter: `receiver_id=eq.${startupUserId}`
          },
          (payload) => {
            console.log('New message notification:', payload);
            loadNotifications(); // Reload notifications
          }
        )
        .on('postgres_changes', 
          { 
            event: 'UPDATE', 
            schema: 'public', 
            table: 'incubation_messages',
            filter: `receiver_id=eq.${startupUserId}`
          },
          (payload) => {
            console.log('Message marked as read:', payload);
            loadNotifications(); // Reload notifications when messages are marked as read
          }
        )
        .on('postgres_changes', 
          { 
            event: 'INSERT', 
            schema: 'public', 
            table: 'incubation_contracts'
          },
          (payload) => {
            console.log('New contract notification:', payload);
            loadNotifications(); // Reload notifications
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

  const loadNotifications = async () => {
    setIsLoading(true);
    try {
      // Get applications for this startup
      const { data: applications, error: appsError } = await supabase
        .from('opportunity_applications')
        .select('id, status, payment_status, opportunity_id')
        .eq('startup_id', startupId);

      if (appsError) throw appsError;

      const notificationsList: NotificationItem[] = [];

      // Check for new messages
      for (const app of applications || []) {
        // Get the user ID for this startup
        const { data: userData, error: userError } = await supabase
          .from('startups')
          .select('user_id')
          .eq('id', startupId)
          .single();
        
        if (userError || !userData) continue;
        
        const { data: messages, error: msgError } = await supabase
          .from('incubation_messages')
          .select('*')
          .eq('application_id', app.id)
          .eq('receiver_id', userData.user_id)
          .eq('is_read', false)
          .order('created_at', { ascending: false });

        if (!msgError && messages) {
          messages.forEach(msg => {
            notificationsList.push({
              id: `msg_${msg.id}`,
              type: 'message',
              title: 'New Message',
              message: `You have a new message from the facilitator`,
              applicationId: app.id,
              isRead: false,
              createdAt: msg.created_at,
              priority: 'high'
            });
          });
        }

        // Check for new contracts
        const { data: contracts, error: contractError } = await supabase
          .from('incubation_contracts')
          .select('*')
          .eq('application_id', app.id)
          .eq('status', 'uploaded')
          .order('uploaded_at', { ascending: false });

        if (!contractError && contracts) {
          contracts.forEach(contract => {
            notificationsList.push({
              id: `contract_${contract.id}`,
              type: 'contract',
              title: 'New Contract Available',
              message: `A new contract is available for you to review and sign`,
              applicationId: app.id,
              isRead: false,
              createdAt: contract.uploaded_at,
              priority: 'high'
            });
          });
        }

        // Payment notifications removed

        // Check for status updates
        if (app.status === 'accepted') {
          notificationsList.push({
            id: `status_${app.id}`,
            type: 'status',
            title: 'Application Accepted',
            message: `Congratulations! Your application has been accepted`,
            applicationId: app.id,
            isRead: false,
            createdAt: new Date().toISOString(),
            priority: 'high'
          });
        }
      }

      setNotifications(notificationsList);
      setUnreadCount(notificationsList.filter(n => !n.isRead).length);
    } catch (error) {
      console.error('Error loading notifications:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleNotificationClick = (notification: NotificationItem) => {
    // Mark as read
    setNotifications(prev => 
      prev.map(n => n.id === notification.id ? { ...n, isRead: true } : n)
    );
    setUnreadCount(prev => Math.max(0, prev - 1));

    // Open appropriate modal
    switch (notification.type) {
      case 'message':
        onOpenMessaging(notification.applicationId);
        break;
      case 'contract':
        onOpenContracts(notification.applicationId);
        break;
      // Payment case removed
      default:
        break;
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'message':
        return <MessageCircle className="w-5 h-5 text-blue-500" />;
      case 'contract':
        return <FileText className="w-5 h-5 text-green-500" />;
      // Payment icon removed
      case 'status':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      default:
        return <AlertCircle className="w-5 h-5 text-gray-500" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'border-l-red-500 bg-red-50';
      case 'medium':
        return 'border-l-yellow-500 bg-yellow-50';
      case 'low':
        return 'border-l-blue-500 bg-blue-50';
      default:
        return 'border-l-gray-500 bg-gray-50';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-4">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-slate-900 flex items-center">
          <Bell className="w-5 h-5 mr-2" />
          Notifications
          {unreadCount > 0 && (
            <span className="ml-2 bg-red-500 text-white text-xs rounded-full px-2 py-1">
              {unreadCount}
            </span>
          )}
        </h3>
      </div>

      {notifications.length === 0 ? (
        <div className="text-center py-8 text-slate-500">
          <Bell className="w-12 h-12 mx-auto mb-3 text-slate-300" />
          <p>No notifications yet</p>
          <p className="text-sm">You'll see updates about your applications here</p>
        </div>
      ) : (
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {notifications.map((notification) => (
            <div
              key={notification.id}
              onClick={() => handleNotificationClick(notification)}
              className={`p-3 rounded-lg border-l-4 cursor-pointer hover:shadow-md transition-shadow ${
                notification.isRead ? 'opacity-60' : ''
              } ${getPriorityColor(notification.priority)}`}
            >
              <div className="flex items-start space-x-3">
                {getNotificationIcon(notification.type)}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-medium text-slate-900">
                      {notification.title}
                    </h4>
                    {!notification.isRead && (
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    )}
                  </div>
                  <p className="text-sm text-slate-600 mt-1">
                    {notification.message}
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    {new Date(notification.createdAt).toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default StartupNotifications;
