import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { invoke } from "@tauri-apps/api/core";
import { Package, ArrowLeft } from 'lucide-react';
import { motion } from 'framer-motion';
import { useMessage } from './context/Message';
import { useI18n } from './context/I18nContext';

interface Vendor {
  id: number;
  name: string;
  location: string;
  phone: string;
}

const AddRaw = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    quantity: '',
    threshold: '',
    unit_price: '',
    v_id: 0, // Initialize with 0 instead of null
  });

  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingVendors, setLoadingVendors] = useState(true);
  const {t} = useI18n();

  const { addToast } = useMessage();
  const handleSuccess = (success: string): void => {
    addToast({
      message: success,
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

  useEffect(() => {
    const fetchVendors = async () => {
      try {
        const result = await invoke('get_vendors');
        const vendorsList = result as Vendor[];
        setVendors(vendorsList);

        // Set the first vendor as default if available
        if (vendorsList.length > 0) {
          setFormData(prev => ({
            ...prev,
            v_id: vendorsList[0].id
          }));
        }
      } catch (error) {
        console.error('Error fetching vendors:', error);
      } finally {
        setLoadingVendors(false);
      }
    };

    fetchVendors();
  }, []);

  const updateVendor = (vendorId: number) => {
    setFormData(prev => ({
      ...prev,
      v_id: vendorId
    }));
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
  let parsedValue: string | number = value;

  if (name === 'quantity' || name === 'unit_price' || name === 'threshold') {
    parsedValue = Math.round(parseFloat(value) * 100) / 100 || 0;
  }
    setFormData(prev => ({
      ...prev,
      [name]: parsedValue
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      handleError(t('rawMaterialDetails.rawMaterialName'));
      return;
    }

    if (!formData.quantity || !formData.threshold || !formData.unit_price) {
      handleError(t('rawMaterialDetails.allFieldsRequired'));
      return;
    }

    // Additional validation for vendor
    if (formData.v_id === 0) {
      handleError(t('rawMaterialDetails.selectVendor'));
      return;
    }

    const quantity = Math.round(parseFloat(formData.quantity) * 100) / 100;
    const threshold = Math.round(parseFloat(formData.threshold) * 100) / 100;
    const unit_price = Math.round(parseFloat(formData.unit_price) * 100) / 100;

    if (isNaN(quantity)) {
      handleError(t('raw.quantityInvalid'));
      return;
    }

    if (isNaN(threshold)) {
      handleError(t('raw.thresholdInvalid'));
      return;
    }

    if (isNaN(unit_price)) {
      handleError(t('raw.unitPriceInvalid'));
      return;
    }

    setLoading(true);


    try {
      const result = await invoke('add_raw_material', {
        name: formData.name.trim(),
        quantity,
        threshold,
        unitPrice: unit_price,
        vId: formData.v_id // This is now guaranteed to be a number
      });

      handleSuccess(result as string );

      setFormData({
        name: '',
        quantity: '',
        threshold: '',
        unit_price: '',
        v_id: vendors[0]?.id || 0, // Reset to first vendor or 0
      });


    } catch (error) {
      console.error('Error adding raw material:', error);
      handleError(t('raw.failedAdd'));
    } finally {
      setLoading(false);
    }
  };

  if (loadingVendors) {
    return (
      <div className="flex flex-col gap-4 items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin" />
        <div className="text-white">{t('raw.loadingVendors')}</div>
      </div>
    );
  }

  return (
    <div className='flex flex-col gap-8 mx-auto py-6 pb-5 px-1 lg:px-2 xl:px-4 max-w-4xl'>
      {/* Header */}
      <div className="flex items-center gap-4">
        <motion.button
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft size={20} />
          {t('raw.backToMaterials')}
        </motion.button>
      </div>

      {/* Main Form Card */}
      <div className="bg-slate-900 p-6 rounded-xl shadow-md border border-slate-700">
        <div className="flex items-center gap-3 mb-6">
          <Package className="text-blue-500" size={24} />
          <h1 className="text-2xl font-bold text-white">{t('raw.title')}</h1>
        </div>


        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Product Information Section */}
          <div className="space-y-6">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <Package size={20} />
              {t('raw.materialInformation')}
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Raw Material Name */}
              <motion.div
                className="md:col-span-2"
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
              >
                <label htmlFor="name" className="block text-sm font-medium text-slate-300 mb-2">
                  {t('raw.materialName')} *
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder={t('raw.materialNamePlaceholder')}
                  disabled={loading}
                />
              </motion.div>

              {/* Quantity */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5 }}
              >
                <label htmlFor="quantity" className="block text-sm font-medium text-slate-300 mb-2">
                  {t('raw.initialQuantity')} *
                </label>
                <input
                  type="number"
                  id="quantity"
                  name="quantity"
                  value={formData.quantity}
                  onChange={handleInputChange}
                  min="0"
                  className="w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="0"
                  disabled={loading}
                />
              </motion.div>

              {/* Threshold */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5 }}
              >
                <label htmlFor="threshold" className="block text-sm font-medium text-slate-300 mb-2">
                  {t('threshold')} *
                </label>
                <input
                  type="number"
                  id="threshold"
                  name="threshold"
                  value={formData.threshold}
                  onChange={handleInputChange}
                  min="0"
                  className="w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="0"
                  disabled={loading}
                />
                <p className="text-xs text-slate-400 mt-1">
                  {t('raw.thresholdHelper')}
                </p>
              </motion.div>

              {/* Unit Price */}
              <motion.div
                className="md:col-span-2"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5 }}
              >
                <label htmlFor="unit_price" className="block text-sm font-medium text-slate-300 mb-2">
                  {t('unitPrice')} (DA) *
                </label>
                <input
                  type="number"
                  id="unit_price"
                  name="unit_price"
                  value={formData.unit_price}
                  onChange={handleInputChange}
                  min="0"
                  step="0.01"
                  className="w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="0.00"
                  disabled={loading}
                />
              </motion.div>

              {/* Vendor Selection */}
              {vendors.length > 0 && (
                <motion.div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    {t('vendor')} *
                  </label>
                  <motion.select
                    whileFocus={{ scale: 1.02 }}
                    title="Select vendor"
                    value={formData.v_id}
                    onChange={(e) => updateVendor(parseInt(e.target.value))}
                    disabled={loading}
                    className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-200 cursor-pointer"
                  >
                    {vendors.map((vendor) => (
                      <option key={vendor.id} value={vendor.id}>
                        {vendor.name}
                      </option>
                    ))}
                  </motion.select>
                </motion.div>
              )}
            </div>
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
              disabled={loading || vendors.length === 0}
              className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 disabled:cursor-not-allowed text-white font-medium py-3 px-6 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    className="w-4 h-4 border-2 border-white border-t-transparent rounded-full"
                  />
                  {t('raw.addingMaterial')}
                </>
              ) : (
                <>
                  <motion.div
                    whileHover={{ scale: 1.1 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Package size={18} />
                  </motion.div>
                  {t('raw.addMaterial')}
                </>
              )}
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              type="button"
              onClick={() => navigate('/raw-materials')}
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

export default AddRaw;