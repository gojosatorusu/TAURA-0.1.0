import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { useI18n } from '../../Pages/context/I18nContext';

type DataEntry = {
  name: string;
  value: number;
  color: string;
};

const PiesChart = ({ data, title }: { data: DataEntry[], title: string }) => {
  const [showAll, setShowAll] = useState(false);
  const { t } = useI18n()
  const processedData = React.useMemo(() => {
    if (data.length <= 8 || showAll) return data;

    // Sort data by value (descending)
    const sortedData = [...data].sort((a, b) => b.value - a.value);

    // Take top 7 items (increased from 6)
    const topItems = sortedData.slice(0, 7);

    // Combine the rest into "Others"
    const otherItems = sortedData.slice(7);
    const othersValue = otherItems.reduce((sum, item) => sum + item.value, 0);

    if (othersValue > 0) {
      return [
        ...topItems,
        {
          name: t('others'),
          value: othersValue,
          color: "#64748b" // slate-500
        }
      ];
    }

    return topItems;
  }, [data, showAll]);

  // Calculate total for percentage
  const total = processedData.reduce((sum, item) => sum + item.value, 0);

  // Format data for display with percentages
  const formattedData = processedData.map(item => ({
    ...item,
    percentage: ((item.value / total) * 100).toFixed(1)
  }));

  // Custom rendering for label - only show for segments >= 8%
  const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
    if (percent < 0.08) return null; // Only show for segments >= 8%

    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.6;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    return (
      <text
        x={x}
        y={y}
        fill="white"
        textAnchor="middle"
        dominantBaseline="central"
        fontSize="11"
        fontWeight="600"
        className="drop-shadow-sm"
      >
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

  // Custom formatter for the legend
  const renderColorfulLegendText = (value: string, entry: any) => {
    const { payload } = entry;
    return (
      <span className="text-xs text-gray-300">
        {`${value} (${payload.percentage}%)`}
      </span>
    );
  };

  return (
    <motion.div
      className="bg-gray-900/90 backdrop-blur-sm p-6 rounded-xl shadow-xl border border-gray-700/50 h-fit"
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8 }}
    >
      {/* Header */}

      <div className="flex justify-between items-center mb-4">
        <h2 className="text-gray-100 text-lg font-semibold">{title}</h2>
        {data.length > 8 && (
          <button
            onClick={() => setShowAll(!showAll)}
            className="text-xs px-3 py-1.5 bg-gray-800/80 hover:bg-gray-700/80 text-gray-300 rounded-lg transition-all duration-200 border border-gray-600/50"
          >
            {showAll ? t('showLess') : t('showAll', { count: data.length })}
          </button>
        )}
      </div>
      {/* Chart Container */}
      {data.length > 0 ? (
        <div className="w-full h-96">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                dataKey="value"
                cx="50%"
                cy="50%"
                labelLine={false}
                outerRadius={180}
                innerRadius={50}
                fill="#6366f1"
                data={formattedData}
                label={renderCustomizedLabel}
                stroke="rgba(255,255,255,0.1)"
                strokeWidth={1}
              >
                {formattedData.map((entry: DataEntry & { percentage: string }, index: number) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={entry.color}
                    className="hover:opacity-80 transition-opacity"
                  />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: '#020618',
                  borderColor: "#4b5563",
                  borderRadius: '8px',
                  boxShadow: '0 10px 25px rgba(0,0,0,0.3)'
                }}
                itemStyle={{ color: "#e5e7eb" }}
                formatter={(value, name, props) => [
                  `${value.toLocaleString()} (${props.payload.percentage}%)`,
                  name
                ]}
              />
              <Legend
                layout="vertical"
                verticalAlign="middle"
                align="right"
                wrapperStyle={{
                  fontSize: '11px',
                  maxHeight: '300px',
                  overflowY: 'auto',
                  paddingLeft: '20px'
                }}
                formatter={renderColorfulLegendText}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>) : (
        <div className="flex items-center justify-center h-full">
          <p className="text-gray-400">{t('noDataAv')}</p>
        </div>
      )
      }

      {/* Summary Stats */}
      <div className="mt-4 pt-4 border-t border-gray-700/50">
        <div className="flex justify-between text-sm text-gray-400">
          <span>{t('totalItems')}: {data.length}</span>
          <span>{t('purchaseDetails.totalQuantity')}: {total.toLocaleString()}</span>
        </div>
      </div>
    </motion.div>
  );
};

export default PiesChart;