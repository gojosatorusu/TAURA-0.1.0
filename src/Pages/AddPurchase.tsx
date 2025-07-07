import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { invoke } from "@tauri-apps/api/core";
import { FileText, ArrowLeft, Plus, Trash2, Calculator } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useMessage } from './context/Message';
import { useI18n } from './context/I18nContext';

// Define interfaces - aligned with PursAndSales
interface Vendor {
  id: number;
  name: string;
  location: string;  // Changed from email/address to match PursAndSales
  phone: string;
}

interface Raw {
  id: number;
  name: string;
  quantity: number;
  unit_price: number;
}

interface PurcItem {
  id: string; // For React key
  r_id: number;
  raw_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
}

interface DocumentCodeInfo {
  id: number;
  code: number;
}

const AddPurchase = () => {
  const navigate = useNavigate();

  // Form state
  const [formData, setFormData] = useState({
    vendor_id: '',
    document_type: 'BL', // 'BL' or 'Invoice'
    document_code: '',
    issue_date: new Date().toISOString().split('T')[0], // Today's date
    description: '',
    payment_method: '',
    remise: '0'
  });
  const { t } = useI18n();


  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [raws, setRaws] = useState<Raw[]>([]);
  const [purcItems, setPurcItems] = useState<PurcItem[]>([]);
  const [documentCodes, setDocumentCodes] = useState<DocumentCodeInfo[]>([]);
  const [latestInvoiceCode, setLatestInvoiceCode] = useState<number>(0);
  const [suggestedCode, setSuggestedCode] = useState<number>(1);
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const { addToast } = useMessage();


  const handleSuccess = (): void => {
    addToast({
      message: t('purchase.success'),
      type: 'success',
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
  const handleWarning = (warningMessage: string): void => {
    addToast({
      message: warningMessage,
      type: 'warning',
      duration: 2000, // Longer duration for errors
    });
  };
  const { totalAmount, discountAmount, finalAmount } = useMemo(() => {
    const total = purcItems.reduce((sum, item) => sum + item.total_price, 0);
    const remisePercent = parseFloat(formData.remise) || 0;
    const discount = (total * remisePercent) / 100;
    const final = total - discount;

    return {
      totalAmount: total,
      discountAmount: discount,
      finalAmount: final
    };
  }, [purcItems, formData.remise]);

  useEffect(() => {
    if (formData.document_type === 'Invoice') {
      setFormData(prev => ({ ...prev, remise: '0' }));
    }
  }, [formData.document_type]);

  // Fetch initial data on component mount
  // Remove the old useEffect and replace with this:
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const [vendorsResult, rawsResult] = await Promise.all([
          invoke('get_vendors'),
          invoke('get_raw_materials')
        ]);

        setVendors(vendorsResult as Vendor[]);
        setRaws(rawsResult as Raw[]);

        console.log('Initial data fetched:', {
          vendors: vendorsResult,
          raws: rawsResult
        });
      } catch (error) {
        console.error('Error fetching initial data:', error);
        handleError(t('purchase.failedLoad'))
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
          const invoiceCode = await invoke('get_new_invoice_code_purchase_for_year', { year: selectedYear });
          setLatestInvoiceCode(invoiceCode as number);
        } else if (formData.document_type === 'BL') {
          const blCodes = await invoke('get_new_bl_code_purchase_for_year', { year: selectedYear });
          setDocumentCodes(blCodes as DocumentCodeInfo[]);
        }
      } catch (error) {
        console.error('Error fetching year-based codes:', error);
      }
    };

    fetchYearBasedCodes();
  }, [formData.issue_date, formData.document_type, formData.vendor_id]);

  // Update suggested code when vendor or document type changes
  useEffect(() => {
    if (formData.document_type === 'Invoice') {
      setSuggestedCode(latestInvoiceCode);
      setFormData(prev => ({ ...prev, document_code: latestInvoiceCode.toString() }));
    } else if (formData.document_type === 'BL' && formData.vendor_id) {
      const vendorCodeInfo = documentCodes.find(dc => dc.id === parseInt(formData.vendor_id));
      const suggested = vendorCodeInfo ? vendorCodeInfo.code : 1;
      setSuggestedCode(suggested);
      setFormData(prev => ({ ...prev, document_code: suggested.toString() }));
    }
  }, [formData.vendor_id, formData.document_type, documentCodes, latestInvoiceCode]);

  // Add this useEffect for debugging
  useEffect(() => {
    console.log('Form data changed:', formData);
    console.log('Document codes:', documentCodes);
    console.log('Latest invoice code:', latestInvoiceCode);
    console.log('Suggested code:', suggestedCode);
  }, [formData, documentCodes, latestInvoiceCode, suggestedCode]);

  // Handle form input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Validate document code sequence
  const validateDocumentCode = () => {
    const enteredCode = parseInt(formData.document_code);
    if (isNaN(enteredCode)) return false;

    if (formData.document_type === 'Invoice') {
      return enteredCode === latestInvoiceCode;
    } else if (formData.document_type === 'BL' && formData.vendor_id) {
      const vendorCodeInfo = documentCodes.find(dc => dc.id === parseInt(formData.vendor_id));
      const expectedCode = vendorCodeInfo ? vendorCodeInfo.code : 1;
      return enteredCode === expectedCode;
    }

    return true;
  };

  // Add new purchase item
  const addPurcItem = () => {
    if (raws.length === 0) {
      handleError(t('purchase.noRawMaterialsAvailable'))
      return;
    }

    let k = 0;
    while (k < raws.length && purcItems.some(item => item.r_id === raws[k].id)) {
      k++;
    }

    if (k >= raws.length) {
      handleWarning(t('purchase.allRawAdded'))
      return;
    }

    const selectedProduct = raws[k];
    const newItem: PurcItem = {
      id: Date.now().toString(),
      r_id: selectedProduct.id,
      raw_name: selectedProduct.name,
      quantity: 1,
      unit_price: selectedProduct.unit_price,
      total_price: selectedProduct.unit_price
    };

    setPurcItems(prev => [...prev, newItem]);
  };

  // Remove purchase item
  const removePurcItem = (id: string) => {
    setPurcItems(prev => prev.filter(item => item.id !== id));
  };

  // Update purchase item
  const updatePurcItem = (id: string, field: 'r_id' | 'quantity', value: string | number) => {
    setPurcItems(prev => prev.map(item => {
      if (item.id === id) {
        const updatedItem = { ...item };

        if (field === 'r_id') {
          const selectedProduct = raws.find(p => p.id === Number(value));
          if (selectedProduct) {
            updatedItem.r_id = selectedProduct.id;
            updatedItem.raw_name = selectedProduct.name;
            updatedItem.unit_price = selectedProduct.unit_price;
            updatedItem.total_price = selectedProduct.unit_price * updatedItem.quantity;
          }
        } else if (field === 'quantity') {
          // Fix: Use parseFloat instead of parseInt and handle edge cases properly
          const quantity = Math.round(Math.max(0.01, parseFloat(String(value)) || 0.01) * 100) / 100;
          updatedItem.quantity = quantity;
          updatedItem.total_price = updatedItem.unit_price * quantity;
        }

        return updatedItem;
      }
      return item;
    }));
  };

  // Handle form submission
  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Basic validation
    if (!formData.vendor_id) {
      handleError(t('purchase.vendorRequired'));
      return;
    }

    if (!formData.document_code.trim()) {
      handleError(t('documentCodeRequired'));
      return;
    }

    if (!formData.issue_date) {
      handleError(t('issueDateRequired'));
      return;
    }

    if (!formData.payment_method && formData.document_type === "Invoice") {
      handleError(t('purchase.paymentMethodRequired'));
      return;
    }
    if (!formData.remise || Number(formData.remise) > 100 || Number(formData.remise) < 0) {
      handleError(t('purchase.remiseInvalid'));
      return;
    }

    // Validate document code sequence
    if (!validateDocumentCode()) {
      const expectedCode = formData.document_type === 'Invoice'
        ? latestInvoiceCode
        : documentCodes.find(dc => dc.id === parseInt(formData.vendor_id))?.code || 1;

      handleError(t('purchase.documentCodeSequence', { code: expectedCode }));
      return;
    }

    // Validate purchase items
    if (purcItems.length === 0) {
      handleError(t('purchase.atLeastOneProduct'));
      return;
    }

    // Check for duplicate raws in purchase
    const productIds = purcItems.map(item => item.r_id);
    const uniqueIds = new Set(productIds);
    if (productIds.length !== uniqueIds.size) {
      handleError(t('purchase.duplicateMaterials'));
      return;
    }

    setLoading(true);
    try {
      // Prepare purchase data for backend - matching the expected Purc interface structure
      const purcData = {
        vId: parseInt(formData.vendor_id), // Vendor ID
        code: parseInt(formData.document_code), // Document code
        docType: formData.document_type, // Document type
        date: formData.issue_date, // Issue date
        description: formData.description.trim(),
        total: Math.round(totalAmount * 100) / 100, // Total amount
        paymentMethod: formData.payment_method.trim(),
        remise: Math.round(Number(formData.remise.trim()) * 100) / 100,
        items: purcItems.map(item => ({
          r_id: item.r_id,
          quantity: Math.round(item.quantity * 100) / 100,
          unit_price: Math.round(item.unit_price * 100) / 100,
          name: item.raw_name
        }))
      };

      await invoke('add_purchase', purcData);
      console.log(purcData)

      handleSuccess()

      // Reset form data
      setFormData({
        vendor_id: '',
        document_type: 'BL',
        document_code: '',
        issue_date: new Date().toISOString().split('T')[0],
        description: '',
        payment_method: '',
        remise: '0'
      });
      setPurcItems([]);

      // Refresh all data after successful submission
      try {
        const [vendorsResult, rawsResult] = await Promise.all([
          invoke('get_vendors'),
          invoke('get_raw_materials')
        ]);

        setVendors(vendorsResult as Vendor[]);
        setRaws(rawsResult as Raw[]);

        // Refresh document codes for the current year
        const selectedYear = new Date().getFullYear(); // Use current year after reset

        if (formData.document_type === 'Invoice') {
          const invoiceCode = await invoke('get_new_invoice_code_purchase_for_year', { year: selectedYear });
          setLatestInvoiceCode(invoiceCode as number);
        } else if (formData.document_type === 'BL') {
          const blCodes = await invoke('get_new_bl_code_purchase_for_year', { year: selectedYear });
          setDocumentCodes(blCodes as DocumentCodeInfo[]);
        }

        console.log('Data refreshed after successful purchase submission');
      } catch (refreshError) {
        console.error('Error refreshing data after purchase:', refreshError);
        handleWarning(t('purchase.dataRefreshWarning')); // You might want to add this translation
      }

    } catch (error) {
      console.error('Error adding purchase:', error);
      handleError(t('purchase.failedPurchase'))
    } finally {
      setLoading(false);
    }
  };

  if (loadingData) {
    return (
      <div className="flex flex-col gap-4 items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin" />
        <div className="text-white">{t('purchase.loadingPurchaseData')}</div>
      </div>
    );
  }

  return (
    <div className='flex flex-col gap-8 mx-auto py-6 pb-5 px-1 lg:px-2 xl:px-4 max-w-4xl relative'>
      {/* Header */}
      <div className="flex items-center gap-4">
        <motion.button
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft size={20} />
          {t('purchase.backToPurchases')}
        </motion.button>
      </div>

      {/* Main Form Card */}
      <div className="bg-slate-900 p-6 rounded-xl shadow-md border border-slate-700 relative">
        <div className="flex items-center gap-3 mb-6">
          <FileText className="text-green-500" size={24} />
          <h1 className="text-2xl font-bold text-white">{t('purchase.title')}</h1>
        </div>
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Document Information Section */}
          <div className="space-y-6">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <FileText size={20} />
              {t('purchase.documentInformation')}
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Vendor Selection */}
              <div className="md:col-span-2">
                <label htmlFor="vendor_id" className="block text-sm font-medium text-slate-300 mb-2">
                  {t('purchase.vendor')} *
                </label>
                <select
                  id="vendor_id"
                  name="vendor_id"
                  value={formData.vendor_id}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  disabled={loading}
                >
                  <option value="">{t('purchase.selectVendor')}</option>
                  {vendors.map((vendor) => (
                    <option key={vendor.id} value={vendor.id}>
                      {vendor.name}
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
                  {t('documentCode')} *
                </label>
                <input
                  type="number"
                  id="document_code"
                  name="document_code"
                  value={formData.document_code}
                  onChange={handleInputChange}
                  min="1"
                  className="w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder={String(suggestedCode)}
                  disabled={loading}
                />
                <p className="text-xs text-slate-400 mt-1">
                  {t('purchase.sequentialNumbering')}: {suggestedCode}
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
                    placeholder='0'
                    disabled={loading}
                  />
                </div>
              )}
              {formData.document_type === 'Invoice' && (
                <div className="md:col-span-2">
                  <label htmlFor="payment_method" className="block text-sm font-medium text-slate-300 mb-2">
                    {t('paymentMethod')}
                  </label>
                  <textarea
                    id="payment_method"
                    name="payment_method"
                    value={formData.payment_method}
                    onChange={handleInputChange}
                    rows={1}
                    className="w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none"
                    placeholder={t('paymentMethod')}
                    disabled={loading}
                  />
                </div>)}

              {/* Description */}
              <div className="md:col-span-2">
                <label htmlFor="description" className="block text-sm font-medium text-slate-300 mb-2">
                  {t('description')}
                </label>
                <textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  rows={3}
                  className="w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none"
                  placeholder={t('description')}
                  disabled={loading}
                />
              </div>
            </div>
          </div>

          {/* Purc Items Section */}
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
                {t('purchase.purchaseItems')}
              </motion.h2>
              <motion.button
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                type="button"
                onClick={addPurcItem}
                disabled={loading}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-green-800 text-white rounded-lg transition-colors"
              >
                <motion.div
                  animate={{ rotate: loading ? 360 : 0 }}
                  transition={{ duration: 1, repeat: loading ? Infinity : 0, ease: "linear" }}
                >
                  <Plus size={16} />
                </motion.div>
                {t('raw.addMaterial')}
              </motion.button>
            </motion.div>
            {purcItems.length > 0 && (
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
                        <span className="text-slate-300">{t('discount')} ({formData.remise}%):</span>
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
                        <span className="text-lg font-semibold text-white">{t('purchase.finalTotal')}:</span>
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
              {purcItems.length === 0 ? (
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
                    {t('addProduct.noMaterialsYet')}
                  </motion.p>
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.6 }}
                    className="text-sm"
                  >
                    {t('purchase.clickAddMaterial')}
                  </motion.p>
                </motion.div>
              ) : (
                <motion.div
                  key="purchase-list"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-4"
                >
                  <AnimatePresence mode="popLayout">
                    {purcItems.map((item, index) => {
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
                          className={`flex gap-4 items-center p-4 bg-slate-800 rounded-lg border`}
                        >
                          <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1 + index * 0.05 }}
                            className="flex-1"
                          >
                            <label className="block text-sm font-medium text-slate-300 mb-2">
                              {t('purchase.rawMaterial')}
                            </label>
                            <motion.select
                              whileFocus={{ scale: 1.02 }}
                              title="Select Raw"
                              value={item.r_id}
                              onChange={(e) => updatePurcItem(item.id, 'r_id', parseInt(e.target.value))}
                              disabled={loading}
                              className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-green-500 transition-all duration-200 cursor-pointer"
                            >
                              {raws
                                .filter(raw => {
                                  return (
                                    item.r_id === raw.id ||
                                    !purcItems.some(si => si.r_id === raw.id)
                                  );
                                })
                                .map((raw) => (
                                  <option key={raw.id} value={raw.id}>
                                    {raw.name} ({t('purchase.stock')}: {raw.quantity})
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
                              onChange={(e) => updatePurcItem(item.id, 'quantity', e.target.value)} // Pass the raw value
                              min="0.01"
                              step="0.01" // Add step for decimal precision
                              disabled={loading}
                              className={`w-full px-4 py-2 bg-slate-700 border rounded-lg text-white focus:outline-none focus:ring-2 transition-all duration-200`}
                            />
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
                              {t('purchase.total')}
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
                            title={t('purchase.removeMaterial')}
                            type="button"
                            onClick={() => removePurcItem(item.id)}
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
                  {t('purchase.creatingPurchase')}
                </>
              ) : (
                <>
                  <motion.div
                    whileHover={{ scale: 1.1 }}
                    transition={{ duration: 0.2 }}
                  >
                    <FileText size={18} />
                  </motion.div>
                  {t('purchase.createPurchase')}
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

export default AddPurchase
