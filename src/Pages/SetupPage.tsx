import React, { useState, useEffect } from 'react';
import { Lock, LogInIcon, CheckCircle, Eye, EyeOff } from 'lucide-react';
import { useAuth } from './context/AuthContext';
import LoadingScreen from './LoadingScreen';
import { useI18n } from './context/I18nContext.tsx';


const SetupPage = () => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  type Ripple = { id: number; x: number; y: number; size: number };
  const [ripples, setRipples] = useState<Ripple[]>([]);
  const [passwordStrength, setPasswordStrength] = useState({ score: 0, feedback: '' });
  const { initializeAuth } = useAuth();
  const {t} = useI18n();
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

  // Password strength checker
  useEffect(() => {
    if (!password) {
      setPasswordStrength({ score: 0, feedback: '' });
      return;
    }

    let score = 0;
    let feedback = '';

    if (password.length >= 8) score += 1;
    if (/[a-z]/.test(password)) score += 1;
    if (/[A-Z]/.test(password)) score += 1;
    if (/[0-9]/.test(password)) score += 1;
    if (/[^a-zA-Z0-9]/.test(password)) score += 1;

    switch (score) {
      case 0:
      case 1:
        feedback = t('setup.veryWeakPassword');
        break;
      case 2:
        feedback = t('setup.weakPassword');
        break;
      case 3:
        feedback = t('setup.fairPassword');
        break;
      case 4:
        feedback = t('setup.goodPassword');
        break;
      case 5:
        feedback = t('setup.strongPassword');
        break;
    }

    setPasswordStrength({ score, feedback });
  }, [password]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

      const startTime = Date.now();
      const minLoadingTime = 3000; // 3 seconds
    
    if (!password.trim()) {
      setError(t('setup.passwordEnter'));
      return;
    }

    if (password.length < 8) {
      setError(t('setup.passwordLength'));
      return;
    }

    if (password !== confirmPassword) {
      setError(t('setup.notPasswordMatch'));
      return;
    }

    if (passwordStrength.score < 3) {
      setError(t('setup.stronggerPassword'));
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const response = await initializeAuth(password);
      
      if (!response.success) {
        setError(response.message || t('setup.failed'));
      }
      // If successful, AuthContext will handle the state update
    } catch (err) {
      setError(t('setup.failed2'));
    } finally {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, minLoadingTime - elapsed);

      setTimeout(() => setIsLoading(false), remaining);
    }
  };

  const getStrengthColor = () => {
    switch (passwordStrength.score) {
      case 0:
      case 1:
        return 'bg-red-500';
      case 2:
        return 'bg-orange-500';
      case 3:
        return 'bg-yellow-500';
      case 4:
        return 'bg-blue-500';
      case 5:
        return 'bg-green-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getStrengthWidth = () => {
    return `${(passwordStrength.score / 5) * 100}%`;
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

  if (isLoading) {
    return (
        <LoadingScreen />
    )
  }

  return (
    <div className="min-h-screen w-full relative overflow-hidden bg-gradient-to-br from-gray-950 via-slate-950 to-gray-900">
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

      <style>{`
        @keyframes ripple {
          0% { transform: scale(0); opacity: 1; }
          100% { transform: scale(4); opacity: 0; }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
        }
        .float-animation { animation: float 6s ease-in-out infinite; }

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
          <div className="backdrop-blur-xl bg-black/40 border border-slate-600/30 rounded-3xl shadow-2xl p-8 relative overflow-hidden">
            <div className="absolute inset-0 rounded-3xl bg-gradient-to-r from-slate-600/10 via-gray-600/10 to-slate-600/10 p-[1px]">
              <div className="h-full w-full rounded-3xl bg-black/60 backdrop-blur-xl"></div>
            </div>

            <div className="relative z-10">
              {/* Logo/Header */}
              <div className="text-center mb-8">
                <div className="inline-flex items-center justify-center w-20 h-20 bg-[#040A1D] backdrop-blur-xl rounded-2xl mb-6 shadow-2xl ring-1 ring-slate-600/30 relative overflow-hidden group float-animation">
                  <AfricaIcon />
                  <div className="absolute inset-0 bg-gradient-to-br from-slate-700/20 via-transparent to-slate-600/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                </div>

                <h1 className="text-4xl font-bold bg-gradient-to-r from-slate-200 via-gray-200 to-slate-300 bg-clip-text text-transparent mb-2">
                  {t('setup.welcome')}
                </h1>
                <p className="text-slate-400/80 mb-4">{t('setup.subtitle')}</p>
                <div className="flex items-center justify-center gap-2 text-sm text-slate-500">
                  <CheckCircle className="w-4 h-4 text-green-400" />
                  <span>{t('setup.firstTimeSetup')}</span>
                </div>
              </div>

              {/* Form */}
              <div className="space-y-6">
                {/* Password input */}
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none z-10">
                    <Lock className="h-5 w-5 text-slate-500 group-focus-within:text-slate-400 transition-all duration-300 group-focus-within:scale-110" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (error) setError('');
                    }}
                    placeholder={t('setup.createPassword')}
                    className="w-full pl-12 pr-12 py-4 bg-slate-900/30 border border-slate-600/40 rounded-2xl text-slate-200 placeholder-slate-500/60 focus:outline-none focus:ring-2 focus:ring-slate-500/50 focus:border-slate-500/50 backdrop-blur-xl transition-all duration-300 hover:bg-slate-900/40 focus:bg-slate-900/50 focus:shadow-lg focus:shadow-slate-500/10"
                  />
                  
                  <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-slate-500/0 via-slate-400/20 to-slate-500/0 opacity-0 group-focus-within:opacity-100 transition-all duration-500 pointer-events-none -z-10 blur-md"></div>
                  
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-4 flex items-center focus:outline-none group z-10"
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5 text-slate-500 group-hover:text-slate-400 transition-all duration-300 group-hover:scale-110" />
                    ) : (
                      <Eye className="h-5 w-5 text-slate-500 group-hover:text-slate-400 transition-all duration-300 group-hover:scale-110" />
                    )}
                  </button>
                </div>

                {/* Password strength indicator */}
                {password && (
                  <div className="space-y-2">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-slate-400">{t('setup.passwordStrength')}</span>
                      <span className={`font-medium ${
                        passwordStrength.score <= 2 ? 'text-red-400' : 
                        passwordStrength.score <= 3 ? 'text-yellow-400' : 
                        passwordStrength.score <= 4 ? 'text-blue-400' : 'text-green-400'
                      }`}>
                        {passwordStrength.feedback}
                      </span>
                    </div>
                    <div className="w-full bg-slate-700/50 rounded-full h-2 overflow-hidden">
                      <div 
                        className={`h-full transition-all duration-300 ${getStrengthColor()}`}
                        style={{ width: getStrengthWidth() }}
                      />
                    </div>
                  </div>
                )}

                {/* Confirm Password input */}
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none z-10">
                    <Lock className="h-5 w-5 text-slate-500 group-focus-within:text-slate-400 transition-all duration-300 group-focus-within:scale-110" />
                  </div>
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => {
                      setConfirmPassword(e.target.value);
                      if (error) setError('');
                    }}
                    placeholder={t('setup.confirmPassword')}
                    className="w-full pl-12 pr-12 py-4 bg-slate-900/30 border border-slate-600/40 rounded-2xl text-slate-200 placeholder-slate-500/60 focus:outline-none focus:ring-2 focus:ring-slate-500/50 focus:border-slate-500/50 backdrop-blur-xl transition-all duration-300 hover:bg-slate-900/40 focus:bg-slate-900/50 focus:shadow-lg focus:shadow-slate-500/10"
                  />
                  
                  <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-slate-500/0 via-slate-400/20 to-slate-500/0 opacity-0 group-focus-within:opacity-100 transition-all duration-500 pointer-events-none -z-10 blur-md"></div>
                  
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute inset-y-0 right-0 pr-4 flex items-center focus:outline-none group z-10"
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-5 w-5 text-slate-500 group-hover:text-slate-400 transition-all duration-300 group-hover:scale-110" />
                    ) : (
                      <Eye className="h-5 w-5 text-slate-500 group-hover:text-slate-400 transition-all duration-300 group-hover:scale-110" />
                    )}
                  </button>
                </div>

                {/* Password match indicator */}
                {confirmPassword && (
                  <div className="flex items-center gap-2 text-sm">
                    {password === confirmPassword ? (
                      <>
                        <CheckCircle className="w-4 h-4 text-green-400" />
                        <span className="text-green-400">{t('setup.passwordsMatch')}</span>
                      </>
                    ) : (
                      <>
                        <div className="w-4 h-4 rounded-full border-2 border-red-400"></div>
                        <span className="text-red-400">{t('setup.passwordsDontMatch')}</span>
                      </>
                    )}
                  </div>
                )}

                {/* Error message */}
                {error && (
                  <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-2xl text-red-300 text-sm backdrop-blur-xl relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-r from-red-500/5 to-pink-500/5"></div>
                    <span className="relative z-10">{error}</span>
                  </div>
                )}

                {/* Submit button */}
                <button
                  type="submit"
                  onClick={handleSubmit}
                  disabled={isLoading || password !== confirmPassword || passwordStrength.score < 3}
                  className="w-full py-4 bg-gradient-to-r from-slate-700 via-gray-700 to-slate-600 hover:from-slate-600 hover:via-gray-600 hover:to-slate-500 text-white font-semibold rounded-2xl shadow-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 relative overflow-hidden group hover:shadow-slate-500/20 hover:shadow-2xl transform hover:scale-[1.02] active:scale-[0.98]"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent transform -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
                  
                  <span className="relative flex items-center justify-center gap-3">
                    {isLoading ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        {t('setup.settingUp')}
                      </>
                    ) : (
                      <>
                        <LogInIcon className="w-5 h-5" />
                        {t('setup.completeSetup')}
                      </>
                    )}
                  </span>
                </button>

                <div className="flex items-center justify-center gap-4 mt-6">
                  <div className="h-px bg-gradient-to-r from-transparent via-slate-500/30 to-transparent flex-1"></div>
                  <span className="text-slate-500/60 text-sm font-medium">TAURA SETUP</span>
                  <div className="h-px bg-gradient-to-r from-transparent via-slate-500/30 to-transparent flex-1"></div>
                </div>
              </div>

              <div className="mt-8 text-center">
                <div className="flex items-center justify-center gap-3 mb-3">
                  <div className="w-2 h-2 bg-slate-500 rounded-full animate-pulse"></div>
                  <div className="w-2 h-2 bg-slate-600 rounded-full animate-pulse"></div>
                  <div className="w-2 h-2 bg-gray-600 rounded-full animate-pulse"></div>
                </div>
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

export default SetupPage;