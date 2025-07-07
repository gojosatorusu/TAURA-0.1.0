import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Trash2, AlertTriangle, UserX, ArrowUpCircle, DollarSign, ArrowDownCircle, TrendingUp, AlertCircle, TrendingDown, Printer, Calendar, BarChart3 } from 'lucide-react';
import { createPortal } from 'react-dom';
import { invoke } from "@tauri-apps/api/core";
import { useI18n } from '../Pages/context/I18nContext';


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



interface ProductSummary {
  p_id: number;
  name: string;
  initial: number;
  production: number;
  sold: number;
  returned: number;
  adjusted: number;
  final_stock: number;
}

interface StockSummaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  loading?: boolean;
}

interface PurchaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  purc: Purc;
  purcItems?: PurcItem[];
  p_total?: number;
  onConfirm: () => void;
  loading: boolean;
}

interface PersonModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  loading: boolean;
  Name: String;
}

interface SaleModalProps {
  isOpen: boolean;
  onClose: () => void;
  sale: Sale;
  saleItems?: SaleItem[];
  p_total?: number;
  onConfirm: () => void;
  loading: boolean;
}

interface Product {
  id: number;
  name: string;
  quantity: number;
  threshold: number;
  unit_price: number;
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

interface ProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product;
  onConfirm: () => void;
  loading: boolean;
}
interface RawModalProps {
  isOpen: boolean;
  onClose: () => void;
  raw: RawMaterial;
  onConfirm: () => void;
  loading: boolean;
}
interface TreasuryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (amount: number) => void;
  loading?: boolean;
  currentBalance?: number;
}

// Modal Portal Component
interface ModalPortalProps {
  children: React.ReactNode;
  isOpen: boolean;
}

const ModalPortal: React.FC<ModalPortalProps> = ({ children, isOpen }) => {
  const [modalRoot, setModalRoot] = useState<HTMLElement | null>(null);

  useEffect(() => {
    let root = document.getElementById('modal-root');
    if (!root) {
      root = document.createElement('div');
      root.id = 'modal-root';
      document.body.appendChild(root);
    }
    setModalRoot(root);
  }, []);

  if (!modalRoot || !isOpen) return null;
  return createPortal(children, modalRoot);
};

