import { supabase } from './supabase';
import { Employee, EmployeeLedgerEntry } from '../types';
import { validateJoiningDate } from './dateValidation';

export interface EmployeeFilters {
  entity?: string;
  department?: string;
  year?: number;
}

export interface EmployeeSummary {
  total_employees: number;
  total_salary_expense: number;
  total_esop_allocated: number;
  avg_salary: number;
  avg_esop_allocation: number;
}

export interface DepartmentData {
  department_name: string;
  employee_count: number;
  total_salary: number;
  total_esop: number;
}

export interface MonthlySalaryData {
  month_name: string;
  total_salary: number;
  total_esop: number;
}

export interface EmployeeIncrementRecord {
  id: string;
  employee_id: string;
  effective_date: string;
  salary: number;
  esop_allocation: number;
  allocation_type: 'one-time' | 'annually' | 'quarterly' | 'monthly';
  esop_per_allocation: number;
  price_per_share?: number;
  number_of_shares?: number;
}

class EmployeesService {
  async getIncrementsForEmployee(employeeId: string): Promise<EmployeeIncrementRecord[]> {
    const { data, error } = await supabase
      .from('employees_increments')
      .select('*')
      .eq('employee_id', employeeId)
      .order('effective_date', { ascending: true });
    if (error) throw error;
    return (data || []).map(r => ({
      id: r.id,
      employee_id: r.employee_id,
      effective_date: r.effective_date,
      salary: Number(r.salary) || 0,
      esop_allocation: Number(r.esop_allocation) || 0,
      allocation_type: r.allocation_type,
      esop_per_allocation: Number(r.esop_per_allocation) || 0,
    }));
  }

  async getIncrementsForEmployees(employeeIds: string[]): Promise<EmployeeIncrementRecord[]> {
    if (!employeeIds || employeeIds.length === 0) return [];
    try {
      const { data, error } = await supabase
        .from('employees_increments')
        .select('*')
        .in('employee_id', employeeIds)
        .order('effective_date', { ascending: true });
      if (error) throw error;
      return (data || []).map(r => ({
        id: r.id,
        employee_id: r.employee_id,
        effective_date: r.effective_date,
        salary: Number(r.salary) || 0,
        esop_allocation: Number(r.esop_allocation) || 0,
        allocation_type: r.allocation_type,
        esop_per_allocation: Number(r.esop_per_allocation) || 0,
      }));
    } catch (err: any) {
      if (err?.status === 404) return [];
      throw err;
    }
  }

  async updateIncrement(incrementId: string, fields: Partial<{
    effective_date: string;
    salary: number;
    esop_allocation: number;
    allocation_type: 'one-time' | 'annually' | 'quarterly' | 'monthly';
    esop_per_allocation: number;
  }>): Promise<void> {
    const { error } = await supabase
      .from('employees_increments')
      .update(fields as any)
      .eq('id', incrementId);
    if (error) throw error;
  }
  // =====================================================
  // CRUD OPERATIONS
  // =====================================================

  async getEmployees(startupId: number, filters?: EmployeeFilters): Promise<Employee[]> {
    let query = supabase
      .from('employees')
      .select('*')
      .eq('startup_id', startupId)
      .order('joining_date', { ascending: false });

    if (filters?.entity && filters.entity !== 'All Entities') {
      query = query.eq('entity', filters.entity);
    }

    if (filters?.department && filters.department !== 'All Departments') {
      query = query.eq('department', filters.department);
    }

    if (filters?.year) {
      query = query.eq('EXTRACT(YEAR FROM joining_date)', filters.year);
    }

    const { data, error } = await query;
    if (error) throw error;

    return (data || []).map(record => ({
      id: record.id,
      name: record.name,
      joiningDate: record.joining_date,
      entity: record.entity,
      department: record.department,
      salary: record.salary,
      esopAllocation: record.esop_allocation,
      allocationType: record.allocation_type,
      esopPerAllocation: record.esop_per_allocation,
      pricePerShare: record.price_per_share,
      numberOfShares: record.number_of_shares,
      contractUrl: record.contract_url,
      terminationDate: record.termination_date
    }));
  }

