import React from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, TrendingDown, Target, Clock } from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
  ResponsiveContainer
} from 'recharts';
import { useI18n } from '../../Pages/context/I18nContext';

interface CriticalItemsChartProps {
  criticalItems: any[];
  data: any[];
}

const CriticalItemsChart: React.FC<CriticalItemsChartProps> = ({ criticalItems, data }) => {
  // Format for most critical items - get top 5
  const mostCriticalItems = [...data]
    .sort((a, b) => {
      // Sort by ratio of quantity to threshold (lower is more critical)
      const ratioA = a.quantity / a.threshold;
      const ratioB = b.quantity / b.threshold;
      return ratioA - ratioB;
    })
    .slice(0, 5);
    const {t} = useI18n()
  // Calculate statistics
  const statistics = {
    totalCritical: criticalItems.length,
    percentageCritical: ((criticalItems.length / data.length) * 100).toFixed(1),
    mostCriticalRatio: mostCriticalItems.length > 0 ? 
      (mostCriticalItems[0].quantity / mostCriticalItems[0].threshold).toFixed(2) : '0',
    averageStockLevel: data.length > 0 ? 
      (data.reduce((sum, item) => sum + (item.quantity / item.threshold), 0) / data.length).toFixed(2) : '0'
  };

  // Custom tooltip for the bar chart
  const CustomBarTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const item = payload[0].payload;
      return (
        <div className="bg-slate-950 p-3 rounded-lg shadow-lg">
          <p className="font-semibold text-slate-200">{item.name}</p>
          <p className="text-blue-400">{t('quantity')}: {item.quantity}</p>
          <p className="text-green-400">{t('threshold')}: {item.threshold}</p>
          <p className="text-yellow-400">
            Ratio: {(item.quantity / item.threshold).toFixed(2)}x {t('threshold')}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="rounded-xl w-full h-full"
    >
      <h2 className="text-gray-100 text-lg font-semibold flex items-center">
        <AlertTriangle className="w-4 h-4 mr-2 text-red-400" />
        {t('criticalItems.mostCritical')}
      </h2>
    {criticalItems.length > 0 ?(
     
      <div className="flex gap-6">
        <div className="flex-1 max-w-2xl">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={mostCriticalItems}
                layout="vertical"
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis
                  type="number"
                  stroke="#9ca3af"
                  tick={{ fill: "#d1d5db", fontSize: 12 }}
                />
                <YAxis
                  dataKey="name"
                  type="category"
                  stroke="#9ca3af"
                  tick={{ fill: "#d1d5db", fontSize: 12 }}
                  width={120}
                />
                <Tooltip content={<CustomBarTooltip />} />
                <Bar
                  dataKey="quantity"
                  name="Quantity"
                  radius={[0, 4, 4, 0]}
                >
                  {mostCriticalItems.map((entry, index) => {
                    const ratio = entry.quantity / entry.threshold;
                    let barColor = '#10b981'; // Default green
                   
                    if (ratio <= 1) barColor = '#ef4444'; // Red for critical
                    else if (ratio < 1.5) barColor = '#f59e0b'; // Amber for warning
                   
                    return <Cell key={`cell-${index}`} fill={barColor} />;
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Statistics Section */}
        <div className=" flex-1 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            {/* Critical Count */}
            <div className="bg-red-900/20 p-3 rounded-lg border border-red-800/30">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-red-300 text-xs font-medium">{t('rawMaterials.criticalItems')}</p>
                  <p className="text-red-400 text-xl font-bold">{statistics.totalCritical}</p>
                </div>
                <AlertTriangle className="w-5 h-5 text-red-400" />
              </div>
            </div>

            {/* Percentage Critical */}
            <div className="bg-orange-900/20 p-3 rounded-lg border border-orange-800/30">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-orange-300 text-xs font-medium">% {t('critical')}</p>
                  <p className="text-orange-400 text-xl font-bold">{statistics.percentageCritical}%</p>
                </div>
                <TrendingDown className="w-5 h-5 text-orange-400" />
              </div>
            </div>

            {/* Most Critical Ratio */}
            <div className="bg-blue-900/20 p-3 rounded-lg border border-blue-800/30">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-300 text-xs font-medium">{t('criticalItems.worstRatio')}</p>
                  <p className="text-blue-400 text-xl font-bold">{statistics.mostCriticalRatio}x</p>
                </div>
                <Target className="w-5 h-5 text-blue-400" />
              </div>
            </div>

            {/* Average Stock Level */}
            <div className="bg-green-900/20 p-3 rounded-lg border border-green-800/30">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-green-300 text-xs font-medium">{t('criticalItems.avgRatio')}</p>
                  <p className="text-green-400 text-xl font-bold">{statistics.averageStockLevel}x</p>
                </div>
                <Clock className="w-5 h-5 text-green-400" />
              </div>
            </div>
          </div>

          {/* Insights Section */}
          <div className="bg-slate-800/50 p-3 rounded-lg border border-slate-700">
            <h4 className="text-slate-300 text-sm font-medium mb-2">{t('criticalItems.quickInsights')}</h4>
            <div className="space-y-2 text-xs text-slate-400">
              <div className="flex justify-between">
                <span>{t('criticalItems.riskLevel')}:</span>
                <span className={`font-medium ${
                  parseFloat(statistics.percentageCritical) > 30 ? 'text-red-400' :
                  parseFloat(statistics.percentageCritical) > 15 ? 'text-orange-400' : 'text-green-400'
                }`}>
                  {parseFloat(statistics.percentageCritical) > 30 ? t('high') :
                   parseFloat(statistics.percentageCritical) > 15 ? t('medium') : t('low')}
                </span>
              </div>
              <div className="flex justify-between">
                <span>{t('criticalItems.actionRequired')}:</span>
                <span className="text-red-400 font-medium">
                  {statistics.totalCritical > 0 ? t('yes') : t('no')}
                </span>
              </div>
              <div className="flex justify-between">
                <span>{t('criticalItems.stockHealth')}:</span>
                <span className={`font-medium ${
                  parseFloat(statistics.averageStockLevel) >= 1.5 ? 'text-green-400' :
                  parseFloat(statistics.averageStockLevel) <= 1 ? 'text-red-400' : 'text-orange-400'
                }`}>
                  {parseFloat(statistics.averageStockLevel) >= 1.5 ? t('healthy') :
                   parseFloat(statistics.averageStockLevel) <= 1 ? t('critical') : t('warning')}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div> ): (

        <div className="flex items-center justify-center h-full">
          <p className="text-gray-400">{t('noCritical')}</p>
        </div>
      )
    }
     
      {/* Action Required Banner */}
      {criticalItems.length > 0 && (
        <div className="bg-rose-900 bg-opacity-20 p-2 rounded text-xs text-red-300 flex items-start mt-4">
          <AlertTriangle className="w-4 h-4 mr-1 flex-shrink-0 text-red-500" />
          <span>
            <strong>{t('criticalItems.actionRequired')}:</strong> {criticalItems.length} {t('criticalItems.immediateCheck')}
          </span>
        </div>
      )}
    </motion.div>
  );
};

export default CriticalItemsChart;