export const StockSummaryModal: React.FC<StockSummaryModalProps> = ({
  isOpen,
  onClose,
  loading = false
}) => {
  const { t } = useI18n()

  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [productSummaries, setProductSummaries] = useState<ProductSummary[]>([]);
  const [fetchingData, setFetchingData] = useState(false);

  // Initialize dates to today
  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    setStartDate(today);
    setEndDate(today);
  }, []);

  // Check if print button should be enabled
  const isPrintEnabled = startDate && endDate && new Date(endDate) >= new Date(startDate) && !fetchingData;

  // Fetch product summaries
  const fetchProductSummaries = async () => {
    if (!startDate || !endDate) return;

    setFetchingData(true);
    try {
      // Replace with your actual Tauri invoke call
      const summaries = await invoke('get_product_summary', {
        startDate,
        endDate,
      }) as ProductSummary[];
      setProductSummaries(summaries);
    } catch (error) {
      console.error('Failed to fetch product summaries:', error);
      setProductSummaries([]);
    } finally {
      setFetchingData(false);
    }
  };

  // Fetch data when dates change
  useEffect(() => {
    if (isOpen && isPrintEnabled) {
      fetchProductSummaries();
    }
  }, [startDate, endDate, isOpen]);

  const generateStockSummaryHTML = (summaries: ProductSummary[], startDate: string, endDate: string) => {
    const formatDate = (dateString: string) => {
      const date = new Date(dateString);
      return date.toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    };

    const summaryRows = summaries.map((item, index) => `
      <tr class="${index % 2 === 0 ? 'row-even' : 'row-odd'}">
        <td class="border-cell product-name">${item.name}</td>
        <td class="border-cell text-center">${item.initial}</td>
        <td class="border-cell text-center production-cell">${item.production}</td>
        <td class="border-cell text-center sold-cell">${item.sold}</td>
        <td class="border-cell text-center adjusted-cell">${item.adjusted}</td>
        <td class="border-cell text-center final-cell">${item.final_stock}</td>
      </tr>
    `).join('');

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Résumé de Stock - ${formatDate(startDate)} au ${formatDate(endDate)}</title>
          <meta charset="UTF-8" />
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
            
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }

            body {
              font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
              font-size: 11px;
              color: #374151;
              background: linear-gradient(135deg, #fdf2f8 0%, #ffffff 100%);
              padding: 16px;
              line-height: 1.4;
            }

            .container {
              max-width: 210mm;
              margin: 0 auto;
              background: white;
              border-radius: 16px;
              box-shadow: 0 25px 50px -12px rgba(190, 24, 93, 0.1);
              overflow: hidden;
            }

            .decorative-border {
              height: 6px;
              background: linear-gradient(90deg, #be185d, #ec4899, #f472b6, #ec4899, #be185d);
            }

            table {
              border-collapse: collapse;
              width: 100%;
              background: white;
            }

            .border-cell {
              border: 1px solid #e5e7eb;
              padding: 8px 12px;
              font-size: 10px;
              background: white;
              transition: all 0.2s ease;
            }

            .header-section {
              background: linear-gradient(135deg, #be185d 0%, #ec4899 50%, #f472b6 100%);
              padding: 24px;
              color: white;
              position: relative;
              overflow: hidden;
            }

            .header-section::before {
              content: '';
              position: absolute;
              top: -50%;
              right: -50%;
              width: 200%;
              height: 200%;
              background: radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%);
              animation: shimmer 3s ease-in-out infinite;
            }

            @keyframes shimmer {
              0%, 100% { transform: translateX(-100%) translateY(-100%) rotate(0deg); }
              50% { transform: translateX(-50%) translateY(-50%) rotate(180deg); }
            }

            .header-content {
              display: flex;
              justify-content: space-between;
              align-items: center;
              position: relative;
              z-index: 2;
            }

            .company-info {
              flex: 1;
            }

            .company-name {
              font-size: 22px;
              font-weight: 700;
              margin-bottom: 12px;
              text-shadow: 0 2px 4px rgba(0,0,0,0.1);
              letter-spacing: 0.5px;
            }

            .company-details {
              font-size: 12px;
              line-height: 1.6;
              font-weight: 400;
              opacity: 0.95;
            }

            .logo-section {
              margin: 0 24px;
              text-align: center;
            }

            .logo-circle {
              width: 80px;
              height: 80px;
              background: linear-gradient(135deg, rgba(255,255,255,0.2), rgba(255,255,255,0.1));
              border-radius: 50%;
              display: inline-flex;
              align-items: center;
              justify-content: center;
              color: white;
              font-weight: 700;
              font-size: 20px;
              border: 3px solid rgba(255,255,255,0.3);
              box-shadow: 0 8px 32px rgba(0,0,0,0.1);
              backdrop-filter: blur(10px);
            }

            .document-title {
              font-size: 32px;
              font-weight: 800;
              color: white;
              text-align: center;
              flex: 1;
              letter-spacing: 3px;
              text-shadow: 0 2px 8px rgba(0,0,0,0.2);
            }

            .date-range {
              text-align: center;
              margin: 24px;
              padding: 16px;
              background: linear-gradient(135deg, #fdf2f8, #fce7f3);
              border: 2px solid #f9a8d4;
              border-radius: 12px;
              font-size: 14px;
              font-weight: 600;
              color: #be185d;
              box-shadow: 0 4px 12px rgba(244, 114, 182, 0.1);
            }

            .summary-table {
              margin: 0 24px 24px 24px;
              border-radius: 12px;
              overflow: hidden;
              box-shadow: 0 4px 12px rgba(0,0,0,0.05);
              border: 1px solid #f3f4f6;
            }

            .summary-header {
              background: linear-gradient(135deg, #be185d, #ec4899);
              color: white;
            }

            .summary-header th {
              padding: 14px 12px;
              font-size: 11px;
              font-weight: 600;
              text-align: center;
              text-transform: uppercase;
              letter-spacing: 0.5px;
              border-right: 1px solid rgba(255,255,255,0.2);
            }

            .summary-header th:last-child {
              border-right: none;
            }

            .row-even {
              background: #fafafa;
            }

            .row-odd {
              background: white;
            }

            .product-name {
              font-weight: 600;
              color: #1f2937;
              background: linear-gradient(135deg, #fdf2f8, #fce7f3) !important;
            }

            .production-cell {
              color: #059669 !important;
              font-weight: 600;
            }

            .sold-cell {
              color: #dc2626 !important;
              font-weight: 600;
            }

            .adjusted-cell {
              color: #d97706 !important;
              font-weight: 600;
            }

            .final-cell {
              background: linear-gradient(135deg, #fdf2f8, #fce7f3) !important;
              color: #be185d !important;
              font-weight: 700;
            }

            .text-center {
              text-align: center;
            }

            .footer-info {
              margin: 24px;
              text-align: center;
              font-size: 10px;
              line-height: 1.6;
              color: #6b7280;
              padding: 20px;
              background: linear-gradient(135deg, #f9fafb, #f3f4f6);
              border-radius: 12px;
              border: 1px solid #e5e7eb;
            }

            .footer-info strong {
              color: #be185d;
              font-weight: 600;
            }

            @media print {
              body {
                margin: 0;
                padding: 8px;
                font-size: 10px;
                background: white;
              }

              .container {
                margin: 0;
                padding: 0;
                box-shadow: none;
                border-radius: 0;
              }

              .header-section {
                margin-bottom: 16px;
                padding: 20px;
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
              }

              .date-range {
                margin: 16px 0;
                padding: 12px;
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
              }

              .summary-table {
                margin: 0 0 16px 0;
              }

              .summary-header {
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
              }

              .product-name, .final-cell {
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
              }

              .footer-info {
                margin-top: 16px;
                padding: 12px;
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
              }
            }
          </style>
        </head>

        <body>
          <div class="container">
            <div class="decorative-border"></div>
            
            <!-- Header Section -->
            <div class="header-section">
              <div class="header-content">
                <div class="company-info">
                  <div class="company-name">SARL AFRICA PURE LAB</div>
                  <div class="company-details">
                    CITÉ DJEBEL EL OUAHCH VILLA N°558<br>
                    CONSTANTINE<br>
                    Téléphone : 05 42 28 94 31
                  </div>
                </div>

                <div class="logo-section">
                  <div class="logo-circle">APL</div>
                </div>

                <div class="document-title">RÉSUMÉ DE STOCK</div>
              </div>
            </div>

            <!-- Date Range -->
            <div class="date-range">
              📊 Période d'analyse : du ${formatDate(startDate)} au ${formatDate(endDate)}
            </div>

            <!-- Summary Table -->
            <table class="summary-table">
              <thead class="summary-header">
                <tr>
                  <th style="width: 25%;">Produit</th>
                  <th style="width: 12.5%;">Stock Initial</th>
                  <th style="width: 12.5%;">Production</th>
                  <th style="width: 12.5%;">Vendu</th>
                  <th style="width: 12.5%;">Ajusté</th>
                  <th style="width: 12.5%;">Stock Final</th>
                </tr>
              </thead>
              <tbody>
                ${summaryRows}
              </tbody>
            </table> 
          </div>
        </body>
      </html>
    `;
  };

  const handlePrint = () => {
    if (!isPrintEnabled || productSummaries.length === 0) return;

    // Create a new window for printing
    const printWindow = window.open('', '_blank', 'width=800,height=600');
    if (!printWindow) {
      console.error('Unable to open print window');
      return;
    }

    // Generate the complete HTML content with inline styles
    const printContent = generateStockSummaryHTML(productSummaries, startDate, endDate);
    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.focus();

    // Print after a short delay to ensure content is loaded
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 500);
  };

  const handleStartDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newStartDate = e.target.value;
    setStartDate(newStartDate);

    // If end date is before new start date, update end date
    if (endDate && new Date(endDate) < new Date(newStartDate)) {
      setEndDate(newStartDate);
    }
  };

  const handleEndDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newEndDate = e.target.value;

    // Only update if end date is >= start date
    if (new Date(newEndDate) >= new Date(startDate)) {
      setEndDate(newEndDate);
    }
  };

  if (!isOpen) return null;

  return (
    <ModalPortal isOpen={isOpen}>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
          >
            {/* Professional dark backdrop with subtle rose accent */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onClose}
              className="absolute inset-0 bg-gradient-to-br from-slate-900/80 via-slate-800/60 to-slate-900/90 backdrop-blur-md"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 30 }}
              transition={{ duration: 0.3, ease: [0.34, 1.56, 0.64, 1] }}
              className="relative max-w-md w-full mx-4"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Glass morphism container with dark theme */}
              <div className="bg-gradient-to-br from-slate-800/90 via-slate-850/90 to-slate-900/90 backdrop-blur-xl border border-slate-700/50 rounded-3xl shadow-2xl overflow-hidden">
                {/* Subtle rose accent glow */}
                <div className="absolute inset-0 bg-gradient-to-r from-rose-500/5 to-rose-400/5 rounded-3xl"></div>

                {/* Header */}
                <div className="relative px-8 py-6 border-b border-slate-700/50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="relative">
                        <div className="w-12 h-12 bg-gradient-to-br from-rose-500/20 to-rose-400/20 rounded-2xl flex items-center justify-center backdrop-blur-sm border border-rose-400/20">
                          <BarChart3 className="text-rose-300" size={22} />
                        </div>
                        <div className="absolute -inset-1 bg-gradient-to-r from-rose-500/20 to-rose-400/20 rounded-2xl blur opacity-50"></div>
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-white drop-shadow-sm">{t('stockSummary')}</h3>
                        <p className="text-sm text-slate-300">{t('generateDetailed')}</p>
                      </div>
                    </div>
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={onClose}
                      className="w-11 h-11 bg-slate-700/50 hover:bg-slate-600/50 rounded-2xl flex items-center justify-center text-slate-400 hover:text-white transition-all duration-200 backdrop-blur-sm border border-slate-600/50"
                    >
                      <X size={16} />
                    </motion.button>
                  </div>
                </div>

                {/* Content */}
                <div className="relative px-8 py-8">
                  <div className="space-y-6">

                    {/* Date selection */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className=" text-sm font-medium text-slate-300 mb-3 flex items-center gap-2">
                          <Calendar size={16} className="text-rose-400" />
                          {t('modal.startDate')}
                        </label>
                        <input
                          title='start'
                          type="date"
                          value={startDate}
                          onChange={handleStartDateChange}
                          className="w-full px-3 py-3 bg-slate-800/50 border border-slate-600/50 rounded-2xl focus:outline-none focus:ring-2 focus:ring-rose-500/50 focus:border-rose-400/50 transition-all duration-200 text-white backdrop-blur-sm"
                          disabled={loading || fetchingData}
                        />
                      </div>

                      <div>
                        <label className=" text-sm font-medium text-slate-300 mb-3 flex items-center gap-2">
                          <Calendar size={16} className="text-rose-400" />
                          {t('modal.endDate')}
                        </label>
                        <input
                          title='end'
                          type="date"
                          value={endDate}
                          onChange={handleEndDateChange}
                          min={startDate}
                          className="w-full px-3 py-3 bg-slate-800/50 border border-slate-600/50 rounded-2xl focus:outline-none focus:ring-2 focus:ring-rose-500/50 focus:border-rose-400/50 transition-all duration-200 text-white backdrop-blur-sm"
                          disabled={loading || fetchingData}
                        />
                      </div>
                    </div>

                    <div className="flex gap-4 pt-4">
                      <motion.button
                        whileHover={{ scale: 1.02, y: -2 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={onClose}
                        disabled={loading}
                        className="flex-1 px-6 py-4 bg-gradient-to-r from-slate-700/50 to-slate-600/50 hover:from-slate-600/50 hover:to-slate-500/50 text-white font-semibold rounded-2xl transition-all duration-200 backdrop-blur-sm border border-slate-600/50 hover:border-slate-500/50"
                      >
                        {t('cancel')}
                      </motion.button>

                      <motion.button
                        whileHover={{ scale: 1.02, y: -2 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={handlePrint}
                        disabled={!isPrintEnabled || loading}
                        className="flex-1 flex items-center justify-center gap-3 px-6 py-4 bg-gradient-to-r from-rose-600/80 to-rose-500/80 hover:from-rose-600 hover:to-rose-500 disabled:from-slate-600/50 disabled:to-slate-500/50 text-white font-semibold rounded-2xl transition-all duration-200 backdrop-blur-sm border border-rose-500/20 shadow-lg shadow-rose-500/20"
                      >
                        {loading ? (
                          <>
                            <motion.div
                              animate={{ rotate: 360 }}
                              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                              className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full"
                            />
                            <span>{t('modal.printing')}</span>
                          </>
                        ) : (
                          <>
                            <Printer size={18} />
                            <span>{t('modal.printReport')}</span>
                          </>
                        )}
                      </motion.button>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </ModalPortal>
  );
};

// Cancel Purchase Modal
export const CancelPurchaseModal: React.FC<PurchaseModalProps> = ({ isOpen, onClose, purc, purcItems, p_total, onConfirm, loading }) => {
  const { t } = useI18n()

  return (
    <ModalPortal isOpen={isOpen}>
      <AnimatePresence>
        {isOpen && purcItems && p_total && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
          >
            {/* Enhanced backdrop with orange tint */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onClose}
              className="absolute inset-0 bg-gradient-to-br from-orange-900/20 via-black/50 to-amber-900/20 backdrop-blur-md"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 30 }}
              transition={{ duration: 0.3, ease: [0.34, 1.56, 0.64, 1] }}
              className="relative max-w-md w-full mx-4"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Glass morphism container with orange tint */}
              <div className="bg-gradient-to-br from-orange-500/10 via-white/5 to-amber-500/10 backdrop-blur-xl border border-orange-300/20 rounded-3xl shadow-2xl overflow-hidden">
                {/* Subtle glow effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-orange-400/5 to-amber-400/5 rounded-3xl"></div>

                {/* Header */}
                <div className="relative px-8 py-6 border-b border-orange-200/10">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="relative">
                        <div className="w-12 h-12 bg-gradient-to-br from-orange-400/20 to-amber-400/20 rounded-2xl flex items-center justify-center backdrop-blur-sm border border-orange-300/20">
                          <AlertTriangle className="text-orange-300" size={22} />
                        </div>
                        <div className="absolute -inset-1 bg-gradient-to-r from-orange-400/20 to-amber-400/20 rounded-2xl blur opacity-50"></div>
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-white drop-shadow-sm">{t('modal.cancelPurchaseTitle')}</h3>
                        <p className="text-sm text-orange-100/80">{t('modal.cancelPurchaseSubtitle')}</p>
                      </div>
                    </div>
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={onClose}
                      className="w-fit h-11 bg-orange-400/10 hover:bg-orange-400/20 rounded-2xl flex items-center justify-center text-orange-200 hover:text-white transition-all duration-200 backdrop-blur-sm border border-orange-300/10"
                    >
                      <X size={16} />
                    </motion.button>
                  </div>
                </div>

                {/* Content */}
                <div className="relative px-8 py-8">
                  <div className="space-y-6">
                    <div className="text-center">
                      <p className="text-white/90 mb-6 text-lg">
                        {t('modal.cancelPurchaseConfirm')} <span className="font-semibold text-orange-200">{purc.doc_type} #{purc.code}</span>?
                      </p>

                      {/* Info card with glass effect */}
                      <div className="bg-gradient-to-br from-white/5 to-orange-400/5 backdrop-blur-sm rounded-2xl p-6 border border-orange-200/10 space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-orange-100/70 text-sm font-medium">{t('vendor')}</span>
                          <span className="text-white font-semibold">{purc.vendor}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-orange-100/70 text-sm font-medium">{t('totalAmount')}</span>
                          <span className="text-orange-200 font-bold text-lg">{p_total.toFixed(2)} DA</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-orange-100/70 text-sm font-medium">{t('modal.items')}</span>
                          <span className="text-white font-semibold">{purcItems.length}</span>
                        </div>
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex gap-4 pt-4">
                      <motion.button
                        whileHover={{ scale: 1.02, y: -2 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={onClose}
                        disabled={loading}
                        className="flex-1 px-6 py-4 bg-gradient-to-r from-white/10 to-white/5 hover:from-white/20 hover:to-white/10 text-white font-semibold rounded-2xl transition-all duration-200 backdrop-blur-sm border border-white/10 hover:border-white/20"
                      >
                        {t('modal.keepPurchase')}
                      </motion.button>

                      <motion.button
                        whileHover={{ scale: 1.02, y: -2 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={onConfirm}
                        disabled={loading}
                        className="flex-1 flex items-center justify-center gap-3 px-6 py-4 bg-gradient-to-r from-orange-500/80 to-amber-500/80 hover:from-orange-500 hover:to-amber-500 disabled:from-orange-600/50 disabled:to-amber-600/50 text-white font-semibold rounded-2xl transition-all duration-200 backdrop-blur-sm border border-orange-400/20 shadow-lg shadow-orange-500/20"
                      >
                        {loading ? (
                          <>
                            <motion.div
                              animate={{ rotate: 360 }}
                              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                              className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full"
                            />
                            <span>{t('modal.cancelling')}</span>
                          </>
                        ) : (
                          <>
                            <span className="text-xl">×</span>
                            <span>{t('modal.cancelSale')}</span>
                          </>
                        )}
                      </motion.button>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </ModalPortal>
  );
};

export const CancelSaleModal: React.FC<SaleModalProps> = ({ isOpen, onClose, sale, saleItems, p_total, onConfirm, loading }) => {
  const { t } = useI18n()

  return (
    <ModalPortal isOpen={isOpen}>
      <AnimatePresence>
        {isOpen && saleItems && p_total && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
          >
            {/* Enhanced backdrop with orange tint */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onClose}
              className="absolute inset-0 bg-gradient-to-br from-orange-900/20 via-black/50 to-amber-900/20 backdrop-blur-md"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 30 }}
              transition={{ duration: 0.3, ease: [0.34, 1.56, 0.64, 1] }}
              className="relative max-w-md w-full mx-4"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Glass morphism container with orange tint */}
              <div className="bg-gradient-to-br from-orange-500/10 via-white/5 to-amber-500/10 backdrop-blur-xl border border-orange-300/20 rounded-3xl shadow-2xl overflow-hidden">
                {/* Subtle glow effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-orange-400/5 to-amber-400/5 rounded-3xl"></div>

                {/* Header */}
                <div className="relative px-8 py-6 border-b border-orange-200/10">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="relative">
                        <div className="w-12 h-12 bg-gradient-to-br from-orange-400/20 to-amber-400/20 rounded-2xl flex items-center justify-center backdrop-blur-sm border border-orange-300/20">
                          <AlertTriangle className="text-orange-300" size={22} />
                        </div>
                        <div className="absolute -inset-1 bg-gradient-to-r from-orange-400/20 to-amber-400/20 rounded-2xl blur opacity-50"></div>
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-white drop-shadow-sm">{t('modal.cancelSale')}</h3>
                        <p className="text-sm text-orange-100/80">{t('modal.cancelSaleSubtitle')}</p>
                      </div>
                    </div>
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={onClose}
                      className="w-fit h-11 bg-orange-400/10 hover:bg-orange-400/20 rounded-2xl flex items-center justify-center text-orange-200 hover:text-white transition-all duration-200 backdrop-blur-sm border border-orange-300/10"
                    >
                      <X size={16} />
                    </motion.button>
                  </div>
                </div>

                {/* Content */}
                <div className="relative px-8 py-8">
                  <div className="space-y-6">
                    <div className="text-center">
                      <p className="text-white/90 mb-6 text-lg">
                        {t('modal.cancelSaleConfirm')} <span className="font-semibold text-orange-200">{sale.doc_type} #{sale.code}</span>?
                      </p>

                      {/* Info card with glass effect */}
                      <div className="bg-gradient-to-br from-white/5 to-orange-400/5 backdrop-blur-sm rounded-2xl p-6 border border-orange-200/10 space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-orange-100/70 text-sm font-medium">Client</span>
                          <span className="text-white font-semibold">{sale.client}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-orange-100/70 text-sm font-medium">{t('totalAmount')}</span>
                          <span className="text-orange-200 font-bold text-lg">{p_total.toFixed(2)} DA</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-orange-100/70 text-sm font-medium">{t('modal.items')}</span>
                          <span className="text-white font-semibold">{saleItems.length}</span>
                        </div>
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex gap-4 pt-4">
                      <motion.button
                        whileHover={{ scale: 1.02, y: -2 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={onClose}
                        disabled={loading}
                        className="flex-1 px-6 py-4 bg-gradient-to-r from-white/10 to-white/5 hover:from-white/20 hover:to-white/10 text-white font-semibold rounded-2xl transition-all duration-200 backdrop-blur-sm border border-white/10 hover:border-white/20"
                      >
                        {t('modal.keepSale')}
                      </motion.button>

                      <motion.button
                        whileHover={{ scale: 1.02, y: -2 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={onConfirm}
                        disabled={loading}
                        className="flex-1 flex items-center justify-center gap-3 px-6 py-4 bg-gradient-to-r from-orange-500/80 to-amber-500/80 hover:from-orange-500 hover:to-amber-500 disabled:from-orange-600/50 disabled:to-amber-600/50 text-white font-semibold rounded-2xl transition-all duration-200 backdrop-blur-sm border border-orange-400/20 shadow-lg shadow-orange-500/20"
                      >
                        {loading ? (
                          <>
                            <motion.div
                              animate={{ rotate: 360 }}
                              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                              className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full"
                            />
                            <span>{t('modal.cancelling')}</span>
                          </>
                        ) : (
                          <>
                            <span className="text-xl">×</span>
                            <span>{t('modal.cancelSale')}</span>
                          </>
                        )}
                      </motion.button>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </ModalPortal>
  );
};
export const FinalizeSaleModal: React.FC<SaleModalProps> = ({ isOpen, onClose, sale, onConfirm, loading }) => {
  const { t } = useI18n()

  return (
    <ModalPortal isOpen={isOpen}>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
          >
            {/* Enhanced backdrop with blue tint */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onClose}
              className="absolute inset-0 bg-gradient-to-br from-blue-900/20 via-black/50 to-cyan-900/20 backdrop-blur-md"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 30 }}
              transition={{ duration: 0.3, ease: [0.34, 1.56, 0.64, 1] }}
              className="relative max-w-md w-full mx-4"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Glass morphism container with blue tint */}
              <div className="bg-gradient-to-br from-blue-500/10 via-white/5 to-cyan-500/10 backdrop-blur-xl border border-blue-300/20 rounded-3xl shadow-2xl overflow-hidden">
                {/* Subtle glow effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-blue-400/5 to-cyan-400/5 rounded-3xl"></div>

                {/* Header */}
                <div className="relative px-8 py-6 border-b border-blue-200/10">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="relative">
                        <div className="w-12 h-12 bg-gradient-to-br from-blue-400/20 to-cyan-400/20 rounded-2xl flex items-center justify-center backdrop-blur-sm border border-blue-300/20">
                          <AlertTriangle className="text-blue-300" size={22} />
                        </div>
                        <div className="absolute -inset-1 bg-gradient-to-r from-blue-400/20 to-cyan-400/20 rounded-2xl blur opacity-50"></div>
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-white drop-shadow-sm">{t('modal.FinalizeSaleTitle')}</h3>
                      </div>
                    </div>
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={onClose}
                      className="w-fit h-11 bg-blue-400/10 hover:bg-blue-400/20 rounded-2xl flex items-center justify-center text-blue-200 hover:text-white transition-all duration-200 backdrop-blur-sm border border-blue-300/10"
                    >
                      <X size={16} />
                    </motion.button>
                  </div>
                </div>

                {/* Content */}
                <div className="relative px-8 py-8">
                  <div className="space-y-6">
                    <div className="text-center">
                      <p className="text-white/90 mb-6 text-lg">
                        {t('modal.FinalizeSaleTitle')} <span className="font-semibold text-cyan-200">{sale.doc_type === 'Invoice' ? 'Facture': 'BL'} #{sale.code}</span>?
                      </p>
                    </div>
                    {/* Action buttons */}
                    <div className="flex gap-4 pt-4">
                      <motion.button
                        whileHover={{ scale: 1.02, y: -2 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => {onConfirm(); console.log("it's going good ")}}
                        disabled={loading}
                        className="flex-1 flex items-center justify-center gap-3 px-6 py-4 bg-gradient-to-r from-blue-500/80 to-cyan-500/80 hover:from-blue-500 hover:to-cyan-500 disabled:from-blue-600/50 disabled:to-cyan-600/50 text-white font-semibold rounded-2xl transition-all duration-200 backdrop-blur-sm border border-blue-400/20 shadow-lg shadow-blue-500/20"
                      >
                        {loading ? (
                          <>
                            <motion.div
                              animate={{ rotate: 360 }}
                              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                              className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full"
                            />
                            <span>{t('modal.FinalizeSaleTitle')}</span>
                          </>
                        ) : (
                          <>
                            <span className="text-xl">×</span>
                            <span>{t('modal.FinalizeSaleTitle')}</span>
                          </>
                        )}
                      </motion.button>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </ModalPortal>
  );
};



export const FinalizePurchaseModal: React.FC<PurchaseModalProps> = ({ isOpen, onClose, purc, onConfirm, loading }) => {
  const { t } = useI18n()

  return (
    <ModalPortal isOpen={isOpen}>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
          >
            {/* Enhanced backdrop with blue tint */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onClose}
              className="absolute inset-0 bg-gradient-to-br from-blue-900/20 via-black/50 to-cyan-900/20 backdrop-blur-md"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 30 }}
              transition={{ duration: 0.3, ease: [0.34, 1.56, 0.64, 1] }}
              className="relative max-w-md w-full mx-4"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Glass morphism container with blue tint */}
              <div className="bg-gradient-to-br from-blue-500/10 via-white/5 to-cyan-500/10 backdrop-blur-xl border border-blue-300/20 rounded-3xl shadow-2xl overflow-hidden">
                {/* Subtle glow effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-blue-400/5 to-cyan-400/5 rounded-3xl"></div>

                {/* Header */}
                <div className="relative px-8 py-6 border-b border-blue-200/10">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="relative">
                        <div className="w-12 h-12 bg-gradient-to-br from-blue-400/20 to-cyan-400/20 rounded-2xl flex items-center justify-center backdrop-blur-sm border border-blue-300/20">
                          <AlertTriangle className="text-blue-300" size={22} />
                        </div>
                        <div className="absolute -inset-1 bg-gradient-to-r from-blue-400/20 to-cyan-400/20 rounded-2xl blur opacity-50"></div>
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-white drop-shadow-sm">{t('modal.FinalizePurchaseTitle')}</h3>
                      </div>
                    </div>
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={onClose}
                      className="w-fit h-11 bg-blue-400/10 hover:bg-blue-400/20 rounded-2xl flex items-center justify-center text-blue-200 hover:text-white transition-all duration-200 backdrop-blur-sm border border-blue-300/10"
                    >
                      <X size={16} />
                    </motion.button>
                  </div>
                </div>

                {/* Content */}
                <div className="relative px-8 py-8">
                  <div className="space-y-6">
                    <div className="text-center">
                      <p className="text-white/90 mb-6 text-lg">
                        {t('modal.FinalizePurchaseTitle')} <span className="font-semibold text-cyan-200">{purc.doc_type === 'Invoice' ? 'Facture': 'BL'} #{purc.code}</span>?
                      </p>
                    </div>
                    {/* Action buttons */}
                    <div className="flex gap-4 pt-4">
                      <motion.button
                        whileHover={{ scale: 1.02, y: -2 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => {onConfirm(); console.log("it's going good ")}}
                        disabled={loading}
                        className="flex-1 flex items-center justify-center gap-3 px-6 py-4 bg-gradient-to-r from-blue-500/80 to-cyan-500/80 hover:from-blue-500 hover:to-cyan-500 disabled:from-blue-600/50 disabled:to-cyan-600/50 text-white font-semibold rounded-2xl transition-all duration-200 backdrop-blur-sm border border-blue-400/20 shadow-lg shadow-blue-500/20"
                      >
                        {loading ? (
                          <>
                            <motion.div
                              animate={{ rotate: 360 }}
                              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                              className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full"
                            />
                            <span>{t('modal.FinalizePurchaseTitle')}</span>
                          </>
                        ) : (
                          <>
                            <span className="text-xl">×</span>
                            <span>{t('modal.FinalizePurchaseTitle')}</span>
                          </>
                        )}
                      </motion.button>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </ModalPortal>
  );
};
// Delete Purchase Modal
export const DeletePurchaseModal: React.FC<PurchaseModalProps> = ({ isOpen, onClose, purc, p_total, onConfirm, loading }) => {
  const { t } = useI18n()
  return (
    <ModalPortal isOpen={isOpen}>
      <AnimatePresence>
        {isOpen && p_total && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
          >
            {/* Enhanced backdrop with red tint */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onClose}
              className="absolute inset-0 bg-gradient-to-br from-red-900/20 via-black/50 to-rose-900/20 backdrop-blur-md"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 30 }}
              transition={{ duration: 0.3, ease: [0.34, 1.56, 0.64, 1] }}
              className="relative max-w-md w-full mx-4"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Glass morphism container with red tint */}
              <div className="bg-gradient-to-br from-red-500/10 via-white/5 to-rose-500/10 backdrop-blur-xl border border-red-300/20 rounded-3xl shadow-2xl overflow-hidden">
                {/* Subtle glow effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-red-400/5 to-rose-400/5 rounded-3xl"></div>

                {/* Header */}
                <div className="relative px-8 py-6 border-b border-red-200/10">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="relative">
                        <div className="w-12 h-12 bg-gradient-to-br from-red-400/20 to-rose-400/20 rounded-2xl flex items-center justify-center backdrop-blur-sm border border-red-300/20">
                          <Trash2 className="text-red-300" size={22} />
                        </div>
                        <div className="absolute -inset-1 bg-gradient-to-r from-red-400/20 to-rose-400/20 rounded-2xl blur opacity-50"></div>
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-white drop-shadow-sm">{t('modal.deletePurchaseTitle')}</h3>
                        <p className="text-sm text-red-100/80">{t('modal.deletePurchaseSubtitle')}</p>
                      </div>
                    </div>
                    <motion.button
                      whileHover={{ scale: 1.1, rotate: 90 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={onClose}
                      className="w-fit h-11 bg-orange-400/10 hover:bg-orange-400/20 rounded-2xl flex items-center justify-center text-orange-200 hover:text-white transition-all duration-200 backdrop-blur-sm border border-orange-300/10"
                    >
                      <X size={16} />
                    </motion.button>
                  </div>
                </div>

                {/* Content */}
                <div className="relative px-8 py-8">
                  <div className="space-y-6">
                    <div className="text-center">
                      <p className="text-white/90 mb-4 text-lg">
                        {t('modal.cancelSaleConfirm')} <span className="font-semibold text-red-200">{purc.doc_type} #{purc.code}</span>?
                      </p>
                      {/* Info card with glass effect */}
                      <div className="bg-gradient-to-br from-white/5 to-red-400/5 backdrop-blur-sm rounded-2xl p-6 border border-red-200/10 space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-red-100/70 text-sm font-medium">{t('vendor')}</span>
                          <span className="text-white font-semibold">{purc.vendor}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-red-100/70 text-sm font-medium">{t('totalAmount')}</span>
                          <span className="text-red-200 font-bold text-lg">{p_total.toFixed(2)} DA</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-red-100/70 text-sm font-medium">Date</span>
                          <span className="text-white font-semibold">{new Date(purc.date).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex gap-4 pt-4">
                      <motion.button
                        whileHover={{ scale: 1.02, y: -2 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={onClose}
                        disabled={loading}
                        className="flex-1 px-6 py-4 bg-gradient-to-r from-white/10 to-white/5 hover:from-white/20 hover:to-white/10 text-white font-semibold rounded-2xl transition-all duration-200 backdrop-blur-sm border border-white/10 hover:border-white/20"
                      >
                        {t('modal.keepPurchase')}
                      </motion.button>

                      <motion.button
                        whileHover={{ scale: 1.02, y: -2 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={onConfirm}
                        disabled={loading}
                        className="flex-1 flex items-center justify-center gap-3 px-6 py-4 bg-gradient-to-r from-red-500/80 to-rose-500/80 hover:from-red-500 hover:to-rose-500 disabled:from-red-600/50 disabled:to-rose-600/50 text-white font-semibold rounded-2xl transition-all duration-200 backdrop-blur-sm border border-red-400/20 shadow-lg shadow-red-500/20"
                      >
                        {loading ? (
                          <>
                            <motion.div
                              animate={{ rotate: 360 }}
                              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                              className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full"
                            />
                            <span>{t('modal.deleting')}</span>
                          </>
                        ) : (
                          <>
                            <Trash2 size={18} />
                            <span>{t('modal.deletePurchaseTitle')}</span>
                          </>
                        )}
                      </motion.button>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </ModalPortal>
  );
};

export const DeleteVendorModal: React.FC<PersonModalProps> = ({ isOpen, onClose, Name, onConfirm, loading }) => {
  const { t } = useI18n()
  return (
    <ModalPortal isOpen={isOpen}>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
          >
            {/* Enhanced backdrop with red tint */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onClose}
              className="absolute inset-0 bg-gradient-to-br from-red-900/20 via-black/50 to-rose-900/20 backdrop-blur-md"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 30 }}
              transition={{ duration: 0.3, ease: [0.34, 1.56, 0.64, 1] }}
              className="relative max-w-md w-full mx-4"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Glass morphism container with red tint */}
              <div className="bg-gradient-to-br from-red-500/10 via-white/5 to-rose-500/10 backdrop-blur-xl border border-red-300/20 rounded-3xl shadow-2xl overflow-hidden">
                {/* Subtle glow effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-red-400/5 to-rose-400/5 rounded-3xl"></div>

                {/* Header */}
                <div className="relative px-8 py-6 border-b border-red-200/10">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="relative">
                        <div className="w-12 h-12 bg-gradient-to-br from-red-400/20 to-rose-400/20 rounded-2xl flex items-center justify-center backdrop-blur-sm border border-red-300/20">
                          <UserX className="text-red-300" size={22} />
                        </div>
                        <div className="absolute -inset-1 bg-gradient-to-r from-red-400/20 to-rose-400/20 rounded-2xl blur opacity-50"></div>
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-white drop-shadow-sm">{t('modal.deleteVendorTitle')}</h3>
                        <p className="text-sm text-red-100/80">{t('modal.deletePurchaseSubtitle')}</p>
                      </div>
                    </div>
                    <motion.button
                      whileHover={{ scale: 1.1, rotate: 90 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={onClose}
                      className="w-fit h-11 bg-orange-400/10 hover:bg-orange-400/20 rounded-2xl flex items-center justify-center text-orange-200 hover:text-white transition-all duration-200 backdrop-blur-sm border border-orange-300/10"
                    >
                      <X size={16} />
                    </motion.button>
                  </div>
                </div>

                {/* Content */}
                <div className="relative px-8 py-8">
                  <div className="space-y-6">
                    <div className="text-center">
                      <p className="text-white/90 mb-4 text-lg">
                        {t('modal.deleteVendorConfirm')} <span className="font-semibold text-red-200">{Name}</span>?
                      </p>

                      {/* Warning message */}
                      <div className="bg-gradient-to-br from-white/5 to-red-400/5 backdrop-blur-sm rounded-2xl p-6 border border-red-200/10 space-y-3">
                        <div className="flex items-center gap-3 text-red-200/90">
                          <AlertTriangle size={20} className="text-red-300" />
                          <span className="font-medium">{t('warning')}</span>
                        </div>
                        <p className="text-white/80 text-sm leading-relaxed">
                          {t('modal.vendorNotUndone')}
                        </p>
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex gap-4 pt-4">
                      <motion.button
                        whileHover={{ scale: 1.02, y: -2 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={onClose}
                        disabled={loading}
                        className="flex-1 px-6 py-4 bg-gradient-to-r from-white/10 to-white/5 hover:from-white/20 hover:to-white/10 text-white font-semibold rounded-2xl transition-all duration-200 backdrop-blur-sm border border-white/10 hover:border-white/20"
                      >
                        {t('modal.keepVendor')}
                      </motion.button>

                      <motion.button
                        whileHover={{ scale: 1.02, y: -2 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={onConfirm}
                        disabled={loading}
                        className="flex-1 flex items-center justify-center gap-3 px-6 py-4 bg-gradient-to-r from-red-500/80 to-rose-500/80 hover:from-red-500 hover:to-rose-500 disabled:from-red-600/50 disabled:to-rose-600/50 text-white font-semibold rounded-2xl transition-all duration-200 backdrop-blur-sm border border-red-400/20 shadow-lg shadow-red-500/20"
                      >
                        {loading ? (
                          <>
                            <motion.div
                              animate={{ rotate: 360 }}
                              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                              className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full"
                            />
                            <span>{t('modal.deleting')}</span>
                          </>
                        ) : (
                          <>
                            <UserX size={18} />
                            <span>{t('modal.deleteVendorTitle')}</span>
                          </>
                        )}
                      </motion.button>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </ModalPortal>
  );
};


export const DeleteClientModal: React.FC<PersonModalProps> = ({ isOpen, onClose, Name, onConfirm, loading }) => {
  const { t } = useI18n()
  return (
    <ModalPortal isOpen={isOpen}>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
          >
            {/* Enhanced backdrop with red tint */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onClose}
              className="absolute inset-0 bg-gradient-to-br from-red-900/20 via-black/50 to-rose-900/20 backdrop-blur-md"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 30 }}
              transition={{ duration: 0.3, ease: [0.34, 1.56, 0.64, 1] }}
              className="relative max-w-md w-full mx-4"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Glass morphism container with red tint */}
              <div className="bg-gradient-to-br from-red-500/10 via-white/5 to-rose-500/10 backdrop-blur-xl border border-red-300/20 rounded-3xl shadow-2xl overflow-hidden">
                {/* Subtle glow effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-red-400/5 to-rose-400/5 rounded-3xl"></div>

                {/* Header */}
                <div className="relative px-8 py-6 border-b border-red-200/10">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="relative">
                        <div className="w-12 h-12 bg-gradient-to-br from-red-400/20 to-rose-400/20 rounded-2xl flex items-center justify-center backdrop-blur-sm border border-red-300/20">
                          <UserX className="text-red-300" size={22} />
                        </div>
                        <div className="absolute -inset-1 bg-gradient-to-r from-red-400/20 to-rose-400/20 rounded-2xl blur opacity-50"></div>
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-white drop-shadow-sm">{t('client.deleteClient')}</h3>
                        <p className="text-sm text-red-100/80">{t('modal.deletePurchaseSubtitle')}</p>
                      </div>
                    </div>
                    <motion.button
                      whileHover={{ scale: 1.1, rotate: 90 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={onClose}
                      className="w-fit h-11 bg-orange-400/10 hover:bg-orange-400/20 rounded-2xl flex items-center justify-center text-orange-200 hover:text-white transition-all duration-200 backdrop-blur-sm border border-orange-300/10"
                    >
                      <X size={16} />
                    </motion.button>
                  </div>
                </div>

                {/* Content */}
                <div className="relative px-8 py-8">
                  <div className="space-y-6">
                    <div className="text-center">
                      <p className="text-white/90 mb-4 text-lg">
                        {t('modal.deleteClientConfirm')}<span className="font-semibold text-red-200">{Name}</span>?
                      </p>

                      {/* Warning message */}
                      <div className="bg-gradient-to-br from-white/5 to-red-400/5 backdrop-blur-sm rounded-2xl p-6 border border-red-200/10 space-y-3">
                        <div className="flex items-center gap-3 text-red-200/90">
                          <AlertTriangle size={20} className="text-red-300" />
                          <span className="font-medium">{t('warning')}</span>
                        </div>
                        <p className="text-white/80 text-sm leading-relaxed">
                          {t('modal.clientNotUndone')}
                        </p>
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex gap-4 pt-4">
                      <motion.button
                        whileHover={{ scale: 1.02, y: -2 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={onClose}
                        disabled={loading}
                        className="flex-1 px-6 py-4 bg-gradient-to-r from-white/10 to-white/5 hover:from-white/20 hover:to-white/10 text-white font-semibold rounded-2xl transition-all duration-200 backdrop-blur-sm border border-white/10 hover:border-white/20"
                      >
                        {t('modal.keepClient')}
                      </motion.button>

                      <motion.button
                        whileHover={{ scale: 1.02, y: -2 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={onConfirm}
                        disabled={loading}
                        className="flex-1 flex items-center justify-center gap-3 px-6 py-4 bg-gradient-to-r from-red-500/80 to-rose-500/80 hover:from-red-500 hover:to-rose-500 disabled:from-red-600/50 disabled:to-rose-600/50 text-white font-semibold rounded-2xl transition-all duration-200 backdrop-blur-sm border border-red-400/20 shadow-lg shadow-red-500/20"
                      >
                        {loading ? (
                          <>
                            <motion.div
                              animate={{ rotate: 360 }}
                              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                              className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full"
                            />
                            <span>{t('modal.deleting')}</span>
                          </>
                        ) : (
                          <>
                            <UserX size={18} />
                            <span>{t('modal.deleteClient')}</span>
                          </>
                        )}
                      </motion.button>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </ModalPortal>
  );
};
export const DeleteSaleModal: React.FC<SaleModalProps> = ({ isOpen, onClose, sale, p_total, onConfirm, loading }) => {
  const { t } = useI18n()
  return (
    <ModalPortal isOpen={isOpen}>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
          >
            {/* Enhanced backdrop with red tint */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onClose}
              className="absolute inset-0 bg-gradient-to-br from-red-900/20 via-black/50 to-rose-900/20 backdrop-blur-md"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 30 }}
              transition={{ duration: 0.3, ease: [0.34, 1.56, 0.64, 1] }}
              className="relative max-w-md w-full mx-4"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Glass morphism container with red tint */}
              <div className="bg-gradient-to-br from-red-500/10 via-white/5 to-rose-500/10 backdrop-blur-xl border border-red-300/20 rounded-3xl shadow-2xl overflow-hidden">
                {/* Subtle glow effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-red-400/5 to-rose-400/5 rounded-3xl"></div>

                {/* Header */}
                <div className="relative px-8 py-6 border-b border-red-200/10">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="relative">
                        <div className="w-12 h-12 bg-gradient-to-br from-red-400/20 to-rose-400/20 rounded-2xl flex items-center justify-center backdrop-blur-sm border border-red-300/20">
                          <Trash2 className="text-red-300" size={22} />
                        </div>
                        <div className="absolute -inset-1 bg-gradient-to-r from-red-400/20 to-rose-400/20 rounded-2xl blur opacity-50"></div>
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-white drop-shadow-sm">{t('modal.deleteSaleTitle')}</h3>
                        <p className="text-sm text-red-100/80">{t('modal.deletePurchaseSubtitle')}</p>
                      </div>
                    </div>
                    <motion.button
                      whileHover={{ scale: 1.1, rotate: 90 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={onClose}
                      className="w-fit h-11 bg-orange-400/10 hover:bg-orange-400/20 rounded-2xl flex items-center justify-center text-orange-200 hover:text-white transition-all duration-200 backdrop-blur-sm border border-orange-300/10"
                    >
                      <X size={16} />
                    </motion.button>
                  </div>
                </div>

                {/* Content */}
                <div className="relative px-8 py-8">
                  <div className="space-y-6">
                    <div className="text-center">
                      <p className="text-white/90 mb-4 text-lg">
                        {t('modal.deleteConfirm')} <span className="font-semibold text-red-200">{sale.doc_type} #{sale.code}</span>?
                      </p>
                      {/* Info card with glass effect */}
                      <div className="bg-gradient-to-br from-white/5 to-red-400/5 backdrop-blur-sm rounded-2xl p-6 border border-red-200/10 space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-red-100/70 text-sm font-medium">Client</span>
                          <span className="text-white font-semibold">{sale.client}</span>
                        </div>
                        {p_total &&
                          <div className="flex justify-between items-center">
                            <span className="text-red-100/70 text-sm font-medium">{t('totalAmount')}</span>
                            <span className="text-red-200 font-bold text-lg">{p_total.toFixed(2)} DA</span>
                          </div>
                        }
                        <div className="flex justify-between items-center">
                          <span className="text-red-100/70 text-sm font-medium">Date</span>
                          <span className="text-white font-semibold">{new Date(sale.date).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex gap-4 pt-4">
                      <motion.button
                        whileHover={{ scale: 1.02, y: -2 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={onClose}
                        disabled={loading}
                        className="flex-1 px-6 py-4 bg-gradient-to-r from-white/10 to-white/5 hover:from-white/20 hover:to-white/10 text-white font-semibold rounded-2xl transition-all duration-200 backdrop-blur-sm border border-white/10 hover:border-white/20"
                      >
                        {t('modal.keepSale')}
                      </motion.button>

                      <motion.button
                        whileHover={{ scale: 1.02, y: -2 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={onConfirm}
                        disabled={loading}
                        className="flex-1 flex items-center justify-center gap-3 px-6 py-4 bg-gradient-to-r from-red-500/80 to-rose-500/80 hover:from-red-500 hover:to-rose-500 disabled:from-red-600/50 disabled:to-rose-600/50 text-white font-semibold rounded-2xl transition-all duration-200 backdrop-blur-sm border border-red-400/20 shadow-lg shadow-red-500/20"
                      >
                        {loading ? (
                          <>
                            <motion.div
                              animate={{ rotate: 360 }}
                              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                              className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full"
                            />
                            <span>{t('modal.deleting')}</span>
                          </>
                        ) : (
                          <>
                            <Trash2 size={18} />
                            <span>{t('modal.deleteSaleTitle')}</span>
                          </>
                        )}
                      </motion.button>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </ModalPortal>
  );
};

// Deposit Modal Component
export const DepositModal: React.FC<TreasuryModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  loading = false
}) => {
  const [amount, setAmount] = useState('');
  const { t } = useI18n()

  const handleSubmit = () => {
    const parsedAmount = parseFloat(amount);
    if (parsedAmount > 0) {
      onConfirm(parsedAmount);
      setAmount('');
    }
  };

  return (
    <ModalPortal isOpen={isOpen}>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
          >
            {/* Enhanced backdrop with green tint */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onClose}
              className="absolute inset-0 bg-gradient-to-br from-green-900/20 via-black/50 to-emerald-900/20 backdrop-blur-md"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 30 }}
              transition={{ duration: 0.3, ease: [0.34, 1.56, 0.64, 1] }}
              className="relative max-w-md w-full mx-4"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Glass morphism container with green tint */}
              <div className="bg-gradient-to-br from-green-500/10 via-white/5 to-emerald-500/10 backdrop-blur-xl border border-green-300/20 rounded-3xl shadow-2xl overflow-hidden">
                {/* Subtle glow effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-green-400/5 to-emerald-400/5 rounded-3xl"></div>

                {/* Header */}
                <div className="relative px-8 py-6 border-b border-green-200/10">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="relative">
                        <div className="w-12 h-12 bg-gradient-to-br from-green-400/20 to-emerald-400/20 rounded-2xl flex items-center justify-center backdrop-blur-sm border border-green-300/20">
                          <ArrowDownCircle className="text-green-300" size={22} />
                        </div>
                        <div className="absolute -inset-1 bg-gradient-to-r from-green-400/20 to-emerald-400/20 rounded-2xl blur opacity-50"></div>
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-white drop-shadow-sm">{t('modal.deposit')}</h3>
                        <p className="text-sm text-green-100/80">{t('modal.addMoney')}</p>
                      </div>
                    </div>
                    <motion.button
                      whileHover={{ scale: 1.1, rotate: 90 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={onClose}
                      className="w-fit h-11 bg-orange-400/10 hover:bg-orange-400/20 rounded-2xl flex items-center justify-center text-orange-200 hover:text-white transition-all duration-200 backdrop-blur-sm border border-orange-300/10"
                    >
                      <X size={16} />
                    </motion.button>
                  </div>
                </div>

                {/* Content */}
                <div className="relative px-8 py-8">
                  <div className="space-y-6">
                    {/* Amount Input */}
                    <div className="space-y-3">
                      <label className="text-white/90 font-medium">{t('modal.amountDeposit')}</label>
                      <div className="relative">
                        <DollarSign size={20} className="absolute left-4 top-1/2 transform -translate-y-1/2 text-green-300" />
                        <input
                          type="number"
                          value={amount}
                          onChange={(e) => setAmount(e.target.value)}
                          placeholder="0.00"
                          className="w-full pl-12 pr-4 py-4 bg-gradient-to-br from-white/5 to-green-400/5 backdrop-blur-sm rounded-2xl border border-green-200/20 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-green-400/30 focus:border-green-300/30 transition-all duration-200"
                        />
                      </div>
                    </div>

                    {/* Info message */}
                    <div className="bg-gradient-to-br from-white/5 to-green-400/5 backdrop-blur-sm rounded-2xl p-6 border border-green-200/10 space-y-3">
                      <div className="flex items-center gap-3 text-green-200/90">
                        <TrendingUp size={20} className="text-green-300" />
                        <span className="font-medium">Transaction Info</span>
                      </div>
                      <p className="text-white/80 text-sm leading-relaxed">
                        {t('modal.amountAdded')}
                      </p>
                    </div>

                    {/* Action buttons */}
                    <div className="flex gap-4 pt-4">
                      <motion.button
                        whileHover={{ scale: 1.02, y: -2 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={onClose}
                        disabled={loading}
                        className="flex-1 px-6 py-4 bg-gradient-to-r from-white/10 to-white/5 hover:from-white/20 hover:to-white/10 text-white font-semibold rounded-2xl transition-all duration-200 backdrop-blur-sm border border-white/10 hover:border-white/20"
                      >
                        {t('cancel')}
                      </motion.button>

                      <motion.button
                        whileHover={{ scale: 1.02, y: -2 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={handleSubmit}
                        disabled={loading || !amount || parseFloat(amount) <= 0}
                        className="flex-1 flex items-center justify-center gap-3 px-6 py-4 bg-gradient-to-r from-green-500/80 to-emerald-500/80 hover:from-green-500 hover:to-emerald-500 disabled:from-green-600/50 disabled:to-emerald-600/50 text-white font-semibold rounded-2xl transition-all duration-200 backdrop-blur-sm border border-green-400/20 shadow-lg shadow-green-500/20"
                      >
                        {loading ? (
                          <>
                            <motion.div
                              animate={{ rotate: 360 }}
                              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                              className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full"
                            />
                            <span>{t('modal.processing')}</span>
                          </>
                        ) : (
                          <>
                            <ArrowDownCircle size={18} />
                            <span>{t('modal.confirmDeposit')}</span>
                          </>
                        )}
                      </motion.button>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </ModalPortal>
  );
};

// Withdrawal Modal Component
export const WithdrawalModal: React.FC<TreasuryModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  loading = false,
  currentBalance = 0
}) => {
  const [amount, setAmount] = useState('');
  const { t } = useI18n()

  const handleSubmit = () => {
    const parsedAmount = parseFloat(amount);
    if (parsedAmount > 0 && parsedAmount <= currentBalance) {
      onConfirm(parsedAmount);
      setAmount('');
    }
  };

  const isInsufficientFunds = parseFloat(amount) > currentBalance;

  return (
    <ModalPortal isOpen={isOpen}>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
          >
            {/* Enhanced backdrop with orange tint */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onClose}
              className="absolute inset-0 bg-gradient-to-br from-orange-900/20 via-black/50 to-amber-900/20 backdrop-blur-md"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 30 }}
              transition={{ duration: 0.3, ease: [0.34, 1.56, 0.64, 1] }}
              className="relative max-w-md w-full mx-4"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Glass morphism container with orange tint */}
              <div className="bg-gradient-to-br from-orange-500/10 via-white/5 to-amber-500/10 backdrop-blur-xl border border-orange-300/20 rounded-3xl shadow-2xl overflow-hidden">
                {/* Subtle glow effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-orange-400/5 to-amber-400/5 rounded-3xl"></div>

                {/* Header */}
                <div className="relative px-8 py-6 border-b border-orange-200/10">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="relative">
                        <div className="w-12 h-12 bg-gradient-to-br from-orange-400/20 to-amber-400/20 rounded-2xl flex items-center justify-center backdrop-blur-sm border border-orange-300/20">
                          <ArrowUpCircle className="text-orange-300" size={22} />
                        </div>
                        <div className="absolute -inset-1 bg-gradient-to-r from-orange-400/20 to-amber-400/20 rounded-2xl blur opacity-50"></div>
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-white drop-shadow-sm">{t('modal.withdrawFunds')}</h3>
                        <p className="text-sm text-orange-100/80">{t('modal.removeMoney')}</p>
                      </div>
                    </div>
                    <motion.button
                      whileHover={{ scale: 1.1, rotate: 90 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={onClose}
                      className="w-fit h-11 bg-gray-400/10 hover:bg-gray-400/20 rounded-2xl flex items-center justify-center text-gray-200 hover:text-white transition-all duration-200 backdrop-blur-sm border border-gray-300/10"
                    >
                      <X size={16} />
                    </motion.button>
                  </div>
                </div>

                {/* Content */}
                <div className="relative px-8 py-8">
                  <div className="space-y-6">
                    {/* Balance Info */}
                    <div className="text-center py-2">
                      <p className="text-white/70 text-sm mb-1">{t('modal.availableBalance')}</p>
                      <p className="text-2xl font-bold text-white font-mono">{currentBalance.toLocaleString()} DA</p>
                    </div>

                    {/* Amount Input */}
                    <div className="space-y-3">
                      <label className="text-white/90 font-medium">{t('modal.amountWithdraw')}</label>
                      <div className="relative">
                        <DollarSign size={20} className="absolute left-4 top-1/2 transform -translate-y-1/2 text-orange-300" />
                        <input
                          type="number"
                          value={amount}
                          onChange={(e) => setAmount(e.target.value)}
                          placeholder="0.00"
                          className={`w-full pl-12 pr-4 py-4 bg-gradient-to-br from-white/5 to-orange-400/5 backdrop-blur-sm rounded-2xl border transition-all duration-200 text-white placeholder-white/50 focus:outline-none focus:ring-2 ${isInsufficientFunds
                            ? 'border-red-300/30 focus:ring-red-400/30 focus:border-red-300/30'
                            : 'border-orange-200/20 focus:ring-orange-400/30 focus:border-orange-300/30'
                            }`}
                        />
                      </div>
                      {isInsufficientFunds && (
                        <motion.p
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="text-red-300 text-sm flex items-center gap-2"
                        >
                          <AlertCircle size={16} />
                          {t('modal.insuffAmount')}
                        </motion.p>
                      )}
                    </div>

                    {/* Info message */}
                    <div className="bg-gradient-to-br from-white/5 to-orange-400/5 backdrop-blur-sm rounded-2xl p-6 border border-orange-200/10 space-y-3">
                      <div className="flex items-center gap-3 text-orange-200/90">
                        <TrendingDown size={20} className="text-orange-300" />
                        <span className="font-medium">Transaction Info</span>
                      </div>
                      <p className="text-white/80 text-sm leading-relaxed">
                        {t('modal.amountDeducted')}
                      </p>
                    </div>

                    {/* Action buttons */}
                    <div className="flex gap-4 pt-4">
                      <motion.button
                        whileHover={{ scale: 1.02, y: -2 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={onClose}
                        disabled={loading}
                        className="flex-1 px-6 py-4 bg-gradient-to-r from-white/10 to-white/5 hover:from-white/20 hover:to-white/10 text-white font-semibold rounded-2xl transition-all duration-200 backdrop-blur-sm border border-white/10 hover:border-white/20"
                      >
                        {t('cancel')}
                      </motion.button>

                      <motion.button
                        whileHover={{ scale: 1.02, y: -2 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={handleSubmit}
                        disabled={loading || !amount || parseFloat(amount) <= 0 || isInsufficientFunds}
                        className="flex-1 flex items-center justify-center gap-3 px-6 py-4 bg-gradient-to-r from-orange-500/80 to-amber-500/80 hover:from-orange-500 hover:to-amber-500 disabled:from-orange-600/50 disabled:to-amber-600/50 text-white font-semibold rounded-2xl transition-all duration-200 backdrop-blur-sm border border-orange-400/20 shadow-lg shadow-orange-500/20"
                      >
                        {loading ? (
                          <>
                            <motion.div
                              animate={{ rotate: 360 }}
                              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                              className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full"
                            />
                            <span>{t('modal.processing')}</span>
                          </>
                        ) : (
                          <>
                            <ArrowUpCircle size={18} />
                            <span>{t('modal.confirmWithdrawal')}</span>
                          </>
                        )}
                      </motion.button>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </ModalPortal>
  );
};



export const DeleteProductModal: React.FC<ProductModalProps> = ({ isOpen, onClose, product, onConfirm, loading }) => {
  const { t } = useI18n()
  return (
    <ModalPortal isOpen={isOpen}>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
          >
            {/* Enhanced backdrop with red tint */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onClose}
              className="absolute inset-0 bg-gradient-to-br from-red-900/20 via-black/50 to-rose-900/20 backdrop-blur-md"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 30 }}
              transition={{ duration: 0.3, ease: [0.34, 1.56, 0.64, 1] }}
              className="relative max-w-md w-full mx-4"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Glass morphism container with red tint */}
              <div className="bg-gradient-to-br from-red-500/10 via-white/5 to-rose-500/10 backdrop-blur-xl border border-red-300/20 rounded-3xl shadow-2xl overflow-hidden">
                {/* Subtle glow effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-red-400/5 to-rose-400/5 rounded-3xl"></div>

                {/* Header */}
                <div className="relative px-8 py-6 border-b border-red-200/10">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="relative">
                        <div className="w-12 h-12 bg-gradient-to-br from-red-400/20 to-rose-400/20 rounded-2xl flex items-center justify-center backdrop-blur-sm border border-red-300/20">
                          <AlertTriangle className="text-red-300" size={22} />
                        </div>
                        <div className="absolute -inset-1 bg-gradient-to-r from-red-400/20 to-rose-400/20 rounded-2xl blur opacity-50"></div>
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-white drop-shadow-sm">{t('productDetails.deleteProduct')}</h3>
                        <p className="text-sm text-red-100/80">{t('modal.deletePurchaseSubtitle')}</p>
                      </div>
                    </div>
                    <motion.button
                      whileHover={{ scale: 1.1, rotate: 90 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={onClose}
                      className="w-fit h-11 bg-orange-400/10 hover:bg-orange-400/20 rounded-2xl flex items-center justify-center text-orange-200 hover:text-white transition-all duration-200 backdrop-blur-sm border border-orange-300/10"
                    >
                      <X size={16} />
                    </motion.button>
                  </div>
                </div>

                {/* Content */}
                <div className="relative px-8 py-8">
                  <div className="space-y-6">
                    <div className="text-center">
                      <p className="text-white/90 mb-4 text-lg">
                        {t('modal.deleteConfirm')} <span className="font-semibold text-red-200">{product.name}</span>?
                      </p>
                      {/* Info card with glass effect */}
                      <div className="bg-gradient-to-br from-white/5 to-red-400/5 backdrop-blur-sm rounded-2xl p-6 border border-red-200/10 space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-red-100/70 text-sm font-medium">{t('Product')}</span>
                          <span className="text-white font-semibold">{product.name}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-red-100/70 text-sm font-medium">{t('modal.InvWorth')}</span>
                          <span className="text-red-200 font-bold text-lg">{(product.quantity * product.unit_price).toFixed(2)} DA</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-red-100/70 text-sm font-medium">{t('quantity')}</span>
                          <span className="text-white font-semibold">{product.quantity}</span>
                        </div>
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex gap-4 pt-4">
                      <motion.button
                        whileHover={{ scale: 1.02, y: -2 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={onClose}
                        disabled={loading}
                        className="flex-1 px-6 py-4 bg-gradient-to-r from-white/10 to-white/5 hover:from-white/20 hover:to-white/10 text-white font-semibold rounded-2xl transition-all duration-200 backdrop-blur-sm border border-white/10 hover:border-white/20"
                      >
                        {t('modal.keepProduct')}
                      </motion.button>

                      <motion.button
                        whileHover={{ scale: 1.02, y: -2 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={onConfirm}
                        disabled={loading}
                        className="flex-1 flex items-center justify-center gap-3 px-6 py-4 bg-gradient-to-r from-red-500/80 to-rose-500/80 hover:from-red-500 hover:to-rose-500 disabled:from-red-600/50 disabled:to-rose-600/50 text-white font-semibold rounded-2xl transition-all duration-200 backdrop-blur-sm border border-red-400/20 shadow-lg shadow-red-500/20"
                      >
                        {loading ? (
                          <>
                            <motion.div
                              animate={{ rotate: 360 }}
                              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                              className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full"
                            />
                            <span>{t('modal.deleting')}</span>
                          </>
                        ) : (
                          <>
                            <AlertTriangle size={18} />
                            <span>{t('delete')}</span>
                          </>
                        )}
                      </motion.button>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </ModalPortal>
  );
};

export const DeleteRawModal: React.FC<RawModalProps> = ({ isOpen, onClose, raw, onConfirm, loading }) => {
  const { t } = useI18n()
  return (
    <ModalPortal isOpen={isOpen}>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
          >
            {/* Enhanced backdrop with red tint */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onClose}
              className="absolute inset-0 bg-gradient-to-br from-red-900/20 via-black/50 to-rose-900/20 backdrop-blur-md"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 30 }}
              transition={{ duration: 0.3, ease: [0.34, 1.56, 0.64, 1] }}
              className="relative max-w-md w-full mx-4"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Glass morphism container with red tint */}
              <div className="bg-gradient-to-br from-red-500/10 via-white/5 to-rose-500/10 backdrop-blur-xl border border-red-300/20 rounded-3xl shadow-2xl overflow-hidden">
                {/* Subtle glow effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-red-400/5 to-rose-400/5 rounded-3xl"></div>

                {/* Header */}
                <div className="relative px-8 py-6 border-b border-red-200/10">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="relative">
                        <div className="w-12 h-12 bg-gradient-to-br from-red-400/20 to-rose-400/20 rounded-2xl flex items-center justify-center backdrop-blur-sm border border-red-300/20">
                          <AlertTriangle className="text-red-300" size={22} />
                        </div>
                        <div className="absolute -inset-1 bg-gradient-to-r from-red-400/20 to-rose-400/20 rounded-2xl blur opacity-50"></div>
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-white drop-shadow-sm">{t('rawMaterialDetails.deleteRawMaterial')}</h3>
                        <p className="text-sm text-red-100/80">{t('modal.deletePurchaseSubtitle')}</p>
                      </div>
                    </div>
                    <motion.button
                      whileHover={{ scale: 1.1, rotate: 90 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={onClose}
                      className="w-fit h-11 bg-orange-400/10 hover:bg-orange-400/20 rounded-2xl flex items-center justify-center text-orange-200 hover:text-white transition-all duration-200 backdrop-blur-sm border border-orange-300/10"
                    >
                      <X size={16} />
                    </motion.button>
                  </div>
                </div>

                {/* Content */}
                <div className="relative px-8 py-8">
                  <div className="space-y-6">
                    <div className="text-center">
                      <p className="text-white/90 mb-4 text-lg">
                        {t('modal.deleteConfirm')} <span className="font-semibold text-red-200">{raw.name}</span>?
                      </p>
                      {/* Info card with glass effect */}
                      <div className="bg-gradient-to-br from-white/5 to-red-400/5 backdrop-blur-sm rounded-2xl p-6 border border-red-200/10 space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-red-100/70 text-sm font-medium">{t('raw.materialName')}</span>
                          <span className="text-white font-semibold">{raw.name}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-red-100/70 text-sm font-medium">{t('modal.InvWorth')}</span>
                          <span className="text-red-200 font-bold text-lg">{(raw.quantity * raw.unit_price).toFixed(2)} DA</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-red-100/70 text-sm font-medium">{t('quantity')}</span>
                          <span className="text-white font-semibold">{raw.quantity}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-red-100/70 text-sm font-medium">{t('vendor')}</span>
                          <span className="text-white font-semibold">{raw.vendor}</span>
                        </div>
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex gap-4 pt-4">
                      <motion.button
                        whileHover={{ scale: 1.02, y: -2 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={onClose}
                        disabled={loading}
                        className="flex-1 px-6 py-4 bg-gradient-to-r from-white/10 to-white/5 hover:from-white/20 hover:to-white/10 text-white font-semibold rounded-2xl transition-all duration-200 backdrop-blur-sm border border-white/10 hover:border-white/20"
                      >
                        {t('modal.keepraw')}
                      </motion.button>

                      <motion.button
                        whileHover={{ scale: 1.02, y: -2 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={onConfirm}
                        disabled={loading}
                        className="flex-1 flex items-center justify-center gap-3 px-6 py-4 bg-gradient-to-r from-red-500/80 to-rose-500/80 hover:from-red-500 hover:to-rose-500 disabled:from-red-600/50 disabled:to-rose-600/50 text-white font-semibold rounded-2xl transition-all duration-200 backdrop-blur-sm border border-red-400/20 shadow-lg shadow-red-500/20"
                      >
                        {loading ? (
                          <>
                            <motion.div
                              animate={{ rotate: 360 }}
                              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                              className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full"
                            />
                            <span>{t('modal.deleting')}</span>
                          </>
                        ) : (
                          <>
                            <AlertTriangle size={18} />
                            <span>{t('rawMaterialDetails.deleteRawMaterial')}</span>
                          </>
                        )}
                      </motion.button>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </ModalPortal>
  );
};