  async addEmployee(startupId: number, employeeData: Omit<Employee, 'id'>): Promise<Employee> {
    // Validate joining date (no future dates allowed)
    const dateValidation = validateJoiningDate(employeeData.joiningDate);
    if (!dateValidation.isValid) {
      throw new Error(dateValidation.error);
    }

    // Validation: Check if employee joining date is before company registration date
    const { data: startupData, error: startupError } = await supabase
      .from('startups')
      .select('registration_date')
      .eq('id', startupId)
      .single();

    if (startupError) throw startupError;

    if (startupData?.registration_date && employeeData.joiningDate) {
      const joiningDate = new Date(employeeData.joiningDate);
      const registrationDate = new Date(startupData.registration_date);
      
      if (joiningDate < registrationDate) {
        throw new Error(`Employee joining date cannot be before the company registration date (${startupData.registration_date}). Please select a date on or after the registration date.`);
      }
    }

    const { data, error } = await supabase
      .from('employees')
      .insert({
        startup_id: startupId,
        name: employeeData.name,
        joining_date: employeeData.joiningDate,
        entity: employeeData.entity,
        department: employeeData.department,
        salary: employeeData.salary,
        esop_allocation: employeeData.esopAllocation,
        allocation_type: employeeData.allocationType,
        esop_per_allocation: employeeData.esopPerAllocation,
        price_per_share: employeeData.pricePerShare || 0,
        number_of_shares: employeeData.numberOfShares || 0,
        contract_url: employeeData.contractUrl,
        termination_date: employeeData.terminationDate || null
      })
      .select()
      .single();

    if (error) throw error;

    // Create financial records for the new employee
    try {
      const { data: financialResult, error: financialError } = await supabase.rpc(
        'insert_monthly_salary_expenses_for_startup',
        {
          p_startup_id: startupId,
          p_run_date: new Date().toISOString().split('T')[0]
        }
      );
      
      if (financialError) {
        console.warn('Failed to create financial records for new employee:', financialError);
        // Don't throw error here as the employee was created successfully
      } else {
        console.log(`Created ${financialResult || 0} financial records for new employee ${data.id}`);
      }
    } catch (financialError) {
      console.warn('Failed to create financial records for new employee:', financialError);
      // Don't throw error here as the employee was created successfully
    }

    return {
      id: data.id,
      name: data.name,
      joiningDate: data.joining_date,
      entity: data.entity,
      department: data.department,
      salary: data.salary,
      esopAllocation: data.esop_allocation,
      allocationType: data.allocation_type,
      esopPerAllocation: data.esop_per_allocation,
      pricePerShare: data.price_per_share,
      numberOfShares: data.number_of_shares,
      contractUrl: data.contract_url,
      terminationDate: data.termination_date
    };
  }

  async updateEmployee(id: string, employeeData: Partial<Employee>): Promise<Employee> {
    // If joining date is being updated, validate it
    if (employeeData.joiningDate !== undefined) {
      // Validate joining date (no future dates allowed)
      const dateValidation = validateJoiningDate(employeeData.joiningDate);
      if (!dateValidation.isValid) {
        throw new Error(dateValidation.error);
      }

      // First get the startup_id for this employee
      const { data: employeeRecord, error: employeeError } = await supabase
        .from('employees')
        .select('startup_id')
        .eq('id', id)
        .single();

      if (employeeError) throw employeeError;

      // Get the startup's registration date
      const { data: startupData, error: startupError } = await supabase
        .from('startups')
        .select('registration_date')
        .eq('id', employeeRecord.startup_id)
        .single();

      if (startupError) throw startupError;

      if (startupData?.registration_date) {
        const joiningDate = new Date(employeeData.joiningDate);
        const registrationDate = new Date(startupData.registration_date);
        
        if (joiningDate < registrationDate) {
          throw new Error(`Employee joining date cannot be before the company registration date (${startupData.registration_date}). Please select a date on or after the registration date.`);
        }
      }
    }

    const updateData: any = {};
    
    if (employeeData.name !== undefined) updateData.name = employeeData.name;
    if (employeeData.joiningDate !== undefined) updateData.joining_date = employeeData.joiningDate;
    if (employeeData.entity !== undefined) updateData.entity = employeeData.entity;
    if (employeeData.department !== undefined) updateData.department = employeeData.department;
    if (employeeData.salary !== undefined) updateData.salary = employeeData.salary;
    if (employeeData.esopAllocation !== undefined) updateData.esop_allocation = employeeData.esopAllocation;
    if (employeeData.allocationType !== undefined) updateData.allocation_type = employeeData.allocationType;
    if (employeeData.esopPerAllocation !== undefined) updateData.esop_per_allocation = employeeData.esopPerAllocation;
    if (employeeData.contractUrl !== undefined) updateData.contract_url = employeeData.contractUrl;
    if (employeeData.terminationDate !== undefined) updateData.termination_date = employeeData.terminationDate;

    const { data, error } = await supabase
      .from('employees')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return {
      id: data.id,
      name: data.name,
      joiningDate: data.joining_date,
      entity: data.entity,
      department: data.department,
      salary: data.salary,
      esopAllocation: data.esop_allocation,
      allocationType: data.allocation_type,
      esopPerAllocation: data.esop_per_allocation,
      contractUrl: data.contract_url,
      terminationDate: data.termination_date
    };
  }

