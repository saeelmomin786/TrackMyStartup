import React, { useState } from 'react';
import { dataMigrationService } from '../lib/dataMigration';
import { databaseFixService } from '../lib/databaseFixService';
import Card from './ui/Card';
import Button from './ui/Button';
import { Database, RefreshCw, Trash2, CheckCircle, AlertCircle, Wrench, Shield } from 'lucide-react';

const DataManager: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  const handleMigrateData = async () => {
    setIsLoading(true);
    setMessage(null);
    
    try {
      const result = await dataMigrationService.migrateAllData();
      
      if (result.success) {
        setMessage({ type: 'success', text: result.message || 'Data migration completed successfully!' });
      } else {
        setMessage({ type: 'error', text: result.message || 'Data migration failed!' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'An unexpected error occurred during migration.' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearData = async () => {
    if (!confirm('Are you sure you want to clear all data? This action cannot be undone.')) {
      return;
    }
    
    setIsLoading(true);
    setMessage(null);
    
    try {
      const result = await dataMigrationService.clearAllData();
      
      if (result.success) {
        setMessage({ type: 'success', text: 'All data cleared successfully!' });
      } else {
        setMessage({ type: 'error', text: 'Failed to clear data!' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'An unexpected error occurred while clearing data.' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleFixDatabase = async () => {
    setIsLoading(true);
    setMessage(null);
    
    try {
      const result = await databaseFixService.fixAllDatabaseIssues();
      
      if (result.success) {
        setMessage({ type: 'success', text: result.message });
      } else {
        setMessage({ type: 'error', text: result.message });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'An unexpected error occurred while fixing database issues.' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleTestConnection = async () => {
    setIsLoading(true);
    setMessage(null);
    
    try {
      const result = await databaseFixService.testDatabaseConnection();
      
      if (result.success) {
        setMessage({ type: 'success', text: `${result.message} - Users: ${result.data?.usersCount}, Startups: ${result.data?.startupsCount}` });
      } else {
        setMessage({ type: 'error', text: result.message });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'An unexpected error occurred while testing database connection.' });
    } finally {
      setIsLoading(false);
    }
  };

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
          <Database className="h-8 w-8 text-blue-600" />
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Data Manager</h1>
            <p className="text-slate-600">Manage database data and migrations</p>
          </div>
        </div>

        {message && (
          <div className={`flex items-center gap-3 p-4 mb-6 rounded-lg border ${getMessageColor()}`}>
            {getMessageIcon()}
            <p className="font-medium">{message.text}</p>
          </div>
        )}

        <div className="space-y-4">
          <div className="p-4 bg-blue-50 rounded-lg">
            <h3 className="font-semibold text-blue-900 mb-2">Data Migration</h3>
            <p className="text-blue-700 text-sm mb-4">
              Populate the database with sample data including startups, investments, and user requests.
            </p>
            <Button
              onClick={handleMigrateData}
              disabled={isLoading}
              className="flex items-center gap-2"
            >
              {isLoading ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <Database className="h-4 w-4" />
              )}
              {isLoading ? 'Migrating...' : 'Migrate Sample Data'}
            </Button>
          </div>

          <div className="p-4 bg-red-50 rounded-lg">
            <h3 className="font-semibold text-red-900 mb-2">Clear All Data</h3>
            <p className="text-red-700 text-sm mb-4">
              Warning: This will permanently delete all data from the database. This action cannot be undone.
            </p>
            <Button
              onClick={handleClearData}
              disabled={isLoading}
              variant="outline"
              className="flex items-center gap-2 text-red-600 border-red-600 hover:bg-red-50"
            >
              {isLoading ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4" />
              )}
              {isLoading ? 'Clearing...' : 'Clear All Data'}
            </Button>
          </div>
        </div>

        <div className="mt-6 space-y-4">
          <div className="p-4 bg-green-50 rounded-lg">
            <h3 className="font-semibold text-green-900 mb-2">Database Management</h3>
            <p className="text-green-700 text-sm mb-4">
              Fix database issues including RLS policies and assign investment advisor codes.
            </p>
            <div className="flex gap-2 flex-wrap">
              <Button
                onClick={handleTestConnection}
                disabled={isLoading}
                variant="outline"
                className="flex items-center gap-2"
              >
                <Database className="h-4 w-4" />
                Test Connection
              </Button>
              
              <Button
                onClick={handleFixDatabase}
                disabled={isLoading}
                className="flex items-center gap-2"
              >
                <Wrench className="h-4 w-4" />
                Fix Database Issues
              </Button>
              
              <Button
                onClick={handleCreateMissingOffers}
                disabled={isLoading}
                className="flex items-center gap-2 bg-green-600 hover:bg-green-700"
              >
                <Shield className="h-4 w-4" />
                Create Missing Offers
              </Button>
            </div>
          </div>
        </div>

        <div className="mt-8 p-4 bg-slate-50 rounded-lg">
          <h3 className="font-semibold text-slate-900 mb-2">Database Information</h3>
          <div className="text-sm text-slate-600 space-y-1">
            <p>• Sample data includes 20+ startups across various sectors</p>
            <p>• Investment opportunities with different funding stages</p>
            <p>• User requests and verification workflows</p>
            <p>• Mock users for testing different roles</p>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default DataManager;
