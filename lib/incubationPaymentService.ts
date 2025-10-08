import { supabase } from './supabase';

export interface IncubationPayment {
  id: string;
  application_id: string;
  amount: number;
  currency: string;
  payment_method?: string;
  payment_id?: string;
  razorpay_order_id?: string;
  razorpay_payment_id?: string;
  razorpay_signature?: string;
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  paid_at?: string;
  created_at: string;
}

export interface IncubationMessage {
  id: string;
  application_id: string;
  sender_id: string;
  receiver_id: string;
  message: string;
  message_type: 'text' | 'file' | 'contract';
  attachment_url?: string;
  is_read: boolean;
  created_at: string;
}

export interface IncubationContract {
  id: string;
  application_id: string;
  contract_name: string;
  contract_url: string;
  uploaded_by: string;
  uploaded_at: string;
  is_signed: boolean;
  signed_by?: string;
  signed_at?: string;
}

class IncubationPaymentService {
  // Create Razorpay order for incubation payment
  async createRazorpayOrder(
    applicationId: string,
    amount: number,
    currency: string = 'INR'
  ): Promise<{ orderId: string; paymentId: string }> {
    try {
      // Create payment record in database
      const { data: paymentData, error: paymentError } = await supabase
        .rpc('create_incubation_payment', {
          p_application_id: applicationId,
          p_amount: amount,
          p_currency: currency
        });

      if (paymentError) throw paymentError;

      // Create Razorpay order using database function
      const { data: orderData, error: orderError } = await supabase
        .rpc('create_razorpay_order', {
          p_amount: amount,
          p_currency: currency,
          p_receipt: `incubation_${applicationId}_${Date.now()}`
        });

      if (orderError) {
        throw new Error('Failed to create Razorpay order: ' + orderError.message);
      }

      // For testing, we'll use a mock order
      if (!orderData || !orderData.id) {
        throw new Error('Invalid order data received');
      }

      // For now, we'll use a mock Razorpay integration
      // In production, you would use real Razorpay keys
      const mockRazorpayOptions = {
        key: 'rzp_test_mock_key', // Mock key for testing
        amount: orderData.amount,
        currency: orderData.currency,
        name: 'Incubation Payment',
        description: 'Payment for incubation program',
        order_id: orderData.id,
        handler: (response: any) => {
          console.log('Payment successful:', response);
          // Handle payment success
        },
        prefill: {
          name: 'Test User',
          email: 'test@example.com',
          contact: '9999999999'
        },
        notes: {
          application_id: applicationId
        },
        theme: {
          color: '#3399cc'
        }
      };

      // Update payment record with Razorpay order ID
      const { error: updateError } = await supabase
        .from('incubation_payments')
        .update({ razorpay_order_id: orderData.id })
        .eq('id', paymentData);

      if (updateError) throw updateError;

      return {
        orderId: orderData.id,
        paymentId: paymentData
      };
    } catch (error) {
      console.error('Error creating Razorpay order:', error);
      throw error;
    }
  }

  // Verify Razorpay payment
  async verifyPayment(
    paymentId: string,
    razorpayPaymentId: string,
    razorpaySignature: string
  ): Promise<boolean> {
    try {
      // Update payment status in database
      const { error } = await supabase
        .rpc('update_payment_status', {
          p_payment_id: paymentId,
          p_status: 'completed',
          p_razorpay_payment_id: razorpayPaymentId,
          p_razorpay_signature: razorpaySignature
        });

      if (error) throw error;

      return true;
    } catch (error) {
      console.error('Error verifying payment:', error);
      throw error;
    }
  }

  // Get payment details
  async getPaymentDetails(paymentId: string): Promise<IncubationPayment | null> {
    try {
      const { data, error } = await supabase
        .from('incubation_payments')
        .select('*')
        .eq('id', paymentId)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error getting payment details:', error);
      return null;
    }
  }