  // Soft terminate employee: set termination_date
  async terminateEmployee(id: string, terminationDate: string): Promise<void> {
    const { error } = await supabase
      .from('employees')
      .update({ termination_date: terminationDate })
      .eq('id', id);
    if (error) throw error;
  }

  // Record salary increment change effective from a date by updating base salary and storing history
  async addSalaryIncrement(
    id: string,
    newSalary: number,
    effectiveDate: string,
    esopAllocation?: number,
    allocationType?: 'one-time' | 'annually' | 'quarterly' | 'monthly',
    esopPerAllocation?: number,
    pricePerShare?: number,
    numberOfShares?: number
  ): Promise<void> {
    // First, get the employee's joining date for validation
    const { data: employeeData, error: employeeError } = await supabase
      .from('employees')
      .select('joining_date')
      .eq('id', id)
      .single();

    if (employeeError) throw employeeError;
    if (!employeeData?.joining_date) {
      throw new Error('Employee joining date not found');
    }

    // Validate the increment date
    const { validateIncrementDate } = await import('./dateValidation');
    const dateValidation = validateIncrementDate(effectiveDate, employeeData.joining_date);
    if (!dateValidation.isValid) {
      throw new Error(dateValidation.error);
    }

    // Write to history table; do not change base employee row (so past months stay intact)
    const payload: any = {
      employee_id: id,
      effective_date: effectiveDate,
      salary: newSalary,
      esop_allocation: esopAllocation ?? 0,
      allocation_type: allocationType ?? 'one-time',
      esop_per_allocation: esopPerAllocation ?? 0,
      price_per_share: pricePerShare ?? 0,
      number_of_shares: numberOfShares ?? 0,
    };
    const { error } = await supabase
      .from('employees_increments')
      .insert(payload);
    if (error) throw error;

    // Manually update financial records for future months
    try {
      const { data: updateResult, error: updateError } = await supabase.rpc(
        'update_future_salary_records_for_employee',
        {
          p_employee_id: id,
          p_effective_date: effectiveDate
        }
      );
      
      if (updateError) {
        console.warn('Failed to update financial records automatically:', updateError);
        // Don't throw error here as the increment was successful
      } else {
        console.log(`Updated ${updateResult || 0} financial records for employee ${id}`);
      }
    } catch (updateError) {
      console.warn('Failed to update financial records:', updateError);
      // Don't throw error here as the increment was successful
    }
  }

  async deleteEmployee(id: string): Promise<void> {
    const { error } = await supabase
      .from('employees')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }

  // Get current effective salary for an employee (considering increments)
  async getCurrentEffectiveSalary(employeeId: string, asOfDate?: string): Promise<number> {
    const targetDate = asOfDate || new Date().toISOString().split('T')[0];
    
    try {
      // First get the base salary from the employee record
      const { data: employeeData, error: employeeError } = await supabase
        .from('employees')
        .select('salary')
        .eq('id', employeeId)
        .single();

      if (employeeError) {
        console.error('Error getting employee base salary:', employeeError);
        return 0;
      }

      if (!employeeData?.salary) {
        console.warn('No base salary found for employee:', employeeId);
        return 0;
      }

      let currentSalary = employeeData.salary;

      // Check for any increments that are effective on or before the target date
      const { data: increments, error: incrementsError } = await supabase
        .from('employees_increments')
        .select('salary, effective_date')
        .eq('employee_id', employeeId)
        .lte('effective_date', targetDate)
        .order('effective_date', { ascending: false })
        .limit(1);

      if (incrementsError) {
        console.warn('Error getting increments for employee:', incrementsError);
        // Return base salary if we can't get increments
        return currentSalary;
      }

      // If there's a more recent increment, use that salary
      if (increments && increments.length > 0) {
        currentSalary = increments[0].salary;
        console.log(`Using increment salary ${currentSalary} for employee ${employeeId} (base was ${employeeData.salary})`);
      }

      return currentSalary;
    } catch (error) {
      console.error('Error getting current effective salary:', error);
      return 0;
    }
  }

