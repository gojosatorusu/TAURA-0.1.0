import { useState, useEffect } from 'react';
import { Eye, EyeOff, Lock, Sparkles, Check, LogIn, ShieldX, TrendingUp, X, AlertTriangle } from 'lucide-react';
import { useAuth } from './context/AuthContext';
import { useI18n } from './context/I18nContext';
import { AnimatePresence, motion } from 'framer-motion';

const AuthPage = () => {
  const [password, setPassword] = useState('');
  const [isVerified, setIsVerified] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [attemptCount, setAttemptCount] = useState(0);
  const [isBlocked, setIsBlocked] = useState(false);
  const [warningMessage, setWarningMessage] = useState('');
  const [showStockReminder, setShowStockReminder] = useState(false);
  const { t } = useI18n();
  type Ripple = { id: number; x: number; y: number; size: number };
  const [ripples, setRipples] = useState<Ripple[]>([]);
  const { login } = useAuth();

  const requiredText = t('auth.verificationText');
  const MAX_ATTEMPTS = 10;
  const WARNING_ATTEMPTS = [3, 5, 7];

  // Check if we're in the last 3 days of the month
  useEffect(() => {
    const checkStockReminderDate = () => {
      const now = new Date();
      const year = now.getFullYear();
      const month = now.getMonth();
      const lastDayOfMonth = new Date(year, month + 1, 0).getDate();
      const currentDay = now.getDate();
      const daysUntilEndOfMonth = lastDayOfMonth - currentDay;

      // Show reminder if we're in the last 3 days of the month
      setShowStockReminder(daysUntilEndOfMonth <= 2);
    };

    checkStockReminderDate();
    // Check daily at midnight
    const interval = setInterval(checkStockReminderDate, 24 * 60 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  // Modern mouse interaction - ripple effect
  useEffect(() => {
    interface Ripple {
      id: number;
      x: number;
      y: number;
      size: number;
    }
    const handleClick = (e: MouseEvent) => {
      const newRipple: Ripple = {
        id: Date.now(),
        x: e.clientX,
        y: e.clientY,
        size: 0
      };
      setRipples((prev: Ripple[]) => [...prev, newRipple]);
      setTimeout(() => {
        setRipples((prev: Ripple[]) => prev.filter((ripple: Ripple) => ripple.id !== newRipple.id));
      }, 1000);
    };
    window.addEventListener('click', handleClick);
    return () => {
      window.removeEventListener('click', handleClick);
    };
  }, []);

  // Check if user should be blocked on component mount
  useEffect(() => {
    const storedAttempts = localStorage.getItem('auth_attempts');
    if (storedAttempts) {
      const attempts = parseInt(storedAttempts, 10);
      setAttemptCount(attempts);
      if (attempts >= MAX_ATTEMPTS) {
        setIsBlocked(true);
        setError(t('auth.accountLocked'));
      }
    }
  }, []);

  const getWarningMessage = (attempts: number): string => {
    const remaining = MAX_ATTEMPTS - attempts;
    if (attempts === 3) {
      return t('auth.warning3', { count: remaining });
    } else if (attempts === 5) {
      return t('auth.warning5', { count: remaining });
    } else if (attempts === 7) {
      return t('auth.warning7', { count: remaining });
    }
    return '';
  };

  const handleSubmit = async (e: React.MouseEvent<HTMLButtonElement, MouseEvent>): Promise<void> => {
    e.preventDefault();

    // Check if user is blocked
    if (isBlocked) {
      setError(t('auth.accountLocked'));
      return;
    }

    if (!password.trim()) {
      setError(t('auth.passwordPlaceholder'));
      return;
    }

    if (!isVerified) {
      setError(t('auth.verify'));
      return;
    }

    setError('');
    setWarningMessage('');

    try {
      // Try developer login first
      let response: any = await login(password, true);
      if (!response.success) {
        // Try regular login
        response = await login(password, false);
      }

      if (response.success) {
        // Clear attempt count on successful login
        localStorage.removeItem('auth_attempts');
        setAttemptCount(0);
        // Login successful - loading screen will be handled by AuthContext
      } else {
        // Handle failed login attempt
        const newAttemptCount = attemptCount + 1;
        setAttemptCount(newAttemptCount);
        localStorage.setItem('auth_attempts', newAttemptCount.toString());

        // Check if user should be blocked
        if (newAttemptCount >= MAX_ATTEMPTS) {
          setIsBlocked(true);
          setError(t('auth.accountLocked'));
          return;
        }

        // Show warning messages at specific attempt counts
        if (WARNING_ATTEMPTS.includes(newAttemptCount)) {
          setWarningMessage(getWarningMessage(newAttemptCount));
        }

        // Show generic error message for wrong password
        const remainingAttempts = MAX_ATTEMPTS - newAttemptCount;
        setError(t('auth.wrongPassword') || `Incorrect password. ${remainingAttempts} attempts remaining.`);
      }
    } catch (err) {
      const newAttemptCount = attemptCount + 1;
      setAttemptCount(newAttemptCount);
      localStorage.setItem('auth_attempts', newAttemptCount.toString());

      if (newAttemptCount >= MAX_ATTEMPTS) {
        setIsBlocked(true);
        setError(t('auth.accountLocked'));
        return;
      }

      if (WARNING_ATTEMPTS.includes(newAttemptCount)) {
        setWarningMessage(getWarningMessage(newAttemptCount));
      }

      const remainingAttempts = MAX_ATTEMPTS - newAttemptCount;
      setError(t('auth.attemptsRemaining', { count: remainingAttempts }) || `Authentication failed. ${remainingAttempts} attempts remaining.`);
    }
  };

  // Africa icon as SVG component with proper background handling
  const AfricaIcon = () => (
    <div className="relative w-15 h-15 flex items-center justify-center ">
      <img
        src="/icon.png"
        alt="Africa Logo"
        className="object-contain relative filter brightness-110 contrast-110 africa"
        style={{
          filter: 'brightness(1.2) contrast(1.1) hue-rotate(10deg)',
          mixBlendMode: 'normal'
        }}
        onError={(e) => {
          e.currentTarget.src = '/icon.png';
        }}
      />
      <div className="absolute inset-0  rounded-lg opacity-50 mix-blend-overlay"></div>
    </div>
  );

  return (
    <div className="min-h-screen w-full relative overflow-hidden bg-gradient-to-br from-gray-900 via-slate-900 to-gray-800">
      {/* Dark Background Elements */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-0 -left-4 w-72 h-72 bg-slate-700 rounded-full mix-blend-multiply filter blur-xl opacity-40 animate-pulse"></div>
          <div className="absolute top-0 -right-4 w-72 h-72 bg-gray-700 rounded-full mix-blend-multiply filter blur-xl opacity-40 animate-pulse"></div>
          <div className="absolute -bottom-8 left-20 w-72 h-72 bg-slate-800 rounded-full mix-blend-multiply filter blur-xl opacity-40 animate-pulse"></div>
        </div>
        <div className="absolute inset-0 bg-[linear-gradient(rgba(71,85,105,0.02)_1.5px,transparent_1.5px),linear-gradient(90deg,rgba(71,85,105,0.02)_1.5px,transparent_1.5px)] bg-[size:60px_60px]"></div>
        {ripples.map(ripple => (
          <div
            key={ripple.id}
            className="fixed rounded-full border-2 border-slate-500/20 pointer-events-none z-10"
            style={{
              left: `${ripple.x - 25}px`,
              top: `${ripple.y - 25}px`,
              width: '50px',
              height: '50px',
              animation: 'ripple 1s ease-out forwards',
            }}
          />
        ))}
      </div>
      <AnimatePresence mode="wait">
        {showStockReminder && (
          <motion.div
            initial={{ y: -100, opacity: 0, scale: 0.95 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: -100, opacity: 0, scale: 0.95 }}
            transition={{
              type: "spring",
              stiffness: 300,
              damping: 30,
              opacity: { duration: 0.2 }
            }}
            className="fixed top-6 left-1/2 transform -translate-x-1/2 z-50"
          >
            <div className="relative backdrop-blur-md bg-slate-800/90 border border-slate-600/50 rounded-xl shadow-xl p-4 overflow-hidden max-w-sm min-w-[300px]">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 to-indigo-500/5"></div>

              <div className="relative z-10 flex items-center gap-3">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-blue-600/20 rounded-lg flex items-center justify-center border border-blue-500/30">
                    <TrendingUp className="w-4 h-4 text-blue-400" />
                  </div>
                </div>

                <div className="flex-1 min-w-0">
                  <h3 className="text-slate-200 text-sm font-medium mb-1">
                    {t('auth.monthRem')}
                  </h3>
                  <p className="text-slate-400 text-xs leading-relaxed">
                    {t('auth.reminderText')}
                  </p>
                </div>

                <button
                  type="button"
                  title="close"
                  onClick={() => setShowStockReminder(false)}
                  className=" font-extralight w-6 h-6 rounded-lg flex-shrink-0 bg-slate-700 hover:bg-slate-600/50 flex items-center justify-center transition-colors duration-200 border border-slate-600/30 hover:border-slate-500/50"
                >
                  X
                </button>
              </div>

              {/* Simple bottom accent */}
              <div className="absolute bottom-0 left-4 right-4 h-px bg-gradient-to-r from-transparent via-blue-400/30 to-transparent"></div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        @keyframes ripple {
          0% { transform: scale(0); opacity: 1; }
          100% { transform: scale(7); opacity: 0; }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-30px); }
        }
        .float-animation { animation: float 10s ease-in-out infinite; }
        input[type="password"]::-ms-reveal,
        input[type="password"]::-ms-clear {
          display: none;
        }
        input[type="password"]::-webkit-credentials-auto-fill-button,
        input[type="password"]::-webkit-strong-password-auto-fill-button {
          display: none !important;
        }
      `}</style>

      <div className="relative z-20 min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="backdrop-blur-xl bg-slate-800/40 border border-slate-600/30 rounded-3xl shadow-2xl p-8 relative overflow-hidden">
            <div className="absolute inset-0 rounded-3xl bg-gradient-to-r from-slate-600/10 via-gray-600/10 to-slate-600/10 p-[1px]">
              <div className="h-full w-full rounded-3xl bg-black/60 backdrop-blur-xl"></div>
            </div>

            <div className="relative z-10">
              <div className="text-center mb-8">
                <div className="inline-flex items-center justify-center w-20 h-20 bg-[#040A1D] backdrop-blur-xl rounded-2xl mb-6 shadow-2xl ring-1 ring-slate-600/30 relative overflow-hidden outline-1 outline-white/15 group float-animation">
                  <AfricaIcon />
                  <div className="absolute inset-0 bg-gradient-to-br from-slate-700/20 via-transparent to-slate-600/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                </div>
                <h1 className="text-4xl font-bold bg-gradient-to-r from-slate-200 via-gray-200 to-slate-300 bg-clip-text text-transparent mb-2">
                  {t('auth.welcome')}
                </h1>
                <p className="text-slate-400/80 flex items-center justify-center gap-2">
                  <Sparkles className="w-4 h-4 text-slate-500" />
                  {t('auth.secureAccess')}
                </p>
              </div>
              
              {/* Account Blocked Warning */}
              {isBlocked && (
                <div className="mb-4 p-4 bg-red-500/20 border border-red-500/40 rounded-2xl text-red-200 text-sm backdrop-blur-xl flex items-center gap-3">
                  <ShieldX className="w-5 h-5 text-red-400" />
                  <div>
                    <div className="font-semibold">{t('auth.accountLocked')}</div>
                    <div className="text-red-300/80 text-xs mt-1">{t('auth.lockedMessage')}</div>
                  </div>
                </div>
              )}

              {/* Warning Message for attempts 3, 5, 7 */}
              {warningMessage && !isBlocked && (
                <div className="mb-4 p-4 bg-yellow-500/20 border border-yellow-500/40 rounded-2xl text-yellow-200 text-sm backdrop-blur-xl flex items-center gap-3">
                  <AlertTriangle className="w-5 h-5 text-yellow-400" />
                  <div>
                    <div className="font-semibold">Security Warning</div>
                    <div className="text-yellow-300/80 text-xs mt-1">{warningMessage}</div>
                  </div>
                </div>
              )}

              <div className="space-y-6">
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none z-10">
                    <Lock className={`h-5 w-5 transition-all duration-300 group-focus-within:scale-110 ${isBlocked ? 'text-red-500' : 'text-slate-500 group-focus-within:text-slate-400'
                      }`} />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    disabled={isBlocked}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (error) setError('');
                      if (warningMessage) setWarningMessage('');
                    }}
                    placeholder={isBlocked ? "Account locked" : "Enter your password"}
                    className={`w-full pl-12 pr-12 py-4 border rounded-2xl text-slate-200 placeholder-slate-500/60 focus:outline-none backdrop-blur-xl transition-all duration-300 ${isBlocked
                      ? 'bg-red-900/20 border-red-500/40 cursor-not-allowed'
                      : 'bg-slate-900/30 border-slate-600/40 focus:ring-2 focus:ring-slate-500/50 focus:border-slate-500/50 hover:bg-slate-900/40 focus:bg-slate-900/50 focus:shadow-lg focus:shadow-slate-500/10'
                      }`}
                  />
                  <div className={`absolute inset-0 rounded-2xl bg-gradient-to-r from-slate-500/0 via-slate-400/20 to-slate-500/0 opacity-0 group-focus-within:opacity-100 transition-all duration-500 pointer-events-none -z-10 blur-md ${isBlocked ? 'hidden' : ''
                    }`}></div>
                  <button
                    type="button"
                    disabled={isBlocked}
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-4 flex items-center focus:outline-none group z-10 disabled:cursor-not-allowed"
                  >
                    {showPassword ? (
                      <EyeOff className={`h-5 w-5 transition-all duration-300 ${isBlocked ? 'text-red-500/50' : 'text-slate-500 group-hover:text-slate-400 group-hover:scale-110'
                        }`} />
                    ) : (
                      <Eye className={`h-5 w-5 transition-all duration-300 ${isBlocked ? 'text-red-500/50' : 'text-slate-500 group-hover:text-slate-400 group-hover:scale-110'
                        }`} />
                    )}
                  </button>
                </div>

                {/* Verification Checkbox */}
                <div className="relative group">
                  <div className={`flex items-start gap-3 p-4 border rounded-2xl backdrop-blur-xl transition-all duration-300 ${isBlocked
                    ? 'bg-red-900/10 border-red-500/30 cursor-not-allowed'
                    : 'bg-slate-900/20 border-slate-600/30 hover:bg-slate-900/30'
                    }`}>
                    <div className="relative flex-shrink-0 mt-0.5">
                      <input
                        type="checkbox"
                        id="verification"
                        checked={isVerified}
                        disabled={isBlocked}
                        onChange={(e) => {
                          setIsVerified(e.target.checked);
                          if (error) setError('');
                          if (warningMessage) setWarningMessage('');
                        }}
                        className="sr-only"
                      />
                      <label
                        htmlFor="verification"
                        className={`flex items-center justify-center w-5 h-5 border rounded transition-all duration-300 ${isBlocked
                          ? 'bg-red-900/20 border-red-500/50 cursor-not-allowed'
                          : 'bg-slate-800/50 border-slate-600/50 cursor-pointer hover:border-slate-500/70 hover:bg-slate-800/70'
                          }`}
                      >
                        {isVerified && (
                          <Check className={`w-3 h-3 ${isBlocked ? 'text-red-300/50' : 'text-slate-300'}`} />
                        )}
                      </label>
                    </div>
                    <label
                      htmlFor="verification"
                      className={`text-sm select-none leading-relaxed ${isBlocked
                        ? 'text-red-300/50 cursor-not-allowed'
                        : 'text-slate-300 cursor-pointer'
                        }`}
                    >
                      {requiredText}
                    </label>
                  </div>
                </div>

                {/* Error Message */}
                {error && (
                  <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-2xl text-red-300 text-sm backdrop-blur-xl relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-r from-red-500/5 to-pink-500/5"></div>
                    <span className="relative z-10 flex items-center gap-2">
                      <X className="w-4 h-4 text-red-400" />
                      {error}
                    </span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isBlocked}
                  onClick={handleSubmit}
                  className={`w-full py-4 font-semibold rounded-2xl shadow-xl transition-all duration-300 relative overflow-hidden group transform ${isBlocked
                    ? 'bg-red-500/20 text-red-300/50 cursor-not-allowed border border-red-500/30'
                    : 'bg-gradient-to-r from-slate-700 via-gray-700 to-slate-600 hover:from-slate-600 hover:via-gray-600 hover:to-slate-500 text-white hover:shadow-slate-500/20 hover:shadow-2xl hover:scale-[1.02] active:scale-[0.98]'
                    }`}
                >
                  {!isBlocked && (
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent transform -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
                  )}
                  <span className="relative flex items-center justify-center gap-3">
                    {isBlocked ? (
                      <>
                        <ShieldX className="w-5 h-5" />
                        {t('auth.locked')}
                      </>
                    ) : (
                      <>
                        <LogIn className="w-5 h-5" />
                        {t('auth.signIn')}
                      </>
                    )}
                  </span>
                </button>
              </div>

              <div className="mt-8 text-center">
                <div className="flex items-center justify-center gap-3 mb-3">
                  <div className="w-2 h-2 bg-slate-500 rounded-full animate-pulse"></div>
                  <div className="w-2 h-2 bg-slate-600 rounded-full animate-pulse"></div>
                  <div className="w-2 h-2 bg-gray-600 rounded-full animate-pulse"></div>
                </div>
                <p className="text-slate-400/60 text-sm font-medium">
                  Taura
                </p>
                <p className="text-slate-500/40 text-xs mt-1">
                  {t('auth.poweredBy')}
                </p>
              </div>
            </div>
          </div>

          <div className="mt-8 flex justify-center">
            <div className="flex gap-2">
              {[...Array(5)].map((_, i) => (
                <div
                  key={i}
                  className="w-1 h-1 bg-slate-500/30 rounded-full animate-pulse"
                ></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;