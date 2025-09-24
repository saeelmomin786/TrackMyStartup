import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Startup, InvestmentOffer } from '../../types';
import { DashboardMetricsService, DashboardMetrics } from '../../lib/dashboardMetricsService';
import { financialsService } from '../../lib/financialsService';
import { formatCurrency, formatCurrencyCompact } from '../../lib/utils';
import { useStartupCurrency } from '../../lib/hooks/useStartupCurrency';
import Card from '../ui/Card';
import Button from '../ui/Button';
import ComplianceSubmissionButton from '../ComplianceSubmissionButton';
import { DollarSign, Zap, TrendingUp } from 'lucide-react';

interface StartupDashboardTabProps {
  startup: Startup;
  isViewOnly?: boolean;
  offers?: InvestmentOffer[];
  onProcessOffer?: (offerId: number, status: 'approved' | 'rejected' | 'accepted' | 'completed') => void;
  currentUser?: any;
}

const COLORS = ['#1e40af', '#1d4ed8', '#3b82f6', '#60a5fa'];

const StartupDashboardTab: React.FC<StartupDashboardTabProps> = ({ startup, isViewOnly = false, offers = [], onProcessOffer, currentUser }) => {
  const startupCurrency = useStartupCurrency(startup);
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [revenueData, setRevenueData] = useState<any[]>([]);
  const [fundUsageData, setFundUsageData] = useState<any[]>([]);

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        setIsLoading(true);
        
        // Load metrics
        const calculatedMetrics = await DashboardMetricsService.calculateMetrics(startup);
        setMetrics(calculatedMetrics);
        
        // Load real financial data for charts
        const currentYear = new Date().getFullYear();
        const allRecords = await financialsService.getFinancialRecords(startup.id, { year: currentYear });
        
        // Generate monthly revenue vs expenses data
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
        
        const finalRevenueData = months.map(month => ({
          name: month,
          revenue: monthlyData[month].revenue,
          expenses: monthlyData[month].expenses
        }));
        
        setRevenueData(finalRevenueData);
        
        // Generate fund usage data based on actual expense categories
        const expenseByVertical: { [key: string]: number } = {};
        allRecords
          .filter(record => record.record_type === 'expense')
          .forEach(record => {
            expenseByVertical[record.vertical] = (expenseByVertical[record.vertical] || 0) + record.amount;
          });
        
        const finalFundUsageData = Object.entries(expenseByVertical)
          .map(([name, value]) => ({ name, value }))
          .sort((a, b) => b.value - a.value)
          .slice(0, 4); // Top 4 categories
        
        setFundUsageData(finalFundUsageData);
        
      } catch (error) {
        console.error('Error loading dashboard data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadDashboardData();
  }, [startup]);

  const MetricCard: React.FC<{
    title: string;
    value: string;
    icon: React.ReactNode;
    subtitle?: string;
  }> = ({ title, value, icon, subtitle }) => (
    <Card padding="sm">
      <div className="flex items-center justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-xs sm:text-sm font-medium text-slate-500 uppercase tracking-wider">{title}</p>
          <p className="text-lg sm:text-xl lg:text-2xl font-bold text-slate-900">{value}</p>
          {subtitle && <p className="text-xs text-slate-400 mt-1 truncate">{subtitle}</p>}
        </div>
        <div className="text-blue-600 flex-shrink-0 ml-2">
          {icon}
        </div>
      </div>
    </Card>
  );

  return (
    <div className="space-y-4 sm:space-y-6 px-2 sm:px-0">
      {/* Financial Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3 sm:gap-4">
        <MetricCard
          title="MRR"
          value={isLoading ? "Loading..." : formatCurrencyCompact(metrics?.mrr || 0, startupCurrency)}
          icon={<DollarSign className="h-5 w-5 sm:h-6 sm:w-6" />}
          subtitle="Monthly Recurring Revenue"
        />
        <MetricCard
          title="Burn Rate"
          value={isLoading ? "Loading..." : formatCurrencyCompact(metrics?.burnRate || 0, startupCurrency)}
          icon={<Zap className="h-5 w-5 sm:h-6 sm:w-6" />}
          subtitle={metrics?.burnRate && metrics.burnRate > 0 ? "Monthly Net Loss" : "Monthly Net Profit"}
        />
        
        <MetricCard
          title="Gross Margin"
          value={isLoading ? "Loading..." : `${(metrics?.grossMargin || 0).toFixed(1)}%`}
          icon={<TrendingUp className="h-5 w-5 sm:h-6 sm:w-6" />}
          subtitle="Revenue - COGS"
        />
      </div>


      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        <Card padding="md">
          <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4 text-slate-700">Revenue vs. Expenses (Monthly)</h3>
          <div className="w-full h-56 sm:h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={revenueData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" fontSize={10} />
                <YAxis fontSize={10} tickFormatter={(val) => formatCurrencyCompact(val, startupCurrency)} />
                <Tooltip formatter={(value: number) => formatCurrency(value, startupCurrency)} />
                <Legend wrapperStyle={{fontSize: "12px"}} />
                <Bar dataKey="revenue" fill="#16a34a" name="Revenue" />
                <Bar dataKey="expenses" fill="#dc2626" name="Expenses" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card padding="md">
          <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4 text-slate-700">Expense Categories</h3>
          <div className="w-full h-56 sm:h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={fundUsageData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={60}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {fundUsageData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => formatCurrency(value, startupCurrency)} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* Investment Offers Section */}
      <div className="space-y-3 sm:space-y-4">
        <h3 className="text-base sm:text-lg font-semibold text-slate-700">Investment Offers</h3>
        {(!offers || offers.length === 0) ? (
          <Card className="p-6 sm:p-8 text-center text-slate-500">
            <p className="text-sm sm:text-base">No offers yet.</p>
          </Card>
        ) : (
          <div className="overflow-hidden">
            {/* Mobile view - Cards */}
            <div className="block sm:hidden space-y-3">
              {offers.map((offer) => (
                <Card key={offer.id} padding="sm">
                  <div className="space-y-3">
                    <div className="flex justify-between items-start">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-900 truncate">
                          {(offer as any).investorName || offer.investorEmail}
                        </p>
                        <p className="text-xs text-slate-600">₹{offer.offerAmount}L • {offer.equityPercentage}%</p>
                      </div>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ml-2 flex-shrink-0 ${
                        offer.status === 'accepted' ? 'bg-green-100 text-green-800' :
                        offer.status === 'completed' ? 'bg-blue-100 text-blue-800' :
                        offer.status === 'approved' ? 'bg-orange-100 text-orange-800' :
                        offer.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {offer.status.charAt(0).toUpperCase() + offer.status.slice(1)}
                      </span>
                    </div>
                    
                    <div className="flex flex-col sm:flex-row gap-2">
                      {offer.status === 'approved' && onProcessOffer && (
                        <>
                          <Button 
                            className="bg-green-600 hover:bg-green-700 w-full sm:w-auto"
                            onClick={() => {
                              if (confirm('Accept this offer and finalize the deal?')) {
                                onProcessOffer(offer.id, 'accepted');
                              }
                            }}
                            size="sm"
                          >Accept</Button>
                          <Button 
                            className="bg-red-600 hover:bg-red-700 w-full sm:w-auto"
                            onClick={() => {
                              if (confirm('Decline this offer?')) {
                                onProcessOffer(offer.id, 'rejected');
                              }
                            }}
                            size="sm"
                          >Decline</Button>
                        </>
                      )}
                      {offer.status === 'accepted' && onProcessOffer && (
                        <Button 
                          className="bg-blue-600 hover:bg-blue-700 w-full sm:w-auto"
                          onClick={() => {
                            if (confirm('Mark this investment as completed?')) {
                              onProcessOffer(offer.id, 'completed');
                            }
                          }}
                          size="sm"
                        >Mark Completed</Button>
                      )}
                      {(offer.status === 'pending' || offer.status === 'rejected' || offer.status === 'completed') && (
                        <div className="text-xs text-slate-500 text-center">
                          {offer.status === 'pending' && 'Waiting for admin approval'}
                          {offer.status === 'rejected' && 'Offer declined'}
                          {offer.status === 'completed' && 'Investment completed'}
                        </div>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>

            {/* Desktop view - Table */}
            <div className="hidden sm:block">
              <Card className="p-0 overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200 text-sm">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-3 sm:px-4 py-2 sm:py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">From</th>
                      <th className="px-3 sm:px-4 py-2 sm:py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Amount</th>
                      <th className="px-3 sm:px-4 py-2 sm:py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Equity</th>
                      <th className="px-3 sm:px-4 py-2 sm:py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Status</th>
                      <th className="px-3 sm:px-4 py-2 sm:py-3 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 bg-white">
                    {offers.map((offer) => (
                      <tr key={offer.id}>
                        <td className="px-3 sm:px-4 py-2 sm:py-3 whitespace-nowrap text-slate-900">{(offer as any).investorName || offer.investorEmail}</td>
                        <td className="px-3 sm:px-4 py-2 sm:py-3 whitespace-nowrap text-slate-900">₹{offer.offerAmount}L</td>
                        <td className="px-3 sm:px-4 py-2 sm:py-3 whitespace-nowrap text-slate-900">{offer.equityPercentage}%</td>
                        <td className="px-3 sm:px-4 py-2 sm:py-3 whitespace-nowrap">
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                            offer.status === 'accepted' ? 'bg-green-100 text-green-800' :
                            offer.status === 'completed' ? 'bg-blue-100 text-blue-800' :
                            offer.status === 'approved' ? 'bg-orange-100 text-orange-800' :
                            offer.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {offer.status.charAt(0).toUpperCase() + offer.status.slice(1)}
                          </span>
                        </td>
                        <td className="px-3 sm:px-4 py-2 sm:py-3 whitespace-nowrap">
                          <div className="flex justify-end gap-2">
                            {offer.status === 'approved' && onProcessOffer && (
                              <>
                                <Button 
                                  className="bg-green-600 hover:bg-green-700"
                                  onClick={() => {
                                    if (confirm('Accept this offer and finalize the deal?')) {
                                      onProcessOffer(offer.id, 'accepted');
                                    }
                                  }}
                                  size="sm"
                                >Accept</Button>
                                <Button 
                                  className="bg-red-600 hover:bg-red-700"
                                  onClick={() => {
                                    if (confirm('Decline this offer?')) {
                                      onProcessOffer(offer.id, 'rejected');
                                    }
                                  }}
                                  size="sm"
                                >Decline</Button>
                              </>
                            )}
                            {offer.status === 'accepted' && onProcessOffer && (
                              <Button 
                                className="bg-blue-600 hover:bg-blue-700"
                                onClick={() => {
                                  if (confirm('Mark this investment as completed?')) {
                                    onProcessOffer(offer.id, 'completed');
                                  }
                                }}
                                size="sm"
                              >Mark Completed</Button>
                            )}
                            {(offer.status === 'pending' || offer.status === 'rejected' || offer.status === 'completed') && (
                              <span className="text-xs text-slate-500 self-center">
                                {offer.status === 'pending' && 'Waiting for admin approval'}
                                {offer.status === 'rejected' && 'Offer declined'}
                                {offer.status === 'completed' && 'Investment completed'}
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Card>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default StartupDashboardTab;
