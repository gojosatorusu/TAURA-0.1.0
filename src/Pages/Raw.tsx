import { ColumnDef } from '@tanstack/react-table';
import StatCard from '../Components/Common/StatCard';
import PiesChart from '../Components/Charts/PieChart';
import { motion } from 'framer-motion';
import { AlertTriangle, Shield, Package, TrendingUp } from 'lucide-react';
import CriticalItemsChart from '../Components/Charts/CriticalItemsChart';
import Grid from '../Components/Common/Grid';
import { useEffect, useState, useMemo } from 'react';
import {useI18n} from './context/I18nContext';
interface RawMaterial {
  id: number;
  name: string;
  quantity: number; 
  unit_price: number;
  threshold: number;
  vendor: string;
  v_id: number;
}

const Raw_Materials = () => {
  const [rawMaterials, setRawMaterials] = useState<RawMaterial[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const {t} = useI18n();
  // Calculate inventory health metrics using useMemo for performance
  // useMemo is needed here because this calculation is expensive and depends only on rawMaterials
  const inventoryMetrics = useMemo(() => {
    if (rawMaterials.length === 0) {
      return {
        critical: 0,
        safe: 0,
        warning: 0,
        totalValue: 0,
        totalItems: 0,
        criticalItems: []
      };
    }

    const critical = rawMaterials.filter(item => item.quantity <= item.threshold);
    const safe = rawMaterials.filter(item => item.quantity >= item.threshold * 1.5);
    const warning = rawMaterials.filter(item => 
      item.quantity > item.threshold && item.quantity < item.threshold * 1.5
    );
    
    const totalValue = rawMaterials.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
    const totalItems = rawMaterials.length;
    return {
      critical: critical.length,
      safe: safe.length,
      warning: warning.length,
      totalValue,
      totalItems,
      criticalItems: critical
    };
  }, [rawMaterials]);
  // Dynamic stat cards based on calculated metrics
  // useMemo is needed here because this array depends on inventoryMetrics and prevents recreation on every render
  const statCards = useMemo(() => [
    {
      name: t('rawMaterials.criticalItems'),
      icon: AlertTriangle,
      value: inventoryMetrics.critical,
      color: "#EF4444", // Red for critical
    },
    {
      name: t('rawMaterials.safeStockItems'),
      icon: Shield,
      value: inventoryMetrics.safe,
      color: "#22C55E", // Green for safe
    },
    {
      name: t('rawMaterials.warningLevelItems'),
      icon: Package,
      value: inventoryMetrics.warning,
      color: "#F97316", // Orange for warning
    },
    {
      name: t('rawMaterials.totalMaterials'),
      icon: TrendingUp,
      value: inventoryMetrics.totalItems,
      color: "#3B82F6", // Blue for total
    },
  ], [inventoryMetrics]);


  // Prepare data for PieChart with colors
  // useMemo is needed here because this transformation involves generating colors and should be memoized
  const pieChartData = useMemo(() => 
    rawMaterials.map((item, index) => ({
      name: item.name,
      value: item.quantity/item.threshold,
      color: `hsl(${(index * 137.5) % 360}, 50%, 50%)` // Generate consistent colors based on index
    }))
  , [rawMaterials]);

  useEffect(() => {
    const fetchRawMaterials = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        const result = await Promise;
        setRawMaterials(result as RawMaterial[]);
      } catch (error) {
        setError(t('failedToLoad'));
      } finally {
        setIsLoading(false);
      }
    };

    fetchRawMaterials();
  }, []);

  // Define columns for the Grid with proper typing for GridRawMaterial
  // useMemo is NOT needed here because column definitions are static and don't depend on state
  const columns: ColumnDef<RawMaterial>[] = [
    {
      accessorKey: 'name',
      header: t('rawMaterials.materialName'),
      cell: ({ getValue }) => getValue()
    },
    {
      accessorKey: 'quantity',
      header: t('rawMaterials.currentStock'),
      cell: ({ getValue }) => {
        const value = getValue() as number;
        return value.toLocaleString();
      }
    },
    {
      accessorKey: 'threshold',
      header: t('threshold'),
      cell: ({ getValue }) => {
        const value = getValue() as number;
        return value.toLocaleString();
      }
    },
    {
      accessorKey: 'vendor',
      header: t('vendor'),
      cell: ({ getValue }) => getValue()
    },
    {
      accessorKey: 'unit_price',
      header: t('unitPrice'),
      cell: ({ getValue }) => {
        const value = getValue() as number;
        return `$${value.toFixed(2)}`;
      }
    },
    {
      id: 'status',
      header: t('rawMaterials.stockStatus'),
      cell: ({ row }) => {
        const quantity = row.original.quantity;
        const threshold = row.original.threshold;
        
        let status = '';
        let colorClass = '';
        
        if (quantity <= threshold) {
          status = t('critical');
          colorClass = 'text-red-400 bg-red-900/20';
        } else if (quantity >= threshold * 1.5) {
          status = t('safe');
          colorClass = 'text-green-400 bg-green-900/20';
        } else {
          status = t('warning');
          colorClass = 'text-orange-400 bg-orange-900/20';
        }
        
        return (
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${colorClass}`}>
            {status}
          </span>
        );
      }
    }
  ];

  if (isLoading) {
    return (
            <div className="flex flex-col gap-4 items-center justify-center min-h-screen">
              <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin" />
              <div className="text-white">{t('addProduct.loadingRawMaterials')}</div>
            </div>
    );
  }

  if (error) {
    return (
      <div className='min-h-screen bg-slate-950 flex items-center justify-center'>
        <div className='text-center'>
          <div className="text-red-400 text-xl mb-4">{t('failedToLoad')}</div>
          <div className="text-white text-sm">{error}</div>
        </div>
      </div>
    );
  }


  return (
    <div className='min-h-screen bg-slate-950'>
      <div className='mx-auto py-6 pb-5 px-1 lg:px-2 xl:px-4 space-y-8'>
        
        {/* Page Header */}
        <motion.div
          className="mb-8"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h1 className="text-3xl font-bold text-white mb-2">{t('rawMaterials.title')}</h1>
        </motion.div>

        {/* Stat Cards - Now with meaningful metrics */}
        <motion.div
          className='grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4'
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          {statCards.map((stat, idx) => (
            <StatCard
              key={idx}
              name={stat.name}
              icon={stat.icon}
              value={stat.value}
              color={stat.color}
            />
          ))}
        </motion.div>
        
        {/* Charts Section 1 - Better responsive layout */}
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          {/* Pie Chart - Use fetched data */}
          <div className='bg-slate-900 rounded-xl'>
            <PiesChart 
              data={pieChartData}
              title={t('rawMaterials.overview')} 
            />
          </div>
        </motion.div>
        
        {/* Critical Items Section */}
        <motion.div 
          className='w-full'
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
        >
          <div className='bg-gray-900/90 backdrop-blur-sm  p-8 rounded-2xl border border-gray-700/50 shadow-2xl'>
            <CriticalItemsChart
              criticalItems={inventoryMetrics.criticalItems}
              data={rawMaterials}
            />
          </div>
        </motion.div>

        {/* Data Grid Section */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
        >
          <Grid
            data={rawMaterials}
            columns={columns}
            routing={{
              detailsPath: '/RawDetails',
              addNewPath: '/AddRaw',
            }}
            title="Raw Materials"
            type="raw"
          />
        </motion.div>
      </div>
    </div>
  );
};

export default Raw_Materials;