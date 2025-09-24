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

  // Form states
  const [formState, setFormState] = useState({
    date: '',
    entity: 'Parent Company',
    description: '',
    vertical: '',
    amount: '',
    cogs: '',
    fundingSource: 'Revenue',
    attachment: null as File | null
  });
  const [formType, setFormType] = useState<'revenue' | 'expense'>('expense');

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
        monthly,
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
        financialsService.getMonthlyFinancialData(startup.id, year),
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
        monthlyDataCount: monthly.length,
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
        monthlyData: monthly,
        revenueByVertical: revenueVertical,
        expensesByVertical: expenseVertical,
        expensesCount: expensesData.length,
        revenuesCount: revenuesData.length
      });

      // Ensure we have chart data, use what we received
      const finalMonthlyData = monthly || [];
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
      }

      const recordData = {
        startup_id: startup.id,
        record_type: formType,
        date: formState.date,
        entity: formState.entity,
        description: formState.description,
        vertical: formState.vertical,
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
        attachment: null
      });

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
        if (record.record_type === 'revenue') {
          monthlyData[monthName].revenue += record.amount;
        } else {
          monthlyData[monthName].expenses += record.amount;
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
          <p className="text-2xl font-bold">{formatCurrency(startup.totalFunding, startupCurrency)}</p>
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
          <p className="text-2xl font-bold">{formatCurrency((summary?.total_revenue || 0) - (summary?.total_expenses || 0), startupCurrency)}</p>
            <p className="text-xs text-slate-400">Total Revenue - Total Expenditure</p>
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
                  <Card>
             <h3 className="text-lg font-semibold mb-0 text-slate-700">Revenue by Vertical</h3>
              <div style={{ width: '100%', height: 300 }}>
             <ResponsiveContainer>
               <PieChart>
                 <Pie data={revenueByVertical} dataKey="value" nameKey="name" cx="65%" cy="50%" outerRadius={65} label>
                   {revenueByVertical.map((entry, index) => (
                     <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                   ))}
                 </Pie>
                 <Tooltip formatter={(val: number) => formatCurrency(val, startupCurrency)} />
                 <Legend layout="vertical" align="left" verticalAlign="middle" />
               </PieChart>
             </ResponsiveContainer>
             </div>
         </Card>
                 <Card>
             <h3 className="text-lg font-semibold mb-0 text-slate-700">Expenses by Vertical</h3>
             <div style={{ width: '100%', height: 300 }}>
             <ResponsiveContainer>
               <PieChart>
                 <Pie data={expensesByVertical} dataKey="value" nameKey="name" cx="65%" cy="50%" outerRadius={65} label>
                   {expensesByVertical.map((entry, index) => (
                     <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                   ))}
                 </Pie>
                 <Tooltip formatter={(val: number) => formatCurrency(val, startupCurrency)} />
                 <Legend layout="vertical" align="left" verticalAlign="middle" />
               </PieChart>
             </ResponsiveContainer>
             </div>
         </Card>
      </div>

      {/* Add Financial Record Section - Below Charts */}
      {canEdit && (
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h3 className="text-xl font-semibold text-slate-700 mb-6">Add Financial Record</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
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
                    <label htmlFor="attachment" className="block text-sm font-medium text-slate-700 mb-2">
                      Attach Invoice
                    </label>
                    <input
                      id="attachment"
                      type="file"
                      accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                      onChange={e => setFormState({ ...formState, attachment: e.target.files?.[0] || null })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </>
              )}
              {formType === 'revenue' && (
                <>
                  <div>
                    <label htmlFor="attachment" className="block text-sm font-medium text-slate-700 mb-2">
                      Attach Invoice
                    </label>
                    <input
                      id="attachment"
                      type="file"
                      accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                      onChange={e => setFormState({ ...formState, attachment: e.target.files?.[0] || null })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div></div> {/* Empty div to maintain grid layout */}
                </>
              )}
            </div>
            
            {/* Submit Button */}
            <div className="flex justify-end">
              <Button type="submit" disabled={isSubmitting} className="bg-blue-600 text-white px-4 py-2 rounded-md font-semibold hover:bg-blue-700 flex items-center gap-2">
                {isSubmitting ? 'Adding...' : 'Add Record'}
              </Button>
            </div>
          </form>
        </div>
      )}
      
      {/* Tables Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <h3 className="text-lg font-semibold mb-4 text-slate-700">Expenditure List</h3>
          <div className="overflow-x-auto">
            {expenses.length === 0 ? (
              <p className="text-slate-500 text-center py-4">No expenses found for the selected filters.</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="py-2 text-left font-semibold">Vertical</th>
                    <th className="py-2 text-left font-semibold">Amount</th>
                    <th className="py-2 text-left font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {expenses.map(expense => (
                    <tr key={expense.id} className="border-b">
                      <td className="py-2">{expense.vertical}</td>
                      <td className="py-2">{formatCurrency(expense.amount, startupCurrency)}</td>
                      <td className="py-2">
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
        <Card>
          <h3 className="text-lg font-semibold mb-4 text-slate-700">Revenue & Profitability</h3>
          <div className="overflow-x-auto">
            {revenues.length === 0 ? (
              <p className="text-slate-500 text-center py-4">No revenue found for the selected filters.</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="py-2 text-left font-semibold">Vertical</th>
                    <th className="py-2 text-left font-semibold">Earnings</th>
                    <th className="py-2 text-left font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {revenues.map(revenue => (
                    <tr key={revenue.id} className="border-b">
                      <td className="py-2">{revenue.vertical}</td>
                      <td className="py-2">{formatCurrency(revenue.earnings, startupCurrency)}</td>
                      <td className="py-2">
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
    </div>
  );
};

export default FinancialsTab;