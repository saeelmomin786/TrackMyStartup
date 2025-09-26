# Add Employee Edit Functionality

## Overview
This guide shows how to add edit functionality for employee ESOP allocations in the EmployeesTab component.

## Changes Needed

### 1. Add Edit State Management
```typescript
const [editingEmployee, setEditingEmployee] = useState<string | null>(null);
const [editFormData, setEditFormData] = useState({
  name: '',
  salary: 0,
  esopAllocation: 0,
  allocationType: 'one-time' as 'one-time' | 'annually' | 'quarterly' | 'monthly',
  esopPerAllocation: 0
});
```

### 2. Add Edit Handler
```typescript
const handleEditEmployee = (employee: Employee) => {
  setEditingEmployee(employee.id);
  setEditFormData({
    name: employee.name,
    salary: employee.salary,
    esopAllocation: employee.esopAllocation,
    allocationType: employee.allocationType,
    esopPerAllocation: employee.esopPerAllocation
  });
};

const handleSaveEdit = async () => {
  if (!editingEmployee) return;
  
  try {
    await employeesService.updateEmployee(editingEmployee, {
      name: editFormData.name,
      salary: editFormData.salary,
      esopAllocation: editFormData.esopAllocation,
      allocationType: editFormData.allocationType,
      esopPerAllocation: editFormData.esopPerAllocation
    });
    
    setEditingEmployee(null);
    await loadData(); // Reload data
  } catch (err) {
    console.error('Error updating employee:', err);
    setError('Failed to update employee');
  }
};
```

### 3. Add Edit UI Components
```typescript
// In the employee table row
{editingEmployee === emp.id ? (
  <tr key={emp.id}>
    <td>
      <Input 
        value={editFormData.name}
        onChange={(e) => setEditFormData({...editFormData, name: e.target.value})}
      />
    </td>
    <td>
      <Input 
        type="number"
        value={editFormData.salary}
        onChange={(e) => setEditFormData({...editFormData, salary: parseFloat(e.target.value)})}
      />
    </td>
    <td>
      <Input 
        type="number"
        value={editFormData.esopAllocation}
        onChange={(e) => setEditFormData({...editFormData, esopAllocation: parseFloat(e.target.value)})}
      />
    </td>
    <td>
      <Button size="sm" onClick={handleSaveEdit}>Save</Button>
      <Button size="sm" variant="outline" onClick={() => setEditingEmployee(null)}>Cancel</Button>
    </td>
  </tr>
) : (
  // Regular row display
)}
```

## Implementation Steps

1. Add the state management code
2. Add the edit handler functions
3. Modify the table to show edit form when editing
4. Add Edit button to each employee row
5. Test the functionality

## Benefits

- ✅ In-place editing of employee ESOP allocations
- ✅ Real-time validation
- ✅ Better user experience
- ✅ No need to delete and re-add employees
