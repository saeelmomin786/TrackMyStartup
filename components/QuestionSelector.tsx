import React, { useEffect, useState } from 'react';
import { questionBankService, ApplicationQuestion } from '../lib/questionBankService';
import { messageService } from '../lib/messageService';
import Button from './ui/Button';
import Input from './ui/Input';
import Modal from './ui/Modal';
import { Plus, X, Check, AlertCircle, ChevronUp, ChevronDown, GripVertical } from 'lucide-react';

interface QuestionSelectorProps {
  opportunityId: string | null; // null for new opportunity
  contextOpportunityId?: string | null; // for scoping custom questions to a specific program/form
  selectedQuestionIds: string[];
  onSelectionChange: (questionIds: string[]) => void;
  questionRequiredMap?: Map<string, boolean>; // Map of questionId -> isRequired
  onRequiredChange?: (questionId: string, isRequired: boolean) => void;
  questionSelectionTypeMap?: Map<string, 'single' | 'multiple' | null>; // Map of questionId -> selectionType
  onSelectionTypeChange?: (questionId: string, selectionType: 'single' | 'multiple' | null) => void;
}

interface CustomQuestionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (question: { questionText: string; category: string; questionType: string; options?: string[]; scope?: 'global' | 'facilitator' | 'opportunity'; scopeOpportunityId?: string | null }) => Promise<void>;
  selectedQuestionType: string;
  contextOpportunityId?: string | null;
}

