import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import Card from '../ui/Card';
import Button from '../ui/Button';
import Input from '../ui/Input';
import { X, Plus, Edit, Trash2, Save, Percent } from 'lucide-react';

interface TaxConfiguration {
  id: string;
  name: string;
  tax_percentage: number;
  description: string;
  applies_to_user_type: string;
  country: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface TaxConfigurationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function TaxConfigurationModal({ isOpen, onClose }: TaxConfigurationModalProps) {
  const [taxConfigurations, setTaxConfigurations] = useState<TaxConfiguration[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);

  // Form state for adding/editing
  const [formData, setFormData] = useState({
    name: '',
    tax_percentage: 0,
    description: '',
    applies_to_user_type: 'Startup',
    country: 'Global',
    is_active: true
  });

  useEffect(() => {
    if (isOpen) {
      loadTaxConfigurations();
    }
  }, [isOpen]);

  const loadTaxConfigurations = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('tax_configurations')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTaxConfigurations(data || []);
    } catch (err) {
      console.error('Error loading tax configurations:', err);
      setError('Failed to load tax configurations');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setIsLoading(true);
      setError(null);

      if (editingId) {
        // Update existing configuration
        const { error } = await supabase
          .from('tax_configurations')
          .update({
            name: formData.name,
            tax_percentage: formData.tax_percentage,
            description: formData.description,
            applies_to_user_type: formData.applies_to_user_type,
            country: formData.country,
            is_active: formData.is_active,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingId);

        if (error) throw error;
        setSuccess('Tax configuration updated successfully');
      } else {
        // Create new configuration
        const { error } = await supabase
          .from('tax_configurations')
          .insert({
            name: formData.name,
            tax_percentage: formData.tax_percentage,
            description: formData.description,
            applies_to_user_type: formData.applies_to_user_type,
            country: formData.country,
            is_active: formData.is_active
          });

        if (error) throw error;
        setSuccess('Tax configuration created successfully');
      }

      // Reset form and reload data
      setFormData({
        name: '',
        tax_percentage: 0,
        description: '',
        applies_to_user_type: 'Startup',
        country: 'Global',
        is_active: true
      });
      setEditingId(null);
      setShowAddForm(false);
      await loadTaxConfigurations();
    } catch (err) {
      console.error('Error saving tax configuration:', err);
      setError('Failed to save tax configuration');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = (config: TaxConfiguration) => {
    setFormData({
      name: config.name,
      tax_percentage: config.tax_percentage,
      description: config.description,
      applies_to_user_type: config.applies_to_user_type,
      country: config.country,
      is_active: config.is_active
    });
    setEditingId(config.id);
    setShowAddForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this tax configuration?')) return;

    try {
      setIsLoading(true);
      const { error } = await supabase
        .from('tax_configurations')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setSuccess('Tax configuration deleted successfully');
      await loadTaxConfigurations();
    } catch (err) {
      console.error('Error deleting tax configuration:', err);
      setError('Failed to delete tax configuration');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      name: '',
      tax_percentage: 0,
      description: '',
      applies_to_user_type: 'Startup',
      country: 'Global',
      is_active: true
    });
    setEditingId(null);
    setShowAddForm(false);
    setError(null);
    setSuccess(null);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-6xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-slate-900">Tax Configuration</h2>
          <Button onClick={onClose} variant="outline" size="sm">
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Error/Success Messages */}
        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 rounded-md p-4">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        {success && (
          <div className="mb-4 bg-green-50 border border-green-200 rounded-md p-4">
            <p className="text-sm text-green-800">{success}</p>
          </div>
        )}

        {/* Add/Edit Form */}
        {showAddForm && (
          <Card className="mb-6">
            <div className="p-6">
              <h3 className="text-lg font-semibold mb-4">
                {editingId ? 'Edit Tax Configuration' : 'Add New Tax Configuration'}
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Configuration Name
                  </label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., Startup Tax - India"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Tax Percentage
                  </label>
                  <div className="relative">
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      value={formData.tax_percentage}
                      onChange={(e) => setFormData({ ...formData, tax_percentage: parseFloat(e.target.value) || 0 })}
                      placeholder="18.00"
                    />
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                      <Percent className="h-4 w-4 text-slate-400" />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    User Type
                  </label>
                  <select
                    value={formData.applies_to_user_type}
                    onChange={(e) => setFormData({ ...formData, applies_to_user_type: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="Startup">Startup</option>
                    <option value="Investor">Investor</option>
                    <option value="Startup Facilitation Center">Startup Facilitation Center</option>
                    <option value="Investment Advisor">Investment Advisor</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Country
                  </label>
                  <Input
                    value={formData.country}
                    onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                    placeholder="e.g., India, USA, Global"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Description of this tax configuration"
                    className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={3}
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.is_active}
                      onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                      className="mr-2"
                    />
                    <span className="text-sm font-medium text-slate-700">Active</span>
                  </label>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <Button onClick={handleSave} disabled={isLoading}>
                  <Save className="h-4 w-4 mr-2" />
                  {isLoading ? 'Saving...' : 'Save'}
                </Button>
                <Button onClick={handleCancel} variant="outline">
                  Cancel
                </Button>
              </div>
            </div>
          </Card>
        )}

        {/* Tax Configurations List */}
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Tax Configurations</h3>
            <Button onClick={() => setShowAddForm(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Configuration
            </Button>
          </div>

          {isLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="text-slate-600 mt-2">Loading tax configurations...</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {taxConfigurations.map((config) => (
                <Card key={config.id}>
                  <div className="p-4">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h4 className="font-semibold text-slate-900">{config.name}</h4>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            config.is_active 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {config.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                        
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <span className="font-medium text-slate-600">Tax Rate:</span>
                            <span className="ml-2 text-slate-900">{config.tax_percentage}%</span>
                          </div>
                          <div>
                            <span className="font-medium text-slate-600">User Type:</span>
                            <span className="ml-2 text-slate-900">{config.applies_to_user_type}</span>
                          </div>
                          <div>
                            <span className="font-medium text-slate-600">Country:</span>
                            <span className="ml-2 text-slate-900">{config.country}</span>
                          </div>
                          <div>
                            <span className="font-medium text-slate-600">Created:</span>
                            <span className="ml-2 text-slate-900">
                              {new Date(config.created_at).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                        
                        {config.description && (
                          <p className="text-sm text-slate-600 mt-2">{config.description}</p>
                        )}
                      </div>
                      
                      <div className="flex gap-2 ml-4">
                        <Button
                          onClick={() => handleEdit(config)}
                          variant="outline"
                          size="sm"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          onClick={() => handleDelete(config.id)}
                          variant="outline"
                          size="sm"
                          className="text-red-600 hover:text-red-800"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
              
              {taxConfigurations.length === 0 && (
                <div className="text-center py-8">
                  <p className="text-slate-600">No tax configurations found</p>
                  <Button onClick={() => setShowAddForm(true)} className="mt-4">
                    <Plus className="h-4 w-4 mr-2" />
                    Add First Configuration
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