  // Manually refresh financial records for a startup (useful after salary changes)
  async refreshFinancialRecordsForStartup(startupId: number): Promise<number> {
    try {
      const { data, error } = await supabase.rpc('insert_monthly_salary_expenses_for_startup', {
        p_startup_id: startupId,
        p_run_date: new Date().toISOString().split('T')[0]
      });
      
      if (error) throw error;
      return data || 0;
    } catch (error) {
      console.error('Error refreshing financial records:', error);
      return 0;
    }
  }

  // =====================================================
  // ANALYTICS AND CHARTS DATA
  // =====================================================

  async getEmployeeSummary(startupId: number): Promise<EmployeeSummary> {
    try {
      const { data, error } = await supabase.rpc('get_employee_summary', { p_startup_id: startupId });
      if (error) throw error;
      if (data && Array.isArray(data) && data[0]) {
        const row = data[0];
        return {
          total_employees: row.total_employees ?? 0,
          total_salary_expense: row.total_salary_expense ?? 0,
          total_esop_allocated: row.total_esop_allocated ?? 0,
          avg_salary: row.avg_salary ?? 0,
          avg_esop_allocation: row.avg_esop_allocation ?? 0,
        };
      }
      // Fallback to manual if no data returned
      return this.calculateEmployeeSummaryManually(startupId);
    } catch (rpcError) {
      console.warn('RPC get_employee_summary failed, falling back to manual calc:', rpcError);
      return this.calculateEmployeeSummaryManually(startupId);
    }
  }

  async getEmployeesByDepartment(startupId: number): Promise<DepartmentData[]> {
    // Temporarily use only manual calculation until RPC functions are fixed
    console.log('🔍 Using manual calculation for department data (startup_id:', startupId, ')');
    return this.calculateEmployeesByDepartmentManually(startupId);
  }

  async getMonthlySalaryData(startupId: number, year: number): Promise<MonthlySalaryData[]> {
    // Temporarily use only manual calculation until RPC functions are fixed
    console.log('🔍 Using manual calculation for monthly data (startup_id:', startupId, ', year:', year, ')');
    return this.calculateMonthlySalaryDataManually(startupId, year);
  }

  // =====================================================
  // EMPLOYEE LEDGER FUNCTIONS
  // =====================================================

  async getEmployeeLedger(employeeId: string, startDate?: string, endDate?: string): Promise<EmployeeLedgerEntry[]> {
    let query = supabase
      .from('employee_ledger')
      .select('*')
      .eq('employee_id', employeeId)
      .order('ledger_date', { ascending: true });

    if (startDate) {
      query = query.gte('ledger_date', startDate);
    }
    if (endDate) {
      query = query.lte('ledger_date', endDate);
    }

    const { data, error } = await query;
    if (error) throw error;

    return data || [];
  }

  async generateEmployeeLedger(employeeId: string, startDate: string, endDate: string): Promise<number> {
    const { data, error } = await supabase.rpc('generate_employee_ledger_entries', {
      p_employee_id: employeeId,
      p_start_date: startDate,
      p_end_date: endDate
    });

    if (error) throw error;
    return data || 0;
  }

  async generateStartupEmployeeLedger(startupId: number, startDate: string, endDate: string): Promise<number> {
    const { data, error } = await supabase.rpc('generate_startup_employee_ledger', {
      p_startup_id: startupId,
      p_start_date: startDate,
      p_end_date: endDate
    });

    if (error) throw error;
    return data || 0;
  }

  async deleteEmployeeLedger(employeeId: string, startDate?: string, endDate?: string): Promise<void> {
    let query = supabase
      .from('employee_ledger')
      .delete()
      .eq('employee_id', employeeId);

    if (startDate) {
      query = query.gte('ledger_date', startDate);
    }
    if (endDate) {
      query = query.lte('ledger_date', endDate);
    }

    const { error } = await query;
    if (error) throw error;
  }

  // Sum total number_of_shares across ledger for all employees of a startup
  async getTotalLedgerSharesForStartup(startupId: number, startDate?: string, endDate?: string): Promise<number> {
    // Join employee_ledger with employees to filter by startup_id
    let query = supabase
      .from('employee_ledger')
      .select('number_of_shares, employees!inner(startup_id)')
      .eq('employees.startup_id', startupId);

    if (startDate) {
      query = query.gte('ledger_date', startDate);
    }
    if (endDate) {
      query = query.lte('ledger_date', endDate);
    }

    const { data, error } = await query;
    if (error) throw error;
    const total = (data || []).reduce((sum: number, row: any) => sum + (Number(row.number_of_shares) || 0), 0);
    return total;
  }

