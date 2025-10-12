import React, { useState, useEffect } from 'react';
import { X, CheckCircle, AlertCircle, AlertTriangle, Info } from 'lucide-react';
import { messageServiceInstance, MessageType } from '../lib/messageService';

const MessageContainer: React.FC = () => {
  const [messages, setMessages] = useState<any[]>([]);

  useEffect(() => {
    // Subscribe to message changes
    const unsubscribe = messageServiceInstance.subscribe(() => {
      setMessages(messageServiceInstance.getMessages());
    });

    // Initial load
    setMessages(messageServiceInstance.getMessages());

    return unsubscribe;
  }, []);

  const getIcon = (type: MessageType) => {
    switch (type) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'error':
        return <AlertCircle className="w-5 h-5 text-red-500" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
      case 'info':
        return <Info className="w-5 h-5 text-blue-500" />;
      default:
        return <Info className="w-5 h-5 text-blue-500" />;
    }
  };

  const getBackgroundColor = (type: MessageType) => {
    switch (type) {
      case 'success':
        return 'bg-green-50 border-green-200';
      case 'error':
        return 'bg-red-50 border-red-200';
      case 'warning':
        return 'bg-yellow-50 border-yellow-200';
      case 'info':
        return 'bg-blue-50 border-blue-200';
      default:
        return 'bg-blue-50 border-blue-200';
    }
  };

  const getTextColor = (type: MessageType) => {
    switch (type) {
      case 'success':
        return 'text-green-800';
      case 'error':
        return 'text-red-800';
      case 'warning':
        return 'text-yellow-800';
      case 'info':
        return 'text-blue-800';
      default:
        return 'text-blue-800';
    }
  };

  if (messages.length === 0) {
    return null;
  }

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2 max-w-sm">
      {messages.map((message) => (
        <div
          key={message.id}
          className={`
            flex items-start gap-3 p-4 rounded-lg border shadow-lg
            ${getBackgroundColor(message.type)}
            animate-in slide-in-from-right-full duration-300
          `}
        >
          {getIcon(message.type)}
          <div className="flex-1 min-w-0">
            <h4 className={`font-semibold text-sm ${getTextColor(message.type)}`}>
              {message.title}
            </h4>
            <p className={`text-sm mt-1 ${getTextColor(message.type)} opacity-90`}>
              {message.message}
            </p>
          </div>
          <button
            onClick={() => messageServiceInstance.hideMessage(message.id)}
            className={`
              flex-shrink-0 p-1 rounded-full hover:bg-black/10 transition-colors
              ${getTextColor(message.type)} opacity-70 hover:opacity-100
            `}
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );
};

export default MessageContainer;