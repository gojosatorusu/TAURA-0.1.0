import { useState, useEffect } from 'react';
import { invoke } from "@tauri-apps/api/core";
import {
  History as HistoryIcon,
  Search,
  Calendar,
  Package,
  ShoppingCart,
  Users,
  PiggyBank,
  Warehouse,
  ChevronDown,
  ChevronRight,
  RefreshCw,
  Plus,
  Minus,
  Edit,
  ChevronLeft,
  CreditCard,
  Receipt,
  FileText
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useMessage } from './context/Message';
import { useI18n } from './context/I18nContext';

interface ActivityLog {
  id: number;
  translation_key: string;
  parameters: string; // JSON string of parameters
  old_state?: string; // JSON string of old state (optional)
  new_state?: string; // JSON string of new state (optional)
  timestamp: string;
  category: 'product' | 'raw_material' | 'vendor' | 'treasury' | 'client' | 'sale' | 'purchase';
}

interface RecipeItem {
  raw_material_id: number;
  raw_material_name: string;
  quantity: number;
}

interface SaleItem {
  product_id: number;
  product_name: string;
  quantity: number;
  unit_price: number;
}

interface PurchaseItem {
  product_id?: number;
  raw_material_id?: number;
  name: string;
  quantity: number;
  unit_price: number;
}

interface Versement {
  number: number;
  amount: number;
  date: string;
}

