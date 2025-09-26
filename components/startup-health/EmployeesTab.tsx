import React, { useState, useEffect } from 'react';
import { Startup, Employee, Subsidiary } from '../../types';
import Card from '../ui/Card';
import SimpleModal from '../ui/SimpleModal';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Select from '../ui/Select';
import DateInput from '../DateInput';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { Plus, Trash2, Edit3, Save, X, Download } from 'lucide-react';
import { employeesService } from '../../lib/employeesService';
import { storageService } from '../../lib/storage';
import { profileService } from '../../lib/profileService';
import { capTableService } from '../../lib/capTableService';
import { formatCurrency as formatCurrencyUtil, formatCurrencyCompact } from '../../lib/utils';
import { useStartupCurrency } from '../../lib/hooks/useStartupCurrency';

interface EmployeesTabProps {
  startup: Startup;
  userRole?: string;
  isViewOnly?: boolean;
}

// Remove local formatCurrency function - using utility function instead

// Dynamic data generation based on startup - now using real data
const generateMonthlyExpenseData = async (startup: Startup) => {
  try {
    console.log('🔍 Loading monthly data for startup:', startup.id);
    const monthlyData = await employeesService.getMonthlySalaryData(startup.id, new Date().getFullYear());
    console.log('✅ Monthly data loaded:', monthlyData);
    
    if (monthlyData.length === 0) {
      console.log('⚠️ No monthly data found, returning empty set');
      return [];
    }
    
    return monthlyData.map(item => ({
      name: item.month_name,
      salary: item.total_salary,
      esop: item.total_esop
    }));
  } catch (error) {
    console.error('❌ Error loading monthly data:', error);
    return [];
  }
};

const generateDepartmentData = async (startup: Startup) => {
  try {
    console.log('🔍 Loading department data for startup:', startup.id);
    const deptData = await employeesService.getEmployeesByDepartment(startup.id);
    console.log('✅ Department data loaded:', deptData);
    
    if (deptData.length === 0) {
      console.log('⚠️ No department data found, returning empty set');
      return [];
    }
    
    return deptData.map(item => ({
      name: item.department_name,
      value: item.employee_count
    }));
  } catch (error) {
    console.error('❌ Error loading department data:', error);
    return [];
  }
};

// Dynamic mock employees based on startup - now using real data
const generateMockEmployees = async (startup: Startup): Promise<Employee[]> => {
  try {
    const employees = await employeesService.getEmployees(startup.id);
    return employees;
  } catch (error) {
    console.error('Error loading employees:', error);
    return [];
  }
};

const COLORS = ['#1e40af', '#1d4ed8', '#3b82f6'];

