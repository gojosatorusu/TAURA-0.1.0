import React from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  useReactTable,
  ColumnDef,
  SortingState,
} from '@tanstack/react-table'
import {
  PlusIcon,
  SearchIcon,
  ChevronFirstIcon,
  ChevronLastIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  FilterIcon,
  X,
  Calendar,
  User,
  FileText,
  Hash,
  DollarSign // Added missing import
} from 'lucide-react'
import './Grid.css'
import { useI18n } from '../../Pages/context/I18nContext'

// Generic props interface - removed StockItem constraint
interface GridProps<T> {
  // Data to be displayed
  data: T[];
  vendors?: Vendor[];
  clients?: Client[];

  // Columns configuration
  columns: ColumnDef<T, unknown>[];

  // Routing configuration
  routing?: {
    // Base path for details page (e.g., '/RawDetails', '/ProductDetails')
    detailsPath: string;

    // Path for adding new item
    addNewPath: string;
  };

  // Optional customization
  pageSize?: number;
  title?: string;

  // Optional type to determine grid behavior
  type?: 'raw' | 'product' | 'clients' | 'vendors' | 'Purs' | 'Sales' | 'treasury';

  // Optional action handler for additional column
  onRowActionClick?: (rowData: T) => void;
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

// Advanced filter interface for sales/purchases
interface AdvancedFilters {
  customerVendor: string;
  documentType: 'all' | 'BL' | 'Invoice'; // New field to specify document type
  documentNumber: string; // This will search in the appropriate field based on documentType
  year: string;
  month: string;
  codeSearch: string; // General code search across both Purs and Invoice
  paymentStatus: 'all' | 'paid' | 'unpaid' | 'partial'; // Add this line
}

const Grid = <T extends Record<string, any>>({
  data,
  columns,
  routing,
  pageSize = 5,
  title = "Items",
  type,
  clients = [],  // Add this with default
  vendors = [],   // Add this with default
  onRowActionClick
}: GridProps<T>) => {
  const navigate = useNavigate()
  const {t} = useI18n()
  title = t('items')
  // States
  const [globalFilter, setGlobalFilter] = React.useState<string>('')
  const [sorting, setSorting] = React.useState<SortingState>([])
  const [pagination, setPagination] = React.useState({
    pageIndex: 0,
    pageSize: pageSize,
  })

  // Added missing showAdvancedFilters state
  const [showAdvancedFilters, setShowAdvancedFilters] = React.useState<boolean>(false)
  const currentYear = new Date().getFullYear();
  const [advancedFilters, setAdvancedFilters] = React.useState<AdvancedFilters>({
    customerVendor: '',
    documentType: 'all',
    documentNumber: '',
    year: String(currentYear),
    month: '',
    codeSearch: '',
    paymentStatus: 'all' // Add this line
  });

  // Animation state to control when to show stagger effects
  const [isInitialLoad, setIsInitialLoad] = React.useState(true)
  const [animationKey, setAnimationKey] = React.useState(0)

  // Track previous data for smooth transitions
  const prevDataRef = React.useRef(data)
  const prevPageRef = React.useRef(pagination.pageIndex)
  const prevSortRef = React.useRef(sorting)
  const prevFilterRef = React.useRef(globalFilter)

  // Detect data changes
  React.useEffect(() => {
    const dataChanged = prevDataRef.current !== data
    const pageChanged = prevPageRef.current !== pagination.pageIndex
    const sortChanged = JSON.stringify(prevSortRef.current) !== JSON.stringify(sorting)
    const filterChanged = prevFilterRef.current !== globalFilter

    if (dataChanged || pageChanged || filterChanged) { // Remove sortChanged from here
      setIsInitialLoad(false)
      setAnimationKey(prev => prev + 1)
    }

    // Only trigger animation key change for sorting if it's not the initial sort
    if (sortChanged && !isInitialLoad) {
      setAnimationKey(prev => prev + 1)
    }

    prevDataRef.current = data
    prevPageRef.current = pagination.pageIndex
    prevSortRef.current = sorting
    prevFilterRef.current = globalFilter
  }, [data, pagination.pageIndex, sorting, globalFilter, isInitialLoad]) // Add isInitialLoad to deps

  // Check if this is a sales/purchases grid
  const isSalesPurchasesGrid = type === 'Purs' || type === 'Sales'

  // Get unique values for filter dropdowns
  // Get unique values for filter dropdowns
  const getUniqueValues = React.useMemo(() => {
    if (!isSalesPurchasesGrid) return {}

    const customers = new Set<string>()
    const blCodes = new Set<string>()
    const invoiceNumbers = new Set<string>()
    const years = new Set<string>()
    const months = new Set<string>()

    data.forEach((item: any) => {
      // Customer/Vendor names - get from the actual clients/vendors arrays
      if (type === 'Sales' && item.c_id) {
        const client = clients.find(c => c.id === item.c_id);
        if (client) customers.add(client.name);
      } else if (type === 'Purs' && item.v_id) {
        const vendor = vendors.find(v => v.id === item.v_id);
        if (vendor) customers.add(vendor.name);
      }

      // BL codes
      if (item.code) {
        blCodes.add(item.code)
      }

      // Invoice numbers - adjust based on your data structure
      if (item.invoice_number) {
        invoiceNumbers.add(item.invoice_number)
      }

      // Extract years and months from dates
      const dateField = item.date  // Use 'date' field based on your sales structure
      if (dateField) {
        const date = new Date(dateField)
        years.add(date.getFullYear().toString())
        months.add((date.getMonth() + 1).toString().padStart(2, '0'))
      }
    })

    return {
      customers: Array.from(customers).sort(),
      blCodes: Array.from(blCodes).sort(),
      invoiceNumbers: Array.from(invoiceNumbers).sort(),
      years: Array.from(years).sort().reverse(),
      months: Array.from(months).sort()
    }
  }, [data, type, isSalesPurchasesGrid, clients, vendors])  // Add clients and vendors to dependencies

  // Custom filter function for advanced filters
  const customFilterFn = React.useCallback((row: any) => {
    if (!isSalesPurchasesGrid) return true

    const rowData = row.original

    if (advancedFilters.customerVendor) {
      let customerVendorName = '';

      if (type === 'Sales' && rowData.c_id) {
        const client = clients.find(c => c.id === rowData.c_id);
        customerVendorName = client?.name || '';
      } else if (type === 'Purs' && rowData.v_id) {
        const vendor = vendors.find(v => v.id === rowData.v_id);
        customerVendorName = vendor?.name || '';
      }

      if (!customerVendorName.toLowerCase().includes(advancedFilters.customerVendor.toLowerCase())) {
        return false;
      }
    }

    if (advancedFilters.documentType !== 'all' || advancedFilters.documentNumber) {
      const docType = rowData.doc_type  // Use doc_type field from your sales data
      const code = String(rowData.code)  // The actual document number/code
      console.log(code)
      if (advancedFilters.documentType === 'BL') {
        if (docType !== 'BL') return false
        if (advancedFilters.documentNumber && !code?.toLowerCase().includes(advancedFilters.documentNumber.toLowerCase())) {
          return false
        }
      } else if (advancedFilters.documentType === 'Invoice') {
        if (docType !== 'Invoice') return false
        if (advancedFilters.documentNumber && !code?.toLowerCase().includes(advancedFilters.documentNumber.toLowerCase())) {
          return false
        }
      } else if (advancedFilters.documentNumber) {
        // Search in code regardless of document type when type is 'all'
        if (!code?.toLowerCase().includes(advancedFilters.documentNumber.toLowerCase())) {
          return false
        }
      }
    }

    // Year filter - use 'date' field
    if (advancedFilters.year) {
      const dateField = rowData.date  // Use 'date' field
      if (dateField) {
        const year = new Date(dateField).getFullYear().toString()
        if (year !== advancedFilters.year) {
          return false
        }
      }
    }

    // Month filter - use 'date' field
    if (advancedFilters.month) {
      const dateField = rowData.date  // Use 'date' field
      if (dateField) {
        const month = (new Date(dateField).getMonth() + 1).toString().padStart(2, '0')
        if (month !== advancedFilters.month) {
          return false
        }
      }
    }

    // General code search (searches in the code field)
    if (advancedFilters.codeSearch) {
      const code = String(rowData.code)
      console.log(code)
      if (!code?.toLowerCase().includes(advancedFilters.codeSearch.toLowerCase())) {
        return false
      }
    }

    if (advancedFilters.paymentStatus !== 'all') {
      const currentPaid = rowData.current_paid || 0;
      const total = rowData.total || 0;
      const remise = rowData.remise || 0;

      // Use the discounted total for calculation
      const discountedTotal = total * (100 - remise) / 100;
      const paidPercentage = discountedTotal > 0 ? (currentPaid / discountedTotal) * 100 : 0;

      if (advancedFilters.paymentStatus === 'paid' && paidPercentage < 100) {
        return false;
      }
      if (advancedFilters.paymentStatus === 'unpaid' && paidPercentage > 0) {
        return false;
      }
      if (advancedFilters.paymentStatus === 'partial' && (paidPercentage === 0 || paidPercentage >= 100)) {
        return false;
      }
    }
    return true
  }, [advancedFilters, type, isSalesPurchasesGrid])

  // Filter data based on advanced filters
  const filteredData = React.useMemo(() => {
    if (!isSalesPurchasesGrid) return data
    return data.filter((item: any) => customFilterFn({ original: item }))
  }, [data, customFilterFn, isSalesPurchasesGrid])

  // Clear all advanced filters
  const clearAdvancedFilters = () => {
    setAdvancedFilters({
      customerVendor: '',
      documentType: 'all',
      documentNumber: '',
      year: '',
      month: '',
      codeSearch: '',
      paymentStatus: 'all'
    })
  }

  // Check if any advanced filters are active
  const hasActiveAdvancedFilters = Object.entries(advancedFilters).some(([key, value]) => {
    if (key === 'documentType') return value !== 'all'
    if (key === 'paymentStatus') return value !== 'all'
    return value !== ''
  })

  // Added missing getPaymentStatusLabel function
  const getPaymentStatusLabel = (currentPaid: number = 0, total: number = 0, remise: number = 0) => {
    // Calculate the discounted total (same as in your first file)
    const discountedTotal = total * (100 - remise) / 100;
    const paidPercentage = discountedTotal > 0 ? (currentPaid / discountedTotal) * 100 : 0;

    if (paidPercentage >= 100) {
      return {
        label: t('salesPurchases.fullyPaid'),
        color: 'bg-green-100 text-green-800 border-green-200',
        ring: 'ring-green-300',
        rowColor: 'hover:bg-green-900/20'
      };
    } else if (paidPercentage > 0) {
      return {
        label: t('salesPurchases.partiallyPaid'),
        color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
        ring: 'ring-yellow-300',
        rowColor: 'hover:bg-yellow-900/20'
      };
    } else {
      return {
        label: t('salesPurchases.notPaid'),
        color: 'bg-red-100 text-red-800 border-red-200',
        ring: 'ring-red-300',
        rowColor: 'hover:bg-red-900/20'
      };
    }
  };

  // Prepare columns with optional columns based on type
  const preparedColumns = React.useMemo(() => {
    const baseColumns = [...columns];

    // Add type-specific columns or modifications
    if (
      (type === 'product' || type === 'raw') &&
      data.length > 0 &&
      'quantity' in data[0] &&
      'threshold' in data[0]
    ) {
      baseColumns.push({
        id: 'stockState',
        header: t('Grid.stockState'),
        cell: ({ row }) => {
          const rowData = row.original as unknown as { quantity: number, threshold: number };
          const quantity = rowData.quantity ?? 0;
          const threshold = rowData.threshold ?? 0;

          const stateInfo = getStateColor(quantity, threshold);

          return (
            <motion.span
              className={`
                inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium 
                border ${stateInfo.color} ${stateInfo.ring}
                ring-1 ring-opacity-50
              `}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.2 }}
            >
              {stateInfo.label}
            </motion.span>
          );
        }
      });
    }

    return baseColumns;
  }, [columns, type, data, onRowActionClick]);

  // Reuse existing state color function
  const getStateColor = (quantity: number, threshold: number) => {
    if (quantity === 0) {
      return {
        label: t('outOfStock'),
        color: 'bg-red-100 text-red-800 border-red-200',
        ring: 'ring-red-300'
      }
    }
    if (quantity <= threshold) {
      return {
        label: t('rawMaterialDetails.lowStock'),
        color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
        ring: 'ring-yellow-300'
      }
    }
    if (quantity > threshold * 2) {
      return {
        label: t('Grid.excessStock'),
        color: 'bg-green-100 text-green-800 border-green-200',
        ring: 'ring-green-300'
      }
    }
    return {
      label: t('Grid.sufficientStock'),
      color: 'bg-blue-100 text-blue-800 border-blue-200',
      ring: 'ring-blue-300'
    }
  }

  // Get column width based on column type
  const getColumnWidth = (columnId: string) => {
    // You can customize these widths based on your specific columns
    const columnWidths: Record<string, string> = {
      'id': '80px',
      'name': '200px',
      'quantity': '100px',
      'threshold': '100px',
      'price': '120px',
      'stockState': '140px',
      'description': '250px',
      'category': '150px',
      'supplier': '180px',
      'date': '130px',
      'status': '120px',
      // Add more column mappings as needed
    }

    // Return specific width or default
    return columnWidths[columnId] || '150px'
  }

  // Table instance
  const table = useReactTable<T>({
    data: filteredData,
    columns: preparedColumns,
    state: {
      sorting,
      globalFilter,
      pagination,
    },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  })

  // Handle row click (navigation to details)
  const handleRowClick = (rowData: T) => {
    // Only navigate if routing is provided and it's not an archive grid
    if (routing && type !== 'treasury') {
      navigate(`${routing.detailsPath}`, { state: { ...rowData } })
    }
  }

  // 4. Update the handleAddNew function
  const handleAddNew = () => {
    if (routing) {
      navigate(routing.addNewPath)
    }
  }

  // Get button text based on type
  const getButtonText = () => {
    if (type === 'Purs') return t('newPurchase')
    if (type === 'Sales') return t('newSale')
    return t('addNew')
  }

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.5,
        staggerChildren: isInitialLoad ? 0.1 : 0
      }
    }
  }

  const headerVariants = {
    hidden: { opacity: 0, x: -20 },
    visible: { opacity: 1, x: 0 }
  }

  // Simplified row variants for smoother transitions
  const rowVariants = {
    hidden: {
      opacity: 0,
      y: 10,
      transition: { duration: 0.2 }
    },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.3,
        ease: "easeOut"
      }
    },
    exit: {
      opacity: 0,
      y: -10,
      transition: {
        duration: 0.2,
        ease: "easeIn"
      }
    }
  }

  // Table body variants for smooth group transitions
  const tableBodyVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        duration: 0.3,
        staggerChildren: isInitialLoad ? 0.05 : 0.02,
        delayChildren: isInitialLoad ? 0.1 : 0
      }
    }
  }

  const monthNames = [
    '01 - ' + t('january'),
    '02 - ' + t('february'),
    '03 - ' + t('march'),
    '04 - ' + t('april'),
    '05 - ' + t('may'),
    '06 - ' + t('june'),
    '07 - ' + t('july'),
    '08 - ' + t('august'),
    '09 - ' + t('september'),
    '10 - ' + t('october'),
    '11 - ' + t('november'),
    '12 - ' + t('december')
  ]

  return (
    <motion.div
      className="p-4 bg-gray-900 shadow-md rounded-lg grid-container"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Top Control Bar */}
      <motion.div
        className="flex justify-between items-center mb-4"
        variants={headerVariants}
      >
        {/* Global Filter */}
        <div className="relative flex-grow max-w-md mr-4">
          <motion.input
            type="text"
            placeholder={t('search') +` ${title}...`}
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            whileFocus={{ scale: 1.02 }}
            transition={{ duration: 0.2 }}
          />
          <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3">
          {/* Advanced Filter Toggle for Sales/Purchases */}
          {isSalesPurchasesGrid && (
            <motion.button
              className={`flex items-center px-4 py-2 rounded-lg font-medium transition-all duration-300 ease-in-out shadow-md hover:shadow-lg active:scale-95 ${showAdvancedFilters
                ? 'bg-purple-600 text-white hover:bg-purple-700'
                : 'bg-gray-600 text-white hover:bg-gray-700'
                }`}
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <FilterIcon className="mr-2" size={16} />
              {showAdvancedFilters ? t('hideFilter') : t('advancedFilters')}
              {hasActiveAdvancedFilters && (
                <motion.span
                  className="ml-2 w-2 h-2 bg-orange-400 rounded-full"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ duration: 0.2 }}
                />
              )}
            </motion.button>
          )}

          {/* Only show Add New button if routing is provided and it's not an archive */}
          {routing && type !== 'treasury' && (
            <motion.button
              className="flex items-center bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 transition-all duration-300 ease-in-out shadow-md hover:shadow-lg active:scale-95"
              onClick={handleAddNew}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              initial={isInitialLoad ? { opacity: 0, x: 20 } : false}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: isInitialLoad ? 0.2 : 0 }}
            >
              <motion.div
                initial={{ rotate: 0 }}
                whileHover={{ rotate: 90 }}
                transition={{ duration: 0.2 }}
              >
                <PlusIcon className="mr-2" size={20} />
              </motion.div>
              {getButtonText()}
            </motion.button>
          )}
        </div>
      </motion.div>

      {/* Advanced Filters Panel */}
      <AnimatePresence>
        {isSalesPurchasesGrid && showAdvancedFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0, y: -20 }}
            animate={{ opacity: 1, height: 'auto', y: 0 }}
            exit={{ opacity: 0, height: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="mb-6 p-4 bg-slate-800 rounded-lg border border-slate-600"
          >
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-white flex items-center">
                <FilterIcon className="mr-2" size={20} />
                {t('advancedFilters')}
              </h3>
              {hasActiveAdvancedFilters && (
                <motion.button
                  onClick={clearAdvancedFilters}
                  className="flex items-center text-orange-400 hover:text-orange-300 text-sm"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <X size={16} className="mr-1" />
                  {t('clearAll')}
                </motion.button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
              {/* Customer/Vendor Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  <User size={16} className="inline mr-1" />
                  {type === 'Purs' ? 'Client' : t('vendor')}
                </label>
                <select
                  title="Select Customer or Supplier"
                  value={advancedFilters.customerVendor}
                  onChange={(e) => setAdvancedFilters(prev => ({ ...prev, customerVendor: e.target.value }))}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">{type === 'Purs' ? t('allClients') : t('allVendors')}</option>
                  {getUniqueValues.customers?.map((customer) => (
                    <option key={customer} value={customer}>{customer}</option>
                  ))}
                </select>
              </div>

              {/* Document Type Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  <FileText size={16} className="inline mr-1" />
                  {t('documentType')}
                </label>
                <select
                  title="Select Document Type"
                  name="documentType"
                  value={advancedFilters.documentType}
                  onChange={(e) => setAdvancedFilters(prev => ({
                    ...prev,
                    documentType: e.target.value as 'all' | 'BL' | 'Invoice',
                    documentNumber: '' // Clear document number when changing type
                  }))}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">{t('allDocuments')}</option>
                  <option value="BL"> {t('blOnly')}</option>
                  <option value="Invoice">{t('invoiceOnly')}</option>
                </select>
              </div>

              {/* Year Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  <Calendar size={16} className="inline mr-1" />
                  {t('year')}
                </label>
                <select
                  title="Select Year"
                  value={advancedFilters.year}
                  onChange={(e) => setAdvancedFilters(prev => ({ ...prev, year: e.target.value }))}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">{t('allYears')}</option>
                  {getUniqueValues.years?.map((year) => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </select>
              </div>

              {/* Month Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  <Calendar size={16} className="inline mr-1" />
                  {t('month')}
                </label>
                <select
                  title="Select Month"
                  value={advancedFilters.month}
                  onChange={(e) => setAdvancedFilters(prev => ({ ...prev, month: e.target.value }))}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">{t('allMonths')}</option>
                  {getUniqueValues.months?.map((month) => (
                    <option key={month} value={month}>
                      {monthNames[parseInt(month) - 1]}
                    </option>
                  ))}
                </select>
              </div>

              {/* Payment Status Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  <DollarSign size={16} className="inline mr-1" />
                  {t('paymentStatus')}
                </label>
                <select
                  title="Select Payment Status"
                  value={advancedFilters.paymentStatus}
                  onChange={(e) => setAdvancedFilters(prev => ({
                    ...prev,
                    paymentStatus: e.target.value as 'all' | 'paid' | 'unpaid' | 'partial'
                  }))}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">{t('allStatus')}</option>
                  <option value="paid">{t('purchaseDetails.fullyPaid')}</option>
                  <option value="unpaid">{t('salesPurchases.notPaid')}</option>
                  <option value="partial">{t('salesPurchases.partiallyPaid')}</option>
                </select>
              </div>

              {/* General Code Search */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  <Hash size={16} className="inline mr-1" />
                  {t('codeSearch')}
                </label>
                <input
                  type="text"
                  placeholder={t('SearchAllCodes')}
                  value={advancedFilters.codeSearch}
                  onChange={(e) => setAdvancedFilters(prev => ({ ...prev, codeSearch: e.target.value }))}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Filter Summary */}
            {hasActiveAdvancedFilters && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="mt-4 pt-4 border-t border-slate-600"
              >
                <div className="flex flex-wrap gap-2">
                  <span className="text-sm text-gray-400">Active filters:</span>
                  {Object.entries(advancedFilters).map(([key, value]) => {
                    if (key === 'documentType' && value === 'all') return null
                    if (!value) return null
                    const labels = {
                      customerVendor: type === 'Purs' ? 'Client' : t('vendor'),
                      documentType: t('documentType'),
                      documentNumber: t('documentNumber'),
                      year: t('year'),
                      month: t('year'),
                      codeSearch: 'Code'
                    }
                    return (
                      <span
                        key={key}
                        className="inline-flex items-center px-2 py-1 bg-blue-600 text-white text-xs rounded-full"
                      >
                        {labels[key as keyof typeof labels]}: {key === 'documentType' ? value.toUpperCase() : value}
                      </span>
                    )
                  })}
                </div>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Table with fixed height and scrollable body */}
      <motion.div
        className="overflow-y-auto flex-grow"
        initial={isInitialLoad ? { opacity: 0 } : false}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4, delay: isInitialLoad ? 0.3 : 0 }}
      >
        <table className="w-full border-collapse grid-table-fixed">
          <thead className="bg-gray-800 sticky top-0 z-10">
            {table.getHeaderGroups().map((headerGroup) => (
              <motion.tr
                key={headerGroup.id}
                className="text-left"
                variants={headerVariants}
              >
                {headerGroup.headers.map((header) => (
                  <motion.th
                    key={header.id}
                    className="px-6 py-3 text-xs font-semibold text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-700 transition-colors duration-200"
                    style={{ width: getColumnWidth(header.id), minWidth: getColumnWidth(header.id) }}
                    onClick={header.column.getToggleSortingHandler()}
                    whileHover={{ backgroundColor: 'rgba(55, 65, 81, 0.5)' }}
                  >
                    <div className="flex items-center space-x-1">
                      {flexRender(header.column.columnDef.header, header.getContext())}
                      {{
                        asc: <motion.span
                          className="text-blue-400"
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ duration: 0.2 }}
                        >↑</motion.span>,
                        desc: <motion.span
                          className="text-blue-400"
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ duration: 0.2 }}
                        >↓</motion.span>,
                      }[header.column.getIsSorted() as string] ?? null}
                    </div>
                  </motion.th>
                ))}
              </motion.tr>
            ))}
          </thead>
          <motion.tbody
            className="bg-gray-900 divide-y divide-gray-700"
            variants={tableBodyVariants}
            initial="hidden"
            animate="visible"
            key={`tbody-${animationKey}-${JSON.stringify(sorting)}`} // Add sorting to key
          >
            {/* Remove AnimatePresence wrapper */}
            {table.getRowModel().rows.map((row, index) => {
              // Get payment status for row styling (only for sales/purchases)
              const rowPaymentStatus = (type === 'Sales' || type === 'Purs') ?
                getPaymentStatusLabel(
                  (row.original as any).current_paid,
                  (row.original as any).total,
                  (row.original as any).remise || 0  // Add the remise parameter
                ) : null;
              return (
                <motion.tr
                  key={`${row.original.id || index}-${JSON.stringify(sorting)}`} // Handle cases where id might not exist
                  className={`${type !== 'treasury' ? 'cursor-pointer' : ''} transition-colors duration-200 ${rowPaymentStatus ?
                    rowPaymentStatus.rowColor :
                    'hover:bg-gray-800'
                    }`}
                  onClick={() => type !== 'treasury' && handleRowClick(row.original)} // Only handle click if not archive
                  variants={rowVariants}
                  initial="hidden"
                  animate="visible"
                  custom={index}
                  whileHover={{
                    backgroundColor: rowPaymentStatus ?
                      (rowPaymentStatus.label === 'Fully Paid' ? 'rgba(34, 197, 94, 0.3)' :
                        rowPaymentStatus.label === 'Not Paid' ? 'rgba(239, 68, 68, 0.3)' :
                          'rgba(245, 158, 11, 0.3)') :
                      'rgba(55, 65, 81, 0.7)',
                    transition: { duration: 0.1 }
                  }}
                  whileTap={type !== 'treasury' ? { scale: 0.995 } : {}} // Only add tap effect if not archive
                  layout
                >
                  {row.getVisibleCells().map((cell) => (
                    <motion.td
                      key={cell.id}
                      className="px-6 py-4 text-sm text-gray-300"
                      style={{ width: getColumnWidth(cell.column.id), minWidth: getColumnWidth(cell.column.id) }}
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </motion.td>
                  ))}
                </motion.tr>
              );
            })}
          </motion.tbody>
        </table>

        {/* No data message */}
        {table.getRowModel().rows.length === 0 && (
          <motion.div
            className="text-center py-12 text-gray-400"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <motion.div
              className="text-6xl mb-4 will-change-auto"
              animate={{
                opacity: [1, 0.6, 1],
              }}
              transition={{
                duration: 2.5,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            >
              📦
            </motion.div>
            <p className="text-lg">{t('noFound',{title: title.toLowerCase()})}</p>
            <p className="text-sm mt-2">
              {globalFilter || hasActiveAdvancedFilters
                ? t('adjustFilters')
                : t('startByAdding',{title: title.toLowerCase()})
              }
            </p>
          </motion.div>
        )}
      </motion.div>

      {/* Pagination */}
      <motion.div
        className="flex items-center justify-between mt-4"
        initial={isInitialLoad ? { opacity: 0, y: 20 } : false}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: isInitialLoad ? 0.6 : 0 }}
      >
        {/* Pagination Info */}
        <div className="text-sm text-gray-400">
          {t('showingOf', {
            c1: table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1,
            c2: Math.min(
              (table.getState().pagination.pageIndex + 1) * table.getState().pagination.pageSize,
              table.getFilteredRowModel().rows.length
            ),
            c3: table.getFilteredRowModel().rows.length
          })}
        </div>

        {/* Pagination Controls */}
        <div className="flex items-center space-x-4">
          {/* Page Size Selector */}
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-400">Show:</span>
            <select
              title="Select page size"
              value={table.getState().pagination.pageSize}
              onChange={(e) => {
                table.setPageSize(Number(e.target.value))
              }}
              className="px-2 py-1 bg-gray-700 border border-gray-600 rounded-md text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {[5, 10, 20, 30, 40, 50].map(pageSize => (
                <option key={pageSize} value={pageSize}>
                  {pageSize}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center space-x-2">
            <motion.button
              className="p-2 rounded-md bg-gray-700 text-gray-300 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
              onClick={() => table.setPageIndex(0)}
              disabled={!table.getCanPreviousPage()}
              whileHover={{ scale: table.getCanPreviousPage() ? 1.05 : 1 }}
              whileTap={{ scale: table.getCanPreviousPage() ? 0.95 : 1 }}
            >
              <ChevronFirstIcon size={16} />
            </motion.button>

            <motion.button
              className="p-2 rounded-md bg-gray-700 text-gray-300 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
              whileHover={{ scale: table.getCanPreviousPage() ? 1.05 : 1 }}
              whileTap={{ scale: table.getCanPreviousPage() ? 0.95 : 1 }}
            >
              <ChevronLeftIcon size={16} />
            </motion.button>

            <span className="flex items-center gap-1 text-sm text-gray-400">
              <div>Page</div>
              <strong>
                {table.getState().pagination.pageIndex + 1} of{' '}
                {table.getPageCount()}
              </strong>
            </span>

            <motion.button
              className="p-2 rounded-md bg-gray-700 text-gray-300 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
              whileHover={{ scale: table.getCanNextPage() ? 1.05 : 1 }}
              whileTap={{ scale: table.getCanNextPage() ? 0.95 : 1 }}
            >
              <ChevronRightIcon size={16} />
            </motion.button>

            <motion.button
              className="p-2 rounded-md bg-gray-700 text-gray-300 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
              onClick={() => table.setPageIndex(table.getPageCount() - 1)}
              disabled={!table.getCanNextPage()}
              whileHover={{ scale: table.getCanNextPage() ? 1.05 : 1 }}
              whileTap={{ scale: table.getCanNextPage() ? 0.95 : 1 }}
            >
              <ChevronLastIcon size={16} />
            </motion.button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}

export default Grid