const History = () => {

  const { t } = useI18n();
  const { addToast } = useMessage();

  // State management
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [expandedLogId, setExpandedLogId] = useState<number | null>(null);
  const [isChangingPage, setIsChangingPage] = useState(false);

  const itemsPerPage = 20;

  // Category icons mapping
  const categoryIcons = {
    product: ShoppingCart,
    raw_material: Warehouse,
    client: Users,
    vendor: Users,
    sale: Receipt,
    purchase: Receipt,
    treasury: PiggyBank,
  };

  // Category colors mapping
  const categoryColors = {
    product: 'text-blue-500',
    raw_material: 'text-green-500',
    vendor: 'text-purple-500',
    sale: 'text-orange-500',
    purchase: 'text-cyan-500',
    client: 'text-rose-500',
    treasury: 'text-rose-500',

  };

  // Fetch logs from backend
  const fetchLogs = async () => {
    try {
      setLoading(true);
      const result = await invoke('get_activity_logs');
      const logsList = result as ActivityLog[];
      setLogs(logsList);
      setFilteredLogs(logsList);
    } catch (error) {
      console.error('Error fetching activity logs:', error);
      addToast({
        message: t('history.errorFetching'),
        type: 'error',
        duration: 3000,
      });
    } finally {
      setLoading(false);
    }
  };

  // Filter logs based on search, category, and date
  const applyFilters = () => {
    let filtered = [...logs];

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(log => {
        const params = JSON.parse(log.parameters || '{}');
        const translatedText = t(log.translation_key, params);
        return translatedText.toLowerCase().includes(searchTerm.toLowerCase());
      });
    }

    // Category filter
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(log => log.category === selectedCategory);
    }

    // Date filter
    if (dateFilter !== 'all') {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

      filtered = filtered.filter(log => {
        const logDate = new Date(log.timestamp);

        switch (dateFilter) {
          case 'today':
            return logDate >= today;
          case 'week':
            const weekAgo = new Date(today);
            weekAgo.setDate(weekAgo.getDate() - 7);
            return logDate >= weekAgo;
          case 'month':
            const monthAgo = new Date(today);
            monthAgo.setMonth(monthAgo.getMonth() - 1);
            return logDate >= monthAgo;
          default:
            return true;
        }
      });
    }

    setFilteredLogs(filtered);
    setCurrentPage(1);
  };

  // Effects
  useEffect(() => {
    fetchLogs();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [searchTerm, selectedCategory, dateFilter, logs]);

  const totalPages = Math.ceil(filteredLogs.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedLogs = filteredLogs.slice(startIndex, startIndex + itemsPerPage);
  interface HandlePageChangeFn {
    (newPage: number): void;
  }

  const handlePageChange: HandlePageChangeFn = (newPage) => {
    if (newPage === currentPage) return;

    setIsChangingPage(true);
    setTimeout(() => {
      setCurrentPage(newPage);
      setIsChangingPage(false);
    }, 150);
  };

  // Format timestamp
  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return {
      date: date.toLocaleDateString(),
      time: date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
  };

  // Get translated operation text with parameters
  const getOperationText = (log: ActivityLog) => {
    try {
      const params = JSON.parse(log.parameters || '{}');
      return t(log.translation_key, params);
    } catch (error) {
      console.error('Error parsing log parameters:', error);
      return log.translation_key;
    }
  };

  // Compare two arrays and return changes
  const compareArrays = (oldArray: any[], newArray: any[], keyField: string) => {
    const changes: {
      item: any;
      type: 'added' | 'removed' | 'modified';
      oldItem?: any;
      newItem?: any;
    }[] = [];

    const oldMap = new Map(oldArray?.map(item => [item[keyField], item]) || []);
    const newMap = new Map(newArray?.map(item => [item[keyField], item]) || []);

    // Check for removed items
    oldMap.forEach((item, key) => {
      if (!newMap.has(key)) {
        changes.push({ item, type: 'removed' });
      }
    });

    // Check for added and modified items
    newMap.forEach((newItem, key) => {
      const oldItem = oldMap.get(key);
      if (!oldItem) {
        changes.push({ item: newItem, type: 'added' });
      } else if (JSON.stringify(oldItem) !== JSON.stringify(newItem)) {
        changes.push({
          item: newItem,
          type: 'modified',
          oldItem,
          newItem
        });
      }
    });

    return changes;
  };

  // Compare two objects and return diff info
  const compareObjects = (oldObj: any, newObj: any) => {
    const changes: { key: string; oldValue: any; newValue: any; type: 'added' | 'removed' | 'modified' }[] = [];
    const allKeys = new Set([...Object.keys(oldObj || {}), ...Object.keys(newObj || {})]);

    allKeys.forEach(key => {
      const oldValue = oldObj?.[key];
      const newValue = newObj?.[key];

      if (oldValue === undefined && newValue !== undefined) {
        changes.push({ key, oldValue, newValue, type: 'added' });
      } else if (oldValue !== undefined && newValue === undefined) {
        changes.push({ key, oldValue, newValue, type: 'removed' });
      } else if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
        changes.push({ key, oldValue, newValue, type: 'modified' });
      }
    });

    return changes;
  };

  // Compare recipes specifically
  const compareRecipes = (oldRecipe: RecipeItem[], newRecipe: RecipeItem[]) => {
    const changes: {
      item: RecipeItem;
      type: 'added' | 'removed' | 'modified';
      oldQuantity?: number;
      newQuantity?: number;
    }[] = [];

    const oldMap = new Map(oldRecipe?.map(item => [item.raw_material_id, item]) || []);
    const newMap = new Map(newRecipe?.map(item => [item.raw_material_id, item]) || []);

    // Check for removed items
    oldMap.forEach((item, id) => {
      if (!newMap.has(id)) {
        changes.push({ item, type: 'removed' });
      }
    });

    // Check for added and modified items
    newMap.forEach((newItem, id) => {
      const oldItem = oldMap.get(id);
      if (!oldItem) {
        changes.push({ item: newItem, type: 'added' });
      } else if (oldItem.quantity !== newItem.quantity) {
        changes.push({
          item: newItem,
          type: 'modified',
          oldQuantity: oldItem.quantity,
          newQuantity: newItem.quantity
        });
      }
    });

    return changes;
  };

  // Render detailed view for expanded log
  const renderDetailedView = (log: ActivityLog) => {
    const hasOldState = log.old_state;
    const hasNewState = log.new_state;

    if (!hasOldState && !hasNewState) return null;

    try {
      const oldState = hasOldState ? JSON.parse(log.old_state!) : null;
      const newState = hasNewState ? JSON.parse(log.new_state!) : null;

      // Special handling for different categories
      if (log.category === 'product') {
        return renderProductDetails(oldState, newState);
      } else if (log.category === 'sale') {
        return renderSaleDetails(oldState, newState);
      } else if (log.category === 'purchase') {
        return renderPurchaseDetails(oldState, newState);
      } else if (log.category === 'raw_material') {
        return renderRawDetails(oldState, newState);
      } else if (log.category === 'client') {
        return renderClientDetails(oldState, newState);
      } else if (log.category === 'vendor') {
        return renderVendorDetails(oldState, newState);
      } else if (log.category === 'treasury') {
        return renderTreasuryDetails(oldState, newState);
      }else if (log.category === 'client') {
        return renderClientDetails(oldState, newState);
      }

      // Generic state comparison for other categories
      return renderGenericDetails(oldState, newState);
    } catch (error) {
      console.error('Error parsing state data:', error);
      return (
        <div className="text-rose-800 text-sm">
          Error parsing detail data
        </div>
      );
    }
  };

  // Render sale-specific details
  const renderSaleDetails = (oldState: any, newState: any) => {
    const hasComparison = oldState && newState;

    return (
      <div className="space-y-4">
        {/* Sale Info Changes */}
        {hasComparison && (
          <div>
            <h4 className="text-white font-semibold mb-3 flex items-center gap-2">
              <Edit size={16} />
              {t('saleInformation')}
            </h4>
            {renderBasicInfoComparison(oldState, newState, ['items', 'versements'])}
          </div>
        )}

        {/* Sale Items Changes */}
        {(oldState?.items || newState?.items) && (
          <div>
            <h4 className="text-white font-semibold mb-3 flex items-center gap-2">
              <Receipt size={16} />
              {t('sales.saleItems')}
            </h4>
            {hasComparison ? (
              renderSaleItemsComparison(oldState?.items, newState?.items)
            ) : (
              renderSingleSaleItems(oldState?.items || newState?.items, !oldState ? 'added' : 'removed')
            )}
          </div>
        )}

        {/* Versements Changes */}
        {(oldState?.versements || newState?.versements) && (
          <div>
            <h4 className="text-white font-semibold mb-3 flex items-center gap-2">
              <CreditCard size={16} />
              {t('payment')}
            </h4>
            {hasComparison ? (
              renderVersementsComparison(oldState?.versements, newState?.versements)
            ) : (
              renderSingleVersements(oldState?.versements || newState?.versements, !oldState ? 'added' : 'removed')
            )}
          </div>
        )}

        {/* Single state display for creation/deletion */}
        {!hasComparison && (
          <div>
            <h4 className="text-white font-semibold mb-3 flex items-center gap-2">
              <FileText size={16} />
              {t('Details')}
            </h4>
            {renderSingleStateDetails(oldState || newState, !oldState ? 'added' : 'removed')}
          </div>
        )}
      </div>
    );
  };

  // Render purchase-specific details
  const renderPurchaseDetails = (oldState: any, newState: any) => {
    const hasComparison = oldState && newState;

    return (
      <div className="space-y-4">
        {/* Purchase Info Changes */}
        {hasComparison && (
          <div>
            <h4 className="text-white font-semibold mb-3 flex items-center gap-2">
              <Edit size={16} />
              {t('purchaseInformation')}
            </h4>
            {renderBasicInfoComparison(oldState, newState, ['items', 'versements'])}
          </div>
        )}

        {/* Purchase Items Changes */}
        {(oldState?.items || newState?.items) && (
          <div>
            <h4 className="text-white font-semibold mb-3 flex items-center gap-2">
              <ShoppingCart size={16} />
              Purchase Items
            </h4>
            {hasComparison ? (
              renderPurchaseItemsComparison(oldState?.items, newState?.items) // ✅ Fixed!
            ) : (
              renderSinglePurchaseItems(oldState?.items || newState?.items, !oldState ? 'added' : 'removed') // ✅ Fixed!
            )}
          </div>
        )}
        {(oldState?.versements || newState?.versements) && (
          <div>
            <h4 className="text-white font-semibold mb-3 flex items-center gap-2">
              <CreditCard size={16} />
              Payment Installments
            </h4>
            {hasComparison ? (
              renderVersementsComparison(oldState?.versements, newState?.versements)
            ) : (
              renderSingleVersements(oldState?.versements || newState?.versements, !oldState ? 'added' : 'removed')
            )}
          </div>
        )}

        {/* Single state display for creation/deletion */}
        {!hasComparison && (
          <div>
            <h4 className="text-white font-semibold mb-3 flex items-center gap-2">
              <FileText size={16} />
              {t('Details')}
            </h4>
            {renderSingleStateDetails(oldState || newState, !oldState ? 'added' : 'removed')}
          </div>
        )}
      </div>
    );
  };

  // Render basic info comparison (excluding complex objects)
  const renderBasicInfoComparison = (oldState: any, newState: any, excludeKeys: string[] = []) => {
    const filteredOldState = Object.fromEntries(
      Object.entries(oldState || {}).filter(([key]) => !excludeKeys.includes(key))
    );
    const filteredNewState = Object.fromEntries(
      Object.entries(newState || {}).filter(([key]) => !excludeKeys.includes(key))
    );

    const changes = compareObjects(filteredOldState, filteredNewState);

    if (changes.length === 0) {
      return (
        <div className="text-slate-400 text-sm text-center py-2">
          {t('nobasic')}
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Before */}
        <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-3">
          <h5 className="text-red-400 font-medium mb-2 text-sm">{t('before')}</h5>
          <div className="space-y-1 text-xs">
            {Object.entries(filteredOldState).map(([key, value]) => (
              <div key={key} className="flex justify-between">
                <span className="text-red-300 capitalize">{key.replace('_', ' ')}:</span>
                <span className="text-red-100">{String(value)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* After */}
        <div className="bg-green-900/20 border border-green-500/30 rounded-lg p-3">
          <h5 className="text-green-400 font-medium mb-2 text-sm">{t('after')}</h5>
          <div className="space-y-1 text-xs">
            {Object.entries(filteredNewState).map(([key, value]) => (
              <div key={key} className="flex justify-between">
                <span className="text-green-300 capitalize">{key.replace('_', ' ')}:</span>
                <span className="text-green-100">{String(value)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  // Render sale items comparison
  const renderSaleItemsComparison = (oldItems: SaleItem[], newItems: SaleItem[]) => {
    const changes = compareArrays(oldItems || [], newItems || [], 'product_id');

    if (changes.length === 0) {
      return (
        <div className="text-slate-400 text-sm text-center py-2">
          {t('nosale')}
        </div>
      );
    }

    return (
      <div className="space-y-2">
        {changes.map((change, index) => (
          <div
            key={index}
            className={`p-3 rounded-lg text-sm ${change.type === 'added'
              ? 'bg-green-900/20 border border-green-500/30'
              : change.type === 'removed'
                ? 'bg-red-900/20 border border-red-500/30'
                : 'bg-yellow-900/20 border border-yellow-500/30'
              }`}
          >
            <div className="flex items-center gap-2 mb-2">
              {change.type === 'added' && <Plus size={14} className="text-green-400" />}
              {change.type === 'removed' && <Minus size={14} className="text-red-400" />}
              {change.type === 'modified' && <Edit size={14} className="text-yellow-400" />}
              <span className={`font-medium ${change.type === 'added'
                ? 'text-green-200'
                : change.type === 'removed'
                  ? 'text-red-200'
                  : 'text-yellow-200'
                }`}>
                {change.item.product_name}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs">
              <div className="space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-400">Quantity:</span>
                  <span className={
                    change.type === 'added'
                      ? 'text-green-300'
                      : change.type === 'removed'
                        ? 'text-red-300'
                        : 'text-yellow-300'
                  }>
                    {change.type === 'modified' && change.oldItem ?
                      `${change.oldItem.quantity} → ${change.item.quantity}` :
                      change.item.quantity
                    }
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Unit Price:</span>
                  <span className={
                    change.type === 'added'
                      ? 'text-green-300'
                      : change.type === 'removed'
                        ? 'text-red-300'
                        : 'text-yellow-300'
                  }>
                    ${change.type === 'modified' && change.oldItem ?
                      `${change.oldItem.unit_price} → ${change.item.unit_price}` :
                      change.item.unit_price
                    }
                  </span>
                </div>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Total:</span>
                <span className={`font-medium ${change.type === 'added'
                  ? 'text-green-300'
                  : change.type === 'removed'
                    ? 'text-red-300'
                    : 'text-yellow-300'
                  }`}>
                  ${(change.item.quantity * change.item.unit_price).toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  // Render purchase items comparison
  const renderPurchaseItemsComparison = (oldItems: PurchaseItem[], newItems: PurchaseItem[]) => {
    const changes = compareArrays(oldItems || [], newItems || [], 'product_id');

    if (changes.length === 0) {
      return (
        <div className="text-slate-400 text-sm text-center py-2">
          {t('noPurchase')}
        </div>
      );
    }

    return (
      <div className="space-y-2">
        {changes.map((change, index) => (
          <div
            key={index}
            className={`p-3 rounded-lg text-sm ${change.type === 'added'
              ? 'bg-green-900/20 border border-green-500/30'
              : change.type === 'removed'
                ? 'bg-red-900/20 border border-red-500/30'
                : 'bg-yellow-900/20 border border-yellow-500/30'
              }`}
          >
            <div className="flex items-center gap-2 mb-2">
              {change.type === 'added' && <Plus size={14} className="text-green-400" />}
              {change.type === 'removed' && <Minus size={14} className="text-red-400" />}
              {change.type === 'modified' && <Edit size={14} className="text-yellow-400" />}
              <span className={`font-medium ${change.type === 'added'
                ? 'text-green-200'
                : change.type === 'removed'
                  ? 'text-red-200'
                  : 'text-yellow-200'
                }`}>
                {change.item.name}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs">
              <div className="space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-400">Quantity:</span>
                  <span className={
                    change.type === 'added'
                      ? 'text-green-300'
                      : change.type === 'removed'
                        ? 'text-red-300'
                        : 'text-yellow-300'
                  }>
                    {change.type === 'modified' && change.oldItem ?
                      `${change.oldItem.quantity} → ${change.item.quantity}` :
                      change.item.quantity
                    }
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Unit Price:</span>
                  <span className={
                    change.type === 'added'
                      ? 'text-green-300'
                      : change.type === 'removed'
                        ? 'text-red-300'
                        : 'text-yellow-300'
                  }>
                    ${change.type === 'modified' && change.oldItem ?
                      `${change.oldItem.unit_price} → ${change.item.unit_price}` :
                      change.item.unit_price
                    }
                  </span>
                </div>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Total:</span>
                <span className={`font-medium ${change.type === 'added'
                  ? 'text-green-300'
                  : change.type === 'removed'
                    ? 'text-red-300'
                    : 'text-yellow-300'
                  }`}>
                  ${(change.item.quantity * change.item.unit_price).toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  // Render versements comparison
  const renderVersementsComparison = (oldVersements: Versement[], newVersements: Versement[]) => {
    const changes = compareArrays(oldVersements || [], newVersements || [], 'number');

    if (changes.length === 0) {
      return (
        <div className="text-slate-400 text-sm text-center py-2">
          {t('noPayment')}
        </div>
      );
    }

    return (
      <div className="space-y-2">
        {changes.map((change, index) => (
          <div
            key={index}
            className={`p-3 rounded-lg text-sm ${change.type === 'added'
              ? 'bg-green-900/20 border border-green-500/30'
              : change.type === 'removed'
                ? 'bg-red-900/20 border border-red-500/30'
                : 'bg-yellow-900/20 border border-yellow-500/30'
              }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {change.type === 'added' && <Plus size={14} className="text-green-400" />}
                {change.type === 'removed' && <Minus size={14} className="text-red-400" />}
                {change.type === 'modified' && <Edit size={14} className="text-yellow-400" />}
                <span className={`font-medium ${change.type === 'added'
                  ? 'text-green-200'
                  : change.type === 'removed'
                    ? 'text-red-200'
                    : 'text-yellow-200'
                  }`}>
                  {t('payment')} #{change.item.number}
                </span>
              </div>
              <div className="text-right">
                <div className={`font-medium ${change.type === 'added'
                  ? 'text-green-300'
                  : change.type === 'removed'
                    ? 'text-red-300'
                    : 'text-yellow-300'
                  }`}>
                  ${change.type === 'modified' && change.oldItem ?
                    `${change.oldItem.amount} → ${change.item.amount}` :
                    change.item.amount
                  }
                </div>
                <div className="text-xs text-slate-400">
                  {change.type === 'modified' && change.oldItem ?
                    `${change.oldItem.date} → ${change.item.date}` :
                    change.item.date
                  }
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  // Render single sale items (for creation/deletion)
  const renderSingleSaleItems = (items: SaleItem[], type: 'added' | 'removed') => {
    const colorClass = type === 'added' ? 'bg-green-900/20 border-green-500/30' : 'bg-red-900/20 border-red-500/30';
    const textColor = type === 'added' ? 'text-green-200' : 'text-red-200';
    const Icon = type === 'added' ? Plus : Minus;

    return (
      <div className={`border rounded-lg p-3 ${colorClass}`}>
        <div className="space-y-3">
          {items?.map((item, index) => (
            <div key={index} className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <Icon size={14} className={type === 'added' ? 'text-green-400' : 'text-red-400'} />
                <span className={textColor}>{item.product_name}</span>
              </div>
              <div className="text-right">
                <div className={textColor}>Qty: {item.quantity} × ${item.unit_price}</div>
                <div className={`font-medium ${textColor}`}>${(item.quantity * item.unit_price).toFixed(2)}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Render single purchase items (for creation/deletion)
  const renderSinglePurchaseItems = (items: PurchaseItem[], type: 'added' | 'removed') => {
    const colorClass = type === 'added' ? 'bg-green-900/20 border-green-500/30' : 'bg-red-900/20 border-red-500/30';
    const textColor = type === 'added' ? 'text-green-200' : 'text-red-200';
    const Icon = type === 'added' ? Plus : Minus;

    return (
      <div className={`border rounded-lg p-3 ${colorClass}`}>
        <div className="space-y-3">
          {items?.map((item, index) => (
            <div key={index} className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <Icon size={14} className={type === 'added' ? 'text-green-400' : 'text-red-400'} />
                <span className={textColor}>{item.name}</span>
              </div>
              <div className="text-right">
                <div className={textColor}>Qty: {item.quantity} × ${item.unit_price}</div>
                <div className={`font-medium ${textColor}`}>${(item.quantity * item.unit_price).toFixed(2)}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Render single versements (for creation/deletion)
  const renderSingleVersements = (versements: Versement[], type: 'added' | 'removed') => {
    const colorClass = type === 'added' ? 'bg-green-900/20 border-green-500/30' : 'bg-red-900/20 border-red-500/30';
    const textColor = type === 'added' ? 'text-green-200' : 'text-red-200';
    const Icon = type === 'added' ? Plus : Minus;

    return (
      <div className={`border rounded-lg p-3 ${colorClass}`}>
        <div className="space-y-2">
          {versements?.map((versement, index) => (
            <div key={index} className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <Icon size={14} className={type === 'added' ? 'text-green-400' : 'text-red-400'} />
                <span className={textColor}>{t('payment')} #{versement.number}</span>
              </div>
              <div className="text-right">
                <div className={`font-medium ${textColor}`}>${versement.amount}</div>
                <div className="text-xs text-slate-400">{versement.date}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Render single state details (for creation/deletion)
  const renderSingleStateDetails = (state: any, type: 'added' | 'removed') => {
    const colorClass = type === 'added' ? 'bg-green-900/20 border-green-500/30' : 'bg-red-900/20 border-red-500/30';
    const textColor = type === 'added' ? 'text-green-200' : 'text-red-200';
    const Icon = type === 'added' ? Plus : Minus;

    // Filter out complex objects for basic info display
    const basicInfo = Object.fromEntries(
      Object.entries(state || {}).filter(([key, value]) =>
        !['items', 'versements'].includes(key) && typeof value !== 'object'
      )
    );

    return (
      <div className={`border rounded-lg p-3 ${colorClass}`}>
        <div className="space-y-2">
          {Object.entries(basicInfo).map(([key, value]) => (
            <div key={key} className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <Icon size={14} className={type === 'added' ? 'text-green-400' : 'text-red-400'} />
                <span className="text-slate-400 capitalize">{key.replace('_', ' ')}:</span>
              </div>
              <span className={textColor}>{String(value)}</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Render product-specific details
  const renderProductDetails = (oldState: any, newState: any) => {
    const hasComparison = oldState && newState;

    return (
      <div className="space-y-4">
        {/* Product Info Changes */}
        {hasComparison && (
          <div>
            <h4 className="text-white font-semibold mb-3 flex items-center gap-2">
              <Edit size={16} />
              Product Information Changes
            </h4>
            {renderBasicInfoComparison(oldState, newState, ['recipe'])}
          </div>
        )}

        {/* Recipe Changes */}
        {(oldState?.recipe || newState?.recipe) && (
          <div>
            <h4 className="text-white font-semibold mb-3 flex items-center gap-2">
              <Package size={16} />
              {t('recipe')}
            </h4>
            {hasComparison ? (
              renderRecipeComparison(oldState?.recipe, newState?.recipe)
            ) : (
              renderSingleRecipe(oldState?.recipe || newState?.recipe, !oldState ? 'added' : 'removed')
            )}
          </div>
        )}

        {/* Single state display for creation/deletion */}
        {!hasComparison && (
          <div>
            <h4 className="text-white font-semibold mb-3 flex items-center gap-2">
              <FileText size={16} />
              {t('Details')}
            </h4>
            {renderSingleStateDetails(oldState || newState, !oldState ? 'added' : 'removed')}
          </div>
        )}
      </div>
    );
  };

  const renderRawDetails = (oldState: any, newState: any) => {
    const hasComparison = oldState && newState;

    return (
      <div className="space-y-4">
        {/* Product Info Changes */}
        {hasComparison && (
          <div>
            <h4 className="text-white font-semibold mb-3 flex items-center gap-2">
              <Edit size={16} />
              {t('rawInformation')}
            </h4>
            {renderBasicInfoComparison(oldState, newState)}
          </div>
        )}

        {/* Single state display for creation/deletion */}
        {!hasComparison && (
          <div>
            <h4 className="text-white font-semibold mb-3 flex items-center gap-2">
              <FileText size={16} />
              {t('Details')}
            </h4>
            {renderSingleStateDetails(oldState || newState, !oldState ? 'added' : 'removed')}
          </div>
        )}
      </div>
    );
  };

  const renderClientDetails = (oldState: any, newState: any) => {
    const hasComparison = oldState && newState;

    return (
      <div className="space-y-4">
        {/* Product Info Changes */}
        {hasComparison && (
          <div>
            <h4 className="text-white font-semibold mb-3 flex items-center gap-2">
              <Edit size={16} />
              {t('clientInformation')}
            </h4>
            {renderBasicInfoComparison(oldState, newState)}
          </div>
        )}

        {/* Single state display for creation/deletion */}
        {!hasComparison && (
          <div>
            <h4 className="text-white font-semibold mb-3 flex items-center gap-2">
              <FileText size={16} />
              {t('Details')}
            </h4>
            {renderSingleStateDetails(oldState || newState, !oldState ? 'added' : 'removed')}
          </div>
        )}
      </div>
    );
  };
  const renderVendorDetails = (oldState: any, newState: any) => {
    const hasComparison = oldState && newState;

    return (
      <div className="space-y-4">
        {/* Product Info Changes */}
        {hasComparison && (
          <div>
            <h4 className="text-white font-semibold mb-3 flex items-center gap-2">
              <Edit size={16} />
              {t('vendorInformation')}
            </h4>
            {renderBasicInfoComparison(oldState, newState)}
          </div>
        )}

        {/* Single state display for creation/deletion */}
        {!hasComparison && (
          <div>
            <h4 className="text-white font-semibold mb-3 flex items-center gap-2">
              <FileText size={16} />
              {t('Details')}
            </h4>
            {renderSingleStateDetails(oldState || newState, !oldState ? 'added' : 'removed')}
          </div>
        )}
      </div>
    );
  }; const renderTreasuryDetails = (oldState: any, newState: any) => {
    const hasComparison = oldState && newState;

    return (
      <div className="space-y-4">
        {/* Product Info Changes */}
        {hasComparison && (
          <div>
            <h4 className="text-white font-semibold mb-3 flex items-center gap-2">
              <Edit size={16} />
              {t('treasuryInformation')}
            </h4>
            {renderBasicInfoComparison(oldState, newState)}
          </div>
        )}

        {/* Single state display for creation/deletion */}
        {!hasComparison && (
          <div>
            <h4 className="text-white font-semibold mb-3 flex items-center gap-2">
              <FileText size={16} />
              {t('Details')}
            </h4>
            {renderSingleStateDetails(oldState || newState, !oldState ? 'added' : 'removed')}
          </div>
        )}
      </div>
    );
  };

  // Render recipe comparison
  const renderRecipeComparison = (oldRecipe: RecipeItem[], newRecipe: RecipeItem[]) => {
    const changes = compareRecipes(oldRecipe || [], newRecipe || []);

    if (changes.length === 0) {
      return (
        <div className="text-slate-400 text-sm text-center py-2">
          {t('noRecipeChanges')}
        </div>
      );
    }

    return (
      <div className="space-y-2">
        {changes.map((change, index) => (
          <div
            key={index}
            className={`p-3 rounded-lg text-sm ${change.type === 'added'
              ? 'bg-green-900/20 border border-green-500/30'
              : change.type === 'removed'
                ? 'bg-red-900/20 border border-red-500/30'
                : 'bg-yellow-900/20 border border-yellow-500/30'
              }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {change.type === 'added' && <Plus size={14} className="text-green-400" />}
                {change.type === 'removed' && <Minus size={14} className="text-red-400" />}
                {change.type === 'modified' && <Edit size={14} className="text-yellow-400" />}
                <span className={`font-medium ${change.type === 'added'
                  ? 'text-green-200'
                  : change.type === 'removed'
                    ? 'text-red-200'
                    : 'text-yellow-200'
                  }`}>
                  {change.item.raw_material_name}
                </span>
              </div>
              <div className={`text-right font-medium ${change.type === 'added'
                ? 'text-green-300'
                : change.type === 'removed'
                  ? 'text-red-300'
                  : 'text-yellow-300'
                }`}>
                {change.type === 'modified' ?
                  `${change.oldQuantity} → ${change.newQuantity}` :
                  change.item.quantity
                }
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  // Render single recipe (for creation/deletion)
  const renderSingleRecipe = (recipe: RecipeItem[], type: 'added' | 'removed') => {
    const colorClass = type === 'added' ? 'bg-green-900/20 border-green-500/30' : 'bg-red-900/20 border-red-500/30';
    const textColor = type === 'added' ? 'text-green-200' : 'text-red-200';
    const Icon = type === 'added' ? Plus : Minus;

    return (
      <div className={`border rounded-lg p-3 ${colorClass}`}>
        <div className="space-y-2">
          {recipe?.map((item, index) => (
            <div key={index} className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <Icon size={14} className={type === 'added' ? 'text-green-400' : 'text-red-400'} />
                <span className={textColor}>{item.raw_material_name}</span>
              </div>
              <span className={`font-medium ${textColor}`}>{item.quantity}</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Render generic details for other categories
  const renderGenericDetails = (oldState: any, newState: any) => {
    if (!oldState && !newState) return null;

    const hasComparison = oldState && newState;

    if (hasComparison) {
      const changes = compareObjects(oldState, newState);

      if (changes.length === 0) {
        return (
          <div className="text-slate-400 text-sm text-center py-2">
            {t('noChangesDetected')}
          </div>
        );
      }

      return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Before */}
          <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-3">
            <h5 className="text-red-400 font-medium mb-2 text-sm">{t('before')}</h5>
            <div className="space-y-1 text-xs">
              {Object.entries(oldState).map(([key, value]) => (
                <div key={key} className="flex justify-between">
                  <span className="text-red-300 capitalize">{key.replace('_', ' ')}:</span>
                  <span className="text-red-100">{String(value)}</span>
                </div>
              ))}
            </div>
          </div>

          {/* After */}
          <div className="bg-green-900/20 border border-green-500/30 rounded-lg p-3">
            <h5 className="text-green-400 font-medium mb-2 text-sm">{t('after')}</h5>
            <div className="space-y-1 text-xs">
              {Object.entries(newState).map(([key, value]) => (
                <div key={key} className="flex justify-between">
                  <span className="text-green-300 capitalize">{key.replace('_', ' ')}:</span>
                  <span className="text-green-100">{String(value)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      );
    } else {
      // Single state (creation or deletion)
      const state = oldState || newState;
      const type = !oldState ? 'added' : 'removed';

      return renderSingleStateDetails(state, type);
    }
  };

  return (
    <div className="min-h-screen p-4 flex justify-center items-start pt-8">
      <div className="w-full max-w-4xl">
        {/* Main Card Container */}
        <div className="bg-slate-900 rounded-xl shadow-lg border border-slate-700 p-6 space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-3">
                <HistoryIcon size={24} className="text-blue-400" />
                <h1 className="text-2xl font-bold text-white">{t('history.title')}</h1>
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="bg-gradient-to-r from-slate-800/80 to-slate-700/60 backdrop-blur-sm rounded-xl p-6 mb-6 border border-slate-600/50 shadow-lg">
            <div className="flex flex-wrap gap-6 items-center">
              {/* Enhanced Search with better styling */}
              <div className="flex-1 min-w-80">
                <div className="relative group">
                  <Search size={18} className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400 group-focus-within:text-blue-400 transition-colors duration-200" />
                  <input
                    type="text"
                    placeholder={t('history.searchPlaceholder')}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-12 pr-4 py-3.5 bg-slate-700/60 backdrop-blur-sm border border-slate-600/60 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 focus:bg-slate-700/80 transition-all duration-300 text-white placeholder-slate-400 shadow-inner"
                  />
                </div>
              </div>

              {/* Enhanced Category Filter */}
              <div className="relative">
                <select
                  title='category'
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="appearance-none px-6 py-3.5 pr-12 bg-slate-700/60 backdrop-blur-sm border border-slate-600/60 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 focus:bg-slate-700/80 transition-all duration-300 text-white min-w-48 shadow-inner cursor-pointer hover:bg-slate-600/60"
                >
                  <option value="all">{t('history.allCategories')}</option>
                  <option value="product">{t('history.products')}</option>
                  <option value="raw_material">{t('history.rawMaterials')}</option>
                  <option value="sale">{t('sales')}</option>
                  <option value="purchase">{t('purchases')}</option>
                  <option value="payment">{t('history.payments')}</option>
                  <option value="vendor">{t('history.vendors')}</option>
                  <option value="client">Clients</option>
                </select>
                <ChevronDown size={16} className="absolute right-4 top-1/2 transform -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>

              {/* Enhanced Date Filter */}
              <div className="relative">
                <select
                  title='date'
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                  className="appearance-none px-6 py-3.5 pr-12 bg-slate-700/60 backdrop-blur-sm border border-slate-600/60 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 focus:bg-slate-700/80 transition-all duration-300 text-white min-w-40 shadow-inner cursor-pointer hover:bg-slate-600/60"
                >
                  <option value="all">{t('history.allTime')}</option>
                  <option value="today">{t('history.today')}</option>
                  <option value="week">{t('history.thisWeek')}</option>
                  <option value="month">{t('history.thisMonth')}</option>
                </select>
                <Calendar size={16} className="absolute right-4 top-1/2 transform -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>

              {/* Results counter */}
              <div className="flex items-center gap-2 px-4 py-2 bg-slate-600/30 rounded-lg border border-slate-500/30">
                <span className="text-slate-300 text-sm font-medium">
                  {filteredLogs.length} {t('history.result')}
                </span>
              </div>
            </div>
          </div>
          {/* Activity Logs */}
          <div className="space-y-4">
            {loading ? (
              <div className="flex items-center justify-center py-12 bg-slate-800 rounded-lg border border-slate-700">
                <RefreshCw size={24} className="animate-spin text-blue-400" />
                <span className="ml-2 text-slate-300">{t('loading')}</span>
              </div>
            ) : paginatedLogs.length === 0 ? (
              <div className="text-center py-12 bg-slate-800 rounded-lg border border-slate-700">
                <HistoryIcon size={48} className="mx-auto text-slate-600 mb-4" />
                <p className="text-slate-400 text-lg">{t('history.noLogs')}</p>
              </div>
            ) : (
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentPage}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: isChangingPage ? 0.3 : 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.1, ease: "easeInOut" }}
                  className="space-y-4"
                >
                  {paginatedLogs.map((log, index) => {
                    const IconComponent = categoryIcons[log.category] || HistoryIcon;
                    const { date, time } = formatTimestamp(log.timestamp);
                    const isExpanded = expandedLogId === log.id;

                    return (
                      <motion.div
                        key={log.id}
                        initial={{ opacity: 0, y: 20, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -20, scale: 0.95 }}
                        transition={{
                          delay: index * 0.05,
                          duration: 0.1,
                          ease: "easeOut"
                        }}
                        className="group relative"
                      >
                        {/* Subtle gradient background */}
                        <div className="absolute inset-0 bg-gradient-to-r from-slate-800/50 to-slate-700/30 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                        <div className={`relative bg-slate-800/90 backdrop-blur-sm rounded-xl overflow-hidden border transition-all duration-300 ${isExpanded
                          ? 'border-blue-500/50 shadow-lg shadow-blue-500/10'
                          : 'border-slate-700/60 hover:border-slate-600/80 hover:shadow-md'
                          }`}>
                          <div
                            className="p-5 cursor-pointer transition-all duration-200 hover:bg-slate-750/50"
                            onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex items-start gap-4 flex-1">
                                {/* Icon with enhanced styling */}
                                <div className={`flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center transition-colors duration-200 ${isExpanded
                                  ? 'bg-blue-500/20 ring-2 ring-blue-500/30'
                                  : 'bg-slate-700/60 group-hover:bg-slate-600/60'
                                  }`}>
                                  <IconComponent
                                    size={20}
                                    className={`${categoryColors[log.category]} transition-colors duration-200 ${isExpanded ? 'text-blue-400' : ''
                                      }`}
                                  />
                                </div>

                                <div className="flex-1 min-w-0">
                                  {/* Main operation text */}
                                  <p className="font-medium text-white text-base leading-relaxed mb-2 pr-4">
                                    {getOperationText(log)}
                                  </p>

                                  {/* Metadata row with improved spacing and styling */}
                                  <div className="flex items-center gap-6 text-sm">
                                    <div className="flex items-center gap-2 text-slate-300">
                                      <Calendar size={14} className="text-slate-400" />
                                      <span className="font-medium">{date}</span>
                                      <span className="text-slate-400">•</span>
                                      <span className="text-slate-400">{time}</span>
                                    </div>

                                    {/* Enhanced category badge */}
                                    <div className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border transition-colors duration-200 ${categoryColors[log.category] === 'text-blue-500'
                                      ? 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                                      : categoryColors[log.category] === 'text-green-500'
                                        ? 'bg-green-500/10 text-green-400 border-green-500/20'
                                        : categoryColors[log.category] === 'text-purple-500'
                                          ? 'bg-purple-500/10 text-purple-400 border-purple-500/20'
                                          : categoryColors[log.category] === 'text-orange-500'
                                            ? 'bg-orange-500/10 text-orange-400 border-orange-500/20'
                                            : categoryColors[log.category] === 'text-cyan-500'
                                              ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20'
                                              : categoryColors[log.category] === 'text-rose-500'
                                                ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                                                : 'bg-slate-500/10 text-slate-400 border-slate-500/20'
                                      }`}>
                                      {log.category.replace('_', ' ')}
                                    </div>
                                  </div>
                                </div>
                              </div>

                              {/* Expand/Collapse button with improved styling */}
                              <div className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-200 ${isExpanded
                                ? 'bg-blue-500/20 text-blue-400'
                                : 'text-slate-400 hover:bg-slate-700/60 hover:text-slate-300'
                                }`}>
                                <motion.div
                                  animate={{ rotate: isExpanded ? 180 : 0 }}
                                  transition={{ duration: 0.2 }}
                                >
                                  <ChevronDown size={18} />
                                </motion.div>
                              </div>
                            </div>
                          </div>

                          {/* Enhanced Expanded Content */}
                          <AnimatePresence>
                            {isExpanded && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.3, ease: "easeInOut" }}
                                className="border-t border-slate-700/60"
                              >
                                <div className="p-5 bg-gradient-to-br from-slate-850/80 to-slate-800/40 backdrop-blur-sm">
                                  {renderDetailedView(log)}
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      </motion.div>
                    );
                  })}
                </motion.div>
              </AnimatePresence>
            )}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center mt-8">
              <div className="flex items-center gap-2 bg-slate-800/60 backdrop-blur-sm rounded-xl p-2 border border-slate-600/50 shadow-lg">
                {/* Previous Button */}
                <button
                  onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="flex items-center gap-2 px-4 py-2.5 bg-slate-700/60 hover:bg-slate-600/80 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg transition-all duration-200 text-slate-300 hover:text-white disabled:hover:text-slate-300 shadow-sm"
                >
                  <ChevronLeft size={16} />
                  <span className="hidden sm:inline">{t('previous')}</span>
                </button>

                {/* Page Numbers */}
                <div className="flex items-center gap-1 mx-2">
                  {(() => {
                    const pages = [];
                    const showPages = 5;
                    let startPage = Math.max(1, currentPage - Math.floor(showPages / 2));
                    let endPage = Math.min(totalPages, startPage + showPages - 1);

                    if (endPage - startPage + 1 < showPages) {
                      startPage = Math.max(1, endPage - showPages + 1);
                    }

                    // First page + ellipsis
                    if (startPage > 1) {
                      pages.push(
                        <button
                          key={1}
                          onClick={() => handlePageChange(1)}
                          className="w-10 h-10 rounded-lg transition-all duration-200 text-sm font-medium bg-slate-700/60 hover:bg-slate-600/80 text-slate-300 hover:text-white"
                        >
                          1
                        </button>
                      );
                      if (startPage > 2) {
                        pages.push(
                          <span key="ellipsis1" className="px-2 text-slate-500">...</span>
                        );
                      }
                    }

                    // Page numbers
                    for (let i = startPage; i <= endPage; i++) {
                      pages.push(
                        <button
                          key={i}
                          onClick={() => handlePageChange(i)}
                          className={`w-10 h-10 rounded-lg transition-all duration-200 text-sm font-medium ${currentPage === i
                            ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30 ring-2 ring-blue-500/30'
                            : 'bg-slate-700/60 hover:bg-slate-600/80 text-slate-300 hover:text-white'
                            }`}
                        >
                          {i}
                        </button>
                      );
                    }

                    // Ellipsis + last page
                    if (endPage < totalPages) {
                      if (endPage < totalPages - 1) {
                        pages.push(
                          <span key="ellipsis2" className="px-2 text-slate-500">...</span>
                        );
                      }
                      pages.push(
                        <button
                          key={totalPages}
                          onClick={() => handlePageChange(totalPages)}
                          className="w-10 h-10 rounded-lg transition-all duration-200 text-sm font-medium bg-slate-700/60 hover:bg-slate-600/80 text-slate-300 hover:text-white"
                        >
                          {totalPages}
                        </button>
                      );
                    }

                    return pages;
                  })()}
                </div>

                {/* Next Button */}
                <button
                  onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                  className="flex items-center gap-2 px-4 py-2.5 bg-slate-700/60 hover:bg-slate-600/80 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg transition-all duration-200 text-slate-300 hover:text-white disabled:hover:text-slate-300 shadow-sm"
                >
                  <span className="hidden sm:inline">{t('next')}</span>
                  <ChevronRight size={16} />
                </button>
              </div>

              {/* Page info */}
              <div className="ml-4 text-sm text-slate-400">
                {t('history.pageInfo', {
                  current: currentPage,
                  total: totalPages,
                  showing: paginatedLogs.length,
                  total_items: filteredLogs.length
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default History;