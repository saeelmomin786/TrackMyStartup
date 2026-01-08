import React, { useEffect, useState } from 'react';
import { questionBankService, ApplicationQuestion } from '../lib/questionBankService';
import { messageService } from '../lib/messageService';
import Button from './ui/Button';
import Input from './ui/Input';
import Modal from './ui/Modal';
import { Plus, X, Check, AlertCircle } from 'lucide-react';

interface QuestionSelectorProps {
  opportunityId: string | null; // null for new opportunity
  selectedQuestionIds: string[];
  onSelectionChange: (questionIds: string[]) => void;
}

interface CustomQuestionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (question: { questionText: string; category: string; questionType: string; options?: string[] }) => Promise<void>;
  selectedQuestionType: string;
}

const CustomQuestionModal: React.FC<CustomQuestionModalProps> = ({ isOpen, onClose, onSave, selectedQuestionType }) => {
  const [questionText, setQuestionText] = useState('');
  const [category, setCategory] = useState('');
  const [questionOptions, setQuestionOptions] = useState(''); // For select/multiselect options
  const [questionType, setQuestionType] = useState<'text' | 'textarea' | 'number' | 'date' | 'select' | 'multiselect'>('text');
  const [isSaving, setIsSaving] = useState(false);
  
  // Reset form when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setQuestionText('');
      setCategory('');
      setQuestionOptions('');
      setQuestionType('text');
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!questionText.trim()) {
      messageService.warning('Question Required', 'Please enter a question.');
      return;
    }

    // Validate options for select/multiselect
    if ((questionType === 'select' || questionType === 'multiselect') && !questionOptions.trim()) {
      messageService.warning('Options Required', 'Please provide at least one option for multiple choice/checkbox questions.');
      return;
    }

    setIsSaving(true);
    try {
      // Parse options from textarea (one per line)
      let options: string[] | undefined = undefined;
      if (questionType === 'select' || questionType === 'multiselect') {
        options = questionOptions
          .split('\n')
          .map(line => line.trim())
          .filter(line => line.length > 0);
        
        if (options.length < 2) {
          messageService.warning('Options Required', 'Please provide at least 2 options.');
          setIsSaving(false);
          return;
        }
      }

      await onSave({ 
        questionText: questionText.trim(), 
        category: selectedQuestionType === 'other' ? (category.trim() || null) : null,
        questionType,
        options
      });
      setQuestionText('');
      setCategory('');
      setQuestionOptions('');
      setQuestionType('text');
      onClose();
    } catch (error: any) {
      messageService.error('Failed to Add Question', error.message || 'Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add Custom Question">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">Question *</label>
          <textarea
            value={questionText}
            onChange={(e) => setQuestionText(e.target.value)}
            className="block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-brand-primary sm:text-sm"
            rows={3}
            placeholder="Enter your question here..."
            required
          />
        </div>
        {selectedQuestionType === 'other' && (
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Category (Optional)</label>
            <Input
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="e.g., Company Info, Financial, Team"
            />
          </div>
        )}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">Answer Format *</label>
          <select
            value={questionType}
            onChange={(e) => setQuestionType(e.target.value as any)}
            className="block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-brand-primary sm:text-sm"
            required
          >
            <option value="text">Short Answer</option>
            <option value="textarea">Long Answer</option>
            <option value="select">Multiple Choice (Single Answer)</option>
            <option value="multiselect">Checkbox (Multiple Answers)</option>
            <option value="number">Number</option>
            <option value="date">Date</option>
          </select>
          <p className="text-xs text-slate-500 mt-1">Select the format for how users will answer this question</p>
        </div>
        
        {/* Options field for multiple choice and checkbox questions */}
        {(questionType === 'select' || questionType === 'multiselect') && (
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Answer Options * (one per line)
            </label>
            <textarea
              value={questionOptions}
              onChange={(e) => setQuestionOptions(e.target.value)}
              className="block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-brand-primary sm:text-sm"
              rows={5}
              placeholder="Option 1&#10;Option 2&#10;Option 3&#10;..."
              required={questionType === 'select' || questionType === 'multiselect'}
            />
            <p className="text-xs text-slate-500 mt-1">
              Enter each option on a new line. Users will select from these options.
            </p>
          </div>
        )}
        <div className="bg-blue-50 border border-blue-200 rounded-md p-3 flex items-start gap-2">
          <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-800">
            <p className="font-medium mb-1">Custom Question for Your Organization</p>
            <p>
              This question can be used immediately in your opportunities. Admin approval is only required 
              to add it to the shared question bank for all facilitators.
            </p>
          </div>
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={onClose} disabled={isSaving}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSaving || !questionText.trim()}>
            {isSaving ? 'Adding...' : 'Add Question'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

const QuestionSelector: React.FC<QuestionSelectorProps> = ({
  opportunityId,
  selectedQuestionIds,
  onSelectionChange
}) => {
  const [approvedQuestions, setApprovedQuestions] = useState<ApplicationQuestion[]>([]);
  const [facilitatorQuestions, setFacilitatorQuestions] = useState<ApplicationQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedQuestionType, setSelectedQuestionType] = useState<string>('general');
  const [isCustomQuestionModalOpen, setIsCustomQuestionModalOpen] = useState(false);
  const [existingQuestions, setExistingQuestions] = useState<string[]>([]);

  const QUESTION_TYPES = [
    { value: 'general', label: 'General' },
    { value: 'financial', label: 'Financial' },
    { value: 'social', label: 'Social' },
    { value: 'environmental', label: 'Environmental' },
    { value: 'other', label: 'Other' }
  ];

  useEffect(() => {
    loadQuestions();
  }, []);

  useEffect(() => {
    if (opportunityId) {
      loadExistingQuestions();
    }
  }, [opportunityId]);

  const loadQuestions = async () => {
    try {
      setLoading(true);
      const { supabase } = await import('../lib/supabase');
      const { data: { user } } = await supabase.auth.getUser();
      
      const approved = await questionBankService.getApprovedQuestions();

      setApprovedQuestions(approved);
      
      // Get facilitator questions if user is logged in
      if (user) {
        try {
          const facilitatorQs = await questionBankService.getFacilitatorQuestions(user.id);
          setFacilitatorQuestions(facilitatorQs);
        } catch (error) {
          console.error('Failed to load facilitator questions:', error);
        }
      }
    } catch (error: any) {
      console.error('Failed to load questions:', error);
      messageService.error('Failed to Load Questions', error.message || 'Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const loadExistingQuestions = async () => {
    if (!opportunityId) return;
    try {
      const questions = await questionBankService.getOpportunityQuestions(opportunityId);
      setExistingQuestions(questions.map(q => q.questionId));
      // Set initial selection
      onSelectionChange(questions.map(q => q.questionId));
    } catch (error: any) {
      console.error('Failed to load existing questions:', error);
    }
  };

  const handleAddCustomQuestion = async (questionData: { questionText: string; category: string | null; questionType: string; options?: string[] }) => {
    try {
      // Map question type to category
      const category = selectedQuestionType !== 'other' ? selectedQuestionType : questionData.category || null;
      
      const question = await questionBankService.createQuestion({
        questionText: questionData.questionText,
        category: category || undefined,
        questionType: questionData.questionType as any,
        options: questionData.options,
        status: 'pending'
      });
      
      // Add to facilitator questions list
      setFacilitatorQuestions(prev => [question, ...prev]);
      
      // Auto-select the new question
      onSelectionChange([...selectedQuestionIds, question.id]);
      
      messageService.success('Question Added', 'Your custom question has been added and can be used immediately in your opportunities. Admin approval is only required to add it to the shared question bank.');
    } catch (error: any) {
      throw error;
    }
  };

  const handleToggleQuestion = (questionId: string) => {
    if (selectedQuestionIds.includes(questionId)) {
      onSelectionChange(selectedQuestionIds.filter(id => id !== questionId));
    } else {
      onSelectionChange([...selectedQuestionIds, questionId]);
    }
  };

  // Filter questions by type and search term
  // Include both approved questions AND facilitator's own pending questions
  const getQuestionsByType = (type: string) => {
    // Get facilitator's own pending questions
    const facilitatorPendingQuestions = facilitatorQuestions.filter(q => 
      q.status === 'pending' && 
      !approvedQuestions.find(aq => aq.id === q.id)
    );
    
    // Combine approved questions and facilitator's pending questions
    const allQuestions = [
      ...approvedQuestions,
      ...facilitatorPendingQuestions
    ];

    return allQuestions.filter(q => {
      const matchesSearch = q.questionText.toLowerCase().includes(searchTerm.toLowerCase());
      // Map category to question type
      const questionType = q.category?.toLowerCase() || 'other';
      const matchesType = 
        type === 'general' ? (questionType === 'general' || questionType === 'company info' || questionType === 'product' || questionType === 'market' || questionType === 'team' || questionType === 'technology' || questionType === 'growth' || !q.category) :
        type === 'financial' ? (questionType === 'financial' || questionType.includes('financial')) :
        type === 'social' ? (questionType === 'social' || questionType.includes('social')) :
        type === 'environmental' ? (questionType === 'environmental' || questionType.includes('environmental') || questionType.includes('climate')) :
        type === 'other' ? (!['general', 'company info', 'product', 'market', 'team', 'technology', 'growth', 'financial', 'social', 'environmental', 'climate'].includes(questionType)) :
        true;
      return matchesSearch && matchesType;
    });
  };

  const filteredQuestions = getQuestionsByType(selectedQuestionType);

  return (
    <div className="space-y-4">
      <div>
        <h4 className="text-md font-semibold text-slate-700">Application Questions</h4>
        <p className="text-xs text-slate-500 mt-1">
          Select questions to include in your application form. You can use approved questions from the shared bank 
          or your own custom questions (pending approval for shared bank, but usable immediately in your opportunities).
        </p>
      </div>

      {/* Question Type Selector and Add Button */}
      <div className="flex gap-2 items-end">
        <div className="flex-1">
          <label className="block text-sm font-medium text-slate-700 mb-2">Question Type</label>
          <select
            value={selectedQuestionType}
            onChange={(e) => setSelectedQuestionType(e.target.value)}
            className="block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-brand-primary sm:text-sm"
          >
            {QUESTION_TYPES.map(type => (
              <option key={type.value} value={type.value}>{type.label}</option>
            ))}
          </select>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setIsCustomQuestionModalOpen(true)}
          className="mb-0"
        >
          <Plus className="h-4 w-4 mr-1" />
          Add a question not in the list
        </Button>
      </div>

      {/* Search */}
      <div>
        <Input
          type="text"
          placeholder="Search questions..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full"
        />
      </div>

      {/* Questions List */}
      <div className="border border-slate-200 rounded-md max-h-96 overflow-y-auto">
        {loading ? (
          <div className="p-8 text-center text-slate-500">Loading questions...</div>
        ) : filteredQuestions.length === 0 ? (
          <div className="p-8 text-center text-slate-500">
            {searchTerm ? `No ${QUESTION_TYPES.find(t => t.value === selectedQuestionType)?.label.toLowerCase()} questions match your search.` : `No ${QUESTION_TYPES.find(t => t.value === selectedQuestionType)?.label.toLowerCase()} questions available.`}
          </div>
        ) : (
          <div className="divide-y divide-slate-200">
            {filteredQuestions.map(question => {
              const isSelected = selectedQuestionIds.includes(question.id);
              const isPending = question.status === 'pending';
              const isApproved = question.status === 'approved';

              return (
                <label
                  key={question.id}
                  className={`flex items-start gap-3 p-3 hover:bg-slate-50 cursor-pointer ${
                    isSelected ? 'bg-brand-light/20' : ''
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => handleToggleQuestion(question.id)}
                    className="mt-1 h-4 w-4 text-brand-primary focus:ring-brand-primary border-slate-300 rounded"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm text-slate-900">{question.questionText}</p>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {isPending && (
                          <span className="px-2 py-0.5 text-xs font-medium bg-yellow-100 text-yellow-800 rounded" title="Pending approval for shared bank - can be used in your opportunities">
                            Pending (Your Question)
                          </span>
                        )}
                        {isApproved && (
                          <span className="px-2 py-0.5 text-xs font-medium bg-green-100 text-green-800 rounded">
                            Approved
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      {question.category && (
                        <span className="text-xs text-slate-500">Category: {question.category}</span>
                      )}
                      <span className="text-xs text-slate-500">
                        Type: {
                          question.questionType === 'text' ? 'Short Answer' :
                          question.questionType === 'textarea' ? 'Long Answer' :
                          question.questionType === 'select' ? 'Multiple Choice' :
                          question.questionType === 'multiselect' ? 'Checkbox' :
                          question.questionType === 'number' ? 'Number' :
                          question.questionType === 'date' ? 'Date' :
                          question.questionType
                        }
                      </span>
                      {question.options && question.options.length > 0 && (
                        <span className="text-xs text-slate-500">
                          ({question.options.length} option{question.options.length !== 1 ? 's' : ''})
                        </span>
                      )}
                    </div>
                  </div>
                </label>
              );
            })}
          </div>
        )}
      </div>

      {selectedQuestionIds.length > 0 && (
        <div className="bg-slate-50 border border-slate-200 rounded-md p-3">
          <p className="text-sm font-medium text-slate-700">
            {selectedQuestionIds.length} question{selectedQuestionIds.length !== 1 ? 's' : ''} selected
          </p>
        </div>
      )}

      <CustomQuestionModal
        isOpen={isCustomQuestionModalOpen}
        onClose={() => setIsCustomQuestionModalOpen(false)}
        onSave={handleAddCustomQuestion}
        selectedQuestionType={selectedQuestionType}
      />
    </div>
  );
};

export default QuestionSelector;

