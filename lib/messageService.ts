// Simple message service without external dependencies
export type MessageType = 'success' | 'error' | 'warning' | 'info';

interface Message {
  id: string;
  type: MessageType;
  title: string;
  message: string;
  duration?: number;
  timestamp: number;
}

class MessageService {
  private messages: Message[] = [];
  private messageIdCounter = 0;
  private listeners: Array<() => void> = [];

  addMessage(type: MessageType, title: string, message: string, duration = 0): string {
    const id = `message-${++this.messageIdCounter}`;
    const newMessage: Message = {
      id,
      type,
      title,
      message,
      duration,
      timestamp: Date.now()
    };
    
    this.messages.push(newMessage);
    this.notifyListeners();
    
    // Auto-hide if duration is specified
    if (duration > 0) {
      setTimeout(() => {
        this.hideMessage(id);
      }, duration);
    }
    
    return id;
  }
  
  hideMessage(id: string): void {
    this.messages = this.messages.filter(msg => msg.id !== id);
    this.notifyListeners();
  }
  
  clearAllMessages(): void {
    this.messages = [];
    this.notifyListeners();
  }

  getMessages(): Message[] {
    return [...this.messages];
  }

  subscribe(listener: () => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => listener());
  }
}

// Create singleton instance
const messageServiceInstance = new MessageService();

// Export convenience functions
export const messageService = {
  success: (title: string, message: string, duration = 5000) => {
    return messageServiceInstance.addMessage('success', title, message, duration);
  },
  
  error: (title: string, message: string, duration = 0) => {
    return messageServiceInstance.addMessage('error', title, message, duration);
  },
  
  warning: (title: string, message: string, duration = 5000) => {
    return messageServiceInstance.addMessage('warning', title, message, duration);
  },
  
  info: (title: string, message: string, duration = 5000) => {
    return messageServiceInstance.addMessage('info', title, message, duration);
  },
  
  // Replace alert() calls with proper messages
  showAlert: (message: string, type: MessageType = 'info') => {
    const title = type === 'error' ? 'Error' : 
                  type === 'warning' ? 'Warning' : 
                  type === 'success' ? 'Success' : 'Information';
    
    return messageServiceInstance.addMessage(type, title, message, 0);
  }
};

// Export the instance for components that need to subscribe
export { messageServiceInstance };