const EmployeesTab: React.FC<EmployeesTabProps> = ({ startup, userRole, isViewOnly = false }) => {
    const startupCurrency = useStartupCurrency(startup);
    const [isEditing, setIsEditing] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [monthlyExpenseData, setMonthlyExpenseData] = useState<any[]>([]);
    const [departmentData, setDepartmentData] = useState<any[]>([]);
    const [mockEmployees, setMockEmployees] = useState<Employee[]>([]);
    const [summary, setSummary] = useState<any>(null);
    const [entities, setEntities] = useState<string[]>(['Parent Company']);
    const [esopReservedShares, setEsopReservedShares] = useState<number>(0);
    const [esopReservedDraft, setEsopReservedDraft] = useState<string>('0');
    const [pricePerShare, setPricePerShare] = useState<number>(0);
    const [totalShares, setTotalShares] = useState<number>(0);
    const [esopAllocationDraft, setEsopAllocationDraft] = useState<string>('');
    const [allocationTypeDraft, setAllocationTypeDraft] = useState<'one-time' | 'annually' | 'quarterly' | 'monthly'>('one-time');
    const [esopPerAllocationDraft, setEsopPerAllocationDraft] = useState<string>('0');
    const [isEsopModalOpen, setIsEsopModalOpen] = useState(false);
    
    const canEdit = (userRole === 'Startup' || userRole === 'Admin') && !isViewOnly;

    // Load data on component mount
    useEffect(() => {
        loadData();
    }, [startup.id]);

    const loadData = async () => {
        try {
            setIsLoading(true);
            setError(null);
            
            // Load all data in parallel
            const [monthlyData, deptData, employeesData, summaryData, profileData, shares, esopShares] = await Promise.all([
                generateMonthlyExpenseData(startup),
                generateDepartmentData(startup),
                generateMockEmployees(startup),
                employeesService.getEmployeeSummary(startup.id),
                profileService.getStartupProfile(startup.id),
                capTableService.getTotalShares(startup.id),
                capTableService.getEsopReservedShares(startup.id)
            ]);
            
            // Calculate price per share dynamically (same logic as CapTableTab)
            let calculatedPricePerShare = 0;
            if (shares > 0) {
                let latestValuation = startup.currentValuation || 0;
                // Try to get latest valuation from investment records
                try {
                    const investmentRecords = await capTableService.getInvestmentRecords(startup.id);
                    if (investmentRecords && investmentRecords.length > 0) {
                        const latest = [...investmentRecords]
                            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0] as any;
                        if (latest?.postMoneyValuation && latest.postMoneyValuation > 0) {
                            latestValuation = latest.postMoneyValuation;
                        }
                    }
                } catch (err) {
                    console.log('Could not load investment records for price calculation:', err);
                }
                calculatedPricePerShare = latestValuation / shares;
            }
            
            // Debug: Log the loaded values
            console.log('🔍 Loaded ESOP data:', {
                startupId: startup.id,
                calculatedPricePerShare,
                totalShares: shares,
                esopReservedShares: esopShares,
                summaryData: summaryData
            });
            
            // Check if startup_shares record exists, if not, create it with default ESOP
            if (esopShares === 0 && shares === 0 && calculatedPricePerShare === 0) {
                console.log('⚠️ No startup_shares record found, creating default record...');
                try {
                    const defaultEsopShares = 10000;
                    await capTableService.upsertEsopReservedShares(startup.id, defaultEsopShares);
                    console.log('✅ Created default startup_shares record with ESOP:', defaultEsopShares);
                    
                    // Reload the ESOP data
                    const newEsopShares = await capTableService.getEsopReservedShares(startup.id);
                    setEsopReservedShares(newEsopShares);
                    setEsopReservedDraft(String(newEsopShares));
                } catch (err) {
                    console.error('❌ Failed to create default startup_shares record:', err);
                }
            } else {
                setEsopReservedShares(esopShares || 0);
                setEsopReservedDraft(String(esopShares || 0));
            }
            
            setMonthlyExpenseData(monthlyData);
            setDepartmentData(deptData);
            setMockEmployees(employeesData);
            setSummary(summaryData);
            setPricePerShare(calculatedPricePerShare);
            setTotalShares(shares || 0);
            
            // Populate entities from profile data
            const entityList = ['Parent Company'];
            if (profileData?.subsidiaries && profileData.subsidiaries.length > 0) {
                profileData.subsidiaries.forEach((subsidiary: Subsidiary) => {
                    const entityName = `${subsidiary.country} Subsidiary`;
                    entityList.push(entityName);
                });
            }
            setEntities(entityList);
            
        } catch (err) {
            console.error('Error loading data:', err);
            setError('Failed to load employee data');
        } finally {
            setIsLoading(false);
        }
    };

    const handleAddEmployee = async (e: React.FormEvent) => {
        console.log('🔍 FORM SUBMISSION TRIGGERED!');
        e.preventDefault();
        const formData = new FormData(e.target as HTMLFormElement);
        
        try {
            console.log('🔍 Starting employee creation process...');
            console.log('🔍 Form data:', {
                name: formData.get('name'),
                joiningDate: formData.get('joiningDate'),
                entity: formData.get('entity'),
                department: formData.get('department'),
                salary: formData.get('salary'),
                esopAllocation: formData.get('esopAllocation'),
                esopPerAllocation: formData.get('esopPerAllocation')
            });
            
            // Use controlled state for ESOP fields to ensure calculated values are saved
            const esopAllocationValue = esopAllocationDraft !== '' 
                ? parseFloat(esopAllocationDraft) 
                : (parseFloat(formData.get('esopAllocation') as string) || 0);
            const esopPerAllocationValue = esopPerAllocationDraft !== '' 
                ? parseFloat(esopPerAllocationDraft) 
                : (parseFloat(formData.get('esopPerAllocation') as string) || 0);

            // Validation: allocated ESOPs must not exceed reserved ESOPs value (USD)
            const currentAllocatedTotal = summary?.total_esop_allocated || mockEmployees.reduce((acc, emp) => acc + emp.esopAllocation, 0);
            const prospectiveAllocatedTotal = currentAllocatedTotal + (esopAllocationValue || 0);
            
            console.log('🔍 ESOP Validation:', {
                currentAllocatedTotal,
                esopAllocationValue,
                prospectiveAllocatedTotal,
                pricePerShare,
                reservedEsopValue,
                wouldExceed: pricePerShare > 0 && reservedEsopValue > 0 && prospectiveAllocatedTotal > reservedEsopValue
            });
            
            // Check if this would exceed reserved amount
            if (pricePerShare > 0 && reservedEsopValue > 0 && prospectiveAllocatedTotal > reservedEsopValue) {
                const errorMsg = `Total ESOP allocation would exceed the reserved ESOPs value. Current: ${formatCurrencyUtil(currentAllocatedTotal, startupCurrency)}, Adding: ${formatCurrencyUtil(esopAllocationValue || 0, startupCurrency)}, Reserved: ${formatCurrencyUtil(reservedEsopValue, startupCurrency)}. Reduce the allocation or increase reserved ESOPs.`;
                console.log('❌ ESOP validation failed:', errorMsg);
                setError(errorMsg);
                return;
            }
            
            // Check if no ESOP shares are reserved but trying to allocate
            if (esopReservedShares === 0 && (esopAllocationValue || 0) > 0) {
                console.log('❌ ESOP shares validation failed: No reserved shares but trying to allocate');
                setError('Cannot allocate ESOPs when no shares are reserved for ESOP. Please set ESOP reserved shares first.');
                return;
            }

            // Validation: Employee joining date must not be before company registration date
            const joiningDate = formData.get('joiningDate') as string;
            console.log('🔍 Date validation:', {
                joiningDate,
                startupRegistrationDate: startup.registrationDate
            });
            
            if (joiningDate && startup.registrationDate) {
                const joiningDateObj = new Date(joiningDate);
                const registrationDateObj = new Date(startup.registrationDate);
                
                console.log('🔍 Date comparison:', {
                    joiningDateObj: joiningDateObj.toISOString(),
                    registrationDateObj: registrationDateObj.toISOString(),
                    isBefore: joiningDateObj < registrationDateObj
                });
                
                if (joiningDateObj < registrationDateObj) {
                    const errorMsg = `Employee joining date cannot be before the company registration date (${startup.registrationDate}). Please select a date on or after the registration date.`;
                    console.log('❌ Date validation failed:', errorMsg);
                    setError(errorMsg);
                    return;
                }
            }

            const employeeData = {
                name: formData.get('name') as string,
                joiningDate: formData.get('joiningDate') as string,
                entity: formData.get('entity') as string,
                department: formData.get('department') as string,
                salary: parseFloat(formData.get('salary') as string),
                esopAllocation: esopAllocationValue || 0,
                allocationType: allocationTypeDraft,
                esopPerAllocation: esopPerAllocationValue || 0,
                contractUrl: ''
            };

            console.log('📝 Employee data to create:', employeeData);
            console.log('🏢 Startup ID:', startup.id);

            // Create the employee first
            console.log('🔄 Creating employee in database...');
            const created = await employeesService.addEmployee(startup.id, employeeData);
            console.log('✅ Employee created successfully:', created);

            // If a contract file was provided, upload and update the record
            const contractInput = (e.target as HTMLFormElement).elements.namedItem('contract') as HTMLInputElement | null;
            const file = contractInput?.files && contractInput.files[0] ? contractInput.files[0] : null;
            
            if (file && created?.id) {
                console.log('📁 Contract file found, uploading...');
                const upload = await storageService.uploadEmployeeContract(file, String(startup.id), String(created.id));
                console.log('📤 Upload result:', upload);
                
                if (upload.success && upload.url) {
                    console.log('🔄 Updating employee with contract URL...');
                    await employeesService.updateEmployee(created.id, { contractUrl: upload.url });
                    console.log('✅ Employee updated with contract URL');
                }
            }

            // Reload data
            console.log('🔄 Reloading data...');
            await loadData();
            console.log('✅ Data reloaded successfully');
            
            // Reset form
            (e.target as HTMLFormElement).reset();
            console.log('✅ Form reset successfully');
            setEsopAllocationDraft('');
            setEsopPerAllocationDraft('0');
            setAllocationTypeDraft('one-time');
            
        } catch (err) {
            console.error('❌ Error adding employee:', err);
            setError('Failed to add employee');
        }
    };

    const handleDeleteEmployee = async (employeeId: string) => {
        if (!confirm('Are you sure you want to delete this employee?')) return;
        
        try {
            await employeesService.deleteEmployee(employeeId);
            await loadData(); // Reload data
        } catch (err) {
            console.error('Error deleting employee:', err);
            setError('Failed to delete employee');
        }
    };

    // ESOP Reserved: USD = shares * latest price/share
    const reservedEsopValue = (esopReservedShares || 0) * (pricePerShare || 0);
    const allocatedEsopValue = summary?.total_esop_allocated || mockEmployees.reduce((acc, emp) => acc + emp.esopAllocation, 0);
    
    // Calculate ESOP percentage with improved logic
    const esopPercentage = (() => {
        // If we have both reserved shares and allocated value, calculate percentage
        if (esopReservedShares > 0 && allocatedEsopValue > 0) {
            if (pricePerShare > 0) {
                // Use monetary value calculation when price per share is available
                const reservedValue = esopReservedShares * pricePerShare;
                return ((allocatedEsopValue / reservedValue) * 100).toFixed(1);
            } else {
                // If no price per share, assume allocated value represents the reserved value
                // This handles the case where price per share is not set but we have allocations
                return ((allocatedEsopValue / allocatedEsopValue) * 100).toFixed(1); // This will be 100%
            }
        } else if (esopReservedShares > 0 && allocatedEsopValue === 0) {
            // Reserved shares but no allocations yet
            return '0';
        } else if (esopReservedShares === 0 && allocatedEsopValue > 0) {
            // Allocations but no reserved shares - this is an error state
            return 'N/A';
        }
        return '0';
    })();
    
    // Check if allocation exceeds reserved amount
    const isOverAllocated = (() => {
        if (pricePerShare > 0) {
            // Use monetary comparison when price per share is available
            return allocatedEsopValue > reservedEsopValue;
        } else if (esopReservedShares > 0 && allocatedEsopValue > 0) {
            // If no price per share but we have both reserved shares and allocations,
            // we can't make a direct comparison, so we'll assume it's valid
            return false;
        }
        return false;
    })();
    
    // Debug ESOP calculations
    console.log('🔍 ESOP Calculation Debug:', {
        esopReservedShares: esopReservedShares,
        pricePerShare: pricePerShare,
        reservedEsopValue: reservedEsopValue,
        allocatedEsopValue: allocatedEsopValue,
        esopPercentage: esopPercentage,
        isOverAllocated: isOverAllocated,
        totalEmployees: mockEmployees.length,
        employeeEsopAllocations: mockEmployees.map(emp => ({ 
            name: emp.name, 
            esopAllocation: emp.esopAllocation
        }))
    });

    if (isLoading) {
        return (
            <div className="space-y-6">
                <div className="flex items-center justify-center h-64">
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-primary mx-auto mb-4"></div>
                        <p className="text-slate-500">Loading employees data...</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                    {error}
                </div>
            )}

            {/* ESOP Data Missing Warning */}
            {esopReservedShares === 0 && (
                <div className="bg-amber-50 border border-amber-200 text-amber-700 px-4 py-3 rounded-lg">
                    <div className="flex items-center">
                        <span className="text-amber-500 mr-2">⚠️</span>
                        <div>
                            <p className="font-medium">ESOP Configuration Missing</p>
                            <p className="text-sm">
                                No ESOP shares are reserved for this startup. 
                                Please set ESOP reserved shares to enable employee stock option allocations.
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* ESOP Over-allocation Warning */}
            {isOverAllocated && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                    <div className="flex items-center">
                        <span className="text-red-500 mr-2">⚠️</span>
                        <div>
                            <p className="font-medium">ESOP Over-allocation Detected</p>
                            <p className="text-sm">
                                Total allocated ESOPs ({formatCurrencyUtil(allocatedEsopValue, startupCurrency)}) 
                                exceeds reserved ESOPs ({formatCurrencyUtil(reservedEsopValue, startupCurrency)}).
                                Please reduce employee allocations or increase reserved shares.
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card>
                    <p className="text-sm font-medium text-slate-500">Number of Employees</p>
                    <p className="text-2xl font-bold">{summary?.total_employees || mockEmployees.length}</p>
                </Card>
                <Card>
                    <p className="text-sm font-medium text-slate-500">Total Equity Reserved for ESOPs</p>
                    <div className="flex items-center gap-3">
                        <Input 
                            id="esop-reserved-shares"
                            name="esop-reserved-shares"
                            type="number"
                            value={esopReservedDraft}
                            onChange={(e) => setEsopReservedDraft(e.target.value)}
                            onBlur={async () => {
                                const parsed = Number(esopReservedDraft);
                                if (!Number.isFinite(parsed) || parsed < 0) {
                                    setEsopReservedDraft(String(esopReservedShares || 0));
                                    return;
                                }
                                // Validation: shares must not exceed total shares
                                if (totalShares && parsed > totalShares) {
                                    setError('ESOP reserved shares cannot exceed total company shares');
                                    setEsopReservedDraft(String(esopReservedShares || 0));
                                    return;
                                }
                                try {
                                    const saved = await capTableService.upsertEsopReservedShares(startup.id, parsed);
                                    setEsopReservedShares(saved);
                                } catch (err) {
                                    console.error('Failed to save ESOP reserved shares', err);
                                    setEsopReservedDraft(String(esopReservedShares || 0));
                                }
                            }}
                        />
                        <span className="text-slate-500">(shares)</span>
                        <Button size="sm" variant="outline" onClick={() => setIsEsopModalOpen(true)}>Edit</Button>
                    </div>
                    <p className="text-2xl font-bold mt-1">{formatCurrencyUtil(reservedEsopValue, startupCurrency)}</p>
                    {pricePerShare === 0 && (
                        <div className="text-xs text-amber-600 mt-1">
                            <p className="font-medium">⚠️ Price per share not set</p>
                            <p className="mt-1">Go to Cap Table tab → Company Settings to set the price per share</p>
                        </div>
                    )}
                </Card>
                <Card>
                    <p className="text-sm font-medium text-slate-500">Total Equity Allocated as ESOPs</p>
                    <p className="text-2xl font-bold">{formatCurrencyUtil(allocatedEsopValue, startupCurrency)} ({esopPercentage}%)</p>
                    {esopPercentage === 'N/A' && (
                        <p className="text-xs text-red-600 mt-1">
                            ⚠️ No ESOP shares reserved but allocations exist
                        </p>
                    )}
                </Card>
            </div>

            {/* ESOP Reserved Modal */}
            <SimpleModal 
                isOpen={isEsopModalOpen} 
                title="Update ESOP Reserved Shares" 
                onClose={() => setIsEsopModalOpen(false)}
                footer={
                    <>
                        <Button type="button" variant="outline" onClick={() => setIsEsopModalOpen(false)}>Cancel</Button>
                        <Button 
                            type="button" 
                            onClick={async () => {
                                const parsed = Number(esopReservedDraft);
                                if (!Number.isFinite(parsed) || parsed < 0) {
                                    setError('Please enter a valid non-negative number');
                                    return;
                                }
                                if (totalShares && parsed > totalShares) {
                                    setError('ESOP reserved shares cannot exceed total company shares');
                                    return;
                                }
                                try {
                                    const saved = await capTableService.upsertEsopReservedShares(startup.id, parsed);
                                    setEsopReservedShares(saved);
                                    setIsEsopModalOpen(false);
                                } catch (err) {
                                    console.error('Failed to save ESOP reserved shares', err);
                                }
                            }}
                        >
                            Save
                        </Button>
                    </>
                }
            >
                <div style={{ display: 'grid', gap: 8 }}>
                    <label htmlFor="modal-esop-reserved" style={{ fontSize: 12, color: '#475569' }}>ESOP Reserved Shares</label>
                    <input 
                        id="modal-esop-reserved"
                        type="number"
                        value={esopReservedDraft}
                        onChange={(e) => setEsopReservedDraft(e.target.value)}
                        style={{ padding: '8px 10px', border: '1px solid #cbd5e1', borderRadius: 6 }}
                    />
                </div>
            </SimpleModal>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                    <h3 className="text-lg font-semibold mb-4 text-slate-700">Salary Expense</h3>
                    <div style={{ width: '100%', height: 250 }}>
                        <ResponsiveContainer>
                            <LineChart data={monthlyExpenseData}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="name" fontSize={12}/>
                                <YAxis fontSize={12}/>
                                <Tooltip />
                                <Legend />
                                <Line type="monotone" dataKey="salary" stroke="#16a34a" />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </Card>
                <Card>
                    <h3 className="text-lg font-semibold mb-4 text-slate-700">ESOP Expenses</h3>
                    <div style={{ width: '100%', height: 250 }}>
                        <ResponsiveContainer>
                            <LineChart data={monthlyExpenseData}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="name" fontSize={12}/>
                                <YAxis fontSize={12}/>
                                <Tooltip />
                                <Legend />
                                <Line type="monotone" dataKey="esop" stroke="#3b82f6" />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </Card>
                <Card>
                    <h3 className="text-lg font-semibold mb-4 text-slate-700">Salary by Department</h3>
                    <div style={{ width: '100%', height: 250 }}>
                        <ResponsiveContainer>
                            <PieChart>
                                <Pie 
                                    data={departmentData} 
                                    dataKey="value" 
                                    nameKey="name" 
                                    cx="50%" 
                                    cy="50%" 
                                    outerRadius={80} 
                                    label
                                >
                                    {departmentData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </Card>
                <Card>
                    <h3 className="text-lg font-semibold mb-4 text-slate-700">ESOP by Department</h3>
                    <div style={{ width: '100%', height: 250 }}>
                        <ResponsiveContainer>
                            <PieChart>
                                <Pie 
                                    data={departmentData} 
                                    dataKey="value" 
                                    nameKey="name" 
                                    cx="50%" 
                                    cy="50%" 
                                    outerRadius={80} 
                                    label
                                >
                                    {departmentData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </Card>
            </div>
            
            {/* Add Employee Form */}
            <Card>
                <h3 className="text-lg font-semibold mb-4 text-slate-700">Add New Employee</h3>
                {console.log('🔍 Form canEdit status:', canEdit, 'userRole:', userRole, 'isViewOnly:', isViewOnly)}
                <fieldset disabled={false}>
                    <form onSubmit={handleAddEmployee} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <Input label="Employee Name" name="name" required />
                        <Input 
                            label="Date of Joining" 
                            name="joiningDate" 
                            type="date" 
                            max={new Date().toISOString().split('T')[0]}
                            required 
                        />
                        <Select label="Entity" name="entity">
                            {entities.map((entity, index) => (
                                <option key={index} value={entity}>{entity}</option>
                            ))}
                        </Select>
                        <Input label="Department" name="department" required />
                        <Input label="Salary (Annual)" name="salary" type="number" min="0" required />
                        <Input 
                            label="ESOP Allocation (USD)" 
                            name="esopAllocation" 
                            type="number" 
                            min="0" 
                            value={esopAllocationDraft}
                            onChange={(e) => {
                                const val = e.target.value;
                                setEsopAllocationDraft(val);
                                const amount = parseFloat(val) || 0;
                                const periods = allocationTypeDraft === 'monthly' ? 12 : allocationTypeDraft === 'quarterly' ? 4 : 1;
                                setEsopPerAllocationDraft(String(amount / periods));
                            }}
                        />
                        <Select 
                            label="Allocation Type" 
                            name="allocationType"
                            value={allocationTypeDraft}
                            onChange={(e) => {
                                const type = e.target.value as 'one-time' | 'annually' | 'quarterly' | 'monthly';
                                setAllocationTypeDraft(type);
                                const amount = parseFloat(esopAllocationDraft) || 0;
                                const periods = type === 'monthly' ? 12 : type === 'quarterly' ? 4 : 1;
                                setEsopPerAllocationDraft(String(amount / periods));
                            }}
                        >
                            <option value="one-time">One-time</option>
                            <option value="annually">Annually</option>
                            <option value="quarterly">Quarterly</option>
                            <option value="monthly">Monthly</option>
                        </Select>
                        <Input 
                            label="ESOP per Allocation" 
                            name="esopPerAllocation" 
                            type="number" 
                            min="0"
                            value={esopPerAllocationDraft}
                            readOnly
                        />
                        <Input id="employee-contract" label="Employee Contract" name="contract" type="file" accept=".pdf,.doc,.docx" />
                        <div className="flex items-end pt-5">
                            <Button type="submit">Add Employee</Button>
                        </div>
                    </form>
                </fieldset>
            </Card>

            {/* Employee List */}
            <Card>
                <h3 className="text-lg font-semibold mb-4 text-slate-700">Employee List</h3>
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-200 text-sm">
                        <thead className="bg-slate-50">
                            <tr>
                                <th className="px-4 py-2 text-left font-medium text-slate-500">Name</th>
                                <th className="px-4 py-2 text-left font-medium text-slate-500">Department</th>
                                <th className="px-4 py-2 text-left font-medium text-slate-500">Salary</th>
                                <th className="px-4 py-2 text-left font-medium text-slate-500">ESOP Allocated</th>
                                <th className="px-4 py-2 text-left font-medium text-slate-500">Contract</th>
                                <th className="px-4 py-2 text-right font-medium text-slate-500">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-slate-200">
                            {mockEmployees.map(emp => (
                                <tr key={emp.id}>
                                    <td className="px-4 py-2 font-medium text-slate-900">{emp.name}</td>
                                    <td className="px-4 py-2 text-slate-500">{emp.department}</td>
                                    <td className="px-4 py-2 text-slate-500">{formatCurrencyUtil(emp.salary, startupCurrency)}</td>
                                    <td className="px-4 py-2 text-slate-500">{formatCurrencyUtil(emp.esopAllocation, startupCurrency)}</td>
                                    <td className="px-4 py-2 text-slate-500">
                                        {emp.contractUrl ? (
                                            <a href={emp.contractUrl} className="flex items-center text-brand-primary hover:underline">
                                                <Download className="h-4 w-4 mr-1"/> View
                                            </a>
                                        ) : 'N/A'}
                                    </td>
                                    <td className="px-4 py-2 text-right">
                                        <Button 
                                            size="sm" 
                                            variant="outline" 
                                            disabled={!canEdit}
                                            onClick={() => handleDeleteEmployee(emp.id)}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </Card>
        </div>
    );
};

export default EmployeesTab;