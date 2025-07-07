import { useState, useEffect, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useMessage } from './context/Message';
import { DeleteSaleModal, CancelSaleModal, FinalizeSaleModal } from '../Components/Modals';
import { useEdit } from './context/EditContext';
import {
  ArrowLeft,
  Edit3,
  X,
  Save,
  CheckCircle,
  AlertCircle,
  Receipt,
  User,
  Calendar,
  FileText,
  Calculator,
  Plus,
  Trash2,
  AlertTriangle,
  ChevronDown,
  Printer,
  DollarSign,
  CreditCard,
  BookCheck,
  ChevronRight,
  MoreHorizontal
} from 'lucide-react';
import { useI18n } from './context/I18nContext';
// Interfaces
interface Sale {
  id: number;
  c_id: number;
  client: string;
  code: number;
  current_paid: number;
  date: string;
  description: string;
  doc_type: string; // 'BL' or 'Invoice'
  total: number;
  ve_id: number;
  status: string;
  payment_method: string;
  remise: number;
  finalized: number;
}

interface SaleItem {
  p_id: number;
  name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
}

interface Product {
  id: number;
  name: string;
  quantity: number;
  unit_price: number;
}

interface Versement {
  number: number;
  amount: number;
  date: string;
}
interface Ids {
  phone: string,
  location: string;
  rc: string;
  ar: string;
  nif: string;
  nis: string;
}

