import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ColumnDef } from '@tanstack/react-table';
import { ShoppingCart, TrendingUp, DollarSign, Package } from 'lucide-react';
import Grid from '../Components/Common/Grid';
import StatCard from '../Components/Common/StatCard';
import {useI18n} from './context/I18nContext';
interface Sale {
  id: number;
  c_id: number;
  client: string;
  code: number;
  current_paid: number;
  date: string;
  description: string;
  doc_type: string; // 'BL' or 'Invoice'
  total: number;
  ve_id: number;
  status: string;
  payment_method: string;
  remise: number;
  finalized: number;
}

interface Purchase {
  id: number;      // Add this line
  v_id: number;
  vendor: string;  // This matches backend
  code: number;
  doc_type: string;
  current_paid: number;
  total: number;   // Changed from total
  date: string;    // Changed from purchase_date
  description: string;
  a_id: number;    // Changed from id
  status: string;
  payment_method: string;
  remise: number;
  finalized: number;
}
interface Vendor {
  id: number;
  name: string;
  location: string;
  phone: string;
}

interface Client {
  id: number;
  name: string;
  location: string;
  phone: string;
}

const PursAndSales = () => {
const [activeFilter, setActiveFilter] = useState<'Purchases' | 'Sales'>(() => {
  const saved = localStorage.getItem('pursAndSalesActiveFilter');
  return (saved as 'Purchases' | 'Sales') || 'Sales';
});
  const [loading, setLoading] = useState(false);
  const [salesData, setSalesData] = useState<Sale[]>([]);
  const [purchasesData, setPurchasesData] = useState<Purchase[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const {t} = useI18n();
  const animationConfig = {
    pageTransition: { duration: 0.3, ease: "easeOut" },
    itemEntry: { duration: 0.25, ease: "easeOut" },
    itemHover: { duration: 0.15, ease: "easeOut" },
    itemTap: { duration: 0.1, ease: "easeOut" },
    spinner: { duration: 0.6, ease: "linear" },
    buttonHover: { duration: 0.12, ease: "easeOut" },
    iconWiggle: { duration: 1.2, ease: "easeInOut" },
    filterTransition: { duration: 0.2, ease: "easeInOut" },
    staggerDelay: 0.03,
  };
  const getPaymentStatusLabel = (currentPaid: number, total: number, remise: number) => {
    if (currentPaid >= total*(100-remise)/100) {
      return { label: t('salesPurchases.fullyPaid'), color: 'bg-green-100 text-green-800 border-green-200' };
    } else if (currentPaid > 0) {
      return { label: t('salesPurchases.partiallyPaid'), color: 'bg-yellow-100 text-yellow-800 border-yellow-200' };
    } else {
      return { label: t('salesPurchases.notPaid'), color: 'bg-red-100 text-red-800 border-red-200' };
    }
  };

  useEffect(() => {
  localStorage.setItem('pursAndSalesActiveFilter', activeFilter);
  }, [activeFilter]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const result = await Promise;
        const vendorsList = result as Vendor[];
        setVendors(vendorsList);
        const clientsResult = await Promise;
        const clientsList = clientsResult as Client[];
        setClients(clientsList);

        const salesResult = await Promise;
        const salesList = salesResult as Sale[];
        setSalesData(salesList);

        const purchasesResult = await Promise;
        const purchasesList = purchasesResult as Purchase[];
        setPurchasesData(purchasesList);
      } catch (error) {
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Sales columns configuration
  const salesColumns: ColumnDef<Sale>[] = [
    {
      accessorKey: 'code',
      header: 'Code',
      cell: info => (
        <span className="font-mono text-blue-400">
          {info.getValue() as string}
        </span>
      )
    },
    {
      accessorKey: 'c_id',
      header: t('client'),
      cell: info => {
        const clientId = info.getValue() as number;
        const client = clients.find(c => c.id === clientId);
        return client ? client.name : `Client #${clientId}`;
      }
    },
    {
      accessorKey: 'doc_type',  // Change to doc_type
      header: t('documentType'),
      cell: info => (
        <span className={`px-2 py-1 rounded text-xs font-medium ${info.getValue() === 'BL' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'}`}>
          {info.getValue() as string}
        </span>
      )
    },
    {
      accessorKey: 'current_paid',
      header: t('paid'),
      cell: info => `$${Number(info.getValue() || 0).toFixed(2)}`,
      enableSorting: true
    },
    {
      accessorKey: 'total',  // Changed from 'total'
      header: t('total'),
    cell: info => {
      const row = info.row.original;
      const discountedTotal = row.total * (100 - Number(row.remise)) / 100;
      return `$${discountedTotal.toFixed(2)}`;
    },
      enableSorting: true
    },
    {
      accessorKey: 'date',   // Changed from 'sale_date'
      header: 'Date',
      cell: info => new Date(info.getValue() as string).toLocaleDateString()
    },
    {
      accessorKey: 'status',   // Changed from 'sale_date'
      header: t('status'),
      cell: info => (
        <span className={`px-2 py-1 rounded text-xs font-medium ${info.getValue() === 'Approved' ? 'bg-cyan-100 text-cyan-800' : 'bg-red-100 text-amber-800'}`}>
          {info.getValue() as string}
        </span>
      ),
      enableSorting: true
    },
    {
    accessorKey: 'payment_status',
    header: t('paymentStatus'),
    enableSorting: true,
    sortingFn: (rowA, rowB) => {
      // Calculate discounted totals for sorting
      const totalA = rowA.original.total * (100 - Number(rowA.original.remise)) / 100;
      const totalB = rowB.original.total * (100 - Number(rowB.original.remise)) / 100;
      
      const statusA = getPaymentStatusLabel(rowA.original.current_paid, totalA,rowA.original.remise);
      const statusB = getPaymentStatusLabel(rowB.original.current_paid, totalB,rowB.original.remise);
      
      const statusOrder = { 'Not Paid': 0, 'Partially Paid': 1, 'Fully Paid': 2 };
      return statusOrder[statusA.label as keyof typeof statusOrder] - statusOrder[statusB.label as keyof typeof statusOrder];
    },
    cell: info => {
      const row = info.row.original;
      const discountedTotal = row.total * (100 - Number(row.remise)) / 100;
      const paymentStatus = getPaymentStatusLabel(row.current_paid, discountedTotal,row.remise);
      return (
        <span className={`px-2 py-1 rounded-full text-xs font-medium border ${paymentStatus.color}`}>
          {paymentStatus.label}
        </span>
      );
    }
  }
  ];

  // Purchases columns configuration
  const purchasesColumns: ColumnDef<Purchase>[] = [
    {
      accessorKey: 'code',
      header: 'Code',
      cell: info => (
        <span className="font-mono text-blue-400">
          {info.getValue() as string}
        </span>
      )
    },
    {
      accessorKey: 'v_id',
      header: t('vendor'),
      cell: info => {
        const vendorId = info.getValue() as number;
        const vendor = vendors.find(v => v.id === vendorId);
        return vendor ? vendor.name : `Vendor #${vendorId}`;
      }
    },
    {
      accessorKey: 'doc_type',  // Change to doc_type
      header: t('documentType'),
      cell: info => (
        <span className={`px-2 py-1 rounded text-xs font-medium ${info.getValue() === 'BL' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'}`}>
          {info.getValue() as string}
        </span>
      )
    },
    {
      accessorKey: 'current_paid',
      header: t('paid'),
      cell: info => `$${Number(info.getValue() || 0).toFixed(2)}`,
      enableSorting: true
    },
    {
      accessorKey: 'total',  // Changed from 'total'
      header: t('total'),
    cell: info => {
      const row = info.row.original;
      const discountedTotal = row.total * (100 - Number(row.remise)) / 100;
      return `$${discountedTotal.toFixed(2)}`;
    },
      enableSorting: true
    },
    {
      accessorKey: 'date',   // Changed from 'purchase_date'
      header: 'Date',
      cell: info => new Date(info.getValue() as string).toLocaleDateString()
    },
    {
      accessorKey: 'status',   // Changed from 'sale_date'
      header: t('status'),
      cell: info => (
        <span className={`px-2 py-1 rounded text-xs font-medium ${info.getValue() === 'Approved' ? 'bg-cyan-100 text-cyan-800' : 'bg-red-100 text-amber-800'}`}>
          {info.getValue() as string}
        </span>
      ),
      enableSorting: true
    },
    {
    accessorKey: 'payment_status',
    header: t('paymentStatus'),
    enableSorting: true,
    sortingFn: (rowA, rowB) => {
      // Calculate discounted totals for sorting
      const totalA = rowA.original.total * (100 - Number(rowA.original.remise)) / 100;
      const totalB = rowB.original.total * (100 - Number(rowB.original.remise)) / 100;
      
      const statusA = getPaymentStatusLabel(rowA.original.current_paid, totalA,rowA.original.remise);
      const statusB = getPaymentStatusLabel(rowB.original.current_paid, totalB,rowB.original.remise);
      
      const statusOrder = { [t('salesPurchases.notPaid')]: 0, [t('salesPurchases.partiallyPaid')]: 1, [t('salesPurchases.fullyPaid')]: 2 };
      return statusOrder[statusA.label as keyof typeof statusOrder] - statusOrder[statusB.label as keyof typeof statusOrder];
    },
    cell: info => {
      const row = info.row.original;
      const discountedTotal = row.total * (100 - Number(row.remise)) / 100;
      const paymentStatus = getPaymentStatusLabel(row.current_paid, discountedTotal,row.remise);
      return (
        <span className={`px-2 py-1 rounded-full text-xs font-medium border ${paymentStatus.color}`}>
          {paymentStatus.label}
        </span>
      );
    }
  }
  ];

  // Calculate metrics for sales
  const salesMetrics = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const currentYearSales = salesData.filter(sale =>
      new Date(sale.date).getFullYear() === currentYear
    );

    const totalSales = currentYearSales.reduce((sum, sale) => sum + sale.total * (100 -sale.remise)/100, 0);
    const avgOrderValue = currentYearSales.length > 0 ? totalSales / currentYearSales.length : 0;
    const fullyPaidCount = currentYearSales.filter(s => s.current_paid >= s.total* (100 -s.remise)/100).length;

    return {
      totalSales,
      totalOrders: currentYearSales.length,
      avgOrderValue,
      fullyPaidCount
    };
  }, [salesData]);

  // Calculate metrics for purchases (current year only)
  const purchaseMetrics = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const currentYearPurchases = purchasesData.filter(purchase =>
      new Date(purchase.date).getFullYear() === currentYear
    );

    const totalPurchases = currentYearPurchases.reduce((sum, purchase) => sum + purchase.total * (100 -purchase.remise)/100, 0);
    const avgPurchaseValue = currentYearPurchases.length > 0 ? totalPurchases / currentYearPurchases.length : 0;
    const fullyPaidCount = currentYearPurchases.filter(p => p.current_paid >= p.total * (100 -p.remise)/100).length;

    return {
      totalPurchases,
      totalOrders: currentYearPurchases.length,
      avgPurchaseValue,
      fullyPaidCount,
      completedPurchases: fullyPaidCount
    };
  }, [purchasesData]);

  const FilterTab = ({
    label,
    count,
    isActive,
    onClick
  }: {
    label: string;
    count: number;
    isActive: boolean;
    onClick: () => void;
  }) => (
    <motion.button
      onClick={onClick}
      className={`px-6 py-3 rounded-lg font-medium transition-all duration-200 ${isActive
        ? 'bg-blue-600 text-white shadow-lg ring-2 ring-blue-500 ring-opacity-50'
        : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white'
        }`}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      transition={animationConfig.buttonHover}
    >
      <div className="flex items-center gap-2">
        {label === 'Sales' ? <TrendingUp size={16} /> : <ShoppingCart size={16} />}
        {label} ({count})
      </div>
    </motion.button>
  );

  if (loading) {
    return (
      <div className="flex flex-col gap-4 items-center justify-center min-h-screen">
        <motion.div
          className="w-8 h-8 border-2 border-white border-t-transparent rounded-full"
          animate={{ rotate: 360 }}
          transition={{
            duration: animationConfig.spinner.duration,
            repeat: Infinity,
            ease: animationConfig.spinner.ease
          }}
        />
        <motion.div
          className="text-white"
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        >
          {t('loadingFilter', { filter: activeFilter })}
        </motion.div>
      </div>
    );
  }

  return (
    <div className='flex flex-col space-y-8 mx-auto py-6 pb-5 px-1 lg:px-2 xl:px-4'>
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
      >
        <h1 className="text-3xl font-bold text-white mb-2">{t('salesPurchases.title')}</h1>
        <p className="text-slate-400">{t('salesPurchases.manageTransactions')}</p>
      </motion.div>

      {/* Filter Tabs */}
      <motion.div
        className="flex gap-4 justify-center"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.2 }}
      >
        <FilterTab
          label={t('sales')}
          count={salesData.length}
          isActive={activeFilter === 'Sales'}
          onClick={() => setActiveFilter('Sales')}
        />
        <FilterTab
          label={t('purchases')}  // Changed from "Purs"
          count={purchasesData.length}
          isActive={activeFilter === 'Purchases'}
          onClick={() => setActiveFilter('Purchases')}
        />
      </motion.div>

      <AnimatePresence mode="wait">
        {activeFilter === 'Sales' ? (
          <motion.div
            key="sales"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            transition={animationConfig.pageTransition}
            className="space-y-8"
          >
            {/* Sales Metrics */}
            <motion.div
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
            >
              <StatCard
                name={t('salesPurchases.totalSales')}
                value={`${salesMetrics.totalSales.toFixed(2)} DA`}
                icon={DollarSign}
                color="#10b981"
              />
              <StatCard
                name={t('salesPurchases.totalOrders')}
                value={salesMetrics.totalOrders}
                icon={Package}
                color="#3b82f6"
              />
              <StatCard
                name={t('salesPurchases.avgOrderValue')}
                value={`${salesMetrics.avgOrderValue.toFixed(2)} DA`}
                icon={DollarSign}
                color="#f59e0b"
              />
              <StatCard
                name={t('salesPurchases.fullyPaid')}
                value={salesMetrics.fullyPaidCount}
                icon={ShoppingCart}
                color="#10b981"
              />
            </motion.div>

            {/* Sales Grid */}
            <motion.div
              className="bg-slate-900 p-4 rounded-xl shadow-md border border-slate-700"
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.5 }}
            >
              <Grid
                data={salesData.map(sale => ({ ...sale, id: sale.ve_id }))}
                columns={salesColumns}
                routing={{
                  detailsPath: '/SaleDetails',
                  addNewPath: '/AddSale'
                }}
                title="Sales"
                type="Sales"
                clients={clients}  // Add this
              />
            </motion.div>
          </motion.div>
        ) : (
          <motion.div
            key="purchases"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            transition={animationConfig.pageTransition}
            className="space-y-8"
          >
            {/* Purchase Metrics */}
            <motion.div
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
            >
              <StatCard
                name={t('salesPurchases.totalPurchases')}
                value={`${purchaseMetrics.totalPurchases.toFixed(2)} DA`}
                icon={DollarSign}
                color="#ef4444"
              />
              <StatCard
                name={t('salesPurchases.totalOrders')}
                value={purchaseMetrics.totalOrders}
                icon={Package}
                color="#3b82f6"
              />
              <StatCard
                name={t('salesPurchases.completed')}
                value={purchaseMetrics.completedPurchases}
                icon={ShoppingCart}
                color="#10b981"
              />
              <StatCard
                name={t('salesPurchases.avgPurchaseValue')}
                value={`${purchaseMetrics.avgPurchaseValue.toFixed(2)} DA`}
                icon={DollarSign}
                color="#f59e0b"
              />
            </motion.div>

            {/* Purchases Grid */}
            <motion.div
              className="bg-slate-900 p-4 rounded-xl shadow-md border border-slate-700"
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.5 }}
            >
              <Grid
                data={purchasesData.map(purchase => ({ ...purchase, id: purchase.a_id }))}
                columns={purchasesColumns}
                routing={{
                  detailsPath: '/PurchaseDetails',
                  addNewPath: '/AddPurchase'
                }}
                title="Purchases"
                type="Purs"
                vendors={vendors}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default PursAndSales;