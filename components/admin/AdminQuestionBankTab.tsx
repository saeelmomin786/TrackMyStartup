import React, { useEffect, useState } from 'react';
import Card from '../ui/Card';
import Button from '../ui/Button';
import Modal from '../ui/Modal';
import Input from '../ui/Input';
import { questionBankService, ApplicationQuestion } from '../../lib/questionBankService';
import { messageService } from '../../lib/messageService';
import { Check, X, AlertCircle, Clock, FileText, Plus, ChevronUp, ChevronDown, GripVertical, Trash2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';

const AdminQuestionBankTab: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState<'pending' | 'approved' | 'rejected'>('pending');
  const [pendingQuestions, setPendingQuestions] = useState<ApplicationQuestion[]>([]);
  const [approvedQuestions, setApprovedQuestions] = useState<ApplicationQuestion[]>([]);
  const [rejectedQuestions, setRejectedQuestions] = useState<ApplicationQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState<{ [key: string]: string }>({});
  const [showRejectionModal, setShowRejectionModal] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newQuestion, setNewQuestion] = useState({
    questionText: '',
    category: '',
    questionType: 'text' as 'text' | 'textarea' | 'number' | 'date' | 'select' | 'multiselect',
    options: ''
  });
  const [isCreating, setIsCreating] = useState(false);
  const [availableCategories, setAvailableCategories] = useState<string[]>([]);
  const [predefinedCategories, setPredefinedCategories] = useState<string[]>([]);
  const [showCustomCategory, setShowCustomCategory] = useState(false);
  const [customCategory, setCustomCategory] = useState('');
  const [showEditModal, setShowEditModal] = useState<string | null>(null);
  const [editingQuestion, setEditingQuestion] = useState<Partial<ApplicationQuestion> | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Load available categories when component mounts
  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      // Load predefined categories from database
      const predefined = await questionBankService.getPredefinedCategories();
      setPredefinedCategories(predefined);
      
      // Load existing categories from questions (for custom categories)
      const existing = await questionBankService.getCategories();
      setAvailableCategories(existing);
    } catch (error) {
      console.error('Failed to load categories:', error);
      // Fallback to hardcoded categories if database table doesn't exist
      setPredefinedCategories([
        'Company Info',
        'Financial',
        'Team',
        'Product',
        'Market',
        'Technology',
        'Social Impact',
        'Environmental',
        'Legal',
        'Operations',
        'Marketing',
        'Sales',
        'Customer',
        'Competition',
        'Growth',
        'Funding',
        'Partnerships',
        'Other'
      ]);
    }
  };

  // Reset form when modal opens
  const handleOpenCreateModal = () => {
    setNewQuestion({
      questionText: '',
      category: '',
      questionType: 'text',
      options: ''
    });
    setShowCustomCategory(false);
    setCustomCategory('');
    setShowCreateModal(true);
    loadCategories(); // Refresh categories when opening modal
  };

  useEffect(() => {
    loadQuestions();
  }, [activeSubTab]);

  const loadQuestions = async () => {
    try {
      setLoading(true);
      const [pending, approved, rejected] = await Promise.all([
        questionBankService.getPendingQuestions(),
        questionBankService.getApprovedQuestions(),
        questionBankService.getRejectedQuestions()
      ]);

      setPendingQuestions(pending);
      setApprovedQuestions(approved);
      setRejectedQuestions(rejected);
    } catch (error: any) {
      console.error('Failed to load questions:', error);
      messageService.error('Failed to Load Questions', error.message || 'Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (questionId: string) => {
    try {
      setProcessingId(questionId);
      await questionBankService.updateQuestionStatus(questionId, { status: 'approved' });
      messageService.success('Question Approved', 'The question has been added to the question bank.');
      await loadQuestions();
    } catch (error: any) {
      messageService.error('Approval Failed', error.message || 'Please try again.');
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (questionId: string) => {
    const reason = rejectionReason[questionId]?.trim();
    if (!reason) {
      messageService.warning('Reason Required', 'Please provide a reason for rejection.');
      return;
    }

    try {
      setProcessingId(questionId);
      await questionBankService.updateQuestionStatus(questionId, {
        status: 'rejected',
        rejectionReason: reason
      });
      messageService.success('Question Rejected', 'The question has been rejected.');
      setRejectionReason(prev => ({ ...prev, [questionId]: '' }));
      setShowRejectionModal(null);
      await loadQuestions();
    } catch (error: any) {
      messageService.error('Rejection Failed', error.message || 'Please try again.');
    } finally {
      setProcessingId(null);
    }
  };

  const handleCreateQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newQuestion.questionText.trim()) {
      messageService.warning('Question Required', 'Please enter a question.');
      return;
    }

    // Validate options for select/multiselect types
    if ((newQuestion.questionType === 'select' || newQuestion.questionType === 'multiselect')) {
      const options = newQuestion.options
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0);
      
      if (options.length < 2) {
        messageService.warning('Options Required', 'Please provide at least 2 options for multiple choice/checkbox questions.');
        return;
      }
    }

    setIsCreating(true);
    try {
      // Parse options from textarea (one per line)
      let options: string[] | undefined = undefined;
      if (newQuestion.questionType === 'select' || newQuestion.questionType === 'multiselect') {
        options = newQuestion.options
          .split('\n')
          .map(line => line.trim())
          .filter(line => line.length > 0);
      }

      await questionBankService.createQuestion({
        questionText: newQuestion.questionText.trim(),
        category: newQuestion.category.trim() || undefined,
        questionType: newQuestion.questionType,
        options,
        status: 'approved', // Admin-created questions are approved immediately
        scope: 'global' // Admin-created questions are global (accessible to all)
      });

      messageService.success('Question Created', 'The question has been added to the question bank.');
      setNewQuestion({
        questionText: '',
        category: '',
        questionType: 'text',
        options: ''
      });
      setShowCreateModal(false);
      await loadQuestions();
    } catch (error: any) {
      messageService.error('Failed to Create Question', error.message || 'Please try again.');
    } finally {
      setIsCreating(false);
    }
  };

  const handleEditQuestion = async (questionId: string) => {
    try {
      const question = approvedQuestions.find(q => q.id === questionId);
      if (!question) {
        messageService.warning('Question Not Found', 'The question could not be found.');
        return;
      }

      setEditingQuestion({
        ...question,
        options: Array.isArray(question.options) ? question.options.join('\n') : question.options
      });
      setShowEditModal(questionId);
    } catch (error) {
      messageService.error('Failed to Load Question', 'Could not load the question for editing.');
    }
  };

  const handleDeleteQuestion = async (questionId: string) => {
    try {
      setIsDeleting(true);
      await questionBankService.deleteQuestion(questionId);
      messageService.success('Question Deleted', 'The question has been removed from the question bank.');
      setShowDeleteConfirm(null);
      await loadQuestions();
    } catch (error: any) {
      messageService.error('Delete Failed', error.message || 'Failed to delete the question. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleUpdateQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingQuestion?.id) {
      messageService.warning('Question Required', 'Question ID is missing.');
      return;
    }

    if (!editingQuestion.questionText?.trim()) {
      messageService.warning('Question Required', 'Please enter a question.');
      return;
    }

    // Validate options for select/multiselect types
    if ((editingQuestion.questionType === 'select' || editingQuestion.questionType === 'multiselect')) {
      const optionsText = typeof editingQuestion.options === 'string' 
        ? editingQuestion.options 
        : Array.isArray(editingQuestion.options) 
        ? editingQuestion.options.join('\n')
        : '';
      
      const options = optionsText
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0);
      
      if (options.length < 2) {
        messageService.warning('Options Required', 'Please provide at least 2 options for multiple choice/checkbox questions.');
        return;
      }
    }

    setIsEditing(true);
    try {
      // Parse options from textarea (one per line)
      let options: string[] | undefined = undefined;
      if (editingQuestion.questionType === 'select' || editingQuestion.questionType === 'multiselect') {
        const optionsText = typeof editingQuestion.options === 'string' 
          ? editingQuestion.options 
          : Array.isArray(editingQuestion.options) 
          ? editingQuestion.options.join('\n')
          : '';
        
        options = optionsText
          .split('\n')
          .map(line => line.trim())
          .filter(line => line.length > 0);
      }

      await questionBankService.updateQuestion(editingQuestion.id, {
        questionText: editingQuestion.questionText.trim(),
        category: editingQuestion.category?.trim() || undefined,
        questionType: editingQuestion.questionType,
        options
      });

      messageService.success('Question Updated', 'The question has been updated successfully.');
      setShowEditModal(null);
      setEditingQuestion(null);
      await loadQuestions();
    } catch (error: any) {
      messageService.error('Failed to Update Question', error.message || 'Please try again.');
    } finally {
      setIsEditing(false);
    }
  };

  const getCreatorName = async (userId: string | null): Promise<string> => {
    if (!userId) return 'System';
    try {
      const { data } = await supabase
        .from('user_profiles')
        .select('name')
        .eq('auth_user_id', userId)
        .maybeSingle();
      return data?.name || 'Unknown';
    } catch {
      return 'Unknown';
    }
  };

  const handleReorder = async (questionId: string, direction: 'up' | 'down') => {
    const questions = activeSubTab === 'approved' ? approvedQuestions : 
                     activeSubTab === 'pending' ? pendingQuestions : 
                     rejectedQuestions;
    
    if (!questions || questions.length === 0) {
      messageService.warning('No Questions', 'No questions available to reorder.');
      return;
    }
    
    const currentIndex = questions.findIndex(q => q.id === questionId);
    if (currentIndex === -1) {
      messageService.warning('Question Not Found', 'The question could not be found.');
      return;
    }

    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (newIndex < 0 || newIndex >= questions.length) {
      return; // Already at the edge
    }

    // Swap questions
    const reordered = [...questions];
    [reordered[currentIndex], reordered[newIndex]] = [reordered[newIndex], reordered[currentIndex]];

    // Update display orders
    const orderUpdates = reordered.map((q, index) => ({
      questionId: q.id,
      displayOrder: index
    }));

    try {
      if (!orderUpdates || orderUpdates.length === 0) {
        return;
      }

      await questionBankService.updateQuestionBankOrder(orderUpdates);
      
      // Update local state
      if (activeSubTab === 'approved') {
        setApprovedQuestions(reordered);
      } else if (activeSubTab === 'pending') {
        setPendingQuestions(reordered);
      } else {
        setRejectedQuestions(reordered);
      }
      
      messageService.success('Order Updated', 'Question order has been updated successfully.');
    } catch (error: any) {
      console.error('Reorder error:', error);
      messageService.error('Failed to Update Order', error.message || 'Please try again.');
    }
  };

  // Separate component for question card to properly use hooks
  const QuestionCard: React.FC<{
    question: ApplicationQuestion;
    showActions: boolean;
    onApprove: (id: string) => void;
    onRejectClick: (id: string) => void;
    onEdit?: (id: string) => void;
    onDelete?: (id: string) => void;
    processingId: string | null;
    index: number;
    totalQuestions: number;
    canReorder: boolean;
    onReorder: (id: string, direction: 'up' | 'down') => void;
  }> = ({ question, showActions, onApprove, onRejectClick, onEdit, onDelete, processingId, index, totalQuestions, canReorder, onReorder }) => {
    const [creatorName, setCreatorName] = useState<string>('Loading...');

    useEffect(() => {
      getCreatorName(question.createdBy).then(setCreatorName);
    }, [question.createdBy]);

    return (
      <Card className="p-4">
        <div className="space-y-3">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3 flex-1">
              {canReorder && (
                <div className="flex flex-col items-center gap-1 flex-shrink-0 pt-1">
                  <GripVertical className="h-5 w-5 text-slate-400" />
                  <span className="text-xs font-medium text-slate-600">{index + 1}</span>
                </div>
              )}
              <div className="flex-1">
                <p className="text-sm font-medium text-slate-900 mb-1">{question.questionText}</p>
                <div className="flex items-center gap-3 text-xs text-slate-500 mt-2 flex-wrap">
                  {question.category && (
                    <span className="px-2 py-0.5 bg-slate-100 rounded">Category: {question.category}</span>
                  )}
                  <span>Type: {question.questionType === 'text' ? 'Short Text' :
                               question.questionType === 'textarea' ? 'Long Text' :
                               question.questionType === 'select' ? 'Multiple Choice' :
                               question.questionType === 'multiselect' ? 'Checkbox' :
                               question.questionType === 'number' ? 'Number' :
                               question.questionType === 'date' ? 'Date' :
                               question.questionType}</span>
                  <span>Created by: {creatorName}</span>
                  <span>Used: {question.usageCount} times</span>
                </div>
                {question.options && (
                  <div className="mt-2 text-xs text-slate-600">
                    <strong>Options:</strong> {Array.isArray(question.options) ? question.options.join(', ') : 'N/A'}
                  </div>
                )}
                {question.rejectionReason && (
                  <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-800">
                    <strong>Rejection Reason:</strong> {question.rejectionReason}
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              {canReorder && (
                <div className="flex flex-col gap-1 mr-2">
                  <button
                    type="button"
                    onClick={() => onReorder(question.id, 'up')}
                    disabled={index === 0}
                    className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    title="Move up"
                  >
                    <ChevronUp className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onReorder(question.id, 'down')}
                    disabled={index === totalQuestions - 1}
                    className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    title="Move down"
                  >
                    <ChevronDown className="h-4 w-4" />
                  </button>
                </div>
              )}
              {showActions && (
                <>
                  {question.status === 'pending' && (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onRejectClick(question.id)}
                        disabled={processingId === question.id}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => onApprove(question.id)}
                        disabled={processingId === question.id}
                      >
                        {processingId === question.id ? 'Processing...' : <Check className="h-4 w-4" />}
                      </Button>
                    </>
                  )}
                  {question.status === 'rejected' && (
                    <Button
                      size="sm"
                      onClick={() => onApprove(question.id)}
                      disabled={processingId === question.id}
                    >
                      {processingId === question.id ? 'Processing...' : 'Re-approve'}
                    </Button>
                  )}
                </>
              )}
              {question.status === 'approved' && onEdit && (
                <>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onEdit(question.id)}
                    disabled={processingId === question.id}
                    title="Edit question"
                  >
                    ✎ Edit
                  </Button>
                  {onDelete && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setShowDeleteConfirm(question.id)}
                      disabled={processingId === question.id}
                      title="Delete question"
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </Card>
    );
  };

  const currentQuestions = activeSubTab === 'pending' 
    ? pendingQuestions 
    : activeSubTab === 'approved' 
    ? approvedQuestions 
    : rejectedQuestions;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Question Bank Management</h2>
          <p className="text-sm text-slate-600 mt-1">
            Review and manage application questions submitted by facilitators
          </p>
        </div>
        <Button onClick={handleOpenCreateModal} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Create Question
        </Button>
      </div>

      {/* Sub-tabs */}
      <div className="border-b border-slate-200">
        <nav className="-mb-px flex space-x-6">
          <button
            onClick={() => setActiveSubTab('pending')}
            className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
              activeSubTab === 'pending'
                ? 'border-yellow-500 text-yellow-600'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
            }`}
          >
            <Clock className="h-4 w-4" />
            Pending ({pendingQuestions.length})
          </button>
          <button
            onClick={() => setActiveSubTab('approved')}
            className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
              activeSubTab === 'approved'
                ? 'border-green-500 text-green-600'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
            }`}
          >
            <Check className="h-4 w-4" />
            Approved ({approvedQuestions.length})
          </button>
          <button
            onClick={() => setActiveSubTab('rejected')}
            className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
              activeSubTab === 'rejected'
                ? 'border-red-500 text-red-600'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
            }`}
          >
            <X className="h-4 w-4" />
            Rejected ({rejectedQuestions.length})
          </button>
        </nav>
      </div>

      {/* Questions List */}
      {loading ? (
        <Card className="p-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-primary mx-auto mb-4"></div>
          <p className="text-slate-600">Loading questions...</p>
        </Card>
      ) : currentQuestions.length === 0 ? (
        <Card className="p-8 text-center">
          <FileText className="h-12 w-12 text-slate-400 mx-auto mb-4" />
          <p className="text-slate-600">
            {activeSubTab === 'pending' && 'No pending questions to review.'}
            {activeSubTab === 'approved' && 'No approved questions yet.'}
            {activeSubTab === 'rejected' && 'No rejected questions.'}
          </p>
        </Card>
      ) : (
        <div className="space-y-4">
          {currentQuestions.map((question, index) => (
            <QuestionCard
              key={question.id}
              question={question}
              showActions={activeSubTab !== 'approved'}
              onApprove={handleApprove}
              onRejectClick={setShowRejectionModal}
              onEdit={activeSubTab === 'approved' ? handleEditQuestion : undefined}
              onDelete={activeSubTab === 'approved' ? handleDeleteQuestion : undefined}
              processingId={processingId}
              index={index}
              totalQuestions={currentQuestions.length}
              canReorder={true}
              onReorder={handleReorder}
            />
          ))}
        </div>
      )}

      {/* Create Question Modal */}
      <Modal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} title="Create New Question" size="large">
        <form onSubmit={handleCreateQuestion} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-slate-900 mb-2">Question Text *</label>
            <textarea
              value={newQuestion.questionText}
              onChange={(e) => setNewQuestion(prev => ({ ...prev, questionText: e.target.value }))}
              className="block w-full px-3 py-2 bg-white border-2 border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-brand-primary sm:text-sm text-slate-900"
              rows={3}
              placeholder="Enter your question here..."
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-900 mb-2">Category (Optional)</label>
            {!showCustomCategory ? (
              <>
                <select
                  value={newQuestion.category}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value === 'custom') {
                      setShowCustomCategory(true);
                      setNewQuestion(prev => ({ ...prev, category: '' }));
                    } else {
                      setNewQuestion(prev => ({ ...prev, category: value }));
                    }
                  }}
                  className="block w-full px-3 py-2 bg-white border-2 border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-brand-primary sm:text-sm text-slate-900"
                >
                  <option value="">Select a category (optional)</option>
                  {predefinedCategories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                  {availableCategories
                    .filter(cat => !predefinedCategories.includes(cat))
                    .map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  <option value="custom">+ Add Custom Category</option>
                </select>
                <p className="text-xs text-slate-600 mt-1">Categorize the question for better organization</p>
              </>
            ) : (
              <div className="space-y-2">
                <Input
                  value={customCategory}
                  onChange={(e) => {
                    setCustomCategory(e.target.value);
                    setNewQuestion(prev => ({ ...prev, category: e.target.value }));
                  }}
                  placeholder="Enter custom category name"
                />
                <button
                  type="button"
                  onClick={() => {
                    setShowCustomCategory(false);
                    setCustomCategory('');
                    setNewQuestion(prev => ({ ...prev, category: '' }));
                  }}
                  className="text-xs text-slate-600 hover:text-slate-900 underline"
                >
                  Use predefined category instead
                </button>
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-900 mb-2">Answer Format *</label>
            <select
              value={newQuestion.questionType}
              onChange={(e) => setNewQuestion(prev => ({ ...prev, questionType: e.target.value as any, options: '' }))}
              className="block w-full px-3 py-2 bg-white border-2 border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-brand-primary sm:text-sm text-slate-900"
              required
            >
              <option value="text">Short Text</option>
              <option value="textarea">Long Text</option>
              <option value="select">Multiple Choice (Single Select)</option>
              <option value="multiselect">Checkbox (Multi Select)</option>
              <option value="number">Number</option>
              <option value="date">Date</option>
            </select>
            <p className="text-xs text-slate-500 mt-1">Select the format for how users will answer this question</p>
          </div>

          {(newQuestion.questionType === 'select' || newQuestion.questionType === 'multiselect') && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Answer Options * (one per line)
              </label>
              <textarea
                value={newQuestion.options}
                onChange={(e) => setNewQuestion(prev => ({ ...prev, options: e.target.value }))}
                className="block w-full px-3 py-2 bg-white border-2 border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-brand-primary sm:text-sm text-slate-900"
                rows={5}
                placeholder="Option 1&#10;Option 2&#10;Option 3&#10;..."
                required
              />
              <p className="text-xs text-slate-600 mt-1">
                Enter each option on a new line. At least 2 options are required.
              </p>
            </div>
          )}

          <div className="bg-green-50 border border-green-200 rounded-md p-3 flex items-start gap-2">
            <Check className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-green-800">
              <p className="font-medium mb-1">Admin-Created Question</p>
              <p>
                This question will be immediately approved and available in the question bank for all facilitators to use.
              </p>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => setShowCreateModal(false)} disabled={isCreating}>
              Cancel
            </Button>
            <Button type="submit" disabled={isCreating || !newQuestion.questionText.trim()}>
              {isCreating ? 'Creating...' : 'Create Question'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Edit Question Modal */}
      {showEditModal && editingQuestion && (
        <Modal isOpen={true} onClose={() => {
          setShowEditModal(null);
          setEditingQuestion(null);
        }} title="Edit Question" size="large">
          <form onSubmit={handleUpdateQuestion} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-900 mb-2">Question Text *</label>
              <textarea
                value={editingQuestion.questionText || ''}
                onChange={(e) => setEditingQuestion(prev => prev ? { ...prev, questionText: e.target.value } : null)}
                className="block w-full px-3 py-2 bg-white border-2 border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-brand-primary sm:text-sm text-slate-900"
                rows={3}
                placeholder="Enter your question here..."
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-900 mb-2">Category (Optional)</label>
              <select
                value={editingQuestion.category || ''}
                onChange={(e) => setEditingQuestion(prev => prev ? { ...prev, category: e.target.value } : null)}
                className="block w-full px-3 py-2 bg-white border-2 border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-brand-primary sm:text-sm text-slate-900"
              >
                <option value="">Select a category (optional)</option>
                {predefinedCategories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
                {availableCategories
                  .filter(cat => !predefinedCategories.includes(cat))
                  .map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
              </select>
              <p className="text-xs text-slate-600 mt-1">Categorize the question for better organization</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-900 mb-2">Answer Format *</label>
              <select
                value={editingQuestion.questionType || 'text'}
                onChange={(e) => setEditingQuestion(prev => prev ? { ...prev, questionType: e.target.value as any, options: '' } : null)}
                className="block w-full px-3 py-2 bg-white border-2 border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-brand-primary sm:text-sm text-slate-900"
                required
              >
                <option value="text">Short Text</option>
                <option value="textarea">Long Text</option>
                <option value="select">Multiple Choice (Single Select)</option>
                <option value="multiselect">Checkbox (Multi Select)</option>
                <option value="number">Number</option>
                <option value="date">Date</option>
              </select>
              <p className="text-xs text-slate-500 mt-1">Select the format for how users will answer this question</p>
            </div>

            {(editingQuestion.questionType === 'select' || editingQuestion.questionType === 'multiselect') && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Answer Options * (one per line)
                </label>
                <textarea
                  value={typeof editingQuestion.options === 'string' ? editingQuestion.options : Array.isArray(editingQuestion.options) ? editingQuestion.options.join('\n') : ''}
                  onChange={(e) => setEditingQuestion(prev => prev ? { ...prev, options: e.target.value } : null)}
                  className="block w-full px-3 py-2 bg-white border-2 border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-brand-primary sm:text-sm text-slate-900"
                  rows={5}
                  placeholder="Option 1&#10;Option 2&#10;Option 3&#10;..."
                  required
                />
                <p className="text-xs text-slate-600 mt-1">
                  Enter each option on a new line. At least 2 options are required.
                </p>
              </div>
            )}

            <div className="bg-blue-50 border border-blue-200 rounded-md p-3 flex items-start gap-2">
              <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-800">
                <p className="font-medium mb-1">Edit Approved Question</p>
                <p>
                  Changes to this question will be saved and immediately reflected for all users.
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button 
                type="button" 
                variant="secondary" 
                onClick={() => {
                  setShowEditModal(null);
                  setEditingQuestion(null);
                }} 
                disabled={isEditing}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isEditing || !editingQuestion.questionText?.trim()}>
                {isEditing ? 'Updating...' : 'Update Question'}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="p-6 max-w-md w-full mx-4">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-red-600" />
                <h3 className="text-lg font-semibold text-slate-900">Delete Question</h3>
              </div>
              <p className="text-sm text-slate-600">
                Are you sure you want to delete this question? This action cannot be undone. Any forms or programs using this question will no longer have access to it.
              </p>
              <div className="flex justify-end gap-3 pt-4">
                <Button
                  variant="secondary"
                  onClick={() => setShowDeleteConfirm(null)}
                  disabled={isDeleting}
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => handleDeleteQuestion(showDeleteConfirm)}
                  disabled={isDeleting}
                  className="bg-red-600 hover:bg-red-700 text-white"
                >
                  {isDeleting ? 'Deleting...' : 'Delete Question'}
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Rejection Modal */}
      {showRejectionModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="p-6 max-w-md w-full mx-4">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-red-600" />
                <h3 className="text-lg font-semibold text-slate-900">Reject Question</h3>
              </div>
              <p className="text-sm text-slate-600">
                Please provide a reason for rejecting this question. This will help the facilitator understand why it was rejected.
              </p>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Rejection Reason *</label>
                <textarea
                  value={rejectionReason[showRejectionModal] || ''}
                  onChange={(e) => setRejectionReason(prev => ({ ...prev, [showRejectionModal]: e.target.value }))}
                  className="block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-brand-primary sm:text-sm"
                  rows={4}
                  placeholder="Enter reason for rejection..."
                  required
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <Button
                  variant="secondary"
                  onClick={() => {
                    setShowRejectionModal(null);
                    setRejectionReason(prev => ({ ...prev, [showRejectionModal]: '' }));
                  }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => handleReject(showRejectionModal)}
                  disabled={!rejectionReason[showRejectionModal]?.trim() || processingId === showRejectionModal}
                >
                  {processingId === showRejectionModal ? 'Rejecting...' : 'Reject Question'}
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

export default AdminQuestionBankTab;

