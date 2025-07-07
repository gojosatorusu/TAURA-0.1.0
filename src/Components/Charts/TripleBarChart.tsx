import React, { useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { motion } from 'framer-motion';
import { useI18n } from '../../Pages/context/I18nContext';

type MaterialData = {
  name: string;
  value1: number;
  value2: number;
};

type Props = {
  data: MaterialData[];
  value1name: string;
  value2name: string;
};

const TripleBarChart: React.FC<Props> = ({ data, value1name, value2name }) => {
  const { t } = useI18n()
  const processedData = useMemo(() => {
    // Calculate additional metrics for each item
    const enrichedData = data.map(item => ({
      ...item,
      ratio: item.value2 > 0 ? (item.value1 / item.value2) : 0,
      difference: item.value1 - item.value2,
      status: item.value1 < item.value2 ? t('rawMaterialDetails.lowStock') :
        item.value1 > item.value2 * 1.5 ? t('overStocked') : t('normal'),
      riskLevel: item.value1 / item.value2 <= 1 ? t('critical') :
        item.value1 / item.value2 <= 1.5 ? t('warning') : t('safe')
    }));

    // Sort by risk level first (Critical > Warning > Safe), then by ratio (ascending for more urgent items first)
    return enrichedData.sort((a, b) => {
      const riskOrder: Record<string, number> = { 'Critical': 0, 'Warning': 1, 'Safe': 2, 'Critique': 0, 'Avertissement': 1, 'suffisant': 2 };
      const aOrder = riskOrder[a.riskLevel] ?? 99;
      const bOrder = riskOrder[b.riskLevel] ?? 99;
      if (aOrder !== bOrder) {
        return aOrder - bOrder;
      }
      return a.ratio - b.ratio; // Lower ratios first (more urgent)
    });
  }, [data]);


  const statistics = useMemo(() => {
    const ratios = processedData.map(item => item.ratio).filter(r => r > 0);
    const avgRatio = ratios.length > 0 ? ratios.reduce((a, b) => a + b, 0) / ratios.length : 0;

    const criticalCount = processedData.filter(item => item.riskLevel === t('critical')).length;
    const warningCount = processedData.filter(item => item.riskLevel === t('warning')).length;
    const totalItems = processedData.length;

    return {
      avgRatio: avgRatio.toFixed(2),
      criticalCount,
      warningCount,
      riskPercentage: totalItems > 0 ? (((criticalCount + warningCount) / totalItems) * 100).toFixed(1) : '0'
    };
  }, [processedData]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-slate-950 p-3 rounded-lg shadow-lg">
          <p className="text-white font-semibold">{label}</p>
          <p className="text-blue-400">{`${value1name}: ${payload[0].value}`}</p>
          <p className="text-green-400">{`${value2name}: ${payload[1]?.value || 0}`}</p>
          <p className="text-yellow-400">{`Ratio: ${data.ratio.toFixed(2)}`}</p>
          <p className={`font-semibold ${data.riskLevel === 'Critical' ? 'text-red-400' :
              data.riskLevel === 'Warning' ? 'text-orange-400' : 'text-green-400'
            }`}>
            {data.riskLevel}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8 }}
      className=" p-6 rounded-xl w-full"
    >
      {data.length > 0 ? (<>
        <div className="flex justify-between items-start mb-4">
          <h2 className="text-xl font-semibold text-white">{t('tripleBar.productHealth')}</h2>
          <div className="text-right text-sm">
            <div className="text-gray-300">
              {t('criticalItems.avgRatio')}: <span className="text-blue-400 font-semibold">{statistics.avgRatio}</span>
            </div>
            <div className="text-gray-300">
              {t('tripleBar.atRisk')}: <span className={`font-semibold ${parseFloat(statistics.riskPercentage) > 50 ? 'text-red-400' :
                  parseFloat(statistics.riskPercentage) > 25 ? 'text-orange-400' : 'text-green-400'
                }`}>
                {statistics.riskPercentage}%
              </span>
            </div>
          </div>
        </div>

        {/* Risk indicators */}
        <div className="flex gap-4 mb-4 text-xs">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-red-500 rounded-full"></div>
            <span className="text-gray-300">{t('critical')} ({statistics.criticalCount})</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
            <span className="text-gray-300">{t('warning')} ({statistics.warningCount})</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            <span className="text-gray-300">{t('safe')} ({processedData.length - statistics.criticalCount - statistics.warningCount})</span>
          </div>
        </div>

        <ResponsiveContainer width="100%" height={300}>
          <BarChart
            data={processedData}
            margin={{ top: 20, right: 30, left: 10, bottom: 10 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#444" />
            <XAxis
              dataKey="name"
              stroke="#ccc"
              tick={false}
              axisLine={true}
            />
            <YAxis
              stroke="#ccc"
              domain={[
                0,
                (dataMax: number) => Math.ceil(dataMax * 1.05)
              ]}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend />

            <Bar
              className='cursor-pointer'
              dataKey={value1name}
              fill="#3B82F6"
              name={value1name}
              radius={[2, 2, 0, 0]}
            />
            <Bar
              className='cursor-pointer'
              dataKey={value2name}
              fill="#22C55E"
              name={value2name}
              radius={[2, 2, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>

        {/* Summary insights */}
        <div className="mt-4 text-xs text-gray-400">
          <p>{t('tripleBar.itemsSorted')}</p>
        </div>
      </>): (
        <div className="flex items-center justify-center h-full">
          <p className="text-gray-400">{t('noDataAv')}</p>
        </div>
      )
    }
    </motion.div>
  );
};

export default TripleBarChart;