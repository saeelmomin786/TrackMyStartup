import React, { useState, useEffect, useMemo } from 'react';
import Card from '../ui/Card';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Modal from '../ui/Modal';
import { Plus, Search, MoreVertical, Settings, HelpCircle, X, User, Calendar, DollarSign, FileText, ChevronRight, Edit2 } from 'lucide-react';
import { messageService } from '../../lib/messageService';
import { supabase } from '../../lib/supabase';
import { incubationProgramsService } from '../../lib/incubationProgramsService';
import { AddIncubationProgramData } from '../../types';

interface InvestorCRM {
  id: string;
  name: string;
  email?: string; // Optional
  status: 'to_be_contacted' | 'reached_out' | 'in_progress' | 'committed' | 'not_happening';
  amount?: string;
  priority: 'low' | 'medium' | 'high';
  pitchDeckUrl?: string;
  notes?: string;
  approach?: string;
  firstContact?: string;
  tags?: string[];
  createdAt: string;
  type: 'investor';
}

interface ProgramCRM {
  id: string;
  programName: string;
  programType: 'Grant' | 'Incubation' | 'Acceleration' | 'Mentorship' | 'Bootcamp';
  status: 'to_be_contacted' | 'reached_out' | 'in_progress' | 'committed' | 'not_happening';
  priority: 'low' | 'medium' | 'high';
  notes?: string;
  approach?: string;
  firstContact?: string;
  startDate?: string;
  endDate?: string;
  description?: string;
  mentorName?: string;
  mentorEmail?: string;
  programUrl?: string;
  tags?: string[];
  createdAt: string;
  type: 'program';
}

type CRMItem = InvestorCRM | ProgramCRM;

