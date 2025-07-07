import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, User, ChevronDown } from 'lucide-react';
import { motion } from 'framer-motion';
import { useMessage } from './context/Message';
import { useI18n } from './context/I18nContext';


const AddClient = () => {
  const navigate = useNavigate();

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    location: '',
    phone: '',
    ar: '',
    nif: '',
    nis: '',
    rc: '',
    region: ''
  });


  // Region autocomplete state
  const [regionSuggestions, setRegionSuggestions] = useState<string[]>([]);
  const [showRegionSuggestions, setShowRegionSuggestions] = useState(false);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1);
  const [allRegions, setAllRegions] = useState<string[]>([]);

  const regionInputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);


  // Location autocomplete state (add after region state)
  const [locationSuggestions, setLocationSuggestions] = useState<string[]>([]);
  const [showLocationSuggestions, setShowLocationSuggestions] = useState(false);
  const [selectedLocationSuggestionIndex, setSelectedLocationSuggestionIndex] = useState(-1);
  const [allLocations, setAllLocations] = useState<string[]>([]);

  const locationInputRef = useRef<HTMLInputElement>(null);
  const locationSuggestionsRef = useRef<HTMLDivElement>(null);

  const { addToast, addErrorToast } = useMessage();

  const { t } = useI18n();


  useEffect(() => {
    const loadRegionsAndLocations = async () => {
      try {

        const regions = await Promise;

        setAllRegions(regions);


        const locations = await Promise;

        setAllLocations(locations);
        // Replace the catch block:
      } catch (error) {
        if (addErrorToast) {
          addErrorToast(t('client.loadRegionsFailed'));
        }
      }
    };

    loadRegionsAndLocations();
  }, []);

  // Simple string similarity function (you can replace with more sophisticated algorithms)
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

  // Get region suggestions based on input
  const getRegionSuggestions = (input: string): string[] => {
    if (!input.trim()) return [];

    const suggestions = allRegions
      .map(region => ({
        region,
        similarity: calculateSimilarity(input, region)
      }))
      .filter(item => item.similarity > 0.3) // Threshold for similarity
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, 5) // Show top 5 suggestions
      .map(item => item.region);

    return suggestions;
  };
  // Get location suggestions based on input
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

  // Handle location input key events
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

  // Select a location suggestion
  const selectLocationSuggestion = (location: string) => {
    setFormData(prev => ({ ...prev, location }));
    setShowLocationSuggestions(false);
    setSelectedLocationSuggestionIndex(-1);
    locationInputRef.current?.focus();
  };

  const handleSuccess = (): void => {
    addToast({
      message: t('client.created'),
      type: 'success',
      duration: 2000,
    });
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    // Handle region autocomplete
    if (name === 'region') {
      const suggestions = getRegionSuggestions(value);
      setRegionSuggestions(suggestions);
      setShowRegionSuggestions(suggestions.length > 0);
      setSelectedSuggestionIndex(-1);
    }

    // Add this part for location autocomplete
    if (name === 'location') {
      const suggestions = getLocationSuggestions(value);
      setLocationSuggestions(suggestions);
      setShowLocationSuggestions(suggestions.length > 0);
      setSelectedLocationSuggestionIndex(-1);
    }
  };

  // Handle region input key events
  const handleRegionKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showRegionSuggestions) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedSuggestionIndex(prev =>
          prev < regionSuggestions.length - 1 ? prev + 1 : 0
        );
        break;

      case 'ArrowUp':
        e.preventDefault();
        setSelectedSuggestionIndex(prev =>
          prev > 0 ? prev - 1 : regionSuggestions.length - 1
        );
        break;

      case 'Tab':
        e.preventDefault();
        if (selectedSuggestionIndex >= 0) {
          selectRegionSuggestion(regionSuggestions[selectedSuggestionIndex]);
        } else if (regionSuggestions.length > 0) {
          selectRegionSuggestion(regionSuggestions[0]);
        }
        break;

      case 'Enter':
        e.preventDefault();
        if (selectedSuggestionIndex >= 0) {
          selectRegionSuggestion(regionSuggestions[selectedSuggestionIndex]);
        }
        break;

      case 'Escape':
        setShowRegionSuggestions(false);
        setSelectedSuggestionIndex(-1);
        break;
    }
  };

  // Select a region suggestion
  const selectRegionSuggestion = (region: string) => {
    setFormData(prev => ({ ...prev, region }));
    setShowRegionSuggestions(false);
    setSelectedSuggestionIndex(-1);
    regionInputRef.current?.focus();
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // Region suggestions
      if (suggestionsRef.current && !suggestionsRef.current.contains(event.target as Node) &&
        regionInputRef.current && !regionInputRef.current.contains(event.target as Node)) {
        setShowRegionSuggestions(false);
        setSelectedSuggestionIndex(-1);
      }

      // Add this part for location suggestions
      if (locationSuggestionsRef.current && !locationSuggestionsRef.current.contains(event.target as Node) &&
        locationInputRef.current && !locationInputRef.current.contains(event.target as Node)) {
        setShowLocationSuggestions(false);
        setSelectedLocationSuggestionIndex(-1);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Get field validation status for styling
  const getFieldValidationClass = (fieldName: string): string => {
    const value = formData[fieldName as keyof typeof formData];
    if (!value) return '';

    const error = validateField(fieldName, value);
    return error ? 'border-red-500 focus:ring-red-500' : 'border-green-500 focus:ring-green-500';
  };

  // Validation patterns (Algerian formats)
  const validationPatterns = {
    phone: /^(0[5-7]\d{8}|0[1-4,8-9]\d{7})$/,
    nif: /^\d{15}$/,
    nis: /^\d{15}$/,
    rc: /^\d{2}\/\d{2}-\d{7}[A-Z]\d{2}$/,
    ar: /^\d{11}$/,
    name: /^[a-zA-ZÀ-ÿ\u0600-\u06FF\s\-'\.]+$/,
    region: /^[a-zA-ZÀ-ÿ\u0600-\u06FF\s]+$/
  };

  // Validation function
  const validateField = (field: string, value: string): string | null => {
    const trimmedValue = value.trim();

    switch (field) {
      case 'name':
        if (!trimmedValue) return t('client.creatwar1');
        if (trimmedValue.length < 2) return t('client.creatwar2');
        if (trimmedValue.length > 100) return t('client.creatwar3');
        if (!validationPatterns.name.test(trimmedValue)) return t('client.creatwar4');
        return null;

      case 'location':
        if (!trimmedValue) return t('client.creatwar5');
        if (trimmedValue.length < 2) return t('client.creatwar6');
        return null;

      case 'phone':
        if (!trimmedValue) return t('client.creatwar7');
        if (!validationPatterns.phone.test(trimmedValue)) return t('client.creatwar8');
        return null;

      case 'ar':
        if (!trimmedValue) return t('AR number is required');
        if (!validationPatterns.ar.test(trimmedValue)) return t('AR number must be exactly 11 digits');
        return null;

      case 'nif':
        if (!trimmedValue) return t('NIF number is required');
        if (!validationPatterns.nif.test(trimmedValue)) return t('NIF number must be exactly 15 digits');
        return null;

      case 'nis':
        if (!trimmedValue) return t('NIS number is required');
        if (!validationPatterns.nis.test(trimmedValue)) return t('NIS number must be exactly 15 digits');
        return null;

      case 'rc':
        if (!trimmedValue) return t('RC number is required');
        if (!validationPatterns.rc.test(trimmedValue)) return t('RC number format invalid (e.g., 12/00-1234567B12)');
        return null;

      case 'region':
        if (!trimmedValue) return t('Region is required');
        if (!validationPatterns.region.test(trimmedValue)) return t('Region contains invalid characters');
        return null;

      default:
        return null;
    }
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate all fields
    const fields = ['name', 'location', 'phone', 'ar', 'nif', 'nis', 'rc', 'region'];
    for (const field of fields) {
      const error = validateField(field, formData[field as keyof typeof formData]);
      if (error && addErrorToast) {
        addErrorToast(error);
        return;
      }
    }

    try {
      // Prepare client data for backend
      const clientData = {
        name: formData.name.trim(),
        location: formData.location.trim(),
        phone: formData.phone.trim(),
        ar: formData.ar.trim(),
        nif: formData.nif.trim(),
        nis: formData.nis.trim(),
        rc: formData.rc.trim(),
        region: formData.region.trim() // Insert as-is if no suggestion was selected
      };

      await Promise;

      handleSuccess();

      // Reset form
      setFormData({
        name: '',
        location: '',
        phone: '',
        ar: '',
        nif: '',
        nis: '',
        rc: '',
        region: ''
      });


    } catch (error) {
      if (error && addErrorToast)
        addErrorToast(error as string || t('client.addFailed'));
    }
  };

  return (
    <div className='flex flex-col gap-8 mx-auto py-6 pb-5 px-1 lg:px-2 xl:px-4 max-w-4xl relative'>
      {/* Header */}
      <div className="flex items-center gap-4">
        <motion.button
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft size={20} />
          Back to Clients
        </motion.button>
      </div>

      {/* Main Form Card */}
      <div className="bg-slate-900 p-6 rounded-xl shadow-md border border-slate-700 relative">
        <div className="flex items-center gap-3 mb-6">
          <User className="text-green-500" size={24} />
          <h1 className="text-2xl font-bold text-white">Create New Client</h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Client Information Section */}
          <div className="space-y-6">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <User size={20} />
              {t('client.clientInformation')}
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Name */}
              <div className="md:col-span-2">
                <label htmlFor="name" className="block text-sm font-medium text-slate-300 mb-2">
                  {t('client.clientName')} *
                </label>
                <input
                  id="name"
                  name="name"
                  type="text"
                  value={formData.name}
                  onChange={handleInputChange}
                  className={`w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:border-transparent transition-colors ${getFieldValidationClass('name')}`}
                  placeholder={t('client.clientName')}
                />
              </div>
              {/* Location with Autocomplete */}
              <div className="relative">
                <label htmlFor="location" className="block text-sm font-medium text-slate-300 mb-2">
                  Location *
                </label>
                <div className="relative">
                  <input
                    ref={locationInputRef}
                    id="location"
                    name="location"
                    type="text"
                    value={formData.location}
                    onChange={handleInputChange}
                    onKeyDown={handleLocationKeyDown}
                    className={`w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:border-transparent transition-colors ${getFieldValidationClass('location')}`}
                    placeholder={t('vendor.locationPlaceholder')}
                    autoComplete="off"
                  />
                  {showLocationSuggestions && (
                    <ChevronDown
                      size={16}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 pointer-events-none"
                    />
                  )}
                </div>

                {/* Suggestions Dropdown */}
                {showLocationSuggestions && locationSuggestions.length > 0 && (
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
                <label htmlFor="phone" className="block text-sm font-medium text-slate-300 mb-2">
                  {t('phoneNumber')} *
                </label>
                <input
                  id="phone"
                  name="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={handleInputChange}
                  className={`w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:border-transparent transition-colors ${getFieldValidationClass('phone')}`}
                  placeholder="0551234567"
                />
                <p className="text-xs text-slate-400 mt-1">{t('phoneFormat')}</p>
              </div>

              {/* AR */}
              <div>
                <label htmlFor="ar" className="block text-sm font-medium text-slate-300 mb-2">
                  {t('vendor.ar')} *
                </label>
                <input
                  id="ar"
                  name="ar"
                  type="text"
                  value={formData.ar}
                  onChange={handleInputChange}
                  className={`w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:border-transparent transition-colors ${getFieldValidationClass('ar')}`}
                  placeholder="12345678901"
                />
                <p className="text-xs text-slate-400 mt-1">{t('digitsExactly2')}</p>
              </div>

              {/* NIF */}
              <div>
                <label htmlFor="nif" className="block text-sm font-medium text-slate-300 mb-2">
                  {t('vendor.nif')} *
                </label>
                <input
                  id="nif"
                  name="nif"
                  type="text"
                  value={formData.nif}
                  onChange={handleInputChange}
                  className={`w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:border-transparent transition-colors ${getFieldValidationClass('nif')}`}
                  placeholder="123456789012345"
                />
                <p className="text-xs text-slate-400 mt-1">{t('digitsExactly1')}</p>
              </div>

              {/* NIS */}
              <div>
                <label htmlFor="nis" className="block text-sm font-medium text-slate-300 mb-2">
                  {t('vendor.nis')} *

                </label>
                <input
                  id="nis"
                  name="nis"
                  type="text"
                  value={formData.nis}
                  onChange={handleInputChange}
                  className={`w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:border-transparent transition-colors ${getFieldValidationClass('nis')}`}
                  placeholder="123456789012345"
                />
                <p className="text-xs text-slate-400 mt-1">{t('digitsExactly1')}</p>
              </div>

              {/* RC */}
              <div>
                <label htmlFor="rc" className="block text-sm font-medium text-slate-300 mb-2">
                  {t('vendor.rc')} *

                </label>
                <input
                  id="rc"
                  name="rc"
                  type="text"
                  value={formData.rc}
                  onChange={handleInputChange}
                  className={`w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:border-transparent transition-colors ${getFieldValidationClass('rc')}`}
                  placeholder="12/00-1234567B12"
                />
                <p className="text-xs text-slate-400 mt-1">{t('rcFormat')}</p>
              </div>

              {/* Region with Autocomplete */}
              <div className="relative">
                <label htmlFor="region" className="block text-sm font-medium text-slate-300 mb-2">
                  {t('vendor.region')} *

                </label>
                <div className="relative">
                  <input
                    ref={regionInputRef}
                    id="region"
                    name="region"
                    type="text"
                    value={formData.region}
                    onChange={handleInputChange}
                    onKeyDown={handleRegionKeyDown}
                    className={`w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:border-transparent transition-colors ${getFieldValidationClass('region')}`}
                    placeholder={t('vendor.regionPlaceholder')}
                    autoComplete="off"
                  />
                  {showRegionSuggestions && (
                    <ChevronDown
                      size={16}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 pointer-events-none"
                    />
                  )}
                </div>

                {/* Suggestions Dropdown */}
                {showRegionSuggestions && regionSuggestions.length > 0 && (
                  <motion.div
                    ref={suggestionsRef}
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="absolute z-10 w-full mt-1 bg-slate-800 border border-slate-600 rounded-lg shadow-lg max-h-48 overflow-y-auto"
                  >
                    {regionSuggestions.map((suggestion, index) => (
                      <motion.div
                        key={suggestion}
                        whileHover={{ backgroundColor: 'rgb(51, 65, 85)' }}
                        className={`px-4 py-3 cursor-pointer text-white transition-colors ${index === selectedSuggestionIndex ? 'bg-slate-700' : 'hover:bg-slate-700'
                          }`}
                        onClick={() => selectRegionSuggestion(suggestion)}
                      >
                        {suggestion}
                      </motion.div>
                    ))}
                  </motion.div>
                )}
              </div>
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
              className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-green-800 disabled:cursor-not-allowed text-white font-medium py-3 px-6 rounded-lg transition-colors flex items-center justify-center gap-2"
            >

              <>
                <motion.div
                  whileHover={{ scale: 1.1 }}
                  transition={{ duration: 0.2 }}
                >
                  <User size={18} />
                </motion.div>
                Create Client
              </>

            </motion.button>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              type="button"
              onClick={() => navigate(-1)}
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

export default AddClient;