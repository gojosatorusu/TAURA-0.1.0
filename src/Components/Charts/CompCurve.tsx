import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useI18n } from '../../Pages/context/I18nContext';
// Define types for our props
interface DataPoint {
  [key: string]: unknown;
}

interface CurveConfig {
  dataKey: string;
  color: string;
  name: string;
}

interface CompCurveProps {
  title?: string;
  data: DataPoint[];
  curves: CurveConfig[];
  xAxisKey: string;
  yAxisFormatter?: (value: number) => string;
  height?: string | number;
  className?: string;
}

const CompCurve: React.FC<CompCurveProps> = ({
  title ,
  data,
  curves,
  xAxisKey,
  yAxisFormatter = (value) => `${value}`,
  height = 400,
  className = '',
}) => {
  // Animation states
  const {t} = useI18n();
  title=(!title)?t('compCurve.title'):title;
  const [animatedData, setAnimatedData] = useState<DataPoint[]>([]);
  const [isAnimating, setIsAnimating] = useState(true);
  
  // Animation effect
  useEffect(() => {
    setAnimatedData([]);
    setIsAnimating(true);
    
    // Animate data points appearing one by one
    const animationDuration = 1000; // ms
    const intervalDuration = animationDuration / data.length;
    
    let currentIndex = 0;
    const interval = setInterval(() => {
      if (currentIndex < data.length) {
        setAnimatedData(prev => [...prev, data[currentIndex]]);
        currentIndex++;
      } else {
        clearInterval(interval);
        setIsAnimating(false);
      }
    }, intervalDuration);
    
    return () => clearInterval(interval);
  }, [data]);
  
  return (
    <div className={`bg-gray-900 rounded-lg shadow p-4 ${className}`} style={{ height }}>
      {title && <h2 className="text-xl font-bold mb-4 text-gray-00">{title}</h2>}
      <ResponsiveContainer width="100%" height={title ? "90%" : "100%"}>
        <LineChart
          data={isAnimating ? animatedData : data}
          margin={{
            top: 10,
            right: 30,
            left: 20,
            bottom: 10,
          }}
        >
          <CartesianGrid strokeDasharray="3 3" opacity={0.6} />
          <XAxis 
            dataKey={xAxisKey}
            tick={{ fontSize: 12 }}
            tickMargin={10}
          />
          <YAxis 
            tickFormatter={yAxisFormatter}
            tick={{ fontSize: 12 }}
          />
          <Tooltip 
            formatter={(value: number, name: string) => [yAxisFormatter(value), name]}
            contentStyle={{ borderRadius: '4px' }}
          />
          <Legend 
            wrapperStyle={{ paddingTop: '10px' }}
            iconType="circle"
          />
          {curves.map((curve) => (
            <Line
              key={curve.dataKey}
              type="monotone"
              dataKey={curve.dataKey}
              name={curve.name}
              stroke={curve.color}
              strokeWidth={2}
              dot={{ r: 4, strokeWidth: 1 }}
              activeDot={{ r: 7, strokeWidth: 1 }}
              isAnimationActive={true}
              animationDuration={1500}
              animationEasing="ease-in-out"
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default CompCurve;