import React, { useState, useEffect } from 'react';
import { generalDataService, GeneralDataItem, GeneralDataCategory, CreateGeneralDataItem } from '../../lib/generalDataService';
import Card from '../ui/Card';
import Button from '../ui/Button';
import Input from '../ui/Input';
import { Plus, Edit, Trash2, Save, X, ArrowUp, ArrowDown, Search, Filter } from 'lucide-react';

const GeneralDataManager: React.FC = () => {
  const [selectedCategory, setSelectedCategory] = useState<GeneralDataCategory>('country');
  const [items, setItems] = useState<GeneralDataItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingItem, setEditingItem] = useState<GeneralDataItem | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showInactive, setShowInactive] = useState(false);
  
  const [formData, setFormData] = useState<CreateGeneralDataItem>({
    category: 'country',
    code: '',
    name: '',
    description: '',
    display_order: 0,
    is_active: true
  });

  const categories: { value: GeneralDataCategory; label: string }[] = [
    { value: 'country', label: 'Countries' },
    { value: 'sector', label: 'Sectors' },
    { value: 'mentor_type', label: 'Mentor Types' },
    { value: 'round_type', label: 'Round Types' },
    { value: 'stage', label: 'Stages' },
    { value: 'domain', label: 'Domains' }
  ];

  useEffect(() => {
    loadItems();
  }, [selectedCategory, showInactive]);

  const loadItems = async () => {
    setLoading(true);
    try {
      const data = await generalDataService.getItemsByCategory(selectedCategory, showInactive);
      setItems(data);
    } catch (error) {
      console.error('Error loading items:', error);
      alert('Failed to load items');
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    setFormData({
      category: selectedCategory,
      code: '',
      name: '',
      description: '',
      display_order: items.length > 0 ? Math.max(...items.map(i => i.display_order)) + 1 : 0,
      is_active: true
    });
    setEditingItem(null);
    setShowAddForm(true);
  };

  const handleEdit = (item: GeneralDataItem) => {
    setFormData({
      category: item.category,
      code: item.code || '',
      name: item.name,
      description: item.description || '',
      display_order: item.display_order,
      is_active: item.is_active
    });
    setEditingItem(item);
    setShowAddForm(true);
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      alert('Please enter a name');
      return;
    }

    try {
      if (editingItem) {
        // Update existing item
        const result = await generalDataService.updateItem(editingItem.id, formData);
        if (result) {
          alert('Item updated successfully!');
          setShowAddForm(false);
          setEditingItem(null);
          loadItems();
        } else {
          alert('Failed to update item');
        }
      } else {
        // Create new item
        const result = await generalDataService.createItem(formData);
        if (result) {
          alert('Item created successfully!');
          setShowAddForm(false);
          loadItems();
        } else {
          alert('Failed to create item');
        }
      }
    } catch (error) {
      console.error('Error saving item:', error);
      alert('Failed to save item');
    }
  };

  const handleDelete = async (item: GeneralDataItem) => {
    if (!confirm(`Are you sure you want to ${item.is_active ? 'deactivate' : 'permanently delete'} "${item.name}"?`)) {
      return;
    }

    try {
      if (item.is_active) {
        // Soft delete
        const result = await generalDataService.deleteItem(item.id);
        if (result) {
          alert('Item deactivated successfully!');
          loadItems();
        } else {
          alert('Failed to deactivate item');
        }
      } else {
        // Hard delete
        const result = await generalDataService.hardDeleteItem(item.id);
        if (result) {
          alert('Item deleted permanently!');
          loadItems();
        } else {
          alert('Failed to delete item');
        }
      }
    } catch (error) {
      console.error('Error deleting item:', error);
      alert('Failed to delete item');
    }
  };

  const handleMoveUp = async (item: GeneralDataItem, index: number) => {
    if (index === 0) return;

    const prevItem = items[index - 1];
    const newOrder = item.display_order;
    const prevOrder = prevItem.display_order;

    try {
      await generalDataService.reorderItems([
        { id: item.id, display_order: prevOrder },
        { id: prevItem.id, display_order: newOrder }
      ]);
      loadItems();
    } catch (error) {
      console.error('Error reordering items:', error);
      alert('Failed to reorder items');
    }
  };

  const handleMoveDown = async (item: GeneralDataItem, index: number) => {
    if (index === items.length - 1) return;

    const nextItem = items[index + 1];
    const newOrder = item.display_order;
    const nextOrder = nextItem.display_order;

    try {
      await generalDataService.reorderItems([
        { id: item.id, display_order: nextOrder },
        { id: nextItem.id, display_order: newOrder }
      ]);
      loadItems();
    } catch (error) {
      console.error('Error reordering items:', error);
      alert('Failed to reorder items');
    }
  };

  const filteredItems = items.filter(item =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (item.code && item.code.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (item.description && item.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-semibold text-slate-800">General Data Management</h3>
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={showInactive}
              onChange={(e) => setShowInactive(e.target.checked)}
              className="rounded"
            />
            <span className="text-sm text-slate-600">Show Inactive</span>
          </label>
          <Button onClick={handleAdd} size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Add New
          </Button>
        </div>
      </div>

      {/* Category Tabs */}
      <div className="border-b border-slate-200">
        <nav className="-mb-px flex space-x-8 overflow-x-auto">
          {categories.map((cat) => (
            <button
              key={cat.value}
              onClick={() => {
                setSelectedCategory(cat.value);
                setSearchTerm('');
              }}
              className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                selectedCategory === cat.value
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
        <input
          type="text"
          placeholder="Search items..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Items List */}
      <Card>
        {loading ? (
          <div className="text-center py-8 text-slate-500">Loading...</div>
        ) : filteredItems.length === 0 ? (
          <div className="text-center py-8 text-slate-500">
            {searchTerm ? 'No items found matching your search' : 'No items in this category'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider w-12">
                    Order
                  </th>
                  {selectedCategory === 'country' && (
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                      Code
                    </th>
                  )}
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Description
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
                {filteredItems.map((item, index) => (
                  <tr key={item.id} className={!item.is_active ? 'bg-slate-50 opacity-60' : ''}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleMoveUp(item, index)}
                          disabled={index === 0}
                          className={`p-1 rounded ${index === 0 ? 'opacity-30 cursor-not-allowed' : 'hover:bg-slate-100'}`}
                          title="Move up"
                        >
                          <ArrowUp className="h-4 w-4" />
                        </button>
                        <span className="text-sm text-slate-600">{item.display_order}</span>
                        <button
                          onClick={() => handleMoveDown(item, index)}
                          disabled={index === filteredItems.length - 1}
                          className={`p-1 rounded ${index === filteredItems.length - 1 ? 'opacity-30 cursor-not-allowed' : 'hover:bg-slate-100'}`}
                          title="Move down"
                        >
                          <ArrowDown className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                    {selectedCategory === 'country' && (
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">
                        {item.code || '-'}
                      </td>
                    )}
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">
                      {item.name}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-500">
                      {item.description || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        item.is_active
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {item.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleEdit(item)}
                          className="text-blue-600 hover:text-blue-900"
                          title="Edit"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(item)}
                          className={`${item.is_active ? 'text-red-600 hover:text-red-900' : 'text-slate-400 hover:text-slate-600'}`}
                          title={item.is_active ? 'Deactivate' : 'Delete Permanently'}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Add/Edit Form Modal */}
      {showAddForm && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">
                {editingItem ? 'Edit Item' : 'Add New Item'}
              </h3>
              <button
                onClick={() => {
                  setShowAddForm(false);
                  setEditingItem(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Category</label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value as GeneralDataCategory })}
                  disabled={!!editingItem}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {categories.map((cat) => (
                    <option key={cat.value} value={cat.value}>
                      {cat.label}
                    </option>
                  ))}
                </select>
              </div>

              {selectedCategory === 'country' && (
                <Input
                  label="Code (e.g., IN, US, UK)"
                  value={formData.code || ''}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  placeholder="IN"
                />
              )}

              <Input
                label="Name *"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                placeholder="Enter name"
              />

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                <textarea
                  value={formData.description || ''}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Optional description"
                />
              </div>

              <Input
                label="Display Order"
                type="number"
                value={formData.display_order?.toString() || '0'}
                onChange={(e) => setFormData({ ...formData, display_order: parseInt(e.target.value) || 0 })}
              />

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={formData.is_active ?? true}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="rounded"
                />
                <label htmlFor="is_active" className="ml-2 text-sm text-slate-700">
                  Active
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button
                  variant="secondary"
                  onClick={() => {
                    setShowAddForm(false);
                    setEditingItem(null);
                  }}
                >
                  Cancel
                </Button>
                <Button onClick={handleSave}>
                  <Save className="h-4 w-4 mr-2" />
                  {editingItem ? 'Update' : 'Create'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GeneralDataManager;




