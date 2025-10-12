import React, { useState, useEffect } from 'react';
import Modal from './ui/Modal';
import Input from './ui/Input';
import Button from './ui/Button';
import { X, Save } from 'lucide-react';

interface EditStartupModalProps {
  isOpen: boolean;
  onClose: () => void;
  startup: {
    id: string;
    startupName: string;
    contactPerson: string;
    email: string;
    phone: string;
  } | null;
  onSave: (updatedData: {
    startupName: string;
    contactPerson: string;
    email: string;
    phone: string;
  }) => Promise<void>;
}

const EditStartupModal: React.FC<EditStartupModalProps> = ({
  isOpen,
  onClose,
  startup,
  onSave
}) => {
  const [formData, setFormData] = useState({
    startupName: '',
    contactPerson: '',
    email: '',
    phone: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Update form data when startup prop changes
  useEffect(() => {
    if (startup) {
      setFormData({
        startupName: startup.startupName,
        contactPerson: startup.contactPerson,
        email: startup.email,
        phone: startup.phone
      });
    }
  }, [startup]);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    // Validation
    if (!formData.startupName.trim()) {
      setError('Startup name is required');
      setIsLoading(false);
      return;
    }
    if (!formData.contactPerson.trim()) {
      setError('Contact person is required');
      setIsLoading(false);
      return;
    }
    if (!formData.email.trim()) {
      setError('Email is required');
      setIsLoading(false);
      return;
    }
    if (!formData.phone.trim()) {
      setError('Phone number is required');
      setIsLoading(false);
      return;
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setError('Please enter a valid email address');
      setIsLoading(false);
      return;
    }

    try {
      await onSave(formData);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to update startup information');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    if (!isLoading) {
      setError(null);
      onClose();
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose}>
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <h2 className="text-xl font-semibold text-slate-900">Edit Startup</h2>
          <button
            onClick={handleClose}
            disabled={isLoading}
            className="text-slate-400 hover:text-slate-600 transition-colors disabled:opacity-50"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-3">
              <p className="text-red-800 text-sm">{error}</p>
            </div>
          )}

          <Input
            label="Startup Name"
            id="startupName"
            type="text"
            value={formData.startupName}
            onChange={(e) => handleInputChange('startupName', e.target.value)}
            required
            disabled={isLoading}
            placeholder="Enter startup name"
          />

          <Input
            label="Contact Person"
            id="contactPerson"
            type="text"
            value={formData.contactPerson}
            onChange={(e) => handleInputChange('contactPerson', e.target.value)}
            required
            disabled={isLoading}
            placeholder="Enter contact person name"
          />

          <Input
            label="Email"
            id="email"
            type="email"
            value={formData.email}
            onChange={(e) => handleInputChange('email', e.target.value)}
            required
            disabled={isLoading}
            placeholder="Enter email address"
          />

          <Input
            label="Phone"
            id="phone"
            type="tel"
            value={formData.phone}
            onChange={(e) => handleInputChange('phone', e.target.value)}
            required
            disabled={isLoading}
            placeholder="Enter phone number"
          />

          <div className="flex items-center justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isLoading}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Updating...
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Save className="h-4 w-4" />
                  Update Startup
                </div>
              )}
            </Button>
          </div>
        </form>
      </div>
    </Modal>
  );
};

export default EditStartupModal;
