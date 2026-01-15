import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import Card from '../ui/Card';
import Button from '../ui/Button';
import Modal from '../ui/Modal';
import Input from '../ui/Input';
import { CreditCard, CheckCircle, Clock, XCircle, DollarSign, Loader } from 'lucide-react';
import { formatDateDDMMYYYY } from '../../lib/dateTimeUtils';

interface MentorPayment {
  id: number;
  assignment_id: number;
  mentor_id: string;
  startup_id: number;
  amount: number;
  currency: string;
  commission_percentage: number;
  commission_amount: number;
  payout_amount: number;
  payment_status: string;
  paypal_order_id?: string;
  payment_date?: string;
  payout_status: string;
  payout_date?: string;
  payout_method?: string;
  payout_reference?: string;
  payout_notes?: string;
  mentor_name?: string;
  startup_name?: string;
}

const MentorPaymentsTab: React.FC = () => {
  const [payments, setPayments] = useState<MentorPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPayment, setSelectedPayment] = useState<MentorPayment | null>(null);
  const [transferModalOpen, setTransferModalOpen] = useState(false);
  const [transferDate, setTransferDate] = useState('');
  const [transferMethod, setTransferMethod] = useState('');
  const [transferReference, setTransferReference] = useState('');
  const [transferNotes, setTransferNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadPayments();
  }, []);

  const loadPayments = async () => {
    try {
      setLoading(true);
      
      // Load payments with mentor and startup names
      const { data, error } = await supabase
        .from('mentor_payments')
        .select(`
          *,
          assignment:assignment_id (
            mentor_id,
            startup_id
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Enrich with mentor and startup names
      const enrichedPayments = await Promise.all(
        (data || []).map(async (payment: any) => {
          const assignment = payment.assignment;
          if (!assignment) return payment;

          // Get mentor name
          let mentorName = 'Unknown Mentor';
          if (assignment.mentor_id) {
            const { data: mentorProfile } = await supabase
              .from('mentor_profiles')
              .select('mentor_name')
              .eq('user_id', assignment.mentor_id)
              .single();
            if (mentorProfile) {
              mentorName = mentorProfile.mentor_name || mentorName;
            }
          }

          // Get startup name
          let startupName = 'Unknown Startup';
          if (assignment.startup_id) {
            const { data: startup } = await supabase
              .from('startups')
              .select('name')
              .eq('id', assignment.startup_id)
              .single();
            if (startup) {
              startupName = startup.name || startupName;
            }
          }

          return {
            ...payment,
            mentor_name: mentorName,
            startup_name: startupName
          };
        })
      );

      setPayments(enrichedPayments);
    } catch (err: any) {
      console.error('Error loading payments:', err);
      setError(err.message || 'Failed to load payments');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number, currency: string): string => {
    const currencySymbols: { [key: string]: string } = {
      'USD': '$',
      'INR': '₹',
      'EUR': '€',
      'GBP': '£',
      'SGD': 'S$',
      'AED': 'AED '
    };
    const symbol = currencySymbols[currency] || currency || '$';
    return `${symbol}${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const getPaymentStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">Completed</span>;
      case 'pending_payment':
        return <span className="px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-800 rounded-full">Pending</span>;
      case 'failed':
        return <span className="px-2 py-1 text-xs font-medium bg-red-100 text-red-800 rounded-full">Failed</span>;
      default:
        return <span className="px-2 py-1 text-xs font-medium bg-slate-100 text-slate-800 rounded-full">{status}</span>;
    }
  };

  const getPayoutStatusBadge = (status: string) => {
    switch (status) {
      case 'transferred':
        return <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">Transferred</span>;
      case 'pending_transfer':
        return <span className="px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-800 rounded-full">Pending Transfer</span>;
      case 'not_initiated':
        return <span className="px-2 py-1 text-xs font-medium bg-slate-100 text-slate-800 rounded-full">Not Initiated</span>;
      default:
        return <span className="px-2 py-1 text-xs font-medium bg-slate-100 text-slate-800 rounded-full">{status}</span>;
    }
  };

  const handleMarkAsTransferred = (payment: MentorPayment) => {
    setSelectedPayment(payment);
    setTransferDate(new Date().toISOString().split('T')[0]);
    setTransferMethod('');
    setTransferReference('');
    setTransferNotes('');
    setTransferModalOpen(true);
  };

  const saveTransfer = async () => {
    if (!selectedPayment) return;

    try {
      setSaving(true);
      setError(null);

      const { error } = await supabase
        .from('mentor_payments')
        .update({
          payout_status: 'transferred',
          payout_date: transferDate,
          payout_method: transferMethod || null,
          payout_reference: transferReference || null,
          payout_notes: transferNotes || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedPayment.id);

      if (error) throw error;

      setTransferModalOpen(false);
      setSelectedPayment(null);
      loadPayments();
    } catch (err: any) {
      console.error('Error saving transfer:', err);
      setError(err.message || 'Failed to save transfer');
    } finally {
      setSaving(false);
    }
  };

  const pendingPayments = payments.filter(p => p.payment_status === 'completed' && p.payout_status !== 'transferred');
  const allPayments = payments;

  if (loading) {
    return (
      <Card>
        <div className="text-center py-8">
          <Loader className="w-8 h-8 animate-spin mx-auto text-blue-600 mb-4" />
          <p className="text-slate-600">Loading payments...</p>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <div className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Total Payments</p>
                <p className="text-2xl font-bold text-slate-900">{allPayments.length}</p>
              </div>
              <CreditCard className="w-8 h-8 text-blue-600" />
            </div>
          </div>
        </Card>
        <Card>
          <div className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Pending Transfers</p>
                <p className="text-2xl font-bold text-yellow-600">{pendingPayments.length}</p>
              </div>
              <Clock className="w-8 h-8 text-yellow-600" />
            </div>
          </div>
        </Card>
        <Card>
          <div className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Total Commission</p>
                <p className="text-2xl font-bold text-green-600">
                  {formatCurrency(
                    allPayments.reduce((sum, p) => sum + (p.commission_amount || 0), 0),
                    allPayments[0]?.currency || 'USD'
                  )}
                </p>
              </div>
              <DollarSign className="w-8 h-8 text-green-600" />
            </div>
          </div>
        </Card>
      </div>

      {/* Pending Transfers */}
      {pendingPayments.length > 0 && (
        <Card>
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Pending Transfers</h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Mentor</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Startup</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Amount</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Commission</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Payout</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Payment Date</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-slate-700">Actions</th>
                </tr>
              </thead>
              <tbody>
                {pendingPayments.map((payment) => (
                  <tr key={payment.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="py-3 px-4 text-sm text-slate-900">{payment.mentor_name}</td>
                    <td className="py-3 px-4 text-sm text-slate-600">{payment.startup_name}</td>
                    <td className="py-3 px-4 text-sm font-medium text-slate-900">
                      {formatCurrency(payment.amount, payment.currency)}
                    </td>
                    <td className="py-3 px-4 text-sm text-slate-600">
                      {formatCurrency(payment.commission_amount, payment.currency)}
                    </td>
                    <td className="py-3 px-4 text-sm font-medium text-green-600">
                      {formatCurrency(payment.payout_amount, payment.currency)}
                    </td>
                    <td className="py-3 px-4 text-sm text-slate-600">
                      {payment.payment_date ? formatDateDDMMYYYY(payment.payment_date) : '-'}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <Button
                        size="sm"
                        onClick={() => handleMarkAsTransferred(payment)}
                      >
                        Mark as Transferred
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* All Payments */}
      <Card>
        <h3 className="text-lg font-semibold text-slate-900 mb-4">All Payments</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Mentor</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Startup</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Amount</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Payment Status</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Payout Status</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Date</th>
              </tr>
            </thead>
            <tbody>
              {allPayments.map((payment) => (
                <tr key={payment.id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="py-3 px-4 text-sm text-slate-900">{payment.mentor_name}</td>
                  <td className="py-3 px-4 text-sm text-slate-600">{payment.startup_name}</td>
                  <td className="py-3 px-4 text-sm font-medium text-slate-900">
                    {formatCurrency(payment.amount, payment.currency)}
                  </td>
                  <td className="py-3 px-4">{getPaymentStatusBadge(payment.payment_status)}</td>
                  <td className="py-3 px-4">{getPayoutStatusBadge(payment.payout_status)}</td>
                  <td className="py-3 px-4 text-sm text-slate-600">
                    {payment.payment_date ? formatDateDDMMYYYY(payment.payment_date) : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Transfer Modal */}
      {selectedPayment && (
        <Modal
          isOpen={transferModalOpen}
          onClose={() => {
            setTransferModalOpen(false);
            setSelectedPayment(null);
          }}
          title="Mark as Transferred"
        >
          <div className="space-y-4">
            <div className="bg-slate-50 p-4 rounded-lg">
              <p className="text-sm font-semibold text-slate-700 mb-2">Transfer Details</p>
              <div className="space-y-1 text-sm text-slate-600">
                <p><span className="font-medium">Mentor:</span> {selectedPayment.mentor_name}</p>
                <p><span className="font-medium">Payout Amount:</span> {formatCurrency(selectedPayment.payout_amount, selectedPayment.currency)}</p>
              </div>
            </div>

            <Input
              label="Transfer Date"
              type="date"
              value={transferDate}
              onChange={(e) => setTransferDate(e.target.value)}
            />

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Transfer Method
              </label>
              <select
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={transferMethod}
                onChange={(e) => setTransferMethod(e.target.value)}
              >
                <option value="">Select method</option>
                <option value="Bank Transfer">Bank Transfer</option>
                <option value="PayPal">PayPal</option>
                <option value="Wire">Wire Transfer</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <Input
              label="Reference Number (Optional)"
              value={transferReference}
              onChange={(e) => setTransferReference(e.target.value)}
              placeholder="Transaction reference"
            />

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Notes (Optional)
              </label>
              <textarea
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={3}
                value={transferNotes}
                onChange={(e) => setTransferNotes(e.target.value)}
                placeholder="Additional notes about the transfer"
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm">
                {error}
              </div>
            )}

            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setTransferModalOpen(false);
                  setSelectedPayment(null);
                }}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button onClick={saveTransfer} disabled={saving || !transferDate}>
                {saving ? 'Saving...' : 'Confirm Transfer'}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default MentorPaymentsTab;
