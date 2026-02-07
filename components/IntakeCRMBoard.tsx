import React, { useState, useEffect, useMemo } from 'react';
import Card from './ui/Card';
import Button from './ui/Button';
import Input from './ui/Input';
import Modal from './ui/Modal';
import { Plus, Search, MoreVertical, Settings, X, User, Calendar, ChevronRight, DollarSign, FileText, Edit2, Trash2 } from 'lucide-react';
import { messageService } from '../lib/messageService';
import { intakeCRMService, IntakeCRMColumn } from '../lib/intakeCRMService';

type CRMStatusId = string;

type CRMAttachment = {
  id: string;
  title: string;
  url: string;
};

interface IntakeCRMApplication {
  id: string;
  startupName: string;
  sector?: string;
  firstContact?: string;
  notes?: string;
  tags?: string[];
  attachments?: CRMAttachment[];
  createdAt: string;
  status: string;
  type: 'application';
}

interface IntakeCRMBoardProps {
  facilitatorId: string;
  opportunityId: string;
  applications: any[];
  onColumnsUpdate?: () => void;
}

const DEFAULT_STATUS_COLUMNS: IntakeCRMColumn[] = [
  { id: 'temp-1', label: 'To be contacted', color: 'bg-slate-100', position: 0, facilitator_id: '', created_at: '', updated_at: '' },
  { id: 'temp-2', label: 'Reached out', color: 'bg-blue-50', position: 1, facilitator_id: '', created_at: '', updated_at: '' },
  { id: 'temp-3', label: 'In progress', color: 'bg-yellow-50', position: 2, facilitator_id: '', created_at: '', updated_at: '' },
  { id: 'temp-4', label: 'Committed', color: 'bg-green-50', position: 3, facilitator_id: '', created_at: '', updated_at: '' },
  { id: 'temp-5', label: 'Not happening', color: 'bg-red-50', position: 4, facilitator_id: '', created_at: '', updated_at: '' },
];

const STATUS_COLOR_CHOICES = [
  'bg-slate-100',
  'bg-blue-50',
  'bg-yellow-50',
  'bg-green-50',
  'bg-red-50',
  'bg-indigo-50',
  'bg-purple-50',
  'bg-orange-50',
];



