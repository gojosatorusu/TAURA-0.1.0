import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { invoke } from "@tauri-apps/api/core";
import { useI18n } from '../../Pages/context/I18nContext';

interface Product {
  id: number;
  name: string;
  quantity: number;
  threshold: number;
  unit_price: number;
}

interface ProductTimelineEntry {
  period_label: string;
  start_date: string;
  end_date: string;
  initial: number;
  production: number;
  sold: number;
  returned: number;
  adjusted: number;
  final_stock: number;
  is_current_period: boolean;
}

const ProductTimelineChart = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [timelineData, setTimelineData] = useState<ProductTimelineEntry[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<number | null>(null);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [displayMethod, setDisplayMethod] = useState<string>('weekly');
  const [loading, setLoading] = useState(true);
  const [availableYears, setAvailableYears] = useState<number[]>([]);
  const { t } = useI18n()
  // Fetch products on component mount
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const result = await invoke('get_products') as Product[];
        setProducts(result);
        if (result.length > 0) {
          setSelectedProduct(result[0].id);
        }
      } catch (error) {
        console.error('Error fetching products:', error);
      }
    };

    const fetchAvailableYears = async () => {
      try {
        // Get the earliest year from product_tracker table
        const result = await invoke('get_earliest_tracking_year') as number;
        const currentYear = new Date().getFullYear();
        const years = [];
        for (let year = result; year <= currentYear; year++) {
          years.push(year);
        }
        setAvailableYears(years);
      } catch (error) {
        console.error('Error fetching available years:', error);
        // Fallback to current year
        setAvailableYears([new Date().getFullYear()]);
      }
    };

    fetchProducts();
    fetchAvailableYears();
    setLoading(false);
  }, []);

  // Fetch timeline data when filters change
  useEffect(() => {
    if (selectedProduct && selectedYear) {
      const fetchTimelineData = async () => {
        setLoading(true);
        try {
          const result = await invoke('get_product_timeline', {
            productId: selectedProduct,
            year: selectedYear,
            displayMethod: displayMethod
          }) as ProductTimelineEntry[];
          setTimelineData(result);
        } catch (error) {
          console.error('Error fetching timeline data:', error);
          setTimelineData([]);
        } finally {
          setLoading(false);
        }
      };

      fetchTimelineData();
    }
  }, [selectedProduct, selectedYear, displayMethod]);

  const chartData = useMemo(() => {
    return timelineData.map(entry => ({
      ...entry,
      // Use different opacity/styling for current period
      fillOpacity: entry.is_current_period ? 0.6 : 0.8,
    }));
  }, [timelineData]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload as ProductTimelineEntry;
      return (
        <div className="bg-gray-900/95 backdrop-blur-sm p-4 rounded-lg border border-gray-700/50 shadow-xl">
          <p className="text-white font-semibold mb-2">{`${label}`}</p>
          <p className="text-gray-300 text-sm mb-2">{`${data.start_date} to ${data.end_date}`}</p>
          <div className="space-y-1 text-sm">
            <p className="text-blue-400">{`Initial Stock: ${data.initial}`}</p>
            <p className="text-green-400">{`Production: ${data.production}`}</p>
            <p className="text-red-400">{`Sold: ${data.sold}`}</p>
            <p className="text-yellow-400">{`Returned: ${data.returned}`}</p>
            <p className="text-purple-400">{`Adjusted: ${data.adjusted > 0 ? '+' : ''}${data.adjusted}`}</p>
            <p className="text-white font-medium border-t border-gray-600 pt-1">{`Final Stock: ${data.final_stock}`}</p>
            {data.is_current_period && (
              <p className="text-orange-400 text-xs italic">{t('treasury.currentPeriod')}</p>
            )}
          </div>
        </div>
      );
    }
    return null;
  };

  const CustomDot = (props: any) => {
    const { cx, cy, payload } = props;
    if (payload.is_current_period) {
      return (
        <circle
          cx={cx}
          cy={cy}
          r={4}
          fill="#f97316"
          stroke="#fff"
          strokeWidth={2}
          className="animate-pulse"
        />
      );
    }
    return null;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin" />
        <div className="text-white ml-3">{t('timeLine.loading')}</div>
      </div>
    );
  }

  return (
    <motion.div
      className="bg-gray-900/90 backdrop-blur-sm p-6 rounded-xl shadow-xl border border-gray-700/50"
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8 }}
    >
      {/* Header and Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-6 space-y-4 lg:space-y-0">
        <h2 className="text-gray-100 text-xl font-semibold">{t('timeline.title')}</h2>
        {chartData.length > 0 &&
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Product Selector */}
            <div className="flex flex-col">
              <label className="text-gray-400 text-sm mb-1">{t('Product')}</label>
              <select
                title="select Product"
                value={selectedProduct || ''}
                onChange={(e) => setSelectedProduct(Number(e.target.value))}
                className="bg-gray-800/80 border border-gray-600 text-white rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {products.map(product => (
                  <option key={product.id} value={product.id}>
                    {product.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Year Selector */}
            <div className="flex flex-col">
              <label className="text-gray-400 text-sm mb-1">{t('year')}</label>
              <select
                title="select Year"
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="bg-gray-800/80 border border-gray-600 text-white rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {availableYears.map(year => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </div>

            {/* Display Method Selector */}
            <div className="flex flex-col">
              <label className="text-gray-400 text-sm mb-1">View</label>
              <select
                title="select View"
                value={displayMethod}
                onChange={(e) => setDisplayMethod(e.target.value)}
                className="bg-gray-800/80 border border-gray-600 text-white rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="weekly">{t('weekly')}</option>
                <option value="fortnightly">{t('fortnightly')}</option>
                <option value="monthly">{t('monthly')}</option>
                <option value="trimester">{t('quarterly')}</option>
                <option value="semester">{t('qemester')}</option>
              </select>
            </div>
          </div>
        }
      </div>

      {/* Chart */}
      {chartData.length > 0 ? (
        <div className="w-full h-96">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
              <defs>
                <linearGradient id="stockGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.1} />
                </linearGradient>
                <linearGradient id="currentStockGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f97316" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#f97316" stopOpacity={0.1} />
                </linearGradient>
              </defs>

              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />

              <XAxis
                dataKey="period_label"
                tick={{ fontSize: 12, fill: '#9ca3af' }}
                stroke="#6b7280"
              />

              <YAxis
                tick={{ fontSize: 12, fill: '#9ca3af' }}
                stroke="#6b7280"
              />

              <Tooltip content={<CustomTooltip />} />

              <Area
                type="monotone"
                dataKey="final_stock"
                stroke="#3b82f6"
                strokeWidth={2}
                fill="url(#stockGradient)"
                fillOpacity={0.6}
                dot={<CustomDot />}
                activeDot={{
                  r: 6,
                  fill: '#3b82f6',
                  stroke: '#fff',
                  strokeWidth: 2
                }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="flex items-center justify-center h-full">
          <p className="text-gray-400">{t('noDataAv')}</p>
        </div>
      )}

      {/* Summary Stats */}
      {chartData.length > 0 && (
        <div className="mt-6 pt-4 border-t border-gray-700/50">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div className="text-center">
              <p className="text-gray-400">{t('periods')}</p>
              <p className="text-white font-semibold">{chartData.length}</p>
            </div>
            <div className="text-center">
              <p className="text-gray-400">{t('avgStock')}</p>
              <p className="text-white font-semibold">
                {Math.round(chartData.reduce((sum, item) => sum + item.final_stock, 0) / chartData.length)}
              </p>
            </div>
            <div className="text-center">
              <p className="text-gray-400">{t('peakStock')}</p>
              <p className="text-white font-semibold">
                {Math.max(...chartData.map(item => item.final_stock))}
              </p>
            </div>
            <div className="text-center">
              <p className="text-gray-400">{t('rawMaterialDetails.lowStock')}</p>
              <p className="text-white font-semibold">
                {Math.min(...chartData.map(item => item.final_stock))}
              </p>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
};

export default ProductTimelineChart;