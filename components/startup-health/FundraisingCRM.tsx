import React, { useState, useEffect, useMemo } from 'react';
import Card from '../ui/Card';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Modal from '../ui/Modal';
import { Plus, Search, MoreVertical, Settings, HelpCircle, X, User, Calendar, DollarSign, FileText, ChevronRight, Edit2 } from 'lucide-react';
import { messageService } from '../../lib/messageService';
import { supabase } from '../../lib/supabase';

interface InvestorCRM {
  id: string;
  name: string;
  email: string;
  status: 'to_be_contacted' | 'reached_out' | 'in_progress' | 'committed' | 'not_happening';
  amount?: string;
  priority: 'low' | 'medium' | 'high';
  pitchDeckUrl?: string;
  notes?: string;
  approach?: string;
  firstContact?: string;
  tags?: string[];
  createdAt: string;
}

interface FundraisingCRMProps {
  startupId: number;
}

const STATUS_COLUMNS = [
  { id: 'to_be_contacted', label: 'To be contacted', color: 'bg-slate-100' },
  { id: 'reached_out', label: 'Reached out', color: 'bg-blue-50' },
  { id: 'in_progress', label: 'In progress', color: 'bg-yellow-50' },
  { id: 'committed', label: 'Committed', color: 'bg-green-50' },
  { id: 'not_happening', label: 'Not happening', color: 'bg-red-50' },
] as const;

const PRIORITY_COLORS = {
  low: 'bg-slate-100 text-slate-700',
  medium: 'bg-yellow-100 text-yellow-700',
  high: 'bg-red-100 text-red-700',
};

