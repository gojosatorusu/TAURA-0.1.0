import React from 'react';
import { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { invoke } from '@tauri-apps/api/core';
import { useMessage } from './context/Message';
import { useEdit } from './context/EditContext';
import {useI18n} from './context/I18nContext';
import { DeleteVendorModal } from '../Components/Modals';
import {
  ArrowLeft,
  User,
  Phone,
  MapPin,
  FileText,
  Edit3,
  Save,
  X,
  Trash2,
  Filter,
  Calendar,
  DollarSign,
  CreditCard,
  AlertTriangle,
  CheckCircle,
  Search,
  Building,
  ChevronDown,
  Hash,
  Plus,
  Printer,
  Receipt,
  AlertCircle
} from 'lucide-react';

interface Vendor {
  id: number;
  name: string;
  location: string;  // Changed from email/address to match PursAndSales
  phone: string;
  nif: string;
  nis: string;
  ar: string;
  rc: string;
  region: string;
  rest?: number;
}

interface Document {
  code: number;
  status: "Approved" | "Cancelled";
  total: number;
  date: string;
  payments: Versement[];
  doc_type: string; // 'BL' or 'Invoice'
  description: string;
  remise: number;
  payment_method: String;
}

interface Versement {
  number: number;
  amount: number;
  date: string; // Changed from Date to string for consistency
}

interface Rester {
  id: number;
  name: string;
  rest: number;
}

const VendorDetails = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [vendor, setVendor] = useState<Vendor | null>(location.state);
  const {t} = useI18n();
  // Editing states
  const { isEditing, setIsEditing } = useEdit();
  const [editForm, setEditForm] = useState<Vendor>(location.state || {});

  // Expand rows
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  // Data states
  const [blData, setBLData] = useState<Document[]>([]);
  const [invoiceData, setInvoiceData] = useState<Document[]>([]);

  // Loading states
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);

  // Modal states
  const [showDeleteModal, setShowDeleteModal] = useState<boolean>(false);

  // Filter states
  const [documentTypeFilter, setDocumentTypeFilter] = useState('all'); // 'all', 'BL', 'Invoice'
  const [paymentStatusFilter, setPaymentStatusFilter] = useState('all'); // 'all', 'paid', 'unpaid'
  const [yearFilter, setYearFilter] = useState(new Date().getFullYear());
  const [searchTerm, setSearchTerm] = useState('');

  // Payment section state
  const [showPaymentSection, setShowPaymentSection] = useState(false);

  const [locationSuggestions, setLocationSuggestions] = useState<string[]>([]);
  const [showLocationSuggestions, setShowLocationSuggestions] = useState(false);
  const [selectedLocationSuggestionIndex, setSelectedLocationSuggestionIndex] = useState(-1);
  const [allLocations, setAllLocations] = useState<string[]>([]);

  const [regionSuggestions, setRegionSuggestions] = useState<string[]>([]);
  const [showRegionSuggestions, setShowRegionSuggestions] = useState(false);
  const [selectedRegionSuggestionIndex, setSelectedRegionSuggestionIndex] = useState(-1);
  const [allRegions, setAllRegions] = useState<string[]>([]);

  // Refs for autocomplete
  const locationInputRef = useRef<HTMLInputElement>(null);
  const locationSuggestionsRef = useRef<HTMLDivElement>(null);
  const regionInputRef = useRef<HTMLInputElement>(null);
  const regionSuggestionsRef = useRef<HTMLDivElement>(null);


  const calculateSimilarity = (str1: string, str2: string): number => {
    const s1 = str1.toLowerCase().trim();
    const s2 = str2.toLowerCase().trim();

    if (s1 === s2) return 1;
    if (s1.length === 0 || s2.length === 0) return 0;

    // Check if one string starts with the other
    if (s2.startsWith(s1) || s1.startsWith(s2)) {
      return Math.max(s1.length, s2.length) / Math.min(s1.length, s2.length) * 0.8;
    }

    // Simple character-based similarity
    let matches = 0;
    const minLength = Math.min(s1.length, s2.length);

    for (let i = 0; i < minLength; i++) {
      if (s1[i] === s2[i]) matches++;
    }

    return matches / Math.max(s1.length, s2.length);
  };

  const getLocationSuggestions = (input: string): string[] => {
    if (!input.trim()) return [];

    const suggestions = allLocations
      .map(location => ({
        location,
        similarity: calculateSimilarity(input, location)
      }))
      .filter(item => item.similarity > 0.3)
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, 5)
      .map(item => item.location);

    return suggestions;
  };

  const getRegionSuggestions = (input: string): string[] => {
    if (!input.trim()) return [];

    const suggestions = allRegions
      .map(region => ({
        region,
        similarity: calculateSimilarity(input, region)
      }))
      .filter(item => item.similarity > 0.3)
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, 5)
      .map(item => item.region);

    return suggestions;
  };

  const selectLocationSuggestion = (location: string) => {
    setEditForm(prev => ({ ...prev, location }));
    setShowLocationSuggestions(false);
    setSelectedLocationSuggestionIndex(-1);
    locationInputRef.current?.focus();
  };

  const selectRegionSuggestion = (region: string) => {
    setEditForm(prev => ({ ...prev, region }));
    setShowRegionSuggestions(false);
    setSelectedRegionSuggestionIndex(-1);
    regionInputRef.current?.focus();
  };

  const handleLocationKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showLocationSuggestions) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedLocationSuggestionIndex(prev =>
          prev < locationSuggestions.length - 1 ? prev + 1 : 0
        );
        break;

      case 'ArrowUp':
        e.preventDefault();
        setSelectedLocationSuggestionIndex(prev =>
          prev > 0 ? prev - 1 : locationSuggestions.length - 1
        );
        break;

      case 'Tab':
        e.preventDefault();
        if (selectedLocationSuggestionIndex >= 0) {
          selectLocationSuggestion(locationSuggestions[selectedLocationSuggestionIndex]);
        } else if (locationSuggestions.length > 0) {
          selectLocationSuggestion(locationSuggestions[0]);
        }
        break;

      case 'Enter':
        e.preventDefault();
        if (selectedLocationSuggestionIndex >= 0) {
          selectLocationSuggestion(locationSuggestions[selectedLocationSuggestionIndex]);
        }
        break;

      case 'Escape':
        setShowLocationSuggestions(false);
        setSelectedLocationSuggestionIndex(-1);
        break;
    }
  };

  const handleRegionKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showRegionSuggestions) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedRegionSuggestionIndex(prev =>
          prev < regionSuggestions.length - 1 ? prev + 1 : 0
        );
        break;

      case 'ArrowUp':
        e.preventDefault();
        setSelectedRegionSuggestionIndex(prev =>
          prev > 0 ? prev - 1 : regionSuggestions.length - 1
        );
        break;

      case 'Tab':
        e.preventDefault();
        if (selectedRegionSuggestionIndex >= 0) {
          selectRegionSuggestion(regionSuggestions[selectedRegionSuggestionIndex]);
        } else if (regionSuggestions.length > 0) {
          selectRegionSuggestion(regionSuggestions[0]);
        }
        break;

      case 'Enter':
        e.preventDefault();
        if (selectedRegionSuggestionIndex >= 0) {
          selectRegionSuggestion(regionSuggestions[selectedRegionSuggestionIndex]);
        }
        break;

      case 'Escape':
        setShowRegionSuggestions(false);
        setSelectedRegionSuggestionIndex(-1);
        break;
    }
  };

  useEffect(() => {
    const loadRegionsAndLocations = async () => {
      try {
        const regions = await invoke('get_all_regions_vendors') as string[];
        setAllRegions(regions);

        const locations = await invoke('get_all_locations_vendors') as string[];
        setAllLocations(locations);
      } catch (error) {
        console.error('Error loading regions/locations:', error);
        handleError(t('client.loadRegionsFailed'));
      }
    };

    loadRegionsAndLocations();
  }, []);
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // Location suggestions
      if (locationSuggestionsRef.current && !locationSuggestionsRef.current.contains(event.target as Node) &&
        locationInputRef.current && !locationInputRef.current.contains(event.target as Node)) {
        setShowLocationSuggestions(false);
        setSelectedLocationSuggestionIndex(-1);
      }

      // Region suggestions
      if (regionSuggestionsRef.current && !regionSuggestionsRef.current.contains(event.target as Node) &&
        regionInputRef.current && !regionInputRef.current.contains(event.target as Node)) {
        setShowRegionSuggestions(false);
        setSelectedRegionSuggestionIndex(-1);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);


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


  const toggleRowExpansion = (rowId: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(rowId)) {
      newExpanded.delete(rowId);
    } else {
      newExpanded.add(rowId);
    }
    setExpandedRows(newExpanded);
  };

  const handleInfo = (infoMessage: string) => {
    addToast({
      message: infoMessage,
      type: 'info',
      duration: 1000
    });
  };
  const handleWarning = (warningMessage: string): void => {
    addToast({
      message: warningMessage,
      type: 'warning',
      duration: 2000, // Longer duration for errors
    });
  };

  // Fetch initial data
  useEffect(() => {
    if (!vendor) {
      navigate(-1);
      return;
    }

    const fetchRecordData = async () => {
      try {
        handleInfo(t('vendorDetails.loadingVendor'));

        // Fetch BL items
        const BLResult = await invoke('get_bl_by_vendor', { vId: vendor.id });
        const BLs = BLResult as Document[];
        setBLData(BLs);
        console.log("BLS", BLs)

        // Fetch Invoice items
        const InvoiceResult = await invoke('get_invoice_by_vendor', { vId: vendor.id });
        const Invoices = InvoiceResult as Document[];
        setInvoiceData(Invoices);
        console.log("Invoice", Invoices)


        const Rest = await invoke('get_vendor_rest', {
          vId: vendor.id,
          startDate: null, // Use default start date
          endDate: null    // Use default end date (current date)
        }) as Rester | null;

        console.log("Rest", Rest)

        setVendor(prev => prev ? { ...prev, rest: Rest ? Rest.rest : 0 } : prev);


        console.log('Vendor data fetched:', {
          BLs: BLs,
          Invoices: Invoices
        });

      } catch (error) {
        console.error('Error fetching vendor data:', error);
        handleError(t('vendorDetails.loadingFailed'));
      } finally {
        setLoadingData(false);
      }
    };

    fetchRecordData();
  }, [vendor?.id, navigate]);

  const handleEditToggle = () => {
    if (isEditing && vendor) {
      // Reset form when canceling
      setEditForm({ ...vendor });
      // Reset suggestions
      setShowLocationSuggestions(false);
      setShowRegionSuggestions(false);
      setSelectedLocationSuggestionIndex(-1);
      setSelectedRegionSuggestionIndex(-1);
    }
    setIsEditing(!isEditing);
  };
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setEditForm(prev => ({ ...prev, [name]: value }));

    // Handle location autocomplete
    if (name === 'location') {
      const suggestions = getLocationSuggestions(value);
      setLocationSuggestions(suggestions);
      setShowLocationSuggestions(suggestions.length > 0);
      setSelectedLocationSuggestionIndex(-1);
    }

    // Handle region autocomplete
    if (name === 'region') {
      const suggestions = getRegionSuggestions(value);
      setRegionSuggestions(suggestions);
      setShowRegionSuggestions(suggestions.length > 0);
      setSelectedRegionSuggestionIndex(-1);
    }
  };

  // Handle save changes
  const handleSaveChanges = async () => {
    if (!vendor) return;

    // Validation patterns (Algerian formats) - same as your original validation
    const validationPatterns = {
      phone: /^(0[5-7]\d{8}|0[1-4,8-9]\d{7})$/,
      nif: /^\d{15}$/,
      nis: /^\d{15}$/,
      rc: /^\d{2}\/\d{2}-\d{7}[A-Z]\d{2}$/,
      ar: /^\d{11}$/,
      name: /^[a-zA-ZÀ-ÿ\u0600-\u06FF\s\-'\.]+$/,
      region: /^[a-zA-ZÀ-ÿ\u0600-\u06FF\s]+$/
    };

    // Validation function - same as your original validation
    const validateField = (field: string, value: string): string | null => {
      const trimmedValue = value.trim();

      switch (field) {
        case 'name':
          if (!trimmedValue) return t('vendor.nameRequired');
          if (trimmedValue.length < 2) return t('vendor.nameMinLength');
          if (trimmedValue.length > 100) return t('vendor.nameMaxLength');
          if (!validationPatterns.name.test(trimmedValue)) return t('vendor.nameInvalid');
          return null;

        case 'location':
          if (!trimmedValue) return t('vendor.locationRequired');
          if (trimmedValue.length < 2) return t('vendor.locationInvalid');
          return null;

        case 'phone':
          if (!trimmedValue) return t('vendor.phoneRequired');
          if (!validationPatterns.phone.test(trimmedValue)) return t('vendor.phoneInvalid');
          return null;

        case 'ar':
          if (!trimmedValue) return t('vendor.arRequired');
          if (!validationPatterns.ar.test(trimmedValue)) return t('vendor.arInvalid');
          return null;

        case 'nif':
          if (!trimmedValue) return t('vendor.nifRequired');
          if (!validationPatterns.nif.test(trimmedValue)) return t('vendor.nifInvalid');
          return null;

        case 'nis':
          if (!trimmedValue) return t('vendor.nisRequired');
          if (!validationPatterns.nis.test(trimmedValue)) return t('vendor.nisInvalid');
          return null;

        case 'rc':
          if (!trimmedValue) return t('vendor.rcRequired');
          if (!validationPatterns.rc.test(trimmedValue)) return t('vendor.rcInvalid');
          return null;

        case 'region':
          if (!trimmedValue) return t('vendor.regionRequired');
          if (!validationPatterns.region.test(trimmedValue)) return t('vendor.regionInvalid');
          return null;

        default:
          return null;
      }
    };

    // Validate all fields
    const fields = ['name', 'location', 'phone', 'ar', 'nif', 'nis', 'rc', 'region'];
    for (const field of fields) {
      const error = validateField(field, String(editForm[field as keyof typeof editForm] ?? ''));
      if (error) {
        handleError(error);
        return;
      }
    }

    setLoading(true);
    try {
      handleInfo(t('message.updating'));

      // Prepare vendor data with trimmed values
      const vendorData = {
        vId: vendor.id,
        name: editForm.name.trim(),
        location: editForm.location?.trim() || '',
        phone: editForm.phone?.trim() || '',
        ar: editForm.ar.trim(),
        nif: editForm.nif.trim(),
        nis: editForm.nis.trim(),
        rc: editForm.rc.trim(),
        region: editForm.region.trim()
      };

      await invoke('update_vendor', vendorData);

      // Update local state with trimmed values
      setVendor({ ...editForm });
      setIsEditing(false);
      handleSuccess(t('vendorDetails.updateSuccess'));
    } catch (error) {
      console.error('Failed to update vendor:', error);
      handleError(t('vendorDetails.updateFailed'));
    } finally {
      setLoading(false);
    }
  };

  // Handle delete vendor
  const handleDeleteVendor = async () => {
    if (!vendor) return;

    setLoading(true);
    try {
      await invoke('delete_vendor', { vId: vendor.id });
      handleSuccess(t('vendorDetails.deleteSuccess'));

      setTimeout(() => {
        navigate(-1);
      }, 2000);
    } catch (error) {
      console.error('Failed to delete vendor:', error);

      // Better error handling
      let errorMessage = t('vendorDetails.deleteFail');
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

  // Combine and filter payment data
  const combinedData = useMemo(() => {
    interface CombinedDocument extends Document {
      docType: 'BL' | 'Invoice';
    }
    let combined: CombinedDocument[] = [];

    // Add BL data
    if (documentTypeFilter === 'all' || documentTypeFilter === 'BL') {
      combined = combined.concat(
        blData.map(item => ({ ...item, docType: 'BL' }))
      );
    }

    // Add Invoice data
    if (documentTypeFilter === 'all' || documentTypeFilter === 'Invoice') {
      combined = combined.concat(
        invoiceData.map(item => ({ ...item, docType: 'Invoice' }))
      );
    }

    // Filter by year
    combined = combined.filter(item => {
      const itemYear = new Date(item.date).getFullYear();
      return itemYear === yearFilter;
    });

    // Filter by payment status
    if (paymentStatusFilter !== 'all') {
      combined = combined.filter(item => {
        if (item.status === 'Cancelled') return true; // Always show cancelled

        const totalPaid = item.payments.reduce((sum, payment) => sum + payment.amount, 0);
        const p_total = item.total * (100 - item.remise) / 100;
        const isPaid = totalPaid >= p_total;

        return paymentStatusFilter === 'paid' ? isPaid : !isPaid;
      });
    }

    // Filter by search term
    if (searchTerm) {
      combined = combined.filter(item =>
        item.code.toString().toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.description.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Sort by date (most recent first)
    combined.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return combined;
  }, [blData, invoiceData, documentTypeFilter, paymentStatusFilter, yearFilter, searchTerm]);

  // Get available years for filter
  const availableYears = useMemo(() => {
    const allData = [...blData, ...invoiceData];
    const years = [...new Set(allData.map(item => new Date(item.date).getFullYear()))];
    return years.sort((a, b) => b - a);
  }, [blData, invoiceData]);

  // Calculate summary statistics
  const summaryStats = useMemo(() => {
    const totalDocuments = combinedData.length;
    const totalAmount = combinedData.reduce((sum, item) => {
      const p_total = item.total * (100 - item.remise) / 100;
      return sum + p_total;
    }, 0);
    const totalPaid = combinedData.reduce((sum, item) => {
      return sum + item.payments.reduce((paySum, payment) => paySum + payment.amount, 0);
    }, 0);
    const totalOutstanding = totalAmount - totalPaid;

    return {
      totalDocuments,
      totalAmount,
      totalPaid,
      totalOutstanding
    };
  }, [combinedData]);

  // Handle print functionality
  const handlePrintVendorReport = () => {
    if (!vendor) return;

    const printWindow = window.open('', '_blank', 'width=800,height=600');
    if (!printWindow) {
      console.error('Unable to open print window');
      return;
    }

    const printContent = generateVendorReportHTML(vendor, combinedData, summaryStats);
    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.focus();

    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 500);
  };

  if (loadingData) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500 mx-auto"></div>
          <p className="text-slate-400 mt-4">{t('vendorDetails.loadingVendor')}</p>
        </div>
      </div>
    );
  }

  if (!vendor) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <AlertCircle size={64} className="text-red-500 mx-auto mb-4" />
          <p className="text-slate-400">{t('vendorDetails.vendorNotFound')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className='flex flex-col gap-8 mx-auto py-6 pb-5 px-1 lg:px-2 xl:px-4 max-w-7xl relative h-fit'>
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
            {t('vendor.backToVendors')}
          </button>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handlePrintVendorReport}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors"
          >
            <Printer size={16} />
            {t('printReport')}
          </button>
          <button
            onClick={() => setShowDeleteModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg transition-colors"
            disabled={loading}
          >
            <Trash2 size={16} />
            {t('delete')}
          </button>
          <button
            onClick={handleEditToggle}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            disabled={loading}
          >
            {isEditing ? <X size={16} /> : <Edit3 size={16} />}
            {isEditing ? t('delete') : t('edit')}
          </button>
        </div>
      </div>

      {/* Vendor Information */}
      <div className="bg-slate-900 p-6 rounded-xl shadow-md border border-slate-700">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <User className="text-blue-500" size={28} />
            {t('vendorDetails.title')}
          </h1>
          {isEditing && (
            <button
              onClick={handleSaveChanges}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-green-800 text-white rounded-lg transition-colors"
            >
              <Save size={16} />
              {loading ? t('saving') : t('saveChanges')}
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Vendor Name */}
          <div>
            <label className="text-sm font-medium text-slate-300 mb-2 flex items-center gap-2">
              <Building size={16} />
              {t('vendor.vendorName')}
            </label>
            {isEditing ? (
              <input
                title="name"
                type="text"
                value={editForm.name}
                onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                className="w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={loading}
              />
            ) : (
              <div className="w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-lg text-white">
                {vendor.name}
              </div>
            )}
          </div>

          {/* Location */}
          <div className="relative">
            <label className="text-sm font-medium text-slate-300 mb-2 flex items-center gap-2">
              <MapPin size={16} />
              Location
            </label>
            {isEditing ? (
              <div className="relative">
                <input
                  ref={locationInputRef}
                  title="location"
                  name="location"
                  type="text"
                  value={editForm.location || ''}
                  onChange={handleInputChange}
                  onKeyDown={handleLocationKeyDown}
                  className="w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={loading}
                  placeholder="Start typing location name..."
                  autoComplete="off"
                />
                {showLocationSuggestions && (
                  <ChevronDown
                    size={16}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 pointer-events-none"
                  />
                )}
              </div>
            ) : (
              <div className="w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-lg text-white">
                {vendor.location || t('NotSpecified')}
              </div>
            )}

            {/* Location Suggestions Dropdown */}
            {isEditing && showLocationSuggestions && locationSuggestions.length > 0 && (
              <motion.div
                ref={locationSuggestionsRef}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="absolute z-10 w-full mt-1 bg-slate-800 border border-slate-600 rounded-lg shadow-lg max-h-48 overflow-y-auto"
              >
                {locationSuggestions.map((suggestion, index) => (
                  <motion.div
                    key={suggestion}
                    whileHover={{ backgroundColor: 'rgb(51, 65, 85)' }}
                    className={`px-4 py-3 cursor-pointer text-white transition-colors ${index === selectedLocationSuggestionIndex ? 'bg-slate-700' : 'hover:bg-slate-700'
                      }`}
                    onClick={() => selectLocationSuggestion(suggestion)}
                  >
                    {suggestion}
                  </motion.div>
                ))}
              </motion.div>
            )}
          </div>

          {/* Phone */}
          <div>
            <label className="text-sm font-medium text-slate-300 mb-2 flex items-center gap-2">
              <Phone size={16} />
              {t('phoneNumber')}
            </label>
            {isEditing ? (
              <input
                title="phone"
                type="text"
                value={editForm.phone || ''}
                onChange={(e) => setEditForm(prev => ({ ...prev, phone: e.target.value }))}
                className="w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={loading}
              />
            ) : (
              <div className="w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-lg text-white">
                {vendor.phone || 'Not specified'}
              </div>
            )}
          </div>

          {/* RC */}
          <div>
            <label className="text-sm font-medium text-slate-300 mb-2 flex items-center gap-2">
              <Hash size={16} />
              RC
            </label>
            {isEditing ? (
              <input
                title="RC"
                type="text"
                value={editForm.rc}
                onChange={(e) => setEditForm(prev => ({ ...prev, rc: e.target.value }))}
                className="w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={loading}
              />
            ) : (
              <div className="w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-lg text-white">
                {vendor.rc}
              </div>
            )}
          </div>

          {/* AR */}
          <div>
            <label className="text-sm font-medium text-slate-300 mb-2 flex items-center gap-2">
              <Hash size={16} />
              AR
            </label>
            {isEditing ? (
              <input
                title="AR"
                type="text"
                value={editForm.ar}
                onChange={(e) => setEditForm(prev => ({ ...prev, ar: e.target.value }))}
                className="w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={loading}
              />
            ) : (
              <div className="w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-lg text-white">
                {vendor.ar}
              </div>
            )}
          </div>

          {/* NIF */}
          <div>
            <label className="text-sm font-medium text-slate-300 mb-2 flex items-center gap-2">
              <Hash size={16} />
              NIF
            </label>
            {isEditing ? (
              <input
                title="NIF"
                type="text"
                value={editForm.nif}
                onChange={(e) => setEditForm(prev => ({ ...prev, nif: e.target.value }))}
                className="w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={loading}
              />
            ) : (
              <div className="w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-lg text-white">
                {vendor.nif}
              </div>
            )}
          </div>

          {/* NIS */}
          <div>
            <label className="text-sm font-medium text-slate-300 mb-2 flex items-center gap-2">
              <Hash size={16} />
              NIS
            </label>
            {isEditing ? (
              <input
                title="NIS"
                type="text"
                value={editForm.nis}
                onChange={(e) => setEditForm(prev => ({ ...prev, nis: e.target.value }))}
                className="w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={loading}
              />
            ) : (
              <div className="w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-lg text-white">
                {vendor.nis}
              </div>
            )}
          </div>

          {/* Region */}
          <div className="relative">
            <label className="text-sm font-medium text-slate-300 mb-2 flex items-center gap-2">
              <MapPin size={16} />
              {t('region')}
            </label>
            {isEditing ? (
              <div className="relative">
                <input
                  ref={regionInputRef}
                  title="Region"
                  name="region"
                  type="text"
                  value={editForm.region}
                  onChange={handleInputChange}
                  onKeyDown={handleRegionKeyDown}
                  className="w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={loading}
                  placeholder="Start typing region name..."
                  autoComplete="off"
                />
                {showRegionSuggestions && (
                  <ChevronDown
                    size={16}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 pointer-events-none"
                  />
                )}
              </div>
            ) : (
              <div className="w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-lg text-white">
                {vendor.region}
              </div>
            )}

            {/* Region Suggestions Dropdown */}
            {isEditing && showRegionSuggestions && regionSuggestions.length > 0 && (
              <motion.div
                ref={regionSuggestionsRef}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="absolute z-10 w-full mt-1 bg-slate-800 border border-slate-600 rounded-lg shadow-lg max-h-48 overflow-y-auto"
              >
                {regionSuggestions.map((suggestion, index) => (
                  <motion.div
                    key={suggestion}
                    whileHover={{ backgroundColor: 'rgb(51, 65, 85)' }}
                    className={`px-4 py-3 cursor-pointer text-white transition-colors ${index === selectedRegionSuggestionIndex ? 'bg-slate-700' : 'hover:bg-slate-700'
                      }`}
                    onClick={() => selectRegionSuggestion(suggestion)}
                  >
                    {suggestion}
                  </motion.div>
                ))}
              </motion.div>
            )}
          </div>
          <div className="relative">
            <label className="text-sm font-medium text-slate-300 mb-2 flex items-center gap-2">
              <DollarSign size={16} />
              {t('totalRest')}
            </label>

            <div className="w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-lg text-white">
              {vendor.rest}
            </div>
          </div>
        </div>
      </div>

      {/* Summary Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-slate-900 p-6 rounded-xl border border-slate-700">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-blue-500/20 rounded-lg flex items-center justify-center">
              <FileText className="text-blue-400" size={24} />
            </div>
            <div>
              <p className="text-slate-400 text-sm">{t('totalDocuments')}</p>
              <p className="text-white text-2xl font-bold">{summaryStats.totalDocuments}</p>
            </div>
          </div>
        </div>

        <div className="bg-slate-900 p-6 rounded-xl border border-slate-700">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-green-500/20 rounded-lg flex items-center justify-center">
              <DollarSign className="text-green-400" size={24} />
            </div>
            <div>
              <p className="text-slate-400 text-sm">{t('totalAmount')}</p>
              <p className="text-white text-2xl font-bold">{summaryStats.totalAmount.toFixed(2)} DA</p>
            </div>
          </div>
        </div>

        <div className="bg-slate-900 p-6 rounded-xl border border-slate-700">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-emerald-500/20 rounded-lg flex items-center justify-center">
              <CheckCircle className="text-emerald-400" size={24} />
            </div>
            <div>
              <p className="text-slate-400 text-sm">{t('totalPaid')}</p>
              <p className="text-white text-2xl font-bold">{summaryStats.totalPaid.toFixed(2)} DA</p>
            </div>
          </div>
        </div>

        <div className="bg-slate-900 p-6 rounded-xl border border-slate-700">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-orange-500/20 rounded-lg flex items-center justify-center">
              <AlertTriangle className="text-orange-400" size={24} />
            </div>
            <div>
              <p className="text-slate-400 text-sm">{t('totalOutstanding')}</p>
              <p className="text-white text-2xl font-bold">{summaryStats.totalOutstanding.toFixed(2)} DA</p>
            </div>
          </div>
        </div>
      </div>

      {/* Payment History Section */}
      <div className="bg-slate-900 p-6 rounded-xl shadow-md border border-slate-700">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white flex items-center gap-3">
            <CreditCard className="text-green-500" size={24} />
            {t('paymentHistory')}
          </h2>
          <button
            onClick={() => setShowPaymentSection(!showPaymentSection)}
            className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
          >
            <ChevronDown
              size={16}
              className={`transform transition-transform ${showPaymentSection ? 'rotate-180' : ''}`}
            />
            {showPaymentSection ? t('Hide') : t('Show')} {t('Details')}
          </button>
        </div>

        <AnimatePresence>
          {showPaymentSection && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
            >
              {/* Filters */}
              <div className="bg-slate-800/50 p-4 rounded-lg border border-slate-600 mb-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Document Type Filter */}
                  <div>
                    <label className="text-sm font-medium text-slate-300 mb-2 flex items-center gap-2">
                      <FileText size={16} />
                      {t('documentType')}
                    </label>
                    <select
                      title="document"
                      value={documentTypeFilter}
                      onChange={(e) => setDocumentTypeFilter(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="all">All Documents</option>
                      <option value="BL">BL Only</option>
                      <option value="Invoice">Invoice Only</option>
                    </select>
                  </div>

                  {/* Payment Status Filter */}
                  <div>
                    <label className="text-sm font-medium text-slate-300 mb-2 flex items-center gap-2">
                      <Filter size={16} />
                      {t('paymentStatus')}
                    </label>
                    <select
                      title="status"
                      value={paymentStatusFilter}
                      onChange={(e) => setPaymentStatusFilter(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="all">All Status</option>
                      <option value="paid">Paid</option>
                      <option value="unpaid">Unpaid</option>
                    </select>
                  </div>

                  {/* Year Filter */}
                  <div>
                    <label className="text-sm font-medium text-slate-300 mb-2 flex items-center gap-2">
                      <Calendar size={16} />
                      {t('year')}
                    </label>
                    <select
                      title="year"
                      value={yearFilter}
                      onChange={(e) => setYearFilter(Number(e.target.value))}
                      className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {availableYears.map(year => (
                        <option key={year} value={year}>{year}</option>
                      ))}
                    </select>
                  </div>

                  {/* Search */}
                  <div>
                    <label className="text-sm font-medium text-slate-300 mb-2 flex items-center gap-2">
                      <Search size={16} />
                      {t('search')}
                    </label>
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="Search code or description..."
                      className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>


              {/* Payment Table */}

              {/* Payment Table */}
              {combinedData.length > 0 ? (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5 }}
                  className="bg-slate-800/50 rounded-xl border border-slate-600 overflow-hidden"
                >
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <motion.thead
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.2 }}
                        className="bg-slate-700/80"
                      >
                        <tr>
                          <th className="px-6 py-4 text-left text-sm font-semibold text-slate-200 uppercase tracking-wide">
                            Document
                          </th>
                          <th className="px-6 py-4 text-left text-sm font-semibold text-slate-200 uppercase tracking-wide">
                            Date
                          </th>
                          <th className="px-6 py-4 text-left text-sm font-semibold text-slate-200 uppercase tracking-wide">
                            Description
                          </th>
                          <th className="px-6 py-4 text-right text-sm font-semibold text-slate-200 uppercase tracking-wide">
                            {t('amount')}
                          </th>
                          <th className="px-6 py-4 text-right text-sm font-semibold text-slate-200 uppercase tracking-wide">
                            {t('paid')}
                          </th>
                          <th className="px-6 py-4 text-right text-sm font-semibold text-slate-200 uppercase tracking-wide">
                            {t('balance')}
                          </th>
                          <th className="px-6 py-4 text-center text-sm font-semibold text-slate-200 uppercase tracking-wide">
                            {t('status')}
                          </th>
                        </tr>
                      </motion.thead>
                      <tbody>
                        {combinedData.map((item, index) => {
                          const p_total = item.total * (100 - item.remise) / 100;
                          const totalPaid = item.payments.reduce((sum, payment) => sum + payment.amount, 0);
                          const remaining = p_total - totalPaid;
                          const isPaid = totalPaid >= p_total;
                          const isCancelled = item.status === 'Cancelled';
                          const rowId = `${item.docType}-${item.code}`;
                          const isExpanded = expandedRows.has(rowId);
                          const hasPayments = !isCancelled && item.payments.length > 0;

                          return (
                            <React.Fragment key={rowId}>
                              {/* Main Document Row */}
                              <motion.tr
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{
                                  delay: index * 0.1,
                                  duration: 0.4,
                                  ease: "easeOut"
                                }}
                                className={`transition-all duration-300 border-b border-slate-600/30 ${isCancelled ? 'bg-red-900/10' : 'bg-slate-800/20'
                                  } ${hasPayments ? 'cursor-pointer hover:bg-slate-700/30' : ''}`}
                                onClick={hasPayments ? () => toggleRowExpansion(rowId) : undefined}
                              >
                                {/* Document Info */}
                                <td className="px-6 py-4">
                                  <div className="flex items-center gap-3">
                                    <motion.div
                                      initial={{ scale: 0.8, opacity: 0 }}
                                      animate={{ scale: 1, opacity: 1 }}
                                      transition={{ delay: index * 0.1 + 0.2 }}
                                      className={`relative w-12 h-12 rounded-xl flex items-center justify-center text-white text-sm font-bold shadow-lg ${item.docType === 'BL'
                                        ? 'bg-gradient-to-br from-blue-500 to-blue-600'
                                        : 'bg-gradient-to-br from-emerald-500 to-emerald-600'
                                        } ${isCancelled ? 'opacity-50 grayscale' : ''}`}
                                    >
                                      {item.docType === 'BL' ? 'BL' : t('invoice')}
                                      {/* Payment count badge */}
                                      {hasPayments && (
                                        <motion.div
                                          initial={{ scale: 0 }}
                                          animate={{ scale: 1 }}
                                          transition={{
                                            delay: index * 0.1 + 0.4,
                                            type: "spring",
                                            stiffness: 300,
                                            damping: 20
                                          }}
                                          className="absolute -top-1 -right-1 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center text-xs font-bold text-white border-2 border-slate-800"
                                        >
                                          {item.payments.length}
                                        </motion.div>
                                      )}
                                    </motion.div>
                                    <div className="flex-1">
                                      <div className="flex items-center gap-2">
                                        <motion.div
                                          initial={{ opacity: 0 }}
                                          animate={{ opacity: 1 }}
                                          transition={{ delay: index * 0.1 + 0.3 }}
                                          className={`text-white font-semibold text-lg ${isCancelled ? 'line-through opacity-60' : ''}`}
                                        >
                                          #{item.code}
                                        </motion.div>
                                        {hasPayments && (
                                          <motion.div
                                            initial={{ opacity: 0, scale: 0.8 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            transition={{ delay: index * 0.1 + 0.5 }}
                                            className="flex items-center gap-1 text-xs"
                                          >
                                            <motion.div
                                              animate={{ scale: [1, 1.2, 1] }}
                                              transition={{ duration: 2, repeat: Infinity }}
                                              className="w-1.5 h-1.5 bg-green-400 rounded-full"
                                            />
                                            <span className="text-green-400 font-medium">
                                              {item.payments.length} {t('payment')}{item.payments.length !== 1 ? 's' : ''}
                                            </span>
                                          </motion.div>
                                        )}
                                      </div>
                                      <motion.div
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        transition={{ delay: index * 0.1 + 0.4 }}
                                        className={`text-sm mt-1 ${item.docType === 'BL' ? 'text-blue-400' : 'text-emerald-400'
                                          } ${isCancelled ? 'opacity-50' : ''}`}
                                      >
                                        {item.docType === 'BL' ? 'BL' : t('invoice')}
                                      </motion.div>
                                      {isCancelled && (
                                        <motion.div
                                          initial={{ opacity: 0, y: -10 }}
                                          animate={{ opacity: 1, y: 0 }}
                                          transition={{ delay: index * 0.1 + 0.6 }}
                                          className="text-red-400 text-xs font-semibold uppercase mt-1 flex items-center gap-1"
                                        >
                                          <X size={12} />
                                          {t('cancelled')}
                                        </motion.div>
                                      )}
                                    </div>
                                  </div>
                                </td>

                                {/* Date */}
                                <td className="px-6 py-4">
                                  <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    transition={{ delay: index * 0.1 + 0.3 }}
                                    className={`text-slate-300 font-medium ${isCancelled ? 'opacity-60' : ''}`}
                                  >
                                    {new Date(item.date).toLocaleDateString('en-GB', {
                                      day: '2-digit',
                                      month: '2-digit',
                                      year: 'numeric'
                                    })}
                                  </motion.div>
                                  <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    transition={{ delay: index * 0.1 + 0.4 }}
                                    className="text-slate-400 text-xs"
                                  >
                                    {new Date(item.date).toLocaleDateString('en-GB', {
                                      weekday: 'short'
                                    })}
                                  </motion.div>
                                </td>

                                {/* Description */}
                                <td className="px-6 py-4">
                                  <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    transition={{ delay: index * 0.1 + 0.35 }}
                                    className={`text-slate-300 ${isCancelled ? 'opacity-60 line-through' : ''}`}
                                  >
                                    {item.description || t('noDesc')}
                                  </motion.div>
                                  {item.remise > 0 && !isCancelled && (
                                    <motion.div
                                      initial={{ opacity: 0, scale: 0.8 }}
                                      animate={{ opacity: 1, scale: 1 }}
                                      transition={{ delay: index * 0.1 + 0.6 }}
                                      className="inline-flex items-center gap-1 mt-2 px-2 py-1 bg-orange-900/30 border border-orange-600/50 rounded-full"
                                    >
                                      <span className="text-orange-400 text-xs font-medium">
                                        {item.remise}% {t('discountWoP')}
                                      </span>
                                    </motion.div>
                                  )}
                                </td>

                                {/* Amount */}
                                <td className="px-6 py-4 text-right">
                                  <motion.div
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: index * 0.1 + 0.4 }}
                                    className={`${isCancelled ? 'opacity-60' : ''}`}
                                  >
                                    {item.remise > 0 ? (
                                      <div>
                                        <div className="text-slate-400 text-sm line-through">
                                          {item.total.toFixed(2)} DA
                                        </div>
                                        <div className="text-white font-bold text-lg">
                                          {p_total.toFixed(2)} DA
                                        </div>
                                      </div>
                                    ) : (
                                      <div className="text-white font-bold text-lg">
                                        {item.total.toFixed(2)} DA
                                      </div>
                                    )}
                                  </motion.div>
                                </td>

                                {/* Paid */}
                                <td className="px-6 py-4 text-right">
                                  {isCancelled ? (
                                    <motion.div
                                      initial={{ opacity: 0 }}
                                      animate={{ opacity: 1 }}
                                      transition={{ delay: index * 0.1 + 0.45 }}
                                      className="text-slate-400 text-sm italic"
                                    >
                                      N/A
                                    </motion.div>
                                  ) : (
                                    <motion.div
                                      initial={{ opacity: 0, x: 20 }}
                                      animate={{ opacity: 1, x: 0 }}
                                      transition={{ delay: index * 0.1 + 0.45 }}
                                      className="text-green-400 font-bold text-lg"
                                    >
                                      {totalPaid.toFixed(2)} DA
                                    </motion.div>
                                  )}
                                </td>

                                {/* Balance */}
                                <td className="px-6 py-4 text-right">
                                  {isCancelled ? (
                                    <motion.div
                                      initial={{ opacity: 0 }}
                                      animate={{ opacity: 1 }}
                                      transition={{ delay: index * 0.1 + 0.5 }}
                                      className="text-slate-400 text-sm italic"
                                    >
                                      N/A
                                    </motion.div>
                                  ) : (
                                    <motion.div
                                      initial={{ opacity: 0, x: 20 }}
                                      animate={{ opacity: 1, x: 0 }}
                                      transition={{ delay: index * 0.1 + 0.5 }}
                                      className={`font-bold text-lg ${remaining > 0 ? 'text-orange-400' : 'text-green-400'
                                        }`}
                                    >
                                      {remaining.toFixed(2)} DA
                                    </motion.div>
                                  )}
                                </td>

                                {/* Status */}
                                <td className="px-6 py-4">
                                  <div className="flex justify-center">
                                    <motion.div
                                      initial={{ opacity: 0, scale: 0.8 }}
                                      animate={{ opacity: 1, scale: 1 }}
                                      transition={{
                                        delay: index * 0.1 + 0.6,
                                        type: "spring",
                                        stiffness: 200,
                                        damping: 15
                                      }}
                                    >
                                      {isCancelled ? (
                                        <div className="px-3 py-1.5 bg-red-900/30 border border-red-600/50 text-red-300 rounded-full text-sm font-semibold flex items-center gap-2">
                                          <X size={14} />
                                          {t('cancelled')}
                                        </div>
                                      ) : isPaid ? (
                                        <div className="px-3 py-1.5 bg-green-900/30 border border-green-600/50 text-green-300 rounded-full text-sm font-semibold flex items-center gap-2">
                                          <CheckCircle size={14} />
                                          {t('paid')}
                                        </div>
                                      ) : (
                                        <div className="px-3 py-1.5 bg-orange-900/30 border border-orange-600/50 text-orange-300 rounded-full text-sm font-semibold flex items-center gap-2">
                                          <AlertTriangle size={14} />
                                          {t('unpaid')}
                                        </div>
                                      )}
                                    </motion.div>
                                  </div>
                                </td>
                              </motion.tr>

                              {/* Payment Detail Rows - Only show when expanded */}
                              <AnimatePresence>
                                {hasPayments && isExpanded && (
                                  <>
                                    {item.payments.map((payment, payIndex) => (
                                      <motion.tr
                                        key={`${rowId}-payment-${payIndex}`}
                                        initial={{ opacity: 0, height: 0, x: -30 }}
                                        animate={{ opacity: 1, height: 'auto', x: 0 }}
                                        exit={{ opacity: 0, height: 0, x: -30 }}
                                        transition={{
                                          duration: 0.4,
                                          delay: payIndex * 0.1,
                                          ease: "easeOut"
                                        }}
                                        className="bg-gradient-to-r from-green-900/20 to-green-900/10 border-l-4 border-green-500/60"
                                      >
                                        {/* Document column - Payment info with connection indicator */}
                                        <td className="px-6 py-3">
                                          <div className="flex items-center gap-3 ml-4">
                                            {/* Connection line */}
                                            <motion.div
                                              initial={{ scaleY: 0 }}
                                              animate={{ scaleY: 1 }}
                                              transition={{ delay: payIndex * 0.1 + 0.2, duration: 0.3 }}
                                              className="w-0.5 h-8 bg-green-500/40 origin-top"
                                            ></motion.div>

                                            <motion.div
                                              initial={{ scale: 0, rotate: -90 }}
                                              animate={{ scale: 1, rotate: 0 }}
                                              transition={{
                                                delay: payIndex * 0.1 + 0.3,
                                                type: "spring",
                                                stiffness: 200,
                                                damping: 15
                                              }}
                                              className="w-8 h-8 bg-green-500/20 rounded-lg flex items-center justify-center border border-green-500/30"
                                            >
                                              <Receipt size={14} className="text-green-400" />
                                            </motion.div>
                                            <motion.div
                                              initial={{ opacity: 0, x: -20 }}
                                              animate={{ opacity: 1, x: 0 }}
                                              transition={{ delay: payIndex * 0.1 + 0.4 }}
                                            >
                                              <div className="text-green-300 text-sm font-semibold">
                                                {t('payment')} #{payment.number}
                                              </div>
                                              <div className="text-green-400/70 text-xs">
                                                {t('payment')}
                                              </div>
                                            </motion.div>
                                          </div>
                                        </td>

                                        {/* Payment Date */}
                                        <td className="px-6 py-3">
                                          <motion.div
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            transition={{ delay: payIndex * 0.1 + 0.35 }}
                                          >
                                            <div className="text-green-300 text-sm font-medium">
                                              {new Date(payment.date).toLocaleDateString('en-GB', {
                                                day: '2-digit',
                                                month: '2-digit',
                                                year: 'numeric'
                                              })}
                                            </div>
                                            <div className="text-green-400/70 text-xs">
                                              {new Date(payment.date).toLocaleDateString('en-GB', {
                                                weekday: 'short'
                                              })}
                                            </div>
                                          </motion.div>
                                        </td>

                                        {/* Payment Description */}
                                        <td className="px-6 py-3">
                                          <motion.div
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            transition={{ delay: payIndex * 0.1 + 0.4 }}
                                            className="text-green-300/80 text-sm italic"
                                          >
                                            {t('paymentReceived')}
                                          </motion.div>
                                        </td>

                                        {/* Empty Amount Column */}
                                        <td className="px-6 py-3">
                                          <div className="text-slate-500 text-xs text-right">
                                            —
                                          </div>
                                        </td>

                                        {/* Payment Amount */}
                                        <td className="px-6 py-3 text-right">
                                          <motion.div
                                            initial={{ opacity: 0, x: 20, scale: 0.8 }}
                                            animate={{ opacity: 1, x: 0, scale: 1 }}
                                            transition={{
                                              delay: payIndex * 0.1 + 0.5,
                                              type: "spring",
                                              stiffness: 150,
                                              damping: 12
                                            }}
                                            className="text-green-400 font-bold text-lg flex items-center justify-end gap-1"
                                          >
                                            <Plus size={14} />
                                            {payment.amount.toFixed(2)} DA
                                          </motion.div>
                                        </td>

                                        {/* Empty Balance Column */}
                                        <td className="px-6 py-3">
                                          <div className="text-slate-500 text-xs text-right">
                                            —
                                          </div>
                                        </td>

                                        {/* Payment Status */}
                                        <td className="px-6 py-3">
                                          <div className="flex justify-center">
                                            <motion.div
                                              initial={{ opacity: 0, scale: 0.8 }}
                                              animate={{ opacity: 1, scale: 1 }}
                                              transition={{
                                                delay: payIndex * 0.1 + 0.6,
                                                type: "spring",
                                                stiffness: 200,
                                                damping: 15
                                              }}
                                              className="px-2 py-1 bg-green-900/40 border border-green-600/30 text-green-400 rounded-md text-xs font-medium flex items-center gap-1"
                                            >
                                              <CheckCircle size={10} />
                                              {t('received')}
                                            </motion.div>
                                          </div>
                                        </td>
                                      </motion.tr>
                                    ))}
                                  </>
                                )}
                              </AnimatePresence>
                            </React.Fragment>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </motion.div>
              ) : (
                // Empty state with improved animations
                <motion.div
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6 }}
                  className="text-center py-12 bg-slate-800/30 rounded-xl border-2 border-dashed border-slate-600"
                >
                  <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.2, duration: 0.5 }}
                    className="space-y-4"
                  >
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{
                        delay: 0.4,
                        type: "spring",
                        stiffness: 200,
                        damping: 15
                      }}
                      className="w-16 h-16 bg-slate-700/50 rounded-full flex items-center justify-center mx-auto"
                    >
                      <FileText size={24} className="text-slate-400" />
                    </motion.div>
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.6 }}
                    >
                      <p className="text-slate-300 font-medium">No documents found</p>
                      <p className="text-slate-400 text-sm mt-1">
                        {t('noDocumentsFilter',{year:yearFilter})}
                      </p>
                    </motion.div>
                  </motion.div>
                </motion.div>
              )}

            </motion.div>
          )}
        </AnimatePresence>
      </div>
      {/* Modals */}
      <AnimatePresence>
        {showDeleteModal && (
          <DeleteVendorModal
            isOpen={showDeleteModal}
            onClose={() => setShowDeleteModal(false)}
            onConfirm={handleDeleteVendor}
            Name={vendor.name}
            loading={loading}
          />
        )}
      </AnimatePresence>
    </div>
  );

};


