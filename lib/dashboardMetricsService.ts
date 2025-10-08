import { financialsService } from './financialsService';
import { capTableService } from './capTableService';
import { Startup } from '../types';

export interface DashboardMetrics {
  mrr: number;
  burnRate: number;
  cac: number;
  ltv: number;
  grossMargin: number;
}

export class DashboardMetricsService {
  static async calculateMetrics(startup: Startup): Promise<DashboardMetrics> {
    try {
      // Get current year's financial data
      const currentYear = new Date().getFullYear();
      
      // Get all financial records for the current year
      const allRecords = await financialsService.getFinancialRecords(startup.id, { year: currentYear });
      
      // Get current month's data
      const currentMonth = new Date().getMonth();
      const currentMonthRecords = allRecords.filter(record => {
        const recordMonth = new Date(record.date).getMonth();
        return recordMonth === currentMonth;
      });

      // Calculate MRR (Monthly Recurring Revenue)
      const monthlyRevenue = currentMonthRecords
        .filter(record => record.record_type === 'revenue')
        .reduce((sum, record) => sum + record.amount, 0);
      
      const mrr = monthlyRevenue;

      // Calculate Monthly Expenses
      const monthlyExpenses = currentMonthRecords
        .filter(record => record.record_type === 'expense')
        .reduce((sum, record) => sum + record.amount, 0);

      // Calculate Burn Rate (Gross Burn: total monthly expenses)
      const burnRate = monthlyExpenses;

      // Calculate CAC (Customer Acquisition Cost)
      // Use marketing expenses from financial records
      const marketingExpenses = currentMonthRecords
        .filter(record => 
          record.record_type === 'expense' && 
          record.vertical?.toLowerCase().includes('marketing')
        )
        .reduce((sum, record) => sum + record.amount, 0);
      
      // Calculate new customers based on revenue growth
      // For now, estimate based on revenue increase from previous month
      const previousMonth = currentMonth === 0 ? 11 : currentMonth - 1;
      const previousMonthRecords = allRecords.filter(record => {
        const recordMonth = new Date(record.date).getMonth();
        return recordMonth === previousMonth;
      });
      
      const previousMonthRevenue = previousMonthRecords
        .filter(record => record.record_type === 'revenue')
        .reduce((sum, record) => sum + record.amount, 0);
      
      // Estimate new customers based on revenue growth (assume ₹10K per customer)
      const revenueGrowth = monthlyRevenue - previousMonthRevenue;
      const estimatedNewCustomers = revenueGrowth > 0 ? Math.max(1, Math.floor(revenueGrowth / 10000)) : 1;
      const cac = estimatedNewCustomers > 0 ? marketingExpenses / estimatedNewCustomers : 0;

      // Calculate LTV (Customer Lifetime Value)
      // Get total customers from investment data if available
      let totalCustomers = 100; // Default fallback
      
      try {
        const investmentSummary = await capTableService.getInvestmentSummary(startup.id);
        if (investmentSummary && investmentSummary.total_investments > 0) {
          // Use total investments as a proxy for customer base
          totalCustomers = Math.max(100, investmentSummary.total_investments * 10);
        }
      } catch (error) {
        console.log('Using default customer count for LTV calculation');
      }
      
      const arpu = totalCustomers > 0 ? monthlyRevenue / totalCustomers : 0;
      
      // Calculate customer lifetime based on churn rate
      // For now, use a conservative estimate of 12 months
      const customerLifetime = 12;
      const ltv = arpu * customerLifetime;

      // Calculate Gross Margin
      const totalRevenue = allRecords
        .filter(record => record.record_type === 'revenue')
        .reduce((sum, record) => sum + record.amount, 0);
      
      const totalCogs = allRecords
        .filter(record => record.record_type === 'revenue')
        .reduce((sum, record) => sum + (record.cogs || 0), 0);
      
      const grossMargin = totalRevenue > 0 ? ((totalRevenue - totalCogs) / totalRevenue) * 100 : 0;

      return {
        mrr,
        burnRate,
        cac,
        ltv,
        grossMargin
      };
    } catch (error) {
      console.error('Error calculating dashboard metrics:', error);
      // Return default values if calculation fails
      return {
        mrr: 0,
        burnRate: 0,
        cac: 0,
        ltv: 0,
        grossMargin: 0
      };
    }
  }
}
