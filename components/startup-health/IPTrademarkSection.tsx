import React, { useState, useEffect, useRef } from 'react';
import { 
    IPTrademarkRecord, 
    IPTrademarkDocument, 
    CreateIPTrademarkRecordData, 
    UpdateIPTrademarkRecordData,
    IPType,
    IPStatus,
    IPDocumentType,
    UserRole
} from '../../types';
import { ipTrademarkService } from '../../lib/ipTrademarkService';
import { 
    Plus, 
    Edit, 
    Trash2, 
    Upload, 
    Download, 
    Eye, 
    X, 
    FileText,
    Calendar,
    MapPin,
    DollarSign,
    User,
    AlertCircle
} from 'lucide-react';
import Card from '../ui/Card';
import Button from '../ui/Button';
import Modal from '../ui/Modal';
import CloudDriveInput from '../ui/CloudDriveInput';

type CurrentUserLike = { role: UserRole; email?: string; serviceCode?: string };

interface IPTrademarkSectionProps {
    startupId: number;
    currentUser?: CurrentUserLike;
    isViewOnly?: boolean;
}

const IPTrademarkSection: React.FC<IPTrademarkSectionProps> = ({ 
    startupId, 
    currentUser, 
    isViewOnly = false 
}) => {
    const [records, setRecords] = useState<IPTrademarkRecord[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showAddModal, setShowAddModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showUploadModal, setShowUploadModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [selectedRecord, setSelectedRecord] = useState<IPTrademarkRecord | null>(null);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [uploading, setUploading] = useState(false);
    const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
    const [formData, setFormData] = useState<CreateIPTrademarkRecordData>({
        type: IPType.Trademark,
        name: '',
        jurisdiction: '',
        status: IPStatus.Active
    });
    const [documentType, setDocumentType] = useState<IPDocumentType>(IPDocumentType.RegistrationCertificate);
    const [documentUrl, setDocumentUrl] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Load IP/trademark records
    useEffect(() => {
        loadRecords();
    }, [startupId]);

    const loadRecords = async () => {
        try {
            setIsLoading(true);
            const data = await ipTrademarkService.getIPTrademarkRecords(startupId);
            setRecords(data);
        } catch (error) {
            console.error('Error loading IP/trademark records:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleAddRecord = async () => {
        try {
            await ipTrademarkService.createIPTrademarkRecord(startupId, formData);
            setShowAddModal(false);
            setFormData({
                type: IPType.Trademark,
                name: '',
                jurisdiction: '',
                status: IPStatus.Active
            });
            loadRecords();
        } catch (error) {
            console.error('Error adding IP/trademark record:', error);
        }
    };

    const handleEditRecord = async () => {
        if (!selectedRecord) return;
        
        try {
            await ipTrademarkService.updateIPTrademarkRecord(selectedRecord.id, formData);
            setShowEditModal(false);
            setSelectedRecord(null);
            loadRecords();
        } catch (error) {
            console.error('Error updating IP/trademark record:', error);
        }
    };

    const handleDeleteRecord = async () => {
        if (!deleteTargetId) return;
        
        try {
            await ipTrademarkService.deleteIPTrademarkRecord(deleteTargetId);
            setShowDeleteModal(false);
            setDeleteTargetId(null);
            loadRecords();
        } catch (error) {
            console.error('Error deleting IP/trademark record:', error);
        }
    };

    const handleFileUpload = async () => {
        if (!selectedRecord) return;
        
        try {
            setUploading(true);
            
            // Check for cloud drive URL first
            const cloudDriveUrl = documentUrl.trim();
            
            if (cloudDriveUrl) {
                // Use cloud drive URL directly
                await ipTrademarkService.uploadIPTrademarkDocument(
                    selectedRecord.id,
                    null, // No file
                    documentType,
                    currentUser?.email || 'Unknown',
                    cloudDriveUrl
                );
            } else if (selectedFile) {
                // Upload file
                await ipTrademarkService.uploadIPTrademarkDocument(
                    selectedRecord.id,
                    selectedFile,
                    documentType,
                    currentUser?.email || 'Unknown'
                );
            } else {
                alert('Please provide either a cloud drive URL or upload a file');
                return;
            }
            
            setShowUploadModal(false);
            setSelectedFile(null);
            setSelectedRecord(null);
            setDocumentUrl('');
            loadRecords();
        } catch (error) {
            console.error('Error uploading document:', error);
        } finally {
            setUploading(false);
        }
    };

    const handleDeleteDocument = async (documentId: string) => {
        try {
            await ipTrademarkService.deleteIPTrademarkDocument(documentId);
            loadRecords();
        } catch (error) {
            console.error('Error deleting document:', error);
        }
    };

    const openEditModal = (record: IPTrademarkRecord) => {
        setSelectedRecord(record);
        setFormData({
            type: record.type,
            name: record.name,
            description: record.description,
            registrationNumber: record.registrationNumber,
            registrationDate: record.registrationDate,
            expiryDate: record.expiryDate,
            jurisdiction: record.jurisdiction,
            status: record.status,
            owner: record.owner,
            filingDate: record.filingDate,
            priorityDate: record.priorityDate,
            renewalDate: record.renewalDate,
            estimatedValue: record.estimatedValue,
            notes: record.notes
        });
        setShowEditModal(true);
    };

    const openUploadModal = (record: IPTrademarkRecord) => {
        setSelectedRecord(record);
        setSelectedFile(null);
        setDocumentUrl('');
        setShowUploadModal(true);
    };

    const getStatusColor = (status: IPStatus) => {
        switch (status) {
            case IPStatus.Active:
                return 'bg-green-100 text-green-800';
            case IPStatus.Pending:
                return 'bg-yellow-100 text-yellow-800';
            case IPStatus.Expired:
                return 'bg-red-100 text-red-800';
            case IPStatus.Abandoned:
                return 'bg-gray-100 text-gray-800';
            case IPStatus.Cancelled:
                return 'bg-red-100 text-red-800';
            default:
                return 'bg-gray-100 text-gray-800';
        }
    };

    const getTypeColor = (type: IPType) => {
        switch (type) {
            case IPType.Trademark:
                return 'bg-blue-100 text-blue-800';
            case IPType.Patent:
                return 'bg-purple-100 text-purple-800';
            case IPType.Copyright:
                return 'bg-green-100 text-green-800';
            case IPType.TradeSecret:
                return 'bg-orange-100 text-orange-800';
            case IPType.DomainName:
                return 'bg-cyan-100 text-cyan-800';
            default:
                return 'bg-gray-100 text-gray-800';
        }
    };

    if (isLoading) {
        return (
            <Card>
                <div className="p-6 text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-2 text-gray-600">Loading IP/Trademark records...</p>
                </div>
            </Card>
        );
    }

    return (
        <div className="space-y-6 border border-gray-200 rounded-lg p-4 bg-white">
            <div className="flex justify-between items-center">
                <h3 className="text-xl font-semibold text-slate-700">Intellectual Property & Trademarks</h3>
                {!isViewOnly && (
                    <Button 
                        onClick={() => setShowAddModal(true)}
                        className="flex items-center gap-2"
                    >
                        <Plus className="w-4 h-4" />
                        Add IP/Trademark
                    </Button>
                )}
            </div>

            {records.length > 0 && (
                <div className="grid gap-4">
                    {records.map((record) => (
                        <Card key={record.id}>
                            <div className="p-6">
                                <div className="flex justify-between items-start mb-4">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3 mb-2">
                                            <h4 className="text-lg font-semibold text-slate-900">{record.name}</h4>
                                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getTypeColor(record.type)}`}>
                                                {record.type}
                                            </span>
                                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(record.status)}`}>
                                                {record.status}
                                            </span>
                                        </div>
                                        {record.description && (
                                            <p className="text-gray-600 mb-2">{record.description}</p>
                                        )}
                                        <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                                            {record.registrationNumber && (
                                                <div className="flex items-center gap-1">
                                                    <FileText className="w-4 h-4" />
                                                    <span>Reg. #{record.registrationNumber}</span>
                                                </div>
                                            )}
                                            {record.jurisdiction && (
                                                <div className="flex items-center gap-1">
                                                    <MapPin className="w-4 h-4" />
                                                    <span>{record.jurisdiction}</span>
                                                </div>
                                            )}
                                            {record.registrationDate && (
                                                <div className="flex items-center gap-1">
                                                    <Calendar className="w-4 h-4" />
                                                    <span>Reg: {new Date(record.registrationDate).toLocaleDateString()}</span>
                                                </div>
                                            )}
                                            {record.expiryDate && (
                                                <div className="flex items-center gap-1">
                                                    <Calendar className="w-4 h-4" />
                                                    <span>Exp: {new Date(record.expiryDate).toLocaleDateString()}</span>
                                                </div>
                                            )}
                                            {record.estimatedValue && (
                                                <div className="flex items-center gap-1">
                                                    <DollarSign className="w-4 h-4" />
                                                    <span>${record.estimatedValue.toLocaleString()}</span>
                                                </div>
                                            )}
                                            {record.owner && (
                                                <div className="flex items-center gap-1">
                                                    <User className="w-4 h-4" />
                                                    <span>{record.owner}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    {!isViewOnly && (
                                        <div className="flex gap-2">
                                            <Button
                                                variant="secondary"
                                                size="sm"
                                                onClick={() => openEditModal(record)}
                                            >
                                                <Edit className="w-4 h-4" />
                                            </Button>
                                            <Button
                                                variant="secondary"
                                                size="sm"
                                                onClick={() => openUploadModal(record)}
                                            >
                                                <Upload className="w-4 h-4" />
                                            </Button>
                                            <Button
                                                variant="secondary"
                                                size="sm"
                                                onClick={() => {
                                                    setDeleteTargetId(record.id);
                                                    setShowDeleteModal(true);
                                                }}
                                                className="text-red-600 hover:text-red-700"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    )}
                                </div>

                                {/* Documents */}
                                {record.documents && record.documents.length > 0 && (
                                    <div className="mt-4 pt-4 border-t border-gray-200">
                                        <h5 className="text-sm font-medium text-gray-900 mb-2">Documents</h5>
                                        <div className="grid gap-2">
                                            {record.documents.map((doc) => (
                                                <div key={doc.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                                                    <div className="flex items-center gap-2">
                                                        <FileText className="w-4 h-4 text-gray-500" />
                                                        <span className="text-sm text-gray-700">{doc.fileName}</span>
                                                        <span className="text-xs text-gray-500">({doc.documentType})</span>
                                                    </div>
                                                    <div className="flex gap-1">
                                                        <Button
                                                            variant="secondary"
                                                            size="sm"
                                                            onClick={() => window.open(doc.fileUrl, '_blank')}
                                                        >
                                                            <Eye className="w-4 h-4" />
                                                        </Button>
                                                        <Button
                                                            variant="secondary"
                                                            size="sm"
                                                            onClick={() => window.open(doc.fileUrl, '_blank')}
                                                        >
                                                            <Download className="w-4 h-4" />
                                                        </Button>
                                                        {!isViewOnly && (
                                                            <Button
                                                                variant="secondary"
                                                                size="sm"
                                                                onClick={() => handleDeleteDocument(doc.id)}
                                                                className="text-red-600 hover:text-red-700"
                                                            >
                                                                <Trash2 className="w-4 h-4" />
                                                            </Button>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </Card>
                    ))}
                </div>
            )}

            {/* Add Record Modal */}
            <Modal isOpen={showAddModal} onClose={() => setShowAddModal(false)}>
                <div className="p-6 max-h-[90vh] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
                    <div className="sticky top-0 bg-white pb-4 border-b border-gray-200 mb-4">
                        <h3 className="text-lg font-semibold text-slate-900">Add IP/Trademark Record</h3>
                        <p className="text-sm text-gray-600 mt-1">Fill in the details for your intellectual property or trademark</p>
                    </div>
                    <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                                <select
                                    value={formData.type}
                                    onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value as IPType }))}
                                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                                >
                                    {Object.values(IPType).map(type => (
                                        <option key={type} value={type}>{type}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                                <select
                                    value={formData.status}
                                    onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value as IPStatus }))}
                                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                                >
                                    {Object.values(IPStatus).map(status => (
                                        <option key={status} value={status}>{status}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                            <input
                                type="text"
                                value={formData.name}
                                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                                className="w-full border border-gray-300 rounded-md px-3 py-2"
                                placeholder="Enter IP/trademark name"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Jurisdiction *</label>
                            <input
                                type="text"
                                value={formData.jurisdiction}
                                onChange={(e) => setFormData(prev => ({ ...prev, jurisdiction: e.target.value }))}
                                className="w-full border border-gray-300 rounded-md px-3 py-2"
                                placeholder="e.g., United States, EU, etc."
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                            <textarea
                                value={formData.description || ''}
                                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                                className="w-full border border-gray-300 rounded-md px-3 py-2"
                                rows={3}
                                placeholder="Enter description"
                            />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Registration Number</label>
                                <input
                                    type="text"
                                    value={formData.registrationNumber || ''}
                                    onChange={(e) => setFormData(prev => ({ ...prev, registrationNumber: e.target.value }))}
                                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                                    placeholder="Enter registration number"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Owner</label>
                                <input
                                    type="text"
                                    value={formData.owner || ''}
                                    onChange={(e) => setFormData(prev => ({ ...prev, owner: e.target.value }))}
                                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                                    placeholder="Enter owner name"
                                />
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Registration Date</label>
                                <input
                                    type="date"
                                    value={formData.registrationDate || ''}
                                    onChange={(e) => setFormData(prev => ({ ...prev, registrationDate: e.target.value }))}
                                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Expiry Date</label>
                                <input
                                    type="date"
                                    value={formData.expiryDate || ''}
                                    onChange={(e) => setFormData(prev => ({ ...prev, expiryDate: e.target.value }))}
                                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Estimated Value</label>
                                <input
                                    type="number"
                                    value={formData.estimatedValue || ''}
                                    onChange={(e) => setFormData(prev => ({ ...prev, estimatedValue: parseFloat(e.target.value) || undefined }))}
                                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                                    placeholder="0"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                            <textarea
                                value={formData.notes || ''}
                                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                                className="w-full border border-gray-300 rounded-md px-3 py-2"
                                rows={2}
                                placeholder="Enter any additional notes"
                            />
                        </div>
                    </div>
                    <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-200 sticky bottom-0 bg-white">
                        <Button variant="secondary" onClick={() => setShowAddModal(false)}>
                            Cancel
                        </Button>
                        <Button 
                            onClick={handleAddRecord}
                            disabled={!formData.name || !formData.jurisdiction}
                        >
                            Add Record
                        </Button>
                    </div>
                </div>
            </Modal>

            {/* Edit Record Modal */}
            <Modal isOpen={showEditModal} onClose={() => setShowEditModal(false)}>
                <div className="p-6 max-h-[90vh] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
                    <div className="sticky top-0 bg-white pb-4 border-b border-gray-200 mb-4">
                        <h3 className="text-lg font-semibold text-slate-900">Edit IP/Trademark Record</h3>
                        <p className="text-sm text-gray-600 mt-1">Update the details for your intellectual property or trademark</p>
                    </div>
                    <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                                <select
                                    value={formData.type}
                                    onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value as IPType }))}
                                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                                >
                                    {Object.values(IPType).map(type => (
                                        <option key={type} value={type}>{type}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                                <select
                                    value={formData.status}
                                    onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value as IPStatus }))}
                                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                                >
                                    {Object.values(IPStatus).map(status => (
                                        <option key={status} value={status}>{status}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                            <input
                                type="text"
                                value={formData.name}
                                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                                className="w-full border border-gray-300 rounded-md px-3 py-2"
                                placeholder="Enter IP/trademark name"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Jurisdiction *</label>
                            <input
                                type="text"
                                value={formData.jurisdiction}
                                onChange={(e) => setFormData(prev => ({ ...prev, jurisdiction: e.target.value }))}
                                className="w-full border border-gray-300 rounded-md px-3 py-2"
                                placeholder="e.g., United States, EU, etc."
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                            <textarea
                                value={formData.description || ''}
                                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                                className="w-full border border-gray-300 rounded-md px-3 py-2"
                                rows={3}
                                placeholder="Enter description"
                            />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Registration Number</label>
                                <input
                                    type="text"
                                    value={formData.registrationNumber || ''}
                                    onChange={(e) => setFormData(prev => ({ ...prev, registrationNumber: e.target.value }))}
                                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                                    placeholder="Enter registration number"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Owner</label>
                                <input
                                    type="text"
                                    value={formData.owner || ''}
                                    onChange={(e) => setFormData(prev => ({ ...prev, owner: e.target.value }))}
                                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                                    placeholder="Enter owner name"
                                />
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Registration Date</label>
                                <input
                                    type="date"
                                    value={formData.registrationDate || ''}
                                    onChange={(e) => setFormData(prev => ({ ...prev, registrationDate: e.target.value }))}
                                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Expiry Date</label>
                                <input
                                    type="date"
                                    value={formData.expiryDate || ''}
                                    onChange={(e) => setFormData(prev => ({ ...prev, expiryDate: e.target.value }))}
                                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Estimated Value</label>
                                <input
                                    type="number"
                                    value={formData.estimatedValue || ''}
                                    onChange={(e) => setFormData(prev => ({ ...prev, estimatedValue: parseFloat(e.target.value) || undefined }))}
                                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                                    placeholder="0"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                            <textarea
                                value={formData.notes || ''}
                                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                                className="w-full border border-gray-300 rounded-md px-3 py-2"
                                rows={2}
                                placeholder="Enter any additional notes"
                            />
                        </div>
                    </div>
                    <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-200 sticky bottom-0 bg-white">
                        <Button variant="secondary" onClick={() => setShowEditModal(false)}>
                            Cancel
                        </Button>
                        <Button 
                            onClick={handleEditRecord}
                            disabled={!formData.name || !formData.jurisdiction}
                        >
                            Update Record
                        </Button>
                    </div>
                </div>
            </Modal>

            {/* Upload Document Modal */}
            <Modal isOpen={showUploadModal} onClose={() => setShowUploadModal(false)}>
                <div className="p-6 max-h-[90vh] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
                    <div className="sticky top-0 bg-white pb-4 border-b border-gray-200 mb-4">
                        <h3 className="text-lg font-semibold text-slate-900">Upload Document</h3>
                        <p className="text-sm text-gray-600 mt-1">Upload supporting documents for your IP/trademark record</p>
                    </div>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Document Type</label>
                            <select
                                value={documentType}
                                onChange={(e) => setDocumentType(e.target.value as IPDocumentType)}
                                className="w-full border border-gray-300 rounded-md px-3 py-2"
                            >
                                {Object.values(IPDocumentType).map(type => (
                                    <option key={type} value={type}>{type}</option>
                                ))}
                            </select>
                        </div>
                        <CloudDriveInput
                            value=""
                            onChange={(url) => {
                                // Store cloud drive URL for IP document
                                setDocumentUrl(url);
                                setSelectedFile(null);
                                const hiddenInput = document.getElementById('ip-document-url') as HTMLInputElement;
                                if (hiddenInput) hiddenInput.value = url;
                            }}
                            onFileSelect={(file) => {
                                setSelectedFile(file);
                                setDocumentUrl('');
                                const hiddenInput = document.getElementById('ip-document-url') as HTMLInputElement;
                                if (hiddenInput) hiddenInput.value = '';
                            }}
                            placeholder="Paste your cloud drive link here..."
                            label="IP/Trademark Document"
                            accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                            maxSize={10}
                            documentType="IP/trademark document"
                            showPrivacyMessage={false}
                        />
                        <input type="hidden" id="ip-document-url" name="ip-document-url" value={documentUrl} readOnly />
                        {selectedFile && (
                            <div className="p-3 bg-gray-50 rounded-md">
                                <p className="text-sm text-gray-700">
                                    <strong>File:</strong> {selectedFile.name}
                                </p>
                                <p className="text-sm text-gray-500">
                                    Size: {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                                </p>
                            </div>
                        )}
                    </div>
                    <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-200 sticky bottom-0 bg-white">
                        <Button variant="secondary" onClick={() => setShowUploadModal(false)}>
                            Cancel
                        </Button>
                        <Button 
                            onClick={handleFileUpload}
                            disabled={uploading || (!selectedFile && !documentUrl.trim())}
                        >
                            {uploading ? 'Uploading...' : 'Upload Document'}
                        </Button>
                    </div>
                </div>
            </Modal>

            {/* Delete Confirmation Modal */}
            <Modal isOpen={showDeleteModal} onClose={() => setShowDeleteModal(false)}>
                <div className="p-6">
                    <div className="text-center">
                        <div className="text-red-600 mb-4">
                            <AlertCircle className="w-16 h-16 mx-auto" />
                        </div>
                        <h3 className="text-lg font-semibold text-red-600 mb-2">Confirm Deletion</h3>
                        <p className="text-sm text-gray-600 mb-6">
                            Are you sure you want to delete this IP/trademark record? This action cannot be undone.
                        </p>
                        <div className="flex justify-center gap-3">
                            <Button 
                                variant="secondary" 
                                onClick={() => setShowDeleteModal(false)}
                            >
                                Cancel
                            </Button>
                            <Button 
                                onClick={handleDeleteRecord}
                                className="bg-red-600 hover:bg-red-700 text-white"
                            >
                                Delete Record
                            </Button>
                        </div>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default IPTrademarkSection;
