import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useEdit } from './context/EditContext';
import { useMessage } from './context/Message';
import { useI18n } from './context/I18nContext';
import { DeleteRawModal } from '../Components/Modals';

import {
  Package,
  ArrowLeft,
  Edit3,
  Save,
  X,
  AlertTriangle,
  CheckCircle,
  DollarSign,
  BarChart3,
  Trash2,
  TrendingDown,
  TrendingUp
} from 'lucide-react';


interface RawMaterial {
  id: number;
  name: string;
  quantity: number;
  unit_price: number;
  threshold: number;
  vendor: string;
  v_id: number;
}

interface Vendor {
  id: number;
  name: string;
  location: string;
  phone: string;
}

const RawDetails = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [raw, setRaw] = useState<RawMaterial | null>(location.state);
  const { isEditing, setIsEditing } = useEdit();
  const [loadingData, setLoadingData] = useState(true);
  const [loading, setLoading] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const { t } = useI18n();
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
  const handleWarning = (warningMessage: string): void => {
    addToast({
      message: warningMessage,
      type: 'warning',
      duration: 2000, // Longer duration for errors
    });
  };

  useEffect(() => {
    const fetchVendors = async () => {
      try {
        const result = await Promise;
        const vendorsList = result as Vendor[];
        setVendors(vendorsList);

      } catch (error) {
        handleError(t('failedToLoad'))
      } finally {
        setLoadingData(false);
      }
    };

    fetchVendors();
  }, []);

  // Edit form state
  const [editForm, setEditForm] = useState({
    name: raw?.name || '',
    quantity: raw?.quantity.toString() || '',
    threshold: raw?.threshold.toString() || '',
    unit_price: raw?.unit_price.toString() || '',
    v_id: raw?.v_id || 0
  });

  const handleEditToggle = () => {
    if (isEditing && raw) {
      // Reset form when canceling
      setEditForm({
        name: raw.name,
        quantity: raw.quantity.toString(),
        threshold: raw.threshold.toString(),
        unit_price: raw.unit_price.toString(),
        v_id: raw.v_id
      });
    }
    setIsEditing(!isEditing);
  };
  const updateVendor = (v_id: number) => {
    setEditForm(prev => ({ ...prev, v_id }));
  };

  const handleSaveChanges = async () => {
    if (!raw) return;

    // Validation
    if (!editForm.name.trim()) {
      handleError(t('raw.nameRequired'));
      return;
    }

    const quantity = parseFloat(editForm.quantity);
    const threshold = parseFloat(editForm.threshold);
    const unitPrice = parseFloat(editForm.unit_price);
    const v_id = editForm.v_id

    if (isNaN(quantity) || quantity < 0) {
      handleError(t('raw.quantityInvalid'));
      return;
    }

    if (isNaN(threshold) || threshold < 0) {
      handleError(t('raw.thresholdInvalid'));
      return;
    }

    if (isNaN(unitPrice) || unitPrice <= 0) {
      handleError(t('raw.unitPriceInvalid'));
      return;
    }
    if (isNaN(v_id) || v_id < 0) {
      handleError('Select a vendor');
      return;
    }

    setLoading(true);
    try {
      await Promise;

      // Update local state
      setRaw({
        ...raw,
        name: editForm.name.trim(),
        quantity,
        threshold,
        unit_price: unitPrice,
        v_id: v_id
      });

      setIsEditing(false);
      handleSuccess(t('savingChanges'));
    } catch (error) {
      handleError(t('raw.failedToUpdate'));
    } finally {
      setLoading(false);
    }
  };


  const handleDelete = async () => {
    if (!raw) return;

    setLoading(true);
    try {
      await Promise;
      handleSuccess(t('raw.successToDelete'));

      setTimeout(() => {
        navigate(-1);
      }, 2000);
    } catch (error) {
      handleError(t('raw.failedToDelete'));
    } finally {
      setLoading(false);
    }
  };


  if (loadingData) {
    return (
      <div className="flex flex-col gap-4 items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin" />
        <div className="text-white">{t('loadingData')}</div>
      </div>
    );
  }

  if (!raw) {
    return (
      <div className='flex items-center justify-center min-h-screen'>
        <div className="text-white">{t('raw.materialNotFound')}</div>
      </div>
    );
  }

  return (
    <div className='flex flex-col gap-8 mx-auto py-6 pb-5 px-1 lg:px-2 xl:px-4 max-w-6xl relative h-fit'>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => {
              if (isEditing) {
                handleWarning(t('saveFirst'))
              }
              else {
                navigate(-1)
              }
            }}
            className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeft size={20} />
            {t('raw.backToMaterials')}
          </button>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowDeleteModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg transition-colors"
          >
            <Trash2 size={16} />
            Delete Sale
          </button>
          <button
            onClick={handleEditToggle}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            {isEditing ? <X size={16} /> : <Edit3 size={16} />}
            {isEditing ? t('cancel') : t('edit')}
          </button>
        </div>
      </div>

      {/* raw Information */}
      <div className="bg-slate-900 p-6 rounded-xl shadow-md border border-slate-700">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <Package className="text-blue-500" size={28} />
            {isEditing ? t('raw.Edit') : raw.name}
          </h1>

          {isEditing && (
            <button
              onClick={handleSaveChanges}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-green-800 text-white rounded-lg transition-colors"
            >
              <Save size={16} />
              {t('saveChanges')}
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* raw Name */}
          <div className="lg:col-span-2">
            <label className="block text-sm font-medium text-slate-300 mb-2">
              {t('raw.materialName')}
            </label>
            {isEditing ? (
              <input
                title="raw Name"
                type="text"
                value={editForm.name}
                onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                className="w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={loading}
              />
            ) : (
              <div className="w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-lg text-white">
                {raw.name}
              </div>
            )}
          </div>

          {/* Quantity */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              {t('productDetails.currentQuantity')}
            </label>
            {isEditing ? (
              <input
                title="Current Quantity"
                type="number"
                value={editForm.quantity}
                onChange={(e) => setEditForm(prev => ({ ...prev, quantity: e.target.value }))}
                min="0"
                className="w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={loading}
              />
            ) : (
              <div className={`w-full px-4 py-3 border rounded-lg text-white ${raw.quantity < raw.threshold
                ? 'bg-red-900/30 border-red-700'
                : 'bg-slate-800 border-slate-600'
                }`}>
                {raw.quantity}
                {raw.quantity < raw.threshold && (
                  <AlertTriangle className="inline ml-2 text-red-400" size={16} />
                )}
              </div>
            )}
          </div>

          {/* Threshold */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              {t('threshold')}
            </label>
            {isEditing ? (
              <input
                title="Threshold"
                type="number"
                value={editForm.threshold}
                onChange={(e) => setEditForm(prev => ({ ...prev, threshold: e.target.value }))}
                min="0"
                className="w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={loading}
              />
            ) : (
              <div className="w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-lg text-white">
                {raw.threshold}
              </div>
            )}
          </div>

          {/* Unit Price */}
          <div className="lg:col-span-2">
            <label className="block text-sm font-medium text-slate-300 mb-2">
              {t('unitPrice')}
            </label>
            {isEditing ? (
              <input
                title="Unit Price"
                type="number"
                value={editForm.unit_price}
                onChange={(e) => setEditForm(prev => ({ ...prev, unit_price: e.target.value }))}
                min="0"
                step="0.01"
                className="w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={loading}
              />
            ) : (
              <div className="w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-lg text-white flex items-center gap-2">
                <DollarSign size={16} className="text-green-400" />
                ${raw.unit_price.toFixed(2)}
              </div>
            )}
          </div>

          {/* Total Value */}
          <div className="lg:col-span-2">
            <label className="block text-sm font-medium text-slate-300 mb-2">
              {t('productDetails.totalInventoryValue')}
            </label>
            <div className="w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-lg text-white flex items-center gap-2">
              <BarChart3 size={16} className="text-blue-400" />
              ${(raw.quantity * raw.unit_price).toFixed(2)}
            </div>
          </div>

          <div className="md:col-span-4">
            {vendors.length > 0 && (
              <motion.div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  {t('vendor')} *
                </label>
                <motion.select
                  whileFocus={{ scale: 1.02 }}
                  title="Select vendor"
                  value={editForm.v_id}
                  onChange={(e) => updateVendor(parseInt(e.target.value))}
                  disabled={loading || !isEditing}
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
      </div>
      {/* Statistics Section */}
      <div className="bg-slate-900 p-6 rounded-xl shadow-md border border-slate-700">
        <motion.h2
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-lg font-semibold text-white flex items-center gap-2 mb-6"
        >
          <BarChart3 size={20} />
          {t('raw.analyticsAndInsights')}
        </motion.h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Inventory Value */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            whileHover={{ scale: 1.02, transition: { duration: 0.2 } }}
            className="text-center p-4 bg-slate-800 rounded-lg hover:bg-slate-700 transition-colors"
          >
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="text-2xl font-bold text-blue-400 mb-2"
            >
              ${(raw.quantity * raw.unit_price).toFixed(2)}
            </motion.div>
            <div className="text-slate-400 flex items-center justify-center gap-1">
              <DollarSign size={14} />
              {t('productDetails.totalInventoryValue')}
            </div>
          </motion.div>

          {/* Stock Status */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            whileHover={{ scale: 1.02, transition: { duration: 0.2 } }}
            className="text-center p-4 bg-slate-800 rounded-lg hover:bg-slate-700 transition-colors"
          >
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.4 }}
              className={`text-2xl font-bold mb-2 ${raw.quantity >= raw.threshold ? 'text-green-400' : 'text-red-400'
                }`}
            >
              {raw.quantity >= raw.threshold ? 'In Stock' : 'Low Stock'}
            </motion.div>
            <div className="text-slate-400 flex items-center justify-center gap-1">
              {raw.quantity >= raw.threshold ? (
                <CheckCircle size={14} />
              ) : (
                <AlertTriangle size={14} />
              )}
              {t('rawMaterials.stockStatus')}
            </div>
          </motion.div>

          {/* Stock Level Percentage */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            whileHover={{ scale: 1.02, transition: { duration: 0.2 } }}
            className="text-center p-4 bg-slate-800 rounded-lg hover:bg-slate-700 transition-colors"
          >
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.5 }}
              className={`text-2xl font-bold mb-2 ${(raw.quantity / raw.threshold) * 100 >= 100 ? 'text-green-400' :
                (raw.quantity / raw.threshold) * 100 >= 50 ? 'text-yellow-400' : 'text-red-400'
                }`}
            >
              {((raw.quantity / raw.threshold) * 100).toFixed(0)}%
            </motion.div>
            <div className="text-slate-400 flex items-center justify-center gap-1">
              {(raw.quantity / raw.threshold) * 100 >= 100 ? (
                <TrendingUp size={14} />
              ) : (
                <TrendingDown size={14} />
              )}
              {t('rawMaterials.vsThreshold')}
            </div>
          </motion.div>
        </div>

        {/* Stock Level Progress Bar */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.7 }}
          className="mt-6 p-4 bg-slate-800 rounded-lg"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-slate-300">{t('rawMaterials.stockLevelProgress')}</span>
            <span className="text-sm text-slate-400">
              {raw.quantity} / {raw.threshold * 2} t({t('rawMaterials.optimalStock')})
            </span>
          </div>
          <div className="w-full bg-slate-700 rounded-full h-3">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${Math.min((raw.quantity / (raw.threshold * 2)) * 100, 100)}%` }}
              transition={{ duration: 1, delay: 0.8, ease: "easeOut" }}
              className={`h-3 rounded-full transition-colors ${raw.quantity >= raw.threshold * 1.5 ? 'bg-green-500' :
                raw.quantity >= raw.threshold ? 'bg-yellow-500' : 'bg-red-500'
                }`}
            />
          </div>
          <div className="flex justify-between text-xs text-slate-400 mt-1">
            <span>{t('rawMaterials.critical', { count: raw.threshold })}</span>
            <span>{t('rawMaterials.optimal', { count: raw.threshold * 2 })}</span>
          </div>
        </motion.div>
      </div>
      <DeleteRawModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDelete}
        loading={loading}
        raw={raw}
      >

      </DeleteRawModal>
    </div>
  );
};
export default RawDetails;