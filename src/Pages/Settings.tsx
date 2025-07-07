import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { invoke } from '@tauri-apps/api/core';
import {openUrl} from '@tauri-apps/plugin-opener';
import { useAuth } from './context/AuthContext';
import { useI18n } from './context/I18nContext';
import {
  Settings as SettingsIcon,
  User,
  Lock,
  Globe,
  Shield,
  Save,
  Eye,
  EyeOff,
  Database,
  AlertTriangle,
  CheckCircle,
  Power,
  Zap,
  Check,
  Info,
  ExternalLink,
  FileText,
  Copyright
} from 'lucide-react';
import { useMessage } from './context/Message';


interface AuthResponse {
  success: boolean;
  message: string;
  session_id?: string;
  is_developer: boolean;
}

interface AuthConfig {
  id: number;
  user_password_hash: string;
  initialized: boolean;
  created_at: string;
  updated_at: string;
  language: string;
}

const Settings: React.FC = () => {
  const { sessionId, isDeveloper, checkSession } = useAuth();
  const { language, setLanguage, t } = useI18n();

  // State management
  const [loading, setLoading] = useState(true);
  const [userSettings, setUserSettings] = useState<AuthConfig | null>(null);
  const [migrationMode, setMigrationMode] = useState<number | null>(null);
  const [showMigrationWarning, setShowMigrationWarning] = useState(false);

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
      duration: 2000,
    });
  };

  // Password change state
  const [showPasswordSection, setShowPasswordSection] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load initial settings
  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);

      // Check session validity
      const sessionValid = await checkSession();
      if (!sessionValid) {
        handleError(t('messages.sessionExpired'));
        return;
      }

      // Load migration mode state
      const migrationState = await invoke<number>('get_migration');
      setMigrationMode(migrationState);

      // Load user settings if not developer
      if (!isDeveloper && sessionId) {
        const settingsResponse = await invoke<AuthConfig>('get_user_settings', {
          sessionId
        });
        setUserSettings(settingsResponse);
      }
    } catch (error) {
      console.error('Error loading settings:', error);
      handleError(t('messages.failedToLoad'));
    } finally {
      setLoading(false);
    }
  };

  const handleMigrationModeToggle = async () => {
    if (migrationMode === 0) {
      // Already disabled, can't re-enable
      handleError(t('migration.migration_permanently_disabled'));
      return;
    }

    setShowMigrationWarning(true);
  };

  const confirmMigrationModeDisable = async () => {
    try {
      setIsSubmitting(true);
      
      const result = await invoke<string>('set_migration');
      
      if (result.includes('successfully')) {
        setMigrationMode(0);
        handleSuccess(t('migration.migration_disabled_success'));
        setShowMigrationWarning(false);
      } else {
        handleError(t('migration.disable_migration_failed'));
      }
    } catch (error) {
      console.error('Error disabling migration mode:', error);
      handleError(t('migration.disable_migration_failed'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLanguageChange = async (newLanguage: 'en' | 'fr') => {
    if (!sessionId) {
      handleError(t('messages.noActiveSession'));
      return;
    }

    try {
      setIsSubmitting(true);
      clearMessages();

      const success = await setLanguage(newLanguage);

      if (success) {
        handleSuccess(t('messages.languageUpdated'));
      } else {
        handleError(t('error'));
      }
    } catch (error) {
      console.error('Error updating language:', error);
      handleError(t('error'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!sessionId) {
      handleError(t('messages.noActiveSession'));
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      handleError(t('messages.passwordsDoNotMatch'));
      return;
    }

    if (passwordForm.newPassword.length < 6) {
      handleError(t('messages.passwordTooShort'));
      return;
    }

    try {
      setIsSubmitting(true);
      clearMessages();

      const response = await invoke<AuthResponse>('change_password', {
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
        sessionId
      });

      if (response.success) {
        handleSuccess(t('messages.passwordChanged'));
        setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
        setShowPasswordSection(false);
      } else {
        handleError(response.message);
      }
    } catch (error) {
      console.error('Error changing password:', error);
      handleError(t('messages.failedToChangePassword'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const clearMessages = () => {
    handleSuccess('');
    handleError('');
  };

  const togglePasswordVisibility = (field: 'current' | 'new' | 'confirm') => {
    setShowPasswords(prev => ({
      ...prev,
      [field]: !prev[field]
    }));
  };

  const handleOpenDocumentation = async () => {
    try {
      // Replace with your documentation URL
      await openUrl('https://taura.gitbook.io/taura-docs/');
      handleSuccess('Documentation opened in browser');
    } catch (error) {
      console.error('Error opening documentation:', error);
      handleError('Failed to open documentation');
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col gap-4 items-center justify-center min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <div className="w-12 h-12 border-3 border-blue-500 border-t-transparent rounded-full animate-spin" />
        <div className="text-white text-lg font-medium">
          {t('settings.loading')}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen  p-6">
      <div className="max-w-5xl mx-auto space-y-8">
        {/* Header */}
        <motion.div
          className="text-center space-y-2"
          initial={{ opacity: 0, y: -40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
        >
          <div className="flex items-center justify-center gap-4 mb-4">
            <div className="p-4 bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl shadow-lg">
              <SettingsIcon className="text-white" size={36} />
            </div>
            {isDeveloper && (
              <div className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-xl text-sm font-medium shadow-lg">
                <Shield size={18} />
                {t('settings.developerMode')}
              </div>
            )}
          </div>
          <h1 className="text-4xl font-bold text-white">
            {t('settings.title')}
          </h1>
          <p className="text-slate-400 text-lg">{t('migration.preferences_title')}</p>
        </motion.div>

        {/* Migration Mode Card - Always visible and at the top */}
        <motion.div
          className={`relative overflow-hidden rounded-2xl shadow-xl border ${
            migrationMode === 1 
              ? 'bg-gradient-to-br from-amber-900/20 to-orange-900/20 border-amber-500/30' 
              : 'bg-gradient-to-br from-green-900/20 to-emerald-900/20 border-green-500/30'
          }`}
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <div className="p-8">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-4">
                <div className={`p-3 rounded-xl shadow-lg ${
                  migrationMode === 1 
                    ? 'bg-gradient-to-r from-amber-500 to-orange-500' 
                    : 'bg-gradient-to-r from-green-500 to-emerald-500'
                }`}>
                  {migrationMode === 1 ? (
                    <Database className="text-white" size={24} />
                  ) : (
                    <CheckCircle className="text-white" size={24} />
                  )}
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">{t('migration.mode_title')}</h2>
                  <p className="text-slate-300 text-sm">
                    {migrationMode === 1 
                      ? t('migration.system_safe_migration')
                      : t('migration.system_fully_operational')
                    }
                  </p>
                </div>
              </div>

              <div className={`px-3 py-1 rounded-lg font-medium text-xs ${
                migrationMode === 1 
                  ? 'bg-amber-500/20 text-amber-300' 
                  : 'bg-green-500/20 text-green-300'
              }`}>
                {migrationMode === 1 ? t('migration.migration') : t('migration.operational')}
              </div>
            </div>

            {migrationMode === 1 && (
              <div className="space-y-4">
                <div className="flex items-start gap-3 p-4 bg-amber-500/10 rounded-xl border border-amber-500/20">
                  <AlertTriangle className="text-amber-400 mt-0.5 flex-shrink-0" size={18} />
                  <div className="text-sm">
                    <p className="text-amber-300 font-medium mb-1">{t('migration.safe_mode_active')}</p>
                    <p className="text-slate-300">
                      {t('migration.frozen_message')}
                    </p>
                  </div>
                </div>

                <button
                  onClick={handleMigrationModeToggle}
                  disabled={isSubmitting}
                  className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-red-600 to-red-500 hover:from-red-700 hover:to-red-600 text-white rounded-lg font-medium transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50"
                >
                  <Power size={16} />
                  {t('migration.disable_button')}
                </button>
              </div>
            )}

            {migrationMode === 0 && (
              <div className="flex items-center gap-3 p-4 bg-green-500/10 rounded-xl border border-green-500/20">
                <CheckCircle className="text-green-400 flex-shrink-0" size={18} />
                <div className="text-sm">
                  <p className="text-green-300 font-medium mb-1">{t('migration.system_active')}</p>
                  <p className="text-slate-300">
                    {t('migration.disabled_message')}
                  </p>
                </div>
              </div>
            )}
          </div>
        </motion.div>

        {/* Main Settings Grid */}
        <div className="space-y-6">
          {/* Language Settings */}
          <motion.div
            className="bg-slate-800/50 backdrop-blur-sm p-6 rounded-2xl border border-slate-700/50"
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-blue-500/20 rounded-lg">
                <Globe className="text-blue-400" size={20} />
              </div>
              <h2 className="text-xl font-semibold text-white">
                {t('settings.languageSettings')}
              </h2>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-slate-400 text-sm">{t('migration.language_selection')}:</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleLanguageChange('en')}
                  disabled={isSubmitting}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                    language === 'en'
                      ? 'bg-blue-500 text-white shadow-lg'
                      : 'bg-slate-700/50 text-slate-300 hover:bg-slate-600/50'
                  }`}
                >
                  <span className="text-lg">🇺🇸</span>
                  English
                  {language === 'en' && <Check size={16} />}
                </button>
                <button
                  onClick={() => handleLanguageChange('fr')}
                  disabled={isSubmitting}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                    language === 'fr'
                      ? 'bg-blue-500 text-white shadow-lg'
                      : 'bg-slate-700/50 text-slate-300 hover:bg-slate-600/50'
                  }`}
                >
                  <span className="text-lg">🇫🇷</span>
                  Français
                  {language === 'fr' && <Check size={16} />}
                </button>
              </div>
            </div>
          </motion.div>

          {/* Account Information - Only for regular users */}
          {!isDeveloper && userSettings && (
            <motion.div
              className="bg-slate-800/50 backdrop-blur-sm p-6 rounded-2xl border border-slate-700/50"
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-green-500/20 rounded-lg">
                  <User className="text-green-400" size={20} />
                </div>
                <h2 className="text-xl font-semibold text-white">
                  {t('settings.accountInformation')}
                </h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-slate-700/30 p-4 rounded-lg">
                  <div className="text-slate-400 text-sm mb-1">
                    {t('settings.accountId')}
                  </div>
                  <div className="text-white font-semibold">#{userSettings.id}</div>
                </div>
                <div className="bg-slate-700/30 p-4 rounded-lg">
                  <div className="text-slate-400 text-sm mb-1">
                    {t('settings.created')}
                  </div>
                  <div className="text-white font-semibold">
                    {new Date(userSettings.created_at).toLocaleDateString(language === 'en' ? 'en-US' : 'fr-FR')}
                  </div>
                </div>
                <div className="bg-slate-700/30 p-4 rounded-lg">
                  <div className="text-slate-400 text-sm mb-1">
                    {t('settings.lastUpdated')}
                  </div>
                  <div className="text-white font-semibold">
                    {new Date(userSettings.updated_at).toLocaleDateString(language === 'en' ? 'en-US' : 'fr-FR')}
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* Password Settings - Only for regular users */}
          {!isDeveloper && (
            <motion.div
              className="bg-slate-800/50 backdrop-blur-sm p-6 rounded-2xl border border-slate-700/50"
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.5 }}
            >
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-rose-500/20 rounded-lg">
                    <Lock className="text-rose-400" size={20} />
                  </div>
                  <h2 className="text-xl font-semibold text-white">
                    {t('settings.passwordSettings')}
                  </h2>
                </div>

                <button
                  onClick={() => setShowPasswordSection(!showPasswordSection)}
                  className="flex items-center gap-2 px-4 py-2 bg-rose-500 hover:bg-rose-600 text-white rounded-lg font-medium transition-all duration-200 shadow-lg hover:shadow-xl"
                >
                  <Lock size={16} />
                  {t('settings.changePassword')}
                </button>
              </div>

              {showPasswordSection && (
                <form onSubmit={handlePasswordChange} className="space-y-4">
                  {/* Current Password */}
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      {t('settings.currentPassword')}
                    </label>
                    <div className="relative">
                      <input
                        type={showPasswords.current ? 'text' : 'password'}
                        value={passwordForm.currentPassword}
                        onChange={(e) => setPasswordForm(prev => ({ ...prev, currentPassword: e.target.value }))}
                        className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20 pr-12 transition-all duration-200"
                        placeholder="Enter current password"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => togglePasswordVisibility('current')}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
                      >
                        {showPasswords.current ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>

                  {/* New Password */}
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      {t('settings.newPassword')}
                    </label>
                    <div className="relative">
                      <input
                        type={showPasswords.new ? 'text' : 'password'}
                        value={passwordForm.newPassword}
                        onChange={(e) => setPasswordForm(prev => ({ ...prev, newPassword: e.target.value }))}
                        className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20 pr-12 transition-all duration-200"
                        placeholder="Enter new password"
                        required
                        minLength={6}
                      />
                      <button
                        type="button"
                        onClick={() => togglePasswordVisibility('new')}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
                      >
                        {showPasswords.new ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                    <div className="text-xs text-slate-400 mt-1">
                      {t('migration.password_validation')}
                    </div>
                  </div>

                  {/* Confirm Password */}
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      {t('settings.confirmNewPassword')}
                    </label>
                    <div className="relative">
                      <input
                        type={showPasswords.confirm ? 'text' : 'password'}
                        value={passwordForm.confirmPassword}
                        onChange={(e) => setPasswordForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                        className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20 pr-12 transition-all duration-200"
                        placeholder="Confirm new password"
                        required
                        minLength={6}
                      />
                      <button
                        type="button"
                        onClick={() => togglePasswordVisibility('confirm')}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
                      >
                        {showPasswords.confirm ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>

                  <div className="flex gap-3 pt-4">
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="flex items-center gap-2 px-4 py-2 bg-green-500 hover:bg-green-600 disabled:opacity-50 text-white rounded-lg font-medium transition-all duration-200 shadow-lg hover:shadow-xl"
                    >
                      <Save size={16} />
                      {isSubmitting ? t('settings.saving') : t('settings.savePassword')}
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setShowPasswordSection(false);
                        setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
                        clearMessages();
                      }}
                      className="px-4 py-2 bg-slate-600 hover:bg-slate-700 text-white rounded-lg font-medium transition-all duration-200"
                    >
                      {t('cancel')}
                    </button>
                  </div>
                </form>
              )}
            </motion.div>
          )}

          {/* About Section */}
          {/* About Section */}
          <motion.div
            className="bg-slate-800/50 backdrop-blur-sm p-6 rounded-2xl border border-slate-700/50"
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.6 }}
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-purple-500/20 rounded-lg">
                <Info className="text-purple-400" size={20} />
              </div>
              <h2 className="text-xl font-semibold text-white">
                About Taura
              </h2>
            </div>

            <div className="space-y-6">
              {/* App Description */}
              <div className="bg-gradient-to-r from-purple-500/10 to-blue-500/10 p-4 rounded-lg border border-purple-500/20">
                <p className="text-slate-300 text-sm leading-relaxed">
                  Taura is a comprehensive utility application designed specifically for companies and laboratories. 
                  It provides essential tools and features to streamline operations and enhance productivity.
                </p>
              </div>

              {/* App Info Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-slate-700/30 p-4 rounded-lg border border-slate-600/30">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                    <div className="text-slate-400 text-sm">Version</div>
                  </div>
                  <div className="text-white font-semibold">0.1.0</div>
                </div>
                
                <div className="bg-slate-700/30 p-4 rounded-lg border border-slate-600/30">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                    <div className="text-slate-400 text-sm">Release</div>
                  </div>
                  <div className="text-white font-semibold">Beta</div>
                </div>
                
                <div className="bg-slate-700/30 p-4 rounded-lg border border-slate-600/30">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-2 h-2 bg-purple-400 rounded-full"></div>
                    <div className="text-slate-400 text-sm">Platform</div>
                  </div>
                  <div className="text-white font-semibold">Desktop</div>
                </div>
              </div>

              {/* Developer Info */}
              <div className="bg-slate-700/20 p-4 rounded-lg border border-slate-600/30">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 bg-gradient-to-r from-green-500 to-emerald-500 rounded-lg">
                    <User className="text-white" size={16} />
                  </div>
                  <div>
                    <h3 className="text-white font-semibold">Developer</h3>
                    <p className="text-slate-400 text-sm">Created & Maintained by</p>
                  </div>
                </div>
                <div className="text-white font-medium">Guendouz Ahmed Fateh</div>
              </div>

              {/* Copyright & Legal */}
              <div className="bg-slate-700/20 p-4 rounded-lg border border-slate-600/30">
                <div className="flex items-start gap-3">
                  <Copyright className="text-slate-400 flex-shrink-0 mt-0.5" size={18} />
                  <div className="space-y-2">
                    <div>
                      <p className="text-slate-300 font-medium">
                        © 2025 Guendouz Ahmed Fateh
                      </p>
                      <p className="text-slate-400 text-sm">
                        All rights reserved. This software is proprietary and confidential.
                      </p>
                    </div>
                    <div className="pt-2 border-t border-slate-600/30">
                      <p className="text-slate-400 text-xs">
                        Unauthorized reproduction or distribution of this software is strictly prohibited.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={handleOpenDocumentation}
                  className="flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-lg font-medium transition-all duration-200 shadow-lg hover:shadow-xl"
                >
                  <FileText size={16} />
                  View Documentation
                  <ExternalLink size={14} />
                </button>
                
                <button
                  onClick={() => {
                    navigator.clipboard.writeText('Taura v0.1.0 - Desktop Utility Application');
                    handleSuccess('App info copied to clipboard');
                  }}
                  className="flex items-center justify-center gap-2 px-4 py-3 bg-slate-600 hover:bg-slate-700 text-white rounded-lg font-medium transition-all duration-200 shadow-lg hover:shadow-xl"
                >
                  <Info size={16} />
                  Copy App Info
                </button>
              </div>

              {/* Build Info (Optional - can be hidden in production) */}
              {isDeveloper && (
                <div className="bg-slate-700/20 p-4 rounded-lg border border-slate-600/30">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-2 h-2 bg-orange-400 rounded-full animate-pulse"></div>
                    <h3 className="text-white font-semibold text-sm">Developer Build Info</h3>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <span className="text-slate-400">Build:</span>
                      <span className="text-white ml-2">Debug</span>
                    </div>
                    <div>
                      <span className="text-slate-400">Environment:</span>
                      <span className="text-white ml-2">Development</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </div>

        {/* Migration Warning Modal */}
        {showMigrationWarning && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <motion.div
              className="bg-slate-800 p-8 rounded-2xl max-w-md w-full border border-slate-700 shadow-2xl"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3 }}
            >
              <div className="flex items-center gap-3 mb-6">
                <AlertTriangle className="text-amber-400" size={28} />
                <h3 className="text-xl font-bold text-white">Warning</h3>
              </div>
              
              <p className="text-slate-300 mb-6">
                {t('migration.disable_confirmation')}
                {t('migration.disable_warning')}
              </p>
              
              <div className="flex gap-3">
                <button
                  onClick={confirmMigrationModeDisable}
                  disabled={isSubmitting}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-medium transition-colors disabled:opacity-50"
                >
                  <Zap size={16} />
                  {isSubmitting ? t('migration.disabling') : t('migration.confirm_disable')}
                </button>
                
                <button
                  onClick={() => setShowMigrationWarning(false)}
                  className="flex-1 px-4 py-3 bg-slate-600 hover:bg-slate-700 text-white rounded-xl font-medium transition-colors"
                >
                  {t('cancel')}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Settings;