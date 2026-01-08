import React, { useEffect, useState } from 'react';
import Modal from './ui/Modal';
import Button from './ui/Button';
import Input from './ui/Input';
import { questionBankService, StartupAnswer } from '../lib/questionBankService';
import { messageService } from '../lib/messageService';
import { Check, Search, FileText, Edit2, Trash2, Save } from 'lucide-react';

interface DraftAnswersViewProps {
  isOpen: boolean;
  onClose: () => void;
  startupId: number;
}

const DraftAnswersView: React.FC<DraftAnswersViewProps> = ({
  isOpen,
  onClose,
  startupId
}) => {
  const [draftAnswers, setDraftAnswers] = useState<StartupAnswer[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null);
  const [editedAnswers, setEditedAnswers] = useState<Map<string, string>>(new Map());

  useEffect(() => {
    if (isOpen && startupId) {
      loadDraftAnswers();
    }
  }, [isOpen, startupId]);

  const loadDraftAnswers = async () => {
    try {
      setLoading(true);
      const answers = await questionBankService.getStartupAnswers(startupId);
      
      // Only show questions that have answers (drafts)
      setDraftAnswers(answers);
      
      // Initialize edited answers map with current answers
      const answersMap = new Map<string, string>();
      answers.forEach(answer => {
        answersMap.set(answer.questionId, answer.answerText);
      });
      setEditedAnswers(answersMap);
    } catch (error: any) {
      console.error('Failed to load draft answers:', error);
      messageService.error('Failed to Load Drafts', error.message || 'Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleAnswerChange = (questionId: string, value: string) => {
    setEditedAnswers(prev => {
      const newMap = new Map(prev);
      newMap.set(questionId, value);
      return newMap;
    });
  };

  const handleStartEdit = (questionId: string) => {
    setEditingQuestionId(questionId);
  };

  const handleCancelEdit = (questionId: string) => {
    // Reset to original answer
    const originalAnswer = draftAnswers.find(a => a.questionId === questionId);
    if (originalAnswer) {
      setEditedAnswers(prev => {
        const newMap = new Map(prev);
        newMap.set(questionId, originalAnswer.answerText);
        return newMap;
      });
    }
    setEditingQuestionId(null);
  };

  const handleSaveAnswer = async (questionId: string) => {
    const answerText = editedAnswers.get(questionId)?.trim();
    if (!answerText) {
      messageService.warning('Answer Required', 'Please enter an answer before saving.');
      return;
    }

    try {
      setSaving(questionId);
      // IMPORTANT: This only updates the draft answer bank (startup_application_answers)
      // It does NOT affect already submitted applications (opportunity_application_responses)
      // Submitted applications remain unchanged and are stored separately
      const savedAnswer = await questionBankService.saveStartupAnswer(startupId, questionId, answerText);
      
      // Update draft answers
      setDraftAnswers(prev => 
        prev.map(a => a.questionId === questionId ? savedAnswer : a)
      );

      setEditingQuestionId(null);
      messageService.success('Answer Updated', 'Your draft answer has been updated. This will be used for future applications only.');
    } catch (error: any) {
      messageService.error('Save Failed', error.message || 'Please try again.');
    } finally {
      setSaving(null);
    }
  };

  const handleDeleteAnswer = async (questionId: string) => {
    if (!confirm('Are you sure you want to delete this draft answer? This action cannot be undone.')) {
      return;
    }

    try {
      await questionBankService.deleteStartupAnswer(startupId, questionId);
      
      // Remove from draft answers
      setDraftAnswers(prev => prev.filter(a => a.questionId !== questionId));
      
      // Remove from edited answers
      setEditedAnswers(prev => {
        const newMap = new Map(prev);
        newMap.delete(questionId);
        return newMap;
      });

      messageService.success('Answer Deleted', 'Your draft answer has been removed.');
    } catch (error: any) {
      messageService.error('Delete Failed', error.message || 'Please try again.');
    }
  };

  const filteredAnswers = draftAnswers.filter(answer => {
    const questionText = answer.question?.questionText || '';
    return questionText.toLowerCase().includes(searchTerm.toLowerCase());
  });

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="My Draft Answers" size="4xl">
      <div className="space-y-6">
        {/* Header Stats */}
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
          <p className="text-sm text-slate-600">Total Draft Answers</p>
          <p className="text-2xl font-bold text-slate-900">{draftAnswers.length}</p>
        </div>

        {/* Info Banner */}
        <div className="bg-blue-50 border border-blue-200 rounded-md p-3 flex items-start gap-2">
          <FileText className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-800">
            <p className="font-medium mb-1">Draft Answers</p>
            <p>
              These are your saved draft answers. Updating them will only affect <strong>future applications</strong> - 
              already submitted applications will remain unchanged.
            </p>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400" />
          <Input
            type="text"
            placeholder="Search your draft answers..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Draft Answers List */}
        <div className="border border-slate-200 rounded-md max-h-[60vh] overflow-y-auto">
          {loading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-primary mx-auto mb-4"></div>
              <p className="text-slate-600">Loading draft answers...</p>
            </div>
          ) : filteredAnswers.length === 0 ? (
            <div className="p-8 text-center">
              <FileText className="h-12 w-12 text-slate-400 mx-auto mb-4" />
              <p className="text-slate-600">
                {searchTerm ? 'No draft answers match your search.' : 'You have no saved draft answers yet.'}
              </p>
              <p className="text-sm text-slate-500 mt-2">
                Use "Reference Application Draft" to answer questions and save them as drafts.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-200">
              {filteredAnswers.map(answer => {
                const question = answer.question;
                if (!question) return null;

                const isEditing = editingQuestionId === answer.questionId;
                const currentAnswer = editedAnswers.get(answer.questionId) || answer.answerText;
                const hasChanges = currentAnswer !== answer.answerText;

                return (
                  <div
                    key={answer.id}
                    className="p-4 bg-green-50/30 hover:bg-green-50/50 transition-colors"
                  >
                    <div className="space-y-3">
                      {/* Question Header */}
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="text-sm font-medium text-slate-900">{question.questionText}</p>
                            <span className="px-2 py-0.5 text-xs font-medium bg-green-100 text-green-800 rounded flex items-center gap-1">
                              <Check className="h-3 w-3" />
                              Saved
                            </span>
                          </div>
                          {question.category && (
                            <p className="text-xs text-slate-500">Category: {question.category}</p>
                          )}
                        </div>
                      </div>

                      {/* Answer Display/Edit */}
                      <div>
                        {isEditing ? (
                          <div className="space-y-2">
                            {question.questionType === 'textarea' ? (
                              <textarea
                                value={currentAnswer}
                                onChange={(e) => handleAnswerChange(answer.questionId, e.target.value)}
                                className="block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-brand-primary sm:text-sm"
                                rows={4}
                                placeholder="Enter your answer here..."
                              />
                            ) : question.questionType === 'select' ? (
                              <select
                                value={currentAnswer}
                                onChange={(e) => handleAnswerChange(answer.questionId, e.target.value)}
                                className="block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-brand-primary sm:text-sm"
                              >
                                <option value="">Select an option</option>
                                {question.options?.map((option, idx) => (
                                  <option key={idx} value={option}>{option}</option>
                                ))}
                              </select>
                            ) : question.questionType === 'multiselect' ? (
                              <div className="space-y-2">
                                {question.options?.map((option, idx) => {
                                  const selectedValues = currentAnswer.split(',').map(v => v.trim()).filter(v => v.length > 0);
                                  const isChecked = selectedValues.includes(option);
                                  return (
                                    <label key={idx} className="flex items-center gap-2 cursor-pointer">
                                      <input
                                        type="checkbox"
                                        checked={isChecked}
                                        onChange={(e) => {
                                          let newValues = [...selectedValues];
                                          if (e.target.checked) {
                                            newValues.push(option);
                                          } else {
                                            newValues = newValues.filter(v => v !== option);
                                          }
                                          handleAnswerChange(answer.questionId, newValues.join(','));
                                        }}
                                        className="rounded border-slate-300 text-brand-primary focus:ring-brand-primary"
                                      />
                                      <span className="text-sm text-slate-700">{option}</span>
                                    </label>
                                  );
                                })}
                              </div>
                            ) : question.questionType === 'number' ? (
                              <Input
                                type="number"
                                value={currentAnswer}
                                onChange={(e) => handleAnswerChange(answer.questionId, e.target.value)}
                                placeholder="Enter a number..."
                              />
                            ) : question.questionType === 'date' ? (
                              <Input
                                type="date"
                                value={currentAnswer}
                                onChange={(e) => handleAnswerChange(answer.questionId, e.target.value)}
                              />
                            ) : (
                              <Input
                                type="text"
                                value={currentAnswer}
                                onChange={(e) => handleAnswerChange(answer.questionId, e.target.value)}
                                placeholder="Enter your answer here..."
                              />
                            )}
                            <div className="flex gap-2">
                              <Button
                                type="button"
                                size="sm"
                                onClick={() => handleSaveAnswer(answer.questionId)}
                                disabled={saving === answer.questionId || !hasChanges}
                              >
                                <Save className="h-4 w-4 mr-2" />
                                {saving === answer.questionId ? 'Saving...' : 'Save'}
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={() => handleCancelEdit(answer.questionId)}
                                disabled={saving === answer.questionId}
                              >
                                Cancel
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            <div className="bg-white border border-slate-200 rounded-md p-3">
                              <p className="text-sm text-slate-700 whitespace-pre-wrap">
                                {question.questionType === 'multiselect' 
                                  ? currentAnswer.split(',').map(v => v.trim()).filter(v => v.length > 0).join('; ')
                                  : currentAnswer || '(No answer)'
                                }
                              </p>
                            </div>
                            <div className="flex gap-2">
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={() => handleStartEdit(answer.questionId)}
                              >
                                <Edit2 className="h-4 w-4 mr-2" />
                                Edit
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={() => handleDeleteAnswer(answer.questionId)}
                                className="text-red-600 hover:text-red-700 hover:border-red-300"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
};

export default DraftAnswersView;

