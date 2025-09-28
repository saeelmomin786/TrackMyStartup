import React, { useState } from 'react';
import { databaseFixService } from '../lib/databaseFixService';
import Card from './ui/Card';
import Button from './ui/Button';
import { RefreshCw, CheckCircle, AlertCircle, Shield } from 'lucide-react';

const UserDataManager: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  const handleCreateMissingOffers = async () => {
    setIsLoading(true);
    setMessage(null);
    
    try {
      const result = await databaseFixService.createMissingInvestmentOffers();
      
      if (result.success) {
        setMessage({ type: 'success', text: `${result.message}` });
      } else {
        setMessage({ type: 'error', text: result.message });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'An unexpected error occurred while creating missing offers.' });
    } finally {
      setIsLoading(false);
    }
  };

  const getMessageIcon = () => {
    if (!message) return null;
    
    switch (message.type) {
      case 'success':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'error':
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      case 'info':
        return <AlertCircle className="h-5 w-5 text-blue-500" />;
      default:
        return null;
    }
  };

  const getMessageColor = () => {
    if (!message) return '';
    
    switch (message.type) {
      case 'success':
        return 'bg-green-50 border-green-200 text-green-800';
      case 'error':
        return 'bg-red-50 border-red-200 text-red-800';
      case 'info':
        return 'bg-blue-50 border-blue-200 text-blue-800';
      default:
        return '';
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <Card className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <Shield className="h-8 w-8 text-green-600" />
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Investment System Manager</h1>
            <p className="text-slate-600">Manage investment relationships and offers</p>
          </div>
        </div>

        {message && (
          <div className={`flex items-center gap-3 p-4 mb-6 rounded-lg border ${getMessageColor()}`}>
            {getMessageIcon()}
            <p className="font-medium">{message.text}</p>
          </div>
        )}

        <div className="space-y-4">
          <div className="p-4 bg-green-50 rounded-lg">
            <h3 className="font-semibold text-green-900 mb-2">Create Missing Investment Offers</h3>
            <p className="text-green-700 text-sm mb-4">
              This will automatically create investment offers for existing advisor-startup relationships. 
              This is safe to run multiple times and will only create missing offers.
            </p>
            <Button
              onClick={handleCreateMissingOffers}
              disabled={isLoading}
              className="flex items-center gap-2 bg-green-600 hover:bg-green-700"
            >
              {isLoading ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <Shield className="h-4 w-4" />
              )}
              {isLoading ? 'Creating...' : 'Create Missing Offers'}
            </Button>
          </div>
        </div>

        <div className="mt-8 p-4 bg-slate-50 rounded-lg">
          <h3 className="font-semibold text-slate-900 mb-2">How It Works</h3>
          <div className="text-sm text-slate-600 space-y-1">
            <p>• Automatically creates relationships between advisors and startups</p>
            <p>• Generates investment offers for existing relationships</p>
            <p>• Safe to run multiple times - won't create duplicates</p>
            <p>• Works for all users without admin permissions</p>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default UserDataManager;
