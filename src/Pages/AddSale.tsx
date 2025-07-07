import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, ArrowLeft, Plus, Trash2, Calculator } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useMessage } from './context/Message';
import { useI18n } from './context/I18nContext';

// Define interfaces - aligned with PursAndSales
interface Client {
  id: number;
  name: string;
  location: string;  // Changed from email/address to match PursAndSales
  phone: string;
}

interface Product {
  id: number;
  name: string;
  quantity: number;
  unit_price: number;
  threshold: number;
}

interface SaleItem {
  id: string; // For React key
  product_id: number;
  product_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
}

interface DocumentCodeInfo {
  id: number;
  code: number;
}

const AddSale = () => {
  const navigate = useNavigate();

  // Form state
  const [formData, setFormData] = useState({
    client_id: '',
    document_type: 'BL', // 'BL' or 'Invoice'
    document_code: '',
    issue_date: new Date().toISOString().split('T')[0], // Today's date
    description: '',
    payment_method: '',
    remise: '0'
  });

  const [clients, setClients] = useState<Client[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [saleItems, setSaleItems] = useState<SaleItem[]>([]);
  const [documentCodes, setDocumentCodes] = useState<DocumentCodeInfo[]>([]);
  const [latestInvoiceCode, setLatestInvoiceCode] = useState<number>(0);
  const [suggestedCode, setSuggestedCode] = useState<number>(1);
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const { t } = useI18n(); // Assuming you have a translation function in your context
  const { addToast } = useMessage();


  const handleSuccess = (): void => {
    addToast({
      message: t('sales.success'), // Use the translation key for success message
      type: 'success',
      duration: 2000,
    });
  };
  const handleWarning = (warningMessage: string): void => {
    addToast({
      message: warningMessage,
      type: 'warning',
      duration: 2000,
    });
  };

  const handleError = (errorMessage: string): void => {
    addToast({
      message: errorMessage,
      type: 'error',
      duration: 2000, // Longer duration for errors
    });
  };


  // Fetch initial data on component mount
  // Remove the old useEffect and replace with this:
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const [clientsResult, productsResult] = await Promise;

        setClients(clientsResult as Client[]);
        setProducts(productsResult as Product[]);


      } catch (error) {
        handleError(t('purchase.failedLoad'));
      } finally {
        setLoadingData(false);
      }
    };

    fetchInitialData();
  }, []);

  useEffect(() => {
    const fetchYearBasedCodes = async () => {
      if (!formData.issue_date) return;

      try {
        const selectedYear = new Date(formData.issue_date).getFullYear();

        if (formData.document_type === 'Invoice') {
          const invoiceCode = await Promise;
          setLatestInvoiceCode(invoiceCode as number);
        } else if (formData.document_type === 'BL') {
          const blCodes = await Promise;
          setDocumentCodes(blCodes as DocumentCodeInfo[]);
        }
      } catch (error) {
      }
    };

    fetchYearBasedCodes();
  }, [formData.issue_date, formData.document_type, formData.client_id]);

  // Update suggested code when client or document type changes
  useEffect(() => {
    if (formData.document_type === 'Invoice') {
      setSuggestedCode(latestInvoiceCode);
      setFormData(prev => ({ ...prev, document_code: latestInvoiceCode.toString() }));
    } else if (formData.document_type === 'BL' && formData.client_id) {
      const clientCodeInfo = documentCodes.find(dc => dc.id === parseInt(formData.client_id));
      const suggested = clientCodeInfo ? clientCodeInfo.code : 1;
      setSuggestedCode(suggested);
      setFormData(prev => ({ ...prev, document_code: suggested.toString() }));
    }
  }, [formData.client_id, formData.document_type, documentCodes, latestInvoiceCode]);

  useEffect(() => {
    if (formData.document_type === 'Invoice') {
      setFormData(prev => ({ ...prev, remise: '0' }));
    }
  }, [formData.document_type]);

  const { totalAmount, discountAmount, finalAmount } = useMemo(() => {
    const total = saleItems.reduce((sum, item) => sum + item.total_price, 0);
    const remisePercent = parseFloat(formData.remise) || 0;
    const discount = (total * remisePercent) / 100;
    const final = total - discount;
    return {
      totalAmount: total,
      discountAmount: discount,
      finalAmount: final
    };
  }, [saleItems, formData.remise]);

  // Handle form input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    let parsedValue: string | number = value;

    if (name === 'remise') {
      parsedValue = Math.round(parseFloat(value) * 100) / 100 || 0;
    }

    setFormData(prev => ({
      ...prev,
      [name]: parsedValue
    }));
  };
  // Validate document code sequence
  const validateDocumentCode = () => {
    const enteredCode = parseInt(formData.document_code);
    if (isNaN(enteredCode)) return false;

    if (formData.document_type === 'Invoice') {
      return enteredCode === latestInvoiceCode;
    } else if (formData.document_type === 'BL' && formData.client_id) {
      const clientCodeInfo = documentCodes.find(dc => dc.id === parseInt(formData.client_id));
      const expectedCode = clientCodeInfo ? clientCodeInfo.code : 1;
      return enteredCode === expectedCode;
    }

    return true;
  };

  // Add new sale item
  const addSaleItem = () => {
    if (products.length === 0) {
      handleError(t('sales.noproducts'));
      return;
    }

    let k = 0;
    while (k < products.length && saleItems.some(item => item.product_id === products[k].id)) {
      k++;
    }

    if (k >= products.length) {
      handleError(t('sales.allproducts'));
      return;
    }

    const selectedProduct = products[k];
    const newItem: SaleItem = {
      id: Date.now().toString(),
      product_id: selectedProduct.id,
      product_name: selectedProduct.name,
      quantity: 1,
      unit_price: selectedProduct.unit_price,
      total_price: selectedProduct.unit_price
    };

    setSaleItems(prev => [...prev, newItem]);
  };

  // Remove sale item
  const removeSaleItem = (id: string) => {
    setSaleItems(prev => prev.filter(item => item.id !== id));
  };

  // Update sale item
  const updateSaleItem = (id: string, field: 'product_id' | 'quantity', value: string | number) => {
    setSaleItems(prev => prev.map(item => {
      if (item.id === id) {
        const updatedItem = { ...item };

        if (field === 'product_id') {
          const selectedProduct = products.find(p => p.id === Number(value));
          if (selectedProduct) {
            updatedItem.product_id = selectedProduct.id;
            updatedItem.product_name = selectedProduct.name;
            updatedItem.unit_price = selectedProduct.unit_price;
            updatedItem.total_price = selectedProduct.unit_price * updatedItem.quantity;
          }
        } else if (field === 'quantity') {
          const quantity = Math.max(1, Number(value));
          updatedItem.quantity = quantity;
          updatedItem.total_price = updatedItem.unit_price * quantity;
        }

        return updatedItem;
      }
      return item;
    }));
  };

  // Get available stock for a product
  const getAvailableStock = (productId: number) => {
    const product = products.find(p => p.id === productId);
    return product ? product.quantity : 0;
  };

  // Handle form submission
  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Basic validation
    if (!formData.client_id) {
      handleError(t('sales.clientRequired'));
      return;
    }

    if (!formData.document_code.trim()) {
      handleError(t('sales.documentCodeRequired'));
      return;
    }

    if (!formData.issue_date) {
      handleError(t('issueDateRequired'));
      return;
    }

    if (!formData.payment_method && formData.document_type === "Invoice") {
      handleError(t('sales.paymentMethodRequired'));
      return;
    }

    // Validate document code sequence
    if (!validateDocumentCode()) {
      const expectedCode = formData.document_type === 'Invoice'
        ? latestInvoiceCode
        : documentCodes.find(dc => dc.id === parseInt(formData.client_id))?.code || 1;

      handleError(t('sales.documentCodeSequence', { c1: expectedCode, c2: formData.document_code }));
      return;
    }

    // Validate sale items
    if (saleItems.length === 0) {
      handleError(t('sales.atLeastOneProduct'));
      return;
    }

    // Check for duplicate products in sale
    const productIds = saleItems.map(item => item.product_id);
    const uniqueIds = new Set(productIds);
    if (productIds.length !== uniqueIds.size) {
      handleError(t('sales.duplicateProducts'));
      return;
    }

    // Validate stock availability
    for (const item of saleItems) {
      const availableStock = getAvailableStock(item.product_id);
      if (item.quantity > availableStock) {
        const productName = item.product_name;
        handleWarning(t('sales.insufficientStock', { productName, availableStock, requested: item.quantity }));
        return;
      }
    }

    setLoading(true);

    try {
      // Prepare sale data for backend - matching the expected Sale interface structure
      const saleData = {
        cId: parseInt(formData.client_id), // Client ID
        code: parseInt(formData.document_code), // Document code
        docType: formData.document_type, // Document type
        date: formData.issue_date, // Issue date
        description: formData.description.trim(),
        total: totalAmount,
        paymentMethod: formData.payment_method.trim(),
        remise: Number(formData.remise.trim()),
        items: saleItems.map(item => ({
          p_id: item.product_id,
          quantity: item.quantity,
          name: item.product_name,
          unit_price: item.unit_price
        }))
      };

      await Promise;
      handleSuccess()

      // Reset form
      setFormData({
        client_id: '',
        document_type: 'BL',
        document_code: '',
        issue_date: new Date().toISOString().split('T')[0],
        description: '',
        payment_method: '',
        remise: '0'
      });
      setSaleItems([]);

      // Refresh all data after successful submission
      try {
        const [clientsResult, productsResult] = await Promise;

        setClients(clientsResult as Client[]);
        setProducts(productsResult as Product[]);

        // Refresh document codes for the current year
        const selectedYear = new Date().getFullYear(); // Use current year after reset

        if (formData.document_type === 'Invoice') {
          const invoiceCode = await Promise;
          setLatestInvoiceCode(invoiceCode as number);
        } else if (formData.document_type === 'BL') {
          const blCodes = await Promise;
          setDocumentCodes(blCodes as DocumentCodeInfo[]);
        }
      } catch (refreshError) {
        handleWarning(t('sales.dataRefreshWarning')); // You might want to add this translation
      }

    } catch (error) {
      handleError(t('sales.failedSale'))
    } finally {
      setLoading(false);
    }
  };

  if (loadingData) {
    return (
      <div className="flex flex-col gap-4 items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin" />
        <div className="text-white">{t('sales.loadingSaleData')}</div>
      </div>
    );
  }

  return (
    <div className='flex flex-col gap-8 mx-auto py-6 pb-5 px-1 lg:px-2 xl:px-4 max-w-4xl'>
      {/* Header */}
      <div className="flex items-center gap-4">
        <motion.button
          whileTap={{ scale: 0.99 }}
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft size={20} />
          {t('saleDetails.backToSales')}
        </motion.button>
      </div>

      {/* Main Form Card */}
      <div className="bg-slate-900 p-6 rounded-xl shadow-md border border-slate-700">
        <div className="flex items-center gap-3 mb-6">
          <FileText className="text-green-500" size={24} />
          <h1 className="text-2xl font-bold text-white">Create New Sale</h1>
        </div>
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Document Information Section */}
          <div className="space-y-6">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <FileText size={20} />
              {t('sales.documentInformation')}
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Client Selection */}
              <div className="md:col-span-2">
                <label htmlFor="client_id" className="block text-sm font-medium text-slate-300 mb-2">
                  Client *
                </label>
                <select
                  id="client_id"
                  name="client_id"
                  value={formData.client_id}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  disabled={loading}
                >
                  <option value="">Select a client</option>
                  {clients.map((client) => (
                    <option key={client.id} value={client.id}>
                      {client.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Document Type */}
              <div>
                <label htmlFor="document_type" className="block text-sm font-medium text-slate-300 mb-2">
                  {t('documentType')} *
                </label>
                <select
                  id="document_type"
                  name="document_type"
                  value={formData.document_type}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  disabled={loading}
                >
                  <option value="BL">BL (Bon de Livraison)</option>
                  <option value="Invoice">Invoice (Facture)</option>
                </select>
              </div>

              {/* Document Code */}
              <div>
                <label htmlFor="document_code" className="block text-sm font-medium text-slate-300 mb-2">
                  {t('sales.documentCode')} *
                </label>
                <input
                  type="number"
                  id="document_code"
                  name="document_code"
                  value={formData.document_code}
                  onChange={handleInputChange}
                  min="1"
                  className="w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder={`Suggested: ${suggestedCode}`}
                  disabled={loading}
                />
                <p className="text-xs text-slate-400 mt-1">
                  {t('sales.suggested', { S: suggestedCode })}
                </p>
              </div>

              {/* Issue Date */}
              <div>
                <label htmlFor="issue_date" className="block text-sm font-medium text-slate-300 mb-2">
                  {t('issueDate')} *
                </label>
                <input
                  type="date"
                  id="issue_date"
                  name="issue_date"
                  value={formData.issue_date}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  disabled={loading}
                />
              </div>

              {formData.document_type === 'BL' && (
                <div>
                  <label htmlFor="remise" className="block text-sm font-medium text-slate-300 mb-2">
                    {t('discount')}
                  </label>
                  <input
                    type="number"
                    id="remise"
                    name="remise"
                    value={formData.remise}
                    onChange={handleInputChange}
                    min="0"
                    max="100"
                    step="0.01"
                    className="w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="0%"
                    disabled={loading}
                  />
                </div>
              )}
              {formData.document_type === 'Invoice' && (
                <div className="md:col-span-2">
                  <label htmlFor="payment_method" className="block text-sm font-medium text-slate-300 mb-2">
                    {t('paymentMethod')} *
                  </label>
                  <textarea
                    id="payment_method"
                    name="payment_method"
                    value={formData.payment_method}
                    onChange={handleInputChange}
                    rows={1}
                    className="w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none"
                    placeholder="Enter Payment Method"
                    disabled={loading}
                  />
                </div>
              )}

              {/* Description */}
              <div className="md:col-span-2">
                <label htmlFor="description" className="block text-sm font-medium text-slate-300 mb-2">
                  Description
                </label>
                <textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  rows={3}
                  className="w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none"
                  placeholder="Enter document description or notes..."
                  disabled={loading}
                />
              </div>
            </div>
          </div>

          {/* Sale Items Section */}
          <div className="space-y-6">
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="flex items-center justify-between"
            >
              <motion.h2
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
                className="text-lg font-semibold text-white flex items-center gap-2"
              >
                <Calculator size={20} />
                {t('sales.saleItems')}
              </motion.h2>
              <motion.button
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                type="button"
                onClick={addSaleItem}
                disabled={loading}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-green-800 text-white rounded-lg transition-colors"
              >
                <motion.div
                  animate={{ rotate: loading ? 360 : 0 }}
                  transition={{ duration: 1, repeat: loading ? Infinity : 0, ease: "linear" }}
                >
                  <Plus size={16} />
                </motion.div>
                {t('sales.addProduct')}
              </motion.button>
            </motion.div>

            {/* Total Amount Display */}
            {saleItems.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-slate-800 p-4 rounded-lg border border-slate-600 space-y-2"
              >
                <motion.div
                  layout
                  className="flex items-center justify-between"
                >
                  <span className="text-lg font-semibold text-white">{t('subtotal')}:</span>
                  <motion.span
                    key={totalAmount}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="text-xl font-bold text-white"
                  >
                    {totalAmount.toFixed(2)} DA
                  </motion.span>
                </motion.div>

                <AnimatePresence mode="wait">
                  {formData.document_type === 'BL' && parseFloat(formData.remise) > 0 && (
                    <motion.div
                      key="discount-section"
                      initial={{ opacity: 0, height: 0, y: -10 }}
                      animate={{ opacity: 1, height: "auto", y: 0 }}
                      exit={{ opacity: 0, height: 0, y: -10 }}
                      transition={{ duration: 0.3, ease: "easeInOut" }}
                    >
                      <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.1 }}
                        className="flex items-center justify-between text-sm"
                      >
                        <span className="text-slate-300">Remise ({formData.remise}%):</span>
                        <motion.span
                          key={discountAmount}
                          initial={{ opacity: 0, x: 20 }}
                          animate={{ opacity: 1, x: 0 }}
                          className="text-red-400"
                        >
                          -{discountAmount.toFixed(2)} DA
                        </motion.span>
                      </motion.div>

                      <motion.hr
                        initial={{ scaleX: 0 }}
                        animate={{ scaleX: 1 }}
                        transition={{ delay: 0.2, duration: 0.2 }}
                        className="border-slate-600 origin-left"
                      />

                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                        className="flex items-center justify-between"
                      >
                        <span className="text-lg font-semibold text-white">{t('purchaseDetails.finalTotal')}:</span>
                        <motion.span
                          key={finalAmount}
                          initial={{ opacity: 0, scale: 0.8, x: 20 }}
                          animate={{ opacity: 1, scale: 1, x: 0 }}
                          transition={{ delay: 0.1, type: "spring", stiffness: 200 }}
                          className="text-2xl font-bold text-green-400"
                        >
                          {finalAmount.toFixed(2)} DA
                        </motion.span>
                      </motion.div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <AnimatePresence mode="wait">
                  {(formData.document_type === 'Invoice' || parseFloat(formData.remise) === 0) && (
                    <motion.div
                      key="simple-total"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.2 }}
                      className="flex items-center justify-between"
                    >
                      <span className="text-lg font-semibold text-white">{t('totalAmount')}:</span>
                      <motion.span
                        key={`simple-${totalAmount}`}
                        initial={{ opacity: 0, scale: 0.8, x: 20 }}
                        animate={{ opacity: 1, scale: 1, x: 0 }}
                        transition={{ type: "spring", stiffness: 200 }}
                        className="text-2xl font-bold text-green-400"
                      >
                        {totalAmount.toFixed(2)} DA
                      </motion.span>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )}

            <AnimatePresence mode="wait">
              {saleItems.length === 0 ? (
                <motion.div
                  key="empty-state"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.4 }}
                  className="text-center py-8 text-slate-400"
                >
                  <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 0.5 }}
                    transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                  >
                    <Calculator size={48} className="mx-auto mb-4 opacity-50" />
                  </motion.div>
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.4 }}
                  >
                    {t('sales.noProductsYet')}
                  </motion.p>
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.6 }}
                    className="text-sm"
                  >
                    {t('sales.clickAddProduct')}
                  </motion.p>
                </motion.div>
              ) : (
                <motion.div
                  key="sale-list"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-4"
                >
                  <AnimatePresence mode="popLayout">
                    {saleItems.map((item, index) => {
                      const availableStock = getAvailableStock(item.product_id);
                      const isStockInsufficient = item.quantity > availableStock;

                      return (
                        <motion.div
                          key={item.id}
                          layout
                          initial={{ opacity: 0, x: -20, scale: 0.95 }}
                          animate={{
                            opacity: 1,
                            x: 0,
                            scale: 1,
                            transition: {
                              delay: index * 0.1,
                              type: "spring",
                              stiffness: 300,
                              damping: 25
                            }
                          }}
                          exit={{
                            opacity: 0,
                            x: 20,
                            scale: 0.95,
                            transition: { duration: 0.2 }
                          }}
                          whileHover={{
                            scale: 1.02,
                            transition: { duration: 0.2 }
                          }}
                          className={`flex gap-4 items-center p-4 bg-slate-800 rounded-lg border ${isStockInsufficient ? 'border-red-600' : 'border-slate-600'
                            }`}
                        >
                          <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1 + index * 0.05 }}
                            className="flex-1"
                          >
                            <label className="block text-sm font-medium text-slate-300 mb-2">
                              {t('sales.product')}
                            </label>
                            <motion.select
                              whileFocus={{ scale: 1.02 }}
                              title="Select Product"
                              value={item.product_id}
                              onChange={(e) => updateSaleItem(item.id, 'product_id', parseInt(e.target.value))}
                              disabled={loading}
                              className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-green-500 transition-all duration-200 cursor-pointer"
                            >
                              {products
                                .filter(product => {
                                  return (
                                    item.product_id === product.id ||
                                    !saleItems.some(si => si.product_id === product.id)
                                  );
                                })
                                .map((product) => (
                                  <option key={product.id} value={product.id}>
                                    {product.name} (Stock: {product.quantity})
                                  </option>
                                ))}
                            </motion.select>
                          </motion.div>

                          <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.15 + index * 0.05 }}
                            className="w-32"
                          >
                            <label className="block text-sm font-medium text-slate-300 mb-2">
                              {t('quantity')}
                            </label>
                            <motion.input
                              whileFocus={{ scale: 1.05 }}
                              title="Enter Quantity"
                              type="number"
                              value={item.quantity}
                              onChange={(e) => updateSaleItem(item.id, 'quantity', parseInt(e.target.value) || 1)}
                              min="1"
                              max={availableStock}
                              disabled={loading}
                              className={`w-full px-4 py-2 bg-slate-700 border rounded-lg text-white focus:outline-none focus:ring-2 transition-all duration-200 ${isStockInsufficient
                                ? 'border-red-600 focus:ring-red-500'
                                : 'border-slate-600 focus:ring-green-500'
                                }`}
                            />
                            {isStockInsufficient && (
                              <p className="text-xs text-red-400 mt-1">
                                Max: {availableStock}
                              </p>
                            )}
                          </motion.div>

                          <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2 + index * 0.05 }}
                            className="w-32"
                          >
                            <label className="block text-sm font-medium text-slate-300 mb-2">
                              {t('unitPrice')}
                            </label>
                            <div className="px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-slate-300">
                              {item.unit_price.toFixed(2)} DA
                            </div>
                          </motion.div>

                          <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.25 + index * 0.05 }}
                            className="w-32"
                          >
                            <label className="block text-sm font-medium text-slate-300 mb-2">
                              Total
                            </label>
                            <div className="px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-green-400 font-semibold">
                              {item.total_price.toFixed(2)} DA
                            </div>
                          </motion.div>

                          <motion.button
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: 0.3 + index * 0.05 }}
                            whileHover={{
                              scale: 1.1,
                              backgroundColor: "rgb(127 29 29 / 0.2)"
                            }}
                            whileTap={{ scale: 0.9 }}
                            title="Remove Product"
                            type="button"
                            onClick={() => removeSaleItem(item.id)}
                            disabled={loading}
                            className="mt-6 p-2 text-red-400 hover:text-red-300 rounded-lg transition-colors duration-200"
                          >
                            <motion.div
                              whileHover={{ rotate: 15 }}
                              transition={{ duration: 0.2 }}
                            >
                              <Trash2 size={18} />
                            </motion.div>
                          </motion.button>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Submit Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.4 }}
            className="flex gap-4 pt-4"
          >
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              type="submit"
              disabled={loading}
              className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-green-800 disabled:cursor-not-allowed text-white font-medium py-3 px-6 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    className="w-4 h-4 border-2 border-white border-t-transparent rounded-full"
                  />
                  {t('sales.creatingSale')}
                </>
              ) : (
                <>
                  <motion.div
                    whileHover={{ scale: 1.1 }}
                    transition={{ duration: 0.2 }}
                  >
                    <FileText size={18} />
                  </motion.div>
                  {t('sales.createSale')}
                </>
              )}
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              type="button"
              onClick={() => navigate(-1)}
              disabled={loading}
              className="px-6 py-3 bg-slate-700 hover:bg-slate-600 disabled:bg-slate-800 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors"
            >
              {t('cancel')}
            </motion.button>
          </motion.div>
        </form>
      </div>
    </div>
  );
};

export default AddSale