interface VendorReportStats {
  totalDocuments: number;
  totalAmount: number;
  totalPaid: number;
  totalOutstanding: number;
}

const generateVendorReportHTML = (vendor: Vendor, documents: Document[], stats: VendorReportStats) => {

  // Group documents by BL/Document number and organize payments
  const documentGroups = documents.map(doc => {
    const p_total = doc.total * (100 - doc.remise) / 100;
    const totalPaid = doc.payments.reduce((sum: number, payment: Versement) => sum + payment.amount, 0);
    const isPaid = totalPaid >= p_total;
    const isCancelled = doc.status === 'Cancelled';

    return {
      ...doc,
      p_total,
      totalPaid,
      isPaid,
      isCancelled,
      payments: doc.payments || []
    };
  }).sort((a, b) => {
    // Custom sorting function
    const getDocTypeOrder = (docType: String) => {
      if (docType === 'BL') return 1;
      if (docType === 'INVOICE') return 2;
      return 3; // Other document types
    };

    // First sort by document type (BL first, then INVOICE, then others)
    const typeOrderA = getDocTypeOrder(a.doc_type);
    const typeOrderB = getDocTypeOrder(b.doc_type);

    if (typeOrderA !== typeOrderB) {
      return typeOrderA - typeOrderB;
    }

    // If same document type, sort by document number
    const numA = a.code;
    const numB = b.code;

    return numA - numB;
  });

  // Generate payment history table rows with fixed structure
  const generatePaymentHistoryRows = () => {
    return documentGroups.map(doc => {
      const mainRowClass = doc.isCancelled ? 'cancelled-doc' : doc.isPaid ? 'paid-doc' : 'unpaid-doc';

      // Calculate total rows for this document (1 main + payments or 1 if no payments)
      const paymentRows = doc.payments.length > 0 ? doc.payments.length : 1;

      // Main document row
      let rows = `
        <tr class="main-doc-row ${mainRowClass}">
          <td class="doc-number-cell" rowspan="${paymentRows + 1}">
            <div class="doc-number">${doc.code}</div>
            <div class="doc-type">${doc.doc_type}</div>
          </td>
          <td class="doc-info-cell">
            <div class="doc-date">${new Date(doc.date).toLocaleDateString('fr-FR')}</div>
            <div class="doc-description">${doc.description || 'No description'}</div>
          </td>
          <td class="doc-total-cell">
            <div class="amount-large">${doc.p_total.toFixed(2)} DA</div>
          </td>
          <td class="doc-status-cell">
            <span class="status-badge ${doc.isCancelled ? 'cancelled' : doc.isPaid ? 'paid' : 'unpaid'}">
              ${doc.isCancelled ? 'Annulée' : doc.isPaid ? 'Payée' : 'Impayée'}
            </span>
          </td>
        </tr>
      `;

      // Payment rows
      if (doc.payments.length > 0) {
        doc.payments.forEach((payment, index) => {
          rows += `
            <tr class="payment-row">
              <td class="payment-info-cell">
                <div class="payment-number">Versement #${index + 1}</div>
                <div class="payment-date">${new Date(payment.date).toLocaleDateString('fr-FR')}</div>
              </td>
              <td class="payment-amount-cell">
                <div class="amount-medium">${payment.amount.toFixed(2)} DA</div>
              </td>
            </tr>
          `;
        });
      } else {
        rows += `
          <tr class="payment-row no-payments">
            <td class="payment-info-cell">
              <div class="no-payment-text">Aucun versement</div>
            </td>
            <td class="payment-amount-cell">
              <div class="amount-medium">0.00 DA</div>
            </td>
            <td class="payment-method-cell">
              <span class="method-badge">-</span>
            </td>
          </tr>
        `;
      }

      return rows;
    }).join('');
  };

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Rapport Vendeur - ${vendor.name}</title>
      <meta charset="UTF-8">
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }

        body { 
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          margin: 10px; 
          color: #333;
          background: white;
          line-height: 1.2;
          font-size: 11px;
        }

        .container {
          max-width: 100%;
          margin: 0;
          background: white;
        }

        /* Compact Header Section - Updated with lighter color */
        .header-section {
          background: linear-gradient(135deg, #4a90e2, #5ba4f2);
          color: white;
          padding: 12px 16px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
          min-height: auto;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }

        .company-info {
          flex: 1;
        }

        .company-name {
          font-size: 14px;
          font-weight: bold;
          margin-bottom: 4px;
          text-shadow: 1px 1px 2px rgba(0,0,0,0.2);
        }

        .company-details {
          font-size: 9px;
          line-height: 1.3;
          opacity: 0.95;
          color: #f8f9fa;
        }

        .logo-section {
          margin: 0 12px;
          text-align: center;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .company-logo {
          height: 60px;
          width: 60px;
          object-fit: cover;
          border-radius: 50%;
          border: 3px solid rgba(255,255,255,0.3);
          box-shadow: 0 2px 8px rgba(0,0,0,0.2);
          background: white;
          padding: 2px;
        }

        .logo-fallback {
          width: 60px;
          height: 60px;
          background: rgba(255,255,255,0.2);
          border-radius: 50%;
          display: none;
          align-items: center;
          justify-content: center;
          color: white;
          font-weight: bold;
          font-size: 12px;
          border: 3px solid rgba(255,255,255,0.3);
          text-shadow: 1px 1px 2px rgba(0,0,0,0.3);
        }

        .document-title {
          font-size: 16px;
          font-weight: bold;
          text-align: center;
          flex: 1;
          letter-spacing: 1px;
          text-shadow: 1px 1px 2px rgba(0,0,0,0.2);
        }

        .report-subtitle {
          text-align: center;
          margin-top: 4px;
          padding-top: 4px;
          border-top: 1px solid rgba(255,255,255,0.3);
          font-size: 9px;
          opacity: 0.9;
          font-weight: normal;
        }

        /* Compact Vendor Information Section */
        .vendor-info {
          padding: 8px;
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 8px;
          background: #f8f9fa;
          border-bottom: 1px solid #e9ecef;
        }

        .info-section {
          background: white;
          padding: 8px;
          border-radius: 3px;
          border: 1px solid #e9ecef;
        }

        .info-section h3 {
          color: #333;
          margin-bottom: 6px;
          font-size: 10px;
          border-bottom: 1px solid #333;
          padding-bottom: 2px;
        }

        .info-section p {
          margin-bottom: 2px;
          font-size: 9px;
          line-height: 1.2;
        }

        .info-section strong {
          color: #555;
          display: inline-block;
          width: 50px;
          font-size: 8px;
        }

        /* Compact Statistics Cards */
        .stats {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 6px;
          padding: 8px;
          background: white;
        }

        .stat-card {
          background: #f8f9fa;
          padding: 6px;
          border-radius: 3px;
          text-align: center;
          border: 1px solid #e9ecef;
        }

        .stat-card h4 {
          color: #666;
          font-size: 8px;
          text-transform: uppercase;
          letter-spacing: 0.3px;
          margin-bottom: 3px;
        }

        .stat-card .stat-value {
          font-size: 12px;
          font-weight: bold;
          color: #333;
        }

        .stat-card.total-amount .stat-value { color: #2196F3; }
        .stat-card.total-paid .stat-value { color: #4CAF50; }
        .stat-card.outstanding .stat-value { color: #FF9800; }

        /* Compact Payment History Table */
        .payment-history-section {
          padding: 8px;
        }

        .section-title {
          font-size: 12px;
          color: #333;
          margin-bottom: 8px;
          text-align: center;
          position: relative;
        }

        .section-title::after {
          content: '';
          position: absolute;
          bottom: -3px;
          left: 50%;
          transform: translateX(-50%);
          width: 30px;
          height: 2px;
          background: #4a90e2;
        }

        .payment-table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 8px;
          font-size: 9px;
          border: 1px solid #dee2e6;
        }

        .payment-table thead tr {
          background: #4a90e2 !important;
          color: white !important;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }

        .payment-table th {
          padding: 4px 6px;
          text-align: center;
          font-size: 8px;
          text-transform: uppercase;
          border: 1px solid #3a7bc8;
        }

        /* Fixed main document rows */
        .main-doc-row {
          background: #f8f9fa;
          border-bottom: 1px solid #dee2e6;
        }

        .main-doc-row.paid-doc {
          background: #e8f5e8;
          border-left: 3px solid #4CAF50;
        }

        .main-doc-row.unpaid-doc {
          background: #fff3e0;
          border-left: 3px solid #FF9800;
        }

        .main-doc-row.cancelled-doc {
          background: #ffebee;
          border-left: 3px solid #f44336;
        }

        .doc-number-cell {
          padding: 6px 4px;
          text-align: center;
          background: #4a90e2 !important;
          color: white !important;
          font-weight: bold;
          vertical-align: middle;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
          min-width: 60px;
          border: 1px solid #3a7bc8;
        }

        .doc-number {
          font-size: 10px;
          margin-bottom: 1px;
        }

        .doc-type {
          font-size: 7px;
          opacity: 0.8;
          text-transform: uppercase;
          letter-spacing: 0.3px;
        }

        .doc-info-cell {
          padding: 6px 5px;
          vertical-align: top;
          border: 1px solid #dee2e6;
        }

        .doc-date {
          font-weight: bold;
          color: #333;
          margin-bottom: 1px;
          font-size: 8px;
        }

        .doc-description {
          color: #666;
          font-size: 7px;
        }

        .doc-total-cell {
          padding: 6px 5px;
          text-align: center;
          vertical-align: middle;
          border: 1px solid #dee2e6;
        }

        .amount-large {
          font-size: 10px;
          font-weight: bold;
          color: #333;
        }

        .doc-status-cell {
          padding: 6px 5px;
          text-align: center;
          vertical-align: middle;
          border: 1px solid #dee2e6;
        }

        .status-badge {
          padding: 2px 5px;
          border-radius: 8px;
          font-size: 7px;
          font-weight: bold;
          text-transform: uppercase;
          letter-spacing: 0.3px;
        }

        .status-badge.paid {
          background: #4CAF50;
          color: white;
        }

        .status-badge.unpaid {
          background: #FF9800;
          color: white;
        }

        .status-badge.cancelled {
          background: #f44336;
          color: white;
        }

        /* Fixed payment rows */
        .payment-row {
          background: white;
          border-bottom: 1px solid #f0f0f0;
        }

        .payment-info-cell {
          padding: 4px 6px;
          border: 1px solid #e9ecef;
        }

        .payment-number {
          font-weight: 600;
          color: #333;
          font-size: 8px;
          margin-bottom: 1px;
        }

        .payment-date {
          color: #666;
          font-size: 7px;
        }

        .payment-amount-cell {
          padding: 4px 6px;
          text-align: center;
          border: 1px solid #e9ecef;
        }

        .amount-medium {
          font-size: 9px;
          font-weight: 600;
          color: #4CAF50;
        }

        .payment-method-cell {
          padding: 4px 6px;
          text-align: center;
          border: 1px solid #e9ecef;
        }

        .method-badge {
          padding: 1px 3px;
          background: #e9ecef;
          border-radius: 6px;
          font-size: 7px;
          color: #666;
          text-transform: uppercase;
        }

        .no-payments .payment-info-cell {
          font-style: italic;
          color: #999;
        }

        .no-payment-text {
          font-size: 8px;
          color: #999;
        }

        .no-payments .amount-medium {
          color: #999;
        }

        /* Compact Footer */
        .footer-info {
          background: #4a90e2;
          color: white;
          padding: 8px;
          text-align: center;
          font-size: 8px;
          line-height: 1.4;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }

        .footer-info strong {
          color: #fff;
        }

        /* Print Styles */
        @media print {
          body {
            margin: 0;
            background: white;
            font-size: 8px;
          }
          
          .container {
            margin: 0;
            padding: 0;
          }

          .header-section {
            padding: 8px 12px;
          }

          .vendor-info {
            padding: 6px;
            gap: 6px;
          }

          .stats {
            padding: 6px;
            gap: 4px;
          }

          .payment-history-section {
            padding: 6px;
          }

          .footer-info {
            padding: 6px;
          }
        }

        /* Responsive Design */
        @media (max-width: 768px) {
          .vendor-info {
            grid-template-columns: 1fr;
            gap: 6px;
            padding: 6px;
          }
          
          .stats {
            grid-template-columns: repeat(2, 1fr);
            gap: 6px;
            padding: 6px;
          }
          
          .header-section {
            flex-direction: column;
            text-align: center;
            padding: 12px;
          }
          
          .company-info, .logo-section {
            margin-bottom: 8px;
          }
          
          .document-title {
            margin-top: 8px;
          }
        }
      </style>
    </head>
    <body>
      <div class="container">
        <!-- Compact Header Section -->
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
              onerror="this.style.display='none'; document.querySelector('.logo-fallback').style.display='flex';"
            />
            <div class="logo-fallback">
              APL
            </div>
          </div>

          <div class="document-title">
            RAPPORT VENDEUR
            <div class="report-subtitle">Généré le ${new Date().toLocaleDateString('fr-FR')}</div>
          </div>
        </div>
        
        <!-- Vendor Information -->
        <div class="vendor-info">
          <div class="info-section">
            <h3>Informations Vendor</h3>
            <p><strong>Nom:</strong> ${vendor.name}</p>
            <p><strong>Adresse:</strong> ${vendor.location || 'Non spécifiée'}</p>
            <p><strong>Téléphone:</strong> ${vendor.phone || 'Non spécifié'}</p>
            <p><strong>RC:</strong> ${vendor.rc || 'Non spécifié'}</p>
          </div>
          <div class="info-section">
            <h3>Détails d'Enregistrement</h3>
            <p><strong>AR:</strong> ${vendor.ar || 'Non spécifié'}</p>
            <p><strong>NIF:</strong> ${vendor.nif || 'Non spécifié'}</p>
            <p><strong>NIS:</strong> ${vendor.nis || 'Non spécifié'}</p>
          </div>
        </div>

        <!-- Statistics -->
        <div class="stats">
          <div class="stat-card">
            <h4>Total Documents</h4>
            <div class="stat-value">${stats.totalDocuments}</div>
          </div>
          <div class="stat-card total-amount">
            <h4>Montant Total</h4>
            <div class="stat-value">${stats.totalAmount.toFixed(2)} DA</div>
          </div>
          <div class="stat-card total-paid">
            <h4>Total Payé</h4>
            <div class="stat-value">${stats.totalPaid.toFixed(2)} DA</div>
          </div>
          <div class="stat-card outstanding">
            <h4>Solde Impayé</h4>
            <div class="stat-value">${stats.totalOutstanding.toFixed(2)} DA</div>
          </div>
        </div>

        <!-- Payment History -->
        <div class="payment-history-section">
          <h3 class="section-title">Historique des Paiements</h3>
          <table class="payment-table">
            <thead>
              <tr>
                <th style="width: 80px;">N° BL</th>
                <th style="width: auto;">Informations</th>
                <th style="width: 100px;">Montant</th>
                <th style="width: 80px;">Statut</th>
              </tr>
            </thead>
            <tbody>
              ${generatePaymentHistoryRows()}
            </tbody>
          </table>
        </div>

      </div>
    </body>
    </html>
  `;
};

export default VendorDetails;