const FundraisingCRM: React.FC<FundraisingCRMProps> = ({ startupId }) => {
  const [investors, setInvestors] = useState<InvestorCRM[]>([]);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [draggedInvestor, setDraggedInvestor] = useState<string | null>(null);
  const [selectedInvestor, setSelectedInvestor] = useState<InvestorCRM | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    status: 'to_be_contacted' as InvestorCRM['status'],
    amount: '',
    priority: 'medium' as InvestorCRM['priority'],
    pitchDeckUrl: '',
    notes: '',
    approach: '',
    firstContact: '',
    tags: '',
  });

  useEffect(() => {
    loadInvestors();
  }, [startupId]);

  const loadInvestors = async () => {
    try {
      // For now, load from localStorage. Later can migrate to Supabase table
      const stored = localStorage.getItem(`crm_investors_${startupId}`);
      if (stored) {
        setInvestors(JSON.parse(stored));
      }
    } catch (error) {
      console.error('Error loading investors:', error);
    }
  };

  const saveInvestors = async (updatedInvestors: InvestorCRM[]) => {
    try {
      localStorage.setItem(`crm_investors_${startupId}`, JSON.stringify(updatedInvestors));
      setInvestors(updatedInvestors);
    } catch (error) {
      console.error('Error saving investors:', error);
      messageService.error('Save Failed', 'Could not save investor data.', 3000);
    }
  };

  const filteredInvestors = useMemo(() => {
    if (!searchQuery.trim()) return investors;
    const query = searchQuery.toLowerCase();
    return investors.filter(
      inv =>
        inv.name.toLowerCase().includes(query) ||
        inv.email.toLowerCase().includes(query) ||
        inv.notes?.toLowerCase().includes(query) ||
        inv.tags?.some(tag => tag.toLowerCase().includes(query))
    );
  }, [investors, searchQuery]);

  const investorsByStatus = useMemo(() => {
    const grouped: Record<string, InvestorCRM[]> = {
      to_be_contacted: [],
      reached_out: [],
      in_progress: [],
      committed: [],
      not_happening: [],
    };
    filteredInvestors.forEach(inv => {
      if (grouped[inv.status]) {
        grouped[inv.status].push(inv);
      }
    });
    return grouped;
  }, [filteredInvestors]);

  const handleAddInvestor = () => {
    if (!formData.name.trim() || !formData.email.trim()) {
      messageService.warning('Required Fields', 'Please fill in investor name and email.', 3000);
      return;
    }

    const newInvestor: InvestorCRM = {
      id: `inv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: formData.name.trim(),
      email: formData.email.trim(),
      status: formData.status,
      amount: formData.amount || undefined,
      priority: formData.priority,
      pitchDeckUrl: formData.pitchDeckUrl || undefined,
      notes: formData.notes || undefined,
      approach: formData.approach || undefined,
      firstContact: formData.firstContact || undefined,
      tags: formData.tags ? formData.tags.split(',').map(t => t.trim()).filter(Boolean) : undefined,
      createdAt: new Date().toISOString(),
    };

    const updated = [...investors, newInvestor];
    saveInvestors(updated);
    setIsAddModalOpen(false);
    resetForm();
    messageService.success('Investor Added', `${newInvestor.name} has been added to your CRM.`, 3000);
  };

  const handleUpdateInvestor = () => {
    if (!selectedInvestor) return;

    const updated = investors.map(inv =>
      inv.id === selectedInvestor.id
        ? {
            ...inv,
            name: formData.name.trim(),
            email: formData.email.trim(),
            status: formData.status,
            amount: formData.amount || undefined,
            priority: formData.priority,
            pitchDeckUrl: formData.pitchDeckUrl || undefined,
            notes: formData.notes || undefined,
            approach: formData.approach || undefined,
            firstContact: formData.firstContact || undefined,
            tags: formData.tags ? formData.tags.split(',').map(t => t.trim()).filter(Boolean) : undefined,
          }
        : inv
    );

    saveInvestors(updated);
    setIsEditModalOpen(false);
    setSelectedInvestor(null);
    resetForm();
    messageService.success('Updated', 'Investor details updated successfully.', 3000);
  };

  const handleDeleteInvestor = (id: string) => {
    if (!confirm('Are you sure you want to remove this investor from CRM?')) return;
    const updated = investors.filter(inv => inv.id !== id);
    saveInvestors(updated);
    messageService.success('Removed', 'Investor removed from CRM.', 2000);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      status: 'to_be_contacted',
      amount: '',
      priority: 'medium',
      pitchDeckUrl: '',
      notes: '',
      approach: '',
      firstContact: '',
      tags: '',
    });
  };

  const openEditModal = (investor: InvestorCRM) => {
    setSelectedInvestor(investor);
    setFormData({
      name: investor.name,
      email: investor.email,
      status: investor.status,
      amount: investor.amount || '',
      priority: investor.priority,
      pitchDeckUrl: investor.pitchDeckUrl || '',
      notes: investor.notes || '',
      approach: investor.approach || '',
      firstContact: investor.firstContact || '',
      tags: investor.tags?.join(', ') || '',
    });
    setIsEditModalOpen(true);
  };

  const handleDragStart = (e: React.DragEvent, investorId: string) => {
    setDraggedInvestor(investorId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, targetStatus: InvestorCRM['status']) => {
    e.preventDefault();
    if (!draggedInvestor) return;

    const updated = investors.map(inv =>
      inv.id === draggedInvestor ? { ...inv, status: targetStatus } : inv
    );
    saveInvestors(updated);
    setDraggedInvestor(null);
  };

  const handleQuickStatusUpdate = (investorId: string, newStatus: InvestorCRM['status']) => {
    const updated = investors.map(inv =>
      inv.id === investorId ? { ...inv, status: newStatus } : inv
    );
    saveInvestors(updated);
    messageService.success('Status Updated', 'Investor status has been updated.', 2000);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-sm text-slate-600">
          <span className="font-medium">FUNDRAISING</span>
          <ChevronRight className="h-4 w-4" />
          <span className="font-semibold text-slate-900">CRM</span>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              type="text"
              placeholder="Search in CRM"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-2 w-48"
            />
          </div>
          <Button
            onClick={() => {
              resetForm();
              setIsAddModalOpen(true);
            }}
            variant="primary"
            size="sm"
            className="bg-slate-900 hover:bg-slate-800"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add investor
          </Button>
          <div className="text-sm text-slate-600">
            {investors.length} {investors.length === 1 ? 'investor' : 'investors'} in CRM
          </div>
        </div>
      </div>

      {/* Kanban Board */}
      <div className="flex gap-4 overflow-x-auto pb-4">
        {STATUS_COLUMNS.map(column => {
          const columnInvestors = investorsByStatus[column.id] || [];
          return (
            <div
              key={column.id}
              className="flex-shrink-0 w-64"
              onDragOver={handleDragOver}
              onDrop={e => handleDrop(e, column.id)}
            >
              <div className={`${column.color} rounded-lg p-3 mb-2`}>
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-slate-900 text-sm">{column.label}</h3>
                  <ChevronRight className="h-4 w-4 text-slate-500" />
                </div>
                <div className="text-xs text-slate-600 mt-1">{columnInvestors.length}</div>
              </div>
              <div className="space-y-3 min-h-[200px]">
                {columnInvestors.map(investor => (
                  <Card
                    key={investor.id}
                    className="p-3 hover:shadow-md transition-shadow"
                    draggable
                    onDragStart={e => handleDragStart(e, investor.id)}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <div className="bg-slate-200 rounded-full p-1.5 flex-shrink-0">
                          <User className="h-4 w-4 text-slate-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-slate-900 text-sm truncate">{investor.name}</h4>
                          <p className="text-xs text-slate-500 truncate">{investor.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={e => {
                            e.stopPropagation();
                            openEditModal(investor);
                          }}
                          className="text-slate-400 hover:text-blue-600 p-1"
                          title="Edit investor"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={e => {
                            e.stopPropagation();
                            handleDeleteInvestor(investor.id);
                          }}
                          className="text-slate-400 hover:text-red-600 p-1"
                          title="Delete investor"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                    <div className="mb-2">
                      <label className="block text-xs font-medium text-slate-600 mb-1">Quick Status Update</label>
                      <select
                        value={investor.status}
                        onChange={e => {
                          e.stopPropagation();
                          handleQuickStatusUpdate(investor.id, e.target.value as InvestorCRM['status']);
                        }}
                        onClick={e => e.stopPropagation()}
                        className="w-full rounded-md border border-slate-300 px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-brand-primary focus:border-brand-primary bg-white"
                      >
                        {STATUS_COLUMNS.map(col => (
                          <option key={col.id} value={col.id}>
                            {col.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-1.5 text-xs">
                      {investor.firstContact && (
                        <div className="flex items-center gap-1 text-slate-600">
                          <Calendar className="h-3 w-3" />
                          <span>{new Date(investor.firstContact).toLocaleDateString()}</span>
                        </div>
                      )}
                      {investor.amount && (
                        <div className="flex items-center gap-1 text-slate-600">
                          <DollarSign className="h-3 w-3" />
                          <span>{investor.amount}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${PRIORITY_COLORS[investor.priority]}`}>
                          Priority: {investor.priority.charAt(0).toUpperCase() + investor.priority.slice(1)}
                        </span>
                      </div>
                      {investor.tags && investor.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {investor.tags.slice(0, 2).map((tag, idx) => (
                            <span key={idx} className="px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded text-xs">
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Add Investor Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => {
          setIsAddModalOpen(false);
          resetForm();
        }}
        title="Add an investor"
        size="lg"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Investor name *</label>
            <Input
              type="text"
              placeholder="Search for investors..."
              value={formData.name}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Contact email *</label>
            <Input
              type="email"
              placeholder="investor@example.com"
              value={formData.email}
              onChange={e => setFormData({ ...formData, email: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
              <select
                value={formData.status}
                onChange={e => setFormData({ ...formData, status: e.target.value as InvestorCRM['status'] })}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand-primary focus:border-brand-primary"
              >
                {STATUS_COLUMNS.map(col => (
                  <option key={col.id} value={col.id}>
                    {col.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Priority</label>
              <select
                value={formData.priority}
                onChange={e => setFormData({ ...formData, priority: e.target.value as InvestorCRM['priority'] })}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand-primary focus:border-brand-primary"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Amount</label>
            <Input
              type="text"
              placeholder="$30,000"
              value={formData.amount}
              onChange={e => setFormData({ ...formData, amount: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Pitch deck</label>
            <Input
              type="url"
              placeholder="https://..."
              value={formData.pitchDeckUrl}
              onChange={e => setFormData({ ...formData, pitchDeckUrl: e.target.value })}
            />
            <p className="text-xs text-slate-500 mt-1">Paste a link to your pitch deck</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Notes</label>
            <textarea
              rows={4}
              placeholder="Add notes about this investor..."
              value={formData.notes}
              onChange={e => setFormData({ ...formData, notes: e.target.value })}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand-primary focus:border-brand-primary resize-y"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Approach</label>
              <Input
                type="text"
                placeholder="N/A"
                value={formData.approach}
                onChange={e => setFormData({ ...formData, approach: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">First contact</label>
              <Input
                type="date"
                value={formData.firstContact}
                onChange={e => setFormData({ ...formData, firstContact: e.target.value })}
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Tags</label>
            <Input
              type="text"
              placeholder="tag1, tag2, tag3"
              value={formData.tags}
              onChange={e => setFormData({ ...formData, tags: e.target.value })}
            />
            <p className="text-xs text-slate-500 mt-1">Separate tags with commas</p>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="secondary" onClick={() => {
              setIsAddModalOpen(false);
              resetForm();
            }}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleAddInvestor} className="bg-pink-600 hover:bg-pink-700">
              <Plus className="h-4 w-4 mr-2" />
              Add investor
            </Button>
          </div>
        </div>
      </Modal>

      {/* Edit Investor Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setSelectedInvestor(null);
          resetForm();
        }}
        title="Edit investor"
        size="lg"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Investor name *</label>
            <Input
              type="text"
              value={formData.name}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Contact email *</label>
            <Input
              type="email"
              value={formData.email}
              onChange={e => setFormData({ ...formData, email: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
              <select
                value={formData.status}
                onChange={e => setFormData({ ...formData, status: e.target.value as InvestorCRM['status'] })}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand-primary focus:border-brand-primary"
              >
                {STATUS_COLUMNS.map(col => (
                  <option key={col.id} value={col.id}>
                    {col.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Priority</label>
              <select
                value={formData.priority}
                onChange={e => setFormData({ ...formData, priority: e.target.value as InvestorCRM['priority'] })}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand-primary focus:border-brand-primary"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Amount</label>
            <Input
              type="text"
              value={formData.amount}
              onChange={e => setFormData({ ...formData, amount: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Pitch deck</label>
            <Input
              type="url"
              value={formData.pitchDeckUrl}
              onChange={e => setFormData({ ...formData, pitchDeckUrl: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Notes</label>
            <textarea
              rows={4}
              value={formData.notes}
              onChange={e => setFormData({ ...formData, notes: e.target.value })}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand-primary focus:border-brand-primary resize-y"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Approach</label>
              <Input
                type="text"
                value={formData.approach}
                onChange={e => setFormData({ ...formData, approach: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">First contact</label>
              <Input
                type="date"
                value={formData.firstContact}
                onChange={e => setFormData({ ...formData, firstContact: e.target.value })}
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Tags</label>
            <Input
              type="text"
              value={formData.tags}
              onChange={e => setFormData({ ...formData, tags: e.target.value })}
            />
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="secondary" onClick={() => {
              setIsEditModalOpen(false);
              setSelectedInvestor(null);
              resetForm();
            }}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleUpdateInvestor}>
              Update investor
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default FundraisingCRM;

