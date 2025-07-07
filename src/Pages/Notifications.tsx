import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    BellRing,
    AlertTriangle,
    Package,
    Warehouse,
    RefreshCw,
    CheckCircle
} from 'lucide-react';
import { useNotifications } from './context/NotificationContext';
import {useI18n} from './context/I18nContext';
interface RawMaterial {
    id: number;
    name: string;
    quantity: number;
    unit_price: number;
    threshold: number;
    vendor: string;
    v_id: number;
}

interface Product {
    id: number;
    name: string;
    quantity: number;
    threshold: number;
    unit_price: number;
}

const Notifications = () => {
    const [lowStockRawMaterials, setLowStockRawMaterials] = useState<RawMaterial[]>([]);
    const [lowStockProducts, setLowStockProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeFilter, setActiveFilter] = useState<'all' | 'rawmaterials' | 'products'>('all');
    const { clearNotifications } = useNotifications();
    const navigate = useNavigate();

    // Animation configuration - easily adjustable
    const animationConfig = {
        // Page transitions
        pageTransition: { duration: 0.3, ease: "easeOut" },
        
        // Item animations
        itemEntry: { duration: 0.25, ease: "easeOut" },
        itemHover: { duration: 0.15, ease: "easeOut" },
        itemTap: { duration: 0.1, ease: "easeOut" },
        
        // Loading animations
        spinner: { duration: 0.6, ease: "linear" },
        
        // Micro-interactions
        buttonHover: { duration: 0.12, ease: "easeOut" },
        iconWiggle: { duration: 1.2, ease: "easeInOut" },
        
        // Filter transitions
        filterTransition: { duration: 0.2, ease: "easeInOut" },
        
        // Stagger delays
        staggerDelay: 0.03, // Reduced from 0.05
    };

    const fetchLowStockItems = async () => {
        setLoading(true);
        try {
            // Fetch raw materials
            const rawMaterials = await Promise;
            const lowRawMaterials = rawMaterials.filter(rm => rm.quantity <= rm.threshold);
            setLowStockRawMaterials(lowRawMaterials);

            // Fetch products
            const products = await Promise;
            const lowProducts = products.filter(p => p.quantity <= p.threshold);
            setLowStockProducts(lowProducts);

            // Clear notifications after viewing
            clearNotifications();
        } catch (error) {
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLowStockItems();
    }, []);
    const { t } = useI18n();

    const getStockLevel = useCallback((quantity: number, threshold: number) => {
        const percentage = (quantity / threshold) * 100;
        if (quantity === 0) return { level: t('notifications.outOfStock'), color: 'text-red-500', bgColor: '-900/20' };
        if (percentage <= 50) return { level: t('notifications.critical'), color: 'text-red-400', bgColor: 'bg-red-900/20' };
        if (percentage <= 100) return { level: t('notifications.low'), color: 'text-yellow-400', bgColor: 'bg-yellow-900/20' };
        return { level: t('notifications.normal'), color: 'text-green-400', bgColor: 'bg-green-900/20' };
    }, []);

    const handleProductClick = useCallback((product: Product) => {
        navigate('/ProdDetails', { state: { ...product } });
    }, [navigate]);

    const handleRawMaterialClick = useCallback((rawMaterial: RawMaterial) => {
        navigate('/RawDetails', { state: { ...rawMaterial } });
    }, [navigate]);

    const getFilteredItems = () => {
        switch (activeFilter) {
            case 'rawmaterials':
                return lowStockRawMaterials.map(item => ({ ...item, type: 'rawmaterial' as const }));
            case 'products':
                return lowStockProducts.map(item => ({ ...item, type: 'product' as const }));
            default:
                return [
                    ...lowStockRawMaterials.map(item => ({ ...item, type: 'rawmaterial' as const })),
                    ...lowStockProducts.map(item => ({ ...item, type: 'product' as const }))
                ];
        }
    };

    const filteredItems = getFilteredItems();
    const totalNotifications = lowStockRawMaterials.length + lowStockProducts.length;

    const FilterTab = ({ 
        label, 
        count, 
        isActive, 
        onClick 
    }: { 
        filter: string; 
        label: string; 
        count: number; 
        isActive: boolean; 
        onClick: () => void; 
    }) => (
        <motion.button
            onClick={onClick}
            className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                isActive
                    ? 'bg-blue-700 text-white shadow-lg'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            transition={animationConfig.buttonHover}
        >
            {label} ({count})
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
                    {t('notifications.loading')}
                </motion.div>
            </div>
        );
    }

    return (
        <motion.div 
            className="flex flex-col gap-8 mx-auto py-6 pb-5 px-1 lg:px-2 xl:px-4 max-w-7xl"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={animationConfig.pageTransition}
        >
            {/* Header */}
            <motion.div 
                className="flex items-center justify-between"
                initial={{ y: -20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ ...animationConfig.pageTransition, delay: 0.05 }}
            >
                <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                    <motion.div
                        animate={{ 
                            rotate: [0, 15, -15, 0],
                            scale: totalNotifications > 0 ? [1, 1.1, 1] : 1
                        }}
                        transition={{ 
                            duration: animationConfig.iconWiggle.duration,
                            repeat: totalNotifications > 0 ? Infinity : 0,
                            ease: animationConfig.iconWiggle.ease
                        }}
                    >
                        <BellRing className="text-red-400" size={32} />
                    </motion.div>
                    {t('notifications.title')}
                </h1>

                <motion.button
                    onClick={fetchLowStockItems}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    transition={animationConfig.buttonHover}
                >
                    <motion.div
                        animate={{ rotate: loading ? 360 : 0 }}
                        transition={{ 
                            duration: animationConfig.spinner.duration, 
                            repeat: loading ? Infinity : 0, 
                            ease: animationConfig.spinner.ease 
                        }}
                    >
                        <RefreshCw size={16} />
                    </motion.div>
                    {t('notifications.refresh')}
                </motion.button>
            </motion.div>

            {/* Filter Tabs */}
            <motion.div 
                className="flex gap-4"
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ ...animationConfig.pageTransition, delay: 0.1 }}
            >
                <FilterTab
                    filter="all"
                    label={t('notifications.allItems')}
                    count={totalNotifications}
                    isActive={activeFilter === 'all'}
                    onClick={() => setActiveFilter('all')}
                />
                <FilterTab
                    filter="rawmaterials"
                    label={t('notifications.rawMaterials')}
                    count={lowStockRawMaterials.length}
                    isActive={activeFilter === 'rawmaterials'}
                    onClick={() => setActiveFilter('rawmaterials')}
                />
                <FilterTab
                    filter="products"
                    label="Products"
                    count={lowStockProducts.length}
                    isActive={activeFilter === 'products'}
                    onClick={() => setActiveFilter('products')}
                />
            </motion.div>

            {totalNotifications === 0 ? (
                <motion.div 
                    className="bg-slate-900 p-12 rounded-xl border border-slate-700 text-center"
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ ...animationConfig.pageTransition, delay: 0.15 }}
                >
                    <motion.div
                        animate={{ 
                            scale: [1, 1.1, 1],
                            rotate: [0, 10, -10, 0]
                        }}
                        transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                    >
                        <CheckCircle className="mx-auto mb-4 text-green-400" size={64} />
                    </motion.div>
                    <h2 className="text-2xl font-bold text-white mb-2">{t('notifications.allClear')}</h2>
                    <p className="text-slate-400">{t('noLowStockAlerts')}</p>
                </motion.div>
            ) : (
                <motion.div 
                    className="space-y-4"
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ ...animationConfig.pageTransition, delay: 0.15 }}
                >
                    <AnimatePresence mode="wait">
                        {filteredItems.map((item, index) => {
                            const stockInfo = getStockLevel(item.quantity, item.threshold);
                            const isRawMaterial = item.type === 'rawmaterial';
                            
                            return (
                                <motion.div
                                    key={`${item.type}-${item.id}`}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: 20 }}
                                    transition={{ 
                                        ...animationConfig.itemEntry,
                                        delay: index * animationConfig.staggerDelay,
                                        ...animationConfig.itemHover,
                                        layout: { duration: 0.2 }
                                    }}
                                    onClick={() => {
                                        if (isRawMaterial) {
                                            handleRawMaterialClick(item as RawMaterial);
                                        } else {
                                            handleProductClick(item as Product);
                                        }
                                    }}
                                    className={`p-4 rounded-lg border ${stockInfo.bgColor} border-slate-600 hover:border-slate-500 transition-all duration-200 cursor-pointer bg-red-500`}
                                    whileHover={{ 
                                        scale: 1.01, 
                                        y: -2,
                                        boxShadow: "0 8px 20px rgba(0,0,0,0.3)"
                                    }}
                                    whileTap={{ scale: 0.99 }}
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-4">
                                            <motion.div
                                                animate={{ 
                                                    rotate: [0, 5, -5, 0],
                                                    scale: stockInfo.level === 'Out of Stock' ? [1, 1.1, 1] : 1
                                                }}
                                                transition={{ 
                                                    duration: stockInfo.level === 'Out of Stock' ? 0.8 : animationConfig.iconWiggle.duration,
                                                    repeat: stockInfo.level === 'Out of Stock' ? Infinity : 0,
                                                    ease: animationConfig.iconWiggle.ease
                                                }}
                                            >
                                                {isRawMaterial ? (
                                                    <Warehouse className="text-orange-400" size={24} />
                                                ) : (
                                                    <Package className="text-blue-400" size={24} />
                                                )}
                                            </motion.div>
                                            
                                            <div>
                                                <h3 className="font-semibold text-white text-lg">{item.name}</h3>
                                                <p className="text-sm text-slate-400">
                                                    {isRawMaterial 
                                                        ? t('vendor')+`: ${(item as RawMaterial).vendor}`
                                                        : t('unitPrice')+`: $${(item as Product).unit_price.toFixed(2)} DA`
                                                    }
                                                </p>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <span className={`text-xs px-2 py-1 rounded ${stockInfo.bgColor} ${stockInfo.color}`}>
                                                        {isRawMaterial ? t('productDetails.rawMaterial'): t('Product')}
                                                    </span>
                                                    <motion.div
                                                        animate={{ 
                                                            rotate: [0, 5, -5, 0],
                                                            scale: stockInfo.level === 'Critical' ? [1, 1.1, 1] : 1
                                                        }}
                                                        transition={{ 
                                                            duration: stockInfo.level === 'Critical' ? 1 : 2,
                                                            repeat: stockInfo.level === 'Critical' ? Infinity : 0
                                                        }}
                                                    >
                                                        <AlertTriangle className={stockInfo.color} size={16} />
                                                    </motion.div>
                                                </div>
                                            </div>
                                        </div>
                                        
                                        <div className="text-right">
                                            <motion.div 
                                                className={`text-xl font-bold ${stockInfo.color}`}
                                                animate={stockInfo.level === 'Critical' ? { 
                                                    color: ['#f87171', '#dc2626', '#f87171']
                                                } : {}}
                                                transition={{ duration: 1, repeat: Infinity, ease: "easeInOut" }}
                                            >
                                                {item.quantity}/{item.threshold}
                                            </motion.div>
                                            <div className={`text-sm font-medium ${stockInfo.color}`}>
                                                {stockInfo.level === 'Critical' ? t('critical'): t('notifications.outOfStock')}
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            );
                        })}
                    </AnimatePresence>
                </motion.div>
            )}
        </motion.div>
    );
};

export default Notifications;