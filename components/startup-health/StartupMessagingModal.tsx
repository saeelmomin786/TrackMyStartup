import React, { useEffect, useState, useRef } from 'react';
import { X, Send, Paperclip, FileText, Download, CheckCircle, MessageCircle } from 'lucide-react';
import CloudDriveInput from '../ui/CloudDriveInput';
// Payment service removed; define local message type and use Supabase
type IncubationMessage = {
  id: string;
  application_id: string;
  sender_id: string;
  receiver_id: string;
  message: string;
  message_type: 'text' | 'file';
  attachment_url?: string;
  is_read: boolean;
  created_at: string;
};
import { storageService } from '../../lib/storage';
import { supabase } from '../../lib/supabase';
import { messageService } from '../../lib/messageService';

interface StartupMessagingModalProps {
  isOpen: boolean;
  onClose: () => void;
  applicationId: string;
  facilitatorName: string;
  startupName: string;
}

const StartupMessagingModal: React.FC<StartupMessagingModalProps> = ({
  isOpen,
  onClose,
  applicationId,
  facilitatorName,
  startupName
}) => {
  const [messages, setMessages] = useState<IncubationMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [cloudDriveUrl, setCloudDriveUrl] = useState<string>('');
  const [isSending, setIsSending] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [showScrollButton, setShowScrollButton] = useState(false);

  // Load messages when modal opens and set up real-time subscription
  useEffect(() => {
    if (isOpen && applicationId) {
      console.log('Startup modal opened for application:', applicationId);
      loadMessages();
      loadCurrentUserId();
      
      // Subscribe to real-time messages
      const channel = supabase
        .channel(`incubation_messages_startup_${applicationId}`)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'incubation_messages', filter: `application_id=eq.${applicationId}` }, (payload) => {
          const message = payload.new as any as IncubationMessage;
          console.log('Startup received real-time message:', message);
          console.log('Current startup user ID:', currentUserId);
          console.log('Message sender ID:', message.sender_id);
          console.log('Message receiver ID:', message.receiver_id);
          setMessages(prev => {
            // Check if message already exists (prevent duplicates)
            const exists = prev.some(msg => 
              msg.id === message.id || // Check by ID first (most reliable)
              (msg.message === message.message && 
               msg.sender_id === message.sender_id &&
               Math.abs(new Date(msg.created_at).getTime() - new Date(message.created_at).getTime()) < 5000) // Increased time window
            );
            if (exists) {
              console.log('Message already exists, skipping:', message);
              return prev;
            }
            console.log('Adding real-time message to startup chat:', message);
            return [...prev, message];
          });
          scrollToBottom();
        })
        .subscribe();

      return () => {
        console.log('Startup modal closed, unsubscribing from real-time updates');
        supabase.removeChannel(channel);
      };
    }
  }, [isOpen, applicationId, currentUserId]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadMessages = async () => {
    setIsLoading(true);
    try {
      console.log('Startup loading messages for application:', applicationId);
      const { data: messagesData, error } = await supabase
        .from('incubation_messages')
        .select('*')
        .eq('application_id', applicationId)
        .order('created_at', { ascending: true });
      if (error) throw error;
      console.log('Startup loaded messages:', messagesData);
      setMessages((messagesData as any) || []);
      
      // Mark all unread messages as read when the modal is opened
      const unreadMessages = ((messagesData as any) || []).filter((msg: any) => !msg.is_read);
      console.log('Startup marking unread messages as read:', unreadMessages);
      for (const message of unreadMessages) {
        try {
          await supabase.from('incubation_messages').update({ is_read: true }).eq('id', message.id);
        } catch (error) {
          console.error('Error marking message as read:', error);
        }
      }
    } catch (error) {
      console.error('Error loading messages:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadCurrentUserId = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUserId(user?.id || null);
    } catch (error) {
      console.error('Error loading current user:', error);
      setCurrentUserId(null);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() && !selectedFile && !cloudDriveUrl) return;

    setIsSending(true);
    try {
      let attachmentUrl = '';
      
      if (cloudDriveUrl) {
        // Use cloud drive URL directly
        attachmentUrl = cloudDriveUrl;
      } else if (selectedFile) {
        const uploadResult = await storageService.uploadFile(
          selectedFile,
          `incubation-attachments/${applicationId}/${Date.now()}_${selectedFile.name}`
        );
        
        if (uploadResult.success) {
          attachmentUrl = uploadResult.url;
        } else {
          throw new Error('Failed to upload file');
        }
      }

      // Get the facilitator ID from the application using a join with incubation_opportunities table
      const { data: applicationData, error: appError } = await supabase
        .from('opportunity_applications')
        .select(`
          opportunity_id,
          incubation_opportunities!inner(facilitator_id)
        `)
        .eq('id', applicationId)
        .maybeSingle();
      
      if (appError || !applicationData) {
        throw new Error('Unable to get application details. Please refresh and try again.');
      }
      
      const facilitatorId = applicationData.incubation_opportunities?.facilitator_id;
      
      if (!facilitatorId) {
        throw new Error('Unable to determine facilitator. Please refresh and try again.');
      }

      // Send message
      console.log('Startup sending message to facilitator:', { applicationId, facilitatorId, newMessage, messageType: selectedFile ? 'file' : 'text' });
      const { error: sendError } = await supabase.from('incubation_messages').insert({
        application_id: applicationId,
        sender_id: currentUserId,
        receiver_id: facilitatorId,
        message: newMessage,
        message_type: selectedFile ? 'file' : 'text',
        attachment_url: attachmentUrl,
        is_read: false
      });
      if (sendError) throw sendError;
      console.log('Message sent successfully from startup to facilitator');

      // Add the sent message to the state immediately (fallback in case real-time doesn't trigger)
      const sentMessage: IncubationMessage = {
        id: `temp_${Date.now()}`, // Temporary ID
        application_id: applicationId,
        sender_id: currentUserId || '',
        receiver_id: facilitatorId,
        message: newMessage,
        message_type: selectedFile ? 'file' : 'text',
        attachment_url: attachmentUrl,
        is_read: false,
        created_at: new Date().toISOString()
      };
      
      setMessages(prev => [...prev, sentMessage]);
      
      // Clear input after adding to state
      setNewMessage('');
      setSelectedFile(null);
      setCloudDriveUrl('');
      
      // Real-time subscription will also trigger, but this ensures immediate visibility
    } catch (error) {
      console.error('Error sending message:', error);
      messageService.error(
        'Send Failed',
        'Failed to send message. Please try again.'
      );
    } finally {
      setIsSending(false);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleKeyPress = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSendMessage();
    }
  };

  const formatMessageTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    const isAtBottom = scrollHeight - scrollTop === clientHeight;
    setShowScrollButton(!isAtBottom);
  };


  if (!isOpen) return null;

  return (
    <>
      <style jsx>{`
        .messages-container::-webkit-scrollbar {
          width: 8px;
        }
        .messages-container::-webkit-scrollbar-track {
          background: #f1f5f9;
          border-radius: 4px;
        }
        .messages-container::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 4px;
        }
        .messages-container::-webkit-scrollbar-thumb:hover {
          background: #94a3b8;
        }
      `}</style>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-2xl mx-4 h-[600px] flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b">
          <div className="flex items-center space-x-3">
            <MessageCircle className="w-6 h-6 text-blue-600" />
            <div>
              <h3 className="text-lg font-semibold text-slate-900">Messages</h3>
              <p className="text-sm text-slate-600">
                {facilitatorName} • {startupName}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Messages */}
        <div 
          className="flex-1 overflow-y-auto p-4 space-y-4 messages-container relative"
          style={{
            scrollbarWidth: 'thin',
            scrollbarColor: '#cbd5e1 #f1f5f9',
            maxHeight: '400px'
          }}
          onScroll={handleScroll}
        >
          {isLoading ? (
            <div className="flex justify-center items-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : messages.length === 0 ? (
            <div className="text-center text-slate-500 py-8">
              <MessageCircle className="w-12 h-12 mx-auto mb-3 text-slate-300" />
              <p>No messages yet. Start the conversation!</p>
            </div>
          ) : (
            messages.map((message) => {
              const isCurrentUser = message.sender_id === currentUserId;
              const isFromStartup = isCurrentUser; // Messages from startup (current user)
              return (
                <div
                  key={message.id}
                  className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-xs lg:max-w-md px-4 py-2 rounded-2xl ${
                      isCurrentUser
                        ? 'bg-blue-500 text-white rounded-br-md'
                        : 'bg-gray-100 text-gray-900 rounded-bl-md'
                    }`}
                  >
                    <p className="text-sm">{message.message}</p>
                    {message.attachment_url && (
                      <div className="mt-2">
                        <a
                          href={message.attachment_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`inline-flex items-center text-xs ${
                            isCurrentUser 
                              ? 'text-blue-100 hover:text-white' 
                              : 'text-blue-600 hover:text-blue-800'
                          } underline hover:no-underline`}
                        >
                          <FileText className="w-3 h-3 mr-1" />
                          View Attachment
                        </a>
                      </div>
                    )}
                    <p className={`text-xs mt-1 ${isCurrentUser ? 'text-blue-100' : 'text-gray-500'}`}>
                      {formatMessageTime(message.created_at)}
                      {!isFromStartup && (
                        <span className="ml-1 text-xs opacity-75">• {facilitatorName}</span>
                      )}
                      {isFromStartup && (
                        <span className="ml-1 text-xs opacity-75">• You</span>
                      )}
                    </p>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
          
          {/* Scroll to bottom button */}
          {showScrollButton && (
            <button
              onClick={() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })}
              className="absolute bottom-4 right-4 bg-blue-500 text-white rounded-full p-2 shadow-lg hover:bg-blue-600 transition-colors"
              title="Scroll to bottom"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
              </svg>
            </button>
          )}
        </div>

        {/* Message Input */}
        <div className="border-t p-4">
          {selectedFile && (
            <div className="mb-3 p-2 bg-slate-50 rounded-lg flex items-center justify-between">
              <div className="flex items-center">
                <FileText className="w-4 h-4 text-slate-500 mr-2" />
                <span className="text-sm text-slate-700">{selectedFile.name}</span>
              </div>
              <button
                onClick={() => setSelectedFile(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}
          
          <div className="flex space-x-2">
            <CloudDriveInput
              value={cloudDriveUrl}
              onChange={setCloudDriveUrl}
              onFileSelect={setSelectedFile}
              placeholder="Paste your cloud drive link here..."
              label=""
              accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png"
              maxSize={10}
              documentType="message attachment"
              showPrivacyMessage={false}
              className="flex-1 text-sm"
            />
            
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type your message..."
              className="flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={isSending}
            />
            
            <button
              onClick={handleSendMessage}
              disabled={isSending || (!newMessage.trim() && !selectedFile && !cloudDriveUrl)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
            >
              {isSending ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              ) : (
                <Send className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
    </>
  );
};

export default StartupMessagingModal;









