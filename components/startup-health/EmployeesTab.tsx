import React, { useState, useEffect } from 'react';
import { Startup, Employee, Subsidiary } from '../../types';
import Card from '../ui/Card';
import SimpleModal from '../ui/SimpleModal';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Select from '../ui/Select';
import DateInput from '../DateInput';
import CloudDriveInput from '../ui/CloudDriveInput';
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
  onEsopUpdated?: () => void;
}

// Remove local formatCurrency function - using utility function instead

// Dynamic data generation based on startup - now using real data
const generateMonthlyExpenseData = async (startup: Startup, year: number) => {
  try {
    console.log('🔍 Loading monthly data for startup:', startup.id);
    const monthlyData = await employeesService.getMonthlySalaryData(startup.id, year);
    console.log('✅ Monthly data loaded:', monthlyData);
    
    if (monthlyData.length === 0) {
      console.log('⚠️ No monthly data found, returning empty set');
      return [];
    }
    
    // Convert ESOP from cumulative to monthly so graphs reflect allocation type per month
    const adjusted = monthlyData.map((item: any, index: number) => {
      const prevTotal = index > 0 ? (monthlyData[index - 1]?.total_esop || 0) : 0;
      const monthlyEsop = Math.max(0, (item.total_esop || 0) - prevTotal);
      return {
        name: item.month_name,
        salary: item.total_salary,
        esop: monthlyEsop
      };
    });

    return adjusted;
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

const EmployeesTab: React.FC<EmployeesTabProps> = ({ startup, userRole, isViewOnly = false, onEsopUpdated }) => {
    const startupCurrency = useStartupCurrency(startup);
    const [isEditing, setIsEditing] = useState(false);
    const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
    const [editFormData, setEditFormData] = useState<{ name: string; joiningDate: string; entity: string; department: string; salary: number; esopAllocation: number; allocationType: 'one-time' | 'annually' | 'quarterly' | 'monthly'; esopPerAllocation: number; pricePerShare: number; numberOfShares: number }>({ name: '', joiningDate: '', entity: 'Parent Company', department: '', salary: 0, esopAllocation: 0, allocationType: 'one-time', esopPerAllocation: 0, pricePerShare: 0, numberOfShares: 0 });
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [formError, setFormError] = useState<string | null>(null);
    const [monthlyExpenseData, setMonthlyExpenseData] = useState<any[]>([]);
    const [availableYears, setAvailableYears] = useState<number[]>([]);
    const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
    const [startMonth, setStartMonth] = useState<number>(1); // 1-12
    const [endMonth, setEndMonth] = useState<number>(12); // 1-12
    const [departmentData, setDepartmentData] = useState<any[]>([]);
    const [mockEmployees, setMockEmployees] = useState<Employee[]>([]);
    const [currentValuesMap, setCurrentValuesMap] = useState<Record<string, { salary: number; esopAllocation: number; allocationType: 'one-time' | 'annually' | 'quarterly' | 'monthly'; esopPerAllocation: number }>>({});
    const [summary, setSummary] = useState<any>(null);
  const [monthlySalaryExpense, setMonthlySalaryExpense] = useState<number>(0);
    const [entities, setEntities] = useState<string[]>(['Parent Company']);
    const [esopReservedShares, setEsopReservedShares] = useState<number>(0);
    const [esopReservedDraft, setEsopReservedDraft] = useState<string>('0');
    const [pricePerShare, setPricePerShare] = useState<number>(0);
    const [totalShares, setTotalShares] = useState<number>(0);
    const [totalAllocatedLedgerShares, setTotalAllocatedLedgerShares] = useState<number>(0);
    const [esopAllocationDraft, setEsopAllocationDraft] = useState<string>('');
    const [allocationTypeDraft, setAllocationTypeDraft] = useState<'one-time' | 'annually' | 'quarterly' | 'monthly'>('one-time');
    const [esopPerAllocationDraft, setEsopPerAllocationDraft] = useState<string>('0');
    const [isEsopModalOpen, setIsEsopModalOpen] = useState(false);
    const [isTerminateModalOpen, setIsTerminateModalOpen] = useState<null | Employee>(null);
    const [terminationDateDraft, setTerminationDateDraft] = useState<string>('');
    const [isIncrementModalOpen, setIsIncrementModalOpen] = useState<null | Employee>(null);
    const [incrementDateDraft, setIncrementDateDraft] = useState<string>('');
    const [incrementSalaryDraft, setIncrementSalaryDraft] = useState<string>('');
    const [incrementEsopAllocationDraft, setIncrementEsopAllocationDraft] = useState<string>('');
    const [incrementAllocationTypeDraft, setIncrementAllocationTypeDraft] = useState<'one-time' | 'annually' | 'quarterly' | 'monthly'>('one-time');
    const [incrementEsopPerAllocationDraft, setIncrementEsopPerAllocationDraft] = useState<string>('0');
    const [incrementPricePerShareDraft, setIncrementPricePerShareDraft] = useState<string>('');
    const [incrementNumberOfSharesDraft, setIncrementNumberOfSharesDraft] = useState<string>('0');
    const [historyEmployee, setHistoryEmployee] = useState<null | Employee>(null);
    const [historyItems, setHistoryItems] = useState<any[]>([]);
    const [isHistoryLoading, setIsHistoryLoading] = useState<boolean>(false);
    const [ledgerItems, setLedgerItems] = useState<any[]>([]);
    const [isLedgerLoading, setIsLedgerLoading] = useState<boolean>(false);
    const [showLedger, setShowLedger] = useState<boolean>(false);
    
    // Contract file/URL state for add employee form
    const [contractFile, setContractFile] = useState<File | null>(null);
    const [contractUrl, setContractUrl] = useState<string>('');
    
    // Contract file/URL state for edit employee form
    const [editContractFile, setEditContractFile] = useState<File | null>(null);
    const [editContractUrl, setEditContractUrl] = useState<string>('');
    
    // Allow editing for Startup/Admin; also allow when role is not yet loaded
    const canEdit = ((userRole === 'Startup' || userRole === 'Admin' || !userRole) && !isViewOnly);

    // Auto-calculation function for number of shares
    const calculateNumberOfShares = (esopAllocation: number, pricePerShare: number): number => {
        if (pricePerShare > 0 && esopAllocation > 0) {
            return Math.floor(esopAllocation / pricePerShare);
        }
        return 0;
    };

    // Load data on component mount and when startup changes
    useEffect(() => {
        loadData();
    }, [startup.id, startup.pricePerShare, selectedYear]);

  // Recompute monthly salary expense whenever employees change
  useEffect(() => {
      const computeMonthly = async (employees: Employee[]) => {
          console.log('🔄 Computing monthly salary expense for employees:', employees.length);
          let totalMonthlyExpense = 0;
          
          for (const emp of employees) {
              console.log(`📊 Processing employee: ${emp.name} (ID: ${emp.id})`);
              
              // Get current effective salary (considering increments)
              let currentSalary = await employeesService.getCurrentEffectiveSalary(emp.id);
              console.log(`💰 Current salary for ${emp.name}: ${currentSalary}`);
              
              // Fallback to base salary if getCurrentEffectiveSalary returns 0
              if (currentSalary === 0) {
                  currentSalary = emp.salary || 0;
                  console.log(`⚠️ Using fallback base salary for ${emp.name}: ${currentSalary}`);
              }
              
              const monthlySalary = currentSalary / 12;
              console.log(`📅 Monthly salary for ${emp.name}: ${monthlySalary}`);
              
              let esopMonthly = 0;
              const currentDate = new Date();
              const currentMonth = currentDate.getMonth() + 1; // 1-12
              
              switch (emp.allocationType) {
                  case 'monthly':
                      // Total allocation / 12 for each month
                      esopMonthly = (emp.esopAllocation || 0) / 12;
                      break;
                  case 'quarterly':
                      // Total allocation / 4, only in Jan (1), Apr (4), Jul (7), Oct (10)
                      if ([1, 4, 7, 10].includes(currentMonth)) {
                          esopMonthly = (emp.esopAllocation || 0) / 4;
                      } else {
                          esopMonthly = 0;
                      }
                      break;
                  case 'annually':
                      // Total allocation / 1, only in January
                      if (currentMonth === 1) {
                          esopMonthly = emp.esopAllocation || 0;
                      } else {
                          esopMonthly = 0;
                      }
                      break;
                  default:
                      esopMonthly = 0; // one-time not counted as recurring monthly
              }
              
              const employeeTotal = monthlySalary + esopMonthly;
              totalMonthlyExpense += employeeTotal;
              console.log(`➕ Employee ${emp.name} total monthly: ${employeeTotal} (salary: ${monthlySalary}, ESOP: ${esopMonthly})`);
          }
          
          console.log(`🎯 Total monthly salary expense: ${totalMonthlyExpense}`);
          return totalMonthlyExpense;
      };

      // Use async computation
      computeMonthly(mockEmployees).then(result => {
          console.log('✅ Setting monthly salary expense to:', result);
          setMonthlySalaryExpense(result);
      }).catch(error => {
          console.error('❌ Error computing monthly salary expense:', error);
          setMonthlySalaryExpense(0);
      });
  }, [mockEmployees]);

    const loadData = async () => {
        try {
            setIsLoading(true);
            setError(null);
            
            // Load all data in parallel
            const [years, monthlyData, deptData, employeesData, summaryData, profileData, shares, esopShares] = await Promise.all([
                employeesService.getAvailableYears(startup.id),
                generateMonthlyExpenseData(startup, selectedYear),
                generateDepartmentData(startup),
                generateMockEmployees(startup),
                employeesService.getEmployeeSummary(startup.id),
                profileService.getStartupProfile(startup.id),
                capTableService.getTotalShares(startup.id),
                capTableService.getEsopReservedShares(startup.id)
            ]);
            
            // Get fresh price per share from Cap Table service (same as CapTableTab)
            let calculatedPricePerShare = 0;
            try {
                console.log('🔄 Loading fresh price per share from Cap Table...');
                const sharesData = await capTableService.getStartupSharesData(startup.id);
                if (sharesData && sharesData.pricePerShare > 0) {
                    calculatedPricePerShare = sharesData.pricePerShare;
                    console.log('✅ Fresh price per share from Cap Table:', calculatedPricePerShare);
                } else {
                    console.log('⚠️ No price per share from Cap Table, calculating fresh price...');
                    // Calculate fresh price per share using current valuation and total shares
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
                                    console.log('✅ Using latest valuation from investment records:', latestValuation);
                                }
                            }
                        } catch (err) {
                            console.log('Could not load investment records for price calculation:', err);
                        }
                        calculatedPricePerShare = latestValuation / shares;
                        console.log('✅ Calculated fresh price per share:', calculatedPricePerShare, '(Valuation:', latestValuation, '/ Shares:', shares, ')');
                        
                        // Save the calculated price per share to database
                        try {
                            await capTableService.upsertPricePerShare(startup.id, calculatedPricePerShare);
                            console.log('✅ Saved calculated price per share to database:', calculatedPricePerShare);
                        } catch (saveErr) {
                            console.error('❌ Failed to save calculated price per share:', saveErr);
                        }
                    }
                }
            } catch (err) {
                console.error('❌ Failed to load fresh price per share from Cap Table:', err);
                // Fallback to manual calculation
                if (shares > 0) {
                    let latestValuation = startup.currentValuation || 0;
                    calculatedPricePerShare = latestValuation / shares;
                    console.log('⚠️ Fallback price per share calculation:', calculatedPricePerShare);
                }
            }
            
            // After price per share resolved, compute total allocated shares from ledger (all-time)
            let ledgerSharesTotal = 0;
            try {
                ledgerSharesTotal = await employeesService.getTotalLedgerSharesForStartup(startup.id);
            } catch (e) {
                console.warn('Failed to load total ledger shares:', e);
            }

            // Debug: Log the loaded values
            console.log('🔍 Loaded ESOP data:', {
                startupId: startup.id,
                calculatedPricePerShare,
                totalShares: shares,
                esopReservedShares: esopShares,
                summaryData: summaryData,
                ledgerSharesTotal,
                esopValueCalculation: `${esopShares} × ${calculatedPricePerShare} = ${(esopShares || 0) * calculatedPricePerShare}`
            });
            
            // DETAILED DEBUG: Track all price per share sources
            console.log('🔍 DETAILED DEBUG - Price Per Share Sources:', {
                'startup.currentValuation': startup.currentValuation,
                'startup.pricePerShare': startup.pricePerShare,
                'calculatedPricePerShare': calculatedPricePerShare,
                'totalShares': shares,
                'esopReservedShares': esopShares,
                'calculation': `Valuation: ${startup.currentValuation} / Shares: ${shares} = ${startup.currentValuation / shares}`,
                'esopValue': `${esopShares} × ${calculatedPricePerShare} = ${(esopShares || 0) * calculatedPricePerShare}`
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
            
            setAvailableYears(years);
            setMonthlyExpenseData(monthlyData);
            setDepartmentData(deptData);
            setMockEmployees(employeesData);

            // Build current values (apply latest increment if any)
            try {
                const increments = await employeesService.getIncrementsForEmployees(employeesData.map(e => e.id));
                const map: Record<string, any> = {};
                employeesData.forEach(emp => {
                    const incs = increments.filter(i => i.employee_id === emp.id);
                    if (incs.length === 0) {
                        map[emp.id] = {
                            salary: emp.salary,
                            esopAllocation: emp.esopAllocation,
                            allocationType: emp.allocationType,
                            esopPerAllocation: emp.esopPerAllocation,
                        };
                    } else {
                        const latest = incs[incs.length - 1];
                        map[emp.id] = {
                            salary: latest.salary || 0,
                            esopAllocation: latest.esop_allocation || 0,
                            allocationType: latest.allocation_type,
                            esopPerAllocation: latest.esop_per_allocation || 0,
                        };
                    }
                });
                setCurrentValuesMap(map);
            } catch {
                setCurrentValuesMap({});
            }
            setSummary(summaryData);
            setPricePerShare(calculatedPricePerShare);
            setTotalShares(shares || 0);
            setTotalAllocatedLedgerShares(ledgerSharesTotal || 0);
            
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
                setFormError(errorMsg);
                return;
            }
            
            // Check if no ESOP shares are reserved but trying to allocate
            if (esopReservedShares === 0 && (esopAllocationValue || 0) > 0) {
                console.log('❌ ESOP shares validation failed: No reserved shares but trying to allocate');
                setFormError('Cannot allocate ESOPs when no shares are reserved for ESOP. Please set ESOP reserved shares first.');
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
                    setFormError(errorMsg);
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
                pricePerShare: pricePerShare || 0,
                numberOfShares: calculateNumberOfShares(esopAllocationValue || 0, pricePerShare || 0),
                contractUrl: '' // Will be set after employee creation if file is provided
            };

            console.log('📝 Employee data to create:', employeeData);
            console.log('🏢 Startup ID:', startup.id);

            // Create the employee first
            console.log('🔄 Creating employee in database...');
            const created = await employeesService.addEmployee(startup.id, employeeData);
            console.log('✅ Employee created successfully:', created);

            // Handle contract: either file OR URL, not both
            let finalContractUrl = '';
            
            if (contractFile && created?.id) {
                console.log('📁 Contract file found, uploading...');
                const upload = await storageService.uploadEmployeeContract(contractFile, String(startup.id), String(created.id));
                console.log('📤 Upload result:', upload);
                
                if (upload.success && upload.url) {
                    finalContractUrl = upload.url;
                    console.log('✅ Contract file uploaded:', finalContractUrl);
                }
            } else if (contractUrl && contractUrl.trim()) {
                // Use cloud drive URL if provided (and no file was uploaded)
                finalContractUrl = contractUrl.trim();
                console.log('✅ Using cloud drive URL:', finalContractUrl);
            }
            
            // Update employee with contract URL if provided
            if (finalContractUrl && created?.id) {
                console.log('🔄 Updating employee with contract URL...');
                await employeesService.updateEmployee(created.id, { contractUrl: finalContractUrl });
                console.log('✅ Employee updated with contract URL');
            }

            // Refresh financial records to ensure monthly expenditure is updated
            try {
              await employeesService.refreshFinancialRecordsForStartup(startup.id);
              console.log('Financial records refreshed after adding new employee');
            } catch (refreshError) {
              console.warn('Failed to refresh financial records:', refreshError);
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
            setContractFile(null);
            setContractUrl('');
            setFormError(null);
            
        } catch (err) {
            console.error('❌ Error adding employee:', err);
            setFormError('Failed to add employee');
        }
    };

    const handleTerminateEmployee = async () => {
        if (!isTerminateModalOpen) return;
        try {
            if (!terminationDateDraft) {
                setError('Please select a termination date');
                return;
            }
            await employeesService.terminateEmployee(isTerminateModalOpen.id, terminationDateDraft);
            setIsTerminateModalOpen(null);
            setTerminationDateDraft('');
            await loadData();
        } catch (err) {
            console.error('Error terminating employee:', err);
            setError('Failed to terminate employee');
        }
    };

    const handleAddIncrement = async () => {
        if (!isIncrementModalOpen) return;
        try {
            const newSalary = Number(incrementSalaryDraft);
            const newEsopAllocation = Number(incrementEsopAllocationDraft) || 0;
            const newEsopPerAllocation = Number(incrementEsopPerAllocationDraft) || 0;
            
            // Basic validation
            if (!incrementDateDraft || !Number.isFinite(newSalary) || newSalary < 0) {
                setError('Please enter valid effective date and non-negative salary');
                return;
            }

            // Client-side validation: Check if increment date is before joining date
            const incrementDate = new Date(incrementDateDraft);
            const joiningDate = new Date(isIncrementModalOpen.joiningDate);
            
            if (incrementDate < joiningDate) {
                setError(`Increment date cannot be before the employee's joining date (${isIncrementModalOpen.joiningDate}). Please select a date on or after the joining date.`);
                return;
            }

            // Check if increment date is in the future
            const today = new Date();
            today.setHours(23, 59, 59, 999);
            if (incrementDate > today) {
                setError('Increment date cannot be in the future');
                return;
            }

            const newPricePerShare = pricePerShare || 0;
            const newNumberOfShares = calculateNumberOfShares(newEsopAllocation, newPricePerShare);
            
            await employeesService.addSalaryIncrement(
              isIncrementModalOpen.id,
              newSalary,
              incrementDateDraft,
              newEsopAllocation,
              incrementAllocationTypeDraft,
              newEsopPerAllocation,
              newPricePerShare,
              newNumberOfShares
            );
            
            // Refresh financial records to ensure monthly expenditure is updated
            try {
              await employeesService.refreshFinancialRecordsForStartup(startup.id);
              console.log('Financial records refreshed after salary increment');
            } catch (refreshError) {
              console.warn('Failed to refresh financial records:', refreshError);
            }
            
            setIsIncrementModalOpen(null);
            setIncrementDateDraft('');
            setIncrementSalaryDraft('');
            setIncrementEsopAllocationDraft('');
            setIncrementEsopPerAllocationDraft('0');
            setIncrementAllocationTypeDraft('one-time');
            setIncrementPricePerShareDraft(String(pricePerShare || 0));
            setIncrementNumberOfSharesDraft('0');
            await loadData();
        } catch (err) {
            console.error('Error adding increment:', err);
            setError(err instanceof Error ? err.message : 'Failed to add increment');
        }
    };

    const openEditEmployee = async (emp: Employee) => {
        // Open modal immediately with currently displayed values
        setEditingEmployee(emp);
        const current = currentValuesMap[emp.id];
        setEditFormData({
            name: emp.name,
            joiningDate: emp.joiningDate,
            entity: emp.entity,
            department: emp.department,
            salary: current?.salary ?? emp.salary,
            esopAllocation: current?.esopAllocation ?? emp.esopAllocation,
            allocationType: current?.allocationType ?? emp.allocationType,
            esopPerAllocation: current?.esopPerAllocation ?? emp.esopPerAllocation,
            pricePerShare: emp.pricePerShare ?? pricePerShare,
            numberOfShares: emp.numberOfShares ?? calculateNumberOfShares(current?.esopAllocation ?? emp.esopAllocation, emp.pricePerShare ?? pricePerShare),
        });
        // Set existing contract URL and clear file
        setEditContractUrl(emp.contractUrl || '');
        setEditContractFile(null);

        // Then try to refine from latest increment if table exists
        try {
            const increments = await employeesService.getIncrementsForEmployee(emp.id);
            const latest = increments.length > 0 ? increments[increments.length - 1] : null;
            if (latest) {
                setEditFormData(prev => ({
                    ...prev,
                    salary: latest.salary,
                    esopAllocation: latest.esop_allocation,
                    allocationType: latest.allocation_type,
                    esopPerAllocation: latest.esop_per_allocation,
                }));
            }
        } catch {}
    };

    const openHistory = async (emp: Employee) => {
        try {
            setIsHistoryLoading(true);
            setHistoryEmployee(emp);
            // Fetch increments
            const increments = await employeesService.getIncrementsForEmployee(emp.id);
            // Build history array: base + increments
            const items = [
                {
                    type: 'base',
                    effective_date: emp.joiningDate,
                    salary: emp.salary,
                    esop_allocation: emp.esopAllocation,
                    allocation_type: emp.allocationType,
                    esop_per_allocation: emp.esopPerAllocation,
                    price_per_share: emp.pricePerShare || 0,
                    number_of_shares: emp.numberOfShares || 0,
                },
                ...increments
            ].sort((a: any, b: any) => new Date(a.effective_date).getTime() - new Date(b.effective_date).getTime());
            setHistoryItems(items);
        } catch (e) {
            setHistoryItems([]);
        } finally {
            setIsHistoryLoading(false);
        }
    };

    const openLedger = async (emp: Employee) => {
        try {
            setIsLedgerLoading(true);
            setHistoryEmployee(emp);
            setShowLedger(true);
            
            // Generate ledger entries for the employee from joining date to current date
            const joiningDate = emp.joiningDate;
            const currentDate = new Date().toISOString().split('T')[0];
            
            console.log('🔍 Generating ledger for employee:', emp.name, 'from', joiningDate, 'to', currentDate);
            
            // First, try to get existing ledger entries
            let ledger = await employeesService.getEmployeeLedger(emp.id, joiningDate, currentDate);
            console.log('📊 Existing ledger entries:', ledger.length);
            
            // If no entries exist, generate them
            if (ledger.length === 0) {
                console.log('🔄 No existing entries, generating new ledger...');
                const entriesGenerated = await employeesService.generateEmployeeLedger(emp.id, joiningDate, currentDate);
                console.log('✅ Generated', entriesGenerated, 'ledger entries');
                
                // Fetch the newly generated entries
                ledger = await employeesService.getEmployeeLedger(emp.id, joiningDate, currentDate);
                console.log('📊 New ledger entries:', ledger.length);
            }
            
            setLedgerItems(ledger);
        } catch (e) {
            console.error('❌ Error loading employee ledger:', e);
            setLedgerItems([]);
        } finally {
            setIsLedgerLoading(false);
        }
    };

    const saveEditEmployee = async () => {
        if (!editingEmployee) return;
        try {
            // Update latest increment if exists, otherwise base employee
            const increments = await employeesService.getIncrementsForEmployee(editingEmployee.id);
            if (increments.length > 0) {
                const latest = increments[increments.length - 1];
                await employeesService.updateIncrement(latest.id, {
                    salary: editFormData.salary,
                    esop_allocation: editFormData.esopAllocation,
                    allocation_type: editFormData.allocationType,
                    esop_per_allocation: editFormData.esopPerAllocation,
                } as any);
            } else {
                await employeesService.updateEmployee(editingEmployee.id, {
                    name: editFormData.name,
                    joiningDate: editFormData.joiningDate,
                    entity: editFormData.entity,
                    department: editFormData.department,
                    salary: editFormData.salary,
                    esopAllocation: editFormData.esopAllocation,
                    allocationType: editFormData.allocationType,
                    esopPerAllocation: editFormData.esopPerAllocation,
                    pricePerShare: editFormData.pricePerShare,
                    numberOfShares: editFormData.numberOfShares
                } as any);
            }

            // Handle contract: either file OR URL, not both
            let finalContractUrl = editingEmployee.contractUrl || '';
            
            if (editContractFile) {
                console.log('📁 Edit: Contract file found, uploading...');
                const upload = await storageService.uploadEmployeeContract(editContractFile, String(startup.id), String(editingEmployee.id));
                if (upload.success && upload.url) {
                    finalContractUrl = upload.url;
                    console.log('✅ Edit: Contract file uploaded:', finalContractUrl);
                }
            } else if (editContractUrl && editContractUrl.trim()) {
                // Use cloud drive URL if provided (and no file was uploaded)
                finalContractUrl = editContractUrl.trim();
                console.log('✅ Edit: Using cloud drive URL:', finalContractUrl);
            }
            
            // Update contract URL if changed
            if (finalContractUrl && finalContractUrl !== editingEmployee.contractUrl) {
                await employeesService.updateEmployee(editingEmployee.id, { contractUrl: finalContractUrl } as any);
            }
            setEditingEmployee(null);
            setEditContractFile(null);
            setEditContractUrl('');
            await loadData();
        } catch (err) {
            console.error('Error updating employee:', err);
            setError('Failed to update employee');
        }
    };

    // ESOP Reserved: USD = shares * latest price/share
    // Prioritize local pricePerShare (updated after ESOP save) over startup object
    const updatedPricePerShare = pricePerShare || startup.pricePerShare || 0;
    const reservedEsopValue = (esopReservedShares || 0) * updatedPricePerShare;
    
    console.log('🔍 ESOP Value Calculation:', {
        esopReservedShares,
        localPricePerShare: pricePerShare,
        startupPricePerShare: startup.pricePerShare,
        finalPricePerShare: updatedPricePerShare,
        reservedEsopValue,
        calculation: `${esopReservedShares} × ${updatedPricePerShare} = ${reservedEsopValue}`
    });
    
    // DETAILED DEBUG: Track the final calculation
    console.log('🔍 DETAILED DEBUG - Final ESOP Value Calculation:', {
        'esopReservedShares': esopReservedShares,
        'pricePerShare (local)': pricePerShare,
        'startup.pricePerShare': startup.pricePerShare,
        'startup.currentValuation': startup.currentValuation,
        'finalPricePerShare': updatedPricePerShare,
        'reservedEsopValue': reservedEsopValue,
        'calculation': `${esopReservedShares} × ${updatedPricePerShare} = ${reservedEsopValue}`,
        'expectedCalculation': `If using Cap Table price (₹975.35): ${esopReservedShares} × 975.35 = ${(esopReservedShares || 0) * 975.35}`,
        'priceSource': pricePerShare > 0 ? 'local' : (startup.pricePerShare > 0 ? 'startup' : 'none')
    });
    // New calculation: total allocated equity value = (sum of ledger shares) × (current price per share)
    const allocatedEsopValue = (totalAllocatedLedgerShares || 0) * (updatedPricePerShare || 0);
    
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
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <Card>
                    <p className="text-sm font-medium text-slate-500">Number of Employees</p>
                    <p className="text-2xl font-bold">{summary?.total_employees || mockEmployees.length}</p>
                </Card>
                <Card>
                    <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-slate-500">Total Equity Reserved for ESOPs</p>
                        <Button size="sm" variant="outline" onClick={() => setIsEsopModalOpen(true)}>Edit</Button>
                    </div>
                    <p className="text-2xl font-bold">{formatCurrencyUtil(reservedEsopValue, startupCurrency)}</p>
                    <p className="text-sm text-slate-500 mt-1">{esopReservedShares.toLocaleString()} (shares)</p>
                    {pricePerShare === 0 && (
                        <div className="text-xs text-amber-600 mt-1">
                            <p className="font-medium">⚠️ Price per share not set</p>
                            <p className="mt-1">Go to Equity Allocation tab → Company Settings to set the price per share</p>
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
                <Card>
                    <p className="text-sm font-medium text-slate-500">Monthly Salary Expenditure</p>
                    <p className="text-2xl font-bold">{formatCurrencyUtil(monthlySalaryExpense, startupCurrency)}</p>
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
                                    
                                    // Force refresh of Cap Table data to get updated price per share
                                    console.log('🔄 Refreshing Cap Table data after ESOP update...');
                                    try {
                                        // Get updated shares data from Cap Table
                                        const updatedSharesData = await capTableService.getStartupSharesData(startup.id);
                                        console.log('🔄 Updated shares data:', updatedSharesData);
                                        
                                        // Update the price per share with the fresh calculation
                                        if (updatedSharesData && updatedSharesData.pricePerShare > 0) {
                                            setPricePerShare(updatedSharesData.pricePerShare);
                                            console.log('✅ Updated price per share:', updatedSharesData.pricePerShare);
                                        }
                                    } catch (refreshErr) {
                                        console.error('❌ Failed to refresh Cap Table data:', refreshErr);
                                    }
                                    
                                    // Also trigger the callback for any other components that need to refresh
                                    if (onEsopUpdated) {
                                        console.log('🔄 Triggering additional refresh callbacks');
                                        onEsopUpdated();
                                    }
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
                {/* Filters */}
                <div className="lg:col-span-2">
                    <div className="flex flex-wrap gap-3 items-end">
                        <div>
                            <label className="block text-xs text-slate-500 mb-1">Year</label>
                            <select className="border border-slate-300 rounded px-2 py-1" value={selectedYear} onChange={(e) => setSelectedYear(Number(e.target.value))}>
                                {(availableYears.length > 0 ? availableYears : [new Date().getFullYear()]).map(y => (
                                    <option key={y} value={y}>{y}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs text-slate-500 mb-1">Start Month</label>
                            <select className="border border-slate-300 rounded px-2 py-1" value={startMonth} onChange={(e) => setStartMonth(Number(e.target.value))}>
                                {[1,2,3,4,5,6,7,8,9,10,11,12].map(m => (
                                    <option key={m} value={m}>{new Date(2000, m-1, 1).toLocaleString('default', { month: 'short' })}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs text-slate-500 mb-1">End Month</label>
                            <select className="border border-slate-300 rounded px-2 py-1" value={endMonth} onChange={(e) => setEndMonth(Number(e.target.value))}>
                                {[1,2,3,4,5,6,7,8,9,10,11,12].map(m => (
                                    <option key={m} value={m}>{new Date(2000, m-1, 1).toLocaleString('default', { month: 'short' })}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>
                <Card>
                    <h3 className="text-lg font-semibold mb-4 text-slate-700">Monthly Salary Expense</h3>
                    <div style={{ width: '100%', height: 250 }}>
                        <ResponsiveContainer>
                            <LineChart data={monthlyExpenseData.filter(d => {
                                const monthIndex = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'].indexOf(d.name) + 1;
                                return monthIndex >= startMonth && monthIndex <= endMonth;
                            })}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="name" fontSize={12}/>
                                <YAxis fontSize={12}/>
                                <Tooltip />
                                <Legend />
                                <Line type="monotone" dataKey="salary" stroke="#16a34a" name="Monthly Salary" />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </Card>
                <Card>
                    <h3 className="text-lg font-semibold mb-4 text-slate-700">Cumulative ESOP Expenses</h3>
                    <div style={{ width: '100%', height: 250 }}>
                        <ResponsiveContainer>
                            <LineChart data={monthlyExpenseData.filter(d => {
                                const monthIndex = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'].indexOf(d.name) + 1;
                                return monthIndex >= startMonth && monthIndex <= endMonth;
                            })}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="name" fontSize={12}/>
                                <YAxis fontSize={12}/>
                                <Tooltip />
                                <Legend />
                                <Line type="monotone" dataKey="esop" stroke="#3b82f6" name="Cumulative ESOP" />
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
            
            {/* Add Employee button moved to Employee List header */}

            {/* Add Employee Modal */}
            <SimpleModal isOpen={isEditing} onClose={() => { 
                setIsEditing(false); 
                setFormError(null);
                setContractFile(null);
                setContractUrl('');
            }} title="Add Employee" width="800px">
                {formError && (
                    <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded">
                        <div className="flex items-center">
                            <span className="text-red-500 mr-2">⚠️</span>
                            <div>
                                <p className="font-medium">Form Error</p>
                                <p className="text-sm">{formError}</p>
                            </div>
                        </div>
                    </div>
                )}
                <form onSubmit={handleAddEmployee} className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                            label={`ESOP Allocation (${startupCurrency})`} 
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
                                
                                // Auto-calculate number of shares
                                const pricePerShareValue = pricePerShare || 0;
                                const numberOfShares = calculateNumberOfShares(amount, pricePerShareValue);
                                setEsopAllocationDraft(val);
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
                        <Input 
                            label={`Price per Share (${startupCurrency})`} 
                            name="pricePerShare" 
                            type="number" 
                            min="0" 
                            value={pricePerShare || 0}
                            readOnly
                            placeholder="Auto-filled from Cap Table"
                        />
                        <Input 
                            label="Number of Shares" 
                            name="numberOfShares" 
                            type="number" 
                            min="0"
                            value={calculateNumberOfShares(parseFloat(esopAllocationDraft) || 0, pricePerShare || 0)}
                            readOnly
                            placeholder="Auto-calculated"
                        />
                        <CloudDriveInput
                            value={contractUrl}
                            onChange={(url) => {
                                // If URL is provided, clear the file and update URL
                                setContractUrl(url);
                                setContractFile(null);
                            }}
                            onFileSelect={(file) => {
                                console.log('📥 Employee contract file selected:', file?.name);
                                if (file) {
                                    setContractFile(file);
                                    // Clear URL when file is selected
                                    setContractUrl('');
                                }
                            }}
                            placeholder="Paste your cloud drive link here..."
                            label="Employee Contract"
                            accept=".pdf,.doc,.docx"
                            maxSize={10}
                            documentType="employee contract"
                            showPrivacyMessage={false}
                        />
                        {contractFile && (
                            <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded text-sm text-green-700">
                                📄 File selected: {contractFile.name} ({(contractFile.size / 1024 / 1024).toFixed(2)} MB)
                            </div>
                        )}
                        <input type="hidden" id="contract-url" name="contract-url" />
                        <div className="flex items-end pt-5 col-span-1 md:col-span-2 justify-end">
                            <Button type="submit" className="bg-blue-600 text-white">Save</Button>
                        </div>
                </form>
            </SimpleModal>

            {/* Employee List */}
            <Card>
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-slate-700">Employee List</h3>
                    <Button onClick={() => { setIsEditing(true); setFormError(null); }} disabled={!canEdit} className="bg-blue-600 text-white">Add Employee</Button>
                </div>
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
                                    <td className="px-4 py-2 text-slate-500">{formatCurrencyUtil((currentValuesMap[emp.id]?.salary ?? emp.salary), startupCurrency)}</td>
                                    <td className="px-4 py-2 text-slate-500">{formatCurrencyUtil((currentValuesMap[emp.id]?.esopAllocation ?? emp.esopAllocation), startupCurrency)}</td>
                                    <td className="px-4 py-2 text-slate-500">
                                        {emp.contractUrl ? (
                                            <a href={emp.contractUrl} className="flex items-center text-brand-primary hover:underline">
                                                <Download className="h-4 w-4 mr-1"/> View
                                            </a>
                                        ) : 'N/A'}
                                    </td>
                                    <td className="px-4 py-2 text-right">
                                        <div className="inline-flex gap-2">
                                            <Button type="button" size="sm" variant="outline" onClick={() => openHistory(emp)}>History</Button>
                                            <Button type="button" size="sm" variant="outline" onClick={() => openLedger(emp)}>Ledger</Button>
                                            <Button type="button" size="sm" variant="outline" disabled={!canEdit || !!emp.terminationDate} onClick={() => openEditEmployee(emp)}>Edit</Button>
                                            <Button 
                                                type="button"
                                                size="sm" 
                                                variant="outline" 
                                                disabled={!canEdit || !!emp.terminationDate}
                                                onClick={() => setIsTerminateModalOpen(emp)}
                                            >
                                                Terminate
                                            </Button>
                                            <Button 
                                                type="button"
                                                size="sm" 
                                                variant="outline" 
                                                disabled={!canEdit || !!emp.terminationDate}
                                                onClick={() => setIsIncrementModalOpen(emp)}
                                            >
                                                Increment
                                            </Button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </Card>
            {/* History Modal */}
            <SimpleModal 
                isOpen={!!historyEmployee}
                onClose={() => { setHistoryEmployee(null); setHistoryItems([]); }}
                title={historyEmployee ? `History - ${historyEmployee.name}` : 'History'}
                width="700px"
            >
                <div className="space-y-3">
                    {historyEmployee?.terminationDate && (
                        <div className="text-sm text-red-600">Terminated on {new Date(historyEmployee.terminationDate).toLocaleDateString()}</div>
                    )}
                    {isHistoryLoading ? (
                        <div className="text-sm text-slate-500">Loading history...</div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-slate-200 text-sm">
                                <thead className="bg-slate-50">
                                    <tr>
                                        <th className="px-4 py-2 text-left font-medium text-slate-500">Type</th>
                                        <th className="px-4 py-2 text-left font-medium text-slate-500">Effective Date</th>
                                        <th className="px-4 py-2 text-left font-medium text-slate-500">Salary</th>
                                        <th className="px-4 py-2 text-left font-medium text-slate-500">ESOP Allocation</th>
                                        <th className="px-4 py-2 text-left font-medium text-slate-500">Allocation Type</th>
                                        <th className="px-4 py-2 text-left font-medium text-slate-500">ESOP per Allocation</th>
                                        <th className="px-4 py-2 text-left font-medium text-slate-500">Price per Share</th>
                                        <th className="px-4 py-2 text-left font-medium text-slate-500">Number of Shares</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-slate-200">
                                    {historyItems.map((it: any, idx: number) => (
                                        <tr key={idx}>
                                            <td className="px-4 py-2 text-slate-600">{it.type === 'base' ? 'Base' : 'Increment'}</td>
                                            <td className="px-4 py-2 text-slate-600">{new Date(it.effective_date).toLocaleDateString()}</td>
                                            <td className="px-4 py-2 text-slate-600">{formatCurrencyUtil(Number(it.salary) || 0, startupCurrency)}</td>
                                            <td className="px-4 py-2 text-slate-600">{formatCurrencyUtil(Number(it.esop_allocation) || 0, startupCurrency)}</td>
                                            <td className="px-4 py-2 text-slate-600">{it.allocation_type}</td>
                                            <td className="px-4 py-2 text-slate-600">{formatCurrencyUtil(Number(it.esop_per_allocation) || 0, startupCurrency)}</td>
                                            <td className="px-4 py-2 text-slate-600">{formatCurrencyUtil(Number(it.price_per_share) || 0, startupCurrency)}</td>
                                            <td className="px-4 py-2 text-slate-600">{Number(it.number_of_shares) || 0}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </SimpleModal>

            {/* Employee Ledger Modal */}
            <SimpleModal 
                isOpen={!!historyEmployee && showLedger}
                onClose={() => { setHistoryEmployee(null); setLedgerItems([]); setShowLedger(false); }}
                title={historyEmployee ? `Employee Ledger - ${historyEmployee.name}` : 'Employee Ledger'}
                width="900px"
            >
                <div className="space-y-3">
                    <div className="flex justify-between items-center">
                        <div>
                            {historyEmployee?.terminationDate && (
                                <div className="text-sm text-red-600">Terminated on {new Date(historyEmployee.terminationDate).toLocaleDateString()}</div>
                            )}
                        </div>
                        <Button 
                            size="sm" 
                            variant="outline"
                            onClick={async () => {
                                if (historyEmployee) {
                                    setIsLedgerLoading(true);
                                    try {
                                        const joiningDate = historyEmployee.joiningDate;
                                        const currentDate = new Date().toISOString().split('T')[0];
                                        await employeesService.generateEmployeeLedger(historyEmployee.id, joiningDate, currentDate);
                                        const ledger = await employeesService.getEmployeeLedger(historyEmployee.id, joiningDate, currentDate);
                                        setLedgerItems(ledger);
                                    } catch (e) {
                                        console.error('Error regenerating ledger:', e);
                                    } finally {
                                        setIsLedgerLoading(false);
                                    }
                                }
                            }}
                            disabled={isLedgerLoading}
                        >
                            {isLedgerLoading ? 'Regenerating...' : 'Regenerate Ledger'}
                        </Button>
                    </div>
                    {isLedgerLoading ? (
                        <div className="text-sm text-slate-500">Generating ledger entries...</div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-slate-200 text-sm">
                                <thead className="bg-slate-50">
                                    <tr>
                                        <th className="px-4 py-2 text-left font-medium text-slate-500">Date</th>
                                        <th className="px-4 py-2 text-left font-medium text-slate-500">Salary</th>
                                        <th className="px-4 py-2 text-left font-medium text-slate-500">ESOP Allocated</th>
                                        <th className="px-4 py-2 text-left font-medium text-slate-500">Price per Share</th>
                                        <th className="px-4 py-2 text-left font-medium text-slate-500">Number of Shares</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-slate-200">
                                    {ledgerItems.map((entry: any, idx: number) => (
                                        <tr key={idx}>
                                            <td className="px-4 py-2 text-slate-600">{new Date(entry.ledger_date).toLocaleDateString()}</td>
                                            <td className="px-4 py-2 text-slate-600">{formatCurrencyUtil(Number(entry.salary) || 0, startupCurrency)}</td>
                                            <td className="px-4 py-2 text-slate-600">{formatCurrencyUtil(Number(entry.esop_allocated) || 0, startupCurrency)}</td>
                                            <td className="px-4 py-2 text-slate-600">{formatCurrencyUtil(Number(entry.price_per_share) || 0, startupCurrency)}</td>
                                            <td className="px-4 py-2 text-slate-600">{Number(entry.number_of_shares) || 0}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            {ledgerItems.length === 0 && (
                                <div className="text-center py-8 text-slate-500">
                                    <p>No ledger entries found.</p>
                                    <Button 
                                        onClick={async () => {
                                            if (historyEmployee) {
                                                setIsLedgerLoading(true);
                                                try {
                                                    const joiningDate = historyEmployee.joiningDate;
                                                    const currentDate = new Date().toISOString().split('T')[0];
                                                    await employeesService.generateEmployeeLedger(historyEmployee.id, joiningDate, currentDate);
                                                    const ledger = await employeesService.getEmployeeLedger(historyEmployee.id, joiningDate, currentDate);
                                                    setLedgerItems(ledger);
                                                } catch (e) {
                                                    console.error('Error regenerating ledger:', e);
                                                } finally {
                                                    setIsLedgerLoading(false);
                                                }
                                            }
                                        }}
                                        className="mt-4"
                                    >
                                        Generate Ledger Entries
                                    </Button>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </SimpleModal>

            {/* Terminate Modal */}
            <SimpleModal 
                isOpen={!!isTerminateModalOpen}
                onClose={() => { setIsTerminateModalOpen(null); setTerminationDateDraft(''); }}
                title={isTerminateModalOpen ? `Terminate Employee - ${isTerminateModalOpen.name}` : 'Terminate Employee'}
                width="500px"
            >
                <div className="space-y-3">
                    <p className="text-sm text-slate-600">Set the termination date. Data will be counted up to this date only.</p>
                    <Input label="Termination Date" type="date" value={terminationDateDraft} max={new Date().toISOString().split('T')[0]} onChange={(e) => setTerminationDateDraft(e.target.value)} />
                    <div className="flex justify-end gap-2 pt-2">
                        <Button variant="outline" onClick={() => { setIsTerminateModalOpen(null); setTerminationDateDraft(''); }}>Cancel</Button>
                        <Button onClick={handleTerminateEmployee} className="bg-red-600 text-white">Terminate</Button>
                    </div>
                </div>
            </SimpleModal>

            {/* Increment Modal */}
            <SimpleModal 
                isOpen={!!isIncrementModalOpen}
                onClose={() => { setIsIncrementModalOpen(null); setIncrementDateDraft(''); setIncrementSalaryDraft(''); setIncrementEsopAllocationDraft(''); setIncrementEsopPerAllocationDraft('0'); setIncrementAllocationTypeDraft('one-time'); setIncrementPricePerShareDraft(''); setIncrementNumberOfSharesDraft('0'); }}
                title={isIncrementModalOpen ? `Add Increment - ${isIncrementModalOpen.name}` : 'Add Increment'}
                width="500px"
            >
                <div className="space-y-3">
                    <p className="text-sm text-slate-600">Set the effective date and new values. Previous data remains unchanged before the date.</p>
                    {isIncrementModalOpen && (
                        <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                            <p className="text-sm text-blue-800">
                                <strong>Note:</strong> Increment date must be on or after the employee's joining date ({isIncrementModalOpen.joiningDate}) and cannot be in the future.
                            </p>
                        </div>
                    )}
                    <Input 
                        label="Effective Date" 
                        type="date" 
                        value={incrementDateDraft} 
                        onChange={(e) => setIncrementDateDraft(e.target.value)}
                        min={isIncrementModalOpen ? isIncrementModalOpen.joiningDate : undefined}
                        max={new Date().toISOString().split('T')[0]}
                    />
                    <Input label="New Salary (Annual)" type="number" min="0" value={incrementSalaryDraft} onChange={(e) => setIncrementSalaryDraft(e.target.value)} />
                    <Input 
                        label={`ESOP Allocation (${startupCurrency})`} 
                        type="number" 
                        min="0" 
                        value={incrementEsopAllocationDraft}
                        onChange={(e) => {
                            const val = e.target.value;
                            setIncrementEsopAllocationDraft(val);
                            const amount = parseFloat(val) || 0;
                            const periods = incrementAllocationTypeDraft === 'monthly' ? 12 : incrementAllocationTypeDraft === 'quarterly' ? 4 : 1;
                            setIncrementEsopPerAllocationDraft(String(amount / periods));
                            
                            // Auto-calculate number of shares
                            const pricePerShareValue = pricePerShare || 0;
                            const numberOfShares = calculateNumberOfShares(amount, pricePerShareValue);
                            setIncrementNumberOfSharesDraft(String(numberOfShares));
                        }}
                    />
                    <Select 
                        label="Allocation Type" 
                        value={incrementAllocationTypeDraft}
                        onChange={(e) => {
                            const type = e.target.value as 'one-time' | 'annually' | 'quarterly' | 'monthly';
                            setIncrementAllocationTypeDraft(type);
                            const amount = parseFloat(incrementEsopAllocationDraft) || 0;
                            const periods = type === 'monthly' ? 12 : type === 'quarterly' ? 4 : 1;
                            setIncrementEsopPerAllocationDraft(String(amount / periods));
                            
                            // Auto-calculate number of shares
                            const pricePerShareValue = pricePerShare || 0;
                            const numberOfShares = calculateNumberOfShares(amount, pricePerShareValue);
                            setIncrementNumberOfSharesDraft(String(numberOfShares));
                        }}
                    >
                        <option value="one-time">One-time</option>
                        <option value="annually">Annually</option>
                        <option value="quarterly">Quarterly</option>
                        <option value="monthly">Monthly</option>
                    </Select>
                    <Input 
                        label="ESOP per Allocation" 
                        type="number" 
                        min="0"
                        value={incrementEsopPerAllocationDraft}
                        readOnly
                    />
                    <Input 
                        label={`Price per Share (${startupCurrency})`} 
                        type="number" 
                        min="0"
                        value={incrementPricePerShareDraft || pricePerShare || 0}
                        readOnly
                        placeholder="Auto-filled from Cap Table"
                    />
                    <Input 
                        label="Number of Shares" 
                        type="number" 
                        min="0"
                        value={incrementNumberOfSharesDraft}
                        readOnly
                        placeholder="Auto-calculated"
                    />
                    <div className="flex justify-end gap-2 pt-2">
                        <Button variant="outline" onClick={() => { setIsIncrementModalOpen(null); setIncrementDateDraft(''); setIncrementSalaryDraft(''); setIncrementEsopAllocationDraft(''); setIncrementEsopPerAllocationDraft('0'); setIncrementAllocationTypeDraft('one-time'); setIncrementPricePerShareDraft(''); setIncrementNumberOfSharesDraft('0'); }}>Cancel</Button>
                        <Button onClick={handleAddIncrement}>Save</Button>
                    </div>
                </div>
            </SimpleModal>
            {editingEmployee && (
                <SimpleModal
                    isOpen={!!editingEmployee}
                    onClose={() => {
                        setEditingEmployee(null);
                        setEditContractFile(null);
                        setEditContractUrl('');
                    }}
                    title={`Edit Employee - ${editingEmployee.name}`}
                    width="800px"
                >
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Input label="Name" value={editFormData.name} onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })} />
                        <Input 
                            label="Date of Joining" 
                            type="date" 
                            value={editFormData.joiningDate?.slice(0,10) || ''}
                            max={new Date().toISOString().split('T')[0]}
                            onChange={(e) => setEditFormData({ ...editFormData, joiningDate: e.target.value })} 
                        />
                        <Select label="Entity" value={editFormData.entity} onChange={(e) => setEditFormData({ ...editFormData, entity: e.target.value })}>
                            {entities.map((entity, index) => (
                                <option key={index} value={entity}>{entity}</option>
                            ))}
                        </Select>
                        <Input label="Department" value={editFormData.department} onChange={(e) => setEditFormData({ ...editFormData, department: e.target.value })} />
                        <Input label="Salary" type="number" value={editFormData.salary} onChange={(e) => setEditFormData({ ...editFormData, salary: Number(e.target.value) || 0 })} />
                        <Input label={`ESOP Allocation (${startupCurrency})`} type="number" value={editFormData.esopAllocation} onChange={(e) => {
                            const val = Number(e.target.value) || 0;
                            setEditFormData({ ...editFormData, esopAllocation: val, esopPerAllocation: editFormData.allocationType === 'monthly' ? val/12 : editFormData.allocationType === 'quarterly' ? val/4 : val });
                        }} />
                        <Select label="Allocation Type" value={editFormData.allocationType} onChange={(e) => {
                            const type = e.target.value as 'one-time' | 'annually' | 'quarterly' | 'monthly';
                            const amount = editFormData.esopAllocation || 0;
                            const periods = type === 'monthly' ? 12 : type === 'quarterly' ? 4 : 1;
                            setEditFormData({ ...editFormData, allocationType: type, esopPerAllocation: amount / periods });
                        }}>
                            <option value="one-time">One-time</option>
                            <option value="annually">Annually</option>
                            <option value="quarterly">Quarterly</option>
                            <option value="monthly">Monthly</option>
                        </Select>
                        <Input label="ESOP per Allocation" type="number" value={editFormData.esopPerAllocation} readOnly />
                        <Input 
                            label={`Price per Share (${startupCurrency})`} 
                            type="number" 
                            value={editFormData.pricePerShare} 
                            readOnly
                            placeholder="Auto-filled from Cap Table"
                        />
                        <Input 
                            label="Number of Shares" 
                            type="number" 
                            value={editFormData.numberOfShares} 
                            readOnly
                            placeholder="Auto-calculated"
                        />
                        <CloudDriveInput
                            value={editContractUrl}
                            onChange={(url) => {
                                // If URL is provided, clear the file and update URL
                                setEditContractUrl(url);
                                setEditContractFile(null);
                            }}
                            onFileSelect={(file) => {
                                console.log('📥 Edit: Employee contract file selected:', file?.name);
                                if (file) {
                                    setEditContractFile(file);
                                    // Clear URL when file is selected
                                    setEditContractUrl('');
                                }
                            }}
                            placeholder="Paste your cloud drive link here..."
                            label="Employee Contract"
                            accept=".pdf,.doc,.docx"
                            maxSize={10}
                            documentType="employee contract"
                            showPrivacyMessage={false}
                        />
                        {editContractFile && (
                            <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded text-sm text-green-700">
                                📄 File selected: {editContractFile.name} ({(editContractFile.size / 1024 / 1024).toFixed(2)} MB)
                            </div>
                        )}
                        <input type="hidden" id="edit-contract-url" name="edit-contract-url" />
                        <div className="flex justify-end gap-2 pt-2 md:col-span-2">
                            <Button variant="outline" onClick={() => setEditingEmployee(null)}>Cancel</Button>
                            <Button onClick={saveEditEmployee}>Save</Button>
                        </div>
                    </div>
                </SimpleModal>
            )}
        </div>
    );
};

export default EmployeesTab;