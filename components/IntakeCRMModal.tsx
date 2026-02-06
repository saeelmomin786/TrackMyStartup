import React, { useState, useEffect } from 'react';
import Modal from './ui/Modal';
import Button from './ui/Button';
import Input from './ui/Input';
import { X, Plus, GripVertical, Edit2, Trash2 } from 'lucide-react';
import { intakeCRMService, IntakeCRMColumn } from '../lib/intakeCRMService';
import { messageService } from '../lib/messageService';

interface IntakeCRMModalProps {
  isOpen: boolean;
  onClose: () => void;
  facilitatorId: string;
  opportunityId: string;
  applications: any[];
  onColumnsUpdate?: () => void;
}

export function IntakeCRMModal({
  isOpen,
  onClose,
  facilitatorId,
  opportunityId,
  applications,
  onColumnsUpdate
}: IntakeCRMModalProps) {
  const [columns, setColumns] = useState<IntakeCRMColumn[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showAddColumn, setShowAddColumn] = useState(false);
  const [newColumnLabel, setNewColumnLabel] = useState('');
  const [newColumnColor, setNewColumnColor] = useState('slate-100');
  const [draggedApplication, setDraggedApplication] = useState<any>(null);

  const colors = [
    { name: 'slate-100', label: 'Slate', hex: '#f1f5f9' },
    { name: 'blue-50', label: 'Blue', hex: '#eff6ff' },
    { name: 'yellow-50', label: 'Yellow', hex: '#fefce8' },
    { name: 'green-50', label: 'Green', hex: '#f0fdf4' },
    { name: 'red-50', label: 'Red', hex: '#fef2f2' },
    { name: 'purple-50', label: 'Purple', hex: '#faf5ff' },
    { name: 'pink-50', label: 'Pink', hex: '#fdf2f8' },
  ];

  useEffect(() => {
    if (isOpen) {
      loadColumns();
    }
  }, [isOpen, facilitatorId]);

  async function loadColumns() {
    setIsLoading(true);
    try {
      const columnsData = await intakeCRMService.getColumns(facilitatorId);
      setColumns(columnsData);
    } catch (error) {
      console.error('Error loading CRM columns:', error);
      messageService.error('Failed to load CRM columns');
    } finally {
      setIsLoading(false);
    }
  }

  async function handleAddColumn() {
    if (!newColumnLabel.trim()) {
      messageService.error('Column name is required');
      return;
    }

    try {
      const newColumn = await intakeCRMService.addColumn(
        facilitatorId,
        newColumnLabel,
        newColumnColor,
        columns.length
      );

      if (newColumn) {
        setColumns([...columns, newColumn]);
        setNewColumnLabel('');
        setNewColumnColor('slate-100');
        setShowAddColumn(false);
        messageService.success('Column added successfully');
        onColumnsUpdate?.();
      }
    } catch (error) {
      console.error('Error adding column:', error);
      messageService.error('Failed to add column');
    }
  }

  async function handleDeleteColumn(columnId: string) {
    if (!window.confirm('Are you sure you want to delete this column?')) {
      return;
    }

    try {
      const success = await intakeCRMService.deleteColumn(columnId);
      if (success) {
        setColumns(columns.filter(c => c.id !== columnId));
        messageService.success('Column deleted successfully');
        onColumnsUpdate?.();
      }
    } catch (error) {
      console.error('Error deleting column:', error);
      messageService.error('Failed to delete column');
    }
  }

  async function handleMoveApplication(applicationId: string, columnId: string) {
    try {
      const success = await intakeCRMService.moveApplicationToColumn(
        applicationId,
        columnId
      );
      if (success) {
        messageService.success('Application moved successfully');
        onColumnsUpdate?.();
      }
    } catch (error) {
      console.error('Error moving application:', error);
      messageService.error('Failed to move application');
    }
  }

  const getColorBgClass = (colorName: string) => {
    const colorMap: Record<string, string> = {
      'slate-100': 'bg-slate-100',
      'blue-50': 'bg-blue-50',
      'yellow-50': 'bg-yellow-50',
      'green-50': 'bg-green-50',
      'red-50': 'bg-red-50',
      'purple-50': 'bg-purple-50',
      'pink-50': 'bg-pink-50',
    };
    return colorMap[colorName] || 'bg-slate-100';
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Intake CRM - Kanban Board"
      size="4xl"
    >
      <div className="space-y-4 max-h-[80vh] overflow-y-auto">
        {/* Add Column Section */}
        {!showAddColumn ? (
          <div className="mb-4">
            <Button
              variant="outline"
              onClick={() => setShowAddColumn(true)}
              className="flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Add Column
            </Button>
          </div>
        ) : (
          <div className="border rounded-lg p-4 mb-4 bg-slate-50">
            <div className="grid grid-cols-2 gap-3 mb-3">
              <Input
                placeholder="Column name..."
                value={newColumnLabel}
                onChange={(e) => setNewColumnLabel(e.target.value)}
                autoFocus
              />
              <select
                value={newColumnColor}
                onChange={(e) => setNewColumnColor(e.target.value)}
                className="px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-brand-primary focus:border-brand-primary"
              >
                {colors.map(color => (
                  <option key={color.name} value={color.name}>
                    {color.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={handleAddColumn}
                className="bg-brand-primary hover:bg-brand-primary-dark"
              >
                Create
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setShowAddColumn(false);
                  setNewColumnLabel('');
                  setNewColumnColor('slate-100');
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}

        {/* Kanban Board */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {isLoading ? (
            <div className="col-span-full text-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto mb-2"></div>
              <p className="text-slate-500">Loading board...</p>
            </div>
          ) : columns.length === 0 ? (
            <div className="col-span-full text-center py-8">
              <p className="text-slate-500">No columns yet. Create one to get started!</p>
            </div>
          ) : (
            columns.map((column) => {
              const columnApplications = applications.filter(
                app => app.opportunityId === opportunityId
              );

              return (
                <div
                  key={column.id}
                  className={`rounded-lg border border-slate-200 overflow-hidden flex flex-col h-96`}
                >
                  {/* Column Header */}
                  <div className={`${getColorBgClass(column.color)} p-3 border-b border-slate-200`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <GripVertical className="h-4 w-4 text-slate-400" />
                        <h3 className="font-semibold text-slate-700">{column.label}</h3>
                        <span className="text-xs bg-slate-200 text-slate-700 px-2 py-0.5 rounded-full">
                          {columnApplications.length}
                        </span>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDeleteColumn(column.id)}
                        className="h-6 w-6 p-0 hover:bg-red-100 hover:text-red-600"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Applications */}
                  <div className="flex-1 overflow-y-auto p-2 space-y-2 bg-white">
                    {columnApplications.length === 0 ? (
                      <div className="text-center py-8">
                        <p className="text-xs text-slate-400">No applications</p>
                      </div>
                    ) : (
                      columnApplications.map((app) => (
                        <div
                          key={app.id}
                          draggable
                          onDragStart={() => setDraggedApplication(app)}
                          onDragOver={(e) => e.preventDefault()}
                          onDrop={() => {
                            if (draggedApplication && draggedApplication.id !== app.id) {
                              handleMoveApplication(draggedApplication.id, column.id);
                              setDraggedApplication(null);
                            }
                          }}
                          className="bg-white border border-slate-200 rounded p-2 cursor-move hover:shadow-md transition-shadow"
                        >
                          <p className="text-sm font-medium text-slate-900">
                            {app.startupName}
                          </p>
                          <p className="text-xs text-slate-500 mt-1">
                            {app.sector}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 pt-4 border-t mt-4">
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </Modal>
  );
}
