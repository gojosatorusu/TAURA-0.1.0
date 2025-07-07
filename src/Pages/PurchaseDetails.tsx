import { useState, useEffect, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { invoke } from '@tauri-apps/api/core';
import { useMessage } from './context/Message';
import { DeletePurchaseModal, CancelPurchaseModal, FinalizePurchaseModal } from '../Components/Modals';
import { useI18n } from './context/I18nContext';
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
  DollarSign,
  CreditCard,
  BookCheck,
  ChevronRight,
  MoreHorizontal,
  Printer
} from 'lucide-react';

interface Purc {
  id: number;
  v_id: number;
  vendor: string;
  code: number;
  current_paid: number;
  date: string;
  description: string;
  doc_type: string; // 'BL' or 'Invoice'
  total: number;
  a_id: number;
  status: string;
  payment_method: string;
  remise: number;
  finalized: number;
}


interface PurcItem {
  r_id: number;
  name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
}

interface Raw {
  id: number;
  name: string;
  quantity: number;
  unit_price: number;
}

interface Versement {
  number: number;
  amount: number;
  date: string; // Changed from Date to string for consistency
}
interface Ids {
  phone: string,
  location: string;
  rc: string;
  ar: string;
  nif: string;
  nis: string;
}

const PurcDetails = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [purc, setPurc] = useState<Purc | null>(location.state);
  const [isExpanded, setIsExpanded] = useState(false);

  const {
    isEditing,
    isEditingItems,
    isEditingVersements,
    setIsEditing,
    setIsEditingItems,
    setIsEditingVersements
  } = useEdit();

  // Data states
  const [purcItems, setPurcItems] = useState<PurcItem[]>([]);
  const [raws, setRaws] = useState<Raw[]>([]);
  const [versements, setVersements] = useState<Versement[]>([]);

  // Loading and message states
  const [loadingData, setLoadingData] = useState(true);
  const [loading, setLoading] = useState(false);

  const [showCancelModal, setShowCancelModal] = useState<boolean>(false);
  const [showDeleteModal, setShowDeleteModal] = useState<boolean>(false);
  const [showFinalizeModal, setShowFinalizeModal] = useState(false);
  const [showVersementSection, setShowVersementSection] = useState(false);


  const [originalPurcItems, setOriginalPurcItems] = useState<PurcItem[]>([]);
  const [Ident, setIdent] = useState<Ids>()
  const [originalVersements, setOriginalVersements] = useState<Versement[]>([]);

  const { t } = useI18n();


  // Edit form state - only editable fields
  const [editForm, setEditForm] = useState({
    description: purc?.description || '',
    date: purc?.date || '',
    payment_method: purc?.payment_method || '',
    remise: String(purc?.remise) || ''
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
  const handleInfo = (infoMessage: string) => {
    addToast({
      message: infoMessage,
      type: 'info',
      duration: 2000
    });
  };
  const handleWarning = (warningMessage: string) => {
    addToast({
      message: warningMessage,
      type: 'warning',
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
    if (!purc) return;

    setLoading(true);
    try {
      // Filter versements to only include current month ones
      const currentMonthVersements = versements.filter(v => isVersementEditable(v.date));

      const versementsToSave = currentMonthVersements.map(v => ({
        amount: v.amount,
        date: v.date,
        number: v.number
      }));

      await invoke('save_versements_purchase', {
        aId: purc.a_id,
        versements: versementsToSave
      });
      setOriginalVersements(versements);

      handleInfo(t('PaymentsSavedSuccessfully'))
    } catch (error) {
      console.error('Error saving versements:', error);
      handleError(t('InvalidPaymentAmount'));
    } finally {
      setLoading(false);
      setIsEditingVersements(false);
    }
  };


  const { discountAmount, currentSubtotal } = useMemo(() => {
    if (!purc) return { discountAmount: 0, finalAmount: 0 };
    const SubTotal = purcItems.reduce((sum, item) => sum + item.total_price, 0);

    const remisePercent = parseFloat(editForm.remise) || 0;
    const discount = (SubTotal * remisePercent) / 100;
    return {
      discountAmount: roundToTwoDecimals(discount),
      currentSubtotal: roundToTwoDecimals(SubTotal)
    };
  }, [purcItems, editForm.remise]);

  const p_total = useMemo(() => {
    if (!purc || !currentSubtotal) return 0;
    const remiseValue = Number(editForm.remise);
    const total = currentSubtotal * (100 - remiseValue) / 100;
    return roundToTwoDecimals(total)
  }, [currentSubtotal, editForm.remise]);

  const totalVersements = useMemo(() => {
    const total = versements.reduce((sum, versement) => sum + versement.amount, 0);
    return roundToTwoDecimals(total)
  }, [versements]);

  const maxAllowedRemise = useMemo(() => {
    if (!purc || purc.total === 0) return 100;
    const maxRemise = 100 - (totalVersements * 100 / purc.total);
    return Math.max(0, Math.min(100, maxRemise));
  }, [purc?.total, totalVersements]);



  const remainingAmount = useMemo(() => {
    const remaining = p_total - totalVersements;
    return roundToTwoDecimals(remaining)
  }, [p_total, totalVersements, currentSubtotal]);

  const isFullyPaid = remainingAmount <= 0;
  const getNewInvoiceCode = async () => {
    try {
      if (!purc || !purc.date) {
        throw new Error('Purc or purc date is not available');
      }
      const year = new Date(purc.date).getFullYear();
      if (!year) {
        throw new Error('no year')
      }
      const result = await invoke('get_new_invoice_code_purchase_for_year', { year });
      return result as number;
    } catch (error) {
      console.error('Error getting new invoice code:', error);
      throw error;
    }
  };
  console.log(purc)
  // Function to get new BL code for a specific vendor
  const getNewBLCodeForVendor = async (vendorId: number) => {
    try {
      if (!purc || !purc.date) {
        throw new Error('Purchase or purchase date is not available');
      }
      const year = new Date(purc.date).getFullYear();
      if (!year) {
        throw new Error('no year')
      }
      const result = await invoke('get_new_bl_code_for_vendor_and_year', { vId: vendorId, year });
      return result as number;
    } catch (error) {
      console.error('Error getting new BL code for vendor:', error);
      throw error;
    }
  };

  // Fetch initial data
  useEffect(() => {
    if (!purc) {
      navigate(-1);
      return;
    }

    const fetchPurcData = async () => {
      try {
        // Fetch purc items
        const purcItemsResult = await invoke('get_purchase_items', { aId: purc.a_id });
        const purcItemsData = purcItemsResult as { r_id: number; quantity: number; unit_price: number }[];
        const IdentResult = await invoke('get_vendor_ids', { vId: purc.v_id })
        const Idents = IdentResult as Ids;
        setIdent(Idents)
        // Fetch raws to get raw details
        const rawResult = await invoke('get_raw_materials');
        const rawData = rawResult as Raw[]

        setRaws(rawData);
        const fullPurcsData = purcItemsData.map((item) => {
          const raw = rawData.find(r => r.id === item.r_id);
          return {
            r_id: item.r_id,
            name: raw?.name || 'Unknown raw',
            quantity: item.quantity,
            unit_price: item?.unit_price || 0,
            total_price: (item?.unit_price || 0) * item.quantity
          };
        });
        setPurcItems(fullPurcsData);
        setOriginalPurcItems([...fullPurcsData]);

        // TODO: Fetch versements data
        const versementsResult = await invoke('get_versements_purchase', { aId: purc.a_id });
        setVersements(versementsResult as Versement[]);
        setOriginalVersements(versementsResult as Versement[]);


        console.log('Purc data fetched:', {
          purcItems: fullPurcsData,
          raws: rawData
        });

      } catch (error) {
        console.error('Error fetching purc data:', error);
        handleError(t('failedToLoad'))
      } finally {
        setLoadingData(false);
      }
    };

    fetchPurcData();
  }, [purc, navigate]);

  // Handle edit toggle
  const handleEditToggle = () => {

    if (isEditing && purc) {
      // Reset form when canceling
      setEditForm({
        description: purc.description,
        date: purc.date,
        payment_method: purc.payment_method,
        remise: String(purc.remise)
      });
    }
    setIsEditing(!isEditing);
  };


  // Handle save changes (only description and date)
  const handleSaveChanges = async () => {
    if (!purc) return;
    handleInfo(t('savingChanges'))

    if (!editForm.date) {
      handleError(t('issueDateRequired'));
      return;
    }

    if (!editForm.payment_method) {
      handleError(t('purchase.paymentMethodRequired'));
      return;
    }

    // Enhanced remise validation
    if (!editForm.remise || Number(editForm.remise) < 0 || Number(editForm.remise) > 100) {
      handleWarning(t('purchase.discountNotAppropriate'))
      return;
    }
    const remiseValue = Math.round(Number(editForm.remise) * 100) / 100;

    // Check if remise would make p_total go below payments
    if (remiseValue > maxAllowedRemise) {
      const minTotal = totalVersements.toFixed(2);
      const maxRemiseFormatted = maxAllowedRemise.toFixed(2);
      handleError(t('purchase.DiscountTooHigh', { minTotal, maxRemiseFormatted }))
      return;
    }

    setLoading(true);
    try {
      handleInfo(t('purchase.updatePurchaseDetails'))
      await invoke('update_purchase', {
        aId: purc.a_id,
        description: editForm.description.trim(),
        date: editForm.date,
        paymentMethod: editForm.payment_method,
        remise: remiseValue
      });

      // Update local state
      setPurc({
        ...purc,
        description: editForm.description.trim(),
        date: editForm.date,
        payment_method: editForm.payment_method,
        remise: remiseValue
      });

      setIsEditing(false);
    } catch (error) {
      console.error('Error updating purchase:', error);
      handleError(t('purchase.failedToUpdate'))
    } finally {
      setLoading(false);
    }
  };

  // Purc Items Management Functions
  const addPurcItem = () => {
    if (raws.length === 0) {
      handleError(t('addProduct.noRawMaterials'));
      return;
    }

    let k = 0;
    while (k < raws.length && purcItems.some(item => item.r_id === raws[k].id)) {
      k++;
    }

    if (k >= raws.length) {
      handleError(t('purchase.allRawAdded'));
      return;
    }

    const selectedraw = raws[k];
    const newItem: PurcItem = {
      r_id: selectedraw.id,
      name: selectedraw.name,
      quantity: 1,
      unit_price: selectedraw.unit_price,
      total_price: selectedraw.unit_price
    };

    setPurcItems(prev => [...prev, newItem]);
  };

  const removePurcItem = (id: number) => {
    setPurcItems(prev => prev.filter(item => item.r_id !== id));
  };

  const updatePurcItem = (id: number, field: 'r_id' | 'quantity', value: string | number) => {
    setPurcItems(prev => prev.map(item => {
      if (item.r_id === id) {
        const updatedItem = { ...item };

        if (field === 'r_id') {
          const selectedraw = raws.find(p => p.id === Number(value));
          if (selectedraw) {
            updatedItem.r_id = selectedraw.id;
            updatedItem.name = selectedraw.name;
            updatedItem.unit_price = selectedraw.unit_price;
            updatedItem.total_price = selectedraw.unit_price * updatedItem.quantity;
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


  // Handle save purc items
  const handleSavePurcItems = async () => {
    if (!purc) return;

    // Calculate new total (full amount without discount)
    const newTotal = roundToTwoDecimals(purcItems.reduce((sum, item) => sum + item.total_price, 0));

    // Calculate what p_total would be with current remise
    const newP_total = roundToTwoDecimals(newTotal * (100 - purc.remise) / 100);

    // Check if new p_total is less than total versements
    if (newP_total < totalVersements) {
      handleError(t('purchase.discountMakesTotalSmallerThanPayments', { totalVersements: totalVersements.toFixed(2), newP_total: newP_total.toFixed(2), remise: purc.remise }));
      return;
    }

    setLoading(true);
    try {
      handleInfo(t('purchase.updatePurchaseItems'))
      const itemsToUpdate = purcItems.map(item => ({
        r_id: item.r_id,
        quantity: item.quantity
      }));

      await invoke('update_purchase_items', {
        aId: purc.a_id,
        newItems: itemsToUpdate,
        total: newTotal // Send the full total to database
      });

      // Update purc total locally
      setPurc({
        ...purc,
        total: newTotal
      });

      setIsEditingItems(false);
    } catch (error) {
      console.error('Error updating purchase items:', error);
      handleError(t('purchase.failedToUpdateItems'))
    } finally {
      setLoading(false);
    }
  };

  const addVersement = () => {
    try {
      // Calculate what the new total would be if we add a payment of $1
      const potentialNewTotal = roundToTwoDecimals(totalVersements + 1);

      if (potentialNewTotal > p_total) {
        throw new Error(t('toatlPaymentsExceedTotal', { potentialNewTotal: potentialNewTotal.toFixed(2), p_total: p_total.toFixed(2) }));
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
      handleWarning(t('noModifyPreviousMonth'));
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

      const roundedAmount = roundToTwoDecimals(amount);

      if (roundedAmount <= 0) {
        throw new Error(t('paymentAmountMustBeGreaterThanZero'));
      }

      // Calculate what the new total would be with this update
      const currentVersement = versements.find(v => v.number === number);
      if (!currentVersement) {
        throw new Error(t('paymentNotFound'));
      }

      const newTotal = roundToTwoDecimals(totalVersements - currentVersement.amount + amount);

      if (newTotal > p_total) {
        throw new Error(t('paymentAmountTooHigh', { newTotal: newTotal.toFixed(2), p_total: p_total.toFixed(2) }));
      }

      setVersements(prev => prev.map(v =>
        v.number === number ? { ...v, amount: roundedAmount } : v
      ));
    } catch (error) {
      handleError(t('failedToUpdatePayment'));
    }
  };

  // Handle clear purc (one versement)
  const handleClearPurc = async () => {
    if (!purc) return;

    setLoading(true);
    try {
      const today = new Date().toISOString().split('T')[0];


      const clearingAmount = roundToTwoDecimals(remainingAmount);
      const clearingVersement = {
        amount: clearingAmount,
        date: today,
        number: versements.length + 1
      };

      // Update local versements
      setVersements(prev => [...prev, clearingVersement]);
      handleSuccess(t('purchase.successToClear'));
    } catch (error) {
      console.error('Error clearing purc:', error);
      handleError(t('purchase.failedToClear'));
    } finally {
      setLoading(false);
    }
  };

  // Handle delete purc
  const handleDeletePurc = async () => {
    if (!purc) return;

    setLoading(true);

    try {
      // Check if this is the latest document before deletion
      if (purc.doc_type === 'BL') {
        const newBLCode = await getNewBLCodeForVendor(purc.v_id);
        if (purc.code !== newBLCode - 1) {
          handleError(t('notLatestBL'));
          return; // Early return, finally block will handle setLoading(false)
        }
      } else if (purc.doc_type === 'Invoice') {
        const newInvoiceCode = await getNewInvoiceCode();
        console.log('New invoice code:', newInvoiceCode, 'Current purc code:', purc.code);
        if (purc.code !== newInvoiceCode - 1) {
          handleError(t('notLatestInvoice'));
          return; // Early return, finally block will handle setLoading(false)
        }
      }

      // Perform the deletion
      await invoke('delete_purchase', { aId: purc.a_id, purchaseItems: purcItems });

      handleSuccess(t('purchase.failedToDelete'));

      setTimeout(() => {
        setShowDeleteModal(false);
      }, 500);
      setTimeout(() => {
        navigate(-1);
      }, 4000);

    } catch (error) {
      console.error('Error deleting purc:', error);

      // Better error handling
      let errorMessage = t('purchase.failedToDelete');

      if (typeof error === 'string') {
        errorMessage = error;
      } else if (error instanceof Error) {
        errorMessage = error.message;
      } else if (error && typeof error === 'object' && 'message' in error) {
        errorMessage = String(error.message);
      }

      handleError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleFinalizePurchase = async () => {
    if (!purc) return;

    setLoading(true);
    try {
      invoke("finalize_purchase", { aId: purc.id })
      purc.finalized = 1;
      handleSuccess(t('purchase.successToFinalize'));
    } catch (error) {
      console.error('Error finalizing sale:', error);
      handleError(t('purchase.failedToFinalize'));
    } finally {
      setLoading(false);
    }
  };
  const handleCancelPurcItemsEdit = () => {
    if (isEditingItems) {
      // Reset purc items to original state when canceling
      setPurcItems([...originalPurcItems]);
    }
    setIsEditingItems(!isEditingItems);
  };

  // Handle cancel purc
  const handleCancelPurc = async () => {
    if (!purc) return;

    setLoading(true);
    try {
      await invoke('cancel_purchase', { aId: purc.a_id, purchaseItems: purcItems });
      handleSuccess(t('purchase.successToCancel'));


      setTimeout(() => {
        setShowCancelModal(false);
      }, 500);

      setTimeout(() => {
        navigate(-1);
      }, 4000);
    } catch (error) {
      console.error('Error cancelling purchase:', error);
      handleError(t('purchase.failedToCancel'));
    } finally {
      setLoading(false);
    }
  };


  const handleInvoiceDavoirPrint = (purcData: Purc, purcItemsData: PurcItem[], idents: Ids) => {
    // Create a new window for printing
    const printWindow = window.open('', '_blank', 'width=800,height=600');
    if (!printWindow) {
      console.error('Unable to open print window');
      return;
    }

    // Generate the complete HTML content with inline styles
    const printContent = generateInvoicePrintHTML(purcData, purcItemsData, idents);

    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.focus();

    // Print after a short delay to ensure content is loaded
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 500);
  };

  const generateInvoicePrintHTML = (purc: Purc, purcItems: PurcItem[], idents: Ids) => {
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
    const sousTotal = purcItems.reduce((sum: number, item: PurcItem) => sum + item.total_price, 0);
    const tauxTVA = sousTotal * 0.19;
    const total = sousTotal + tauxTVA;

    // Generate items rows dynamically based on actual items
    const itemsRows = purcItems.map((item: PurcItem) => `
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
    <title>Facture - ${purc.code}</title>
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

      .vendor-invoice-section {
        display: flex;
        justify-content: space-between;
        margin: 15px 0;
        gap: 15px;
      }

      .vendor-section {
        flex: 1;
        border: 1px solid #666666;
        background: white;
      }

      .vendor-header {
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

      .vendor-content {
        padding: 8px;
      }

      .vendor-table {
        width: 100%;
      }

      .vendor-table td {
        padding: 2px 0;
        border: none;
        font-size: 9px;
      }

      .vendor-table .label {
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

        .vendor-invoice-section {
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

        <div class="document-title">FACTURE \n D'AVOIR</div>
      </div>

      <!-- Vendor and Invoice Info Section -->
      <div class="vendor-invoice-section">
        <!-- Vendor Section -->
        <div class="vendor-section">
          <div class="vendor-header">FACTURÉ À</div>
          <div class="vendor-content">
            <table class="vendor-table">
              <tbody>
                <tr>
                  <td class="label">Vendeur:</td>
                  <td>${purc.vendor}</td>
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
                  <td class="text-right">${purc.code.toString().padStart(3, '0')}</td>
                </tr>
                <tr>
                  <td class="font-bold">DATE</td>
                  <td class="text-right">${formatDate(purc.date)}</td>
                </tr>
                <tr>
                  <td class="font-bold">MODE DE RÈGLEMENT</td>
                  <td class="text-right">${purc.payment_method || 'CHÈQUE'}</td>
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



  const handleBCPrint = (purcData: Purc, purcItemsData: PurcItem[], Idents: Ids) => {
    // Create a new window for printing
    const printWindow = window.open('', '_blank', 'width=800,height=600');
    if (!printWindow) {
      console.error('Unable to open print window');
      return;
    }

    // Generate the complete HTML content with inline styles
    const printContent = generatePrintHTML(purcData, purcItemsData, Idents);

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

  const generatePrintHTML = (purc: Purc, purcItems: PurcItem[], Idents: Ids) => {
    const formatDate = (dateString: string) => {
      const date = new Date(dateString);
      return date.toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    };

    // Generate items rows dynamically based on actual items
    const itemsRows = purcItems.map((item: PurcItem, index: number) => `
    <tr>
      <td class="border-cell text-center font-semibold">${index + 1}</td>
      <td class="border-cell">${item.name}</td>
      <td class="border-cell text-center">${item.quantity}</td>
    </tr>
  `).join('');

    return `
    <!DOCTYPE html>
<html>
  <head>
    <title>Bon de Commande - ${purc.code}</title>
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

      .vendor-section {
        display: flex;
        justify-content: space-between;
        margin: 15px 0;
        gap: 15px;
      }

      .vendor-info, .company-info {
        flex: 1;
        border: 2px solid #000;
        background: white;
      }

      .vendor-header, .company-header {
        background: #f0f0f0;
        color: black;
        padding: 8px;
        font-weight: bold;
        text-align: center;
        font-size: 12px;
        border-bottom: 1px solid #000;
        /* Force print colors */
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }

      .vendor-content, .company-content {
        padding: 10px;
      }

      .vendor-table, .company-table {
        width: 100%;
      }

      .vendor-table td, .company-table td {
        padding: 2px 0;
        border: none;
        font-size: 10px;
      }

      .vendor-table .label, .company-table .label {
        font-weight: bold;
        width: 35px;
        color: black;
      }

      .items-table {
        margin: 15px 0;
        border: 2px solid #000;
      }

      .bg-gray {
        background: #f0f0f0 !important;
        /* Force print colors */
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
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
        /* Force print colors */
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
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

      .amount-words {
        margin: 12px 0;
        padding: 8px;
        border: 2px solid #000;
        background: #f8f8f8;
        font-size: 11px;
        font-style: italic;
        text-align: center;
        color: black;
        font-weight: 500;
        /* Force print colors */
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
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

        /* Ensure all colored elements print with colors */
        .bg-gray,
        .vendor-header,
        .company-header,
        .amount-words,
        .logo-circle {
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }

        /* Alternative approach using borders for gray backgrounds */
        .bg-gray-alt {
          background: transparent !important;
          border-top: 8px solid #ddd !important;
          border-bottom: 8px solid #ddd !important;
        }
      }

      /* Global color adjustment for entire page */
      html {
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
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
          <div class="document-title">BON DE COMMANDE</div>
          <table class="border-thick">
            <tbody>
              <tr>
                <td class="border-cell font-semibold bg-gray">DATE</td>
                <td class="border-cell">${formatDate(purc.date)}</td>
              </tr>
              <tr>
                <td class="border-cell font-semibold bg-gray">BC N°</td>
                <td class="border-cell">${purc.code.toString().padStart(8, '0')}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Vendor and Company Info Section -->
      <div class="vendor-section">
        <!-- Vendor Section -->
        <div class="vendor-info">
          <div class="vendor-header">VENDEUR</div>
          <div class="vendor-content">
            <table class="vendor-table">
              <tbody>
                <tr>
                  <td class="label">Vendeur:</td>
                  <td>${purc.vendor}</td>
                </tr>
                <tr>
                  <td class="label">Adresse:</td>
                  <td>${Idents?.location ?? ''}</td>
                </tr>
                <tr>
                  <td class="label">RC:</td>
                  <td>${Idents?.rc ?? ''}</td>
                </tr>
                <tr>
                  <td class="label">AR:</td>
                  <td>${Idents?.ar ?? ''}</td>
                </tr>
                <tr>
                  <td class="label">NIF:</td>
                  <td>${Idents?.nif ?? ''}</td>
                </tr>
                <tr>
                  <td class="label">NIS:</td>
                  <td>${Idents?.nis ?? ''}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- Company Info Section -->
        <div class="company-info">
          <div class="company-header">SARL AFRICA PURE LAB</div>
          <div class="company-content">
            <table class="company-table">
              <tbody>
                <tr>
                  <td class="label">Adresse:</td>
                  <td>CITÉ DJEBEL EL OUAHCH VILLA N°558, CONSTANTINE</td>
                </tr>
                <tr>
                  <td class="label">Téléphone:</td>
                  <td>05 42 28 94 31</td>
                </tr>
                <tr>
                  <td class="label">RC:</td>
                  <td>23B0624700 00/25</td>
                </tr>
                <tr>
                  <td class="label">AR:</td>
                  <td>25016726675</td>
                </tr>
                <tr>
                  <td class="label">NIF:</td>
                  <td>002335007420686</td>
                </tr>
                <tr>
                  <td class="label">NIS:</td>
                  <td>-</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- Items Table -->
      <table class="items-table">
        <thead>
          <tr class="bg-gray">
            <th class="border-cell text-center font-semibold" style="width: 60px;">N° Article</th>
            <th class="border-cell text-center font-semibold">Désignation</th>
            <th class="border-cell text-center font-semibold" style="width: 100px;">Quantité</th>
          </tr>
        </thead>
        <tbody>
          ${itemsRows}
        </tbody>
      </table>
    </div>
  </body>
</html>
`;
  };

  const handlePrintDirect = () => {
    if (!purc || !purcItems || !Ident) {
      console.error('No purc data available for printing');
      handleError(t('purchase.noPurchaseDateToPrint'))
      return;
    }
    console.log(Ident.location, '  hhh   ', Ident.phone)
    if (purc.status == 'Approved') {
      handleBCPrint(purc, purcItems, Ident);
    }
    else if (purc.status == 'Cancelled') {
      handleInvoiceDavoirPrint(purc, purcItems, Ident)
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
          {t('purchase.loadingPurchaseData')}
        </div>
      </div>
    );
  }

  if (!purc) {
    handleError('Purchase Not found')
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center text-slate-400">
          <AlertCircle size={48} className="mx-auto mb-4" />
          <p>{t('purchase.notFound')} </p>
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
        {purc.status === "Approved" && (
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
              {purc.finalized !== 1 && (
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
                title={`${t('print')} ${purc.status === 'Approved' ? "BC" : "FA"}`}
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

      {/* Purc Information */}
      <div className="bg-slate-900 p-6 rounded-xl shadow-md border border-slate-700">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <Receipt className="text-blue-500" size={28} />
            {purc.doc_type} #{purc.code}
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
              {purc.doc_type}
            </div>
          </div>

          {/* Vendor - Non-editable */}
          <div>
            <label className="text-sm font-medium text-slate-300 mb-2 flex items-center gap-2">
              <User size={16} />
              {t('vendor')}
            </label>
            <div className="w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-lg text-white">
              {purc.vendor}
            </div>
          </div>

          {/* Document Code - Non-editable */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              {t('documentCode')}
            </label>
            <div className="w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-lg text-white">
              {purc.code}
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-slate-300 mb-2 flex items-center gap-2">
              <User size={16} />
              {t('status')}
            </label>
            <div className="w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-lg text-white">
              {purc.status}
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
                {new Date(purc.date).toLocaleDateString()}
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
              {p_total} DA
            </div>
          </div>
          {(purc.doc_type === 'Invoice') &&
            <div className="lg:col-span-3">
              <label className="block text-sm font-medium text-slate-300 mb-2">
                {t('paymentMethod')}
              </label>
              {isEditing ? (
                <textarea
                  title="PaymentMethod"
                  value={editForm.payment_method}
                  onChange={(e) => setEditForm(prev => ({ ...prev, payment_method: e.target.value }))}
                  className="w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  rows={1}
                  disabled={loading}
                />
              ) : (
                <div className="w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-lg text-white min-h-[80px]">
                  {purc.payment_method}
                </div>
              )}
            </div>
          }

          {purc.doc_type === 'BL' && (
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
                    handleError(`Remise cannot exceed ${maxAllowedRemise.toFixed(1)}% (would make total below payments)`);
                  } else if (numValue > 50 && purc.doc_type === 'BL') {
                    handleError('Remise for Bon de Livraison cannot exceed 50%');
                  }
                  setEditForm(prev => ({ ...prev, remise: value }));
                }}
                min="0"
                max={Math.min(maxAllowedRemise, purc.doc_type === 'BL' ? 50 : 100)}
                step="0.01"
                className={`w-full px-4 py-3 bg-slate-800 border rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:border-transparent ${Number(editForm.remise) > maxAllowedRemise || (Number(editForm.remise) > 50 && purc.doc_type === 'BL')
                  ? 'border-red-500 focus:ring-red-500'
                  : 'border-slate-600 focus:ring-green-500'
                  }`}
                placeholder="0%"
                disabled={loading || !isEditing}
              />
              {/* Live preview of p_total after remise */}
              {isEditing && editForm.remise && Number(editForm.remise) > 0 && Number(editForm.remise) < 100 && purc && (
                <div className="mt-2 text-sm text-slate-400">
                  Preview: {purc.total.toFixed(2)} DA - {discountAmount.toFixed(2)} = {(p_total).toFixed(2)} DA
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
                {purc.description}
              </div>
            )}
          </div>
        </div>
      </div>

      {purc.status === "Approved" && purc.finalized === 1 &&(
        <div className="bg-slate-900 p-6 rounded-xl shadow-md border border-slate-700">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-white flex items-center gap-3">
              <CreditCard className="text-green-500" size={24} />
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
              {showVersementSection ? t('hide') : t('show')} {t('details')}
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
              <div className="text-lg font-semibold text-green-400">{totalVersements.toFixed(2)} DA</div>
            </div>
            <div className="bg-slate-800 p-4 rounded-lg border border-slate-600">
              <div className="text-sm text-slate-400 mb-1">{t('remaining')}</div>
              <div className={`text-lg font-semibold ${remainingAmount > 0 ? 'text-orange-400' : 'text-green-400'}`}>
                {remainingAmount.toFixed(2)} DA
              </div>
            </div>
            <div className="bg-slate-800 p-4 rounded-lg border border-slate-600">
              <div className="text-sm text-slate-400 mb-1">{t('status')}</div>
              <div className={`text-lg font-semibold ${isFullyPaid ? 'text-green-400' : 'text-orange-400'}`}>
                {isFullyPaid ? t('paid') : t('pending')}
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
                            // Cancel editing - reset versements to original state
                            setVersements(originalVersements);
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
                          className="flex items-center gap-2 px-3 py-2 bg-green-600 hover:bg-green-700 disabled:bg-green-800 text-white rounded-lg transition-colors text-sm"
                        >
                          <Save size={16} />
                          {t('savePayments')}
                        </button>
                      )}

                      {/* Clear Purchase - Only visible in editing mode and when not fully paid */}
                      {isEditingVersements && !isFullyPaid && (
                        <button
                          onClick={handleClearPurc}
                          disabled={loading || remainingAmount <= 0}
                          className="flex items-center gap-2 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-800 disabled:opacity-50 text-white rounded-lg transition-colors text-sm"
                        >
                          <DollarSign size={16} />
                          {t('purchaseDetails.clearPurchase')}
                        </button>
                      )}

                      {/* Add Payment - Only visible in editing mode */}
                      {isEditingVersements && (
                        <button
                          onClick={addVersement}
                          className="flex items-center gap-2 px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors text-sm"
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
                                {t('date')}
                              </th>
                              <th className="px-6 py-4 text-center text-sm font-semibold text-slate-200 uppercase tracking-wide">
                                {t('status')}
                              </th>
                              {isEditingVersements && (
                                <th className="px-6 py-4 text-center text-sm font-semibold text-slate-200 uppercase tracking-wide">
                                  {t('actions')}
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
                                          ? 'bg-gradient-to-br from-green-500 to-green-600'
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
                                          ? 'bg-green-900/30'
                                          : 'bg-gray-900/30'
                                          }`}>
                                          <DollarSign size={16} className={canEdit ? 'text-green-400' : 'text-gray-400'} />
                                        </div>
                                        <div className="relative">
                                          <input
                                            type="number"
                                            value={versement.amount}
                                            onChange={(e) => updateVersement(Number(versement.number), Number(e.target.value))}
                                            disabled={!canEdit}
                                            className={`w-36 px-4 py-2 border-2 rounded-lg font-semibold focus:outline-none transition-all duration-200 ${canEdit
                                              ? 'bg-slate-700/80 border-slate-600 hover:border-green-500 focus:border-green-400 text-white focus:bg-slate-700'
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
                                          <span className="px-2 py-1 bg-green-900/30 border border-green-600 text-green-300 rounded-full text-xs font-semibold">
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
                              <span className="ml-2 px-3 py-1 bg-green-900/30 border border-green-600 text-green-300 rounded font-bold">
                                {totalVersements.toFixed(2)} DA
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-3">
                            {remainingAmount > 0 ? (
                              <div className="px-3 py-1 bg-orange-900/30 border border-orange-600 text-orange-300 rounded-full text-sm font-semibold">
                                {remainingAmount.toFixed(2)} DA {t('remaining')}
                              </div>
                            ) : (
                              <div className="px-3 py-1 bg-green-900/30 border border-green-600 text-green-300 rounded-full text-sm font-semibold flex items-center gap-1">
                                <CheckCircle size={14} />
                                {t('purchaseDetails.fullyPaid')}
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
                          <p className="text-slate-400 text-sm mt-1">{t('purchaseDetails.addFirstPayment')}</p>
                        </div>
                        {isEditingVersements && (
                          <button
                            onClick={addVersement}
                            className="mt-4 flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors mx-auto"
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

      {/* Purc Items Section */}
      <div className="bg-slate-900 p-6 rounded-xl shadow-md border border-slate-700">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white flex items-center gap-3">
            <Calculator className="text-purple-500" size={24} />
            {t('purchaseDetails.purchaseItems')}
          </h2>
          <div className="flex items-center gap-2">
            {isEditingItems && (
              <button
                onClick={handleSavePurcItems}
                disabled={loading}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-green-800 text-white rounded-lg transition-colors"
              >
                <Save size={16} />
                {t('purchaseDetails.saveItems')}
              </button>
            )}
            {purc.status === "Approved" && purc.finalized === 1 && (
              <button
                onClick={handleCancelPurcItemsEdit}
                className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
              >
                {isEditingItems ? <X size={16} /> : <Edit3 size={16} />}
                {isEditingItems ? t('cancel') : t('purchaseDetails.editItems')}
              </button>)}
          </div>
        </div>

        {/* Items List */}
        {purcItems.length > 0 ? (
          <div className="space-y-4">
            <AnimatePresence>
              {purcItems.map((item, index) => (
                <motion.div
                  key={item.r_id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ delay: index * 0.05 }}
                  className="bg-slate-800 p-4 rounded-lg border border-slate-600"
                >
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
                    {/* Raw Selection */}
                    <div className="md:col-span-4">
                      <label className="block text-sm font-medium text-slate-300 mb-2">
                        {t('raw')}
                      </label>
                      {isEditingItems ? (
                        <select
                          title='raw'
                          value={item.r_id}
                          onChange={(e) => updatePurcItem(item.r_id, 'r_id', e.target.value)}
                          className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                          disabled={loading}
                        >
                          {raws.map((raw) => (
                            <option
                              key={raw.id}
                              value={raw.id}
                              disabled={purcItems.some(pItem => pItem.r_id === raw.id && pItem.r_id !== item.r_id)}
                            >
                              {raw.name} {purcItems.some(pItem => pItem.r_id === raw.id && pItem.r_id !== item.r_id) ? '(Already added)' : ''}
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
                        {t('quantity')}
                      </label>
                      {isEditingItems ? (
                        <div className="space-y-1">
                          <input
                            title="quantity"
                            type="number"
                            value={item.quantity}
                            onChange={(e) => updatePurcItem(item.r_id, 'quantity', e.target.value)}
                            className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                            min="1"
                            disabled={loading}
                          />
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
                          onClick={() => removePurcItem(item.r_id)}
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
                onClick={addPurcItem}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-slate-600 hover:border-purple-500 text-slate-400 hover:text-purple-400 rounded-lg transition-colors group"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Plus size={20} className="group-hover:rotate-90 transition-transform duration-200" />
                {t('purchase.addRawMaterial')}
              </motion.button>
            )}

            {/* Items Summary with Remise Logic */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-slate-800 p-4 rounded-lg border border-slate-600 space-y-2 "
            >
              <div className="flex justify-between items-center">
                <div className="text-slate-300">
                  <span className="font-medium">Items: {purcItems.length}</span>
                  <span className="mx-4">•</span>
                  <span className="font-medium">
                    {t('purchaseDetails.totalQuantity', { count: purcItems.reduce((sum, item) => sum + item.quantity, 0) })}
                  </span>
                </div>
              </div>

              {purc.doc_type === "BL" && (
                <motion.div
                  layout
                  className="flex items-center gap-1 justify-between"
                >
                  <span className="text-lg font-semibold text-white">{t('subtotal')}:</span>
                  <motion.span
                    key={currentSubtotal}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="text-xl font-bold text-white"
                  >
                    {currentSubtotal?.toFixed(2)}DA
                  </motion.span>
                </motion.div>)
              }

              {/* Remise Section - Only show if remise > 0 */}
              <AnimatePresence mode="wait">
                {purc && purc.remise > 0 && (
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
                      <span className="text-slate-300">{t('discountWoP')} ({purc.remise}%):</span>
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
                {(!purc || purc.remise === 0) && (
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
                  {t('purchase.discountMakesTotalSmallerThanPayments2', {
                    totalVersements: totalVersements.toFixed(2),
                    newP_total: p_total.toFixed(2)
                  })}
                </span>
              </motion.div>
            )}
          </div>
        ) : (
          <div className="text-center py-8 text-slate-400">
            <Calculator size={48} className="mx-auto mb-4 opacity-50" />
            <p>{t('purchase.NoItems')}</p>
            {isEditingItems && (
              <p className="text-sm">{t('purchase.ClickAddRaw')}</p>
            )}
          </div>
        )}
      </div>
      <CancelPurchaseModal
        isOpen={showCancelModal}
        onClose={() => setShowCancelModal(false)}
        purc={purc}
        purcItems={purcItems}
        p_total={p_total}
        onConfirm={handleCancelPurc}
        loading={loading}
      />

      <DeletePurchaseModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        purc={purc}
        purcItems={purcItems}
        p_total={p_total}
        onConfirm={handleDeletePurc}
        loading={loading}
      />
      <FinalizePurchaseModal
        isOpen={showFinalizeModal}
        onClose={() => setShowFinalizeModal(false)}
        purc={purc}
        onConfirm={handleFinalizePurchase}
        loading={loading}
      />
    </div>
  );
};

export default PurcDetails
