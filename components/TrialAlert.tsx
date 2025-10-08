import React, { useState, useEffect } from 'react';
import { Clock, AlertTriangle, CheckCircle } from 'lucide-react';

interface TrialAlertProps {
  userId: string;
  onTrialEnd: () => void;
}

interface TrialStatus {
  hasActiveTrial: boolean;
  minutesRemaining: number;
  trialEndTime: string | null;
}

const TrialAlert: React.FC<TrialAlertProps> = ({ userId, onTrialEnd }) => {
  const [trialStatus, setTrialStatus] = useState<TrialStatus>({
    hasActiveTrial: false,
    minutesRemaining: 0,
    trialEndTime: null
  });
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const checkTrialStatus = async () => {
      try {
        const { TrialService } = await import('../lib/trialService');
        const status = await TrialService.checkTrialStatus(userId);
        
        setTrialStatus({
          hasActiveTrial: status.hasActiveTrial,
          minutesRemaining: status.minutesRemaining,
          trialEndTime: status.trialEndTime
        });

        // Show alert if trial is active and has less than 2 minutes remaining
        if (status.hasActiveTrial && status.minutesRemaining <= 2) {
          setIsVisible(true);
        }

        // Auto-hide if trial has ended
        if (!status.hasActiveTrial && status.minutesRemaining <= 0) {
          setIsVisible(false);
          onTrialEnd();
        }
      } catch (error) {
        console.error('Error checking trial status:', error);
      }
    };

    // Check immediately
    checkTrialStatus();

    // Check every 5 seconds (faster during testing)
    const interval = setInterval(checkTrialStatus, 5000);

    return () => clearInterval(interval);
  }, [userId, onTrialEnd]);

  if (!isVisible || !trialStatus.hasActiveTrial) {
    return null;
  }

  const getAlertType = () => {
    if (trialStatus.minutesRemaining <= 1) {
      return 'critical';
    } else if (trialStatus.minutesRemaining <= 2) {
      return 'warning';
    }
    return 'info';
  };

  const alertType = getAlertType();

  const getAlertStyles = () => {
    switch (alertType) {
      case 'critical':
        return 'bg-red-50 border-red-200 text-red-800';
      case 'warning':
        return 'bg-yellow-50 border-yellow-200 text-yellow-800';
      default:
        return 'bg-blue-50 border-blue-200 text-blue-800';
    }
  };

  const getIcon = () => {
    switch (alertType) {
      case 'critical':
        return <AlertTriangle className="h-5 w-5 text-red-600" />;
      case 'warning':
        return <Clock className="h-5 w-5 text-yellow-600" />;
      default:
        return <CheckCircle className="h-5 w-5 text-blue-600" />;
    }
  };

  const getMessage = () => {
    if (trialStatus.minutesRemaining <= 0) {
      return 'Your free trial has ended. Please subscribe to continue.';
    } else if (trialStatus.minutesRemaining <= 1) {
      return `Your free trial ends in less than 1 minute! Subscribe now to avoid interruption.`;
    } else if (trialStatus.minutesRemaining <= 2) {
      return `Your free trial ends in ${Math.ceil(trialStatus.minutesRemaining)} minutes. Subscribe now to continue.`;
    }
    return `Your free trial has ${Math.ceil(trialStatus.minutesRemaining)} minutes remaining.`;
  };

  return (
    <div className="fixed top-4 left-4 right-4 z-50">
      <div className={`max-w-md mx-auto rounded-lg border p-4 shadow-lg ${getAlertStyles()}`}>
        <div className="flex items-center">
          {getIcon()}
          <div className="ml-3">
            <h3 className="text-sm font-semibold">
              {alertType === 'critical' ? 'Trial Ending Soon!' : 'Free Trial Active'}
            </h3>
            <p className="text-sm mt-1">
              {getMessage()}
            </p>
            {trialStatus.trialEndTime && (
              <p className="text-xs mt-1 opacity-75">
                Trial ends at: {new Date(trialStatus.trialEndTime).toLocaleTimeString()}
              </p>
            )}
          </div>
          <button
            onClick={() => setIsVisible(false)}
            className="ml-auto text-gray-400 hover:text-gray-600"
          >
            ×
          </button>
        </div>
      </div>
    </div>
  );
};

export default TrialAlert;
