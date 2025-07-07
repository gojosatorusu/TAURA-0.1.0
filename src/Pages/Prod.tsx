import { useMemo, useEffect, useState } from 'react';
import TripleBarChart from '../Components/Charts/TripleBarChart';
import { useNavigate } from 'react-router-dom';
import Grid from '../Components/Common/Grid';
import StatCard from '../Components/Common/StatCard';
import CriticalItemsChart from '../Components/Charts/CriticalItemsChart';
import { ColumnDef } from '@tanstack/react-table';
import { Package, Activity, Database, ChartSpline } from 'lucide-react';
import { motion } from 'framer-motion';
import ProductTimelineChart from '../Components/Charts/ProductTimelineChart';
import {StockSummaryModal} from '../Components/Modals'
import {useI18n} from './context/I18nContext';
// Define the Product type to match backend response
interface Product {
  id: number;
  name: string;
  quantity: number;
  threshold: number;
  unit_price: number;
}


const Products = () => {
  const navigate = useNavigate();
  const [Products_Data, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [showStockModal, setShowStockModal] = useState<boolean>(false);
  const { t } = useI18n();
  
  useEffect(() => {
    // Fetch products from backend
    setLoading(true);
    Promise
      .then((result) => {
        const products = result as Product[];
        setProducts(products);
      })
      .catch((error) => {
        setProducts([]); // Set empty array on error
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  
  const criticalItems = useMemo(() => {
    return Products_Data.filter(product => product.quantity <= product.threshold);
  }, [Products_Data]);

  // Calculate inventory metrics
const inventoryMetrics = useMemo(() => {
    const totalItems = Products_Data.length;
    const totalInventory = Products_Data.reduce((sum, product) => sum + product.quantity, 0);
    const healthScore = Products_Data.reduce((score, product) => {
      return score + (product.quantity/product.threshold >= 1.5  ? 1 :  (product.quantity/product.threshold <= 1 ? 0 : 0.5));
    }, 0) / totalItems * 100;
    return {
      totalItems,
      totalInventory,
      healthScore,
      criticalCount: criticalItems.length
    };
  }, [criticalItems]);

  // Define columns for the Grid
  const columns: ColumnDef<Product>[] = [
    {
      accessorKey: 'name',
      header: 'Product',
      cell: info => info.getValue()
    },
    {
      accessorKey: 'quantity',
      header: t('quantity'),
      cell: info => info.getValue(),
      enableSorting: true
    },
    {
      accessorKey: 'unit_price',
      header: t('unitPrice'),
      cell: info => `$${Number(info.getValue()).toFixed(2)}`,
      enableSorting: true
    },
    {
      accessorKey: 'threshold',
      header: t('threshold'),
      cell: info => info.getValue(),
      enableSorting: true
    }
  ];

  // Handle additional action for products
  const handleProductAction = (product: Product) => {
    // Navigate to AddProd page
    navigate('/AddProd', {
      state: {
        productId: product.id,
        productName: product.name
      }
    });
  };

  if (loading) {
    return (
      <div className="flex flex-col gap-4 items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin" />
        <div className="text-white">{t('loadingData')}</div>
      </div>
    );
  }

  return (
    <div className='flex flex-col space-y-8 mx-auto py-6 pb-5 px-1 lg:px-2 xl:px-4'>
      <motion.div
      className='flex justify-between '
        initial={{ opacity: 0, y: -40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
      >
        <h1 className="text-3xl font-bold text-white mb-2">{t('notifications.products')}</h1>
            <button
              onClick={() => setShowStockModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg transition-colors"
            >
              <ChartSpline size={16} />
              {t('StockAnalysis')}
            </button>
      </motion.div>
      {/* Top metrics cards */}
      <motion.div 
      className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
      >
        <StatCard 
          name={t('totalProducts')}
          value={Math.round(inventoryMetrics.totalItems)}
          icon={Package}
          color="#3b82f6"
        />
        <StatCard 
          name={t('totalInventory')}
          value={Math.round(inventoryMetrics.totalInventory)}
          icon={Database}
          color="#10b981"
        />
        <StatCard 
          name={t('InventoryHealth')} 
          value={`${(Math.round(inventoryMetrics.healthScore * 100) / 100).toFixed(2)}%`} 
          icon={Activity} 
          color={inventoryMetrics.healthScore > 90 ? "#10b981" : "#f59e0b"} 
        />
      </motion.div>

      {/* Product Health Chart - Full Width */}
      <motion.div 
        className="bg-gray-900/90 backdrop-blur-sm  p-6 rounded-xl shadow-md border-slate-700"
        initial={{ opacity: 0, y: 80 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.5 }}>
        <TripleBarChart
          data={Products_Data.map(product => ({
            ...product,
            value1: product.quantity,
            value2: product.threshold // Using threshold instead of packaging
          }))}
          value1name='quantity'
          value2name='threshold'
        />
      </motion.div>

      {/* Critical Items Chart - Full Width with less height */}
      <motion.div className="bg-gray-900/90 backdrop-blur-sm p-6 rounded-xl "         
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        >
        <CriticalItemsChart 
          criticalItems={criticalItems} 
          data={Products_Data} 
        />
      </motion.div>
      <motion.div 
        className=" rounded-xl border-slate-700"
        initial={{ opacity: 0, y: 80 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.5 }}>
          <ProductTimelineChart/>
      </motion.div>

      {/* Products grid */}
        <Grid
          data={Products_Data}
          columns={columns}
          routing={{
            detailsPath: '/ProdDetails',
            addNewPath: '/AddProd'
          }}
          title="Products"
          type="product"
          onRowActionClick={handleProductAction}
        />
      <StockSummaryModal
        isOpen={showStockModal}
        onClose={() => setShowStockModal(false)}
        loading={loading}
      />
      </div>
  );
};

export default Products;