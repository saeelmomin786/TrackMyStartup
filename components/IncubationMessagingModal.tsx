import React, { useEffect, useState, useRef } from 'react';
import { X, Send, Paperclip, FileText, Download, CheckCircle } from 'lucide-react';
// Removed incubationPaymentService; define local message type and replace calls
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
import { storageService } from '../lib/storage';
import { supabase } from '../lib/supabase';
import { messageService } from '../lib/messageService';

interface IncubationMessagingModalProps {
  isOpen: boolean;
  onClose: () => void;
  applicationId: string;
  startupName: string;
  facilitatorName: string;
}

const IncubationMessagingModal: React.FC<IncubationMessagingModalProps> = ({
  isOpen,
  onClose,
  applicationId,
  startupName,
  facilitatorName
}) => {
  const [messages, setMessages] = useState<IncubationMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [showScrollButton, setShowScrollButton] = useState(false);

  useEffect(() => {
    if (isOpen) {
      console.log('Facilitator modal opened for application:', applicationId);
      loadMessages();
      loadCurrentUserId();
      // Subscribe to real-time messages
      const channel = supabase
        .channel(`incubation_messages_${applicationId}`)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'incubation_messages', filter: `application_id=eq.${applicationId}` }, (payload) => {
          const message = payload.new as any as IncubationMessage;
          console.log('Facilitator received real-time message:', message);
          console.log('Current facilitator user ID:', currentUserId);
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
            console.log('Adding real-time message to facilitator chat:', message);
            return [...prev, message];
          });
          scrollToBottom();
        })
        .subscribe();

      return () => {
        console.log('Facilitator modal closed, unsubscribing from real-time updates');
        supabase.removeChannel(channel);
      };
    }
  }, [isOpen, applicationId, currentUserId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    const isAtBottom = scrollHeight - scrollTop === clientHeight;
    setShowScrollButton(!isAtBottom);
  };

  const loadMessages = async () => {
    setIsLoading(true);
    try {
      console.log('Facilitator loading messages for application:', applicationId);
      const { data: messagesData, error } = await supabase
        .from('incubation_messages')
        .select('*')
        .eq('application_id', applicationId)
        .order('created_at', { ascending: true });
      if (error) throw error;
      console.log('Facilitator loaded messages:', messagesData);
      console.log('Facilitator loaded messages count:', messagesData.length);
      console.log('Facilitator loaded messages details:', messagesData.map(msg => ({
        id: msg.id,
        sender_id: msg.sender_id,
        receiver_id: msg.receiver_id,
        message: msg.message,
        created_at: msg.created_at
      })));
      setMessages(messagesData);
      
      // Mark all unread messages as read when the modal is opened
      const unreadMessages = (messagesData || []).filter((msg: any) => !msg.is_read);
      console.log('Facilitator marking unread messages as read:', unreadMessages);
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
      console.log('Facilitator current user ID loaded:', user?.id);
      setCurrentUserId(user?.id || null);
    } catch (error) {
      console.error('Error loading current user:', error);
      setCurrentUserId(null);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() && !selectedFile) return;

    setIsSending(true);
    try {
      let attachmentUrl: string | undefined;

      if (selectedFile) {
        // Upload file
        const uploadResult = await storageService.uploadFile(
          selectedFile,
          'incubation-attachments',
          `${applicationId}/${Date.now()}_${selectedFile.name}`
        );

        if (uploadResult.success) {
          attachmentUrl = uploadResult.url;
        } else {
          throw new Error('Failed to upload file');
        }
      }

      // Get the receiver ID from the application using a join with startups table
      const { data: applicationData, error: appError } = await supabase
        .from('opportunity_applications')
        .select(`
          startup_id,
          startups!inner(user_id)
        `)
        .eq('id', applicationId)
        .maybeSingle();
      
      if (appError || !applicationData) {
        throw new Error('Unable to get application details. Please refresh and try again.');
      }
      
      const receiverId = applicationData.startups?.user_id;
      
      if (!receiverId) {
        throw new Error('Unable to determine receiver. Please refresh and try again.');
      }

      // Send message
      console.log('Facilitator sending message to startup:', { applicationId, receiverId, newMessage, messageType: selectedFile ? 'file' : 'text' });
      const { error: sendError } = await supabase.from('incubation_messages').insert({
        application_id: applicationId,
        sender_id: currentUserId,
        receiver_id: receiverId,
        message: newMessage,
        message_type: selectedFile ? 'file' : 'text',
        attachment_url: attachmentUrl,
        is_read: false
      });
      if (sendError) throw sendError;
      console.log('Message sent successfully from facilitator to startup');

      // Add the sent message to the state immediately (fallback in case real-time doesn't trigger)
      const sentMessage: IncubationMessage = {
        id: `temp_${Date.now()}`, // Temporary ID
        application_id: applicationId,
        sender_id: currentUserId || '',
        receiver_id: receiverId,
        message: newMessage,
        message_type: selectedFile ? 'file' : 'text',
        attachment_url: attachmentUrl,
        is_read: false,
        created_at: new Date().toISOString()
      };
      
      setMessages(prev => {
        console.log('Adding message to state:', sentMessage);
        return [...prev, sentMessage];
      });
      
      // Clear input after adding to state
      setNewMessage('');
      setSelectedFile(null);
      
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

  const formatMessageTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
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
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 h-[600px] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              Messages - {startupName}
            </h3>
            <p className="text-sm text-gray-500">
              Facilitator: {facilitatorName}
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={loadMessages}
              className="text-gray-400 hover:text-gray-600 transition-colors"
              title="Refresh messages"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
        </div>
        
        <div className="flex-1 flex flex-col">
          {/* Messages Area */}
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
              <div className="flex justify-center items-center h-32 text-gray-500">
                No messages yet. Start the conversation!
              </div>
            ) : (
              <>
                {/* Debug info */}
                <div className="bg-yellow-100 p-2 mb-2 text-xs">
                  Debug: {messages.length} messages loaded. Current user: {currentUserId}
                </div>
                {messages.map((message) => {
                const isCurrentUser = message.sender_id === currentUserId;
                const isFromFacilitator = !isCurrentUser; // Messages from facilitator (not current user)
                console.log('Rendering message:', {
                  id: message.id,
                  sender_id: message.sender_id,
                  currentUserId: currentUserId,
                  isCurrentUser: isCurrentUser,
                  message: message.message
                });
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
                      <div className="flex items-start space-x-2">
                        {message.message_type === 'file' && (
                          <FileText className="h-4 w-4 mt-0.5 flex-shrink-0" />
                        )}
                        <div className="flex-1">
                          <p className="text-sm">{message.message}</p>
                          {message.attachment_url && (
                            <a
                              href={message.attachment_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className={`inline-flex items-center text-xs mt-1 ${
                                isCurrentUser 
                                  ? 'text-blue-100 hover:text-white' 
                                  : 'text-blue-600 hover:text-blue-800'
                              } hover:underline`}
                            >
                              <Download className="h-3 w-3 mr-1" />
                              Download attachment
                            </a>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center justify-between mt-1">
                        <span className={`text-xs ${isCurrentUser ? 'text-blue-100' : 'text-gray-500'}`}>
                          {formatMessageTime(message.created_at)}
                          {isFromFacilitator && (
                            <span className="ml-1 text-xs opacity-75">• {facilitatorName}</span>
                          )}
                        </span>
                        {message.is_read && (
                          <CheckCircle className={`h-3 w-3 ${isCurrentUser ? 'text-blue-200' : 'text-gray-400'}`} />
                        )}
                      </div>
                    </div>
                  </div>
                );
                })}
              </>
            )}
            <div ref={messagesEndRef} />
            
            {/* Scroll to bottom button */}
            {showScrollButton && (
              <button
                onClick={scrollToBottom}
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
              <div className="mb-3 p-2 bg-gray-50 rounded-lg flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <FileText className="h-4 w-4 text-gray-500" />
                  <span className="text-sm text-gray-700">{selectedFile.name}</span>
                </div>
                <button
                  onClick={() => setSelectedFile(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}
            
            <div className="flex space-x-2">
              <input
                type="file"
                id="file-upload"
                className="hidden"
                onChange={handleFileSelect}
                accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png"
              />
              <label
                htmlFor="file-upload"
                className="flex items-center justify-center w-10 h-10 text-gray-500 hover:text-gray-700 cursor-pointer"
              >
                <Paperclip className="h-5 w-5" />
              </label>
              
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Type your message..."
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                disabled={isSending}
              />
              
              <button
                onClick={handleSendMessage}
                disabled={isSending || (!newMessage.trim() && !selectedFile)}
                className="flex items-center justify-center w-10 h-10 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSending ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
    </>
  );
};

export default IncubationMessagingModal;