const CustomQuestionModal: React.FC<CustomQuestionModalProps> = ({ isOpen, onClose, onSave, selectedQuestionType, contextOpportunityId }) => {
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
        options,
        scope: 'facilitator',
        scopeOpportunityId: contextOpportunityId || null
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
    <Modal isOpen={isOpen} onClose={onClose} title="Add Custom Question" size="large" zIndex={10000}>
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
            <label className="block text-sm font-medium text-slate-700 mb-2">Custom Category (Optional)</label>
            <Input
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="Enter a custom category name"
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
            <p className="font-medium mb-1">How This Works:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Your question will be added to this form immediately</li>
              <li>The question will be sent to admin for approval</li>
              <li>Once approved, it becomes available in the shared question bank for all facilitators</li>
            </ul>
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
  contextOpportunityId,
  selectedQuestionIds,
  onSelectionChange,
  questionRequiredMap = new Map(),
  onRequiredChange,
  questionSelectionTypeMap = new Map(),
  onSelectionTypeChange
}) => {
  const [approvedQuestions, setApprovedQuestions] = useState<ApplicationQuestion[]>([]);
  const [facilitatorQuestions, setFacilitatorQuestions] = useState<ApplicationQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [isCustomQuestionModalOpen, setIsCustomQuestionModalOpen] = useState(false);
  const [existingQuestions, setExistingQuestions] = useState<string[]>([]);
  const [availableCategories, setAvailableCategories] = useState<string[]>([]);

  useEffect(() => {
    loadQuestions();
  }, [contextOpportunityId]);

  useEffect(() => {
    if (opportunityId) {
      loadExistingQuestions();
    }
  }, [opportunityId]);

  const loadQuestions = async () => {
    try {
      setLoading(true);
      const { supabase } = await import('../lib/supabase');
      
      // Load categories from database
      try {
        const categories = await questionBankService.getPredefinedCategories();
        setAvailableCategories(categories);
      } catch (error) {
        console.warn('Failed to load categories:', error);
        // Fallback to empty array
        setAvailableCategories([]);
      }
      const { data: { user } } = await supabase.auth.getUser();
      
      const approved = await questionBankService.getApprovedQuestions();

      setApprovedQuestions(approved);
      
      // Get facilitator questions if user is logged in
      if (user) {
        try {
          const facilitatorQs = await questionBankService.getFacilitatorQuestions(user.id, contextOpportunityId || null);
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
      // Set initial required status map
      if (onRequiredChange) {
        questions.forEach(q => {
          onRequiredChange(q.questionId, q.isRequired);
        });
      }
    } catch (error: any) {
      console.error('Failed to load existing questions:', error);
    }
  };

  const handleAddCustomQuestion = async (questionData: { questionText: string; category: string | null; questionType: string; options?: string[]; scope?: 'global' | 'facilitator' | 'opportunity'; scopeOpportunityId?: string | null }) => {
    try {
      // Use the selected category or custom category
      const category = selectedCategory !== 'all' && selectedCategory !== 'other' 
        ? selectedCategory 
        : (selectedCategory === 'other' ? questionData.category : null);
      
      // Always create with status 'pending' so admin reviews it
      const question = await questionBankService.createQuestion({
        questionText: questionData.questionText,
        category: category || undefined,
        questionType: questionData.questionType as any,
        options: questionData.options,
        status: 'pending',
        scope: 'facilitator',
        scopeOpportunityId: questionData.scopeOpportunityId
      });
      
      // Add to facilitator questions list
      setFacilitatorQuestions(prev => [question, ...prev]);
      
      // Auto-select the new question at the end of the list
      onSelectionChange([...selectedQuestionIds, question.id]);
      
      messageService.success('Question Added', 'Your question has been added to this form and sent to admin for approval to be added to the shared question bank.');
    } catch (error: any) {
      throw error;
    }
  };

  const handleToggleQuestion = (questionId: string) => {
    if (selectedQuestionIds.includes(questionId)) {
      onSelectionChange(selectedQuestionIds.filter(id => id !== questionId));
    } else {
      onSelectionChange([...selectedQuestionIds, questionId]);
      // Newly added questions default to required
      if (onRequiredChange && !questionRequiredMap.has(questionId)) {
        onRequiredChange(questionId, true);
      }
    }
  };

  // Filter questions by category and search term
  // Include both approved questions AND facilitator's own pending questions
  const getQuestionsByCategory = (category: string) => {
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
      
      // Filter by category
      if (category === 'all') {
        return matchesSearch;
      } else if (category === 'other') {
        // Show questions with no category or category not in the predefined list
        const hasCategory = q.category && availableCategories.includes(q.category);
        return matchesSearch && !hasCategory;
      } else {
        // Show questions matching the selected category
        return matchesSearch && q.category === category;
      }
    });
  };

  const filteredQuestions = getQuestionsByCategory(selectedCategory);

  return (
    <div className="space-y-4">
      <div>
        <h4 className="text-md font-semibold text-slate-700">Application Questions</h4>
        <p className="text-xs text-slate-500 mt-1">
          Select questions to include in your application form. You can use approved questions from the shared bank 
          or your own custom questions (pending approval for shared bank, but usable immediately in your opportunities).
        </p>
      </div>

      {/* Category Filter and Add Button */}
      <div className="flex gap-2 items-end">
        <div className="flex-1">
          <label className="block text-sm font-medium text-slate-700 mb-2">Category</label>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-brand-primary sm:text-sm"
          >
            <option value="all">All Categories</option>
            {availableCategories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
            <option value="other">Other (Uncategorized)</option>
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
            {searchTerm 
              ? `No questions match your search${selectedCategory !== 'all' ? ` in "${selectedCategory === 'other' ? 'Other' : selectedCategory}" category` : ''}.` 
              : `No questions available${selectedCategory !== 'all' ? ` in "${selectedCategory === 'other' ? 'Other' : selectedCategory}" category` : ''}.`}
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
                    {/* Show options for multiple choice and checkbox questions */}
                    {(question.questionType === 'select' || question.questionType === 'multiselect') && 
                     question.options && 
                     question.options.length > 0 && (
                      <div className="mt-2 p-2 bg-slate-50 border border-slate-200 rounded-md">
                        <p className="text-xs font-medium text-slate-700 mb-1.5">
                          {question.questionType === 'select' ? 'Options (Select One):' : 'Options (Select Multiple):'}
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {question.options.map((option, idx) => (
                            <span
                              key={idx}
                              className="inline-flex items-center px-2 py-1 text-xs font-medium bg-white border border-slate-300 rounded-md text-slate-700"
                            >
                              {option}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </label>
              );
            })}
          </div>
        )}
      </div>

      {/* Selected Questions with Ordering */}
      {selectedQuestionIds.length > 0 && (
        <div className="bg-slate-50 border border-slate-200 rounded-md p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium text-slate-700">
              Selected Questions ({selectedQuestionIds.length})
            </p>
            <p className="text-xs text-slate-500">Drag or use arrows to reorder</p>
          </div>
          <div className="space-y-2">
            {selectedQuestionIds.map((questionId, index) => {
              const question = [...approvedQuestions, ...facilitatorQuestions].find(q => q.id === questionId);
              if (!question) return null;

              const moveUp = () => {
                if (index > 0) {
                  const newOrder = [...selectedQuestionIds];
                  [newOrder[index - 1], newOrder[index]] = [newOrder[index], newOrder[index - 1]];
                  onSelectionChange(newOrder);
                }
              };

              const moveDown = () => {
                if (index < selectedQuestionIds.length - 1) {
                  const newOrder = [...selectedQuestionIds];
                  [newOrder[index], newOrder[index + 1]] = [newOrder[index + 1], newOrder[index]];
                  onSelectionChange(newOrder);
                }
              };

              const removeQuestion = () => {
                onSelectionChange(selectedQuestionIds.filter(id => id !== questionId));
              };

              return (
                <div
                  key={questionId}
                  className="bg-white border border-slate-300 rounded-md p-3 flex items-center gap-3 hover:shadow-sm transition-shadow"
                >
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <GripVertical className="h-5 w-5 text-slate-400" />
                    <span className="text-sm font-medium text-slate-600 w-6 text-center">
                      {index + 1}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-900 font-medium">{question.questionText}</p>
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
                    </div>
                    {/* Show options for multiple choice and checkbox questions */}
                    {(question.questionType === 'select' || question.questionType === 'multiselect') && 
                     question.options && 
                     question.options.length > 0 && (
                      <div className="mt-2 p-2 bg-slate-50 border border-slate-200 rounded-md">
                        <p className="text-xs font-medium text-slate-700 mb-1.5">
                          {question.questionType === 'select' ? 'Options (Select One):' : 'Options (Select Multiple):'}
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {question.options.map((option, idx) => (
                            <span
                              key={idx}
                              className="inline-flex items-center px-2 py-1 text-xs font-medium bg-white border border-slate-300 rounded-md text-slate-700"
                            >
                              {option}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {/* Selection Type (for questions with options) */}
                    {onSelectionTypeChange && question.options && question.options.length > 0 && 
                     (question.questionType === 'select' || question.questionType === 'multiselect') && (
                      <div className="flex items-center gap-1.5">
                        <label className="text-xs text-slate-600 whitespace-nowrap">Selection:</label>
                        <select
                          value={questionSelectionTypeMap.get(questionId) || (question.questionType === 'select' ? 'single' : 'multiple')}
                          onChange={(e) => {
                            const value = e.target.value === 'single' ? 'single' : e.target.value === 'multiple' ? 'multiple' : null;
                            onSelectionTypeChange(questionId, value);
                          }}
                          className="text-xs px-2 py-1 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-brand-primary focus:border-brand-primary"
                        >
                          <option value="single">Single</option>
                          <option value="multiple">Multiple</option>
                        </select>
                      </div>
                    )}
                    {/* Required/Optional Toggle */}
                    {onRequiredChange && (
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={questionRequiredMap.get(questionId) !== false} // Default to true
                          onChange={(e) => onRequiredChange(questionId, e.target.checked)}
                          className="h-4 w-4 text-brand-primary focus:ring-brand-primary border-slate-300 rounded"
                        />
                        <span className="text-xs text-slate-600 whitespace-nowrap">
                          {questionRequiredMap.get(questionId) !== false ? 'Required' : 'Optional'}
                        </span>
                      </label>
                    )}
                    <div className="flex items-center gap-1 border-l border-slate-300 pl-2">
                      <button
                        type="button"
                        onClick={moveUp}
                        disabled={index === 0}
                        className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                        title="Move up"
                      >
                        <ChevronUp className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={moveDown}
                        disabled={index === selectedQuestionIds.length - 1}
                        className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                        title="Move down"
                      >
                        <ChevronDown className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={removeQuestion}
                        className="p-1.5 text-red-600 hover:text-red-700 hover:bg-red-50 rounded transition-colors"
                        title="Remove question"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <CustomQuestionModal
        isOpen={isCustomQuestionModalOpen}
        onClose={() => setIsCustomQuestionModalOpen(false)}
        onSave={handleAddCustomQuestion}
        selectedQuestionType={selectedCategory}
        contextOpportunityId={contextOpportunityId}
      />
    </div>
  );
};

export default QuestionSelector;

