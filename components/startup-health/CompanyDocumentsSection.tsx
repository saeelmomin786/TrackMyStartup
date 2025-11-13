import React, { useState, useEffect } from 'react';
import { 
    CompanyDocument, 
    CreateCompanyDocumentData, 
    UpdateCompanyDocumentData,
    UserRole
} from '../../types';
import { companyDocumentsService } from '../../lib/companyDocumentsService';
import { 
    Plus, 
    Edit, 
    Trash2, 
    ExternalLink, 
    Eye, 
    X, 
    FileText,
    User,
    Link,
    Globe,
    ArrowUpRight
} from 'lucide-react';
import Card from '../ui/Card';
import Button from '../ui/Button';
import Modal from '../ui/Modal';
import CloudDriveInput from '../ui/CloudDriveInput';

type CurrentUserLike = { role: UserRole; email?: string; serviceCode?: string };

interface CompanyDocumentsSectionProps {
    startupId: number;
    currentUser?: CurrentUserLike;
    isViewOnly?: boolean;
}

const CompanyDocumentsSection: React.FC<CompanyDocumentsSectionProps> = ({ 
    startupId, 
    currentUser, 
    isViewOnly = false 
}) => {
    const [documents, setDocuments] = useState<CompanyDocument[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showAddModal, setShowAddModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [selectedDocument, setSelectedDocument] = useState<CompanyDocument | null>(null);
    const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
    const [formData, setFormData] = useState<CreateCompanyDocumentData>({
        documentName: '',
        description: '',
        documentUrl: '',
        documentType: ''
    });
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [uploading, setUploading] = useState(false);

    // Load company documents
    useEffect(() => {
        loadDocuments();
    }, [startupId]);

    const loadDocuments = async () => {
        try {
            setIsLoading(true);
            const data = await companyDocumentsService.getCompanyDocuments(startupId);
            setDocuments(data);
        } catch (error) {
            console.error('Error loading company documents:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleUrlChange = (url: string) => {
        const documentType = companyDocumentsService.getDocumentType(url);
        setSelectedFile(null);
        setFormData(prev => ({
            ...prev,
            documentUrl: url,
            documentType: documentType
        }));
    };

    const handleAdd = async () => {
        if (!formData.documentName) return;

        try {
            setUploading(true);
            let documentUrl = formData.documentUrl;

            // If no cloud drive URL but file is selected, upload the file
            if (!documentUrl && selectedFile) {
                documentUrl = await companyDocumentsService.uploadFile(selectedFile, startupId);
            }

            if (!documentUrl) {
                alert('Please provide either a cloud drive URL or upload a file');
                return;
            }

            const documentData: CreateCompanyDocumentData = {
                documentName: formData.documentName,
                description: formData.description,
                documentUrl: documentUrl,
                documentType: formData.documentType
            };

            await companyDocumentsService.createCompanyDocument(startupId, documentData);
            setShowAddModal(false);
            setFormData({
                documentName: '',
                description: '',
                documentUrl: '',
                documentType: ''
            });
            setSelectedFile(null);
            loadDocuments();
        } catch (error) {
            console.error('Error adding document:', error);
        } finally {
            setUploading(false);
        }
    };

    const handleEdit = (document: CompanyDocument) => {
        setSelectedDocument(document);
        setFormData({
            documentName: document.documentName,
            description: document.description || '',
            documentUrl: document.documentUrl,
            documentType: document.documentType || ''
        });
        setShowEditModal(true);
    };

    const handleUpdate = async () => {
        if (!selectedDocument) return;

        try {
            const updateData: UpdateCompanyDocumentData = {
                documentName: formData.documentName,
                description: formData.description,
                documentUrl: formData.documentUrl,
                documentType: formData.documentType
            };

            await companyDocumentsService.updateCompanyDocument(selectedDocument.id, updateData);
            setShowEditModal(false);
            setSelectedDocument(null);
            setFormData({
                documentName: '',
                description: '',
                documentUrl: '',
                documentType: ''
            });
            loadDocuments();
        } catch (error) {
            console.error('Error updating document:', error);
        }
    };

    const handleDelete = (id: string) => {
        setDeleteTargetId(id);
        setShowDeleteModal(true);
    };

    const confirmDelete = async () => {
        if (!deleteTargetId) return;

        try {
            await companyDocumentsService.deleteCompanyDocument(deleteTargetId);
            setShowDeleteModal(false);
            setDeleteTargetId(null);
            loadDocuments();
        } catch (error) {
            console.error('Error deleting document:', error);
        }
    };

    const openDocument = (url: string) => {
        console.log('Attempting to open URL:', url);
        if (url && url.trim()) {
            try {
                // Clean the URL
                let cleanUrl = url.trim();
                
                // Add protocol if missing
                if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
                    cleanUrl = `https://${cleanUrl}`;
                }
                
                console.log('Opening URL:', cleanUrl);
                
                // Create a temporary link element to ensure proper navigation
                const link = document.createElement('a');
                link.href = cleanUrl;
                link.target = '_blank';
                link.rel = 'noopener noreferrer';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            } catch (error) {
                console.error('Error opening document:', error);
                // Fallback to window.open
                window.open(url, '_blank', 'noopener,noreferrer');
            }
        } else {
            console.error('No URL provided or URL is empty');
        }
    };

    if (isLoading) {
        return (
            <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-0 shadow-lg">
                <div className="p-8 text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-200 border-t-blue-600 mx-auto"></div>
                    <p className="text-slate-600 mt-4 font-medium">Loading company documents...</p>
                </div>
            </Card>
        );
    }

    return (
        <div className="space-y-3">
            {/* Header with compact styling */}
            <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                        <div className="p-2 bg-gray-100 rounded">
                            <FileText className="w-4 h-4 text-gray-600" />
                        </div>
                        <div>
                            <h3 className="text-lg font-semibold text-slate-900">Company Documents</h3>
                            <p className="text-gray-500 text-xs">Manage your important company documents and links</p>
                        </div>
                    </div>
                     {!isViewOnly && (
                         <Button 
                             onClick={() => setShowAddModal(true)}
                             className="bg-blue-600 hover:bg-blue-700 text-white border-blue-600 transition-all duration-200 text-sm px-3 py-1"
                         >
                             <Plus className="w-3 h-3 mr-1" />
                             Add Document
                         </Button>
                     )}
                </div>
            </div>

            {documents.length > 0 ? (
                <div className="grid gap-2">
                    {documents.map((document) => (
                        <Card key={document.id} className="group hover:shadow-md transition-all duration-200 border border-gray-200 bg-white">
                            <div className="p-3">
                                <div className="flex justify-between items-center">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                            <div className="p-1 bg-gray-100 rounded">
                                                <span className="text-lg">
                                                    {companyDocumentsService.getDocumentIcon(document.documentType || '')}
                                                </span>
                                            </div>
                                            <div>
                                                <h4 className="text-sm font-semibold text-slate-900">
                                                    {document.documentName}
                                                </h4>
                                                <p className="text-xs text-slate-500">
                                                    {document.documentType}
                                                </p>
                                            </div>
                                        </div>
                                        
                                        {document.description && (
                                            <p className="text-xs text-slate-600 leading-relaxed">
                                                {document.description}
                                            </p>
                                        )}
                                        
                                    </div>
                                    
                                    <div className="flex gap-1 ml-3">
                                        <Button
                                            variant="secondary"
                                            size="sm"
                                            onClick={() => {
                                                console.log('Document data:', document);
                                                console.log('Opening document URL:', document.documentUrl);
                                                openDocument(document.documentUrl);
                                            }}
                                            className="bg-white hover:bg-gray-50 text-gray-600 border-gray-300 hover:scale-105 transition-all duration-200 text-xs px-2 py-1"
                                        >
                                            <ExternalLink className="w-3 h-3 mr-1" />
                                            View
                                        </Button>
                                        {!isViewOnly && (
                                            <>
                                                <Button
                                                    variant="secondary"
                                                    size="sm"
                                                    onClick={() => handleEdit(document)}
                                                    className="bg-white hover:bg-gray-50 text-gray-600 border-gray-300 hover:scale-105 transition-all duration-200 px-2 py-1"
                                                >
                                                    <Edit className="w-3 h-3" />
                                                </Button>
                                                <Button
                                                    variant="secondary"
                                                    size="sm"
                                                    onClick={() => handleDelete(document.id)}
                                                    className="bg-white hover:bg-red-50 text-red-600 border-red-300 hover:scale-105 transition-all duration-200 px-2 py-1"
                                                >
                                                    <Trash2 className="w-3 h-3" />
                                                </Button>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </Card>
                    ))}
                </div>
            ) : (
                <Card className="bg-gray-50 border border-gray-200">
                    <div className="p-6 text-center">
                        <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-3">
                            <Link className="w-6 h-6 text-gray-500" />
                        </div>
                        <h4 className="text-sm font-semibold text-slate-700 mb-1">No Documents Yet</h4>
                        <p className="text-slate-500 text-xs mb-4">Start building your company document library by adding important links and resources.</p>
                         {!isViewOnly && (
                             <Button 
                                 onClick={() => setShowAddModal(true)}
                                 className="bg-blue-600 hover:bg-blue-700 text-white border-blue-600 transition-all duration-200 text-sm px-3 py-1"
                             >
                                 <Plus className="w-3 h-3 mr-1" />
                                 Add Your First Document
                             </Button>
                         )}
                    </div>
                </Card>
            )}

            {/* Add Document Modal */}
            <Modal isOpen={showAddModal} onClose={() => setShowAddModal(false)}>
                <div className="p-6 max-h-[90vh] overflow-y-auto">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-2 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-lg">
                            <Link className="w-5 h-5 text-blue-600" />
                        </div>
                        <h3 className="text-xl font-semibold text-slate-900">Add Document</h3>
                    </div>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Document Name *</label>
                            <input
                                type="text"
                                value={formData.documentName}
                                onChange={(e) => setFormData(prev => ({ ...prev, documentName: e.target.value }))}
                                className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                                placeholder="e.g., Company Pitch Deck, Financial Reports"
                            />
                        </div>
                        <div>
                            <CloudDriveInput
                                value={formData.documentUrl}
                                onChange={(url) => handleUrlChange(url)}
                                onFileSelect={(file) => {
                                    setSelectedFile(file);
                                    const extension = file.name.includes('.') ? file.name.split('.').pop() || '' : '';
                                    const normalizedType = extension ? `${extension.toUpperCase()} File` : 'Uploaded File';
                                    setFormData(prev => ({
                                        ...prev,
                                        documentUrl: '',
                                        documentType: normalizedType
                                    }));
                                }}
                                placeholder="Paste your cloud drive link here..."
                                label="Document"
                                accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.jpg,.jpeg,.png,.txt"
                                maxSize={50}
                                documentType="company document"
                                showPrivacyMessage={false}
                            />
                            {formData.documentType && (
                                <div className="mt-2 flex items-center gap-2 text-sm text-blue-600">
                                    <span className="text-lg">{companyDocumentsService.getDocumentIcon(formData.documentType)}</span>
                                    <span className="font-medium">{formData.documentType}</span>
                                </div>
                            )}
                            {selectedFile && (
                                <div className="mt-2 p-3 bg-gray-50 rounded-md">
                                    <p className="text-sm text-gray-700">
                                        <strong>File:</strong> {selectedFile.name}
                                    </p>
                                    <p className="text-sm text-gray-500">
                                        Size: {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                                    </p>
                                </div>
                            )}
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                            <textarea
                                value={formData.description}
                                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                                className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                                rows={3}
                                placeholder="Brief description of this document (optional)"
                            />
                        </div>
                        <div className="flex justify-end gap-3 pt-4">
                            <Button 
                                variant="secondary" 
                                onClick={() => setShowAddModal(false)}
                                className="px-6"
                            >
                                Cancel
                            </Button>
                            <Button 
                                onClick={handleAdd}
                                disabled={!formData.documentName || (!formData.documentUrl && !selectedFile) || uploading}
                                className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-6"
                            >
                                <Plus className="w-4 h-4 mr-2" />
                                {uploading ? 'Adding...' : 'Add Document'}
                            </Button>
                        </div>
                    </div>
                </div>
            </Modal>

            {/* Edit Document Modal */}
            <Modal isOpen={showEditModal} onClose={() => setShowEditModal(false)}>
                <div className="p-6 max-h-[90vh] overflow-y-auto">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-2 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-lg">
                            <Edit className="w-5 h-5 text-blue-600" />
                        </div>
                        <h3 className="text-xl font-semibold text-slate-900">Edit Document</h3>
                    </div>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Document Name *</label>
                            <input
                                type="text"
                                value={formData.documentName}
                                onChange={(e) => setFormData(prev => ({ ...prev, documentName: e.target.value }))}
                                className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                                placeholder="Enter document name"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Document URL *</label>
                            <div className="relative">
                                <Globe className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <input
                                    type="url"
                                    value={formData.documentUrl}
                                    onChange={(e) => handleUrlChange(e.target.value)}
                                    className="w-full border border-gray-300 rounded-lg px-10 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                                    placeholder="https://docs.google.com/document/..."
                                />
                            </div>
                            {formData.documentType && (
                                <div className="mt-2 flex items-center gap-2 text-sm text-blue-600">
                                    <span className="text-lg">{companyDocumentsService.getDocumentIcon(formData.documentType)}</span>
                                    <span className="font-medium">{formData.documentType}</span>
                                </div>
                            )}
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                            <textarea
                                value={formData.description}
                                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                                className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                                rows={3}
                                placeholder="Enter document description"
                            />
                        </div>
                        <div className="flex justify-end gap-3 pt-4">
                            <Button 
                                variant="secondary" 
                                onClick={() => setShowEditModal(false)}
                                className="px-6"
                            >
                                Cancel
                            </Button>
                            <Button 
                                onClick={handleUpdate}
                                disabled={!formData.documentName || !formData.documentUrl}
                                className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-6"
                            >
                                <Edit className="w-4 h-4 mr-2" />
                                Update Document
                            </Button>
                        </div>
                    </div>
                </div>
            </Modal>

            {/* Delete Confirmation Modal */}
            <Modal isOpen={showDeleteModal} onClose={() => setShowDeleteModal(false)}>
                <div className="p-6">
                    <div className="text-center">
                        <div className="w-16 h-16 bg-gradient-to-br from-red-100 to-red-200 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Trash2 className="w-8 h-8 text-red-600" />
                        </div>
                        <h3 className="text-xl font-semibold text-slate-900 mb-2">Delete Document</h3>
                        <p className="text-slate-600 mb-6 leading-relaxed">
                            Are you sure you want to delete this document link? This action cannot be undone and the link will be removed from your company documents.
                        </p>
                        <div className="flex justify-center gap-3">
                            <Button 
                                variant="secondary" 
                                onClick={() => setShowDeleteModal(false)}
                                className="px-6"
                            >
                                Cancel
                            </Button>
                            <Button 
                                onClick={confirmDelete}
                                className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white px-6"
                            >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Delete Document
                            </Button>
                        </div>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default CompanyDocumentsSection;
