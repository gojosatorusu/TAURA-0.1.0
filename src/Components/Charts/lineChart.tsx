import React from 'react'
import {LineChart, Line, XAxis, CartesianGrid, Tooltip, ResponsiveContainer, YAxis} from 'recharts'
import { motion} from 'framer-motion'

type LineChartProps = {
  name: string;
  data: { name: string; sales: number }[];
  type?: 'basis' | 'basisClosed' | 'basisOpen' | 'linear' | 'linearClosed' | 'natural' | 'monotoneX' | 'monotoneY' | 'monotone' | 'step' | 'stepBefore' | 'stepAfter';
};

const LinesChart: React.FC<LineChartProps> = ({ name, data, type = "monotone" }) => {
  return (
    <motion.div
    className='flex flex-col gap-2 bg-gray-900 p-4 rounded-md shadow-md border border-gray-700 backdrop-blur-md h-full'
    initial={{ opacity: 0, y: 40 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.8 }}>
        <h2 className='text-gray-200 text-lg font-semibold '>{name}</h2>
        <div className='flex-1 mt-2 '>
            <ResponsiveContainer width={'100%'} height={'100%'}>
                <LineChart data={data} >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis stroke='#9ca3af' dataKey="name" />
                    <YAxis stroke='#9ca3af' ></YAxis>
                    <Tooltip contentStyle={{backgroundColor: '#1f2937', borderColor: "#4b5563"}}/>
                    <Line type={type} dataKey="sales" stroke="#8884d8" activeDot={{ r: 8, strokeWidth: 2 }} dot={{r: 6, strokeWidth:2, fill:"#6366f1" }} />
                </LineChart>
            </ResponsiveContainer>
        </div>
    </motion.div>
  )
}

export default LinesChart