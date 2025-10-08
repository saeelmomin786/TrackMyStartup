
import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Startup } from '../../types';
import Card from '../ui/Card';

interface PortfolioDistributionChartProps {
  data: Startup[];
}

const PortfolioDistributionChart: React.FC<PortfolioDistributionChartProps> = ({ data }) => {
  const processData = () => {
    const sectorCount: { [key: string]: number } = {};
    data.forEach(startup => {
      // Handle cases where sector might be null, undefined, or empty
      const sector = startup.sector || 'Other';
      sectorCount[sector] = (sectorCount[sector] || 0) + 1;
    });
    
    return Object.keys(sectorCount).map(sector => ({
      name: sector,
      count: sectorCount[sector],
    }));
  };

  const chartData = processData();

  return (
    <Card>
        <h3 className="text-lg font-semibold mb-4 text-slate-700">Portfolio Distribution by Sector</h3>
        {chartData.length === 0 ? (
          <div className="flex items-center justify-center h-64 text-slate-500">
            <div className="text-center">
              <p className="text-lg font-medium">No portfolio data available</p>
              <p className="text-sm">Add startups to your portfolio to see sector distribution</p>
            </div>
          </div>
        ) : chartData.length === 1 ? (
          <div className="flex items-center justify-center h-64 text-slate-500">
            <div className="text-center">
              <p className="text-lg font-medium">All startups are in the {chartData[0].name} sector</p>
              <p className="text-sm">Diversify your portfolio to see sector distribution</p>
            </div>
          </div>
        ) : (
          <div style={{ width: '100%', height: 300 }}>
              <ResponsiveContainer>
                  <BarChart data={chartData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                      <XAxis dataKey="name" stroke="#64748b" fontSize={12} />
                      <YAxis allowDecimals={false} stroke="#64748b" fontSize={12} />
                      <Tooltip 
                          cursor={{fill: 'rgba(239, 246, 255, 0.5)'}}
                          contentStyle={{
                              backgroundColor: '#fff',
                              borderRadius: '0.5rem',
                              borderColor: '#e2e8f0',
                              boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)'
                          }}
                      />
                      <Legend wrapperStyle={{fontSize: "14px"}}/>
                      <Bar dataKey="count" name="Number of Startups" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  </BarChart>
              </ResponsiveContainer>
          </div>
        )}
    </Card>
  );
};

export default PortfolioDistributionChart;
