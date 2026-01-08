import React, { useEffect, useState } from 'react';
import Modal from './ui/Modal';
import Button from './ui/Button';
import Input from './ui/Input';
import { questionBankService, ApplicationQuestion, StartupAnswer } from '../lib/questionBankService';
import { messageService } from '../lib/messageService';
import { Check, AlertCircle, Search, FileText } from 'lucide-react';

interface ReferenceApplicationDraftProps {
  isOpen: boolean;
  onClose: () => void;
  startupId: number;
}

const ReferenceApplicationDraft: React.FC<ReferenceApplicationDraftProps> = ({
  isOpen,
  onClose,
  startupId
}) => {
  const [questions, setQuestions] = useState<ApplicationQuestion[]>([]);
  const [answers, setAnswers] = useState<Map<string, StartupAnswer>>(new Map());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [categories, setCategories] = useState<string[]>([]);
  const [answerTexts, setAnswerTexts] = useState<Map<string, string>>(new Map());

  useEffect(() => {
    if (isOpen && startupId) {
      loadData();
    }
  }, [isOpen, startupId]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [approvedQuestions, startupAnswers, predefinedCategories] = await Promise.all([
        questionBankService.getApprovedQuestions(),
        questionBankService.getStartupAnswers(startupId),
        questionBankService.getPredefinedCategories()
      ]);

      setQuestions(approvedQuestions);
      // Use predefined categories from database
      setCategories(predefinedCategories);

      // Create a map of answers by question ID
      const answersMap = new Map<string, StartupAnswer>();
      startupAnswers.forEach(answer => {
        answersMap.set(answer.questionId, answer);
        answerTexts.set(answer.questionId, answer.answerText);
      });
      setAnswers(answersMap);
      setAnswerTexts(new Map(answerTexts));
    } catch (error: any) {
      console.error('Failed to load data:', error);
      messageService.error('Failed to Load Data', error.message || 'Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleAnswerChange = (questionId: string, value: string) => {
    setAnswerTexts(prev => {
      const newMap = new Map(prev);
      newMap.set(questionId, value);
      return newMap;
    });
  };

  const handleSaveAnswer = async (questionId: string) => {
    const answerText = answerTexts.get(questionId)?.trim();
    if (!answerText) {
      messageService.warning('Answer Required', 'Please enter an answer before saving.');
      return;
    }

    try {
      setSaving(questionId);
      const savedAnswer = await questionBankService.saveStartupAnswer(startupId, questionId, answerText);
      
      // Update answers map
      setAnswers(prev => {
        const newMap = new Map(prev);
        newMap.set(questionId, savedAnswer);
        return newMap;
      });

      messageService.success('Answer Saved', 'Your answer has been saved for future use.');
    } catch (error: any) {
      messageService.error('Save Failed', error.message || 'Please try again.');
    } finally {
      setSaving(null);
    }
  };

  const handleDeleteAnswer = async (questionId: string) => {
    try {
      await questionBankService.deleteStartupAnswer(startupId, questionId);
      
      // Remove from answers map
      setAnswers(prev => {
        const newMap = new Map(prev);
        newMap.delete(questionId);
        return newMap;
      });

      // Clear answer text
      setAnswerTexts(prev => {
        const newMap = new Map(prev);
        newMap.delete(questionId);
        return newMap;
      });

      messageService.success('Answer Deleted', 'Your answer has been removed.');
    } catch (error: any) {
      messageService.error('Delete Failed', error.message || 'Please try again.');
    }
  };

  const filteredQuestions = questions.filter(q => {
    const matchesSearch = q.questionText.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Filter by category
    if (!selectedCategory || selectedCategory === 'all') {
      return matchesSearch;
    } else if (selectedCategory === 'other') {
      // Show questions with no category or category not in the predefined list
      const hasCategory = q.category && categories.includes(q.category);
      return matchesSearch && !hasCategory;
    } else {
      // Show questions matching the selected category
      return matchesSearch && q.category === selectedCategory;
    }
  });

  const answeredCount = Array.from(answers.keys()).length;
  const unansweredCount = questions.length - answeredCount;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Reference Application Draft" size="4xl">
      <div className="space-y-6">
        {/* Header Stats */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
            <p className="text-sm text-slate-600">Total Questions</p>
            <p className="text-2xl font-bold text-slate-900">{questions.length}</p>
          </div>
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <p className="text-sm text-green-600">Answered</p>
            <p className="text-2xl font-bold text-green-700">{answeredCount}</p>
          </div>
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <p className="text-sm text-yellow-600">Unanswered</p>
            <p className="text-2xl font-bold text-yellow-700">{unansweredCount}</p>
          </div>
        </div>

        {/* Info Banner */}
        <div className="bg-blue-50 border border-blue-200 rounded-md p-3 flex items-start gap-2">
          <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-800">
            <p className="font-medium mb-1">Build Your Answer Bank</p>
            <p>
              Answer questions here to build a reusable answer bank. When you apply to programs, 
              your saved answers will be automatically filled in. You can update your answers anytime.
            </p>
          </div>
        </div>

        {/* Search and Filter */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400" />
            <Input
              type="text"
              placeholder="Search questions..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-brand-primary sm:text-sm"
          >
            <option value="all">All Categories</option>
            {categories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
            <option value="other">Other (Uncategorized)</option>
          </select>
        </div>

        {/* Questions List */}
        <div className="border border-slate-200 rounded-md max-h-[60vh] overflow-y-auto">
          {loading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-primary mx-auto mb-4"></div>
              <p className="text-slate-600">Loading questions...</p>
            </div>
          ) : filteredQuestions.length === 0 ? (
            <div className="p-8 text-center">
              <FileText className="h-12 w-12 text-slate-400 mx-auto mb-4" />
              <p className="text-slate-600">
                {searchTerm 
                  ? `No questions match your search${selectedCategory && selectedCategory !== 'all' ? ` in "${selectedCategory === 'other' ? 'Other' : selectedCategory}" category` : ''}.` 
                  : `No questions available${selectedCategory && selectedCategory !== 'all' ? ` in "${selectedCategory === 'other' ? 'Other' : selectedCategory}" category` : ''}.`}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-200">
              {filteredQuestions.map(question => {
                const existingAnswer = answers.get(question.id);
                const isAnswered = !!existingAnswer;
                const currentAnswer = answerTexts.get(question.id) || existingAnswer?.answerText || '';
                const hasChanges = existingAnswer ? currentAnswer !== existingAnswer.answerText : currentAnswer.trim() !== '';

                return (
                  <div
                    key={question.id}
                    className={`p-4 ${isAnswered ? 'bg-green-50/30' : 'bg-white'} hover:bg-slate-50 transition-colors`}
                  >
                    <div className="space-y-3">
                      {/* Question Header */}
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="text-sm font-medium text-slate-900">{question.questionText}</p>
                            {isAnswered && (
                              <span className="px-2 py-0.5 text-xs font-medium bg-green-100 text-green-800 rounded flex items-center gap-1">
                                <Check className="h-3 w-3" />
                                Answered
                              </span>
                            )}
                          </div>
                          {question.category && (
                            <p className="text-xs text-slate-500">Category: {question.category}</p>
                          )}
                        </div>
                      </div>

                      {/* Answer Input */}
                      <div>
                        {question.questionType === 'textarea' ? (
                          <textarea
                            value={currentAnswer}
                            onChange={(e) => handleAnswerChange(question.id, e.target.value)}
                            className="block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-brand-primary sm:text-sm"
                            rows={4}
                            placeholder="Enter your answer here..."
                          />
                        ) : question.questionType === 'select' ? (
                          <select
                            value={currentAnswer}
                            onChange={(e) => handleAnswerChange(question.id, e.target.value)}
                            className="block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-brand-primary sm:text-sm"
                          >
                            <option value="">Select an option</option>
                            {question.options?.map((option, idx) => (
                              <option key={idx} value={option}>{option}</option>
                            ))}
                          </select>
                        ) : question.questionType === 'multiselect' ? (
                          <div className="space-y-2 border border-slate-300 rounded-md p-3">
                            {question.options?.map((option, idx) => {
                              const selectedOptions = currentAnswer ? currentAnswer.split(',').filter(v => v.trim()) : [];
                              const isChecked = selectedOptions.includes(option);
                              return (
                                <label key={idx} className="flex items-center gap-2 cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={isChecked}
                                    onChange={(e) => {
                                      let selected = currentAnswer ? currentAnswer.split(',').filter(v => v.trim()) : [];
                                      if (e.target.checked) {
                                        if (!selected.includes(option)) {
                                          selected.push(option);
                                        }
                                      } else {
                                        selected = selected.filter(v => v !== option);
                                      }
                                      handleAnswerChange(question.id, selected.join(','));
                                    }}
                                    className="h-4 w-4 text-brand-primary focus:ring-brand-primary border-slate-300 rounded"
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
                            onChange={(e) => handleAnswerChange(question.id, e.target.value)}
                            placeholder="Enter a number..."
                          />
                        ) : question.questionType === 'date' ? (
                          <Input
                            type="date"
                            value={currentAnswer}
                            onChange={(e) => handleAnswerChange(question.id, e.target.value)}
                          />
                        ) : (
                          <Input
                            type="text"
                            value={currentAnswer}
                            onChange={(e) => handleAnswerChange(question.id, e.target.value)}
                            placeholder="Enter your answer here..."
                          />
                        )}
                      </div>

                      {/* Action Buttons */}
                      <div className="flex items-center justify-end gap-2">
                        {isAnswered && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteAnswer(question.id)}
                          >
                            Delete Answer
                          </Button>
                        )}
                        <Button
                          size="sm"
                          onClick={() => handleSaveAnswer(question.id)}
                          disabled={saving === question.id || !hasChanges || !currentAnswer.trim()}
                        >
                          {saving === question.id ? 'Saving...' : isAnswered ? 'Update Answer' : 'Save Answer'}
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer Info */}
        <div className="bg-slate-50 border border-slate-200 rounded-md p-3">
          <p className="text-xs text-slate-600">
            <strong>Tip:</strong> Save answers to frequently asked questions to speed up your application process. 
            Your answers will be automatically filled when you apply to programs that use these questions.
          </p>
        </div>
      </div>
    </Modal>
  );
};

export default ReferenceApplicationDraft;

