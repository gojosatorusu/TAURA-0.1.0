import React from 'react';
import { motion } from 'framer-motion';
import { useI18n } from '../../Pages/context/I18nContext';
interface ConsumptionChartProps {
  data: any[];
}

const ConsumptionChart: React.FC<ConsumptionChartProps> = ({ data }) => {
  // Format for consumption rate - get top 5 highest consumption
  const highConsumptionItems = [...data]
    .sort((a, b) => b.consumption - a.consumption)
    .slice(0, 5);
    const {t} = useI18n()

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="bg-slate-900 p-3 sm:p-4 rounded-xl shadow-md w-full h-full border border-slate-700 backdrop-blur-md"
    >
      <h3 className="text-slate-200 text-sm font-medium mb-2">
        {t('consumptionChart.title')}
      </h3>
      
      <div className="bg-slate-800 rounded-lg p-3 h-80 overflow-auto">
        {highConsumptionItems.map((item, index) => (
          <div key={index} className="mb-4 last:mb-0">
            <div className="flex justify-between items-center mb-1">
              <span className="text-slate-200 font-medium text-sm">{item.name}</span>
              <span className="text-slate-400 text-xs">
                {item.consumption} {t('consumptionChart.unitsPerWeek')}
              </span>
            </div>
            
            <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
              <div 
                className="h-full bg-blue-500" 
                style={{ 
                  width: `${Math.min((item.consumption / highConsumptionItems[0].consumption) * 100, 100)}%` 
                }}
              />
            </div>
            
            <div className="mt-1 grid grid-cols-2 gap-2 text-xs">
              <div className="text-slate-400">
                Stock: <span className="text-slate-300">{item.quantity} {t('units')}</span>
              </div>
              <div className="text-slate-400 text-right">
                {t('vendor')}: <span className="text-slate-300">{item.Vendor}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
      
      <div className="mt-3 text-xs text-slate-400">
        <p>{t('consumptionChart.accountFor',{amount: ((highConsumptionItems.reduce((sum, item) => sum + item.consumption, 0) / data.reduce((sum, item) => sum + item.consumption, 0)) * 100).toFixed(1)})}</p>
      </div>
    </motion.div>
  );
};

export default ConsumptionChart;