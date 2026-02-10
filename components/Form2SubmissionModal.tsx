import React, { useEffect, useState } from 'react';
import {
  Upload,
  X,
  FileText,
  Loader,
  AlertCircle,
} from 'lucide-react';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Input from '@/components/ui/Input';
import Modal from '@/components/ui/Modal';
import { form2ResponseService, Form2QuestionDisplay } from '@/lib/form2ResponseService';
import { messageService } from '@/lib/messageService';

interface Form2SubmissionModalProps {
  isOpen: boolean;
  onClose: () => void;
  applicationId: string;
  opportunityId: string;
  opportunityName: string;
  onSuccess?: () => void;
}

export const Form2SubmissionModal: React.FC<Form2SubmissionModalProps> = ({
  isOpen,
  onClose,
  applicationId,
  opportunityId,
  opportunityName,
  onSuccess,
}) => {
  const [questions, setQuestions] = useState<Form2QuestionDisplay[]>([]);
  const [form2Config, setForm2Config] = useState<any>(null);
  const [responses, setResponses] = useState<{
    [questionId: string]: {
      answer_text?: string;
      answer_file_url?: string;
      fileName?: string;
    };
  }>({});
  const [errors, setErrors] = useState<{ [questionId: string]: string }>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [uploadingFile, setUploadingFile] = useState<string | null>(null);
  const [submissionIdempotencyKey, setSubmissionIdempotencyKey] = useState<string>(() => {
    // Generate idempotency key once per modal instance
    return `form2_${applicationId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  });
  const QUEUE_PREFIX = 'form2_queue_';

  // Load Form 2 questions and config
  useEffect(() => {
    if (isOpen) {
      loadForm2Data();
    }
  }, [isOpen, opportunityId]);

  const loadForm2Data = async () => {
    try {
      setLoading(true);

      // Fetch questions
      const questionsData = await form2ResponseService.getForm2Questions(opportunityId);
      setQuestions(questionsData);

      // Fetch config
      const configData = await form2ResponseService.getForm2Config(opportunityId);
      setForm2Config(configData);

      // Load existing responses if any
      const existingResponses = await form2ResponseService.getForm2Responses(applicationId);
      const responsesMap: typeof responses = {};
      existingResponses.forEach((resp) => {
        responsesMap[resp.question_id] = {
          answer_text: resp.answer_text || '',
          answer_file_url: resp.answer_file_url || '',
        };
      });
      setResponses(responsesMap);
    } catch (error) {
      console.error('Error loading Form 2 data:', error);
      messageService.error('Error', 'Failed to load Form 2 questions');
    } finally {
      setLoading(false);
    }
  };

  const handleResponseChange = (questionId: string, value: string) => {
    setResponses((prev) => ({
      ...prev,
      [questionId]: {
        ...prev[questionId],
        answer_text: value,
      },
    }));

    // Clear error for this field
    if (errors[questionId]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[questionId];
        return newErrors;
      });
    }
  };

  const handleFileUpload = async (questionId: string, file: File) => {
    try {
      setUploadingFile(questionId);

      const fileUrl = await form2ResponseService.uploadForm2File(
        applicationId,
        questionId,
        file
      );

      setResponses((prev) => ({
        ...prev,
        [questionId]: {
          ...prev[questionId],
          answer_file_url: fileUrl,
          fileName: file.name,
        },
      }));

      messageService.success('Success', 'File uploaded successfully');
    } catch (error) {
      console.error('Error uploading file:', error);
      messageService.error('Error', 'Failed to upload file');
    } finally {
      setUploadingFile(null);
    }
  };

  const handleFileRemove = (questionId: string) => {
    setResponses((prev) => ({
      ...prev,
      [questionId]: {
        ...prev[questionId],
        answer_file_url: '',
        fileName: '',
      },
    }));
  };

  const handleSubmit = async () => {
    try {
      // Validate responses
      const validation = form2ResponseService.validateForm2Responses(questions, responses);

      if (!validation.isValid) {
        setErrors(validation.errors);
        messageService.error('Validation Error', 'Please fill in all required fields correctly');
        return;
      }

      // Queue the submission locally first to survive refresh/close (with idempotency key)
      const queueId = `f2_${Date.now()}_${Math.floor(Math.random() * 100000)}`;
      const payload = { 
        applicationId, 
        opportunityId, 
        opportunityName, 
        responses,
        idempotencyKey: submissionIdempotencyKey,  // Include idempotency key in queue
        queuedAt: new Date().toISOString() 
      };
      try {
        localStorage.setItem(QUEUE_PREFIX + queueId, JSON.stringify(payload));
      } catch (e) {
        console.warn('Could not persist queued submission:', e);
      }

      setSubmitting(true);
      console.log('🔑 Form2 submission with idempotency key:', submissionIdempotencyKey);

      // Attempt to submit now if online; otherwise it will be retried when online
      if (!navigator.onLine) {
        messageService.info('Offline', 'You are offline — submission has been queued and will be sent when network is available');
        setSubmitting(false);
        return;
      }

      // Try sending and remove queue on success
      await (async () => {
        await form2ResponseService.saveForm2Submission(applicationId, responses, submissionIdempotencyKey);
        try { localStorage.removeItem(QUEUE_PREFIX + queueId); } catch {}
        messageService.success('Success', 'Form 2 submitted successfully!');
        onSuccess?.();
        onClose();
      })();
    } catch (error) {
      console.error('Error submitting Form 2:', error);
      messageService.error('Error', 'Failed to submit Form 2');
    } finally {
      setSubmitting(false);
    }
  };

  // Prevent modal close while submitting
  const safeOnClose = () => {
    if (submitting) return;
    onClose();
  };

  // Retry any queued submissions (called on mount and when browser goes online)
  const retryQueuedSubmissions = async () => {
    try {
      const keys = Object.keys(localStorage).filter(k => k.startsWith(QUEUE_PREFIX));
      for (const key of keys) {
        try {
          const raw = localStorage.getItem(key);
          if (!raw) { localStorage.removeItem(key); continue; }
          const item = JSON.parse(raw);
          // Attempt to resend with idempotency key
          await form2ResponseService.saveForm2Submission(
            item.applicationId, 
            item.responses,
            item.idempotencyKey  // Include idempotency key in retry
          );
          localStorage.removeItem(key);
          messageService.success('Success', 'Previously queued Form 2 submitted');
        } catch (e) {
          console.warn('Retry failed for queued submission', key, e);
          // keep in queue for next attempt
        }
      }
    } catch (e) {
      console.warn('Error while retrying queued submissions', e);
    }
  };

  useEffect(() => {
    // On mount, try to resend any queued submissions
    retryQueuedSubmissions();
    const onOnline = () => retryQueuedSubmissions();
    window.addEventListener('online', onOnline);
    return () => window.removeEventListener('online', onOnline);
  }, []);

  // Prevent accidental reload/close while submitting
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (submitting) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [submitting]);

  const renderQuestionInput = (question: Form2QuestionDisplay) => {
    const response = responses[question.question_id] || {};
    const error = errors[question.question_id];

    const labelClass = 'block text-sm font-medium text-slate-700 mb-2';
    const inputClass = 'w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm';
    const errorClass = 'text-sm text-red-600 mt-1 flex items-center gap-1';

    switch (question.question_type) {
      case 'textarea':
        return (
          <div key={question.question_id} className="space-y-2">
            <label className={labelClass}>
              {question.question_text}
              {question.is_required && <span className="text-red-500 ml-1">*</span>}
            </label>
            <textarea
              value={response.answer_text || ''}
              onChange={(e) => handleResponseChange(question.question_id, e.target.value)}
              className={inputClass}
              rows={4}
              placeholder="Enter your answer here..."
            />
            {error && <p className={errorClass}><AlertCircle className="h-4 w-4" /> {error}</p>}
          </div>
        );

      case 'file':
        return (
          <div key={question.question_id} className="space-y-2">
            <label className={labelClass}>
              {question.question_text}
              {question.is_required && <span className="text-red-500 ml-1">*</span>}
            </label>
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-2 px-3 py-2 bg-blue-50 border border-blue-300 rounded-md cursor-pointer hover:bg-blue-100">
                <Upload className="h-4 w-4 text-blue-600" />
                <span className="text-sm text-blue-600">
                  {uploadingFile === question.question_id ? 'Uploading...' : 'Upload File'}
                </span>
                <input
                  type="file"
                  onChange={(e) => {
                    if (e.target.files?.[0]) {
                      handleFileUpload(question.question_id, e.target.files[0]);
                    }
                  }}
                  disabled={uploadingFile === question.question_id}
                  className="hidden"
                />
              </label>
              {response.fileName && (
                <div className="flex items-center gap-2 px-3 py-2 bg-green-50 border border-green-300 rounded-md">
                  <FileText className="h-4 w-4 text-green-600" />
                  <span className="text-sm text-green-700">{response.fileName}</span>
                  <button
                    onClick={() => handleFileRemove(question.question_id)}
                    className="ml-2 text-red-500 hover:text-red-700"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>
            {error && <p className={errorClass}><AlertCircle className="h-4 w-4" /> {error}</p>}
          </div>
        );

      case 'email':
        return (
          <div key={question.question_id} className="space-y-2">
            <label className={labelClass}>
              {question.question_text}
              {question.is_required && <span className="text-red-500 ml-1">*</span>}
            </label>
            <Input
              type="email"
              value={response.answer_text || ''}
              onChange={(e) => handleResponseChange(question.question_id, e.target.value)}
              placeholder="Enter email address"
            />
            {error && <p className={errorClass}><AlertCircle className="h-4 w-4" /> {error}</p>}
          </div>
        );

      case 'url':
        return (
          <div key={question.question_id} className="space-y-2">
            <label className={labelClass}>
              {question.question_text}
              {question.is_required && <span className="text-red-500 ml-1">*</span>}
            </label>
            <Input
              type="url"
              value={response.answer_text || ''}
              onChange={(e) => handleResponseChange(question.question_id, e.target.value)}
              placeholder="https://example.com"
            />
            {error && <p className={errorClass}><AlertCircle className="h-4 w-4" /> {error}</p>}
          </div>
        );

      case 'number':
        return (
          <div key={question.question_id} className="space-y-2">
            <label className={labelClass}>
              {question.question_text}
              {question.is_required && <span className="text-red-500 ml-1">*</span>}
            </label>
            <Input
              type="number"
              value={response.answer_text || ''}
              onChange={(e) => handleResponseChange(question.question_id, e.target.value)}
              placeholder="Enter a number"
            />
            {error && <p className={errorClass}><AlertCircle className="h-4 w-4" /> {error}</p>}
          </div>
        );

      case 'date':
        return (
          <div key={question.question_id} className="space-y-2">
            <label className={labelClass}>
              {question.question_text}
              {question.is_required && <span className="text-red-500 ml-1">*</span>}
            </label>
            <Input
              type="date"
              value={response.answer_text || ''}
              onChange={(e) => handleResponseChange(question.question_id, e.target.value)}
            />
            {error && <p className={errorClass}><AlertCircle className="h-4 w-4" /> {error}</p>}
          </div>
        );

      case 'single_select':
      case 'multi_select':
        return (
          <div key={question.question_id} className="space-y-2">
            <label className={labelClass}>
              {question.question_text}
              {question.is_required && <span className="text-red-500 ml-1">*</span>}
            </label>
            <select
              value={response.answer_text || ''}
              onChange={(e) => handleResponseChange(question.question_id, e.target.value)}
              className={inputClass}
            >
              <option value="">Select an option...</option>
              {question.options?.map((option, index) => (
                <option key={index} value={option}>
                  {option}
                </option>
              ))}
            </select>
            {error && <p className={errorClass}><AlertCircle className="h-4 w-4" /> {error}</p>}
          </div>
        );

      case 'text':
      default:
        return (
          <div key={question.question_id} className="space-y-2">
            <label className={labelClass}>
              {question.question_text}
              {question.is_required && <span className="text-red-500 ml-1">*</span>}
            </label>
            <Input
              type="text"
              value={response.answer_text || ''}
              onChange={(e) => handleResponseChange(question.question_id, e.target.value)}
              placeholder="Enter your answer here..."
            />
            {error && <p className={errorClass}><AlertCircle className="h-4 w-4" /> {error}</p>}
          </div>
        );
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={safeOnClose}
      title={`Form 2: ${opportunityName}`}
      className="max-w-2xl"
    >
      <div className="space-y-6">
        {submitting && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60">
            <div className="flex flex-col items-center p-6">
              <Loader className="h-12 w-12 animate-spin text-white" />
              <p className="mt-3 text-white text-center">Creating your profile... Please do not refresh or close the page.</p>
            </div>
          </div>
        )}
        {form2Config?.form2_description && (
          <Card padding="md" className="bg-blue-50 border border-blue-200">
            <p className="text-sm text-slate-700">{form2Config.form2_description}</p>
          </Card>
        )}

        {loading ? (
          <div className="flex justify-center py-8">
            <Loader className="h-8 w-8 animate-spin text-blue-600" />
          </div>
        ) : (
          <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
            {questions.map((question) => renderQuestionInput(question))}
            {questions.length === 0 && (
              <Card padding="md" className="text-center">
                <p className="text-slate-500">No questions configured for this form.</p>
              </Card>
            )}
          </div>
        )}

        <div className="flex gap-3 justify-end border-t pt-4">
          <Button
            onClick={onClose}
            variant="outline"
            disabled={submitting || loading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={submitting || loading}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            {submitting ? (
              <>
                <Loader className="mr-2 h-4 w-4 animate-spin" />
                Submitting...
              </>
            ) : (
              'Submit Form 2'
            )}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