interface FundraisingCRMProps {
  startupId: number;
  onInvestorAdded?: (investor: InvestorCRM) => void;
  // Expose method to add investor from outside
  addInvestorToCRM?: (investorData: {
    name: string;
    email?: string;
    website?: string;
    linkedin?: string;
  }) => void;
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

const FundraisingCRM = React.forwardRef<{ 
  addInvestorToCRM: (investorData: { name: string; email?: string; website?: string; linkedin?: string }) => void;
  addProgramToCRM: (programData: { programName: string; programType?: 'Grant' | 'Incubation' | 'Acceleration' | 'Mentorship' | 'Bootcamp'; description?: string; programUrl?: string; facilitatorName?: string }) => void;
}, FundraisingCRMProps>(({ startupId, onInvestorAdded }, ref) => {
  const [crmItems, setCrmItems] = useState<CRMItem[]>([]);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [draggedItem, setDraggedItem] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<CRMItem | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isAddingProgram, setIsAddingProgram] = useState(false);
  
  // Legacy investors state for backward compatibility
  const investors = crmItems.filter(item => item.type === 'investor') as InvestorCRM[];
  
  // Grant/Incubation Program modal states
  const [isProgramModalOpen, setIsProgramModalOpen] = useState(false);
  const [programFormData, setProgramFormData] = useState({
    programName: '',
    programType: 'Grant' as 'Grant' | 'Incubation' | 'Acceleration' | 'Mentorship' | 'Bootcamp',
    status: 'to_be_contacted' as 'to_be_contacted' | 'reached_out' | 'in_progress' | 'committed' | 'not_happening',
    priority: 'medium' as 'low' | 'medium' | 'high',
    approach: '',
    firstContact: '',
    notes: '',
    startDate: '',
    endDate: '',
    description: '',
    mentorName: '',
    mentorEmail: '',
    programUrl: '',
    tags: '',
  });

  // Form state for investors
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
    loadCRMItems();
  }, [startupId]);

  // Handler to add program from external source (like OpportunitiesTab)
  const handleAddProgramFromExternal = async (programData: {
    programName: string;
    programType?: 'Grant' | 'Incubation' | 'Acceleration' | 'Mentorship' | 'Bootcamp';
    description?: string;
    programUrl?: string;
    facilitatorName?: string;
  }) => {
    try {
      // Determine program type - default to Grant if not specified
      const programType = programData.programType || 'Grant';
      
      // Save to database
      const addProgramData: AddIncubationProgramData = {
        programName: programData.programName,
        programType: programType,
        description: programData.description || undefined,
        programUrl: programData.programUrl || undefined,
        mentorName: programData.facilitatorName || undefined,
      };
      
      const savedProgram = await incubationProgramsService.addIncubationProgram(startupId, addProgramData);
      
      // Create CRM item for the program
      const programCRMItem: ProgramCRM = {
        id: `program_${savedProgram.id}`,
        programName: savedProgram.programName,
        programType: savedProgram.programType,
        status: 'to_be_contacted',
        priority: 'medium',
        approach: undefined,
        firstContact: undefined,
        notes: programData.description || undefined,
        startDate: savedProgram.startDate,
        endDate: savedProgram.endDate,
        description: savedProgram.description,
        mentorName: savedProgram.mentorName,
        mentorEmail: savedProgram.mentorEmail,
        programUrl: savedProgram.programUrl,
        tags: undefined,
        createdAt: savedProgram.createdAt,
        type: 'program',
      };
      
      // Save CRM metadata
      await saveProgramsMetadata(programCRMItem.id, {
        status: 'to_be_contacted',
        priority: 'medium',
      });
      
      // Add to CRM items
      setCrmItems(prev => [...prev, programCRMItem]);
      messageService.success('Program Added', `${programData.programName} has been added to CRM.`, 3000);
    } catch (error) {
      console.error('Error adding program to CRM:', error);
      messageService.error('Failed', 'Could not add program to CRM. Please try again.', 3000);
    }
  };

  // Expose methods via ref
  React.useImperativeHandle(ref, () => ({
    addInvestorToCRM: (investorData: { name: string; email?: string; website?: string; linkedin?: string }) => {
      handleAddInvestor(investorData);
    },
    addProgramToCRM: (programData: { programName: string; programType?: 'Grant' | 'Incubation' | 'Acceleration' | 'Mentorship' | 'Bootcamp'; description?: string; programUrl?: string; facilitatorName?: string }) => {
      handleAddProgramFromExternal(programData);
    }
  }), [investors, startupId]);

  const loadCRMItems = async () => {
    try {
      // Load investors from localStorage
      const investorsStored = localStorage.getItem(`crm_investors_${startupId}`);
      const investors: InvestorCRM[] = investorsStored ? JSON.parse(investorsStored).map((inv: any) => ({ ...inv, type: 'investor' as const })) : [];
      
      // Load programs from database
      const programs = await incubationProgramsService.getIncubationPrograms(startupId);
      const programCRMItems: ProgramCRM[] = programs.map(prog => ({
        id: `program_${prog.id}`,
        programName: prog.programName,
        programType: prog.programType,
        status: 'to_be_contacted' as const, // Default status, can be stored separately
        priority: 'medium' as const,
        notes: prog.description,
        startDate: prog.startDate || undefined, // Optional - can be undefined
        endDate: prog.endDate || undefined, // Optional - can be undefined
        description: prog.description,
        mentorName: prog.mentorName,
        mentorEmail: prog.mentorEmail,
        programUrl: prog.programUrl,
        createdAt: prog.createdAt,
        type: 'program' as const,
      }));
      
      // Also load program CRM metadata from localStorage
      const programsMetadataStored = localStorage.getItem(`crm_programs_${startupId}`);
      const programsMetadata: Record<string, Partial<ProgramCRM>> = programsMetadataStored ? JSON.parse(programsMetadataStored) : {};
      
      // Merge program data with metadata
      const mergedPrograms = programCRMItems.map(prog => {
        const metadata = programsMetadata[prog.id] || {};
        return { ...prog, ...metadata };
      });
      
      setCrmItems([...investors, ...mergedPrograms]);
    } catch (error) {
      console.error('Error loading CRM items:', error);
    }
  };

  const saveInvestors = async (updatedInvestors: InvestorCRM[]) => {
    try {
      const investorsWithoutType = updatedInvestors.map(({ type, ...rest }) => rest);
      localStorage.setItem(`crm_investors_${startupId}`, JSON.stringify(investorsWithoutType));
      
      // Update CRM items
      const programs = crmItems.filter(item => item.type === 'program');
      setCrmItems([...updatedInvestors, ...programs]);
    } catch (error) {
      console.error('Error saving investors:', error);
      messageService.error('Save Failed', 'Could not save investor data.', 3000);
    }
  };

  const saveProgramsMetadata = async (programId: string, metadata: Partial<ProgramCRM>) => {
    try {
      const programsMetadataStored = localStorage.getItem(`crm_programs_${startupId}`);
      const programsMetadata: Record<string, Partial<ProgramCRM>> = programsMetadataStored ? JSON.parse(programsMetadataStored) : {};
      programsMetadata[programId] = { ...programsMetadata[programId], ...metadata };
      localStorage.setItem(`crm_programs_${startupId}`, JSON.stringify(programsMetadata));
      
      // Update CRM items
      setCrmItems(prev => prev.map(item => 
        item.id === programId ? { ...item, ...metadata } : item
      ));
    } catch (error) {
      console.error('Error saving program metadata:', error);
    }
  };

  const filteredCRMItems = useMemo(() => {
    if (!searchQuery.trim()) return crmItems;
    const query = searchQuery.toLowerCase();
    return crmItems.filter(item => {
      if (item.type === 'investor') {
        return (
          item.name.toLowerCase().includes(query) ||
          item.email?.toLowerCase().includes(query) ||
          item.notes?.toLowerCase().includes(query) ||
          item.tags?.some(tag => tag.toLowerCase().includes(query))
        );
      } else {
        return (
          item.programName.toLowerCase().includes(query) ||
          item.description?.toLowerCase().includes(query) ||
          item.mentorName?.toLowerCase().includes(query) ||
          item.mentorEmail?.toLowerCase().includes(query) ||
          item.notes?.toLowerCase().includes(query) ||
          item.tags?.some(tag => tag.toLowerCase().includes(query))
        );
      }
    });
  }, [crmItems, searchQuery]);

  const itemsByStatus = useMemo(() => {
    const grouped: Record<string, CRMItem[]> = {
      to_be_contacted: [],
      reached_out: [],
      in_progress: [],
      committed: [],
      not_happening: [],
    };
    filteredCRMItems.forEach(item => {
      if (grouped[item.status]) {
        grouped[item.status].push(item);
      }
    });
    return grouped;
  }, [filteredCRMItems]);

  const handleAddInvestor = (investorData?: {
    name: string;
    email?: string;
    website?: string;
    linkedin?: string;
  }) => {
    // If investorData is provided, auto-add to CRM
    if (investorData) {
      const newInvestor: InvestorCRM = {
        id: `inv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        name: investorData.name.trim(),
        email: investorData.email || undefined, // Optional - no auto-generation
        status: 'to_be_contacted',
        amount: undefined,
        priority: 'medium',
        pitchDeckUrl: undefined,
        notes: investorData.website || investorData.linkedin ? `Website: ${investorData.website || ''}\nLinkedIn: ${investorData.linkedin || ''}` : undefined,
        approach: undefined,
        firstContact: undefined,
        tags: undefined,
        createdAt: new Date().toISOString(),
        type: 'investor',
      };

      const updated = [...investors, newInvestor];
      saveInvestors(updated);
      messageService.success('Investor Added', `${newInvestor.name} has been added to your CRM.`, 3000);
      
      // Call callback if provided
      if (onInvestorAdded) {
        onInvestorAdded(newInvestor);
      }
      return;
    }

    // Normal form submission
    if (!formData.name.trim()) {
      messageService.warning('Required Fields', 'Please fill in investor name.', 3000);
      return;
    }

    const newInvestor: InvestorCRM = {
      id: `inv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: formData.name.trim(),
      email: formData.email?.trim() || undefined,
      status: formData.status,
      amount: formData.amount || undefined,
      priority: formData.priority,
      pitchDeckUrl: formData.pitchDeckUrl || undefined,
      notes: formData.notes || undefined,
      approach: formData.approach || undefined,
      firstContact: formData.firstContact || undefined,
      tags: formData.tags ? formData.tags.split(',').map(t => t.trim()).filter(Boolean) : undefined,
      createdAt: new Date().toISOString(),
      type: 'investor',
    };

    const updated = [...investors, newInvestor];
    saveInvestors(updated);
    setIsAddModalOpen(false);
    resetForm();
    messageService.success('Investor Added', `${newInvestor.name} has been added to your CRM.`, 3000);
    
    // Call callback if provided
    if (onInvestorAdded) {
      onInvestorAdded(newInvestor);
    }
  };

  const handleUpdateInvestor = () => {
    if (!selectedItem || selectedItem.type !== 'investor') return;

      const updated = investors.map(inv =>
        inv.id === selectedItem.id
          ? {
              ...inv,
              name: formData.name.trim(),
              email: formData.email?.trim() || undefined,
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
    setSelectedItem(null);
    resetForm();
    messageService.success('Updated', 'Investor details updated successfully.', 3000);
  };

  const handleDeleteItem = (id: string, type: 'investor' | 'program') => {
    if (!confirm(`Are you sure you want to remove this ${type} from CRM?`)) return;
    
    if (type === 'investor') {
      const updated = investors.filter(inv => inv.id !== id);
      saveInvestors(updated);
      messageService.success('Removed', 'Investor removed from CRM.', 2000);
    } else {
      // For programs, we can remove from CRM tracking but keep in database
      const updated = crmItems.filter(item => item.id !== id);
      setCrmItems(updated);
      // Also remove from metadata
      const programsMetadataStored = localStorage.getItem(`crm_programs_${startupId}`);
      const programsMetadata: Record<string, Partial<ProgramCRM>> = programsMetadataStored ? JSON.parse(programsMetadataStored) : {};
      delete programsMetadata[id];
      localStorage.setItem(`crm_programs_${startupId}`, JSON.stringify(programsMetadata));
      messageService.success('Removed', 'Program removed from CRM tracking.', 2000);
    }
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

  const openEditModal = (item: CRMItem) => {
    setSelectedItem(item);
    if (item.type === 'investor') {
      setFormData({
        name: item.name,
        email: item.email || '',
        status: item.status,
        amount: item.amount || '',
        priority: item.priority,
        pitchDeckUrl: item.pitchDeckUrl || '',
        notes: item.notes || '',
        approach: item.approach || '',
        firstContact: item.firstContact || '',
        tags: item.tags?.join(', ') || '',
      });
      setIsAddingProgram(false);
      setIsEditModalOpen(true);
    } else {
      setProgramFormData({
        programName: item.programName,
        programType: item.programType,
        status: item.status,
        priority: item.priority,
        approach: item.approach || '',
        firstContact: item.firstContact || '',
        notes: item.notes || '',
        startDate: item.startDate || undefined,
        endDate: item.endDate || undefined,
        description: item.description || '',
        mentorName: item.mentorName || '',
        mentorEmail: item.mentorEmail || '',
        programUrl: item.programUrl || '',
        tags: item.tags?.join(', ') || '',
      });
      setIsAddingProgram(false);
      setIsProgramModalOpen(true);
    }
  };

  const handleDragStart = (e: React.DragEvent, itemId: string) => {
    setDraggedItem(itemId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, targetStatus: CRMItem['status']) => {
    e.preventDefault();
    if (!draggedItem) return;

    const item = crmItems.find(i => i.id === draggedItem);
    if (!item) return;

    if (item.type === 'investor') {
      const updated = investors.map(inv =>
        inv.id === draggedItem ? { ...inv, status: targetStatus } : inv
      );
      saveInvestors(updated);
    } else {
      saveProgramsMetadata(draggedItem, { status: targetStatus });
    }
    setDraggedItem(null);
  };

  const handleQuickStatusUpdate = (itemId: string, newStatus: CRMItem['status']) => {
    const item = crmItems.find(i => i.id === itemId);
    if (!item) return;

    if (item.type === 'investor') {
      const updated = investors.map(inv =>
        inv.id === itemId ? { ...inv, status: newStatus } : inv
      );
      saveInvestors(updated);
    } else {
      saveProgramsMetadata(itemId, { status: newStatus });
    }
    messageService.success('Status Updated', 'Status has been updated.', 2000);
  };

  const handleAddOrUpdateProgram = async () => {
    if (!programFormData.programName.trim()) {
      messageService.warning('Required Fields', 'Please fill in program name.', 3000);
      return;
    }

    try {
      if (isAddingProgram) {
        // Save to database (dates are optional now)
        const programData: AddIncubationProgramData = {
          programName: programFormData.programName,
          programType: programFormData.programType,
          startDate: programFormData.startDate?.trim() || undefined,
          endDate: programFormData.endDate?.trim() || undefined,
          description: programFormData.description?.trim() || undefined,
          mentorName: programFormData.mentorName?.trim() || undefined,
          mentorEmail: programFormData.mentorEmail?.trim() || undefined,
          programUrl: programFormData.programUrl?.trim() || undefined,
        };
        
        const savedProgram = await incubationProgramsService.addIncubationProgram(startupId, programData);
        
        // Create CRM item for the program
        const programCRMItem: ProgramCRM = {
          id: `program_${savedProgram.id}`,
          programName: savedProgram.programName,
          programType: savedProgram.programType,
          status: programFormData.status,
          priority: programFormData.priority,
          approach: programFormData.approach || undefined,
          firstContact: programFormData.firstContact || undefined,
          notes: programFormData.notes || undefined,
          startDate: savedProgram.startDate,
          endDate: savedProgram.endDate,
          description: savedProgram.description,
          mentorName: savedProgram.mentorName,
          mentorEmail: savedProgram.mentorEmail,
          programUrl: savedProgram.programUrl,
          tags: programFormData.tags ? programFormData.tags.split(',').map(t => t.trim()).filter(Boolean) : undefined,
          createdAt: savedProgram.createdAt,
          type: 'program',
        };
        
        // Save CRM metadata
        await saveProgramsMetadata(programCRMItem.id, {
          status: programFormData.status,
          priority: programFormData.priority,
          approach: programFormData.approach || undefined,
          firstContact: programFormData.firstContact || undefined,
          notes: programFormData.notes || undefined,
          tags: programFormData.tags ? programFormData.tags.split(',').map(t => t.trim()).filter(Boolean) : undefined,
        });
        
        // Add to CRM items
        setCrmItems(prev => [...prev, programCRMItem]);
        messageService.success('Program Added', `${programFormData.programName} has been added to CRM.`, 3000);
      } else {
        // Update existing program
        if (!selectedItem || selectedItem.type !== 'program') return;
        
        const programId = selectedItem.id.replace('program_', '');
        
        // Update in database
        await incubationProgramsService.updateIncubationProgram(programId, {
          programName: programFormData.programName,
          programType: programFormData.programType,
          startDate: programFormData.startDate?.trim() || undefined,
          endDate: programFormData.endDate?.trim() || undefined,
          description: programFormData.description?.trim() || undefined,
          mentorName: programFormData.mentorName?.trim() || undefined,
          mentorEmail: programFormData.mentorEmail?.trim() || undefined,
          programUrl: programFormData.programUrl?.trim() || undefined,
        });
        
        // Update CRM metadata
        await saveProgramsMetadata(selectedItem.id, {
          status: programFormData.status,
          priority: programFormData.priority,
          approach: programFormData.approach || undefined,
          firstContact: programFormData.firstContact || undefined,
          notes: programFormData.notes || undefined,
          tags: programFormData.tags ? programFormData.tags.split(',').map(t => t.trim()).filter(Boolean) : undefined,
        });
        
        // Reload CRM items
        await loadCRMItems();
        messageService.success('Program Updated', `${programFormData.programName} has been updated.`, 3000);
      }
      
      setIsProgramModalOpen(false);
      setProgramFormData({
        programName: '',
        programType: 'Grant',
        status: 'to_be_contacted',
        priority: 'medium',
        approach: '',
        firstContact: '',
        notes: '',
        startDate: '',
        endDate: '',
        description: '',
        mentorName: '',
        mentorEmail: '',
        programUrl: '',
        tags: '',
      });
      setSelectedItem(null);
    } catch (error) {
      console.error('Error saving program:', error);
      messageService.error('Failed', 'Could not save program. Please try again.', 3000);
    }
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
          <Button
            onClick={() => {
              setProgramFormData({
                programName: '',
                programType: 'Grant',
                status: 'to_be_contacted',
                priority: 'medium',
                approach: '',
                firstContact: '',
                notes: '',
                startDate: '',
                endDate: '',
                description: '',
                mentorName: '',
                mentorEmail: '',
                programUrl: '',
                tags: '',
              });
              setIsAddingProgram(true);
              setIsProgramModalOpen(true);
            }}
            variant="primary"
            size="sm"
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add grant/incubation program
          </Button>
          <div className="text-sm text-slate-600">
            {crmItems.length} {crmItems.length === 1 ? 'item' : 'items'} in CRM ({investors.length} investors, {crmItems.filter(i => i.type === 'program').length} programs)
          </div>
        </div>
      </div>

      {/* Kanban Board */}
      <div className="flex gap-4 overflow-x-auto pb-4">
        {STATUS_COLUMNS.map(column => {
          const columnItems = itemsByStatus[column.id] || [];
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
                <div className="text-xs text-slate-600 mt-1">{columnItems.length}</div>
              </div>
              <div className="space-y-3 min-h-[200px]">
                {columnItems.map(item => (
                  <Card
                    key={item.id}
                    className="p-3 hover:shadow-md transition-shadow"
                    draggable
                    onDragStart={e => handleDragStart(e, item.id)}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <div className={`rounded-full p-1.5 flex-shrink-0 ${item.type === 'investor' ? 'bg-slate-200' : 'bg-blue-200'}`}>
                          {item.type === 'investor' ? (
                            <User className="h-4 w-4 text-slate-600" />
                          ) : (
                            <FileText className="h-4 w-4 text-blue-600" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-slate-900 text-sm truncate">
                            {item.type === 'investor' ? item.name : item.programName}
                          </h4>
                          <p className="text-xs text-slate-500 truncate">
                            {item.type === 'investor' ? (item.email || 'No email') : `${item.programType} Program`}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={e => {
                            e.stopPropagation();
                            openEditModal(item);
                          }}
                          className="text-slate-400 hover:text-blue-600 p-1"
                          title={`Edit ${item.type}`}
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={e => {
                            e.stopPropagation();
                            handleDeleteItem(item.id, item.type);
                          }}
                          className="text-slate-400 hover:text-red-600 p-1"
                          title={`Delete ${item.type}`}
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                    <div className="mb-2">
                      <label className="block text-xs font-medium text-slate-600 mb-1">Quick Status Update</label>
                      <select
                        value={item.status}
                        onChange={e => {
                          e.stopPropagation();
                          handleQuickStatusUpdate(item.id, e.target.value as CRMItem['status']);
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
                      {item.firstContact && (
                        <div className="flex items-center gap-1 text-slate-600">
                          <Calendar className="h-3 w-3" />
                          <span>{new Date(item.firstContact).toLocaleDateString()}</span>
                        </div>
                      )}
                      {item.type === 'investor' && item.amount && (
                        <div className="flex items-center gap-1 text-slate-600">
                          <DollarSign className="h-3 w-3" />
                          <span>{item.amount}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${PRIORITY_COLORS[item.priority]}`}>
                          Priority: {item.priority.charAt(0).toUpperCase() + item.priority.slice(1)}
                        </span>
                      </div>
                      {item.tags && item.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {item.tags.slice(0, 2).map((tag, idx) => (
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
            <label className="block text-sm font-medium text-slate-700 mb-1">Contact email (Optional)</label>
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
          setSelectedItem(null);
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
            <label className="block text-sm font-medium text-slate-700 mb-1">Contact email (Optional)</label>
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
              setSelectedItem(null);
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

      {/* Add Grant/Incubation Program Modal */}
      <Modal
        isOpen={isProgramModalOpen}
        onClose={() => {
          setIsProgramModalOpen(false);
          setProgramFormData({
            programName: '',
            programType: 'Grant',
            status: 'to_be_contacted',
            priority: 'medium',
            approach: '',
            firstContact: '',
            notes: '',
            startDate: '',
            endDate: '',
            description: '',
            mentorName: '',
            mentorEmail: '',
            programUrl: '',
            tags: '',
          });
        }}
        title={isAddingProgram ? "Add Grant/Incubation Program" : "Edit Grant/Incubation Program"}
        size="lg"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Program Name *</label>
            <Input
              type="text"
              placeholder="e.g., Startup India Seed Fund, Y Combinator"
              value={programFormData.programName}
              onChange={e => setProgramFormData({ ...programFormData, programName: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Program Type *</label>
            <select
              value={programFormData.programType}
              onChange={e => setProgramFormData({ ...programFormData, programType: e.target.value as any })}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand-primary focus:border-brand-primary"
            >
              <option value="Grant">Grant</option>
              <option value="Incubation">Incubation</option>
              <option value="Acceleration">Acceleration</option>
              <option value="Mentorship">Mentorship</option>
              <option value="Bootcamp">Bootcamp</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
              <select
                value={programFormData.status}
                onChange={e => setProgramFormData({ ...programFormData, status: e.target.value as any })}
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
                value={programFormData.priority}
                onChange={e => setProgramFormData({ ...programFormData, priority: e.target.value as any })}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand-primary focus:border-brand-primary"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Start Date (Optional)</label>
              <Input
                type="date"
                value={programFormData.startDate || ''}
                onChange={e => setProgramFormData({ ...programFormData, startDate: e.target.value || '' })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">End Date (Optional)</label>
              <Input
                type="date"
                value={programFormData.endDate || ''}
                onChange={e => setProgramFormData({ ...programFormData, endDate: e.target.value || '' })}
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
            <textarea
              rows={3}
              placeholder="Add description about the program..."
              value={programFormData.description || ''}
              onChange={e => setProgramFormData({ ...programFormData, description: e.target.value })}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand-primary focus:border-brand-primary resize-y"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Mentor/Contact Name</label>
              <Input
                type="text"
                placeholder="Mentor or contact person name"
                value={programFormData.mentorName || ''}
                onChange={e => setProgramFormData({ ...programFormData, mentorName: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Mentor/Contact Email</label>
              <Input
                type="email"
                placeholder="mentor@example.com"
                value={programFormData.mentorEmail || ''}
                onChange={e => setProgramFormData({ ...programFormData, mentorEmail: e.target.value })}
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Program URL</label>
            <Input
              type="url"
              placeholder="https://..."
              value={programFormData.programUrl || ''}
              onChange={e => setProgramFormData({ ...programFormData, programUrl: e.target.value })}
            />
            <p className="text-xs text-slate-500 mt-1">Link to the program website or application page</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Notes</label>
            <textarea
              rows={4}
              placeholder="Add notes about this program..."
              value={programFormData.notes || ''}
              onChange={e => setProgramFormData({ ...programFormData, notes: e.target.value })}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand-primary focus:border-brand-primary resize-y"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Approach</label>
              <Input
                type="text"
                placeholder="N/A"
                value={programFormData.approach}
                onChange={e => setProgramFormData({ ...programFormData, approach: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">First contact</label>
              <Input
                type="date"
                value={programFormData.firstContact}
                onChange={e => setProgramFormData({ ...programFormData, firstContact: e.target.value })}
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Tags</label>
            <Input
              type="text"
              placeholder="tag1, tag2, tag3"
              value={programFormData.tags}
              onChange={e => setProgramFormData({ ...programFormData, tags: e.target.value })}
            />
            <p className="text-xs text-slate-500 mt-1">Separate tags with commas</p>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="secondary" onClick={() => {
              setIsProgramModalOpen(false);
              setProgramFormData({
                programName: '',
                programType: 'Grant',
                status: 'to_be_contacted',
                priority: 'medium',
                approach: '',
                firstContact: '',
                notes: '',
                startDate: '',
                endDate: '',
                description: '',
                mentorName: '',
                mentorEmail: '',
                programUrl: '',
                tags: '',
              });
            }}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleAddOrUpdateProgram} className="bg-blue-600 hover:bg-blue-700">
              <Plus className="h-4 w-4 mr-2" />
              {isAddingProgram ? 'Add Program' : 'Update Program'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
});

// Expose addInvestorToCRM method via ref
FundraisingCRM.displayName = 'FundraisingCRM';

export default FundraisingCRM;