  // =====================================================
  // UTILITY FUNCTIONS
  // =====================================================

  async getEntities(startupId: number): Promise<string[]> {
    const { data, error } = await supabase
      .from('employees')
      .select('entity')
      .eq('startup_id', startupId)
      .order('entity');

    if (error) throw error;
    return [...new Set(data?.map(item => item.entity) || [])];
  }

  async getDepartments(startupId: number): Promise<string[]> {
    const { data, error } = await supabase
      .from('employees')
      .select('department')
      .eq('startup_id', startupId)
      .order('department');

    if (error) throw error;
    return [...new Set(data?.map(item => item.department) || [])];
  }

  async getAvailableYears(startupId: number): Promise<number[]> {
    const { data, error } = await supabase
      .from('employees')
      .select('joining_date')
      .eq('startup_id', startupId);

    if (error) throw error;
    
    const years = data?.map(item => new Date(item.joining_date).getFullYear()) || [];
    const uniqueYears = [...new Set(years)].sort((a, b) => b - a); // Descending order
    
    // If no years found, return current year
    if (uniqueYears.length === 0) {
      return [new Date().getFullYear()];
    }
    
    return uniqueYears;
  }

  // =====================================================
  // FILE UPLOAD HELPERS
  // =====================================================

  async uploadContract(file: File, startupId: number): Promise<string> {
    const fileName = `${startupId}/${Date.now()}_${file.name}`;
    const { data, error } = await supabase.storage
      .from('employee-contracts')
      .upload(fileName, file);

    if (error) throw error;

    const { data: urlData } = supabase.storage
      .from('employee-contracts')
      .getPublicUrl(fileName);

    return urlData.publicUrl;
  }

  async deleteContract(url: string): Promise<void> {
    const path = url.split('/').slice(-2).join('/'); // Extract path from URL
    const { error } = await supabase.storage
      .from('employee-contracts')
      .remove([path]);

    if (error) throw error;
  }

  // =====================================================
  // DOWNLOAD HELPERS
  // =====================================================

  async getContractDownloadUrl(contractUrl: string): Promise<string> {
    try {
      // If the URL is already a valid public URL, return it
      if (contractUrl && contractUrl.startsWith('http')) {
        return contractUrl;
      }

      // If it's a file path, generate the public URL
      if (contractUrl && !contractUrl.startsWith('http')) {
        const { data } = supabase.storage
          .from('employee-contracts')
          .getPublicUrl(contractUrl);
        
        return data.publicUrl;
      }

      throw new Error('Invalid contract URL');
    } catch (error) {
      console.error('Error generating download URL:', error);
      throw error;
    }
  }

  // =====================================================
  // MANUAL CALCULATION FALLBACKS
  // =====================================================

  private async calculateEmployeeSummaryManually(startupId: number): Promise<EmployeeSummary> {
    const employees = await this.getEmployees(startupId);
    
    const total_employees = employees.length;
    const total_salary_expense = employees.reduce((sum, emp) => sum + emp.salary, 0);
    const total_esop_allocated = employees.reduce((sum, emp) => sum + emp.esopAllocation, 0);
    const avg_salary = total_employees > 0 ? total_salary_expense / total_employees : 0;
    const avg_esop_allocation = total_employees > 0 ? total_esop_allocated / total_employees : 0;
    
    return {
      total_employees,
      total_salary_expense,
      total_esop_allocated,
      avg_salary,
      avg_esop_allocation
    };
  }

  private async calculateEmployeesByDepartmentManually(startupId: number): Promise<DepartmentData[]> {
    const employees = await this.getEmployees(startupId);
    
    const departmentMap = new Map<string, { count: number; salary: number; esop: number }>();
    
    employees.forEach(emp => {
      const existing = departmentMap.get(emp.department) || { count: 0, salary: 0, esop: 0 };
      departmentMap.set(emp.department, {
        count: existing.count + 1,
        salary: existing.salary + emp.salary,
        esop: existing.esop + emp.esopAllocation
      });
    });
    
    return Array.from(departmentMap.entries()).map(([department_name, data]) => ({
      department_name,
      employee_count: data.count,
      total_salary: data.salary,
      total_esop: data.esop
    })).sort((a, b) => b.employee_count - a.employee_count);
  }

