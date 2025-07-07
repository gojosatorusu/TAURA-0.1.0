import React, { useEffect, useState } from 'react';
import { motion, useMotionValue, useSpring } from 'framer-motion';

interface StatCardProps {
  name: string;
  icon: React.ElementType;
  value: number | string;
  color: string;
}

const StatCard: React.FC<StatCardProps> = ({ name, icon, value, color }) => {
  const isNumber = typeof value === 'number';
  const motionValue = useMotionValue(isNumber ? value : 0);
  const springValue = useSpring(motionValue, { damping: 20, stiffness: 100 });
  const [display, setDisplay] = useState(value.toString());

  const formatLargeNumber = (num: number): string => {
    if (num >= 1000000000) {
      return (num / 1000000000).toFixed(1) + 'B';
    } else if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toLocaleString();
  };

  const getTextSize = (text: string): string => {
    if (text.length > 12) return 'text-2xl';
    if (text.length > 8) return 'text-3xl';
    return 'text-4xl';
  };

  useEffect(() => {
    if (isNumber) {
      motionValue.set(0);
      springValue.set(value as number);
      const unsubscribe = springValue.on('change', (latest) => {
        const formattedValue = formatLargeNumber(Math.floor(latest));
        setDisplay(formattedValue);
      });
      return () => unsubscribe();
    } else {
      setDisplay(value.toString());
    }
  }, [value, isNumber, motionValue, springValue]);

  return (
    <motion.div
      className='flex flex-col items-start justify-center p-4 bg-gray-900 rounded-2xl shadow-lg cursor-pointer hover:bg-sky-950 transition duration-300 ease-in-out border border-gray-700'
      whileHover={{ y: -7, scale: 1.05 }}
    >
      <div className='flex items-center gap-2 mb-2'>
        {React.createElement(icon, { size: 30, style: { color } })}
        <span className='text-gray-300 text-md font-semibold'>{name}</span>
      </div>
      <motion.span 
        className={`${getTextSize(display)} font-bold font-mono text-gray-100 break-words max-w-full`}
        title={isNumber ? (value as number).toLocaleString() : value.toString()}
      >
        {display}
      </motion.span>
    </motion.div>
  );
};

export default StatCard;