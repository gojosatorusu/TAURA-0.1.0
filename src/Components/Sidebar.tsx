import React, { useState, useRef, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../Pages/context/AuthContext';
import {
    Warehouse,
    ShoppingCart,
    Users,
    DollarSign,
    PiggyBank,
    BellRing,
    History,
    Settings,
    Menu,
    Lock,
    LogOut,
    Bot
} from 'lucide-react';
import { useNotifications } from '../Pages/context/NotificationContext';
import { useEdit } from '../Pages/context/EditContext';
import { useMessage } from '../Pages/context/Message';
import { useI18n } from '../Pages/context/I18nContext';

const Sidebar = () => {
    const {t} = useI18n()
    const SIDEBAR_COMPONENTS = [
    {
        name: t('treasury'),
        icon: PiggyBank,
        color: '#D97706',
        path: '/treasury',
    },
    {
        name: t('rawMaterials'),
        icon: Warehouse,
        color: '#B45309',
        path: '/raw-materials',
    },
    {
        name: t('products'),
        icon: ShoppingCart,
        color: '#0EA5E9',
        path: '/products',
    },
    {
        name: t('clientsAndVendors'),
        icon: Users,
        color: '#9333EA',
        path: '/clientsvendors',
    },
    {
        name: t('purchaasesAndSales'),
        icon: DollarSign,
        color: '#15803D',
        path: '/financial-transactions',
    },
    {
        name: 'Notifications',
        icon: BellRing,
        color: '#DC2626',
        path: '/notifications',
    },
    {
        name: t('history'),
        icon: History,
        color: '#6B7280',
        path: '/history',
    },
    {
        name: t('settings'),
        icon: Settings,
        color: '#8B5CF6',
        path: '/settings',
    },
    {
        name: t('chat'),
        icon: Bot,
        color: '#10B981',
        path: '/chat',
    },
];
    const [sidebarOpen, setSidebarOpen] = React.useState(true);
    const location = useLocation();
    const { hasNotifications, clearNotifications } = useNotifications();
    const { isAnyEditing } = useEdit();
    const { addToast } = useMessage();
    const { logout } = useAuth();
    const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
    const [isLoggingOut, setIsLoggingOut] = useState(false);
    const logoutRef = useRef<HTMLDivElement>(null);

    // Close logout confirmation when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: Event) => {
            if (logoutRef.current && !logoutRef.current.contains(event.target as Node)) {
                setShowLogoutConfirm(false);
            }
        };

        if (showLogoutConfirm) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [showLogoutConfirm]);

    const handleLogout = async () => {
        setIsLoggingOut(true);
        try {
            await logout();
        } catch (error) {
            
            addToast({
                message: t('errorLoggingOut'),
                type: 'error',
                duration: 3000,
            });
        } finally {
            setIsLoggingOut(false);
            setShowLogoutConfirm(false);
        }
    };

    const handleNotificationClick = (e: React.MouseEvent<HTMLAnchorElement, MouseEvent>) => {
        if (isAnyEditing) {
            e.preventDefault();
            addToast({
                message: t('saveChangesBefore'),
                type: 'warning',
                duration: 3000,
            });
            return;
        }

        if (location.pathname === '/notifications') {
            clearNotifications();
        }
    };

    interface NavigationEvent extends React.MouseEvent<HTMLAnchorElement, MouseEvent> {}

    const handleNavigation = (e: NavigationEvent, path: string): void => {
        if (isAnyEditing && location.pathname !== path) {
            e.preventDefault();
            addToast({
                message: t('saveChangesBefore'),
                type: 'warning',
                duration: 3000,
            });
            return;
        }
    };

    const handleToggleSidebar = () => {
        if (isAnyEditing) {
            addToast({
                message: t('sideLocked'),
                type: 'info',
                duration: 2500,
            });
            return;
        }
        setSidebarOpen(!sidebarOpen);
    };

    return (
        <motion.div
            className={`sticky top-0 z-10 transition-all duration-300 ease-in-out flex-shrink-0 ${isAnyEditing ? 'w-20' : (sidebarOpen ? 'w-64' : 'w-20')
                }`}
            animate={{
                width: isAnyEditing ? 80 : (sidebarOpen ? 256 : 80),
                opacity: isAnyEditing ? 0.6 : 1
            }}>
            <div className={`h-full bg-gray-900 bg-opacity-100 backdrop-blur-md p-4 flex flex-col border-r border-gray-700 ${isAnyEditing ? 'relative' : ''
                }`}>
                {/* Overlay when editing */}
                {isAnyEditing && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="absolute inset-0 bg-gray-900 bg-opacity-50 backdrop-blur-sm z-10 flex items-center justify-center"
                    >
                        <motion.div
                            animate={{
                                rotate: [0, 5, -5, 0],
                                scale: [1, 1.1, 1]
                            }}
                            transition={{
                                duration: 2,
                                repeat: Infinity,
                                ease: "easeInOut"
                            }}
                            className="text-amber-400"
                        >
                            <Lock size={24} />
                        </motion.div>
                    </motion.div>
                )}

                <motion.button
                    whileHover={!isAnyEditing ? { scale: 1.1 } : {}}
                    whileTap={!isAnyEditing ? { scale: 0.9 } : {}}
                    className={`p-2 rounded-full transition-colors max-w-fit mb-2 flex items-center justify-center ${isAnyEditing
                        ? 'cursor-not-allowed text-gray-500'
                        : 'hover:bg-gray-700 cursor-pointer text-white'
                        }`}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    onClick={handleToggleSidebar}
                    disabled={isAnyEditing}>
                    <Menu className='w-6 h-6' />
                </motion.button>

                <nav className='mt-6 flex-1'>
                    {SIDEBAR_COMPONENTS.map((component, index) => {
                        const isNotificationItem = component.path === '/notifications';
                        const isCurrentPath = location.pathname === component.path;
                        const isDisabled = isAnyEditing && !isCurrentPath;

                        return (
                            <Link
                                key={index}
                                to={component.path}
                                onClick={(e) => {
                                    if (isNotificationItem) {
                                        handleNotificationClick(e);
                                    } else {
                                        handleNavigation(e, component.path);
                                    }
                                }}
                                className={`flex items-center gap-3 p-3 rounded-md transition-colors mb-2 relative group ${isCurrentPath
                                    ? 'bg-gray-700'
                                    : isDisabled
                                        ? 'cursor-not-allowed opacity-50'
                                        : 'hover:bg-gray-700 cursor-pointer'
                                    }`}>

                                <div className='relative flex items-center justify-center flex-shrink-0'>
                                    {/* Bell with swing animation when notifications exist */}
                                    {isNotificationItem && hasNotifications && !isAnyEditing ? (
                                        <motion.div
                                            initial={{ opacity: 0, x: -20 }}
                                            animate={{
                                                rotate: [0, -20, 20, -20, 20, -20, 0], opacity: 1, x: 0
                                            }}
                                            whileHover={!isDisabled ? { scale: 1.1 } : {}}
                                            transition={{
                                                duration: 0.5,
                                                repeat: Infinity,
                                                ease: [0.1, 0.8, 0.9, 1],
                                                repeatDelay: 1.5
                                            }}
                                            style={{ transformOrigin: "50% 20%" }}
                                        >
                                            {React.createElement(component.icon, {
                                                size: 20,
                                                style: {
                                                    color: isDisabled ? '#6B7280' : component.color,
                                                    minWidth: "20px"
                                                }
                                            })}
                                        </motion.div>
                                    ) : (
                                        <motion.div
                                            whileHover={!isDisabled ? { scale: 1.1 } : {}}
                                            transition={{ duration: 0.2 }}
                                            initial={{ opacity: 0, x: -20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                        >
                                            {React.createElement(component.icon, {
                                                size: 20,
                                                style: {
                                                    color: isDisabled ? '#6B7280' : component.color,
                                                    minWidth: "20px"
                                                }
                                            })}
                                        </motion.div>
                                    )}

                                    {/* Static notification dot with subtle glow */}
                                    {isNotificationItem && hasNotifications && (
                                        <motion.div
                                            className="absolute -top-1 -right-1 w-3 h-3 bg-gradient-to-r from-red-500 to-red-600 rounded-full shadow-lg"
                                            initial={{ scale: 0, opacity: 0 }}
                                            animate={{
                                                scale: 1,
                                                opacity: isAnyEditing ? 0.5 : 1,
                                                boxShadow: [
                                                    "0 0 8px rgba(239, 68, 68, 0.6), 0 0 0 0 rgba(239, 68, 68, 0.4)",
                                                    "0 0 12px rgba(239, 68, 68, 0.8), 0 0 4px rgba(239, 68, 68, 0.6)",
                                                    "0 0 8px rgba(239, 68, 68, 0.6), 0 0 0 0 rgba(239, 68, 68, 0.4)"
                                                ]
                                            }}
                                            transition={{
                                                scale: { duration: 0.3, ease: "backOut" },
                                                opacity: { duration: 0.3 },
                                                boxShadow: {
                                                    duration: isAnyEditing ? 0 : 2,
                                                    repeat: isAnyEditing ? 0 : Infinity,
                                                    ease: "easeInOut"
                                                }
                                            }}
                                            style={{ zIndex: 10 }}
                                        >
                                            <div className="absolute top-0.5 left-0.5 w-1 h-1 bg-rose-300 rounded-full opacity-80" />
                                        </motion.div>
                                    )}
                                </div>

                                <AnimatePresence mode="wait">
                                    {(sidebarOpen && !isAnyEditing) ? (
                                        <motion.span
                                            key="text"
                                            className={`text-sm font-medium whitespace-nowrap overflow-hidden ${isDisabled ? 'text-gray-500' : 'text-white'
                                                }`}
                                            initial={{ opacity: 0, width: 0 }}
                                            animate={{ opacity: 1, width: 'auto' }}
                                            exit={{ opacity: 0, width: 0 }}
                                            transition={{ duration: 0.2, delay: sidebarOpen ? 0.1 : 0 }}>
                                            {component.name}
                                        </motion.span>
                                    ) : (
                                        <motion.div
                                            key="tooltip"
                                            className={`absolute left-full ml-3 px-3 py-2 bg-gray-800 text-white text-sm rounded-lg opacity-0 transition-all duration-200 pointer-events-none whitespace-nowrap z-50 border border-gray-600 shadow-xl ${!isDisabled ? 'group-hover:opacity-100' : ''
                                                }`}
                                            initial={{ opacity: 0, x: -10, scale: 0.9 }}
                                            animate={{ opacity: 0, x: 0, scale: 1 }}
                                            whileHover={{ opacity: isDisabled ? 0 : 1 }}
                                            style={{
                                                background: 'linear-gradient(135deg, rgba(31, 41, 55, 0.95) 0%, rgba(17, 24, 39, 0.95) 100%)',
                                                backdropFilter: 'blur(10px)'
                                            }}
                                        >
                                            <div className="flex items-center gap-2">
                                                <span>{component.name}</span>
                                                {isAnyEditing && !isCurrentPath && (
                                                    <Lock size={12} className="text-amber-400" />
                                                )}
                                                {isNotificationItem && hasNotifications && (
                                                    <motion.div
                                                        className="flex items-center justify-center w-5 h-5 bg-gradient-to-r from-red-500 to-red-600 rounded-full shadow-lg"
                                                        animate={{
                                                            boxShadow: [
                                                                "0 0 6px rgba(239, 68, 68, 0.6)",
                                                                "0 0 12px rgba(239, 68, 68, 0.8)",
                                                                "0 0 6px rgba(239, 68, 68, 0.6)"
                                                            ]
                                                        }}
                                                        transition={{
                                                            duration: 3,
                                                            repeat: Infinity,
                                                        }}
                                                    >
                                                        <div className="w-2 h-2 bg-white rounded-full opacity-90" />
                                                    </motion.div>
                                                )}
                                            </div>
                                            <div className="absolute top-1/2 -left-2 transform -translate-y-1/2">
                                                <div className="w-0 h-0 border-t-4 border-b-4 border-r-8 border-t-transparent border-b-transparent border-r-gray-800"></div>
                                                <div className="absolute -top-px left-1/2 transform -translate-x-1/2 w-0 h-0 border-t-3 border-b-3 border-r-6 border-t-transparent border-b-transparent border-r-gray-700"></div>
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </Link>
                        );
                    })}
                </nav>

                {/* Enhanced logout section - expanded sidebar */}
                <AnimatePresence>
                    {sidebarOpen && !isAnyEditing && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.2 }}
                            className="border-t border-gray-700 pt-4 mt-4 space-y-3"
                        >
                            <div className="text-xs text-gray-400 font-medium tracking-wide uppercase">
                                {t('invMan')}
                            </div>

                            <div className="relative" ref={logoutRef}>
                                <motion.button
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={() => setShowLogoutConfirm(!showLogoutConfirm)}
                                    className="flex items-center gap-3 w-full px-3 py-2 text-gray-300 hover:text-red-400 hover:bg-gray-800/50 rounded-lg transition-all duration-200 group text-sm"
                                    disabled={isLoggingOut}
                                >
                                    <div className="flex-shrink-0">
                                        {isLoggingOut ? (
                                            <div className="w-4 h-4 border border-gray-400 border-t-red-400 rounded-full animate-spin" />
                                        ) : (
                                            <LogOut className="w-4 h-4 transition-colors group-hover:text-red-400" />
                                        )}
                                    </div>
                                    <span className="font-medium">
                                        {isLoggingOut ? t('signingOut') || 'Signing out...' : t('signOut') || 'Sign out'}
                                    </span>
                                </motion.button>

                                {/* Logout confirmation modal */}
                                <AnimatePresence>
                                    {showLogoutConfirm && (
                                        <motion.div
                                            initial={{ opacity: 0, scale: 0.95, y: 10 }}
                                            animate={{ opacity: 1, scale: 1, y: 0 }}
                                            exit={{ opacity: 0, scale: 0.95, y: 10 }}
                                            transition={{ duration: 0.15, ease: "easeOut" }}
                                            className="absolute bottom-full left-0 right-0 mb-2 bg-gray-800 border border-gray-600 rounded-lg shadow-xl z-50 overflow-hidden"
                                            style={{
                                                background: 'linear-gradient(135deg, rgba(31, 41, 55, 0.98) 0%, rgba(17, 24, 39, 0.98) 100%)',
                                                backdropFilter: 'blur(16px)',
                                                boxShadow: '0 20px 40px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.05)',
                                            }}
                                        >
                                            <div className="p-4">
                                                <div className="flex items-center gap-3 mb-3">
                                                    <div className="flex-shrink-0 w-8 h-8 bg-red-500/20 rounded-full flex items-center justify-center">
                                                        <LogOut className="w-4 h-4 text-red-400" />
                                                    </div>
                                                    <div>
                                                        <h3 className="text-sm font-semibold text-white">
                                                            {t('signOut') || 'Sign out'}?
                                                        </h3>
                                                        <p className="text-xs text-gray-400 mt-1">
                                                            {t('needToSignIn') || 'You\'ll need to sign in again to access your account.'}
                                                        </p>
                                                    </div>
                                                </div>
                                                
                                                <div className="flex gap-2">
                                                    <motion.button
                                                        whileHover={{ scale: 1.02 }}
                                                        whileTap={{ scale: 0.98 }}
                                                        onClick={() => setShowLogoutConfirm(false)}
                                                        className="flex-1 px-3 py-2 text-sm font-medium text-gray-300 bg-gray-700/50 hover:bg-gray-700 rounded-md transition-colors"
                                                    >
                                                        {t('cancel') || 'Cancel'}
                                                    </motion.button>
                                                    <motion.button
                                                        whileHover={{ scale: 1.02 }}
                                                        whileTap={{ scale: 0.98 }}
                                                        onClick={handleLogout}
                                                        disabled={isLoggingOut}
                                                        className="flex-1 px-3 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                                    >
                                                        {isLoggingOut && (
                                                            <div className="w-3 h-3 border border-white/30 border-t-white rounded-full animate-spin" />
                                                        )}
                                                        {isLoggingOut ? t('signingOut') || 'Signing out...' : t('signOut') || 'Sign out'}
                                                    </motion.button>
                                                </div>
                                            </div>
                                            
                                            {/* Arrow pointer */}
                                            <div className="absolute top-full left-1/2 transform -translate-x-1/2">
                                                <div className="w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-800"></div>
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Compact logout for collapsed sidebar */}
                {!sidebarOpen && !isAnyEditing && (
                    <div className="relative group" ref={logoutRef}>
                        <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => setShowLogoutConfirm(!showLogoutConfirm)}
                            className="p-2 text-gray-300 hover:text-red-400 hover:bg-gray-800/50 rounded-lg transition-all duration-200 w-full flex items-center justify-center"
                            disabled={isLoggingOut}
                        >
                            {isLoggingOut ? (
                                <div className="w-4 h-4 border border-gray-400 border-t-red-400 rounded-full animate-spin" />
                            ) : (
                                <LogOut className="w-4 h-4" />
                            )}
                        </motion.button>

                        {/* Tooltip for collapsed sidebar */}
                        <div className="absolute left-full ml-3 px-3 py-2 bg-gray-800 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-all duration-200 pointer-events-none whitespace-nowrap z-50 border border-gray-600 shadow-xl">
                            {t('signOut') || 'Sign out'}
                            <div className="absolute top-1/2 -left-2 transform -translate-y-1/2">
                                <div className="w-0 h-0 border-t-4 border-b-4 border-r-8 border-t-transparent border-b-transparent border-r-gray-800"></div>
                            </div>
                        </div>

                        {/* Logout confirmation for collapsed sidebar */}
                        <AnimatePresence>
                            {showLogoutConfirm && (
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.95, x: 10 }}
                                    animate={{ opacity: 1, scale: 1, x: 0 }}
                                    exit={{ opacity: 0, scale: 0.95, x: 10 }}
                                    transition={{ duration: 0.15, ease: "easeOut" }}
                                    className="absolute left-full top-0 ml-3 w-60 bg-gray-800 border border-gray-600 rounded-lg shadow-xl z-50 overflow-hidden"
                                    style={{
                                        background: 'linear-gradient(135deg, rgba(31, 41, 55, 0.98) 0%, rgba(17, 24, 39, 0.98) 100%)',
                                        backdropFilter: 'blur(16px)',
                                        boxShadow: '0 20px 40px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.05)',
                                    }}
                                >
                                    <div className="p-4">
                                        <div className="flex items-center gap-3 mb-3">
                                            <div className="flex-shrink-0 w-8 h-8 bg-red-500/20 rounded-full flex items-center justify-center">
                                                <LogOut className="w-4 h-4 text-red-400" />
                                            </div>
                                            <div>
                                                <h3 className="text-sm font-semibold text-white">
                                                    {t('signOut') || 'Sign out'}?
                                                </h3>
                                                <p className="text-xs text-gray-400 mt-1">
                                                    {t('needToSignIn') || 'You\'ll need to sign in again to access your account.'}
                                                </p>
                                            </div>
                                        </div>
                                        
                                        <div className="flex gap-2">
                                            <motion.button
                                                whileHover={{ scale: 1.02 }}
                                                whileTap={{ scale: 0.98 }}
                                                onClick={() => setShowLogoutConfirm(false)}
                                                className="flex-1 px-3 py-2 text-sm font-medium text-gray-300 bg-gray-700/50 hover:bg-gray-700 rounded-md transition-colors"
                                            >
                                                {t('cancel') || 'Cancel'}
                                            </motion.button>
                                            <motion.button
                                                whileHover={{ scale: 1.02 }}
                                                whileTap={{ scale: 0.98 }}
                                                onClick={handleLogout}
                                                disabled={isLoggingOut}
                                                className="flex-1 px-3 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                            >
                                                {isLoggingOut && (
                                                    <div className="w-3 h-3 border border-white/30 border-t-white rounded-full animate-spin" />
                                                )}
                                                {isLoggingOut ? t('signingOut') || 'Signing out...' : t('signOut') || 'Sign out'}
                                            </motion.button>
                                        </div>
                                    </div>
                                    
                                    {/* Arrow pointer */}
                                    <div className="absolute top-4 -left-2 transform">
                                        <div className="w-0 h-0 border-t-4 border-b-4 border-r-8 border-t-transparent border-b-transparent border-r-gray-800"></div>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                )}
            </div>
        </motion.div>
    );
};

export default Sidebar;