  private async calculateMonthlySalaryDataManually(startupId: number, year: number): Promise<MonthlySalaryData[]> {
    const employees = await this.getEmployees(startupId);

    // Initialize all 12 months with zeroed totals
    const monthOrder = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthlyMap = new Map<string, { salary: number; esop: number }>();
    monthOrder.forEach(m => monthlyMap.set(m, { salary: 0, esop: 0 }));

    // Prefetch increment histories for all employees in parallel
    const incrementsMap = new Map<string, EmployeeIncrementRecord[]>();
    const incrementsArrays = await Promise.all(
      employees.map(emp => this.getIncrementsForEmployee(emp.id))
    );
    employees.forEach((emp, idx) => {
      incrementsMap.set(emp.id, incrementsArrays[idx] || []);
    });

    employees.forEach(emp => {
      const joiningDate = new Date(emp.joiningDate);
      const terminationDate = emp.terminationDate ? new Date(emp.terminationDate) : null;
      // Determine effective compensation for each month using increment history
      const increments = incrementsMap.get(emp.id) || [];

      // For each month in the requested year, include employee if active in that month
      monthOrder.forEach((label, idx) => {
        const monthStart = new Date(year, idx, 1);
        const monthEnd = new Date(year, idx + 1, 0); // last day of month

        // Active if joined on/before the end of the month and not terminated before the start of the month
        const activeThisMonth = (joiningDate <= monthEnd && joiningDate.getFullYear() <= year) && (!terminationDate || terminationDate >= monthStart);
        if (activeThisMonth) {
          const existing = monthlyMap.get(label) || { salary: 0, esop: 0 };
          // pick best applicable record (base vs latest increment whose effective_date <= monthEnd)
          const { applicable, applicableEffectiveDate } = (() => {
            const applicableIncs = increments.filter(inc => new Date(inc.effective_date) <= monthEnd);
            if (applicableIncs.length === 0) {
              return {
                applicable: {
                  salary: emp.salary || 0,
                  esop_allocation: emp.esopAllocation || 0,
                  allocation_type: emp.allocationType,
                  esop_per_allocation: emp.esopPerAllocation || 0,
                },
                applicableEffectiveDate: joiningDate,
              };
            }
            const latest = applicableIncs[applicableIncs.length - 1];
            return {
              applicable: {
                salary: latest.salary || 0,
                esop_allocation: latest.esop_allocation || 0,
                allocation_type: latest.allocation_type,
                esop_per_allocation: latest.esop_per_allocation || 0,
              },
              applicableEffectiveDate: new Date(latest.effective_date),
            };
          })();

          const monthlySalaryPortion = (applicable.salary || 0) / 12;
          const esopAllocationTotal = applicable.esop_allocation || 0;
          const esopPerAllocation = applicable.esop_per_allocation || 0;

          // Compute ESOP monthly allocation based on allocation type
          let esopMonthlyPortion = 0;
          switch (applicable.allocation_type) {
            case 'monthly':
              esopMonthlyPortion = esopPerAllocation; // already monthly
              break;
            case 'quarterly':
              esopMonthlyPortion = esopPerAllocation / 3; // spread across months in a quarter
              break;
            case 'annually':
              esopMonthlyPortion = esopPerAllocation / 12; // spread across months in a year
              break;
            case 'one-time':
            default:
              // One-time applies in the effective month (joining month for base, increment's effective month for increments)
              const effectiveYear = applicableEffectiveDate.getFullYear();
              const effectiveMonthIdx = effectiveYear === year ? applicableEffectiveDate.getMonth() : -1;
              if (effectiveMonthIdx === idx) {
                esopMonthlyPortion = esopAllocationTotal;
              } else {
                esopMonthlyPortion = 0;
              }
              break;
          }

          monthlyMap.set(label, {
            salary: existing.salary + monthlySalaryPortion,
            esop: existing.esop + esopMonthlyPortion,
          });
        }
      });
    });

    // Convert ESOP monthly values to cumulative allocation over the year
    let cumulativeEsop = 0;
    return monthOrder.map(label => {
      const data = monthlyMap.get(label) || { salary: 0, esop: 0 };
      cumulativeEsop += data.esop;
      return {
        month_name: label,
        total_salary: data.salary,
        total_esop: cumulativeEsop,
      };
    });
  }
}

export const employeesService = new EmployeesService();
