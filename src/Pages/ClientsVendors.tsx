import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ColumnDef } from '@tanstack/react-table';
import { Users, Briefcase, DollarSign, FileText, List,Truck } from 'lucide-react';
import Grid from '../Components/Common/Grid';
import StatCard from '../Components/Common/StatCard';
import { invoke } from "@tauri-apps/api/core";
import {useI18n} from './context/I18nContext';
interface Client {
  id: number;
  name: string;
  location: string;
  phone: string;
  rest?: number; // Added rest property
  nif: String;
  nis: String;
  rc: String;
  ar: String;
}

interface Rester {
  id: number;
  name: string;
  rest: number;
}

interface Vendor {
  id: number;
  name: string;
  location: string;
  phone: string;
  rest?: number; // Added rest property
  nif: String;
  nis: String;
  rc: String;
  ar: String;
}

const ClientsVendors: React.FC = () => {
  const [activeFilter, setActiveFilter] = useState<'Clients' | 'Vendors'>(() => {
    const saved = localStorage.getItem('clients&vendors');
    return (saved as 'Clients' | 'Vendors') || 'Vendors';
  });

    useEffect(() => {
  localStorage.setItem('clients&vendors', activeFilter);
  }, [activeFilter]);

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const {t} = useI18n();
  const animationConfig = {
    pageTransition: { duration: 0.3, ease: "easeOut" },
    buttonHover: { duration: 0.12, ease: "easeOut" },
    filterTransition: { duration: 0.2, ease: "easeInOut" },
  };

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        // Fetch vendors
        const vendorsResult = await invoke('get_whole_vendors');
        const vendorsList = vendorsResult as Vendor[];
        console.log("Vednors : ",vendorsList)
        // Fetch client rests
        const restsResultV = await invoke('get_vendors_rests');
        const restsListV = restsResultV as Rester[];
        console.log('Rests Data:', restsListV);

        const vendorsWithRests = vendorsList.map(vendor => {
          const restData = restsListV.find(rest => rest.id === vendor.id);
          return {
            ...vendor,
            rest: restData ? restData.rest : 0
          };
        });

        setVendors(vendorsWithRests);
        console.log('Vendors Data:', vendorsList);

        // Fetch clients
        const clientsResult = await invoke('get_whole_clients');
        const clientsList = clientsResult as Client[];
        console.log("whole client .....", clientsList)

        // Fetch client rests
        const restsResult = await invoke('get_clients_rests');
        const restsList = restsResult as Rester[];
        console.log('Rests Data:', restsList);

        // Merge clients with their rest amounts
        const clientsWithRests = clientsList.map(client => {
          const restData = restsList.find(rest => rest.id === client.id);
          return {
            ...client,
            rest: restData ? restData.rest : 0
          };
        });

        setClients(clientsWithRests);
        console.log('Clients Data with Rests:', clientsWithRests);
        setIsLoading(false);
      } catch (err) {
        console.error('Error fetching data:', err);
        setError(t('failedToLoad'));
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  // Client columns with proper rest display
  const clientColumns: ColumnDef<Client>[] = [
    {
      accessorKey: 'name',
      header: 'Client',
      cell: info => info.getValue()
    },
    {
      accessorKey: 'location',
      header: 'Location',
      cell: info => info.getValue()
    },
    {
      accessorKey: 'phone',
      header: 'Phone',
      cell: info => info.getValue()
    },
    {
      accessorKey: 'rest',
      header: 'Rest',
      cell: info => {
        const rest = info.getValue() as number;
        return (
          <span className={`font-medium ${rest > 0 ? 'text-orange-400' : rest < 0 ? 'text-red-400' : 'text-green-400'}`}>
            {rest.toLocaleString()} DA
          </span>
        );
      }
    },
  ];

  // Vendor columns
  const vendorColumns: ColumnDef<Vendor>[] = [
    {
      accessorKey: 'name',
      header: t('vendor'),
      cell: info => info.getValue()
    },
    {
      accessorKey: 'location',
      header: 'Location',
      cell: info => info.getValue()
    },
    {
      accessorKey: 'phone',
      header: t('phoneNumber'),
      cell: info => info.getValue()
    },
    {
      accessorKey: 'rest',
      header: t('rest'),
      cell: info => {
        const rest = info.getValue() as number;
        return (
          <span className={`font-medium ${rest > 0 ? 'text-orange-400' : rest < 0 ? 'text-red-400' : 'text-green-400'}`}>
            {rest.toLocaleString()} DA
          </span>
        );
      }
    },
  ];

  // Calculate client metrics
  const clientMetrics = useMemo(() => {
    const totalClients = clients.length;
    const totalRest = clients.reduce((sum, client) => sum + (client.rest || 0), 0);
    const clientsWithDebt = clients.filter(client => (client.rest || 0) > 0).length;

    return {
      totalClients,
      totalRest,
      clientsWithDebt,
      avgRestPerClient: totalClients > 0 ? totalRest / totalClients : 0
    };
  }, [clients]);

    const vendorMetrics = useMemo(() => {
      const totalVendors = vendors.length;
      const totalRest = vendors.reduce((sum, vendor) => sum + (vendor.rest || 0), 0);
      const vendorsWithDebt = vendors.filter(vendor => (vendor.rest || 0) > 0).length;
      console.log('vendors rest!!!!!!!!!!!!!!!', totalRest);
    return {
      totalVendors,
      totalRest,
      vendorsWithDebt,
      avgRestPerVendor: totalVendors > 0 ? totalRest / totalVendors : 0
    };
  }, [vendors]);

  const FilterTab = ({
    label,
    count,
    isActive,
    onClick,
    icon: Icon
  }: {
    label: string;
    count: number;
    isActive: boolean;
    onClick: () => void;
    icon: React.ElementType;
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
        <Icon size={16} />
        {label} ({count})
      </div>
    </motion.button>
  );

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4 items-center justify-center min-h-screen">
        <motion.div
          className="w-8 h-8 border-2 border-white border-t-transparent rounded-full"
          animate={{ rotate: 360 }}
          transition={{
            duration: 0.6,
            repeat: Infinity,
            ease: "linear"
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

  if (error) {
    return <div className="text-red-500 text-center">{t('error')}: {error}</div>;
  }

  return (
    <div className='flex flex-col space-y-8 mx-auto py-6 pb-5 px-1 lg:px-2 xl:px-4'>
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
      >
        <h1 className="text-3xl font-bold text-white mb-2">{t('clientsVendors.title')}</h1>
        <p className="text-slate-400">{t('clientsVendors.subtitle')}</p>
      </motion.div>

      {/* Filter Tabs */}
      <motion.div
        className="flex gap-4 justify-center"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.2 }}
      >
        <FilterTab
          label="Clients"
          count={clients.length}
          isActive={activeFilter === 'Clients'}
          onClick={() => setActiveFilter('Clients')}
          icon={Users}
        />
        <FilterTab
          label={t('vendors')}
          count={vendors.length}
          isActive={activeFilter === 'Vendors'}
          onClick={() => setActiveFilter('Vendors')}
          icon={Briefcase}
        />
      </motion.div>

      <AnimatePresence mode="wait">
        {activeFilter === 'Clients' ? (
          <motion.div
            key="clients"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            transition={animationConfig.pageTransition}
            className="space-y-8"
          >
            {/* Client Metrics */}
            <motion.div
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
            >
              <StatCard
                name={t('clientsVendors.totalClients')}
                value={clientMetrics.totalClients.toString()}
                icon={Users}
                color="#22C55E"
              />
              <StatCard
                name={t('clientsVendors.totalRest')}
                value={`${(clientMetrics.totalRest / 1000).toFixed(1)} DA`}
                icon={DollarSign}
                color="#F97316"
              />
              <StatCard
                name={t('clientsVendors.clientsWithDebt')}
                value={clientMetrics.clientsWithDebt.toString()}
                icon={FileText}
                color="#3B82F6"
              />
              <StatCard
                name={t('clientsVendors.avgRestPerClient')}
                value={`${clientMetrics.avgRestPerClient.toFixed(0)} DA`}
                icon={List}
                color="#A855F7"
              />
            </motion.div>

            {/* Client Charts - Fixed Layout */}
            <motion.div
              className='flex flex-col'
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
            >

            </motion.div>

            <motion.div
              className="bg-slate-900 p-4 rounded-xl shadow-md border border-slate-700"
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.5 }}
            >
              <Grid
                data={clients}
                columns={clientColumns}
                routing={{
                  detailsPath: '/ClientDetails',
                  addNewPath: '/AddClient',
                }}
                title="Clients"
                type="clients"
                pageSize={5}
              />
            </motion.div>
          </motion.div>
        ) : (
          <motion.div
            key="vendors"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            transition={animationConfig.pageTransition}
            className="space-y-8"
          >
            {/* Vendor Metrics */}
            <motion.div
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
            >
              <StatCard
                name={t('clientsVendors.totalVendors')}
                value={vendorMetrics.totalVendors.toString()}
                icon={Truck}
                color="#22C55E"
              />
              <StatCard
                name={t('clientsVendors.totalRest')}
                value={`${(vendorMetrics.totalRest / 1000).toFixed(1)} DA`}
                icon={DollarSign}
                color="#F97316"
              />
              <StatCard
                name={t('clientsVendors.vendorsWithDebt')}
                value={vendorMetrics.vendorsWithDebt.toString()}
                icon={FileText}
                color="#3B82F6"
              />
              <StatCard
                name={t('clientsVendors.vendorsWithDebt')}
                value={`${vendorMetrics.avgRestPerVendor.toFixed(0)} DA`}
                icon={List}
                color="#A855F7"
              />
            </motion.div>
            {/* Vendors Grid */}
            <motion.div
              className="bg-slate-900 p-4 rounded-xl shadow-md border border-slate-700"
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.5 }}
            >
              <Grid
                data={vendors}
                columns={vendorColumns}
                routing={{
                  detailsPath: '/VendorDetails',
                  addNewPath: '/AddVendor',
                }}
                title="Vendors"
                type="vendors"
                pageSize={5}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ClientsVendors;