  // Get payments for an application
  async getApplicationPayments(applicationId: string): Promise<IncubationPayment[]> {
    try {
      const { data, error } = await supabase
        .from('incubation_payments')
        .select('*')
        .eq('application_id', applicationId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error getting application payments:', error);
      return [];
    }
  }

  // Send message between facilitator and startup
  async sendMessage(
    applicationId: string,
    receiverId: string,
    message: string,
    messageType: 'text' | 'file' | 'contract' = 'text',
    attachmentUrl?: string
  ): Promise<string> {
    try {
      // Validate UUIDs
      if (!applicationId || applicationId === '' || !this.isValidUUID(applicationId)) {
        throw new Error('Invalid application ID');
      }
      
      if (!receiverId || receiverId === '' || !this.isValidUUID(receiverId)) {
        throw new Error('Invalid receiver ID');
      }

      const { data, error } = await supabase
        .rpc('send_incubation_message', {
          p_application_id: applicationId,
          p_receiver_id: receiverId,
          p_message: message,
          p_message_type: messageType,
          p_attachment_url: attachmentUrl
        });

      if (error) throw error;
      
      if (data && !data.success) {
        throw new Error(data.error || 'Failed to send message');
      }
      
      return data;
    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    }
  }

  // Helper function to validate UUID
  private isValidUUID(uuid: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
  }

  // Get application details for messaging
  async getApplicationDetails(applicationId: string): Promise<{ data: any; error: any }> {
    try {
      // Attempt named-parameter signature first (p_application_id)
      let { data, error } = await supabase
        .rpc('get_application_for_messaging', {
          p_application_id: applicationId
        } as any);

      // If that fails (e.g., function expects positional UUID), try passing the UUID directly
      if (error || !data) {
        const alt = await supabase.rpc('get_application_for_messaging', applicationId as unknown as any);
        return { data: alt.data, error: alt.error };
      }

      return { data, error };
    } catch (error) {
      console.error('Error getting application details:', error);
      return { data: null, error };
    }
  }

  // Get messages for an application
  async getApplicationMessages(applicationId: string): Promise<IncubationMessage[]> {
    try {
      const { data, error } = await supabase
        .from('incubation_messages')
        .select('*')
        .eq('application_id', applicationId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      
      // Get sender and receiver names separately
      const messagesWithNames = await Promise.all(
        (data || []).map(async (message) => {
          const [senderData, receiverData] = await Promise.all([
            supabase.from('users').select('name, email').eq('id', message.sender_id).single(),
            supabase.from('users').select('name, email').eq('id', message.receiver_id).single()
          ]);
          
          return {
            ...message,
            sender: senderData.data,
            receiver: receiverData.data
          };
        })
      );
      
      return messagesWithNames;
    } catch (error) {
      console.error('Error getting application messages:', error);
      return [];
    }
  }

  // Mark message as read
  async markMessageAsRead(messageId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('incubation_messages')
        .update({ is_read: true })
        .eq('id', messageId);

      if (error) throw error;
    } catch (error) {
      console.error('Error marking message as read:', error);
      throw error;
    }
  }

  // Upload contract
  async uploadContract(
    applicationId: string,
    contractName: string,
    contractUrl: string
  ): Promise<string> {
    try {
      const { data, error } = await supabase
        .from('incubation_contracts')
        .insert({
          application_id: applicationId,
          contract_name: contractName,
          contract_url: contractUrl,
          uploaded_by: (await supabase.auth.getUser()).data.user?.id
        })
        .select()
        .single();

      if (error) throw error;
      return data.id;
    } catch (error) {
      console.error('Error uploading contract:', error);
      throw error;
    }
  }

  // Get contracts for an application
  async getApplicationContracts(applicationId: string): Promise<IncubationContract[]> {
    try {
      const { data, error } = await supabase
        .from('incubation_contracts')
        .select('*')
        .eq('application_id', applicationId)
        .order('uploaded_at', { ascending: false });

      if (error) throw error;
      
      // Get uploader and signer names separately
      const contractsWithNames = await Promise.all(
        (data || []).map(async (contract) => {
          const [uploaderData, signerData] = await Promise.all([
            contract.uploaded_by ? supabase.from('users').select('name, email').eq('id', contract.uploaded_by).single() : Promise.resolve({ data: null }),
            contract.signed_by ? supabase.from('users').select('name, email').eq('id', contract.signed_by).single() : Promise.resolve({ data: null })
          ]);
          
          return {
            ...contract,
            uploader: uploaderData.data,
            signer: signerData.data
          };
        })
      );
      
      return contractsWithNames;
    } catch (error) {
      console.error('Error getting application contracts:', error);
      return [];
    }
  }

  // Sign contract
  async signContract(contractId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('incubation_contracts')
        .update({
          is_signed: true,
          signed_by: (await supabase.auth.getUser()).data.user?.id,
          signed_at: new Date().toISOString()
        })
        .eq('id', contractId);

      if (error) throw error;
    } catch (error) {
      console.error('Error signing contract:', error);
      throw error;
    }
  }

  // Get unread message count for user
  async getUnreadMessageCount(): Promise<number> {
    try {
      const { data, error } = await supabase
        .from('incubation_messages')
        .select('id', { count: 'exact' })
        .eq('receiver_id', (await supabase.auth.getUser()).data.user?.id)
        .eq('is_read', false);

      if (error) throw error;
      return data?.length || 0;
    } catch (error) {
      console.error('Error getting unread message count:', error);
      return 0;
    }
  }

  // Subscribe to real-time messages
  subscribeToMessages(applicationId: string, callback: (message: IncubationMessage) => void) {
    return supabase
      .channel(`incubation_messages_${applicationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'incubation_messages',
          filter: `application_id=eq.${applicationId}`
        },
        (payload) => {
          callback(payload.new as IncubationMessage);
        }
      )
      .subscribe();
  }

  // Subscribe to payment updates
  subscribeToPayments(applicationId: string, callback: (payment: IncubationPayment) => void) {
    return supabase
      .channel(`incubation_payments_${applicationId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'incubation_payments',
          filter: `application_id=eq.${applicationId}`
        },
        (payload) => {
          callback(payload.new as IncubationPayment);
        }
      )
      .subscribe();
  }

  // Create or get an application so messaging can start from portfolio
  async ensureApplicationForConversation(startupId: number, facilitatorId: string): Promise<string> {
    // Prefer secure RPC that runs with SECURITY DEFINER on the DB
    // Function contract (recommended in SQL): ensure_application_for_conversation(p_startup_id int) returns uuid
    try {
      const { data, error } = await supabase.rpc('ensure_application_for_conversation', {
        p_startup_id: startupId
      } as any);
      if (error) throw error;
      if (typeof data === 'string' && data.match(/^[0-9a-f-]{36}$/i)) {
        return data;
      }
      if (data?.id) return data.id;
    } catch (e: any) {
      // Fall back: try to find an existing application (may be blocked by RLS for some roles)
      const { data: existing } = await supabase
        .from('opportunity_applications')
        .select('id')
        .eq('startup_id', startupId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (existing?.id) return existing.id;
      // As last resort, surface a clear error about RLS
      throw new Error('Unable to create conversation due to database permissions (RLS). Please run the RLS policy or RPC setup.');
    }
    throw new Error('Unexpected response creating conversation');
  }
}

export const incubationPaymentService = new IncubationPaymentService();