const SaleDetails = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [sale, setSale] = useState<Sale | null>(location.state);
  const [isExpanded, setIsExpanded] = useState(false);

  // Data states
  const [saleItems, setSaleItems] = useState<SaleItem[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [versements, setVersements] = useState<Versement[]>([]);
  const [originalVersements, setOriginalVersements] = useState<Versement[]>([]);

  // Loading and message states
  const [loadingData, setLoadingData] = useState(true);
  const [loading, setLoading] = useState(false);

  // UI states
  const [showCancelModal, setShowCancelModal] = useState<boolean>(false);
  const [showDeleteModal, setShowDeleteModal] = useState<boolean>(false);
  const [showVersementSection, setShowVersementSection] = useState(false);
  const [showFinalizeModal, setShowFinalizeModal] = useState(false);


  const [originalSaleItems, setOriginalSaleItems] = useState<SaleItem[]>([]);
  const [Ident, setIdent] = useState<Ids>()
  const { t } = useI18n();
  const {
    isEditing,
    isEditingItems,
    isEditingVersements,
    setIsEditing,
    setIsEditingItems,
    setIsEditingVersements
  } = useEdit();


  // Edit form state - only editable fields
  const [editForm, setEditForm] = useState({
    description: sale?.description || '',
    date: sale?.date || '',
    payment_method: sale?.payment_method || '',
    remise: sale?.remise || '0'
  });


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


  const roundToTwoDecimals = (num: number) => {
    return Math.round(num * 100) / 100;
  };

  const getCurrentMonthRange = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    // Fix: Ensure we get the correct last day in local timezone
    const startStr = firstDay.toLocaleDateString('en-CA'); // YYYY-MM-DD format
    const endStr = lastDay.toLocaleDateString('en-CA'); // YYYY-MM-DD format

    return {
      start: startStr,
      end: endStr
    };
  };

  const isDateInCurrentMonth = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();

    return date.getFullYear() === now.getFullYear() &&
      date.getMonth() === now.getMonth();
  };

  const isVersementEditable = (versementDate: string) => {
    return isDateInCurrentMonth(versementDate);
  };


  const handleSaveVersements = async () => {
    if (!sale) return;

    setLoading(true);
    try {
      // Filter versements to only include current month ones
      const currentMonthVersements = versements.filter(v => isVersementEditable(v.date));

      const versementsToSave = currentMonthVersements.map(v => ({
        amount: v.amount,
        date: v.date,
        number: v.number
      }));

      await Promise;
      setOriginalVersements(versements);

      handleInfo(t('PaymentsSavedSuccessfully'))
    } catch (error) {
      handleError(t('InvalidPaymentAmount'));
    } finally {
      setLoading(false);
      setIsEditingVersements(false);
    }
  };

  const { discountAmount, currentSubtotal } = useMemo(() => {
    if (!sale) return { discountAmount: 0, finalAmount: 0 };
    const SubTotal = saleItems.reduce((sum, item) => sum + item.total_price, 0);

    const remisePercent = Number(editForm.remise) || 0;
    const discount = (SubTotal * remisePercent) / 100;
    return {
      discountAmount: roundToTwoDecimals(discount),
      currentSubtotal: roundToTwoDecimals(SubTotal)
    };
  }, [saleItems, editForm.remise]);

  const p_total = useMemo(() => {
    if (!sale || !currentSubtotal) return 0;
    const remiseValue = Number(editForm.remise)
    const total = currentSubtotal * (100 - remiseValue) / 100;
    return roundToTwoDecimals(total);
  }, [editForm.remise, currentSubtotal]);

  const totalVersements = useMemo(() => {
    const total = versements.reduce((sum, versement) => sum + versement.amount, 0);
    return roundToTwoDecimals(total);
  }, [versements]);

  const maxAllowedRemise = useMemo(() => {
    if (!sale || sale.total === 0) return 100;
    const maxRemise = 100 - (totalVersements * 100 / sale.total);
    return Math.max(0, Math.min(100, maxRemise));
  }, [sale?.total, totalVersements]);

  const remainingAmount = useMemo(() => {
    const remaining = p_total - totalVersements;
    return roundToTwoDecimals(remaining);
  }, [currentSubtotal, totalVersements, p_total]);

  const isFullyPaid = remainingAmount <= 0;
  const getNewInvoiceCode = async () => {
    try {
      if (!sale || !sale.date) {
        throw new Error('Sale or sale date is not available');
      }
      const year = new Date(sale.date).getFullYear();
      if (!year) {
        throw new Error('no year')
      }
      const result = await promise;
      return result as number;
    } catch (error) {
      throw error;
    }
  };
  // Function to get new BL code for a specific client
  const getNewBLCodeForClient = async (clientId: number) => {
    try {
      if (!sale || !sale.date) {
        throw new Error('Sale or sale date is not available');
      }
      const year = new Date(sale.date).getFullYear();
      if (!year) {
        throw new Error('no year')
      }
      const result = await Promise;
      return result as number;
    } catch (error) {
      throw error;
    }
  };

  // Fetch initial data
  useEffect(() => {
    if (!sale) {
      navigate(-1);
      return;
    }

    const fetchSaleData = async () => {
      try {

        const saleItemsResult = await Promise;
        const saleItemsData = saleItemsResult as { p_id: number; quantity: number, unit_price: number }[];
        const IdentResult = await Promise;
        const Idents = IdentResult as Ids;
        setIdent(Idents)
        // Fetch products to get product details
        const productsResult = await Promise;
        const productsData = productsResult as Product[];
        setProducts(productsData);
        const fullSalesData = saleItemsData.map((item) => {
          const product = productsData.find(p => p.id === item.p_id);
          return {
            p_id: item.p_id,
            name: product?.name || t('product.unknown'),
            quantity: item.quantity,
            unit_price: item?.unit_price || 0,
            total_price: (item?.unit_price || 0) * item.quantity
          };
        });
        setSaleItems(fullSalesData);
        setOriginalSaleItems([...fullSalesData]);
        // TODO: Fetch versements data
        const versementsResult = await Promise;
        setVersements(versementsResult as Versement[]);
        setOriginalVersements(versementsResult as Versement[]);

      } catch (error) {
        handleError(t('FailedToLoad'))
      } finally {
        setLoadingData(false);
      }
    };

    fetchSaleData();
  }, [sale, navigate]);

  // Handle edit toggle
  const handleEditToggle = () => {
    if (isEditing && sale) {
      // Reset form when canceling
      setEditForm({
        description: sale.description,
        date: sale.date,
        payment_method: sale.payment_method,
        remise: String(sale.remise)
      });
    }
    else if (!isEditing && sale) {
      handleWarning(t('saleDetails.dateMod'))
    }
    setIsEditing(!isEditing);
  };

  // Handle save changes (only description and date)
  const handleSaveChanges = async () => {
    if (!sale) return;
    handleInfo(t('savingChanges'));

    if (!editForm.date) {
      handleWarning(t('issueDateRequired'))
      return;
    }

    if (!editForm.payment_method) {
      handleWarning(t('paymentMethodRequired'))
      return;
    }
    if (!editForm.remise || Number(editForm.remise) < 0 || Number(editForm.remise) > 100) {
      handleWarning(t('discountNotAppropriate'))
      return;
    }

    setLoading(true);
    try {
      await Promise;

      // Update local state
      setSale({
        ...sale,
        description: editForm.description.trim(),
        date: editForm.date,
        payment_method: editForm.payment_method,
        remise: Number(editForm.remise)
      });

      setIsEditing(false);
      handleInfo(t('updateSuccess'))
    } catch (error) {
      handleError(t('failedToUpdate'))
    } finally {
      setLoading(false);
    }
  };

  // Sale Items Management Functions
  const addSaleItem = () => {
    if (products.length === 0) {
      handleError(t('sales.noproducts'))
      return;
    }

    let k = 0;
    while (k < products.length && saleItems.some(item => item.p_id === products[k].id)) {
      k++;
    }

    if (k >= products.length) {
      handleWarning(t('sales.allproducts'))
      return;
    }

    const selectedProduct = products[k];
    const newItem = {
      p_id: selectedProduct.id,
      name: selectedProduct.name,
      quantity: 1,
      unit_price: selectedProduct.unit_price,
      total_price: selectedProduct.unit_price
    };

    setSaleItems(prev => [...prev, newItem]);
  };

  const removeSaleItem = (id: number) => {
    setSaleItems(prev => prev.filter(item => item.p_id !== id));
  };

  const updateSaleItem = (id: number, field: String, value: String) => {
    setSaleItems(prev => prev.map(item => {
      if (item.p_id === id) {
        const updatedItem = { ...item };

        if (field === 'p_id') {
          const selectedProduct = products.find(p => p.id === Number(value));
          if (selectedProduct) {
            updatedItem.p_id = selectedProduct.id;
            updatedItem.name = selectedProduct.name;
            updatedItem.unit_price = selectedProduct.unit_price;
            updatedItem.total_price = selectedProduct.unit_price * updatedItem.quantity;
          }
        } else if (field === 'quantity') {
          // Let user enter whatever they want
          const quantity = Math.max(1, Number(value));
          updatedItem.quantity = quantity;
          updatedItem.total_price = updatedItem.unit_price * quantity;
        }

        return updatedItem;
      }
      return item;
    }));
  };

  const getAvailableStock = (productId: number) => {
    const product = products.find(p => p.id === productId);
    return product ? product.quantity : 0;
  };

  // Get max allowed quantity for input field
  const getMaxQuantity = (productId: number) => {
    // Get original quantity for this product in the sale
    const originalItem = originalSaleItems.find(item => item.p_id === productId);
    const oldQuantity = originalItem ? originalItem.quantity : 0;

    // Get current stock
    const availableStock = getAvailableStock(productId);

    // Max = old quantity + available stock
    return oldQuantity + availableStock;
  };

  // Simple validation: new_quantity > old_quantity + available_stock = error
  const validateSaleItems = () => {
    const errors = [];

    for (const item of saleItems) {
      // Get original quantity for this product in the sale
      const originalItem = originalSaleItems.find(saleItem => saleItem.p_id === item.p_id);
      const oldQuantity = originalItem ? originalItem.quantity : 0;

      // Get current stock
      const availableStock = getAvailableStock(item.p_id);

      // Check if new quantity exceeds old quantity + available stock
      if (item.quantity > oldQuantity + availableStock) {
        errors.push(t('sales.errorPush1', { name: item.name, quantity: item.quantity }) +
          t('sales.errorPush2', { Max: oldQuantity + availableStock, oldQuantity, availableStock })
        );
      }

      if (item.quantity <= 0) {
        errors.push(t('sales.errorPush3', { name: item.name }));
      }
    }

    return errors;
  };

  const handleSaveSaleItems = async () => {
    if (!sale) return;

    // Simple validation
    const validationErrors = validateSaleItems();
    if (validationErrors.length > 0) {
      handleWarning(validationErrors.join('; '))
      return;
    }

    // Calculate new total with proper rounding
    const newTotal = roundToTwoDecimals(saleItems.reduce((sum, item) => sum + item.total_price, 0));

    // Check if new total is less than total versements
    if (newTotal < totalVersements) {
      handleError(t('purchase.discountMakesTotalSmallerThanPayments', { discount: sale.remise, newP_total: newTotal, totalVersements }))
      return;
    }

    setLoading(true);
    try {
      const itemsToUpdate = saleItems.map(item => ({
        p_id: item.p_id,
        quantity: item.quantity
      }));

      await Promise;

      // Update sale total locally
      setSale({
        ...sale,
        total: newTotal
      });

      setIsEditingItems(false);
      handleInfo(t('savingChanges'))
    } catch (error) {
      handleError(t('failedToUpdate'))
    } finally {
      setLoading(false);
    }
  };

  const addVersement = () => {
    try {
      // Calculate what the new total would be if we add a payment of $1
      const potentialNewTotal = roundToTwoDecimals(totalVersements + 1);

      if (potentialNewTotal > p_total) {
        throw new Error(t('totalPaymentsExceedTotal', { potentialNewTotal, p_total }));
      }

      const today = new Date().toISOString().split('T')[0]; // Format: YYYY-MM-DD
      const newVersement = {
        number: versements.length + 1,
        amount: 1,
        date: today
      };

      setVersements(prev => [...prev, newVersement]);
    } catch (error) {
      handleError(error instanceof Error ? error.message : String(error));
    }
  };

  const updateVersementDate = (number: number, date: string) => {
    const versement = versements.find(v => v.number === number);

    // Check if the versement is from current month (editable)
    if (!versement || !isVersementEditable(versement.date)) {
      handleWarning(t('noModifyPreviousMonth'));
      return;
    }

    // Check if new date is within current month
    if (!isDateInCurrentMonth(date)) {
      handleWarning(t('dateMustBeWithinCurrentMonth'));
      return;
    }

    setVersements(prev => prev.map(v =>
      v.number === number ? { ...v, date } : v
    ));
  };

  const removeVersement = (number: number) => {
    const versement = versements.find(v => v.number === number);

    // Check if the versement is from current month (editable)
    if (!versement || !isVersementEditable(versement.date)) {
      handleWarning(t('noDeleteVersements'));
      return;
    }

    setVersements(prev => {
      const filtered = prev.filter(v => v.number !== number);
      // Renumber versements to maintain sequential numbering
      return filtered.map((v, index) => ({ ...v, number: index + 1 }));
    });
  };

  const updateVersement = (number: number, amount: number) => {
    try {
      const versement = versements.find(v => v.number === number);

      // Check if the versement is from current month (editable)
      if (!versement || !isVersementEditable(versement.date)) {
        handleWarning(t('noModifyPreviousMonth'));
        return;
      }

      // Round the input amount
      const roundedAmount = roundToTwoDecimals(amount);

      if (roundedAmount <= 0) {
        throw new Error(t('paymentAmountMustBeGreaterThanZero'));
      }

      // Calculate what the new total would be with this update
      const currentVersement = versements.find(v => v.number === number);
      if (!currentVersement) {
        throw new Error(t('paymentNotFound'));
      }

      const newTotal = roundToTwoDecimals(totalVersements - currentVersement.amount + roundedAmount);

      if (newTotal > p_total) {
        throw new Error(t('paymentAmountTooHigh', { newTotal, p_total }));
      }

      setVersements(prev => prev.map(v =>
        v.number === number ? { ...v, amount: roundedAmount } : v
      ));
    } catch (error) {
      handleError(t('failedToUpdatePayment'));
    }
  };

  // Handle clear sale (one versement)
  const handleClearSale = async () => {
    if (!sale) return;

    setLoading(true);
    try {
      const today = new Date().toISOString().split('T')[0];

      // Round the remaining amount to avoid floating point issues
      const clearingAmount = roundToTwoDecimals(remainingAmount);

      const clearingVersement = {
        amount: clearingAmount,
        date: today,
        number: versements.length + 1
      };

      // Update local versements
      setVersements(prev => [...prev, clearingVersement]);
      handleSuccess(t('sales.successToClear'));
    } catch (error) {
      handleError(t('sales.failedToClearSale'));
    } finally {
      setLoading(false);
    }
  };


  const handleFinalizeSale = async () => {
    if (!sale) return;

    setLoading(true);
    try {
      Promise;
      sale.finalized = 1;
      handleSuccess(t('sales.successToFinalize'));
    } catch (error) {
      handleError(t('sales.failedToFinalize'));
    } finally {
      setLoading(false);
    }
  };

  // Handle delete sale
  const handleDeleteSale = async () => {
    if (!sale) return;

    setLoading(true);

    try {
      // Check if this is the latest document before deletion
      if (sale.doc_type === 'BL') {
        const newBLCode = await getNewBLCodeForClient(sale.c_id);
        if (sale.code !== newBLCode - 1) {
          handleError(t('sales.cannotDeleteBL'));
          return; // Early return, finally block will handle setLoading(false)
        }
      } else if (sale.doc_type === 'Invoice') {
        const newInvoiceCode = await getNewInvoiceCode();
        if (sale.code !== newInvoiceCode - 1) {
          handleError(t('sales.cannotDeleteInvoice'));
          return; // Early return, finally block will handle setLoading(false)
        }
      }

      // Perform the deletion
      await Promise;

      handleSuccess(t('sales.deleteSuccess'))

      // Navigate back after success
      setTimeout(() => {
        navigate(-1);
      }, 2000);

    } catch (error) {

      // Better error handling
      let errorMessage = t('sales.deleteFailed');

      if (typeof error === 'string') {
        errorMessage = error;
      } else if (error instanceof Error) {
        errorMessage = error.message;
      } else if (error && typeof error === 'object' && 'message' in error) {
        errorMessage = String(error.message);
      }

      handleError(errorMessage)
    } finally {
      setLoading(false);
      setShowDeleteModal(false)
    }
  };
  const handleCancelSaleItemsEdit = () => {
    if (isEditingItems) {
      // Reset sale items to original state when canceling
      setSaleItems([...originalSaleItems]);
    }
    setIsEditingItems(!isEditingItems);
  };

  // Handle cancel sale
  const handleCancelSale = async () => {
    if (!sale) return;

    setLoading(true);
    try {
      await Promise;
      handleSuccess(t('sales.successToCancel'))

      setTimeout(() => {
        navigate(-1);
      }, 2000);
    } catch (error) {
      handleError(t('sales.failedToCancel'))
    } finally {
      setLoading(false);
      setShowCancelModal(false)
    }
  };

  const handleInvoicePrint = (saleData: Sale, saleItemsData: SaleItem[], idents: Ids) => {
    // Create a new window for printing
    const printWindow = window.open('', '_blank', 'width=800,height=600');
    if (!printWindow) {
      return;
    }

    // Generate the complete HTML content with inline styles
    const printContent = generateInvoicePrintHTML(saleData, saleItemsData, idents);

    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.focus();

    // Print after a short delay to ensure content is loaded
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 500);
  };

  // Function to convert numbers to French words
  const numberToFrenchWords = (num: number) => {
    if (num === 0) return 'zéro';

    const ones = ['', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf'];
    const teens = ['dix', 'onze', 'douze', 'treize', 'quatorze', 'quinze', 'seize', 'dix-sept', 'dix-huit', 'dix-neuf'];
    const tens = ['', '', 'vingt', 'trente', 'quarante', 'cinquante', 'soixante', 'soixante', 'quatre-vingt', 'quatre-vingt'];

    const convertHundreds = (n: number) => {
      let result = '';

      if (n >= 100) {
        const hundreds = Math.floor(n / 100);
        if (hundreds === 1) {
          result += 'cent ';
        } else {
          result += ones[hundreds] + ' cent ';
        }
        n %= 100;
      }

      if (n >= 80) {
        const eighties = Math.floor(n / 20);
        if (eighties === 4) {
          result += 'quatre-vingt';
          if (n % 20 === 0) result += 's';
          else result += '-';
        }
        n %= 20;
      } else if (n >= 70) {
        result += 'soixante-';
        n -= 60;
      } else if (n >= 60) {
        result += 'soixante ';
        n -= 60;
      } else if (n >= 20) {
        const tensDigit = Math.floor(n / 10);
        result += tens[tensDigit];
        if (n % 10 !== 0) result += '-';
        n %= 10;
      }

      if (n >= 10) {
        result += teens[n - 10];
      } else if (n > 0) {
        result += ones[n];
      }

      return result.trim();
    };

    const convertThousands = (n: number) => {
      if (n === 0) return '';

      let result = '';

      if (n >= 1000000) {
        const millions = Math.floor(n / 1000000);
        if (millions === 1) {
          result += 'un million ';
        } else {
          result += convertHundreds(millions) + ' millions ';
        }
        n %= 1000000;
      }

      if (n >= 1000) {
        const thousands = Math.floor(n / 1000);
        if (thousands === 1) {
          result += 'mille ';
        } else {
          result += convertHundreds(thousands) + ' mille ';
        }
        n %= 1000;
      }

      if (n > 0) {
        result += convertHundreds(n);
      }

      return result.trim();
    };

    // Handle decimal part
    const parts = num.toString().split('.');
    const integerPart = parseInt(parts[0]);
    const decimalPart = parts[1] ? parseInt(parts[1].padEnd(2, '0').substring(0, 2)) : 0;

    let result = convertThousands(integerPart);

    if (integerPart > 1) {
      result += ' dinars';
    } else if (integerPart === 1) {
      result += ' dinar';
    }

    if (decimalPart > 0) {
      result += ' et ' + convertHundreds(decimalPart);
      if (decimalPart > 1) {
        result += ' centimes';
      } else {
        result += ' centime';
      }
    }

    return result.toUpperCase();
  };

  const generateInvoicePrintHTML = (sale: Sale, saleItems: SaleItem[], idents: Ids) => {
    const formatDate = (dateString: string) => {
      const date = new Date(dateString);
      return date.toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    };

    const formatPrice = (price: number) => {
      return price.toFixed(2);
    };

    // Calculate totals
    const sousTotal = saleItems.reduce((sum: number, item: SaleItem) => sum + item.total_price, 0);
    const tauxTVA = sousTotal * 0.19;
    const total = sousTotal + tauxTVA;

    // Generate items rows dynamically based on actual items
    const itemsRows = saleItems.map((item: SaleItem) => `
    <tr>
      <td class="border-cell">${item.name}</td>
      <td class="border-cell text-center">${item.quantity}</td>
      <td class="border-cell text-right">${formatPrice(item.unit_price)}</td>
      <td class="border-cell text-right">${formatPrice(item.total_price)}</td>
    </tr>
  `).join('');

    return `
    <!DOCTYPE html>
<html>
  <head>
    <title>Facture - ${sale.code}</title>
    <meta charset="UTF-8" />
    <style>
      * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
      }

      body {
        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        font-size: 11px;
        color: #333333;
        background: white;
        padding: 12px;
        line-height: 1.3;
      }

      .container {
        max-width: 210mm;
        margin: 0 auto;
        background: white;
      }

      table {
        border-collapse: collapse;
        width: 100%;
        background: white;
      }

      .border-cell {
        border: 1px solid #666666;
        padding: 4px 6px;
        font-size: 10px;
        background: white;
      }

      .border-thick {
        border: 2px solid #333333;
      }

      .no-border {
        border: none;
        padding: 3px 0;
      }

      .header-section {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        margin-bottom: 15px;
        background: #333333;
        padding: 15px;
        border: 1px solid #333333;
        color: white;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }

      .company-info {
        flex: 1;
      }

      .company-name {
        font-size: 18px;
        font-weight: bold;
        margin-bottom: 8px;
      }

      .company-details {
        font-size: 11px;
        line-height: 1.4;
      }

      .logo-section {
        margin: 0 15px;
        text-align: center;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .company-logo {
        height: 60px;
        width: auto;
        max-width: 100px;
        object-fit: contain;
        background: white;
        padding: 8px;
        border-radius: 8px;
        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      }

      .logo-circle {
        width: 60px;
        height: 60px;
        background: #666666;
        border-radius: 50%;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-weight: bold;
        font-size: 16px;
        border: 2px solid white;
        box-shadow: 0 2px 4px rgba(0,0,0,0.2);
      }

      .document-title {
        font-size: 28px;
        font-weight: bold;
        color: white;
        text-align: center;
        flex: 1;
        letter-spacing: 2px;
      }

      .client-invoice-section {
        display: flex;
        justify-content: space-between;
        margin: 15px 0;
        gap: 15px;
      }

      .client-section {
        flex: 1;
        border: 1px solid #666666;
        background: white;
      }

      .client-header {
        background: #f5f5f5;
        color: #333333;
        padding: 8px;
        font-weight: bold;
        text-align: center;
        font-size: 11px;
        border-bottom: 1px solid #666666;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }

      .client-content {
        padding: 8px;
      }

      .client-table {
        width: 100%;
      }

      .client-table td {
        padding: 2px 0;
        border: none;
        font-size: 9px;
      }

      .client-table .label {
        font-weight: bold;
        width: 35px;
        color: #333333;
      }

      .invoice-section {
        flex: 1;
        border: 1px solid #666666;
        background: white;
      }

      .invoice-header {
        background: #f5f5f5;
        color: #333333;
        padding: 8px;
        font-weight: bold;
        text-align: center;
        font-size: 11px;
        border-bottom: 1px solid #666666;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }

      .invoice-content {
        padding: 8px;
      }

      .invoice-table {
        width: 100%;
      }

      .invoice-table td {
        padding: 2px 4px;
        border: none;
        font-size: 9px;
      }

      .items-table {
        margin: 15px 0;
        border: 1px solid #666666;
      }

      .items-header {
        background: #f5f5f5;
        color: #333333;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }

      .items-header th {
        padding: 6px;
        font-size: 10px;
        font-weight: bold;
        border: 1px solid #666666;
      }

      .totals-section {
        margin: 15px 0;
        display: flex;
        justify-content: flex-end;
      }

      .totals-table {
        border: 1px solid #666666;
        min-width: 280px;
      }

      .totals-table td {
        padding: 6px 12px;
        font-size: 10px;
      }

      .total-label {
        background: #f9f9f9;
        font-weight: bold;
        border-right: 1px solid #666666;
        color: #333333;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }

      .total-value {
        text-align: right;
        font-weight: bold;
        color: #333333;
      }

      .total-final {
        background: #333333 !important;
        color: white !important;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }

      .amount-words {
        margin: 12px 0;
        padding: 8px;
        border: 1px solid #999999;
        background: #f8f8f8;
        font-size: 10px;
        font-style: italic;
        text-align: center;
        color: #333333;
        font-weight: 500;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }

      .footer-info {
        margin-top: 20px;
        text-align: center;
        font-size: 9px;
        line-height: 1.4;
        color: #666666;
        padding: 10px;
        background: #f8f8f8;
        border: 1px solid #cccccc;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }

      .text-right {
        text-align: right;
      }

      .text-center {
        text-align: center;
      }

      .font-bold {
        font-weight: bold;
      }

      .clearfix::after {
        content: "";
        display: table;
        clear: both;
      }

      @media print {
        body {
          margin: 0;
          padding: 8px;
          font-size: 10px;
        }

        .container {
          margin: 0;
          padding: 0;
        }

        .header-section {
          margin-bottom: 12px;
          padding: 12px;
        }

        .client-invoice-section {
          margin: 12px 0;
        }

        .items-table {
          margin: 12px 0;
        }

        .totals-section {
          margin: 12px 0;
        }

        .amount-words {
          margin: 10px 0;
          padding: 6px;
        }

        .footer-info {
          margin-top: 15px;
          padding: 8px;
        }
      }
    </style>
  </head>

  <body>
    <div class="container">
      <!-- Header Section -->
      <div class="header-section">
        <div class="company-info">
          <div class="company-name">SARL AFRICA PURE LAB</div>
          <div class="company-details">
            CITÉ DJEBEL EL OUAHCH VILLA N°558<br>
            CONSTANTINE<br>
            Téléphone : 05 42 28 94 31
          </div>
        </div>

        <div class="logo-section">
          <img
            src="logo.jpg"
            alt="Africa Pure Lab"
            class="company-logo"
            onerror="this.style.display='none'; this.nextElementSibling.style.display='inline-flex';"
          />
          <div class="logo-circle" style="display: none;">AF</div>
        </div>

        <div class="document-title">FACTURE</div>
      </div>

      <!-- Client and Invoice Info Section -->
      <div class="client-invoice-section">
        <!-- Client Section -->
        <div class="client-section">
          <div class="client-header">FACTURÉ À</div>
          <div class="client-content">
            <table class="client-table">
              <tbody>
                <tr>
                  <td class="label">Client:</td>
                  <td>${sale.client}</td>
                </tr>
                <tr>
                  <td class="label">Adresse:  </td>
                  <td>${idents?.location ?? ''}</td>
                </tr>
                <tr>
                  <td class="label">RC:</td>
                  <td>${idents?.rc ?? ''}</td>
                </tr>
                <tr>
                  <td class="label">AR:</td>
                  <td>${idents?.ar ?? ''}</td>
                </tr>
                <tr>
                  <td class="label">NIF:</td>
                  <td>${idents?.nif ?? ''}</td>
                </tr>
                <tr>
                  <td class="label">NIS:</td>
                  <td>${idents?.nis ?? ''}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- Invoice Info Section -->
        <div class="invoice-section">
          <div class="invoice-header">INFORMATIONS FACTURE</div>
          <div class="invoice-content">
            <table class="invoice-table">
              <tbody>
                <tr>
                  <td class="font-bold">N° FACTURE</td>
                  <td class="text-right">${sale.code.toString().padStart(3, '0')}</td>
                </tr>
                <tr>
                  <td class="font-bold">DATE</td>
                  <td class="text-right">${formatDate(sale.date)}</td>
                </tr>
                <tr>
                  <td class="font-bold">MODE DE RÈGLEMENT</td>
                  <td class="text-right">${sale.payment_method || 'CHÈQUE'}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- Items Table -->
      <table class="items-table">
        <thead class="items-header">
          <tr>
            <th style="width: 40%;">DESCRIPTION</th>
            <th style="width: 15%;">QTÉ</th>
            <th style="width: 20%;">PRIX UNITAIRE</th>
            <th style="width: 25%;">MONTANT</th>
          </tr>
        </thead>
        <tbody>
          ${itemsRows}
        </tbody>
      </table>

      <!-- Totals Section -->
      <div class="totals-section">
        <table class="totals-table">
          <tbody>
            <tr>
              <td class="border-cell total-label">SOUS-TOTAL</td>
              <td class="border-cell total-value">${formatPrice(sousTotal)}</td>
            </tr>
            <tr>
              <td class="border-cell total-label">TAUX TVA (19%)</td>
              <td class="border-cell total-value">${formatPrice(tauxTVA)}</td>
            </tr>
            <tr>
              <td class="border-cell total-label font-bold total-final">TOTAL</td>
              <td class="border-cell total-value font-bold total-final">${formatPrice(total)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Amount in Words -->
      <div class="amount-words">
        Arrêtée la présente facture à la somme de : <strong>${numberToFrenchWords(Number(total.toFixed(2)))}</strong>
      </div>

      <!-- Footer Information -->
      <div class="footer-info">
        RC:23B0624700 00/25 &nbsp;&nbsp; Article:25016726675 &nbsp;&nbsp; NIF:002335007420686<br>
        Pour toute question concernant cette facture, veuillez contacter<br>
        <strong>Email : africapurelab@gmail.com</strong>
      </div>
    </div>
  </body>
</html>
`;
  };



  const handleBLPrint = (saleData: Sale, saleItemsData: SaleItem[], Idents: Ids) => {
    // Create a new window for printing
    const printWindow = window.open('', '_blank', 'width=800,height=600');
    if (!printWindow) {
      return;
    }

    // Generate the complete HTML content with inline styles
    const printContent = generatePrintHTML(saleData, saleItemsData, Idents);

    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.focus();

    // Print after a short delay to ensure content is loaded
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 500);
  };

  const generatePrintHTML = (sale: Sale, saleItems: SaleItem[], Idents: Ids) => {
    const formatDate = (dateString: string) => {
      const date = new Date(dateString);
      return date.toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    };

    const formatPrice = (price: number) => {
      return price.toFixed(2);
    };

    // Generate items rows dynamically based on actual items
    const itemsRows = saleItems.map((item: SaleItem, index: number) => `
    <tr>
      <td class="border-cell text-center font-semibold">${index + 1}</td>
      <td class="border-cell">${item.name}</td>
      <td class="border-cell text-center">${item.quantity}</td>
      <td class="border-cell text-center">${Math.floor(item.quantity / 5) || 0}</td>
      <td class="border-cell text-right">${formatPrice(item.unit_price)}</td>
      <td class="border-cell text-right font-semibold">${formatPrice(item.total_price)}</td>
    </tr>
  `).join('');

    // Generate total section based on discount
    const generateTotalSection = () => {
      if (sale.remise === 0) {
        return `
        <div class="total-section">
          <table class="total-table">
            <tbody>
              <tr>
                <td class="border-cell font-bold bg-gray" style="padding: 8px 20px;">Total</td>
                <td class="border-cell text-right font-bold" style="min-width: 120px; padding: 8px 20px;">
                  ${formatPrice(sale.total)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>`;
      } else {
        const discountAmount = sale.total * sale.remise / 100;
        const finalTotal = sale.total * (100 - sale.remise) / 100;

        return `
        <div class="total-section">
          <table class="total-table">
            <tbody>
              <tr>
                <td class="border-cell font-bold bg-gray" style="padding: 8px 20px;">Sous-Total</td>
                <td class="border-cell text-right font-bold" style="min-width: 120px; padding: 8px 20px;">
                  ${formatPrice(sale.total)}
                </td>
              </tr>
              <tr>
                <td class="border-cell font-bold" style="padding: 8px 20px;">Remise (${sale.remise}%)</td>
                <td class="border-cell text-right font-bold" style="min-width: 120px; padding: 8px 20px;">
                  ${formatPrice(discountAmount)}
                </td>
              </tr>
            </tbody>
          </table>
          <div style="margin-top: 10px;">
            <table class="total-table">
              <tbody>
                <tr>
                  <td class="border-cell font-bold bg-gray" style="padding: 8px 20px;">Total</td>
                  <td class="border-cell text-right font-bold" style="min-width: 120px; padding: 8px 20px;">
                    ${formatPrice(finalTotal)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>`;
      }
    };

    return `
    <!DOCTYPE html>
<html>
  <head>
    <title>Bon de Livraison - ${sale.code}</title>
    <meta charset="UTF-8" />
    <style>
      * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
      }

      body {
        font-family: Arial, sans-serif;
        font-size: 12px;
        color: black;
        background: white;
        padding: 15px;
        line-height: 1.4;
      }

      .container {
        max-width: 210mm;
        margin: 0 auto;
        background: white;
      }

      table {
        border-collapse: collapse;
        width: 100%;
        background: white;
      }

      .border-cell {
        border: 1px solid #000;
        padding: 6px;
        font-size: 11px;
        background: white;
      }

      .border-thick {
        border: 2px solid #000;
      }

      .logo-section {
        border: 2px solid #000;
        padding: 10px;
        background: white;
        display: flex;
        flex-direction: row;
        align-items: center;
        gap: 10px;
      }

      .document-info {
        text-align: right;
      }

      .document-title {
        font-size: 18px;
        font-weight: bold;
        margin-bottom: 10px;
      }

      .client-section {
        border: 2px solid #000;
        padding: 10px;
        margin: 15px 0;
        background: white;
        clear: both;
      }

      .client-table {
        width: 100%;
      }

      .client-table td {
        padding: 4px 0;
        border: none;
      }

      .client-table .label {
        font-weight: 600;
        width: 80px;
      }

      .client-table .value {
        border-bottom: 1px solid #000;
        padding-bottom: 2px;
      }

      .items-table {
        margin: 15px 0;
        border: 2px solid #000;
      }

      .bg-gray {
        background: #f0f0f0 !important;
      }

      .signature-section {
        padding: 20px;
        margin: 15px 0;
        height: 80px;
        background: white;
      }

      .text-right {
        text-align: right;
      }

      .text-center {
        text-align: center;
      }

      .font-bold {
        font-weight: bold;
      }

      .font-semibold {
        font-weight: 600;
      }

      .logo-circle {
        width: 48px;
        height: 48px;
        background: linear-gradient(135deg, #059669, #d97706);
        border-radius: 50%;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-weight: bold;
        font-size: 12px;
        flex-shrink: 0;
      }

      .company-name {
        font-size: 16px;
        font-weight: bold;
        line-height: 1.2;
      }

      .total-section {
        float: right;
        margin-top: 15px;
      }

      .total-table {
        border: 2px solid #000;
      }

      .description {
        font-size: 12px;
        font-style: italic;
        margin: 10px 0;
      }

      .clearfix::after {
        content: "";
        display: table;
        clear: both;
      }

      .company-logo {
        height: 48px;
        width: 84px;
        object-fit: contain;
        flex-shrink: 0;
      }

      @media print {
        body {
          margin: 0;
          padding: 10px;
          font-size: 11px;
        }

        .container {
          margin: 0;
          padding: 0;
        }
      }
    </style>
  </head>

  <body>
    <div class="container">
      <!-- Header: Logo + Document Info in same row -->
      <div
        class="header-top"
        style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px;"
      >
        <!-- Logo and Company Name -->
        <div class="logo-section">
          <img
            src="logo.jpg"
            alt="Africa Pure Lab"
            class="company-logo"
            onerror="this.style.display='none'; this.nextElementSibling.style.display='inline-flex';"
          />
          <div class="logo-circle" style="display: none;">AF</div>
          <div class="company-name">AFRICA PURE LAB</div>
        </div>

        <!-- Document Info -->
        <div class="document-info">
          <div class="document-title">BON DE LIVRAISON</div>
          <table class="border-thick">
            <tbody>
              <tr>
                <td class="border-cell font-semibold bg-gray">DATE</td>
                <td class="border-cell">${formatDate(sale.date)}</td>
              </tr>
              <tr>
                <td class="border-cell font-semibold bg-gray">BL N°</td>
                <td class="border-cell">${sale.code.toString().padStart(8, '0')}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Client Information -->
      <div class="client-section">
        <table class="client-table">
          <tbody>
            <tr>
              <td class="label font-semibold">Client</td>
              <td class="value">${sale.client}</td>
            </tr>
            <tr>
              <td class="label font-semibold">Adresse</td>
              <td class="value">Constantine, Algérie</td>
            </tr>
            <tr>
              <td class="label font-semibold">Téléphone</td>
              <td class="value">${Idents.phone}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Items Table -->
      <table class="items-table">
        <thead>
          <tr class="bg-gray">
            <th class="border-cell text-center font-semibold" style="width: 60px;">N° Article</th>
            <th class="border-cell text-center font-semibold">Produit</th>
            <th class="border-cell text-center font-semibold" style="width: 80px;">Quantité</th>
            <th class="border-cell text-center font-semibold" style="width: 80px;">UG (20%)</th>
            <th class="border-cell text-center font-semibold" style="width: 100px;">Prix unitaire</th>
            <th class="border-cell text-center font-semibold" style="width: 120px;">Montant TTC</th>
          </tr>
        </thead>
        <tbody>
          ${itemsRows}
        </tbody>
      </table>

      <!-- Total Section -->
      ${generateTotalSection()}

      <div class="clearfix"></div>

      <!-- Signature Section -->
      <div style="display: flex; justify-content: space-between; margin: 15px 0;">
        <div class="signature-section" style="width: 45%; margin-right: 10px;">
          <div class="text-center font-semibold" style="margin-bottom: 15px;">
            SARL AFRICA PURE LAB
          </div>
          <div style="height: 40px;"></div>
        </div>

        <div class="signature-section" style="width: 45%;">
          <div class="text-center font-semibold" style="margin-bottom: 15px;">
            Client
          </div>
          <div style="height: 40px;"></div>
        </div>
      </div>
    </div>
  </body>
</html>
`
  };

  // Usage example - replace your current handlePrint function with this:
  const handlePrintDirect = () => {
    if (!sale || !saleItems || !Ident) {
      return;
    }
    if (sale.doc_type === 'BL') {
      handleBLPrint(sale, saleItems, Ident);
    }
    else if (sale.doc_type === 'Invoice') {
      handleInvoicePrint(sale, saleItems, Ident)
    }
  };

  if (loadingData) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex items-center gap-3 text-white">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            className="w-6 h-6 border-2 border-white border-t-transparent rounded-full"
          />
          {t('sales.loadingSaleData')}
        </div>
      </div>
    );
  }

  if (!sale) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center text-slate-400">
          <AlertCircle size={48} className="mx-auto mb-4" />
          <p>{t('sales.notFound')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className='flex flex-col gap-8 mx-auto py-6 pb-5 px-1 lg:px-2 xl:px-4 max-w-6xl relative h-fit'>
      {/* Header */}
      <div className="flex items-center justify-between">
        {/* Back Button */}
        <button
          type="button"
          onClick={() => {
            if (isEditing || isEditingItems) {
              handleWarning('Please, save first!')
            } else {
              navigate(-1)
            }
          }}
          className="flex items-center gap-2 text-slate-400 hover:text-white transition-all duration-200 group"
          title={t('saleDetails.backToSales')}
        >
          <ArrowLeft size={20} className="group-hover:translate-x-[-2px] transition-transform duration-200" />
        </button>

        {/* Expandable Actions */}
        {sale.status === "Approved" && (
          <div className="relative flex items-center">
            {/* Expanded Actions Container */}
            <div
              className={`flex items-center gap-2 transition-all duration-500 ease-in-out overflow-hidden ${isExpanded
                  ? 'max-w-[400px] opacity-100 mr-3'
                  : 'max-w-0 opacity-0 mr-0'
                }`}
            >
              {/* Cancel Button */}
              <button
                onClick={() => setShowCancelModal(true)}
                className="flex items-center justify-center w-14 h-14 bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition-colors"
                title={t('cancel')}
              >
                <X size={16} />
              </button>

              {/* Finalize Button */}
              {sale.finalized !== 1 && (
                <button
                  onClick={() => setShowFinalizeModal(true)}
                  className="flex items-center justify-center w-14 h-14 bg-gradient-to-r from-blue-500/80 to-cyan-500/80 hover:from-blue-500 hover:to-cyan-500 rounded-lg transition-color "
                  title={t('finalize')}
                >
                  <BookCheck size={16} />
                </button>
              )}

              {/* Delete Button */}
              <button
                onClick={() => setShowDeleteModal(true)}
                className="flex items-center justify-center w-14 h-14 bg-rose-600 hover:bg-rose-700 text-white rounded-lg transition-colors"
                title={t('delete')}
              >
                <Trash2 size={16} />
              </button>

              {/* Print Button */}
              <button
                onClick={() => handlePrintDirect()}
                className="flex items-center justify-center w-14 h-14 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
                title={t('print')}
              >
                <Printer size={16} />
              </button>

              {/* Edit Button */}
              <button
                onClick={() => handleEditToggle()}
                className="flex items-center justify-center w-14 h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                title={isEditing ? t('cancel') : t('edit')}
              >
                {isEditing ? <X size={16} /> : <Edit3 size={16} />}
              </button>
            </div>

            {/* Main Toggle Button */}
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className={`flex items-center justify-center w-12 h-12 transition-all duration-500 ease-in-out backdrop-blur-sm border shadow-xl ${isExpanded
                  ? 'bg-gradient-to-r from-slate-600/40 to-slate-700/40 border-slate-500/50 text-slate-300 rounded-xl shadow-slate-500/20'
                  : 'bg-gradient-to-r from-slate-700/50 to-slate-800/50 border-slate-600/40 text-slate-400 hover:text-slate-300 hover:from-slate-600/50 hover:to-slate-700/50 rounded-2xl shadow-slate-600/20'
                } hover:scale-105 transform`}
            >
              {isExpanded ? (
                <ChevronRight size={18} className="rotate-180 transition-transform duration-300" />
              ) : (
                <MoreHorizontal size={18} />
              )}
            </button>
          </div>
        )}
      </div>
      {/* Sale Information */}
      <div className="bg-slate-900 p-6 rounded-xl shadow-md border border-slate-700">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <Receipt className="text-blue-500" size={28} />
            {sale.doc_type === 'Invoice' ? t('invoice') : 'BL'} #{sale.code}
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

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Document Type - Non-editable */}
          <div>
            <label className="text-sm font-medium text-slate-300 mb-2 flex items-center gap-2">
              <FileText size={16} />
              {t('documentType')}
            </label>
            <div className="w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-lg text-white">
              {sale.doc_type}
            </div>
          </div>

          {/* Client - Non-editable */}
          <div>
            <label className="text-sm font-medium text-slate-300 mb-2 flex items-center gap-2">
              <User size={16} />
              Client
            </label>
            <div className="w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-lg text-white">
              {sale.client}
            </div>
          </div>

          {/* Document Code - Non-editable */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              {t('documentCode')}
            </label>
            <div className="w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-lg text-white">
              {sale.code}
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-slate-300 mb-2 flex items-center gap-2">
              <User size={16} />
              {t('status')}
            </label>
            <div className="w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-lg text-white">
              {sale.status}
            </div>
          </div>



          {/* Issue Date - Editable */}
          <div>
            <label className="text-sm font-medium text-slate-300 mb-2 flex items-center gap-2">
              <Calendar size={16} />
              {t('issueDate')}
            </label>
            {isEditing ? (
              <input
                title="Issue Date"
                type="date"
                value={editForm.date}
                onChange={(e) => setEditForm(prev => ({ ...prev, date: e.target.value }))}
                className="w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={loading}
              />
            ) : (
              <div className="w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-lg text-white">
                {new Date(sale.date).toLocaleDateString()}
              </div>
            )}
          </div>

          {/* Total - Non-editable but updates based on items */}
          <div>
            <label className="text-sm font-medium text-slate-300 mb-2 flex items-center gap-2">
              <DollarSign size={16} />
              {t('totalAmount')}
            </label>
            <div className="w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-lg text-green-400 font-semibold">
              {p_total.toFixed(2)} DA
            </div>
          </div>
          {(sale.doc_type === 'Invoice') &&
            <div className="lg:col-span-1">
              <label className="block text-sm font-medium text-slate-300 mb-2">
                {t('paymentMethod')}
              </label>
              {isEditing ? (
                <textarea
                  title="PaymentMethod"
                  value={editForm.payment_method}
                  onChange={(e) => setEditForm(prev => ({ ...prev, payment_method: e.target.value }))}
                  className="w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  rows={3}
                  disabled={loading}
                />
              ) : (
                <div className="w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-lg text-white min-h-[80px]">
                  {sale.payment_method}
                </div>
              )}
            </div>
          }
          {sale.doc_type === 'BL' && (
            <div>
              <label htmlFor="remise" className="block text-sm font-medium text-slate-300 mb-2">
                {t('discount')} {maxAllowedRemise < 100 && (
                  <span className="text-xs text-orange-400 ml-2">
                    Max: {maxAllowedRemise.toFixed(1)}%
                  </span>
                )}
              </label>
              <input
                type="number"
                id="remise"
                name="remise"
                value={editForm.remise}
                onChange={(e) => {
                  const value = e.target.value;
                  const numValue = Number(value);

                  // Real-time validation feedback
                  if (numValue > maxAllowedRemise) {
                    handleError(t('maxAllowedRemise', { maxAllowedRemise: maxAllowedRemise.toFixed(1) }))
                  }
                  setEditForm(prev => ({ ...prev, remise: value }));
                }}
                min="0"
                max={Math.min(maxAllowedRemise, 100)}
                step="0.01"
                className={`w-full px-4 py-3 bg-slate-800 border rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:border-transparent ${Number(editForm.remise) > maxAllowedRemise
                  ? 'border-red-500 focus:ring-red-500'
                  : 'border-slate-600 focus:ring-green-500'
                  }`}
                placeholder="0%"
                disabled={loading || !isEditing}
              />
              {/* Live preview of p_total after remise */}
              {isEditing && editForm.remise && Number(editForm.remise) > 0 && Number(editForm.remise) < 100 && sale && currentSubtotal && (
                <div className="mt-2 text-sm text-slate-400">
                  {t('preview')}: {currentSubtotal.toFixed(2)} DA - {editForm.remise}% = {(currentSubtotal * (100 - Number(editForm.remise)) / 100).toFixed(2)} DA
                </div>
              )}
            </div>
          )}

          {/* Description - Editable */}
          <div className="lg:col-span-3">
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Description
            </label>
            {isEditing ? (
              <textarea
                title="Description"
                value={editForm.description}
                onChange={(e) => setEditForm(prev => ({ ...prev, description: e.target.value }))}
                className="w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                rows={3}
                disabled={loading}
              />
            ) : (
              <div className="w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-lg text-white min-h-[80px]">
                {sale.description}
              </div>
            )}
          </div>
        </div>
      </div>

      {sale.status === "Approved" && sale.finalized === 1 && (
        <div className="bg-slate-900 p-6 rounded-xl shadow-md border border-slate-700">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-white flex items-center gap-3">
              <CreditCard className="text-emerald-500" size={24} />
              {t('paymentManagement')}
            </h2>
            <button
              onClick={() => setShowVersementSection(!showVersementSection)}
              className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors"
            >
              <ChevronDown
                size={20}
                className={`transform transition-transform ${showVersementSection ? 'rotate-180' : ''}`}
              />
              {showVersementSection ? 'Hide' : 'Show'} Details
            </button>
          </div>

          {/* Payment Summary */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-slate-800 p-4 rounded-lg border border-slate-600">
              <div className="text-sm text-slate-400 mb-1">{t('totalAmount')}</div>
              <div className="text-lg font-semibold text-white">{p_total.toFixed(2)} DA</div>
            </div>
            <div className="bg-slate-800 p-4 rounded-lg border border-slate-600">
              <div className="text-sm text-slate-400 mb-1">{t('totalPaid')}</div>
              <div className="text-lg font-semibold text-emerald-400">{totalVersements.toFixed(2)} DA</div>
            </div>
            <div className="bg-slate-800 p-4 rounded-lg border border-slate-600">
              <div className="text-sm text-slate-400 mb-1">{t('remaining')}</div>
              <div className={`text-lg font-semibold ${remainingAmount > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                {remainingAmount.toFixed(2)} DA
              </div>
            </div>
            <div className="bg-slate-800 p-4 rounded-lg border border-slate-600">
              <div className="text-sm text-slate-400 mb-1">{t('status')}</div>
              <div className={`text-lg font-semibold ${isFullyPaid ? 'text-emerald-400' : 'text-amber-400'}`}>
                {isFullyPaid ? 'Paid' : 'Pending'}
              </div>
            </div>
          </div>

          <AnimatePresence>
            {showVersementSection && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-6"
              >
                {/* Versements Table */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-white">{t('paymentHistory')}</h3>
                    <div className="flex items-center gap-2">
                      {/* Edit/Cancel Button */}
                      <button
                        onClick={() => {
                          if (isEditingVersements) {
                            // Cancel editing - you might want to reset versements to original state here
                            setVersements(originalVersements)
                            setIsEditingVersements(false);
                          } else {
                            setIsEditingVersements(true);
                          }
                        }}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                      >
                        {isEditingVersements ? <X size={16} /> : <Edit3 size={16} />}
                        {isEditingVersements ? t('cancel') : t('edit')}
                      </button>

                      {/* Save Payments - Only visible in editing mode */}
                      {isEditingVersements && (
                        <button
                          onClick={handleSaveVersements}
                          disabled={loading}
                          className="flex items-center gap-2 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-800 text-white rounded-lg transition-colors text-sm"
                        >
                          <Save size={16} />
                          {t('savePayments')}
                        </button>
                      )}

                      {/* Clear Sale - Only visible in editing mode and when not fully paid */}
                      {isEditingVersements && !isFullyPaid && (
                        <button
                          onClick={handleClearSale}
                          disabled={loading || remainingAmount <= 0}
                          className="flex items-center gap-2 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-800 disabled:opacity-50 text-white rounded-lg transition-colors text-sm"
                        >
                          <DollarSign size={16} />
                          {t('sales.clear')}
                        </button>
                      )}

                      {/* Add Payment - Only visible in editing mode */}
                      {isEditingVersements && (
                        <button
                          onClick={addVersement}
                          className="flex items-center gap-2 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors text-sm"
                        >
                          <Plus size={16} />
                          {t('addPayment')}
                        </button>
                      )}
                    </div>
                  </div>

                  {versements.length > 0 ? (
                    <div className="bg-slate-800/50 rounded-xl border border-slate-600 overflow-hidden backdrop-blur-sm">
                      <div className="bg-gradient-to-r from-slate-700 to-slate-600 px-6 py-4">
                        <h4 className="text-white font-semibold flex items-center gap-2">
                          <CreditCard size={18} />
                          {t('PaymentRecords')}
                        </h4>
                      </div>

                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead className="bg-slate-700/80">
                            <tr>
                              <th className="px-6 py-4 text-left text-sm font-semibold text-slate-200 uppercase tracking-wide">
                                {t('paymentId')}
                              </th>
                              <th className="px-6 py-4 text-left text-sm font-semibold text-slate-200 uppercase tracking-wide">
                                {t('amount')}
                              </th>
                              <th className="px-6 py-4 text-left text-sm font-semibold text-slate-200 uppercase tracking-wide">
                                Date
                              </th>
                              <th className="px-6 py-4 text-center text-sm font-semibold text-slate-200 uppercase tracking-wide">
                                {t('status')}
                              </th>
                              {isEditingVersements && (
                                <th className="px-6 py-4 text-center text-sm font-semibold text-slate-200 uppercase tracking-wide">
                                  Actions
                                </th>
                              )}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-600/50">
                            <AnimatePresence>
                              {versements.map((versement, index) => {
                                const isEditable = isVersementEditable(versement.date);
                                const monthRange = getCurrentMonthRange();
                                const canEdit = isEditingVersements && isEditable;

                                return (
                                  <motion.tr
                                    key={versement.number}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: 20, scale: 0.95 }}
                                    transition={{ delay: index * 0.1 }}
                                    className={`hover:bg-slate-700/30 transition-all duration-200 group ${!isEditable ? 'opacity-60 bg-slate-800/30' : ''
                                      }`}
                                  >
                                    <td className="px-6 py-4">
                                      <div className="flex items-center gap-3">
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold ${isEditable
                                          ? 'bg-gradient-to-br from-emerald-500 to-emerald-600'
                                          : 'bg-gradient-to-br from-gray-500 to-gray-600'
                                          }`}>
                                          {versement.number}
                                        </div>
                                        <span className="text-white font-medium">
                                          {t('payment')} #{versement.number}
                                        </span>
                                      </div>
                                    </td>
                                    <td className="px-6 py-4">
                                      <div className="flex items-center gap-3">
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${canEdit
                                          ? 'bg-emerald-900/30'
                                          : 'bg-gray-900/30'
                                          }`}>
                                          <DollarSign size={16} className={canEdit ? 'text-emerald-400' : 'text-gray-400'} />
                                        </div>
                                        <div className="relative">
                                          <input
                                            type="number"
                                            value={versement.amount}
                                            onChange={(e) => updateVersement(Number(versement.number), Number(e.target.value))}
                                            disabled={!canEdit}
                                            className={`w-36 px-4 py-2 border-2 rounded-lg font-semibold focus:outline-none transition-all duration-200 ${canEdit
                                              ? 'bg-slate-700/80 border-slate-600 hover:border-emerald-500 focus:border-emerald-400 text-white focus:bg-slate-700'
                                              : 'bg-slate-800/50 border-slate-700 text-slate-400 cursor-not-allowed'
                                              }`}
                                            placeholder="0.00"
                                            min="0.01"
                                            step="0.01"
                                          />
                                          <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none">
                                            <span className={canEdit ? 'text-slate-400' : 'text-slate-500'}>DA</span>
                                          </div>
                                        </div>
                                      </div>
                                    </td>
                                    <td className="px-6 py-4">
                                      <div className="flex items-center gap-3">
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${canEdit
                                          ? 'bg-blue-900/30'
                                          : 'bg-gray-900/30'
                                          }`}>
                                          <Calendar size={16} className={canEdit ? 'text-blue-400' : 'text-gray-400'} />
                                        </div>
                                        <input
                                          title='date'
                                          type="date"
                                          value={versement.date}
                                          onChange={(e) => updateVersementDate(Number(versement.number), e.target.value)}
                                          disabled={!canEdit}
                                          min={canEdit ? monthRange.start : undefined}
                                          max={canEdit ? monthRange.end : undefined}
                                          className={`w-40 px-3 py-2 border-2 rounded-lg focus:outline-none transition-all duration-200 ${canEdit
                                            ? 'bg-slate-700/80 border-slate-600 hover:border-blue-500 focus:border-blue-400 text-white focus:bg-slate-700'
                                            : 'bg-slate-800/50 border-slate-700 text-slate-400 cursor-not-allowed'
                                            }`}
                                        />
                                      </div>
                                    </td>
                                    <td className="px-6 py-4">
                                      <div className="flex justify-center">
                                        {isEditable ? (
                                          <span className="px-2 py-1 bg-emerald-900/30 border border-emerald-600 text-emerald-300 rounded-full text-xs font-semibold">
                                            {t('currentMonth')}
                                          </span>
                                        ) : (
                                          <span className="px-2 py-1 bg-gray-900/30 border border-gray-600 text-gray-400 rounded-full text-xs font-semibold flex items-center gap-1">
                                            <AlertCircle size={12} />
                                            {t('readOnly')}
                                          </span>
                                        )}
                                      </div>
                                    </td>
                                    {isEditingVersements && (
                                      <td className="px-6 py-4">
                                        <div className="flex justify-center">
                                          {canEdit ? (
                                            <motion.button
                                              whileHover={{ scale: 1.05 }}
                                              whileTap={{ scale: 0.95 }}
                                              onClick={() => removeVersement(Number(versement.number))}
                                              className="p-2 text-rose-400 hover:text-red-300 hover:bg-red-900/20 rounded-lg transition-all duration-200 group-hover:bg-red-900/10"
                                            >
                                              <Trash2 size={16} />
                                            </motion.button>
                                          ) : (
                                            <div className="p-2 text-gray-500 cursor-not-allowed">
                                              <Trash2 size={16} />
                                            </div>
                                          )}
                                        </div>
                                      </td>
                                    )}
                                  </motion.tr>
                                );
                              })}
                            </AnimatePresence>
                          </tbody>
                        </table>
                      </div>

                      {/* Enhanced Summary Footer */}
                      <div className="bg-gradient-to-r from-slate-700/80 to-slate-600/80 px-6 py-4 border-t border-slate-600">
                        <div className="flex flex-wrap justify-between items-center gap-4">
                          <div className="flex items-center gap-6">
                            <div className="text-sm">
                              <span className="text-slate-300">{t('totalPayments')}:</span>
                              <span className="ml-2 px-2 py-1 bg-blue-900/30 border border-blue-600 text-blue-300 rounded font-semibold">
                                {versements.length}
                              </span>
                            </div>
                            <div className="text-sm">
                              <span className="text-slate-300">{t('totalAmount')}:</span>
                              <span className="ml-2 px-3 py-1 bg-emerald-900/30 border border-emerald-600 text-emerald-300 rounded font-bold">
                                {totalVersements.toFixed(2)} DA
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-3">
                            {remainingAmount > 0 ? (
                              <div className="px-3 py-1 bg-amber-900/30 border border-amber-600 text-amber-300 rounded-full text-sm font-semibold">
                                {remainingAmount.toFixed(2)} DA {t('remaining')}
                              </div>
                            ) : (
                              <div className="px-3 py-1 bg-emerald-900/30 border border-emerald-600 text-emerald-300 rounded-full text-sm font-semibold flex items-center gap-1">
                                <CheckCircle size={14} />
                                {t('saleDetails.fullyPaid')}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-12 bg-slate-800/30 rounded-xl border-2 border-dashed border-slate-600">
                      <motion.div
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="space-y-4"
                      >
                        <div className="w-16 h-16 bg-slate-700/50 rounded-full flex items-center justify-center mx-auto">
                          <CreditCard size={24} className="text-slate-400" />
                        </div>
                        <div>
                          <p className="text-slate-300 font-medium">{t('noPaymentsRecorded')}</p>
                          <p className="text-slate-400 text-sm mt-1">{t('saleDetails.addFirstPayment')}</p>
                        </div>
                        {isEditingVersements && (
                          <button
                            onClick={addVersement}
                            className="mt-4 flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors mx-auto"
                          >
                            <Plus size={16} />
                            {t('addPayment')}
                          </button>
                        )}
                      </motion.div>
                    </div>
                  )}
                </div>

                {/* Payment Validation Warning */}
                {totalVersements > p_total && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-2 p-4 bg-yellow-900/30 border border-yellow-700 text-yellow-300 rounded-lg"
                  >
                    <AlertTriangle size={20} />
                    <span>
                      {t('paymentAmountTooHigh2', { totalVersements: totalVersements.toFixed(2), p_total: p_total.toFixed(2) })}
                    </span>
                  </motion.div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
      {/* Sale Items Section */}
      <div className="bg-slate-900 p-6 rounded-xl shadow-md border border-slate-700">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white flex items-center gap-3">
            <Calculator className="text-purple-500" size={24} />
            {t('sales.saleItems')}
          </h2>
          <div className="flex items-center gap-2">
            {isEditingItems && (
              <button
                onClick={handleSaveSaleItems}
                disabled={loading}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-green-800 text-white rounded-lg transition-colors"
              >
                <Save size={16} />
                {t('saleDetails.saveItems')}
              </button>
            )}
            {sale.status === "Approved" && (
              <button
                onClick={handleCancelSaleItemsEdit}
                className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
              >
                {isEditingItems ? <X size={16} /> : <Edit3 size={16} />}
                {isEditingItems ? t('cancel') : t('edit')}
              </button>)}
          </div>
        </div>

        {/* Items List */}
        {saleItems.length > 0 ? (
          <div className="space-y-4">
            <AnimatePresence>
              {saleItems.map((item, index) => (
                <motion.div
                  key={item.p_id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ delay: index * 0.05 }}
                  className="bg-slate-800 p-4 rounded-lg border border-slate-600"
                >
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
                    {/* Product Selection */}
                    <div className="md:col-span-4">
                      <label className="block text-sm font-medium text-slate-300 mb-2">
                        {t('Product')}
                      </label>
                      {isEditingItems ? (
                        <select
                          title='product'
                          value={item.p_id}
                          onChange={(e) => updateSaleItem(item.p_id, 'p_id', e.target.value)}
                          className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                          disabled={loading}
                        >
                          {products.map((product) => (
                            <option
                              key={product.id}
                              value={product.id}
                              disabled={saleItems.some(sItem => sItem.p_id === product.id && sItem.p_id !== item.p_id)}
                            >
                              {product.name} {saleItems.some(sItem => sItem.p_id === product.id && sItem.p_id !== item.p_id) ? t('alreadyAdded') : ''}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <div className="px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white">
                          {item.name}
                        </div>
                      )}
                    </div>

                    {/* Quantity */}
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-slate-300 mb-2">
                        {('qunatity')}
                      </label>
                      {isEditingItems ? (
                        <div className="space-y-1">
                          <input
                            title="quantity"
                            type="number"
                            value={item.quantity}
                            onChange={(e) => updateSaleItem(item.p_id, 'quantity', e.target.value)}
                            className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                            min="1"
                            max={String(getMaxQuantity(Number(item.p_id)))}
                            disabled={loading}
                          />
                          <div className="text-xs text-slate-400">
                            Max: {getMaxQuantity(item.p_id)} (Stock: {getAvailableStock(item.p_id)})
                          </div>
                        </div>
                      ) : (
                        <div className="px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white">
                          {item.quantity}
                        </div>
                      )}
                    </div>

                    {/* Unit Price */}
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-slate-300 mb-2">
                        {t('unitPrice')}
                      </label>
                      <div className="px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white">
                        {item.unit_price.toFixed(2)} DA
                      </div>
                    </div>

                    {/* Total Price */}
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-slate-300 mb-2">
                        {t('total')}
                      </label>
                      <div className="px-3 py-2 bg-green-900/30 border border-green-700 rounded-lg text-green-400 font-semibold">
                        {item.total_price.toFixed(2)} DA
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="md:col-span-2 flex justify-center">
                      {isEditingItems && (
                        <button
                          onClick={() => removeSaleItem(item.p_id)}
                          className="flex items-center gap-1 px-3 py-2 text-red-400 hover:text-red-300 hover:bg-red-900/20 rounded-lg transition-colors"
                        >
                          <Trash2 size={16} />
                          {t('remove')}
                        </button>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            {/* Add Item Button */}
            {isEditingItems && (
              <motion.button
                onClick={addSaleItem}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-slate-600 hover:border-purple-500 text-slate-400 hover:text-purple-400 rounded-lg transition-colors group"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Plus size={20} className="group-hover:rotate-90 transition-transform duration-200" />
                {t('sales.addProduct')}
              </motion.button>
            )}

            {/* Items Summary with Remise Logic */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-slate-800 p-4 rounded-lg border border-slate-600 space-y-2"
            >
              <div className="flex justify-between items-center">
                <div className="text-slate-300">
                  <span className="font-medium">{t('items')}: {saleItems.length}</span>
                  <span className="mx-4">•</span>
                  <span className="font-medium">
                    {t('saleDetails.totalQuantity', { count: saleItems.reduce((sum, item) => sum + item.quantity, 0) })}
                  </span>
                </div>
              </div>

              {/* Subtotal */}
              {sale.doc_type === "BL" && (
                <motion.div
                  layout
                  className="flex items-center justify-between"
                >
                  <span className="text-lg font-semibold text-white">{t('subtotal')}:</span>
                  <motion.span
                    key={currentSubtotal}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="text-xl font-bold text-white"
                  >
                    {currentSubtotal?.toFixed(2)} DA
                  </motion.span>
                </motion.div>)}

              {/* Remise Section - Only show if remise > 0 */}
              <AnimatePresence mode="wait">
                {sale && sale.remise > 0 && (
                  <motion.div
                    key="discount-section"
                    initial={{ opacity: 0, height: 0, y: -10 }}
                    animate={{ opacity: 1, height: "auto", y: 0 }}
                    exit={{ opacity: 0, height: 0, y: -10 }}
                    transition={{ duration: 0.3, ease: "easeInOut" }}
                    className='space-y-3'
                  >
                    <motion.div
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.1 }}
                      className="flex items-center justify-between text-sm"
                    >
                      <span className="text-slate-300">{t('discountWoP')} ({sale.remise}%):</span>
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
                      <span className="text-lg font-semibold text-white">{t('finalTotal')}:</span>
                      <motion.span
                        key={p_total}
                        initial={{ opacity: 0, scale: 0.8, x: 20 }}
                        animate={{ opacity: 1, scale: 1, x: 0 }}
                        transition={{ delay: 0.1, type: "spring", stiffness: 200 }}
                        className="text-2xl font-bold text-green-400"
                      >
                        {p_total.toFixed(2)} DA
                      </motion.span>
                    </motion.div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Simple Total - Only show when remise is 0 */}
              <AnimatePresence mode="wait">
                {(!sale || sale.remise === 0) && (
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
                      key={`simple-${currentSubtotal}`}
                      initial={{ opacity: 0, scale: 0.8, x: 20 }}
                      animate={{ opacity: 1, scale: 1, x: 0 }}
                      transition={{ type: "spring", stiffness: 200 }}
                      className="text-2xl font-bold text-green-400"
                    >
                      {currentSubtotal?.toFixed(2)} DA
                    </motion.span>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Show comparison if total has changed */}
              {currentSubtotal?.toFixed(2) !== sale?.total.toFixed(2) && (
                <div className="text-sm text-orange-400 text-right">
                  ({t('original')}: {sale?.total.toFixed(2)} DA)
                </div>
              )}
            </motion.div>

            {/* Warning for insufficient total */}
            {isEditingItems && p_total < totalVersements && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-2 p-4 bg-red-900/30 border border-red-700 text-red-300 rounded-lg"
              >
                <AlertTriangle size={20} />
                <span>
                  {t('purchase.discountMakesTotalSmallerThanPayments2', { p_total: p_total.toFixed(2), totalVersements: totalVersements.toFixed(2) })}
                </span>
              </motion.div>
            )}
          </div>
        ) : (
          <div className="text-center py-8 text-slate-400">
            <Calculator size={48} className="mx-auto mb-4 opacity-50" />
            <p>{t('noItemsYet')}</p>
            {isEditingItems && (
              <p className="text-sm">{t('sales.clickAddProduct')}</p>
            )}
          </div>
        )}
      </div>
      <CancelSaleModal
        isOpen={showCancelModal}
        onClose={() => setShowCancelModal(false)}
        saleItems={saleItems}
        sale={sale}
        p_total={p_total}
        onConfirm={handleCancelSale}
        loading={loading}
      />

      <DeleteSaleModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        sale={sale}
        saleItems={saleItems}
        p_total={p_total}
        onConfirm={handleDeleteSale}
        loading={loading}
      />
      <FinalizeSaleModal
        isOpen={showFinalizeModal}
        onClose={() => setShowFinalizeModal(false)}
        sale={sale}
        onConfirm={handleFinalizeSale}
        loading={loading}
      />
    </div>
  );
};

export default SaleDetails;