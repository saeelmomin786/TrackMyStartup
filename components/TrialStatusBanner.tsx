import React, { useState, useEffect } from 'react';
// Payment service removed
type UserSubscription = { trial_start?: string; trial_end?: string; subscription_plans?: { name?: string } };

interface TrialStatusBannerProps {
  userId: string;
  onTrialEnd?: () => void;
}

const TrialStatusBanner: React.FC<TrialStatusBannerProps> = ({
  userId,
  onTrialEnd
}) => {
  const [trialSubscription, setTrialSubscription] = useState<UserSubscription | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [timeRemaining, setTimeRemaining] = useState<string>('');

  useEffect(() => {
    if (userId) {
      loadTrialStatus();
    }
  }, [userId]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (trialSubscription?.trial_end) {
      interval = setInterval(() => {
        updateTimeRemaining();
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [trialSubscription]);

  const loadTrialStatus = async () => {
    try {
      setIsLoading(true);
      setTrialSubscription(null);
      
      if (subscription) {
        updateTimeRemaining();
      }
    } catch (error) {
      console.error('Error loading trial status:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const updateTimeRemaining = () => {
    if (!trialSubscription?.trial_end) return;

    const trialEndDate = new Date(trialSubscription.trial_end);
    const now = new Date();
    const diff = trialEndDate.getTime() - now.getTime();

    if (diff <= 0) {
      setTimeRemaining('Trial ended');
      if (onTrialEnd) {
        onTrialEnd();
      }
      return;
    }

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (days > 0) {
      setTimeRemaining(`${days} day${days !== 1 ? 's' : ''} remaining`);
    } else if (hours > 0) {
      setTimeRemaining(`${hours} hour${hours !== 1 ? 's' : ''} remaining`);
    } else {
      setTimeRemaining(`${minutes} minute${minutes !== 1 ? 's' : ''} remaining`);
    }
  };

  const getTrialProgress = () => {
    if (!trialSubscription?.trial_start || !trialSubscription?.trial_end) return 0;

    const trialStart = new Date(trialSubscription.trial_start);
    const trialEnd = new Date(trialSubscription.trial_end);
    const now = new Date();

    const totalDuration = trialEnd.getTime() - trialStart.getTime();
    const elapsed = now.getTime() - trialStart.getTime();

    return Math.min(Math.max((elapsed / totalDuration) * 100, 0), 100);
  };

  const getBannerColor = () => {
    const progress = getTrialProgress();
    if (progress >= 90) return 'bg-red-50 border-red-200 text-red-800';
    if (progress >= 70) return 'bg-yellow-50 border-yellow-200 text-yellow-800';
    return 'bg-blue-50 border-blue-200 text-blue-800';
  };

  const getIcon = () => {
    const progress = getTrialProgress();
    if (progress >= 90) {
      return (
        <svg className="w-5 h-5 text-red-600" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
        </svg>
      );
    }
    if (progress >= 70) {
      return (
        <svg className="w-5 h-5 text-yellow-600" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
        </svg>
      );
    }
    return (
      <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
      </svg>
    );
  };

  if (isLoading) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-4">
        <div className="animate-pulse flex items-center">
          <div className="w-5 h-5 bg-gray-300 rounded mr-3"></div>
          <div className="h-4 bg-gray-300 rounded w-1/3"></div>
        </div>
      </div>
    );
  }

  if (!trialSubscription) {
    return null;
  }

  const progress = getTrialProgress();
  const bannerColor = getBannerColor();

  return (
    <div className={`border rounded-lg p-4 mb-4 ${bannerColor}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          {getIcon()}
          <div className="ml-3">
            <h3 className="text-sm font-medium">
              {progress >= 90 ? 'Trial Ending Soon!' : 'Free Trial Active'}
            </h3>
            <p className="text-sm opacity-90">
              {timeRemaining} • {trialSubscription.subscription_plans?.name || 'Startup Plan'}
            </p>
          </div>
        </div>
        
        <div className="flex items-center space-x-4">
          <div className="text-right">
            <div className="text-sm font-medium">
              {progress >= 90 ? 'Trial ends soon' : 'Trial in progress'}
            </div>
            <div className="text-xs opacity-75">
              {Math.round(progress)}% complete
            </div>
          </div>
          
          <div className="w-16 bg-white bg-opacity-50 rounded-full h-2">
            <div 
              className="bg-current h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
        </div>
      </div>
      
      {progress >= 70 && (
        <div className="mt-3 pt-3 border-t border-current border-opacity-20">
          <p className="text-sm">
            {progress >= 90 
              ? 'Your trial will end soon. You\'ll be automatically charged for the subscription.'
              : 'Your trial is progressing. You\'ll be charged automatically when the trial ends.'
            }
          </p>
        </div>
      )}
    </div>
  );
};

export default TrialStatusBanner;






