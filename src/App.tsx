import React from 'react';
import { HashRouter as Router, Route, Routes, useLocation, Navigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import Sidebar from './Components/Sidebar.tsx';
import AuthPage from './Pages/AuthPage.tsx';
import SetupPage from './Pages/SetupPage.tsx';
import './App.css';
import ClientsVendors from './Pages/ClientsVendors.tsx';
import Products from './Pages/Prod.tsx';
import BuysAndSales from './Pages/Purs&Sales.tsx';
import History from './Pages/History.tsx';
import Notifications from './Pages/Notifications.tsx';
import Raw_Materials from './Pages/Raw.tsx';
import AddRaw from './Pages/AddRaw.tsx';
import RawDetails from './Pages/RawDetails.tsx';
import ProdDetails from './Pages/ProdDetails.tsx';
import AddProd from './Pages/AddProd.tsx';
import AddVendor from './Pages/AddVendor.tsx';
import AddClient from './Pages/AddClient.tsx';
import Treasury from './Pages/Treasury.tsx';
import PurchaseDetails from './Pages/PurchaseDetails.tsx';
import SaleDetails from './Pages/SaleDetails.tsx';
import AddPurchase from './Pages/AddPurchase.tsx';
import AddSale from './Pages/AddSale.tsx';
import ClientDetails from './Pages/ClientDetails.tsx';
import VendorDetails from './Pages/VendorDetails.tsx';
import Settings from './Pages/Settings.tsx';
import { I18nProvider } from './Pages/context/I18nContext.tsx';
import { NotificationProvider } from './Pages/context/NotificationContext';
import { MessageProvider } from './Pages/context/Message';
import { EditProvider } from './Pages/context/EditContext.tsx';
import { AuthProvider, useAuth } from './Pages/context/AuthContext.tsx';
import ToastPortal from './Components/ToastPortal.tsx';
import Chat from './Pages/chat.tsx';

// Animation variants matching your ClientsVendors page style
const pageVariants = {
  initial: {
    opacity: 0,
    x: 50,
  },
  in: {
    opacity: 1,
    x: 0,
    transition: {
      duration: 0.3,
      ease: "easeOut"
    }
  },
  out: {
    opacity: 0,
    x: -50,
    transition: {
      duration: 0.3,
      ease: "easeOut"
    }
  }
};

const AnimatedRoutes = () => {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        {/* Redirect root and clientsvendors to treasury */}
        <Route
          path="/"
          element={<Navigate to="/treasury" replace />}
        />
        <Route
          path="/clientsvendors"
          element={
            <MotionWrapper>
              <ClientsVendors />
            </MotionWrapper>
          }
        />
        <Route
          path="/products"
          element={
            <MotionWrapper>
              <Products />
            </MotionWrapper>
          }
        />
        <Route
          path="/AddVendor"
          element={
            <MotionWrapper>
              <AddVendor />
            </MotionWrapper>
          }
        />
        <Route
          path="/AddClient"
          element={
            <MotionWrapper>
              <AddClient />
            </MotionWrapper>
          }
        />
        <Route
          path="/financial-transactions"
          element={
            <MotionWrapper>
              <BuysAndSales />
            </MotionWrapper>
          }
        />
        <Route
          path="/history"
          element={
            <MotionWrapper>
              <History />
            </MotionWrapper>
          }
        />
        <Route
          path="/notifications"
          element={
            <MotionWrapper>
              <Notifications />
            </MotionWrapper>
          }
        />
        <Route
          path="/raw-materials"
          element={
            <MotionWrapper>
              <Raw_Materials />
            </MotionWrapper>
          }
        />
        <Route
          path="/treasury"
          element={
            <MotionWrapper>
              <Treasury />
            </MotionWrapper>
          }
        />
        <Route
          path="/AddRaw"
          element={
            <MotionWrapper>
              <AddRaw />
            </MotionWrapper>
          }
        />
        <Route
          path="/RawDetails"
          element={
            <MotionWrapper>
              <RawDetails />
            </MotionWrapper>
          }
        />
        <Route
          path="/ProdDetails"
          element={
            <MotionWrapper>
              <ProdDetails />
            </MotionWrapper>
          }
        />
        <Route
          path="/SaleDetails"
          element={
            <MotionWrapper>
              <SaleDetails />
            </MotionWrapper>
          }
        />
        <Route
          path="/PurchaseDetails"
          element={
            <MotionWrapper>
              <PurchaseDetails />
            </MotionWrapper>
          }
        />
        <Route
          path="/AddProd"
          element={
            <MotionWrapper>
              <AddProd />
            </MotionWrapper>
          }
        />
        <Route
          path="/AddPurchase"
          element={
            <MotionWrapper>
              <AddPurchase />
            </MotionWrapper>
          }
        />
        <Route
          path="/AddSale"
          element={
            <MotionWrapper>
              <AddSale />
            </MotionWrapper>
          }
        />
        <Route
          path="/ClientDetails"
          element={
            <MotionWrapper>
              <ClientDetails />
            </MotionWrapper>
          }
        />
        <Route
          path="/VendorDetails"
          element={
            <MotionWrapper>
              <VendorDetails />
            </MotionWrapper>
          }
        />
        <Route
          path="/settings"
          element={
            <MotionWrapper>
              <Settings />
            </MotionWrapper>
          }
        />
        <Route
          path="/chat"
          element={
            <MotionWrapper>
              <Chat />
            </MotionWrapper>
          }
        />
      </Routes>
    </AnimatePresence>
  );
};

const MotionWrapper = ({ children }: { children: React.ReactNode }) => {
  return (
    <motion.div
      initial="initial"
      animate="in"
      exit="out"
      variants={pageVariants}
      style={{
        position: 'absolute',
        width: '100%',
        height: '100%',
        overflowY: 'auto',
        overflowX: 'hidden',
      }}
      className="page-content"
    >
      {children}
    </motion.div>
  );
};

function App() {
  return (
    <AuthProvider>
      <I18nProvider>
        <AppContent />
      </I18nProvider>
    </AuthProvider>
  );
}

const AppContent = () => {
  const { isAuthenticated, isInitialized } = useAuth();

  // Show setup page if app hasn't been initialized yet
  if (!isInitialized) {
    return <SetupPage />;
  }

  // Show login page if initialized but not authenticated
  if (!isAuthenticated) {
    return (
      <I18nProvider>
        <AuthPage />;
      </I18nProvider>)
  }

  // Show main app if both initialized and authenticated
  return (
    <NotificationProvider>
      <MessageProvider>
        <EditProvider>
          <Router>
            <div className="flex h-screen w-full bg-gray-950 text-gray-100 relative overflow-hidden app-main-container">
              <Sidebar />
              <main className="flex-1 relative overflow-hidden app-main-main">
                <AnimatedRoutes />
              </main>
              <ToastPortal />
            </div>
          </Router>
        </EditProvider>
      </MessageProvider>
    </NotificationProvider>
  );
};

export default App;