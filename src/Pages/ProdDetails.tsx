import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { invoke } from "@tauri-apps/api/core";
import { motion, AnimatePresence } from 'framer-motion';
import { useNotifications } from './context/NotificationContext'; // Add this import
import { useEdit } from './context/EditContext';
import { useMessage } from './context/Message';
import {useI18n} from './context/I18nContext';
import { DeleteProductModal } from '../Components/Modals';
import {
  Package,
  ArrowLeft,
  Edit3,
  Save,
  X,
  Factory,
  ChefHat,
  AlertTriangle,
  DollarSign,
  BarChart3,
  Trash2,
  Plus,
  TrendingUp,
  ChevronDown
} from 'lucide-react';

interface Product {
  id: number;
  name: string;
  quantity: number;
  threshold: number;
  unit_price: number;
}

interface RecipeItem {
  id?: string;
  raw_material_id: number;
  raw_material_name: string;
  quantity: number;
}

interface RawMaterial {
  id: number;
  name: string;
  quantity: number;
  unit_price: number;
  threshold: number;
  vendor: string;
  v_id: number;
}

const ProdDetails = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [product, setProduct] = useState<Product | null>(location.state);
  const {isEditing,setIsEditing,isEditingItems,setIsEditingItems} = useEdit()
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [recipe, setRecipe] = useState<RecipeItem[]>([]);
  const [rawMaterials, setRawMaterials] = useState<RawMaterial[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [productionQuantity, setProductionQuantity] = useState(1);
  const [loading, setLoading] = useState(false);
  const [showProductionSection, setShowProductionSection] = useState(false);
  const [originalRecipe, setOriginalRecipe] = useState<RecipeItem[]>([]);
  const { checkNotifications } = useNotifications();
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
  const handleWarning = (warningMessage: string): void => {
    addToast({
      message: warningMessage,
      type: 'warning',
      duration: 2000, // Longer duration for errors
    });
  };


  const handleInfo = (infoMessage: string) => {
    addToast({
      message: infoMessage,
      type: 'info',
      duration: 2000
    });
  };

  // Edit form state
  const [editForm, setEditForm] = useState({
    name: product?.name || '',
    quantity: product?.quantity.toString() || '',
    threshold: product?.threshold.toString() || '',
    unit_price: product?.unit_price.toString() || ''
  });

  useEffect(() => {
    if (!product) {
      navigate(-1);
      return;
    }

    const fetchProductData = async () => {
      try {
        let result = await invoke('get_product_recipe', { productId: Number(product?.id) });
        const recipeData = result as RecipeItem[];
        // Add unique IDs to recipe items if they don't have them
        const recipeWithIds = recipeData.map((item, index) => ({
          ...item,
          id: item.id || `recipe-${index}-${Date.now()}`
        }));
        setRecipe(recipeWithIds);
        console.log('Product data fetched:', result);

        result = await invoke('get_raw_materials');
        setRawMaterials(result as RawMaterial[]);
        console.log('Raw materials fetched:', result);
      } catch (error) {
        console.error('Error fetching Data:', error);
        handleError(t('failedToLoad'));
      } finally {
        setLoadingData(false);
      }
    };
    fetchProductData();
  }, [product, navigate]);


  const handleEditToggle = () => {
    if (isEditing && product) {
      // Reset form when canceling
      setEditForm({
        name: product.name,
        quantity: product.quantity.toString(),
        threshold: product.threshold.toString(),
        unit_price: product.unit_price.toString()
      });
    }
    setIsEditing(!isEditing);
  };

  const handleSaveChanges = async () => {
    if (!product) return;

    // Validation
    if (!editForm.name.trim()) {
      handleError(t('addProduct.productNameRequired'));
      return;
    }

    const quantity = parseInt(editForm.quantity);
    const threshold = parseInt(editForm.threshold);
    const unitPrice = parseFloat(editForm.unit_price);

    if (isNaN(quantity) || quantity < 0) {
      handleError(t('ValidNN'));
      return;
    }

    if (isNaN(threshold) || threshold < 0) {
      handleError(t('ValidNN'));
      return;
    }

    if (isNaN(unitPrice) || unitPrice <= 0) {
      handleError(t('ValidNN'));
      return;
    }

    setLoading(true);
    try {
      await invoke('update_product', {
        productId: Number(product.id),
        name: editForm.name.trim(),
        quantity: Math.round(Number(quantity)),
        threshold: Math.round(Number(threshold)),
        unitPrice: Math.round(Number(unitPrice)*100)/100
      });

      // Update local state
      setProduct({
        ...product,
        name: editForm.name.trim(),
        quantity,
        threshold,
        unit_price: unitPrice
      });

      setIsEditing(false);
      handleInfo('Saving Product Info...');
    } catch (error) {
      console.error('Error updating product:', error);
      handleError(t('messages.failedToUpdateProduct'));
    } finally {
      setLoading(false);
    }
  };

  // Recipe management functions
  const addRecipeItem = () => {
    if (rawMaterials.length === 0) {
      handleError(t('messages.noRawMaterials'));
      return;
    }

    let k = 0;
    while (k < rawMaterials.length && recipe.some(item => item.raw_material_id === rawMaterials[k].id)) {
      k++;
    }

    if (k >= rawMaterials.length) {
      handleError(t('purchase.allRawAdded'));
      return;
    }

    const newItem: RecipeItem = {
      id: `recipe-${Date.now()}-${Math.random()}`,
      raw_material_id: rawMaterials[k].id,
      raw_material_name: rawMaterials[k].name,
      quantity: 1
    };

    setRecipe(prev => [...prev, newItem]);
  };

  const removeRecipeItem = (id: string) => {
    setRecipe(prev => prev.filter(item => item.id !== id));
  };

  const updateRecipeItem = (id: string, field: 'raw_material_id' | 'quantity', value: string | number) => {
    setRecipe(prev => prev.map(item => {
      if (item.id === id) {
        const updatedItem = { ...item, [field]: value };
        if (field === 'raw_material_id') {
          const selectedMaterial = rawMaterials.find(rm => rm.id === Number(value));
          updatedItem.raw_material_name = selectedMaterial?.name || '';
        }
        if ( field === 'quantity' )
        {
          if(Number(value) < 0.01)
          {
            updatedItem.quantity = 1
          }
        }
        return updatedItem;
      }
      return item;
    }));
  };

  const handleSaveRecipe = async () => {
    if (!product) return;

    setLoading(true);
    try {
      await invoke('update_product_recipe', {
        productId: Number(product.id),
        recipe
      });

      setIsEditingItems(false);
      setOriginalRecipe([]);
      handleInfo(t('product.saveRecipe'));
    } catch (error) {
      console.error('Error updating recipe:', error);
      handleError(t('product.failedUpdateRecipe'));
    } finally {
      setLoading(false);
    }
  };

  const handleProduction = async () => {
    if (!product || productionQuantity <= 0) {
      handleError(t('product.InvalidProductionQuantity'));
      return;
    }

    setLoading(true);
    try {
      await invoke('produce_product', {
        productId: Number(product.id),
        produceQuantity: Math.round(Number(productionQuantity))
      });

      // Update product quantity locally
      setProduct({
        ...product,
        quantity: product.quantity + productionQuantity
      });

      setShowProductionSection(false); // Hide section after successful production
      setProductionQuantity(1);
      handleInfo(`${productionQuantity} ${(productionQuantity>1)? t('units'): t('unit')}`);
      await checkNotifications();
    } catch (error) {
      console.error('Error producing product:', error);
      handleError(t('product.failedToProduce'));
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!product) return;

    setLoading(true);
    try {
      await invoke('delete_product', { productId: Number(product.id) });
      handleSuccess(t('product.deletedSuccess'));

      setTimeout(() => {
        navigate(-1);
      }, 2000);
    } catch (error) {
      console.error('Error deleting product:', error);
      handleError(t('product.deleteFailed'));
    } finally {
      setLoading(false);
    }
  };

  const canProduce = (quantity: number) => {
    return recipe.every(item => {
      const rawMaterial = rawMaterials.find(rm => rm.id === item.raw_material_id);
      return rawMaterial && rawMaterial.quantity >= item.quantity * quantity;
    });
  };

  const calculateProductionCost = (quantity: number = 1) => {
    return recipe.reduce((total, item) => {
      const rawMaterial = rawMaterials.find(rm => rm.id === item.raw_material_id);
      if (rawMaterial) {
        return total + (rawMaterial.unit_price * item.quantity * quantity);
      }
      return total;
    }, 0);
  };

  const getMaxProducible = () => {
    if (recipe.length === 0) return 0;
    return Math.min(...recipe.map(item => {
      const rawMaterial = rawMaterials.find(rm => rm.id === item.raw_material_id);
      return Math.floor((rawMaterial?.quantity || 0) / item.quantity);
    }));
  };

  const getProfitMargin = () => {
    if (!product || recipe.length === 0) return 0;
    const productionCost = calculateProductionCost();
    return ((product.unit_price - productionCost) / product.unit_price) * 100;
  };

  if (loadingData) {
    return (
            <div className="flex flex-col gap-4 items-center justify-center min-h-screen">
              <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin" />
              <div className="text-white">{t('loadingData')}</div>
            </div>
    );
  }

  if (!product) {
    return (
      <div className='flex items-center justify-center min-h-screen'>
        <div className="text-white">{t('product.NotFound')}</div>
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
              if (isEditing || isEditingItems) {
                handleWarning(t('saveFirst'))
              }
              else {
                navigate(-1)
              }
            }}
            className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeft size={20} />
            {t('addProduct.backToProducts')}
          </button>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowDeleteModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg transition-colors"
          >
            <Trash2 size={16} />
            Delete Product
          </button>

          <button
            onClick={handleEditToggle}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            {isEditing ? <X size={16} /> : <Edit3 size={16} />}
            {isEditing ? 'Cancel' : 'Edit'}
          </button>
        </div>

      </div>

      {/* Product Information */}
      <div className="bg-slate-900 p-6 rounded-xl shadow-md border border-slate-700">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <Package className="text-blue-500" size={28} />
            {isEditing ? 'Edit Product' : product.name}
          </h1>

          {isEditing && (
            <button
              onClick={handleSaveChanges}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-green-800 text-white rounded-lg transition-colors"
            >
              <Save size={16} />
              Save Changes
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Product Name */}
          <div className="lg:col-span-2">
            <label className="block text-sm font-medium text-slate-300 mb-2">
              {t('addProduct.productName')}
            </label>
            {isEditing ? (
              <input
                title="Product Name"
                type="text"
                value={editForm.name}
                onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                className="w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={loading}
              />
            ) : (
              <div className="w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-lg text-white">
                {product.name}
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
                onChange={(e) => setEditForm(prev => ({ ...prev, quantity: String(parseInt(e.target.value)) }))}
                min="0"
                className="w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={loading}
              />
            ) : (
              <div className={`w-full px-4 py-3 border rounded-lg text-white ${product.quantity < product.threshold
                ? 'bg-red-900/30 border-rose-700'
                : 'bg-slate-800 border-slate-600'
                }`}>
                {product.quantity}
                {product.quantity < product.threshold && (
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
                onChange={(e) => setEditForm(prev => ({ ...prev, threshold: String(parseInt(e.target.value)) }))}
                min="0"
                className="w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={loading}
              />
            ) : (
              <div className="w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-lg text-white">
                {product.threshold}
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
                onChange={(e) => setEditForm(prev => ({ ...prev, unit_price: String(Math.round(parseFloat(e.target.value)*100)/100) }))}
                min="0"
                step="0.01"
                className="w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={loading}
              />
            ) : (
              <div className="w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-lg text-white flex items-center gap-2">
                <DollarSign size={16} className="text-green-400" />
                ${product.unit_price.toFixed(2)}
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
              ${(product.quantity * product.unit_price).toFixed(2)}
            </div>
          </div>
        </div>
      </div>

      {/* Recipe Section */}
      <div className="bg-slate-900 p-6 rounded-xl shadow-md border border-slate-700">
        <div className="flex items-center justify-between mb-6">
          <motion.h2 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="text-lg font-semibold text-white flex items-center gap-2"
          >
            <ChefHat size={20} />
            {t('productDetails.recipe')}
          </motion.h2>

          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="flex items-center gap-3"
          >
            {!isEditingItems && (
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.90 }}
                onClick={() => {
                  setOriginalRecipe(recipe);
                  setIsEditingItems(true);
                }}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                <Edit3 size={16} />
                {t('productDetails.editRecipe')}
              </motion.button>
            )}

            <AnimatePresence>
              {isEditingItems && (
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.3 }}
                  className="flex items-center gap-3"
                >
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={addRecipeItem}
                    disabled={loading}
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-green-800 text-white rounded-lg transition-colors"
                  >
                    <Plus size={16} />
                    {t('productDetails.addMaterial')}
                  </motion.button>

                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleSaveRecipe}
                    disabled={loading}
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-green-800 text-white rounded-lg transition-colors"
                  >
                    {loading ? (
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                        className="w-4 h-4 border-2 border-white border-t-transparent rounded-full"
                      />
                    ) : (
                      <Save size={16} />
                    )}
                    {t('productDetails.saveRecipe')}
                  </motion.button>

                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => {
                      setIsEditingItems(false);
                      setRecipe(originalRecipe);
                      setOriginalRecipe([]);
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-slate-600 hover:bg-slate-700 text-white rounded-lg transition-colors"
                  >
                    <X size={16} />
                    {t('cancel')}
                  </motion.button>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>

        {recipe.length === 0 ? (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-center py-8 text-slate-400"
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 0.5 }}
              transition={{ delay: 0.3, type: "spring" }}
            >
              <ChefHat size={48} className="mx-auto mb-4" />
            </motion.div>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
            >
              {t('productDetails.noRecipe')}
            </motion.p>
            <AnimatePresence>
              {isEditingItems && (
                <motion.p
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ delay: 0.5 }}
                  className="text-sm mt-2"
                >
                  {t('productDetails.startBuildingRecipe')}
                </motion.p>
              )}
            </AnimatePresence>
          </motion.div>
        ) : (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="space-y-4"
          >
            <AnimatePresence mode="popLayout">
              {recipe.map((item, index) => {
                const rawMaterial = rawMaterials.find(rm => rm.id === item.raw_material_id);
                const available = rawMaterial?.quantity || 0;
                const isLowStock = available < item.quantity;

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
                    className="flex gap-4 items-center p-4 bg-slate-800 rounded-lg border border-slate-600"
                  >
                    <motion.div 
                      className="flex-1"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.1 + index * 0.05 }}
                    >
                      <label className="block text-sm font-medium text-slate-300 mb-2">
                        {t('productDetails.rawMaterial')}
                      </label>
                      {isEditingItems ? (
                        <motion.select
                          whileFocus={{ scale: 1.02 }}
                          title="Select Raw Material"
                          value={item.raw_material_id}
                          onChange={(e) => updateRecipeItem(item.id!, 'raw_material_id', parseInt(e.target.value))}
                          disabled={loading}
                          className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-200 cursor-pointer"
                        >
                          {rawMaterials
                            .filter(material => {
                              return (
                                item.raw_material_id === material.id ||
                                !recipe.some(r => r.raw_material_id === material.id)
                              );
                            })
                            .map((material) => (
                              <option key={material.id} value={material.id}>
                                {material.name}
                              </option>
                            ))}
                        </motion.select>
                      ) : (
                        <motion.div 
                          whileHover={{ backgroundColor: "rgb(51 65 85)" }}
                          className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white transition-colors duration-200"
                        >
                          {item.raw_material_name}
                        </motion.div>
                      )}
                    </motion.div>

                    <motion.div 
                      className="w-32"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.15 + index * 0.05 }}
                    >
                      <label className="block text-sm font-medium text-slate-300 mb-2">
                        {t('required')}
                      </label>
                      {isEditingItems ? (
                        <motion.input
                          whileFocus={{ scale: 1.05 }}
                          title="Enter Quantity"
                          type="number"
                          value={item.quantity}
                          onChange={(e) => updateRecipeItem(item.id!, 'quantity', Math.round(parseFloat(e.target.value)*100) /100 || 0.01)}
                          min="0.01"
                          disabled={loading}
                          className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-200"
                        />
                      ) : (
                        <motion.div 
                          whileHover={{ backgroundColor: "rgb(51 65 85)" }}
                          className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white transition-colors duration-200"
                        >
                          {item.quantity}
                        </motion.div>
                      )}
                    </motion.div>

                    <motion.div 
                      className="w-32"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.2 + index * 0.05 }}
                    >
                      <label className="block text-sm font-medium text-slate-300 mb-2">
                        {t('available')} 
                      </label>
                      <motion.div 
                        whileHover={{ scale: 1.02 }}
                        className={`w-full px-4 py-2 border rounded-lg text-white transition-all duration-200 ${isLowStock
                          ? 'bg-red-900/30 border-rose-700'
                          : 'bg-slate-700 border-slate-600'
                        }`}
                      >
                        {available}
                        <AnimatePresence>
                          {isLowStock && (
                            <motion.div
                              initial={{ opacity: 0, rotate: -10 }}
                              animate={{ opacity: 1, rotate: 0 }}
                              exit={{ opacity: 0, rotate: 10 }}
                              className="inline ml-1"
                            >
                              <AlertTriangle className="text-red-400" size={14} />
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </motion.div>
                    </motion.div>

                    <AnimatePresence>
                      {isEditingItems && (
                        <motion.button
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.8 }}
                          whileHover={{ 
                            scale: 1.1,
                            backgroundColor: "rgb(127 29 29 / 0.2)"
                          }}
                          whileTap={{ scale: 0.9 }}
                          title="Remove Material"
                          type="button"
                          onClick={() => removeRecipeItem(item.id!)}
                          disabled={loading}
                          className="mt-6 p-2 text-red-400 hover:text-red-300 rounded-lg transition-colors duration-200"
                        >
                          <Trash2 size={18} />
                        </motion.button>
                      )}
                    </AnimatePresence>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </motion.div>
        )}
      </div>

      {/* Statistics Section */}
      <div className="bg-slate-900 p-6 rounded-xl shadow-md border border-slate-700">
        <h2 className="text-lg font-semibold text-white flex items-center gap-2 mb-6">
          <BarChart3 size={20} />
          Stats
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="text-center p-4 bg-slate-800 rounded-lg">
            <div className="text-2xl font-bold text-blue-400 mb-2">${calculateProductionCost().toFixed(2)}</div>
            <div className="text-slate-400 flex items-center justify-center gap-1">
              <DollarSign size={14} />
              {t('productDetails.productionCostUnit')}
            </div>
          </div>

          <div className="text-center p-4 bg-slate-800 rounded-lg">
            <div className={`text-2xl font-bold mb-2 ${getProfitMargin() > 0 ? 'text-green-400' : 'text-red-400'}`}>
              {getProfitMargin().toFixed(1)}%
            </div>
            <div className="text-slate-400 flex items-center justify-center gap-1">
              <TrendingUp size={14} />
              {t('productDetails.profitMargin')}
            </div>
          </div>
          <div className="text-center p-4 bg-slate-800 rounded-lg">
            <div className="text-2xl font-bold text-emerald-400 mb-2">
              ${((product.unit_price - calculateProductionCost()) * product.quantity).toFixed(0)}
            </div>
            <div className="text-slate-400 flex items-center justify-center gap-1">
              <DollarSign size={14} />
              {t('productDetails.potentialProfit')}
            </div>
          </div>
        </div>
      </div>
      
      {/* Production Section */}
      <div className="bg-slate-900 p-6 rounded-xl shadow-md border border-slate-700">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <Factory size={20} />
            {t('productDetails.productionManagement')}
          </h2>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setShowProductionSection(!showProductionSection)}
            disabled={recipe.length === 0}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-slate-700 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
          >
            <Factory size={16} />
            {showProductionSection ? 'Hide Production' : 'Start Production'}
            <motion.div
              animate={{ rotate: showProductionSection ? 180 : 0 }}
              transition={{ duration: 0.3 }}
            >
              <ChevronDown size={16} />
            </motion.div>
          </motion.button>
        </div>

        {recipe.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-8 text-slate-400"
          >
            <Factory size={48} className="mx-auto mb-4 opacity-50" />
            <p>{t('productDetails.noRecipe')}</p>
            <p className="text-sm mt-2">{t('productDetails.addRawMaterials')}</p>
          </motion.div>
        ) : (
          <>
            {/* Quick Production Stats */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6"
            >
              <motion.div
                whileHover={{ scale: 1.02 }}
                className="text-center p-4 bg-slate-800 rounded-lg cursor-pointer"
              >
                <div className={`text-2xl font-bold mb-2 ${product.quantity < product.threshold ? 'text-red-400' : 'text-green-400'
                  }`}>
                  {product.quantity < product.threshold ? 'Low Stock' : 'In Stock'}
                </div>
                <div className="text-slate-400">{t('status')}</div>
                <div className="text-sm text-slate-500 mt-1">{product.quantity} {t('UnitsAvailable')}</div>
              </motion.div>

              <motion.div
                whileHover={{ scale: 1.02 }}
                className="text-center p-4 bg-slate-800 rounded-lg cursor-pointer"
              >
                <div className="text-2xl font-bold text-blue-400 mb-2">{product.threshold - product.quantity}</div>
                <div className="text-slate-400">{t('unitsToTarget')}</div>
                <div className="text-sm text-slate-500 mt-1">{t('Threshold')}: {product.threshold}</div>
              </motion.div>

              <motion.div
                whileHover={{ scale: 1.02 }}
                className="text-center p-4 bg-slate-800 rounded-lg cursor-pointer"
              >
                <div className="text-2xl font-bold text-purple-400 mb-2">{getMaxProducible()}</div>
                <div className="text-slate-400">{t('MaxProducable')}</div>
                <div className="text-sm text-slate-500 mt-1">{t('basedOnMaterials')}</div>
              </motion.div>
            </motion.div>

            {/* Expandable Production Interface */}
            <AnimatePresence>
              {showProductionSection && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{
                    duration: 0.4,
                    ease: "easeInOut",
                    height: { duration: 0.4 }
                  }}
                  className="border-t border-slate-700 overflow-hidden"
                >
                  <motion.div
                    initial={{ y: 0, opacity: 1 }}
                    animate={{ y: 20, opacity: 1 }}
                    transition={{ delay: 0.2, duration: 0.3 }}
                    className="pt-6 space-y-6"
                  >
                    <div className="bg-slate-800 p-6 rounded-lg">
                      <h3 className="text-lg font-semibold text-white mb-4">{t('calculator')}</h3>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <motion.div
                          initial={{ x: -20, opacity: 0 }}
                          animate={{ x: 0, opacity: 1 }}
                          transition={{ delay: 0.3 }}
                        >
                          <label className="block text-sm font-medium text-slate-300 mb-2">
                            {t('productDetails.quantityToProduce')}
                          </label>
                          <input
                            title="Production Quantity"
                            type="number"
                            value={productionQuantity}
                            onChange={(e) => setProductionQuantity(parseInt(e.target.value) || 1)}
                            min="1"
                            max={getMaxProducible()}
                            className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-200"
                            disabled={loading}
                          />
                          <p className="text-sm text-slate-400 mt-1">
                            Maximum: {getMaxProducible()} { getMaxProducible() > 1 ? t('product.units') : t('product.unit')}
                          </p>
                        </motion.div>

                        <div className="space-y-4">
                          <motion.div
                            initial={{ x: 20, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            transition={{ delay: 0.4 }}
                            whileHover={{ scale: 1.02 }}
                            className="p-4 bg-slate-700 rounded-lg"
                          >
                            <h4 className="text-sm font-medium text-slate-300 mb-2">{t('productDetails.productionCost')}</h4>
                            <div className="text-xl font-bold text-green-400">
                              ${calculateProductionCost(productionQuantity).toFixed(2)}
                            </div>
                          </motion.div>

                          <motion.div
                            initial={{ x: 20, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            transition={{ delay: 0.5 }}
                            whileHover={{ scale: 1.02 }}
                            className="p-4 bg-slate-700 rounded-lg"
                          >
                            <h4 className="text-sm font-medium text-slate-300 mb-2">{t('productDetails.expectedProfit')}</h4>
                            <div className="text-xl font-bold text-emerald-400">
                              ${((product.unit_price - calculateProductionCost()) * productionQuantity).toFixed(2)}
                            </div>
                          </motion.div>
                        </div>
                      </div>

                      <motion.div
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 0.6 }}
                        className="mt-6"
                      >
                        <h4 className="text-sm font-medium text-slate-300 mb-3">{t('productDetails.rawMaterialsRequired')}</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {recipe.map((item, index) => {
                            const rawMaterial = rawMaterials.find(rm => rm.id === item.raw_material_id);
                            const required = item.quantity * productionQuantity;
                            const available = rawMaterial?.quantity || 0;
                            const canSupply = available >= required;

                            return (
                              <motion.div
                                key={index}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.7 + index * 0.1 }}
                                whileHover={{ scale: 1.02 }}
                                className="flex justify-between items-center p-3 bg-slate-700 rounded-lg"
                              >
                                <span className="text-slate-300">{item.raw_material_name}</span>
                                <span className={`font-medium ${canSupply ? 'text-green-400' : 'text-red-400'}`}>
                                  {required}/{available}
                                  {!canSupply && <AlertTriangle className="inline ml-1" size={14} />}
                                </span>
                              </motion.div>
                            );
                          })}
                        </div>
                      </motion.div>

                      <motion.div
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 0.8 }}
                        className="flex gap-3 mt-6"
                      >
                        <motion.button
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={handleProduction}
                          disabled={loading || productionQuantity <= 0 || !canProduce(productionQuantity)}
                          className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-green-600 hover:bg-green-700 disabled:bg-slate-700 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
                        >
                          {loading ? (
                            <>
                              <motion.div
                                animate={{ rotate: 360 }}
                                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                                className="w-4 h-4 border-2 border-white border-t-transparent rounded-full"
                              />
                              {t('productDetails.Producing')}
                            </>
                          ) : (
                            <>
                              <Factory size={16} />
                              {t('productDetails.produceNow')}
                            </>
                          )}
                        </motion.button>
                      </motion.div>
                    </div>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </>
        )}
      </div>
        <DeleteProductModal
          isOpen={showDeleteModal}
          onClose={() => setShowDeleteModal(false)}
          product={product}
          onConfirm={handleDelete}
          loading={loading}
        />
    </div>
  );
};

export default ProdDetails;