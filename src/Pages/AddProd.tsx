import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Package, ArrowLeft, Plus, Trash2, ChefHat } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useMessage } from './context/Message';
import { useI18n } from './context/I18nContext';

interface RawMaterial {
  id: number;
  name: string;
  quantity: number;
  unit_price: number;
  threshold: number;
  vendor: string;
  v_id: number;
}

interface RecipeEntry {
  raw_material_id: number;
  quantity: number;
}

interface RecipeItem extends RecipeEntry {
  id: string; // For React key
  raw_material_name: string;
}

const AddProd = () => {
  const navigate = useNavigate();
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    quantity: '',
    threshold: '',
    unit_price: ''
  });
  const { t } = useI18n()

  const [rawMaterials, setRawMaterials] = useState<RawMaterial[]>([]);
  const [recipe, setRecipe] = useState<RecipeItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingRawMaterials, setLoadingRawMaterials] = useState(true);

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

  // Fetch raw materials on component mount
  useEffect(() => {
    const fetchRawMaterials = async () => {
      try {
        const result = await Promise;
        setRawMaterials(result as RawMaterial[]);
      } catch (error) {
        handleError(t('addProduct.failedToLoadRawMaterials'));
      } finally {
        setLoadingRawMaterials(false);
      }
    };

    fetchRawMaterials();
  }, []);

  // Handle form input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    let parsedValue: string | number = value;

    if (name === 'quantity' || name === 'threshold') {
      parsedValue = parseInt(value, 10) || 0;
    } else if (name === 'unit_price') {
      parsedValue = Math.round(parseFloat(value) * 100) / 100 || 0;
    }

    setFormData(prev => ({
      ...prev,
      [name]: parsedValue
    }));
  };


  // Add new recipe item
  const addRecipeItem = () => {
    if (rawMaterials.length === 0) {
      handleError(t('addProduct.noRawMaterials'));
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
      id: Date.now().toString(),
      raw_material_id: rawMaterials[k].id,
      raw_material_name: rawMaterials[k].name,
      quantity: 1
    };

    setRecipe(prev => [...prev, newItem]);
  };

  // Remove recipe item
  const removeRecipeItem = (id: string) => {
    setRecipe(prev => prev.filter(item => item.id !== id));
  };

  // Update recipe item
  const updateRecipeItem = (id: string, field: 'raw_material_id' | 'quantity', value: string | number) => {
    setRecipe(prev => prev.map(item => {
      if (item.id === id) {
        const updatedItem = { ...item, [field]: value };
        if (field === 'raw_material_id') {
          const selectedMaterial = rawMaterials.find(rm => rm.id === Number(value));
          updatedItem.raw_material_name = selectedMaterial?.name || '';
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
    if (!formData.name.trim()) {
      handleError(t('addProduct.productNameRequired'));
      return;
    }

    if (!formData.quantity || !formData.threshold || !formData.unit_price) {
      handleError(t('allFieldsRequired'));
      return;
    }

    const quantity = parseInt(formData.quantity);
    const threshold = parseInt(formData.threshold);
    const unit_price = parseFloat(formData.unit_price);

    if (isNaN(quantity) || quantity < 0) {
      handleError(t('addProduct.quantityInvalid'));
      return;
    }

    if (isNaN(threshold) || threshold < 0) {
      handleError(t('raw.thresholdInvalid'));
      return;
    }

    if (isNaN(unit_price) || unit_price < 0) {
      handleError(t('raw.unitPriceInvalid'));
      return;
    }

    // Validate recipe
    if (recipe.length === 0) {
      handleError(t('addProduct.recipeMaterialRequired'));
      return;
    }

    // Check for duplicate raw materials in recipe
    const materialIds = recipe.map(item => item.raw_material_id);
    const uniqueIds = new Set(materialIds);
    if (materialIds.length !== uniqueIds.size) {
      handleError(t('addProduct.duplicateMaterials'));
      return;
    }

    // Validate recipe quantities
    for (const item of recipe) {
      if (item.quantity <= 0) {
        handleError(t('addProduct.recipeQuantityInvalid'));
        return;
      }
    }

    setLoading(true);
    try {

      const result = await Promise;

      handleSuccess(result as string);

      // Reset form
      setFormData({
        name: '',
        quantity: '',
        threshold: '',
        unit_price: ''
      });
      setRecipe([]);

      // Refresh raw materials data after successful submission
      try {
        const rawMaterialsResult = await Promise;
        setRawMaterials(rawMaterialsResult as RawMaterial[]);

      } catch (refreshError) {
        handleError(t('addProduct.dataRefreshWarning')); // You might want to add this translation
      }

    } catch (error) {
      handleError(t('addProduct.failedToAdd'));
    } finally {
      setLoading(false);
    }
  };

  if (loadingRawMaterials) {
    return (
      <div className="flex flex-col gap-4 items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin" />
        <div className="text-white">{t('addProduct.loadingRawMaterials')}</div>
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
          {t('addProduct.backToProducts')}
        </motion.button>
      </div>

      {/* Main Form Card */}
      <div className="bg-slate-900 p-6 rounded-xl shadow-md border border-slate-700">
        <div className="flex items-center gap-3 mb-6">
          <Package className="text-blue-500" size={24} />
          <h1 className="text-2xl font-bold text-white">{t('addProduct.title')}</h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Product Information Section */}
          <div className="space-y-6">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <Package size={20} />
              {t('addProduct.productInformation')}
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Product Name */}
              <div className="md:col-span-2">
                <label htmlFor="name" className="block text-sm font-medium text-slate-300 mb-2">
                  {t('addProduct.productName')} *
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder={t('addProduct.productNamePlaceholder')}
                  disabled={loading}
                />
              </div>

              {/* Quantity */}
              <div>
                <label htmlFor="quantity" className="block text-sm font-medium text-slate-300 mb-2">
                  {t('addProduct.initialQuantity')} *
                </label>
                <input
                  type="number"
                  id="quantity"
                  name="quantity"
                  value={formData.quantity}
                  onChange={handleInputChange}
                  min="0"
                  step="1"
                  className="w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="0"
                  disabled={loading}
                />
              </div>

              {/* Threshold */}
              <motion.div>
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
                  {t('addProduct.thresholdHelper')}
                </p>
              </motion.div>

              {/* Unit Price */}
              <motion.div className="md:col-span-2"
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
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
            </div>
          </div>

          {/* Recipe Section */}
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
                <ChefHat size={20} />
                {t('addProduct.recipe')}
              </motion.h2>
              <motion.button
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                type="button"
                onClick={addRecipeItem}
                disabled={loading}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-green-800 text-white rounded-lg transition-colors"
              >
                <motion.div
                  animate={{ rotate: loading ? 360 : 0 }}
                  transition={{ duration: 1, repeat: loading ? Infinity : 0, ease: "linear" }}
                >
                  <Plus size={16} />
                </motion.div>
                {t('addProduct.addMaterial')}
              </motion.button>
            </motion.div>

            <AnimatePresence mode="wait">
              {recipe.length === 0 ? (
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
                    <ChefHat size={48} className="mx-auto mb-4 opacity-50" />
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
                    {t('addProduct.clickAddMaterial')}
                  </motion.p>
                </motion.div>
              ) : (
                <motion.div
                  key="recipe-list"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-4"
                >
                  <AnimatePresence mode="popLayout">
                    {recipe.map((item, index) => (
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
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.1 + index * 0.05 }}
                          className="flex-1"
                        >
                          <label className="block text-sm font-medium text-slate-300 mb-2">
                            {t('addProduct.rawMaterial')}
                          </label>
                          <motion.select
                            whileFocus={{ scale: 1.02 }}
                            title="Select Raw Material"
                            value={item.raw_material_id}
                            onChange={(e) => updateRecipeItem(item.id, 'raw_material_id', parseInt(e.target.value))}
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
                        </motion.div>

                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.15 + index * 0.05 }}
                          className="w-32"
                        >
                          <label className="block text-sm font-medium text-slate-300 mb-2">
                            Quantity
                          </label>
                          <motion.input
                            whileFocus={{ scale: 1.05 }}
                            title="Enter Quantity"
                            type="number"
                            value={item.quantity}
                            onChange={(e) => updateRecipeItem(item.id, 'quantity', Math.round(parseFloat(e.target.value) * 100) / 100 || 0)}
                            min="0.01"
                            step="0.01"
                            disabled={loading}
                            className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-200"
                          />
                        </motion.div>

                        <motion.button
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: 0.2 + index * 0.05 }}
                          whileHover={{
                            scale: 1.1,
                            backgroundColor: "rgb(127 29 29 / 0.2)"
                          }}
                          whileTap={{ scale: 0.9 }}
                          title="Remove Material"
                          type="button"
                          onClick={() => removeRecipeItem(item.id)}
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
                    ))}
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
              whileTap={{ scale: 0.98 }}
              type="submit"
              disabled={loading}
              className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 disabled:cursor-not-allowed text-white font-medium py-3 px-6 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    className="w-4 h-4 border-2 border-white border-t-transparent rounded-full"
                  />
                  {t('addProduct.addingProduct')}
                </>
              ) : (
                <>
                  <motion.div
                    transition={{ duration: 0.2 }}
                  >
                    <Package size={18} />
                  </motion.div>
                  {t('addProduct.addProductRecipe')}
                </>
              )}
            </motion.button>

            <motion.button
              whileTap={{ scale: 0.98 }}
              type="button"
              onClick={() => navigate('/products')}
              disabled={loading}
              className="px-6 py-3 bg-slate-700 hover:bg-slate-600 disabled:bg-slate-800 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors"
            >
              Cancel
            </motion.button>
          </motion.div>
        </form>
      </div>
    </div>
  );
};

export default AddProd;