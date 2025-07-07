import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ColumnDef } from '@tanstack/react-table';
import { Users, Briefcase, ToggleLeft, ToggleRight } from 'lucide-react';
import Grid from '../Components/Common/Grid';
import { useMessage } from './context/Message';
import { DepositModal, WithdrawalModal } from '../Components/Modals';
import { invoke } from '@tauri-apps/api/core';
import {useI18n} from './context/I18nContext';
interface TreasuryData {
  id: number;
  year: number;
  month: number;
  initial_balance: number;
  total_income: number;
  total_expenditure: number;
  final_balance: number;
  is_current: boolean;
  updated_at: string;
}

const Treasury: React.FC = () => {
  const [activeFilter, setActiveFilter] = useState<'Current' | 'Archive'>(() => {
    const saved = localStorage.getItem('Treasury');
    return (saved as 'Current' | 'Archive') || 'Current';
  });
  const {t} = useI18n()

  // Add toggle state for number formatting
  const [showFullNumbers, setShowFullNumbers] = useState(() => {
    const saved = localStorage.getItem('TreasuryNumberFormat');
    return saved === 'full';
  });

  useEffect(() => {
    localStorage.setItem('Treasury', activeFilter);
  }, [activeFilter]);

  useEffect(() => {
    localStorage.setItem('TreasuryNumberFormat', showFullNumbers ? 'full' : 'abbreviated');
  }, [showFullNumbers]);

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [archive, setArchive] = useState<TreasuryData[]>([]);
  const [current, setCurrent] = useState<TreasuryData>();
  const [isDepositOpen, setIsDepositOpen] = useState(false);
  const [isWithdrawOpen, setIsWithdrawOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [depositLoading, setDepositLoading] = useState(false);
  const [withdrawLoading, setWithdrawLoading] = useState(false);

  const animationConfig = {
    pageTransition: { duration: 0.3, ease: "easeOut" },
    buttonHover: { duration: 0.12, ease: "easeOut" },
    filterTransition: { duration: 0.2, ease: "easeInOut" },
  };

  // Updated formatting function that respects the toggle
  const formatNumber = (num: number): string => {
    if (showFullNumbers) {
      return `${num.toLocaleString()} DA`;
    } else {
      if (num >= 1e10) return `${(num / 1e9).toFixed(1)} T DA`;
      if (num >= 1e7) return `${(num / 1e6).toFixed(1)} B DA`;
      if (num >= 1e4) return `${(num / 1e4).toFixed(1)} mill DA`;
      return `${num.toLocaleString()} DA`;
    }
  };

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

  const handleWarning = (warningMessage: string): void => {
    addToast({
      message: warningMessage,
      type: 'warning',
      duration: 2000,
    });
  };

  const handleInfo = (infoMessage: string) => {
    addToast({
      message: infoMessage,
      type: 'info',
      duration: 2000
    });
  };

  useEffect(() => {
    const fetchTreasuryData = async () => {
      try {
        handleInfo(t('loadingData'));

        const archiveData = await invoke('get_treasury_archive') as TreasuryData[];
        setArchive(archiveData);

        const tracker = await invoke('get_product_summary',{startDate: '2023-01-01', endDate: '2025-10-10'});
        console.log(tracker);
        const currentData = await invoke('get_treasury_current') as TreasuryData;
        if (currentData) {
          setCurrent(currentData);
        }

        handleSuccess(t('treasury.successLoad'));
      } catch (err) {
        console.error('Treasury fetch error:', err);
        setError(t('treasury.failedFetch'));
        handleError(t('treasury.failedFetch'));
      } finally {
        setIsLoading(false);
      }
    };

    fetchTreasuryData();
  }, []);

  const handleDeposit = async (Amount: number) => {
    const amount = Math.round(Amount * 100) / 100
    if (amount <= 0) {
      handleWarning(t('treasury.enterValidAmount'))
      return;
    }

    setDepositLoading(true);

    try {
      await invoke('make_deposit', {
        amount
      });

      const updatedCurrent = await invoke('get_treasury_current') as TreasuryData;
      if (updatedCurrent) {
        setCurrent(updatedCurrent);
      }

      handleSuccess(t('treasury.depositSuccessful',{amount: amount.toLocaleString()}));
      setIsDepositOpen(false);
    } catch (error) {
      console.error('Deposit error:', error);
      handleError(t('treasury.depositFailed'));
    } finally {
      setDepositLoading(false);
    }
  };

  const handleWithdraw = async (Amount: number) => {
    const amount = Math.round(Amount * 100) / 100
    if (amount <= 0) {
      handleWarning(t('treasury.enterValidAmount'));
      return;
    }

    const currentBalance = current?.final_balance || 0;
    if (amount > currentBalance) {
      handleError(t('treasury.insufficientBalance'));
      return;
    }

    setWithdrawLoading(true);

    try {
      await invoke('make_withdrawal', {
        amount
      });

      const updatedCurrent = await invoke('get_treasury_current') as TreasuryData;
      if (updatedCurrent) {
        setCurrent(updatedCurrent);
      }

      handleSuccess(t('treasury.insufficientBalance',{amount: amount.toFixed()}));
      setIsWithdrawOpen(false);
    } catch (error) {
      console.error('Withdrawal error:', error);
      handleError(t('treasuty.failedWithdrawal'));
    } finally {
      setWithdrawLoading(false);
    }
  };

  // Updated columns to use the new formatting function
  const columns: ColumnDef<TreasuryData>[] = [
    {
      accessorKey: 'year',
      header: t('treasury.year'),
      cell: info => info.getValue()
    },
    {
      accessorKey: 'month',
      header: t('treasury.month'),
      cell: info => {
        const monthNum = info.getValue() as number;
        const monthNames = [
          t('january'),
          t('february'),
          t('march'),
          t('april'),
          t('may'),
          t('june'),
          t('july'),
          t('august'),
          t('september'),
          t('october'),
          t('november'),
          t('december')
        ];
        return monthNames[monthNum - 1] || 'Unknown';
      }
    },
    {
      accessorKey: 'initial_balance',
      header: t('treasury.initialBalance'),
      cell: info => formatNumber(info.getValue() as number)
    },
    {
      accessorKey: 'total_income',
      header: t('treasury.totalIncome'),
      cell: info => formatNumber(info.getValue() as number)
    },
    {
      accessorKey: 'total_expenditure',
      header: t('treasury.totalExpenditure'),
      cell: info => formatNumber(info.getValue() as number)
    },
    {
      accessorKey: 'final_balance',
      header: t('treasury.finalBalance'),
      cell: info => formatNumber(info.getValue() as number)
    }
  ];

  const FilterTab = ({
    label,
    isActive,
    onClick,
    icon: Icon
  }: {
    label: string;
    isActive: boolean;
    onClick: () => void;
    icon: React.ElementType;
  }) => (
    <motion.button
      onClick={onClick}
      className={`flex items-center px-6 py-3 rounded-lg font-medium transition-all duration-200 ${isActive
        ? 'bg-blue-600 text-white shadow-lg ring-2 ring-blue-500 ring-opacity-50'
        : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white'
        }`}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      transition={animationConfig.buttonHover}
    >
      <Icon className="mr-2" size={18} />
      {label}
    </motion.button>
  );

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4 items-center justify-center min-h-screen">
        <motion.div
          className="w-8 h-8 border-2 border-white border-t-transparent rounded-full"
          animate={{ rotate: 360 }}
          transition={{
            duration: 0.6,
            repeat: Infinity,
            ease: "linear"
          }}
        />
        <motion.div
          className="text-white"
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        >
          {t('loadingFilter',{filter: activeFilter})}
        </motion.div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col gap-4 items-center justify-center min-h-screen">
        <div className="text-red-400 text-center">
          <h2 className="text-xl font-semibold mb-2">{t('treasury.errorLoading')}</h2>
          <p>{error}</p>
          <button
            onClick={() => {
              setError(null);
              setIsLoading(true);
              window.location.reload();
            }}
            className="mt-4 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
          >
            {t('retry')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className='flex flex-col space-y-8 mx-auto py-6 pb-5 px-1 lg:px-2 xl:px-4'>
      {/* Header with Toggle */}
      <motion.div
        initial={{ opacity: 0, y: -40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="flex justify-between items-start"
      >
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">{t('treasury.title')}</h1>
          <p className="text-slate-400">{t('treasury.subtitle')}</p>
        </div>

        {/* Number Format Toggle */}
        <motion.button
          onClick={() => setShowFullNumbers(!showFullNumbers)}
          className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white px-4 py-2 rounded-lg transition-all duration-200"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          {showFullNumbers ? (
            <ToggleRight className="text-green-400" size={20} />
          ) : (
            <ToggleLeft className="text-slate-400" size={20} />
          )}
          <span className="text-sm font-medium">
            {showFullNumbers ? t('treasury.fullNumbers') : t('treasury.abbreviated')}
          </span>
        </motion.button>
      </motion.div>

      {/* Filter Tabs */}
      <motion.div
        className="flex gap-4 justify-center"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.2 }}
      >
        <FilterTab
          label={t('treasury.current')}
          isActive={activeFilter === 'Current'}
          onClick={() => setActiveFilter('Current')}
          icon={Users}
        />
        <FilterTab
          label={t('treasury.archive')}
          isActive={activeFilter === 'Archive'}
          onClick={() => setActiveFilter('Archive')}
          icon={Briefcase}
        />
      </motion.div>

      <AnimatePresence mode="wait">
        {activeFilter === 'Current' ? (
          <motion.div
            key="current"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            transition={animationConfig.pageTransition}
            className="space-y-8"
          >
            {/* Current Treasury Metrics */}
            <motion.div
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 min-w-0"
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
            >
              <div className="bg-slate-900 p-6 rounded-xl shadow-md border border-slate-700 min-w-0">
                <h3 className="text-lg font-semibold text-white mb-2">{t('treasury.currentBalance')}</h3>
                <p
                  className="text-2xl font-bold text-green-400 truncate cursor-help"
                  title={`${current?.final_balance?.toLocaleString() || '0'} DA`}
                >
                  {formatNumber(current?.final_balance || 0)}
                </p>
              </div>
              <div className="bg-slate-900 p-6 rounded-xl shadow-md border border-slate-700 min-w-0">
                <h3 className="text-lg font-semibold text-white mb-2">{t('treasury.totalIncome')}</h3>
                <p
                  className="text-2xl font-bold text-blue-400 truncate cursor-help"
                  title={`${current?.total_income?.toLocaleString() || '0'} DA`}
                >
                  {formatNumber(current?.total_income || 0)}
                </p>
              </div>
              <div className="bg-slate-900 p-6 rounded-xl shadow-md border border-slate-700 min-w-0">
                <h3 className="text-lg font-semibold text-white mb-2">{t('treasury.totalExpenditure')}</h3>
                <p
                  className="text-2xl font-bold text-red-400 truncate cursor-help"
                  title={`${current?.total_expenditure?.toLocaleString() || '0'} DA`}
                >
                  {formatNumber(current?.total_expenditure || 0)}
                </p>
              </div>
              <div className="bg-slate-900 p-6 rounded-xl shadow-md border border-slate-700 min-w-0">
                <h3 className="text-lg font-semibold text-white mb-2">{t('treasury.initialBalance')}</h3>
                <p
                  className="text-2xl font-bold text-purple-400 truncate cursor-help"
                  title={`${current?.initial_balance?.toLocaleString() || '0'} DA`}
                >
                  {formatNumber(current?.initial_balance || 0)}
                </p>
              </div>
            </motion.div>

            {/* Action Buttons */}
            <motion.div
              className="flex gap-4 justify-center"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.4 }}
            >
              <button
                onClick={() => setIsDepositOpen(true)}
                className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-medium transition-colors duration-200"
              >
                {t('treasury.makeDeposit')}
              </button>
              <button
                onClick={() => setIsWithdrawOpen(true)}
                className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-lg font-medium transition-colors duration-200"
              >
                {t('treasury.makeWithdrawal')}
              </button>
            </motion.div>

            {/* Current Treasury Data Display */}
            {current && (
              <motion.div
                className="bg-slate-900 p-6 rounded-xl shadow-md border border-slate-700"
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.5 }}
              >
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-xl font-semibold text-white">{t('treasury.currentPeriod')}</h3>
                  <div className="text-sm text-slate-400">
                    {t('treasury.lastUpdated')}: {new Date(current.updated_at).toLocaleString()}
                  </div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 min-w-0 overflow-hidden">
                  <div>
                    <p className="text-sm text-slate-400">{t('year')}</p>
                    <p className="text-lg font-semibold text-white">{current.year}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-400">{t('month')}</p>
                    <p className="text-lg font-semibold text-white">
                      {[
          t('january'),
          t('february'),
          t('march'),
          t('april'),
          t('may'),
          t('june'),
          t('july'),
          t('august'),
          t('september'),
          t('october'),
          t('november'),
          t('december')
        ][current.month - 1]}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-400">{t('treasury.initialBalance')}</p>
                    <p
                      className="text-lg font-semibold text-green-400 truncate cursor-help"
                      title={`${current.initial_balance.toLocaleString()} DA`}
                    >
                      {formatNumber(current.initial_balance)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-400">{t('treasury.totalIncome')}</p>
                    <p
                      className="text-lg font-semibold text-blue-400 truncate cursor-help"
                      title={`${current.total_income.toLocaleString()} DA`}
                    >
                      {formatNumber(current.total_income)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-400">{t('treasury.totalExpenditure')}</p>
                    <p
                      className="text-lg font-semibold text-red-400 truncate cursor-help"
                      title={`${current.total_expenditure.toLocaleString()} DA`}
                    >
                      {formatNumber(current.total_expenditure)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-400">{t('treasury.finalBalance')}</p>
                    <p
                      className="text-lg font-semibold text-purple-400 truncate cursor-help"
                      title={`${current.final_balance.toLocaleString()} DA`}
                    >
                      {formatNumber(current.final_balance)}
                    </p>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Modals */}
            <DepositModal
              isOpen={isDepositOpen}
              onClose={() => setIsDepositOpen(false)}
              onConfirm={(amount) => handleDeposit(amount)}
              loading={depositLoading}
            />

            <WithdrawalModal
              isOpen={isWithdrawOpen}
              onClose={() => setIsWithdrawOpen(false)}
              onConfirm={(amount) => handleWithdraw(amount)}
              loading={withdrawLoading}
              currentBalance={current?.final_balance || 0}
            />
          </motion.div>
        ) : (
          <motion.div
            key="archive"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            transition={animationConfig.pageTransition}
            className="space-y-8"
          >
            {/* Archive Grid */}
            <motion.div
              className="bg-slate-900 p-4 rounded-xl shadow-md border border-slate-700"
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.5 }}
            >
              <Grid
                data={archive}
                columns={columns}
                title="Treasury Records"
                type="treasury"
                pageSize={5}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default Treasury