export function IntakeCRMBoard(
  { facilitatorId, opportunityId, applications, onColumnsUpdate }: IntakeCRMBoardProps
) {
  const [crmItems, setCrmItems] = useState<IntakeCRMApplication[]>([]);
  const [draggedItem, setDraggedItem] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusColumns, setStatusColumns] = useState<IntakeCRMColumn[]>([]);
  const [newStatusName, setNewStatusName] = useState('');
  const [newStatusColor, setNewStatusColor] = useState<string>(STATUS_COLOR_CHOICES[0]);
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [statusMap, setStatusMap] = useState<Map<string, string>>(new Map());

  // Get default status ID - use first column or default
  const getDefaultStatusId = () => {
    if (statusColumns && statusColumns.length > 0) {
      return statusColumns[0].id;
    }
    return DEFAULT_STATUS_COLUMNS[0]?.id || 'to_be_contacted';
  };

  // Load columns from Supabase
  const loadColumns = async () => {
    try {
      setIsLoading(true);
      const columnsData = await intakeCRMService.getColumns(facilitatorId);
      
      if (columnsData && columnsData.length > 0) {
        setStatusColumns(columnsData);
        console.log('✅ Loaded columns from Supabase:', columnsData);
        return;
      }

      // If no columns exist, try to initialize defaults
      console.log('No columns found, initializing defaults...');
      const initialized = await intakeCRMService.initializeDefaultColumns(facilitatorId);
      
      if (initialized && initialized.length > 0) {
        setStatusColumns(initialized);
        console.log('✅ Initialized default columns:', initialized);
      } else {
        // Database initialization failed or returned empty - use local defaults
        console.log('⚠️ Using local defaults (database initialization failed or columns may already exist)');
        setStatusColumns(DEFAULT_STATUS_COLUMNS);
      }
    } catch (error) {
      console.error('❌ Error loading CRM columns:', error);
      // Fall back to local defaults - don't show user error
      console.log('↙️ Falling back to local default columns');
      setStatusColumns(DEFAULT_STATUS_COLUMNS);
    } finally {
      setIsLoading(false);
    }
  };

  // Load status map from Supabase
  const loadStatusMap = async () => {
    try {
      const statusMapData = await intakeCRMService.getStatusMap(facilitatorId);
      setStatusMap(new Map(Object.entries(statusMapData)));
      console.log('Loaded status map from Supabase:', statusMapData);
    } catch (error) {
      console.error('Error loading status map:', error);
      setStatusMap(new Map());
    }
  };

  // Initialize CRM items from applications
  const initializeCRMItems = async () => {
    try {
      if (applications && applications.length > 0) {
        const defaultStatus = getDefaultStatusId();
        const items: IntakeCRMApplication[] = applications.map((app: any) => {
          const appId = app.id || app.application_id || `app_${Date.now()}_${Math.random()}`;
          const mappedStatus = statusMap.get(appId) || defaultStatus;
          
          return {
            id: appId,
            startupName: app.startupName || app.startup_name || app.name || 'Unknown Startup',
            sector: app.sector || app.sector_name || app.domain || 'Unknown',
            firstContact: app.first_contact || app.createdAt || new Date().toISOString(),
            notes: app.notes || undefined,
            tags: app.tags ? (Array.isArray(app.tags) ? app.tags : []) : undefined,
            createdAt: app.createdAt || new Date().toISOString(),
            status: mappedStatus,
            type: 'application' as const,
          };
        });
        setCrmItems(items);
        console.log('Initialized CRM items:', items);
      }
    } catch (error) {
      console.error('Error initializing CRM items:', error);
    }
  };

  // Load on mount and when facilitatorId changes
  useEffect(() => {
    if (facilitatorId) {
      loadColumns();
      loadStatusMap();
    }
  }, [facilitatorId]);

  // Initialize items when applications or statusMap changes
  useEffect(() => {
    initializeCRMItems();
  }, [applications, statusMap]);

  // Add column to Supabase
  const handleAddStatusColumn = async () => {
    const trimmed = newStatusName.trim();
    if (!trimmed) {
      messageService.warning('Column name required', 'Please enter a column name.', 2500);
      return;
    }

    try {
      const position = statusColumns.length;
      const color = newStatusColor || STATUS_COLOR_CHOICES[0];
      
      const newColumn = await intakeCRMService.addColumn(
        facilitatorId,
        trimmed,
        color,
        position
      );

      if (newColumn) {
        setStatusColumns([...statusColumns, newColumn]);
        setNewStatusName('');
        setNewStatusColor(STATUS_COLOR_CHOICES[(statusColumns.length + 1) % STATUS_COLOR_CHOICES.length]);
        messageService.success('Column added', `${trimmed} created for intake CRM.`, 2000);
        onColumnsUpdate?.();
      } else {
        throw new Error('Failed to add column');
      }
    } catch (error) {
      console.error('Error adding column:', error);
      messageService.error('Failed to add column', 'Please check your connection and permissions.');
    }
  };

  // Delete column from Supabase
  const handleRemoveStatusColumn = async (id: string) => {
    if (statusColumns.length <= 1) {
      messageService.warning('Cannot remove column', 'At least one column is required.', 2500);
      return;
    }

    try {
      // Only delete from database if it's a real UUID (not a local temp ID)
      if (!id.startsWith('temp-')) {
        const success = await intakeCRMService.deleteColumn(id);
        if (!success) {
          throw new Error('Failed to delete column from database');
        }
      }
      
      const filtered = statusColumns.filter(col => col.id !== id);
      setStatusColumns(filtered);
      
      // Move applications from deleted column to first column
      const fallbackStatus = filtered[0]?.id || getDefaultStatusId();
      const updated = crmItems.map(item =>
        item.status === id ? { ...item, status: fallbackStatus } : item
      );
      setCrmItems(updated);

      messageService.success('Column removed', 'Applications moved to the first column.', 2000);
      onColumnsUpdate?.();
    } catch (error) {
      console.error('Error removing column:', error);
      messageService.error('Failed to remove column', 'Please check your connection and permissions.');
    }
  };

  // Handle drag
  const handleDragStart = (e: React.DragEvent, appId: string) => {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', appId);
    setDraggedItem(appId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDragEnd = () => {
    setDraggedItem(null);
  };

  // Move application to column in Supabase
  const handleDrop = async (e: React.DragEvent, columnId: string) => {
    e.preventDefault();
    if (!draggedItem) return;

    try {
      // Only update database if target column is a real DB column (not a temp local column)
      if (!columnId.startsWith('temp-')) {
        const success = await intakeCRMService.moveApplicationToColumn(facilitatorId, draggedItem, columnId);
        if (!success) {
          console.warn('Failed to update database, but updating local state');
        }
      }
      
      // Always update local state regardless of database success
      const updated = crmItems.map(item =>
        item.id === draggedItem ? { ...item, status: columnId } : item
      );
      setCrmItems(updated);

      // Update status map
      const newMap = new Map(statusMap);
      newMap.set(draggedItem, columnId);
      setStatusMap(newMap);

      messageService.success('Moved', 'Application moved successfully.', 1500);
    } catch (error) {
      console.error('Error moving application:', error);
      messageService.error('Failed to move application', 'Please check your connection and permissions.');
    } finally {
      setDraggedItem(null);
    }
  };



  // Filter applications
  const filteredApplications = useMemo(() => {
    if (!searchQuery.trim()) return crmItems;
    const query = searchQuery.toLowerCase();
    return crmItems.filter(item =>
      item.startupName.toLowerCase().includes(query) ||
      item.sector?.toLowerCase().includes(query) ||
      item.notes?.toLowerCase().includes(query) ||
      item.tags?.some(tag => tag.toLowerCase().includes(query))
    );
  }, [crmItems, searchQuery]);

  // Group by status
  const itemsByStatus = useMemo(() => {
    const grouped: Record<string, IntakeCRMApplication[]> = {};

    statusColumns.forEach(column => {
      grouped[column.id] = [];
    });

    filteredApplications.forEach(item => {
      const targetStatus = grouped[item.status] ? item.status : statusColumns[0]?.id || item.status;
      if (!grouped[targetStatus]) {
        grouped[targetStatus] = [];
      }
      grouped[targetStatus].push(item);
    });

    return grouped;
  }, [filteredApplications, statusColumns]);

  return (
    <div className="space-y-4">
      {/* Loading state */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <span className="inline-block h-4 w-4 border-2 border-b-transparent border-slate-400 rounded-full animate-spin" />
          <span className="ml-2">Loading CRM Board...</span>
        </div>
      )}

      {!isLoading && (
        <>
          {/* Header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <span className="font-medium">INTAKE MANAGEMENT</span>
                <ChevronRight className="h-4 w-4" />
                <span className="font-semibold text-slate-900">CRM</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative flex-1 sm:flex-none">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Search applications..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="pl-10 w-full sm:w-64"
                />
              </div>
              <Button
                onClick={() => setIsStatusModalOpen(true)}
                className="flex items-center gap-2"
              >
                <Settings className="h-4 w-4" />
                <span>Customize</span>
              </Button>
            </div>
          </div>

          {/* Customize Columns Modal */}
          <div className="relative">
            <Modal
              isOpen={isStatusModalOpen}
              onClose={() => setIsStatusModalOpen(false)}
              title="Customize CRM Columns"
              position="center"
              showBackdrop={true}
              variant="fixed"
            >
            <div className="space-y-6 pb-4">
              {/* Existing Columns */}
              <div>
                <h4 className="font-semibold text-slate-900 mb-3">Current Columns</h4>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {statusColumns.map(column => (
                    <div key={column.id} className="flex items-center gap-3 p-2 bg-slate-50 rounded">
                      <div className={`h-4 w-4 rounded flex-shrink-0 ${column.color}`} />
                      <span className="text-sm font-medium text-slate-900 flex-1 truncate">{column.label}</span>
                      {statusColumns.length > 1 && (
                        <button
                          onClick={() => handleRemoveStatusColumn(column.id)}
                          className="text-slate-400 hover:text-red-600 flex-shrink-0"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Add New Column */}
              <div className="border-t pt-4">
                <h4 className="font-semibold text-slate-900 mb-3">Add New Column</h4>
                <div className="space-y-4">
                  <Input
                    placeholder="Column name (e.g., Follow-up)"
                    value={newStatusName}
                    onChange={e => setNewStatusName(e.target.value)}
                  />
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Color</label>
                    <div className="grid grid-cols-8 gap-2">
                      {STATUS_COLOR_CHOICES.map(color => (
                        <button
                          key={color}
                          onClick={() => setNewStatusColor(color)}
                          className={`h-8 w-8 rounded border-2 flex-shrink-0 ${color} ${
                            newStatusColor === color ? 'border-slate-900' : 'border-slate-300'
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                  <Button onClick={handleAddStatusColumn} className="w-full">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Column
                  </Button>
                </div>
              </div>
            </div>
            </Modal>
          </div>

          {/* Kanban Board */}
          <div className="flex gap-4 overflow-x-auto pb-4">
            {statusColumns.map(column => {
              const columnItems = itemsByStatus[column.id] || [];
              return (
                <div
                  key={column.id}
                  className="flex-shrink-0 w-80"
                  onDragOver={handleDragOver}
                  onDrop={e => handleDrop(e, column.id)}
                >
                  {/* Column Header */}
                  <div className={`${column.color} rounded-lg p-3 mb-3 border border-slate-200`}>
                    <div className="flex items-center gap-2">
                      <div>
                        <h3 className="font-semibold text-slate-900 text-sm">{column.label}</h3>
                        <p className="text-xs text-slate-600">{columnItems.length} applications</p>
                      </div>
                    </div>
                  </div>

                  {/* Cards */}
                  <div className="space-y-3 min-h-[300px] rounded-lg">
                    {columnItems.length === 0 ? (
                      <div className="text-center py-12 text-slate-400 text-sm">
                        No applications
                      </div>
                    ) : (
                      columnItems.map(app => (
                        <div
                          key={app.id}
                          draggable
                          onDragStart={e => handleDragStart(e, app.id)}
                          onDragEnd={handleDragEnd}
                          className={`
                            p-3 bg-white rounded-lg border border-slate-200 hover:shadow-md transition-shadow cursor-move
                            ${draggedItem === app.id ? 'opacity-50' : ''}
                          `}
                        >
                          <div className="flex items-start gap-2 mb-2">
                            <div className="rounded-full p-1.5 bg-slate-200 flex-shrink-0">
                              <User className="h-4 w-4 text-slate-600" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="font-semibold text-slate-900 text-sm truncate">
                                {app.startupName}
                              </h4>
                              <p className="text-xs text-slate-500 truncate">
                                {app.sector || 'No sector'}
                              </p>
                            </div>
                          </div>

                          <div className="space-y-2 text-xs">
                            {app.firstContact && (
                              <div className="flex items-center gap-1 text-slate-600">
                                <Calendar className="h-3 w-3" />
                                <span>{new Date(app.firstContact).toLocaleDateString()}</span>
                              </div>
                            )}
                            {app.notes && (
                              <p className="text-slate-600 line-clamp-2">
                                {app.notes}
                              </p>
                            )}
                            {app.tags && app.tags.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-1">
                                {app.tags.slice(0, 2).map((tag, idx) => (
                                  <span key={idx} className="px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded text-xs">
                                    {tag}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
