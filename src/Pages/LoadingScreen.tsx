import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lightbulb} from 'lucide-react';
import { invoke } from "@tauri-apps/api/core";

const LoadingScreen = () => {
  const [progress, setProgress] = useState(0);
  const [tip, setTip] = useState<string>('');
  const [isLoadingTip, setIsLoadingTip] = useState(true);

  // Fetch random tip
  useEffect(() => {
    const fetchTip = async () => {
      try {
        const randomTipId = Math.floor(Math.random() * 10) + 1;
        const tipResult = await invoke('get_tip', { tipId: randomTipId });
        setTip(tipResult as string);
      } catch (error) {
        console.error('Error fetching tip:', error);
        setTip('Stay Organized!');
      } finally {
        setIsLoadingTip(false);
      }
    };

    fetchTip();
  }, []);

  // Progress animation
  useEffect(() => {
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          return 100;
        }
        return prev + 1;
      });
    }, 50);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center">
      <div className="relative z-10 flex flex-col items-center justify-center space-y-8 p-8 max-w-md w-full mx-4">

        {/* Logo/Brand Area */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="text-center"
        >
          <motion.div
            className="w-16 h-16 mx-auto mb-4 bg-[#040A1D] rounded-xl flex items-center justify-center shadow-lg"
            animate={{
              rotate: [0, 360, 360, 360],
              scale: [1, 1.2, 1, 1],
              boxShadow: [
                "0 0 20px rgba(59, 130, 246, 0.3)",
                "0 0 30px rgba(59, 130, 246, 0.5)",
                "0 0 20px rgba(59, 130, 246, 0.3)"
              ]
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              ease: "easeInOut",
              times: [0, 0.3, 0.4, 1] // Controls timing: spin for 30% of duration, then pause
            }}
          >
            <img src='/icon.png' alt="Taura App Logo" />
          </motion.div>

          <motion.h1
            className="text-2xl font-bold text-white mb-2"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.5 }}
          >
            Loading...
          </motion.h1>

          <motion.p
            className="text-slate-400 text-sm"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.5 }}
          >
            Please wait while we prepare everything for you
          </motion.p>
        </motion.div>

        {/* Progress Bar */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.5 }}
          className="w-full"
        >
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-slate-300">Loading Progress</span>
            <span className="text-sm font-medium text-blue-400">{progress}%</span>
          </div>

          <div className="w-full bg-slate-700 rounded-full h-2 overflow-hidden shadow-inner">
            <motion.div
              className="h-full bg-gradient-to-r from-blue-500 to-blue-400 rounded-full shadow-lg"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.3, ease: "easeOut" }}
            />
          </div>
        </motion.div>

        {/* Tip Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.5 }}
          className="w-full bg-slate-800 rounded-xl p-6 border border-slate-700 shadow-lg"
        >
          <div className="flex items-start space-x-3">
            <motion.div
              className="flex-shrink-0 w-8 h-8 bg-gradient-to-br from-amber-500 to-orange-500 rounded-lg flex items-center justify-center"
              animate={{
                scale: [1, 1.1, 1],
                rotate: [0, 5, -5, 0]
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
                ease: "easeInOut",
                delay: 1
              }}
            >
              <Lightbulb className="w-4 h-4 text-white" />
            </motion.div>

            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-semibold text-white mb-2 flex items-center">
                💡 Pro Tip
              </h3>

              <AnimatePresence mode="wait">
                {isLoadingTip ? (
                  <motion.div
                    key="loading"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex items-center space-x-2"
                  >
                    <div className="w-3 h-3 bg-slate-600 rounded-full animate-pulse" />
                    <div className="w-3 h-3 bg-slate-600 rounded-full animate-pulse" />
                    <div className="w-3 h-3 bg-slate-600 rounded-full animate-pulse" />
                  </motion.div>
                ) : (
                  <motion.p
                    key="tip"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.5 }}
                    className="text-sm text-slate-300 leading-relaxed"
                  >
                    {tip}
                  </motion.p>
                )}
              </AnimatePresence>
            </div>
          </div>
        </motion.div>

        {/* Loading Dots */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8, duration: 0.5 }}
          className="flex space-x-1"
        >
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="w-2 h-2 bg-blue-400 rounded-full"
              animate={{
                scale: [1, 1.2, 1],
                opacity: [0.7, 1, 0.7]
              }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                delay: i * 0.2,
                ease: "easeInOut"
              }}
            />
          ))}
        </motion.div>
      </div>
    </div>
  );
};

export default LoadingScreen;