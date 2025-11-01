import React, { useState, useEffect } from 'react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, PieChart, Pie, Cell } from 'recharts';
import { Startup, UserRole, Expense, Revenue } from '../../types';
import { financialsService, MonthlyFinancialData, VerticalData, FinancialSummary, FinancialFilters } from '../../lib/financialsService';
import { capTableService } from '../../lib/capTableService';
import Card from '../ui/Card';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Select from '../ui/Select';
import DateInput from '../DateInput';
import CloudDriveInput from '../ui/CloudDriveInput';
import { Edit, Plus, Upload, Download, Trash2 } from 'lucide-react';

interface FinancialsTabProps {
  startup: Startup;
  userRole?: UserRole;
  isViewOnly?: boolean;
}

import { formatCurrency, formatCurrencyCompact } from '../../lib/utils';
import { useStartupCurrency } from '../../lib/hooks/useStartupCurrency';

const COLORS = ['#1e40af', '#1d4ed8', '#3b82f6', '#16a34a', '#dc2626', '#ea580c', '#7c3aed', '#059669', '#d97706', '#be123c'];

const FinancialsTab: React.FC<FinancialsTabProps> = ({ startup, userRole, isViewOnly = false }) => {
  const startupCurrency = useStartupCurrency(startup);
  const [filters, setFilters] = useState<FinancialFilters>({ 
    entity: 'all', 
    year: 'all' // Changed from new Date().getFullYear() to 'all' to show all years by default
  });
  
  const [monthlyData, setMonthlyData] = useState<MonthlyFinancialData[]>([]);
  const [revenueByVertical, setRevenueByVertical] = useState<VerticalData[]>([]);
  const [expensesByVertical, setExpensesByVertical] = useState<VerticalData[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [revenues, setRevenues] = useState<Revenue[]>([]);
  const [summary, setSummary] = useState<FinancialSummary | null>(null);
  const [entities, setEntities] = useState<string[]>([]);
  const [verticals, setVerticals] = useState<string[]>([]);
  const [availableYears, setAvailableYears] = useState<(number | 'all')[]>([]);
  const [fundingSources, setFundingSources] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; type: 'expense' | 'revenue'; description: string } | null>(null);
  const [investmentRecordsState, setInvestmentRecordsState] = useState<any[]>([]);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editRecord, setEditRecord] = useState<{
    id: string;
    type: 'expense' | 'revenue';
    date: string;
    entity: string;
    description?: string;
    vertical: string;
    amount: number;
    fundingSource?: string;
    cogs?: number;
  } | null>(null);

  // Keep Financials in sync with Equity Allocation: derive total funding from investment records
  const totalFundingFromRecords = (investmentRecordsState || []).reduce((sum: number, rec: any) => sum + (rec?.amount || 0), 0);

  // Form states
  const [formState, setFormState] = useState({
    date: '',
    entity: 'Parent Company',
    description: '',
    vertical: '',
    amount: '',
    cogs: '',
    fundingSource: 'Revenue',
    attachment: null as File | null,
    cloudDriveUrl: ''
  });
  const [formType, setFormType] = useState<'revenue' | 'expense'>('expense');
  const [otherExpenseLabel, setOtherExpenseLabel] = useState<string>('');
  const [otherIncomeLabel, setOtherIncomeLabel] = useState<string>('');

  // CA should have view-only financials
  const canEdit = (userRole === 'Startup' || userRole === 'Admin') && !isViewOnly;

  // Load all data
  useEffect(() => {
    loadFinancialData();
  }, [startup.id, filters]);

  const loadFinancialData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const year = filters.year === 'all' ? new Date().getFullYear() : (filters.year || new Date().getFullYear());

      console.log('🔄 Loading financial data for startup:', startup.id, 'year:', year, 'filter year:', filters.year);
      console.log('🏢 Startup object:', startup);

      const [
        allRecords,
        revenueVertical,
        expenseVertical,
        expensesData,
        revenuesData,
        summaryData,
        entitiesData,
        verticalsData,
        yearsData,
        investmentRecords
      ] = await Promise.all([
        financialsService.getFinancialRecords(startup.id, { year }),
        financialsService.getRevenueByVertical(startup.id, year),
        financialsService.getExpensesByVertical(startup.id, year),
        financialsService.getExpenses(startup.id, filters),
        financialsService.getRevenues(startup.id, filters),
        financialsService.getFinancialSummary(startup.id),
        financialsService.getEntities(startup.id),
        financialsService.getVerticals(startup.id),
        financialsService.getAvailableYears(startup.id),
        capTableService.getInvestmentRecords(startup.id)
      ]);

      console.log('📊 Financial data loaded:', {
        startupId: startup.id,
        allRecordsCount: allRecords.length,
        expensesCount: expensesData.length,
        revenuesCount: revenuesData.length,
        summary: summaryData,
        entitiesCount: entitiesData.length,
        verticalsCount: verticalsData.length,
        investmentRecordsCount: investmentRecords.length
      });

      console.log('🔍 Detailed data check:', {
        expenses: expensesData,
        revenues: revenuesData,
        summary: summaryData,
        filters: filters
      });

      console.log('📋 Actual expenses loaded:', expensesData.map(exp => ({
        id: exp.id,
        date: exp.date,
        description: exp.description,
        amount: exp.amount,
        vertical: exp.vertical,
        entity: exp.entity
      })));

      console.log('🔍 Filter analysis:', {
        currentYear: filters.year,
        currentEntity: filters.entity,
        formDate: formState.date,
        formEntity: formState.entity,
        formVertical: formState.vertical,
        yearMatch: filters.year === new Date(formState.date).getFullYear(),
        entityMatch: filters.entity === 'all' || filters.entity === formState.entity
      });

      console.log('📊 Chart data received:', {
        allRecords: allRecords,
        revenueByVertical: revenueVertical,
        expensesByVertical: expenseVertical,
        expensesCount: expensesData.length,
        revenuesCount: revenuesData.length
      });

      // Generate comprehensive monthly data for all 12 months
      const monthlyData: { [key: string]: { revenue: number; expenses: number } } = {};
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      
      // Initialize all months
      months.forEach(month => {
        monthlyData[month] = { revenue: 0, expenses: 0 };
      });
      
      // Aggregate data by month
      allRecords.forEach(record => {
        const monthIndex = new Date(record.date).getMonth();
        const monthName = months[monthIndex];
        
        if (record.record_type === 'revenue') {
          monthlyData[monthName].revenue += record.amount;
        } else {
          monthlyData[monthName].expenses += record.amount;
        }
      });
      
      const finalMonthlyData = months.map(month => ({
        month_name: month,
        revenue: monthlyData[month].revenue,
        expenses: monthlyData[month].expenses
      }));
      const finalRevenueByVertical = revenueVertical || [];
      const finalExpensesByVertical = expenseVertical || [];

      console.log('📊 Final chart data:', {
        monthlyData: finalMonthlyData,
        revenueByVertical: finalRevenueByVertical,
        expensesByVertical: finalExpensesByVertical
      });

      setMonthlyData(finalMonthlyData);
      setRevenueByVertical(finalRevenueByVertical);
      setExpensesByVertical(finalExpensesByVertical);
      setExpenses(expensesData);
      setRevenues(revenuesData);
      setSummary(summaryData);
      setEntities(entitiesData);
      setVerticals(verticalsData);
      
      // Generate years from account creation to current year
      const accountCreationYear = new Date(startup.registrationDate).getFullYear();
      const currentYear = new Date().getFullYear();
      const yearOptions: (number | 'all')[] = ['all'];
      
      for (let year = currentYear; year >= accountCreationYear; year--) {
        yearOptions.push(year);
      }
      
      setAvailableYears(yearOptions);

      console.log('✅ State updated with:', {
        expensesState: expensesData.length,
        revenuesState: revenuesData.length,
        summaryState: summaryData
      });

      // Process investment records to create funding sources
      const sources = ['Revenue']; // Default option
      investmentRecords.forEach(investment => {
        // Use only the investor name without the type suffix to match cap table entries
        sources.push(investment.investorName);
      });
      setFundingSources(sources);
      setInvestmentRecordsState(investmentRecords || []);
      
      console.log('💰 Funding Sources Created:', {
        totalInvestors: investmentRecords.length,
        fundingSources: sources,
        sampleInvestors: investmentRecords.slice(0, 3).map(inv => inv.investorName)
      });
    } catch (error) {
      console.error('❌ Error loading financial data:', error);
      setError('Failed to load financial data. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };


  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormState(prev => ({ ...prev, [name]: name === 'amount' || name === 'cogs' ? parseFloat(value) || 0 : value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEdit) {
      console.log('❌ Cannot edit - user role issue');
      return;
    }

    console.log('🔍 Starting handleSubmit with form data:', formState);
    console.log('🏢 Startup ID being used:', startup.id);

    // Validate form data
    if (!formState.date || !formState.description || !formState.vertical || !formState.amount) {
      console.log('❌ Form validation failed:', {
        date: formState.date,
        description: formState.description,
        vertical: formState.vertical,
        amount: formState.amount
      });
      setError('Please fill in all required fields.');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      let attachmentUrl = '';

      if (formState.attachment) {
        console.log('📎 Uploading attachment:', formState.attachment.name);
        try {
          attachmentUrl = await financialsService.uploadAttachment(formState.attachment, startup.id);
          console.log('📎 Attachment uploaded, URL:', attachmentUrl);
        } catch (uploadError) {
          console.error('❌ Attachment upload failed:', uploadError);
          setError('Failed to upload attachment. Please try again.');
          return;
        }
      } else if (formState.cloudDriveUrl.trim()) {
        console.log('☁️ Using cloud drive URL:', formState.cloudDriveUrl);
        attachmentUrl = formState.cloudDriveUrl;
      }

      const recordData = {
        startup_id: startup.id,
        record_type: formType,
        date: formState.date,
        entity: formState.entity,
        description: formState.description,
        vertical: (
          formType === 'expense' && formState.vertical === 'Other Expenses' && otherExpenseLabel
        ) ? otherExpenseLabel : (
          formType === 'revenue' && formState.vertical === 'Other Income' && otherIncomeLabel
        ) ? otherIncomeLabel : formState.vertical,
        amount: parseFloat(formState.amount.toString()),
        funding_source: formState.fundingSource,
        cogs: formType === 'revenue' ? parseFloat(formState.cogs.toString()) || 0 : 0,
        attachment_url: attachmentUrl
      };

      console.log('💰 Adding financial record:', recordData);

      const newRecord = await financialsService.addFinancialRecord(recordData);
      console.log('✅ Record added successfully:', newRecord);

      // Reset form
      setFormState({
        date: '',
        entity: 'Parent Company',
        description: '',
        vertical: '',
        amount: '',
        cogs: '',
        fundingSource: 'Revenue',
        attachment: null,
        cloudDriveUrl: ''
      });
      setOtherExpenseLabel('');
      setOtherIncomeLabel('');

      console.log('🔄 Reloading financial data...');
      // Force reload data with a small delay to ensure database is updated
      setTimeout(async () => {
        await loadFinancialData();
        // Also run manual calculation as backup to ensure charts update
        await calculateChartDataManually();
        
        // Debug: Check expense data specifically
        const expenseRecords = await financialsService.getExpenses(startup.id, filters);
        console.log('🔍 Debug: Expense records after adding:', expenseRecords);
        console.log('🔍 Debug: Expense verticals:', expenseRecords.map(exp => ({ vertical: exp.vertical, amount: exp.amount })));
        
        console.log('✅ Financial data reloaded successfully');
      }, 500);
    } catch (error) {
      console.error('❌ Error adding record:', error);
      console.error('❌ Error details:', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint
      });
      setError(`Failed to add ${formType}: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteRecord = async (id: string, recordType: 'expense' | 'revenue', description: string) => {
    if (!canEdit) return;
    
    setDeleteTarget({ id, type: recordType, description });
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    
    try {
      setError(null);
      await financialsService.deleteFinancialRecord(deleteTarget.id);
      await loadFinancialData();
      setShowDeleteModal(false);
      setDeleteTarget(null);
    } catch (error) {
      console.error(`Error deleting ${deleteTarget.type}:`, error);
      setError(`Failed to delete ${deleteTarget.type}. Please try again.`);
      setShowDeleteModal(false);
      setDeleteTarget(null);
    }
  };

  const cancelDelete = () => {
    setShowDeleteModal(false);
    setDeleteTarget(null);
  };

  const handleDownloadAttachment = async (attachmentUrl: string) => {
    try {
      const downloadUrl = await financialsService.getAttachmentDownloadUrl(attachmentUrl);
      window.open(downloadUrl, '_blank');
    } catch (error) {
      console.error('Error downloading attachment:', error);
      setError('Failed to download attachment. Please try again.');
    }
  };

  const openEditModalForExpense = (expense: Expense) => {
    setEditRecord({
      id: expense.id,
      type: 'expense',
      date: expense.date,
      entity: expense.entity,
      description: expense.description,
      vertical: expense.vertical,
      amount: expense.amount,
      fundingSource: expense.fundingSource
    });
    setIsEditModalOpen(true);
  };

  const openEditModalForRevenue = (revenue: Revenue) => {
    setEditRecord({
      id: revenue.id,
      type: 'revenue',
      date: revenue.date,
      entity: revenue.entity,
      description: undefined,
      vertical: revenue.vertical,
      amount: revenue.earnings,
      cogs: revenue.cogs
    });
    setIsEditModalOpen(true);
  };

  const handleEditChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    if (!editRecord) return;
    const { name, value } = e.target;
    const parsed = name === 'amount' || name === 'cogs' ? (parseFloat(value) || 0) : value;
    setEditRecord({ ...editRecord, [name]: parsed } as any);
  };

  const saveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editRecord) return;
    try {
      setIsSubmitting(true);
      setError(null);
      const updates: any = {
        date: editRecord.date,
        entity: editRecord.entity,
        vertical: editRecord.vertical,
        amount: editRecord.amount
      };
      if (editRecord.description !== undefined) updates.description = editRecord.description;
      if (editRecord.type === 'expense') {
        updates.funding_source = editRecord.fundingSource || null;
      }
      if (editRecord.type === 'revenue') {
        updates.cogs = editRecord.cogs ?? null;
      }
      await financialsService.updateFinancialRecord(editRecord.id, updates);
      setIsEditModalOpen(false);
      setEditRecord(null);
      await loadFinancialData();
      await calculateChartDataManually();
    } catch (err: any) {
      console.error('Error saving edit:', err);
      setError(err?.message || 'Failed to save changes.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Manual chart data calculation to ensure charts update
  const calculateChartDataManually = async () => {
    try {
      const year = filters.year === 'all' ? new Date().getFullYear() : (filters.year || new Date().getFullYear());
      
      // Get all records for the current year and entity filter
      const recordFilters: FinancialFilters = { year: year };
      if (filters.entity !== 'all') {
        recordFilters.entity = filters.entity;
      }
      const allRecords = await financialsService.getFinancialRecords(startup.id, recordFilters);
      
      console.log('🔍 All records for chart calculation:', allRecords);
      
      // Calculate monthly data
      const monthlyData: { [key: string]: { revenue: number; expenses: number } } = {};
      for (let month = 1; month <= 12; month++) {
        const monthName = new Date(year, month - 1, 1).toLocaleDateString('en-US', { month: 'short' });
        monthlyData[monthName] = { revenue: 0, expenses: 0 };
      }
      
      allRecords.forEach(record => {
        const monthName = new Date(record.date).toLocaleDateString('en-US', { month: 'short' });
        const amt = typeof record.amount === 'string' ? parseFloat(record.amount) || 0 : record.amount || 0;
        if (record.record_type === 'revenue') {
          monthlyData[monthName].revenue += amt;
        } else {
          monthlyData[monthName].expenses += amt;
        }
      });
      
      const finalMonthlyData = Object.entries(monthlyData).map(([month_name, data]) => ({
        month_name,
        revenue: data.revenue,
        expenses: data.expenses
      }));
      
      // Calculate vertical data
      const revenueByVertical: { [key: string]: number } = {};
      const expensesByVertical: { [key: string]: number } = {};
      
      allRecords.forEach(record => {
        console.log('🔍 Processing record:', {
          id: record.id,
          type: record.record_type,
          vertical: record.vertical,
          amount: record.amount
        });
        
        if (record.record_type === 'revenue') {
          revenueByVertical[record.vertical] = (revenueByVertical[record.vertical] || 0) + record.amount;
        } else if (record.record_type === 'expense') {
          expensesByVertical[record.vertical] = (expensesByVertical[record.vertical] || 0) + record.amount;
        }
      });
      
      console.log('🔍 Vertical totals before processing:', {
        revenueByVertical,
        expensesByVertical
      });
      
      const finalRevenueByVertical = Object.entries(revenueByVertical)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value);
        
      const finalExpensesByVertical = Object.entries(expensesByVertical)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value);
      
      console.log('📊 Manual chart calculation:', {
        monthlyData: finalMonthlyData,
        revenueByVertical: finalRevenueByVertical,
        expensesByVertical: finalExpensesByVertical
      });
      
      console.log('🔍 Setting chart data:', {
        monthlyData: finalMonthlyData.length,
        revenueByVertical: finalRevenueByVertical.length,
        expensesByVertical: finalExpensesByVertical.length,
        expensesByVerticalData: finalExpensesByVertical
      });
      
      setMonthlyData(finalMonthlyData);
      setRevenueByVertical(finalRevenueByVertical);
      setExpensesByVertical(finalExpensesByVertical);
    } catch (error) {
      console.error('Error in manual chart calculation:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-slate-600">Loading financial data...</p>
        </div>
    </div>
);
  }

  console.log('🎨 Rendering FinancialsTab with:', {
    expensesCount: expenses.length,
    revenuesCount: revenues.length,
    summary: summary,
    isLoading,
    error
  });

  return (
    <div className="space-y-6">
      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">{error}</p>
          <Button 
            size="sm" 
            variant="outline" 
            onClick={() => setError(null)}
            className="mt-2"
          >
            Dismiss
          </Button>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <p className="text-sm font-medium text-slate-500">Total Funding Received</p>
          <p className="text-2xl font-bold">{(() => {
            const fallback = startup.totalFunding || 0;
            const value = totalFundingFromRecords > 0 ? totalFundingFromRecords : fallback;
            return formatCurrency(value, startupCurrency);
          })()}</p>
        </Card>
        <Card>
          <p className="text-sm font-medium text-slate-500">Total Revenue Till Date</p>
          <p className="text-2xl font-bold">{formatCurrency(summary?.total_revenue || 0, startupCurrency)}</p>
        </Card>
        <Card>
          <p className="text-sm font-medium text-slate-500">Total Expenditure Till Date</p>
          <p className="text-2xl font-bold">{formatCurrency(summary?.total_expenses || 0, startupCurrency)}</p>
        </Card>
        <Card>
            <p className="text-sm font-medium text-slate-500">Total Available Fund</p>
          <p className="text-2xl font-bold">{(() => {
            const fallback = startup.totalFunding || 0;
            const tf = totalFundingFromRecords > 0 ? totalFundingFromRecords : fallback;
            return formatCurrency(tf - (summary?.total_expenses || 0), startupCurrency);
          })()}</p>
            <p className="text-xs text-slate-400">Total Funding - Total Expenditure</p>
        </Card>
      </div>

      {/* Chart Filters */}
      <Card>
        <div className="flex flex-wrap gap-4 mb-4">
          <Select 
            label="Entity" 
            id="filter-entity" 
            value={filters.entity || 'all'}
            onChange={e => setFilters({ ...filters, entity: e.target.value })}
            containerClassName="flex-1 min-w-[120px]"
          >
            <option value="all">All Entities</option>
            {entities.map(entity => (
              <option key={entity} value={entity}>{entity}</option>
            ))}
          </Select>
          <Select 
            label="Year" 
            id="filter-year" 
            value={filters.year || 'all'}
            onChange={e => {
              const value = e.target.value;
              setFilters({ 
                ...filters, 
                year: value === 'all' ? 'all' : parseInt(value) 
              });
            }}
            containerClassName="flex-1 min-w-[100px]"
          >
            {availableYears.map(year => (
              <option key={year} value={year}>
                {year === 'all' ? 'All Years' : year}
              </option>
            ))}
          </Select>
        </div>
      </Card>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
            <h3 className="text-lg font-semibold mb-2 text-slate-700">Monthly Revenue</h3>
             <div style={{ width: '100%', height: 250 }}>
            <ResponsiveContainer>
              <LineChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month_name" fontSize={12}/>
                <YAxis fontSize={12} tickFormatter={(val) => formatCurrencyCompact(val, startupCurrency)}/>
                <Tooltip formatter={(val: number) => formatCurrency(val, startupCurrency)} />
                <Legend wrapperStyle={{fontSize: "14px"}}/>
                <Line type="monotone" dataKey="revenue" stroke="#16a34a" />
              </LineChart>
            </ResponsiveContainer>
            </div>
        </Card>
        <Card>
            <h3 className="text-lg font-semibold mb-2 text-slate-700">Monthly Expenses</h3>
            <div style={{ width: '100%', height: 250 }}>
            <ResponsiveContainer>
              <LineChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month_name" fontSize={12}/>
                <YAxis fontSize={12} tickFormatter={(val) => formatCurrencyCompact(val, startupCurrency)}/>
                <Tooltip formatter={(val: number) => formatCurrency(val, startupCurrency)} />
                <Legend wrapperStyle={{fontSize: "14px"}}/>
                <Line type="monotone" dataKey="expenses" stroke="#dc2626" />
              </LineChart>
            </ResponsiveContainer>
            </div>
        </Card>
      </div>

      {/* Add Financial Record Button + Modal */}
      {canEdit && (
        <div className="max-w-3xl mx-auto">
          <div className="bg-gradient-to-r from-slate-50 to-white border border-slate-200 rounded-xl shadow-sm p-10 flex flex-col items-center text-center">
            <h3 className="text-2xl font-bold text-slate-800">Add Financial Record</h3>
            <p className="text-slate-500 mt-2">Quickly log a new expense or revenue entry</p>
            <Button onClick={() => setIsAddModalOpen(true)} className="mt-6 bg-blue-600 text-white px-6 py-3 rounded-full font-semibold hover:bg-blue-700 flex items-center gap-2 text-base">
              <Plus className="h-5 w-5" /> Add Record
            </Button>
          </div>
        </div>
      )}

      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-center p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-slate-900">Add Financial Record</h3>
              <Button variant="outline" onClick={() => setIsAddModalOpen(false)}>Close</Button>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              <form id="financial-form" onSubmit={handleSubmit} className="space-y-4">
            {/* Toggle Buttons */}
            <div className="flex gap-4 mb-4">
              <button 
                type="button" 
                onClick={() => { setFormType('expense'); setFormState({ ...formState, description: '', vertical: '', amount: '', cogs: '' }); }}
                className={`flex-1 py-2 rounded-md font-semibold ${formType === 'expense' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'}`}
              >
                Expense
              </button>
              <button 
                type="button" 
                onClick={() => { setFormType('revenue'); setFormState({ ...formState, description: '', vertical: '', amount: '', cogs: '' }); }}
                className={`flex-1 py-2 rounded-md font-semibold ${formType === 'revenue' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'}`}
              >
                Revenue
              </button>
            </div>

            {/* Form Fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <DateInput 
                label="Transaction Date" 
                id="date" 
                name="date"
                value={formState.date}
                onChange={handleInputChange}
                required
                fieldName="Transaction date"
                maxYearsPast={10}
              />
              <Select 
                label="Entity" 
                id="entity"
                name="entity"
                value={formState.entity}
                onChange={handleInputChange}
                required
              >
                {entities.length > 0 ? entities.map(entity => (
                  <option key={entity} value={entity}>{entity}</option>
                )) : (
                  <option value="Parent Company">Parent Company</option>
                )}
              </Select>
              <div className="md:col-span-2">
                <label htmlFor="description" className="block text-sm font-medium text-slate-700 mb-2">
                  Description
                </label>
                <textarea
                  id="description"
                  name="description"
                  value={formState.description}
                  onChange={handleInputChange}
                  required
                  rows={3}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  placeholder="Enter description..."
                />
              </div>
              <Select 
                label="Vertical" 
                id="vertical"
                name="vertical"
                value={formState.vertical}
                onChange={handleInputChange}
                required
              >
                <option value="">Select Vertical</option>
                {formType === 'expense' ? (
                  <>
                    <option value="SaaS">SaaS</option>
                    <option value="Enterprise">Enterprise</option>
                    <option value="B2C Hardware">B2C Hardware</option>
                    <option value="B2B Services">B2B Services</option>
                    <option value="R&D">R&D</option>
                    <option value="Marketing">Marketing</option>
                    <option value="Salaries">Salaries</option>
                    <option value="Ops">Ops</option>
                    <option value="COGS">COGS</option>
                    <option value="Other Expenses">Other Expenses</option>
                  </>
                ) : (
                  <>
                    <option value="Product Sales">Product Sales</option>
                    <option value="Service Revenue">Service Revenue</option>
                    <option value="Subscription Revenue">Subscription Revenue</option>
                    <option value="Commission/Transaction Fees">Commission/Transaction Fees</option>
                    <option value="Advertising Revenue">Advertising Revenue</option>
                    <option value="Licensing & Royalties">Licensing & Royalties</option>
                    <option value="Other Income">Other Income</option>
                  </>
                )}
              </Select>
              {formType === 'expense' && formState.vertical === 'Other Expenses' && (
                <Input 
                  label="Specify Other Expense" 
                  id="otherExpenseLabel" 
                  name="otherExpenseLabel"
                  type="text"
                  value={otherExpenseLabel}
                  onChange={(e) => setOtherExpenseLabel(e.target.value)}
                  required
                />
              )}
              {formType === 'revenue' && formState.vertical === 'Other Income' && (
                <Input 
                  label="Specify Other Income" 
                  id="otherIncomeLabel" 
                  name="otherIncomeLabel"
                  type="text"
                  value={otherIncomeLabel}
                  onChange={(e) => setOtherIncomeLabel(e.target.value)}
                  required
                />
              )}
              <Input 
                label="Amount" 
                id="amount" 
                name="amount"
                type="number" 
                step="0.01"
                min="0"
                value={formState.amount}
                onChange={handleInputChange}
                required
              />
              {formType === 'revenue' && (
                <Input 
                  label="COGS" 
                  id="cogs" 
                  name="cogs"
                  type="number" 
                  step="0.01"
                  min="0"
                  value={formState.cogs}
                  onChange={handleInputChange}
                />
              )}
              {formType === 'expense' && (
                <>
                  <Select 
                    label="Funding Source" 
                    id="fundingSource" 
                    name="fundingSource"
                    value={formState.fundingSource}
                    onChange={handleInputChange}
                    required
                  >
                    <option value="">Select funding source</option>
                    {fundingSources.length > 0 ? (
                      fundingSources.map(source => (
                        <option key={source} value={source}>{source}</option>
                      ))
                    ) : (
                      <option value="Revenue">Revenue</option>
                    )}
                  </Select>
                  <div>
                    <CloudDriveInput
                      value={formState.cloudDriveUrl}
                      onChange={(url) => {
                        // If URL is provided, clear the file and update URL
                        setFormState({ ...formState, cloudDriveUrl: url, attachment: null });
                      }}
                      onFileSelect={(file) => {
                        console.log('📥 Financial attachment file selected:', file?.name);
                        if (file) {
                          setFormState({ ...formState, attachment: file, cloudDriveUrl: '' });
                        }
                      }}
                      placeholder="Paste your cloud drive link here..."
                      label="Attach Invoice"
                      accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                      maxSize={10}
                      documentType="financial attachment"
                      showPrivacyMessage={false}
                    />
                    {formState.attachment && (
                      <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded text-sm text-green-700">
                        📄 File selected: {formState.attachment.name} ({(formState.attachment.size / 1024 / 1024).toFixed(2)} MB)
                      </div>
                    )}
                  </div>
                </>
              )}
              {formType === 'revenue' && (
                <>
                  <div>
                    <CloudDriveInput
                      value={formState.cloudDriveUrl}
                      onChange={(url) => {
                        // If URL is provided, clear the file and update URL
                        setFormState({ ...formState, cloudDriveUrl: url, attachment: null });
                      }}
                      onFileSelect={(file) => {
                        console.log('📥 Financial attachment file selected:', file?.name);
                        if (file) {
                          setFormState({ ...formState, attachment: file, cloudDriveUrl: '' });
                        }
                      }}
                      placeholder="Paste your cloud drive link here..."
                      label="Attach Invoice"
                      accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                      maxSize={10}
                      documentType="financial attachment"
                      showPrivacyMessage={false}
                    />
                    {formState.attachment && (
                      <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded text-sm text-green-700">
                        📄 File selected: {formState.attachment.name} ({(formState.attachment.size / 1024 / 1024).toFixed(2)} MB)
                      </div>
                    )}
                  </div>
                  <div></div> {/* Empty div to maintain grid layout */}
                </>
              )}
            </div>
            
              </form>
            </div>
            <div className="border-t border-gray-200 p-6 bg-gray-50">
              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={() => {
                  setIsAddModalOpen(false);
                  setFormState({
                    date: '',
                    entity: 'Parent Company',
                    description: '',
                    vertical: '',
                    amount: '',
                    cogs: '',
                    fundingSource: 'Revenue',
                    attachment: null,
                    cloudDriveUrl: ''
                  });
                  setOtherExpenseLabel('');
                  setOtherIncomeLabel('');
                }}>
                  Cancel
                </Button>
                <Button type="submit" form="financial-form" disabled={isSubmitting} className="bg-blue-600 text-white px-6 py-2 rounded-md font-semibold hover:bg-blue-700">
                  {isSubmitting ? 'Adding...' : 'Add Record'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Tables Section */}
      <div className="grid grid-cols-1 gap-6">
        <div className="px-2 sm:px-6">
        <Card>
          <h3 className="text-lg font-semibold mb-4 text-slate-700">Expenditure List</h3>
          <div className="overflow-x-auto max-h-80 overflow-y-auto">
            {expenses.length === 0 ? (
              <p className="text-slate-500 text-center py-4">No expenses found for the selected filters.</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="py-1.5 px-3 text-left font-semibold">Date</th>
                    <th className="py-1.5 px-3 text-left font-semibold">Vertical</th>
                    <th className="py-1.5 px-3 text-left font-semibold">Amount</th>
                    <th className="py-1.5 px-3 text-left font-semibold">Funding Source</th>
                    <th className="py-1.5 px-3 text-left font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {expenses.map(expense => (
                    <tr key={expense.id} className="border-b">
                      <td className="py-1.5 px-3">{new Date(expense.date).toLocaleDateString()}</td>
                      <td className="py-1.5 px-3">{expense.vertical}</td>
                      <td className="py-1.5 px-3">{formatCurrency(expense.amount, startupCurrency)}</td>
                      <td className="py-1.5 px-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          expense.fundingSource 
                            ? 'bg-blue-100 text-blue-800' 
                            : 'bg-gray-100 text-gray-600'
                        }`}>
                          {expense.fundingSource || 'Not specified'}
                        </span>
                      </td>
                       <td className="py-1.5 px-3">
                        <div className="flex gap-2">
                          {expense.attachmentUrl && (
                            <Button size="sm" variant="outline" onClick={() => handleDownloadAttachment(expense.attachmentUrl)}>
                              <Download className="h-4 w-4"/>
                            </Button>
                          )}
                          {canEdit && (
                            <Button 
                              size="sm" 
                              variant="outline" 
                              onClick={() => openEditModalForExpense(expense)}
                            >
                              <Edit className="h-4 w-4"/>
                            </Button>
                          )}
                          {canEdit && (
                            <Button 
                              size="sm" 
                              variant="outline" 
                              onClick={() => handleDeleteRecord(expense.id, 'expense', expense.vertical)}
                            >
                              <Trash2 className="h-4 w-4"/>
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </Card>
        </div>
        <div className="px-2 sm:px-6">
        <Card>
          <h3 className="text-lg font-semibold mb-4 text-slate-700">Revenue & Profitability</h3>
          <div className="overflow-x-auto max-h-80 overflow-y-auto">
            {revenues.length === 0 ? (
              <p className="text-slate-500 text-center py-4">No revenue found for the selected filters.</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="py-1.5 px-3 text-left font-semibold">Date</th>
                    <th className="py-1.5 px-3 text-left font-semibold">Vertical</th>
                    <th className="py-1.5 px-3 text-left font-semibold">Earnings</th>
                    <th className="py-1.5 px-3 text-left font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {revenues.map(revenue => (
                    <tr key={revenue.id} className="border-b">
                      <td className="py-1.5 px-3">{new Date(revenue.date).toLocaleDateString()}</td>
                      <td className="py-1.5 px-3">{revenue.vertical}</td>
                      <td className="py-1.5 px-3">{formatCurrency(revenue.earnings, startupCurrency)}</td>
                      <td className="py-1.5 px-3">
                        <div className="flex gap-2">
                          {revenue.attachmentUrl && (
                            <Button size="sm" variant="outline" onClick={() => handleDownloadAttachment(revenue.attachmentUrl)}>
                              <Download className="h-4 w-4"/>
                            </Button>
                          )}
                          {canEdit && (
                            <Button 
                              size="sm" 
                              variant="outline" 
                              onClick={() => openEditModalForRevenue(revenue)}
                            >
                              <Edit className="h-4 w-4"/>
                            </Button>
                          )}
                          {canEdit && (
                            <Button 
                              size="sm" 
                              variant="outline" 
                              onClick={() => handleDeleteRecord(revenue.id, 'revenue', revenue.vertical)}
                            >
                              <Trash2 className="h-4 w-4"/>
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </Card>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && deleteTarget && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center mb-4">
              <Trash2 className="h-6 w-6 text-red-500 mr-3" />
              <h3 className="text-lg font-semibold text-gray-900">Confirm Delete</h3>
            </div>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete this {deleteTarget.type}?
              <br />
              <span className="font-medium">{deleteTarget.description}</span>
            </p>
            <div className="flex justify-end space-x-3">
              <Button 
                variant="outline" 
                onClick={cancelDelete}
                className="px-4 py-2"
              >
                Cancel
              </Button>
              <Button 
                variant="destructive" 
                onClick={confirmDelete}
                className="px-4 py-2"
              >
                Delete
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Record Modal */}
      {isEditModalOpen && editRecord && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4">
            <div className="flex items-center mb-4">
              <Edit className="h-6 w-6 text-blue-600 mr-3" />
              <h3 className="text-lg font-semibold text-gray-900">Edit {editRecord.type === 'expense' ? 'Expense' : 'Revenue'}</h3>
            </div>
            <form onSubmit={saveEdit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <DateInput 
                  label="Transaction Date" 
                  id="edit-date" 
                  name="date"
                  value={editRecord.date}
                  onChange={handleEditChange}
                  required
                  fieldName="Transaction date"
                  maxYearsPast={10}
                />
                <Select 
                  label="Entity" 
                  id="edit-entity"
                  name="entity"
                  value={editRecord.entity}
                  onChange={handleEditChange}
                  required
                >
                  {entities.length > 0 ? entities.map(entity => (
                    <option key={entity} value={entity}>{entity}</option>
                  )) : (
                    <option value="Parent Company">Parent Company</option>
                  )}
                </Select>
                <div className="md:col-span-2">
                  <label htmlFor="edit-description" className="block text-sm font-medium text-slate-700 mb-2">
                    Description
                  </label>
                  <textarea
                    id="edit-description"
                    name="description"
                    value={editRecord.description || ''}
                    onChange={handleEditChange}
                    rows={3}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                    placeholder="Enter description..."
                  />
                </div>
                <Select 
                  label="Vertical" 
                  id="edit-vertical"
                  name="vertical"
                  value={editRecord.vertical}
                  onChange={handleEditChange}
                  required
                >
                  <option value="">Select Vertical</option>
                  {editRecord.type === 'expense' ? (
                    <>
                      <option value="SaaS">SaaS</option>
                      <option value="Enterprise">Enterprise</option>
                      <option value="B2C Hardware">B2C Hardware</option>
                      <option value="B2B Services">B2B Services</option>
                      <option value="R&D">R&D</option>
                      <option value="Marketing">Marketing</option>
                      <option value="Salaries">Salaries</option>
                      <option value="Ops">Ops</option>
                      <option value="COGS">COGS</option>
                      <option value="Other Expenses">Other Expenses</option>
                    </>
                  ) : (
                    <>
                      <option value="Product Sales">Product Sales</option>
                      <option value="Service Revenue">Service Revenue</option>
                      <option value="Subscription Revenue">Subscription Revenue</option>
                      <option value="Commission/Transaction Fees">Commission/Transaction Fees</option>
                      <option value="Advertising Revenue">Advertising Revenue</option>
                      <option value="Licensing & Royalties">Licensing & Royalties</option>
                      <option value="Other Income">Other Income</option>
                    </>
                  )}
                </Select>
                <Input 
                  label="Amount" 
                  id="edit-amount" 
                  name="amount"
                  type="number" 
                  step="0.01"
                  min="0"
                  value={editRecord.amount}
                  onChange={handleEditChange}
                  required
                />
                {editRecord.type === 'revenue' && (
                  <Input 
                    label="COGS" 
                    id="edit-cogs" 
                    name="cogs"
                    type="number" 
                    step="0.01"
                    min="0"
                    value={editRecord.cogs ?? 0}
                    onChange={handleEditChange}
                  />
                )}
                {editRecord.type === 'expense' && (
                  <Select 
                    label="Funding Source" 
                    id="edit-fundingSource" 
                    name="fundingSource"
                    value={editRecord.fundingSource || ''}
                    onChange={handleEditChange}
                    required
                  >
                    <option value="">Select funding source</option>
                    {fundingSources.length > 0 ? (
                      fundingSources.map(source => (
                        <option key={source} value={source}>{source}</option>
                      ))
                    ) : (
                      <option value="Revenue">Revenue</option>
                    )}
                  </Select>
                )}
              </div>
              <div className="flex justify-end space-x-3">
                <Button 
                  variant="outline" 
                  onClick={() => { setIsEditModalOpen(false); setEditRecord(null); }}
                  className="px-4 py-2"
                  type="button"
                >
                  Cancel
                </Button>
                <Button 
                  className="px-4 py-2"
                  type="submit"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default FinancialsTab;