import React, { useState } from 'react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import { ScheduledSession } from '../../lib/mentorSchedulingService';
import { Star, X } from 'lucide-react';
import { mentorSchedulingService } from '../../lib/mentorSchedulingService';

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  session: ScheduledSession;
  startupName: string; // Can be mentor name or startup name depending on who is giving feedback
  onSubmit: () => void;
  isStartupGivingFeedback?: boolean; // If true, startup is giving feedback to mentor
}

const FeedbackModal: React.FC<FeedbackModalProps> = ({
  isOpen,
  onClose,
  session,
  startupName,
  onSubmit,
  isStartupGivingFeedback = false
}) => {
  const [rating, setRating] = useState<number>(0);
  const [hoveredRating, setHoveredRating] = useState<number>(0);
  const [feedback, setFeedback] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const WORD_LIMIT = 500;
  const wordCount = feedback.trim().split(/\s+/).filter(word => word.length > 0).length;
  const remainingWords = WORD_LIMIT - wordCount;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (rating === 0) {
      setError('Please provide a rating (1-5 stars)');
      return;
    }

    if (feedback.trim().length === 0) {
      setError('Please provide feedback');
      return;
    }

    if (wordCount > WORD_LIMIT) {
      setError(`Feedback exceeds ${WORD_LIMIT} words. Please reduce it.`);
      return;
    }

    setIsSubmitting(true);
    try {
      // Store feedback in format: "rating|feedback_text"
      const feedbackText = `${rating}|${feedback.trim()}`;
      
      if (isStartupGivingFeedback) {
        // For startups, update the session with feedback but don't change status
        // The status should remain 'scheduled' until mentor marks it as completed
        // Or we can mark it as completed from startup side too
        await mentorSchedulingService.updateSession(session.id!, {
          feedback: feedbackText,
          status: 'completed'
        });
      } else {
        // For mentors, use completeSession
        await mentorSchedulingService.completeSession(session.id!, feedbackText);
      }

      onSubmit();
    } catch (err: any) {
      console.error('Error submitting feedback:', err);
      setError(err.message || 'Failed to submit feedback. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setRating(0);
    setFeedback('');
    setError(null);
    setHoveredRating(0);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={isStartupGivingFeedback 
        ? `Feedback for ${startupName}` 
        : `Feedback for ${startupName}`}
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Rating Section */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            {isStartupGivingFeedback ? 'Rate this mentor' : 'Rating'} <span className="text-red-500">*</span>
          </label>
          <div className="flex items-center gap-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => setRating(star)}
                onMouseEnter={() => setHoveredRating(star)}
                onMouseLeave={() => setHoveredRating(0)}
                className="focus:outline-none transition-transform hover:scale-110"
              >
                <Star
                  className={`h-8 w-8 ${
                    star <= (hoveredRating || rating)
                      ? 'fill-yellow-400 text-yellow-400'
                      : 'text-slate-300'
                  }`}
                />
              </button>
            ))}
            {rating > 0 && (
              <span className="ml-2 text-sm text-slate-600">
                {rating} out of 5
              </span>
            )}
          </div>
        </div>

        {/* Feedback Section */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Feedback <span className="text-red-500">*</span>
          </label>
          <textarea
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            rows={6}
            className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm"
            placeholder={isStartupGivingFeedback 
              ? "Share your feedback about the session with this mentor..."
              : "Share your feedback about the session with this startup..."}
            maxLength={WORD_LIMIT * 10} // Approximate character limit
          />
          <div className="flex justify-between items-center mt-1">
            <span className={`text-xs ${
              remainingWords < 0
                ? 'text-red-600'
                : remainingWords < 50
                ? 'text-orange-600'
                : 'text-slate-500'
            }`}>
              {wordCount} / {WORD_LIMIT} words
              {remainingWords < 0 && ' (exceeded limit)'}
            </span>
            {remainingWords >= 0 && (
              <span className="text-xs text-slate-500">
                {remainingWords} words remaining
              </span>
            )}
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-3">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        {/* Session Info */}
        <div className="bg-slate-50 border border-slate-200 rounded-md p-3">
          <p className="text-xs text-slate-600">
            <strong>Session Date:</strong> {session.session_date}
          </p>
          <p className="text-xs text-slate-600">
            <strong>Session Time:</strong> {session.session_time}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-2 pt-4 border-t border-slate-200">
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={isSubmitting || rating === 0 || feedback.trim().length === 0 || wordCount > WORD_LIMIT}
            className="bg-purple-600 hover:bg-purple-700"
          >
            {isSubmitting ? 'Submitting...' : 'Submit Feedback'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default FeedbackModal;

